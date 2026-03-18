# 🚀 PRE-STAGING CHECKLIST - Listo para Pruebas

**Estado:** ✅ Build compilado exitosamente  
**Fecha:** 18 Marzo 2026  
**Próximo paso:** Configuración y pruebas funcionales en staging  

---

## 📋 Verificación Pre-Staging

- [x] Build compila sin errores (0 errors, 0 warnings)
- [x] TypeScript validation clean
- [x] 37 rutas funcionales (sin cambios en cantidad)
- [x] Typos corregidos (EN_TRANSITO en secuencial-access)
- [x] Funciones no usadas removidas (ESLint clean)
- [x] Export route soporta nuevo estado EN_TRANSITO

---

## 🎯 PLAN DE ACCIÓN PARA STAGING

### FASE 1: PREPARACIÓN (30 minutos)

**1.1 Conectar a BD Staging**
```bash
# Ya debes tener el .env.staging con datos correctos
# Verificar que PUBLIC_DATABASE_URL/DATABASE_URL apunte a staging
```

**1.2 Aplicar Migración SQL**

Ejecutar en pgAdmin o cliente SQL directo:
```sql
-- Verificar que tabla tiene columna orden
SELECT column_name FROM information_schema.columns 
WHERE table_name='porterias';

-- Si NO está, ejecutar:
ALTER TABLE "porterias" ADD COLUMN "orden" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "idx_porterias_orden" ON "porterias"("orden");

-- Si ya está, actualizar datos (asegurar valores distintos):
UPDATE porterias SET orden = 1 WHERE id IN (SELECT id FROM porterias ORDER BY created_at LIMIT 1);
UPDATE porterias SET orden = 2 WHERE id IN (SELECT id FROM porterias ORDER BY created_at OFFSET 1 LIMIT 1);
UPDATE porterias SET orden = 3 WHERE id IN (SELECT id FROM porterias ORDER BY created_at OFFSET 2 LIMIT 1);
UPDATE porterias SET orden = 4 WHERE id IN (SELECT id FROM porterias ORDER BY created_at OFFSET 3 LIMIT 1);
```

**1.3 Verificar Enum Agregado**

En base Staging (PostgreSQL):
```sql
-- Verificar EN_TRANSITO está en enum
SELECT enum_range(NULL::state_recinto_vehiculo);

-- Si NOT está, agregar manualmente:
ALTER TYPE "state_recinto_vehiculo" ADD VALUE 'EN_TRANSITO' AFTER 'FUERA';
```

✅ **Checkpoint:** BD staging lista con migración

---

### FASE 2: DEPLOY A STAGING (Opcional, si tienes ambiente separado)

```bash
# Si usas git:
git add .
git commit -m "feat: sequential porteria checkpoints for access control"
git push origin staging

# Luego deploy a staging (tu proceso normal)
```

✅ **Checkpoint:** Código desplegado en staging

---

### FASE 3: VERIFICACIONES INICIALES (10 minutos)

**3.1 Acceso a Staging**
- [ ] Login funciona → puedo entrar con usuario admin
- [ ] Sidebar admin aparece
- [ ] Puedo navegar `/admin`

**3.2 Verificar Porterías Configuradas**

Ir a `/admin/porterias`
- [ ] ¿Hay al menos 4 porterías?
- [ ] ¿Cada una tiene un `orden` distinto (1, 2, 3, 4)?
- [ ] ¿Si no, edito una portería y le asigno orden?

**3.3 Verificar Vehículo de Prueba**

Ir a `/admin/vehiculos`
- [ ] Buscar si existe vehículo `TEST001` o crear nuevo
- [ ] Editar vehículo:
  - Patente: `TEST001`
  - Código Interno: `T001`
  - Empresa: Seleccionar una existente
  - Tipo: `Vehículo de prueba`
  - AccessStatus: **YES** (debe estar permitido)
- [ ] Guardar
- [ ] Verificar que `estadoRecinto` es `null` (sin eventos)

✅ **Checkpoint:** Staging verificado, datos listos

---

## 🧪 TESTS FUNCIONALES (Ver documento: STAGING_FUNCTIONAL_TESTS.md)

**Cada test debe ejecutarse EN ORDEN.**

```
TEST 1: Validar Lookup Inicial                      [Time: 5 min]
TEST 2: Entrada Portería 1 (Primera Válida)         [Time: 5 min]
TEST 3: Entrada Portería 2 (Secuencia Correcta)     [Time: 5 min]
TEST 4: Entrada Portería 3 (Continúa Secuencia)     [Time: 5 min]
TEST 5: Entrada Portería 4 - COMPLETA               [Time: 5 min]
TEST 6: Error - Portería Fuera de Secuencia         [Time: 5 min]
TEST 7: Anti-Duplicado (Ventana 5 Minutos)          [Time: 5 min]
TEST 8: Salida Secuencial - Portería 4              [Time: 5 min]
TEST 9: Salida Secuencial - Portería 3, 2, 1        [Time: 15 min]
TEST 10: Salida Portería 1 - COMPLETA               [Time: 5 min]
TEST 11: Historial de Eventos Claro                 [Time: 10 min]
TEST 12: Dashboard - Estados Correctos              [Time: 10 min]
```

**Total:** ~90 minutos de testing completo

---

## ✅ CRITERIOS DE PASS/FAIL

### Todos deben ser ✅ (no puede haber ni uno ❌)

```
✅ Entrada secuencial completa (4 checkpoints)
✅ Solo estado EN_TRANSITO mientras continúa secuencia
✅ Estado DENTRO cuando completa entrada
✅ Salida secuencial completa (4 checkpoints inversos)
✅ Estado FUERA cuando completa salida
✅ Rechazo de portería incorrecta con error claro
✅ Anti-duplicado activo (5 minutos)
✅ Historial ordenado sin duplicados
✅ Dashboard con 3 estados (Dentro, Transito, Fuera)
✅ Filtros dashboard funcionan correctamente
✅ Excel autónomo sigue funcionando (regresión)
✅ Alta manual contratistas funciona (regresión)
```

---

## 🔴 SI ALGO FALLA

### Debugging Guide

**Error en lookup:**
```javascript
// DevTools F12 → Network → /api/access-control-v2/lookup
// Ver exactamente qué devuelve
// Debe incluir nextExpectedPorteria si hay eventos previos
```

**Portería rechazada incorrectamente:**
```sql
-- Verificar histórico de vehículo
SELECT tipoEvento, porteria_id, orden, fecha_hora 
FROM eventos_acceso ea
JOIN porterias p ON ea.porteria_id = p.id
WHERE vehiculo_id = (SELECT id FROM vehicles WHERE licensePlate = 'TEST001')
ORDER BY fecha_hora;

-- Verificar que porteria_id sea correcto
```

**Estado no actualiza:**
```sql
-- Ver estado actual del vehículo
SELECT licensePlate, estadoRecinto FROM vehicles WHERE licensePlate = 'TEST001';
-- Debe actualizar con cada evento
```

**Historial duplicado:**
```sql
-- Verificar si hay eventos duplicados
SELECT COUNT(*), vehiculo_id, porteria_id, tipoEvento, fecha_hora
FROM eventos_acceso
WHERE vehiculo_id = (SELECT id FROM vehicles WHERE licensePlate = 'TEST001')
GROUP BY vehiculo_id, porteria_id, tipoEvento, fecha_hora
HAVING COUNT(*) > 1;
-- Si devuelve filas, hay duplicado
```

---

## 📊 DASHBOARD DE PRUEBAS

Ir a `/admin/dashboard-faena` durante las pruebas

**Debería mostrar (con TEST001):**

| Estado | Count | Progress |
|--------|-------|----------|
| Dentro | 0 → 1 | Después de test 5 |
| En tránsito | 0 → 1 → 0 | Antes y después de test 10 |
| Fuera | 0 → 1 | Después de test 10 |

---

## 🎬 INICIO DE TESTS

**Paso 1:** Abre dos ventanas del navegador
- Ventana 1: `/guard/v2` (para registrar eventos)
- Ventana 2: `/admin/dashboard-faena` (para ver cambios en tiempo real)

**Paso 2:** Abre DevTools (F12) en ventana 1
- Ve a **Network tab**
- Filtra por requests a `/api/access-control-v2`

**Paso 3:** Lee STAGING_FUNCTIONAL_TESTS.md
- Sigue TEST 1, TEST 2, etc. en orden
- Marca cada test ✅ cuando pase

**Paso 4:** Cuando todos los tests pasen ✅
- Guarda una captura de pantalla del dashboard final
- Anota cualquier observación
- Procede a PHASE 4 (abajo)

---

## 🏁 PHASE 4: RESUMEN DE PRUEBAS

Cuando termines ALL 12 tests con ✅:

```markdown
## Resumen de Pruebas Funcionales

**Fecha:** [Hoy]
**Ambiente:** Staging
**Patente Prueba:** TEST001
**Resultado:** ✅ TODOS LOS TESTS PASARON

### Tests Ejecutados
- [x] Test 1-12 completados
- [x] Validación secuencial entrada
- [x] Validación secuencial salida
- [x] Anti-duplicado funcional
- [x] Dashboard actualiza correctamente
- [x] Historial ordenado

### Observaciones
[Aquí anotas lo que observaste, si hay algo anormal]

### Listo para Build Final
✅ Proceder a `npm run build` final
```

---

## 📞 CONTACTO SI HAY PROBLEMAS

1. **Revisa console de servidor:** `npm run dev` mostrará errores
2. **Revisa Red y Console F12:** Errores en cliente
3. **Ejecuta SQL de debugging arriba**
4. **Si necesitas rollback:** 
   ```sql
   DELETE FROM eventos_acceso WHERE vehiculo_id = (SELECT id FROM vehicles WHERE licensePlate = 'TEST001');
   UPDATE vehicles SET estadoRecinto = NULL WHERE licensePlate = 'TEST001';
   ```

---

## ✅ CHECKLIST FINAL PRE-TESTS

Antes de empezar tests, marca todo esto:

- [ ] BD staging migrada (orden agregado a porterias)
- [ ] Enum agregado a BD (EN_TRANSITO)
- [ ] App deployada en staging
- [ ] Puedo login en `/admin`
- [ ] Existen 4+ porterías con orden 1-4
- [ ] Vehículo TEST001 existe con accessStatus=YES y estadoRecinto=null
- [ ] Tengo STAGING_FUNCTIONAL_TESTS.md abierto
- [ ] Tengo 2 ventanas: guard/v2 y dashboard-faena
- [ ] DevTools abierto en Network tab

---

## 🚀 LISTO PARA COMENZAR

Una vez que TODO está ✅ arriba, estás listo para seguir STAGING_FUNCTIONAL_TESTS.md

**Duración estimada:** 90 minutos para todos los tests

**Siguiente:** Ejecuta TEST 1 y repórtate cómo va.
