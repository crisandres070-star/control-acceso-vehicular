-- ============================================================================
-- STAGING SETUP SCRIPT - Sequential Porterias Testing
-- ============================================================================
-- Ejecutar SOLO en BD Staging
-- Fecha: 18 Marzo 2026
-- Alineado con el schema Prisma real del proyecto
-- Tablas correctas: vehicles, contratistas, porterias, eventos_acceso
-- ============================================================================

-- ============================================================================
-- 0. DIAGNOSTICO INICIAL
-- ============================================================================

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('vehicles', 'vehiculos', 'porterias', 'contratistas')
ORDER BY table_name;

-- Si aqui ves vehiculos, ojo: esa tabla NO la usa Prisma.
-- La app consulta la tabla vehicles.

-- ============================================================================
-- 1. VERIFICAR Y AGREGAR COLUMNA orden A porterias
-- ============================================================================

ALTER TABLE "porterias"
ADD COLUMN IF NOT EXISTS "orden" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "idx_porterias_orden" ON "porterias"("orden");

SELECT id, nombre, orden, created_at
FROM porterias
ORDER BY created_at ASC, id ASC;

-- ============================================================================
-- 2. ASEGURAR ENUM EstadoRecintoVehiculo CON EN_TRANSITO
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'EstadoRecintoVehiculo'
      AND e.enumlabel = 'EN_TRANSITO'
  ) THEN
    ALTER TYPE "EstadoRecintoVehiculo" ADD VALUE 'EN_TRANSITO';
  END IF;
END $$;

SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'EstadoRecintoVehiculo'::regtype
ORDER BY enumsortorder;

-- ============================================================================
-- 3. POBLAR/ORDENAR PORTERIAS REALES PARA FLUJO SECUENCIAL
-- ============================================================================
-- La logica usa "orden" y la UI/historial muestra "nombre".
-- Nombres reales por defecto para staging secuencial:
-- 1. Cala Cala
-- 2. Soledad
-- 3. Tana
-- 4. Negreiros

WITH desired_porterias (orden, nombre) AS (
  VALUES
    (1, 'Cala Cala'),
    (2, 'Soledad'),
    (3, 'Tana'),
    (4, 'Negreiros')
)
INSERT INTO porterias (nombre, telefono, orden, created_at, updated_at)
SELECT nombre, NULL, orden, NOW(), NOW()
FROM desired_porterias
ON CONFLICT (nombre) DO UPDATE
SET orden = EXCLUDED.orden,
    updated_at = NOW();

-- Opcional en staging: mover nombres genericos fuera de secuencia para evitar confusiones.
UPDATE porterias
SET orden = 0,
    updated_at = NOW()
WHERE nombre IN ('Portería 1', 'Portería 2', 'Portería 3', 'Portería 4');

UPDATE porterias
SET orden = 0,
    updated_at = NOW()
WHERE nombre IN ('Portería Entrada Minera', 'Control Caseta', 'Portería Salida Operativa', 'Salida Principal');

SELECT id, nombre, orden, created_at
FROM porterias
ORDER BY orden ASC, id ASC;

-- Validar que no existan ordenes duplicados en la secuencia activa 1..4.
SELECT orden, COUNT(*)::int AS repetidos
FROM porterias
WHERE orden BETWEEN 1 AND 4
GROUP BY orden
HAVING COUNT(*) > 1;

-- ============================================================================
-- 4. DIAGNOSTICO OPERADORES (causa FK operado_por_id en BD nuevas)
-- ============================================================================
-- Si esto devuelve 0 usuarios, una sesion vieja con userId puede romper FK.
-- Solucion recomendada: correr script de seed seguro para staging:
-- npm run db:seed:staging:sequential

SELECT id, username, role, is_active, porteria_id
FROM system_users
ORDER BY id ASC;

-- ============================================================================
-- 5. CREAR CONTRATISTA DE STAGING PARA TEST001
-- ============================================================================

INSERT INTO contratistas (
  razon_social,
  rut,
  email,
  contacto,
  telefono,
  created_at,
  updated_at
) VALUES (
  'Contratista Staging Secuencial',
  'STAGING-TEST001',
  NULL,
  'QA Staging',
  '+56900000000',
  NOW(),
  NOW()
)
ON CONFLICT (rut) DO UPDATE
SET razon_social = EXCLUDED.razon_social,
    contacto = EXCLUDED.contacto,
    telefono = EXCLUDED.telefono,
    updated_at = NOW();

SELECT id, razon_social, rut
FROM contratistas
WHERE rut = 'STAGING-TEST001';

-- ============================================================================
-- 6. CREAR/ACTUALIZAR VEHICULO DE PRUEBA TEST001 EN vehicles
-- ============================================================================
-- IMPORTANTE: la app NO lee vehiculos; lee vehicles.
-- Tambien necesita access_status, company, contratista_id, name y rut.

INSERT INTO vehicles (
  name,
  license_plate,
  codigo_interno,
  rut,
  vehicle_type,
  brand,
  company,
  access_status,
  contratista_id,
  modelo,
  estado_recinto,
  created_at,
  updated_at
)
SELECT
  'Vehículo TEST001',
  'TEST001',
  'T001',
  'AUTO-TEST001-STAGING',
  'Camioneta',
  'Staging',
  c.razon_social,
  'YES',
  c.id,
  'Secuencial',
  NULL,
  NOW(),
  NOW()
FROM contratistas c
WHERE c.rut = 'STAGING-TEST001'
ON CONFLICT (license_plate) DO UPDATE
SET name = EXCLUDED.name,
    codigo_interno = EXCLUDED.codigo_interno,
    rut = EXCLUDED.rut,
    vehicle_type = EXCLUDED.vehicle_type,
    brand = EXCLUDED.brand,
    company = EXCLUDED.company,
    access_status = EXCLUDED.access_status,
    contratista_id = EXCLUDED.contratista_id,
    modelo = EXCLUDED.modelo,
    updated_at = NOW();

SELECT id, license_plate, codigo_interno, company, access_status, contratista_id, estado_recinto
FROM vehicles
WHERE license_plate = 'TEST001';

-- ============================================================================
-- 7. DIAGNOSTICO DE LA CAUSA ACTUAL
-- ============================================================================
-- Si vehiculos devuelve 1 y vehicles devuelve 0, ese era el problema exacto.

SELECT COUNT(*)::int AS matches_in_vehicles
FROM vehicles
WHERE license_plate = 'TEST001'
   OR UPPER(REGEXP_REPLACE(license_plate, '[^A-Za-z0-9]', '', 'g')) = 'TEST001';

SELECT CASE
  WHEN to_regclass('public.vehiculos') IS NULL THEN 0
  ELSE (
    SELECT COUNT(*)::int
    FROM vehiculos
    WHERE patente = 'TEST001'
       OR UPPER(REGEXP_REPLACE(patente, '[^A-Za-z0-9]', '', 'g')) = 'TEST001'
  )
END AS matches_in_vehiculos;

-- ============================================================================
-- 8. LIMPIAR EVENTOS DE PRUEBA (SI NECESITAS ROLLBACK)
-- ============================================================================

-- Ver eventos de TEST001:
SELECT
  ea.id,
  ea.tipo_evento,
  ea.fecha_hora,
  p.nombre AS porteria,
  v.license_plate
FROM eventos_acceso ea
LEFT JOIN porterias p ON ea.porteria_id = p.id
LEFT JOIN vehicles v ON ea.vehiculo_id = v.id
WHERE v.license_plate = 'TEST001'
ORDER BY ea.fecha_hora DESC;

-- Si necesitas limpiar todos los eventos de TEST001:
-- DELETE FROM eventos_acceso
-- WHERE vehiculo_id = (SELECT id FROM vehicles WHERE license_plate = 'TEST001');

-- Luego resetear estado del vehiculo:
-- UPDATE vehicles SET estado_recinto = NULL WHERE license_plate = 'TEST001';

-- ============================================================================
-- 9. QUERIES UTILES PARA DEBUGGING
-- ============================================================================

SELECT
  id,
  license_plate,
  codigo_interno,
  company,
  access_status,
  contratista_id,
  estado_recinto,
  updated_at
FROM vehicles
WHERE license_plate = 'TEST001';

SELECT
  ea.id,
  ea.tipo_evento,
  ea.fecha_hora,
  p.nombre AS porteria,
  p.orden,
  EXTRACT(EPOCH FROM (NOW() - ea.fecha_hora)) AS segundos_atras
FROM eventos_acceso ea
JOIN porterias p ON ea.porteria_id = p.id
WHERE ea.vehiculo_id = (SELECT id FROM vehicles WHERE license_plate = 'TEST001')
ORDER BY ea.fecha_hora DESC
LIMIT 1;

SELECT
  ea.id,
  ROW_NUMBER() OVER (ORDER BY ea.fecha_hora ASC) AS evento_num,
  ea.tipo_evento,
  ea.fecha_hora,
  p.nombre AS porteria,
  p.orden,
  COALESCE(ea.observacion, '(sin observacion)') AS observacion
FROM eventos_acceso ea
JOIN porterias p ON ea.porteria_id = p.id
WHERE ea.vehiculo_id = (SELECT id FROM vehicles WHERE license_plate = 'TEST001')
ORDER BY ea.fecha_hora DESC
LIMIT 20;

SELECT
  ROW_NUMBER() OVER (ORDER BY ea.fecha_hora ASC) AS paso,
  p.orden,
  p.nombre,
  ea.tipo_evento,
  ea.fecha_hora
FROM eventos_acceso ea
JOIN porterias p ON ea.porteria_id = p.id
WHERE ea.vehiculo_id = (SELECT id FROM vehicles WHERE license_plate = 'TEST001')
  AND ea.fecha_hora > (NOW() - INTERVAL '1 hour')
ORDER BY ea.fecha_hora ASC;

SELECT
  p.id,
  p.nombre,
  COUNT(*) AS repeticiones,
  MAX(ea.fecha_hora) AS ultima_vez,
  MIN(ea.fecha_hora) AS primera_vez,
  EXTRACT(EPOCH FROM (MAX(ea.fecha_hora) - MIN(ea.fecha_hora))) AS segundos_entre
FROM eventos_acceso ea
JOIN porterias p ON ea.porteria_id = p.id
WHERE ea.vehiculo_id = (SELECT id FROM vehicles WHERE license_plate = 'TEST001')
GROUP BY p.id, p.nombre
HAVING COUNT(*) > 1;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
