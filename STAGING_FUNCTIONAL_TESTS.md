# 🧪 Checklist Funcional Completo - Pruebas Staging

**Fecha:** 18 Marzo 2026  
**Ambiente:** Staging  
**Patente de Prueba:** `TEST001` (o similar sin caracteres especiales)  
**Usuario Guard:** Tu usuario de portería  

---

## ⚙️ FASE 1: CONFIGURACIÓN INICIAL

### 1.1 Verificar Base de Datos Actualizada

```sql
-- Conectarse a BD Staging
-- Ejecutar migración:

ALTER TABLE "porterias" ADD COLUMN "orden" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "idx_porterias_orden" ON "porterias"("orden");
ALTER TYPE "EstadoRecintoVehiculo" ADD VALUE 'EN_TRANSITO' AFTER 'FUERA';
```

**Verificar:**
- ✅ Migración ejecutada sin errores
- ✅ Tabla `porterias` tiene columna `orden`
- ✅ Enum incluye `EN_TRANSITO`

---

### 1.2 Configurar Porterías con Orden Real

**Ir a:** `/admin/porterias`

**Crear o editar 4 porterías con este orden:**

| Portería | Nombre | Orden | Teléfono |
|----------|--------|-------|----------|
| 1 | Portería Entrada Minera | 1 | (opcional) |
| 2 | Control Caseta | 2 | (opcional) |
| 3 | Portería Salida Operativa | 3 | (opcional) |
| 4 | Salida Principal | 4 | (opcional) |

**Pasos:**
1. Click en "Ingresar portería" o editar existente
2. Llenar nombre, orden (1, 2, 3 o 4)
3. Guardar
4. **Verificar:** Se guarda correctamente

**Estado esperado:**
- ✅ 4 porterías configuradas con orden 1-4
- ✅ No hay errores en web console

**SQL de Verificación:**
```sql
SELECT id, nombre, orden FROM porterias ORDER BY orden;
-- Esperado: 4 filas con orden 1, 2, 3, 4
```

---

### 1.3 Preparar Vehículo de Prueba

**Opción A: Crear nuevo vehículo**

Ir a `/admin/vehiculos/nuevo`:
- **Patente:** `TEST001` (sin caracteres especiales)
- **Código Interno:** `T001`
- **Empresa:** Seleccionar una existente (o crear: "TEST Contractor")
- **Tipo vehículo:** `Vehículo de prueba`
- **Marca:** `PRUEBA`
- **AccessStatus:** `YES`
- Guardar

**Opción B: Usar vehículo existente**

Editar uno actual y cambiar su patente temporalmente a `TEST001`

**Estado esperado:**
- ✅ Vehículo `TEST001` existe
- ✅ Tiene `accessStatus = "YES"`
- ✅ Tiene empresa/contratista asociada
- ✅ `estadoRecinto = null` (sin eventos previos)

**SQL de Verificación:**
```sql
SELECT id, licensePlate, accessStatus, estadoRecinto, contratistaId 
FROM vehicles 
WHERE licensePlate = 'TEST001';
-- Esperado: 1 fila con accessStatus = 'YES', estadoRecinto = null
```

---

## 🚀 FASE 2: PRUEBAS FUNCIONALES

### TEST 1: Validar Lookup Inicial ✓

**Objetivo:** Verificar que sistema reconoce vehículo sin eventos

**Pasos:**
1. Ir a `/guard/v2`
2. Seleccionar portería: `Portería Entrada Minera` (orden 1)
3. Ingresar patente: `TEST001`
4. Click **"Validar acceso"**

**Verificar en Response (Browser Console):**
```javascript
// Abrir DevTools (F12) → Network → Buscar request a /api/access-control-v2/lookup
// Response debe mostrar:
{
  "vehicle": {
    "licensePlate": "TEST001",
    "estadoRecinto": null,
    "ultimoEvento": null,
    "nextExpectedPorteria": null  // ← Sin eventos, no hay siguiente esperado
  }
}
```

**Estado Pantalla:**
- ✅ Muestra "VEHÍCULO CONFIRMADO"
- ✅ Estado badge: "SIN REGISTRO" (gris)
- ✅ Sección "Última portería registrada": vacía
- ✅ Sección "Siguiente checkpoint esperado": NO aparece (no hay último evento)

**Criterio Pass:** ✅ Todas condiciones cumplidas

---

### TEST 2: Entrada Portería 1 (Primera Válida) ✓

**Objetivo:** Registrar entrada correcta en primer checkpoint

**Pasos:**
1. Pantalla aún muestra vehículo `TEST001` validado
2. **Portería:** `Portería Entrada Minera` (debe estar seleccionada)
3. **Tipo de evento:** Click en botón **"ENTRADA"**
4. Click **"Registrar entrada"**

**Verificar en Response:**
```javascript
// Network → /api/access-control-v2/events
{
  "message": "Entrada registrada correctamente para la patente TEST001 en Portería Entrada Minera...\n(Checkpoint 1 - Transito dentro de faena)",
  "estadoRecinto": "EN_TRANSITO",
  "sequenceComplete": false,  // ← NO está completa, continúa
  "ultimoEvento": {
    "tipoEvento": "ENTRADA",
    "porteria": { "id": 1, "nombre": "Portería Entrada Minera", "orden": 1 },
    "observacion": "Checkpoint 1 de ENTRADA"  // ← Automático
  }
}
```

**Estado Pantalla:**
- ✅ Mensaje de éxito con mención a "Checkpoint 1"
- ✅ Pantalla se limpia automáticamente
- ✅ Campo patente vacío → lista para próximo vehículo

**BD (Verificación SQL):**
```sql
SELECT tipoEvento, porteria_id, observacion, estado_recinto 
FROM eventos_acceso 
WHERE vehiculo_id = (SELECT id FROM vehicles WHERE licensePlate = 'TEST001')
ORDER BY fecha_hora DESC LIMIT 1;

-- Esperado: ENTRADA | 1 | "Checkpoint 1 de ENTRADA" | (evento creado)

SELECT estadoRecinto FROM vehicles WHERE licensePlate = 'TEST001';
-- Esperado: EN_TRANSITO
```

**En Dashboard (`/admin/dashboard-faena`):**
- ✅ Card "En tránsito" incrementó (1 vehículo)
- ✅ Card "Dentro de faena" sin cambios
- ✅ Tabla "EN TRÁNSITO" muestra `TEST001`

**Criterio Pass:** ✅ Message contiene "Checkpoint 1" y estado es EN_TRANSITO

---

### TEST 3: Entrada Portería 2 (Secuencia Correcta) ✓

**Objetivo:** Continuar secuencia en orden correcto

**Pasos:**
1. Ir a `/guard/v2` de nuevo
2. **Portería:** `Control Caseta` (orden 2)
3. Ingresar patente: `TEST001`
4. Click **"Validar acceso"**

**Verificar en Response:**
```javascript
// /api/access-control-v2/lookup
{
  "vehicle": {
    "estadoRecinto": "EN_TRANSITO",
    "ultimoEvento": {
      "tipoEvento": "ENTRADA",
      "porteria": { "nombre": "Portería Entrada Minera", "orden": 1 }
    },
    "nextExpectedPorteria": {
      "nombre": "Control Caseta",
      "orden": 2  // ← Sistema calcula correctamente siguiente
    }
  }
}
```

**Estado Pantalla:**
- ✅ Badge estado: "EN TRÁNSITO" (ámbar)
- ✅ Sección "Última portería registrada": muestra "Portería Entrada Minera"
- ✅ Sección "Siguiente checkpoint esperado": muestra "Control Caseta" (ámbar)

**Pasos Registro:**
5. **Tipo evento:** Click **"ENTRADA"**
6. **Portería seleccionada:** Ya debe estar en "Control Caseta"
7. Click **"Registrar entrada"**

**Verificar Response:**
```javascript
{
  "message": "...\n(Checkpoint 2 - Transito dentro de faena)",
  "estadoRecinto": "EN_TRANSITO",
  "sequenceComplete": false
}
```

**BD:**
```sql
SELECT COUNT(*) FROM eventos_acceso 
WHERE vehiculo_id = (SELECT id FROM vehicles WHERE licensePlate = 'TEST001')
AND tipoEvento = 'ENTRADA';
-- Esperado: 2 eventos ENTRADA registrados
```

**Criterio Pass:** ✅ Checkpoint 2 registrado, estado EN_TRANSITO

---

### TEST 4: Entrada Portería 3 (Continúa Secuencia) ✓

**Objetivo:** Continuar en checkpoint 3

**Pasos:**
1. `/guard/v2`
2. **Portería:** `Portería Salida Operativa` (orden 3)
3. Patente: `TEST001`
4. Validar acceso
5. **Verificar:** `nextExpectedPorteria` muestra "Portería Salida Operativa" (orden 3)
6. **Tipo evento:** ENTRADA
7. Registrar

**Verificar Response:**
```javascript
{
  "message": "...\n(Checkpoint 3 - Transito dentro de faena)",
  "estadoRecinto": "EN_TRANSITO",
  "sequenceComplete": false
}
```

**Criterio Pass:** ✅ Checkpoint 3 registrado

---

### TEST 5: Entrada Portería 4 - SECUENCIA COMPLETA ✓

**Objetivo:** Completar entrada → Estado DENTRO

**Pasos:**
1. `/guard/v2`
2. **Portería:** `Salida Principal` (orden 4)
3. Patente: `TEST001`
4. Validar acceso
5. **Verificar:** `nextExpectedPorteria` muestra "Salida Principal" (orden 4)
6. **Tipo evento:** ENTRADA
7. Registrar

**Verificar Response - ⭐ CRÍTICO:**
```javascript
{
  "message": "Entrada registrada correctamente...\n✓ Secuencia de entrada completada.",
  "estadoRecinto": "DENTRO",  // ← CAMBIO: es DENTRO, no EN_TRANSITO
  "sequenceComplete": true,    // ← Mark de completitud
  "ultimoEvento": {
    "tipoEvento": "ENTRADA",
    "porteria": { "nombre": "Salida Principal", "orden": 4 },
    "observacion": "Checkpoint 4 de ENTRADA"
  }
}
```

**Estado Pantalla:**
- ✅ Mensaje incluye: "✓ Secuencia de entrada completada"
- ✅ Pantalla se limpia

**BD:**
```sql
SELECT estadoRecinto FROM vehicles WHERE licensePlate = 'TEST001';
-- Esperado: DENTRO (no EN_TRANSITO)

SELECT COUNT(*) FROM eventos_acceso 
WHERE vehiculo_id = (SELECT id FROM vehicles WHERE licensePlate = 'TEST001')
AND tipoEvento = 'ENTRADA';
-- Esperado: 4 eventos
```

**En Dashboard:**
- ✅ Card "Dentro de faena" incrementó a 1
- ✅ Card "En tránsito" decrementó a 0
- ✅ Tabla "DENTRO DE FAENA" muestra `TEST001`
- ✅ Última portería: "Salida Principal"

**Criterio Pass:** ✅ Estado es DENTRO, mensaje de secuencia completada

---

### TEST 6: Error - Portería Fuera de Secuencia ❌

**Objetivo:** Validar que sistema rechaza orden incorrecto

**Pasos:**
1. Crear nuevo vehículo o limpiar estado del anterior:
   ```sql
   UPDATE vehicles SET estadoRecinto = NULL 
   WHERE licensePlate = 'TEST002';
   DELETE FROM eventos_acceso WHERE vehiculo_id = (SELECT id FROM vehicles WHERE licensePlate = 'TEST002');
   ```

2. `/guard/v2`
3. **Portería:** `Portería Salida Operativa` (orden 3)
4. Patente: `TEST002`
5. Validar acceso
6. **Tipo evento:** ENTRADA
7. Click **"Registrar entrada"**

**Verificar Response - ⭐ ERROR ESPERADO:**
```javascript
{
  "error": "El siguiente checkpoint esperado es Portería Entrada Minera. Se intentó registrar en Portería Salida Operativa.",
  "nextExpectedPorteria": {
    "id": 1,
    "nombre": "Portería Entrada Minera",
    "orden": 1
  }
}
```

**Estado Pantalla:**
- ✅ Box rojo de error
- ✅ Mensaje claro indicando portería correcta
- ✅ Vehículo NO se registra

**BD - Verificar:**
```sql
SELECT * FROM eventos_acceso 
WHERE vehiculo_id = (SELECT id FROM vehicles WHERE licensePlate = 'TEST002');
-- Esperado: vacío (sin eventos)

SELECT estadoRecinto FROM vehicles WHERE licensePlate = 'TEST002';
-- Esperado: NULL (sin cambios)
```

**Criterio Pass:** ✅ Error devuelto, eventos NO creados, estado NO cambiado

---

### TEST 7: Anti-Duplicado (Ventana 5 Minutos) ⏱️

**Objetivo:** Validar que no permite duplicado en 5 min

**Pasos:**
1. `/guard/v2`
2. Patente: `TEST001` (ya en estado DENTRO)
3. **Portería:** `Portería Entrada Minera` (orden 1)
4. Validar acceso
5. **Tipo evento:** ENTRADA
6. Click **"Registrar entrada"**

**Verificar Response - ⭐ ERROR ESPERADO:**
```javascript
{
  "error": "La secuencia de ENTRADA ya se completó.",
  // O si intenta mismo vehículo + portería en mismo tipo:
  // "error": "Ya fue registrado recientemente en esta portería. Espere un momento."
}
```

**BD:**
```sql
SELECT COUNT(*) FROM eventos_acceso 
WHERE vehiculo_id = (SELECT id FROM vehicles WHERE licensePlate = 'TEST001')
AND tipoEvento = 'ENTRADA';
-- Esperado: Sigue siendo 4, NO incrementa
```

**Criterio Pass:** ✅ Error anti-duplicado activo

---

### TEST 8: Salida Secuencial - Portería 4 (Inversión) ✓

**Objetivo:** Iniciar salida desde última portería de entrada

**Pasos:**
1. `/guard/v2`
2. **Portería:** `Salida Principal` (orden 4)
3. Patente: `TEST001`
4. Validar acceso

**Verificar en Response:**
```javascript
{
  "vehicle": {
    "estadoRecinto": "DENTRO",  // ← Está dentro
    "ultimoEvento": {
      "tipoEvento": "ENTRADA",  // ← Último fue ENTRADA
      "porteria": { "orden": 4 }
    },
    "nextExpectedPorteria": null  // ← Sin eventos SALIDA previos
  }
}
```

**Pasos Registro:**
5. **Tipo evento:** Click **"SALIDA"**
6. **Portería:** Ya debe estar en "Salida Principal"
7. Click **"Registrar salida"**

**Verificar Response:**
```javascript
{
  "message": "Salida registrada correctamente...\n(Checkpoint 4 - Transito dentro de faena)",
  "estadoRecinto": "EN_TRANSITO",  // ← Vuelve a EN_TRANSITO
  "sequenceComplete": false,
  "ultimoEvento": {
    "tipoEvento": "SALIDA",
    "porteria": { "nombre": "Salida Principal", "orden": 4 },
    "observacion": "Checkpoint 4 de SALIDA"
  }
}
```

**BD:**
```sql
SELECT tipoEvento, porteria_id FROM eventos_acceso 
WHERE vehiculo_id = (SELECT id FROM vehicles WHERE licensePlate = 'TEST001')
ORDER BY fecha_hora DESC LIMIT 2;
-- Esperado: 
--  SALIDA | 4
--  ENTRADA | 4
```

**Dashboard:**
- ✅ Vehículo pasa de "DENTRO" a "EN TRÁNSITO"

**Criterio Pass:** ✅ Salida en orden 4 registrada, estado EN_TRANSITO

---

### TEST 9: Salida Secuencial - Portería 3, 2, 1 ✓

**Objetivo:** Completar salida en orden inverso

**Pasos (Repetir 3 veces):**

**Iteración 1: Portería 3**
1. `/guard/v2`
2. **Portería:** `Portería Salida Operativa` (orden 3)
3. Patente: `TEST001`
4. Validar → Tipo SALIDA → Registrar

**Verificar Response:**
```javascript
{
  "message": "(Checkpoint 3 - Transito dentro de faena)",
  "estadoRecinto": "EN_TRANSITO",
  "sequenceComplete": false,
  "ultimoEvento": {
    "porteria": { "nombre": "Portería Salida Operativa", "orden": 3 },
    "observacion": "Checkpoint 3 de SALIDA"
  }
}
```

**Iteración 2: Portería 2**
- Repetir con "Control Caseta" (orden 2)
- Verificar: Checkpoint 2, EN_TRANSITO, sequenceComplete: false

**Iteración 3: Portería 1**
- Repetir con "Portería Entrada Minera" (orden 1)
- Verificar: Checkpoint 1, pero ahora...

---

### TEST 10: Salida Portería 1 - SECUENCIA COMPLETA ✓

**Objetivo:** Completar salida → Estado FUERA

**Pasos:**
1. `/guard/v2`
2. **Portería:** `Portería Entrada Minera` (orden 1)
3. Patente: `TEST001`
4. Validar acceso
5. Tipo: **SALIDA**
6. Registrar

**Verificar Response - ⭐ CRÍTICO:**
```javascript
{
  "message": "Salida registrada correctamente...\n✓ Secuencia de salida completada.",
  "estadoRecinto": "FUERA",  // ← FUERA, no EN_TRANSITO
  "sequenceComplete": true,   // ← Completada
  "ultimoEvento": {
    "tipoEvento": "SALIDA",
    "porteria": { "nombre": "Portería Entrada Minera", "orden": 1 },
    "observacion": "Checkpoint 1 de SALIDA"
  }
}
```

**BD:**
```sql
SELECT estadoRecinto FROM vehicles WHERE licensePlate = 'TEST001';
-- Esperado: FUERA

SELECT tipoEvento, porteria_id FROM eventos_acceso 
WHERE vehiculo_id = (SELECT id FROM vehicles WHERE licensePlate = 'TEST001')
ORDER BY fecha_hora DESC LIMIT 5;
-- Esperado (en orden DESC):
--  SALIDA | 1
--  SALIDA | 2
--  SALIDA | 3
--  SALIDA | 4
--  ENTRADA | 4
```

**Dashboard:**
- ✅ Vehículo pasa de "EN TRÁNSITO" a "FUERA"
- ✅ Card "Fuera de faena" incrementó
- ✅ Tabla "FUERA DE FAENA" muestra `TEST001`

**Criterio Pass:** ✅ Estado FUERA, mensaje de secuencia completada

---

### TEST 11: Historial de Eventos (EventoAcceso) Claro ✓

**Objetivo:** Verificar que historial muestra flujo ordenado

**Pasos:**
1. Ir a `/admin/eventos-acceso`
2. Filtrar por patente: `TEST001`

**Verificar Historial en Tabla:**

```
Hora        Tipo    Portería                Observación             Operador
────────────────────────────────────────────────────────────────────────────
T+00:00     ENTRADA Portería Entrada       Checkpoint 1 de ENTRADA [tu user]
T+01:00     ENTRADA Control Caseta         Checkpoint 2 de ENTRADA [tu user]
T+02:00     ENTRADA Portería Salida       Checkpoint 3 de ENTRADA [tu user]
T+03:00     ENTRADA Salida Principal       Checkpoint 4 de ENTRADA [tu user]
T+10:00     SALIDA  Salida Principal       Checkpoint 4 de SALIDA  [tu user]
T+11:00     SALIDA  Portería Salida       Checkpoint 3 de SALIDA  [tu user]
T+12:00     SALIDA  Control Caseta         Checkpoint 2 de SALIDA  [tu user]
T+13:00     SALIDA  Portería Entrada       Checkpoint 1 de SALIDA  [tu user]
```

**Verificar:**
- ✅ 8 eventos totales (4 entrada + 4 salida)
- ✅ Orden cronológico correcto
- ✅ Observación automática en cada uno
- ✅ Tipo de evento correcto
- ✅ Portería correcta
- ✅ SIN eventos duplicados

**Criterio Pass:** ✅ Historial es claro, ordenado, sin confusión

---

### TEST 12: Dashboard - Estados Correctos ✓

**Objetivo:** Verificar dashboard muestra estados correctamente

**Pasos:**
1. Crear 3 vehículos de prueba:
   - `DENTRO1`: Estado DENTRO (completar entrada)
   - `TRANSITO1`: Estado EN_TRANSITO (registrar entrada en Portería 1 solo)
   - `FUERA1`: Estado FUERA (completar entrada → salida como TEST001)

2. Ir a `/admin/dashboard-faena`

**Verificar Cards (5 totales):**
- ✅ "Total vehículos" = 3 (o más si hay otros)
- ✅ "Dentro de faena" = 1 (DENTRO1)
- ✅ "En tránsito" = 1 (TRANSITO1) [ámbar]
- ✅ "Fuera de faena" = 1 (FUERA1)
- ✅ "Sin movimientos" = 0 (o los que haya)

**Verificar Filtros:**

**Filtro: "Estado: Todos"**
- ✅ Muestra 3 tablas (Dentro, En tránsito, Fuera)
- ✅ Tabla "DENTRO": 1 vehículo
- ✅ Tabla "EN TRÁNSITO": 1 vehículo
- ✅ Tabla "FUERA": 1 vehículo

**Filtro: "Estado: En tránsito"**
- ✅ Solo muestra tabla "EN TRÁNSITO"
- ✅ 1 vehículo

**Filtro: "Estado: Dentro"**
- ✅ Solo muestra tabla "DENTRO"
- ✅ 1 vehículo

**Filtro: "Estado: Fuera"**
- ✅ Solo muestra tabla "FUERA"
- ✅ 1 vehículo

**Verificar Colores en Tablas:**
- ✅ DENTRO badge: verde
- ✅ EN TRÁNSITO badge: **ámbar** (nuevo)
- ✅ FUERA badge: azul

**Criterio Pass:** ✅ Todos los estados y filtros funcionan correctamente

---

## ✅ RESUMEN DE CRITERIOS DE PASS/FAIL

### Criterios PASS (todos deben cumplirse):

| # | Criterio | Status |
|---|----------|--------|
| 1 | Portería 1 ENTRADA registra, estado EN_TRANSITO | [ ] |
| 2 | Portería 2 ENTRADA registra, estado EN_TRANSITO | [ ] |
| 3 | Portería 3 ENTRADA registra, estado EN_TRANSITO | [ ] |
| 4 | Portería 4 ENTRADA registra, estado DENTRO + "secuencia completada" | [ ] |
| 5 | Error al intentar saltar portería (ej: Portería 3 sin hacer 1-2) | [ ] |
| 6 | Anti-duplicado rechaza mismo vehículo+portería en 5 min | [ ] |
| 7 | Portería 4 SALIDA registra, estado EN_TRANSITO | [ ] |
| 8 | Portería 3 SALIDA registra, estado EN_TRANSITO | [ ] |
| 9 | Portería 2 SALIDA registra, estado EN_TRANSITO | [ ] |
| 10 | Portería 1 SALIDA registra, estado FUERA + "secuencia completada" | [ ] |
| 11 | Historial muestra 8 eventos en orden cronológico sin duplicados | [ ] |
| 12 | Dashboard stats muestran correctamente Dentro/Tránsito/Fuera | [ ] |
| 13 | Filtros dashboard funcionan (Todos, Dentro, En tránsito, Fuera) | [ ] |
| 14 | Lookup devuelve nextExpectedPorteria correcta | [ ] |
| 15 | ExcelImport sigue funcionando (sin cambios) | [ ] |
| 16 | Alta manual contratistas funciona (sin cambios) | [ ] |

---

## 🛠️ QUERIES SQL DE AYUDA (Debugging)

### Ver estado actual de vehículo de prueba
```sql
SELECT 
  v.id,
  v.licensePlate,
  v.estadoRecinto,
  v.accessStatus,
  (SELECT COUNT(*) FROM eventos_acceso WHERE vehiculo_id = v.id) as total_eventos
FROM vehicles v
WHERE v.licensePlate LIKE 'TEST%';
```

### Ver todos los eventos de un vehículo
```sql
SELECT 
  e.id,
  e.fechaHora,
  e.tipoEvento,
  p.nombre as porteria_nombre,
  p.orden,
  e.observacion,
  e.operado_por_username
FROM eventos_acceso e
JOIN porterias p ON e.porteria_id = p.id
JOIN vehicles v ON e.vehiculo_id = v.id
WHERE v.licensePlate = 'TEST001'
ORDER BY e.fechaHora ASC;
```

### Ver últimos 10 eventos (cualquier vehículo)
```sql
SELECT 
  e.fechaHora,
  v.licensePlate,
  e.tipoEvento,
  p.nombre,
  e.observacion,
  v.estadoRecinto
FROM eventos_acceso e
JOIN vehicles v ON e.vehiculo_id = v.id
JOIN porterias p ON e.porteria_id = p.id
ORDER BY e.fechaHora DESC
LIMIT 10;
```

### Limpiar datos de prueba (si necesitas reintentar)
```sql
-- CUIDADO: Solo en STAGING
DELETE FROM eventos_acceso WHERE vehiculo_id IN (SELECT id FROM vehicles WHERE licensePlate LIKE 'TEST%');
UPDATE vehicles SET estadoRecinto = NULL WHERE licensePlate LIKE 'TEST%';
```

---

## 📝 NOTAS FINALES

- **Usa DevTools (F12)** para ver responses exactas de API
- **Console.log disponible** en componentes React si necesitas debugging
- **Asegúrate porta de 5 min** entre intentos de misma portería
- **Log del Servidor:** Si hay error, revisar `npm run dev` console
- **Rollback SQL:** Si algo falla, usa queries de limpieza arriba

---

**Una vez que TODOS los criterios estén PASS, entonces sí ejecutamos `npm run build` final.**
