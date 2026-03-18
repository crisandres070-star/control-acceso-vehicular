# 🔧 STAGING DEBUG TOOLS - Guía de Uso

**Fecha:** 18 Marzo 2026  
**Ambiente:** Staging Only (No Producción)  
**Propósito:** Testing sequential porterías sin modificar lógica principal

---

## 📋 Resumen de Herramientas Disponibles

| Herramienta | Archivo | Uso |
|-------------|---------|-----|
| **SQL Setup Script** | `scripts/staging-setup.sql` | Preparar BD para testing |
| **Debug Functions** | `lib/porteria/staging-debug.ts` | Validar secuencias (sin guardar) |
| **Debug API Endpoint** | `app/api/access-control-v2/debug-test/route.ts` | Llamadas HTTP GET para testing |

---

## 1️⃣ PREPARACIÓN: SQL Setup Script

### Ubicación
📄 `scripts/staging-setup.sql`

### Pasos

**Paso 1:** Abre cliente SQL (pgAdmin, DBeaver, o similar)  
**Paso 2:** Conecta a BD Staging  
**Paso 3:** Copia TODO el contenido de `scripts/staging-setup.sql`  
**Paso 4:** Pégalo en SQL Editor y ejecuta secciones en orden:

```
1. Sección 1: Agregar columna orden (si no existe)
2. Sección 2: Poblar porterías con orden 1, 2, 3, 4
3. Sección 3: Agregar EN_TRANSITO al enum
4. Sección 4: Crear vehículo TEST001
5. Sección 5: (Opcional) Limpiar eventos si necesitas rollback
```

### Verificaciones

Después de ejecutar, corre las **queries de verificación** al final:

```sql
-- Ver orden asignado a porterías
SELECT id, nombre, orden FROM porterias ORDER BY orden;

-- Ver enum actualizado
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'state_recinto_vehiculo'::regtype;

-- Ver vehículo de prueba
SELECT id, "licensePlate", "estadoRecinto" FROM vehicles WHERE "licensePlate" = 'TEST001';
```

✅ **Esperado:**
- 4 porterías con orden 1, 2, 3, 4
- Enum con valores: DENTRO, FUERA, EN_TRANSITO
- Vehículo TEST001 con estadoRecinto = NULL

---

## 2️⃣ VALIDACIÓN: Debug API Endpoint

### Ubicación
`/api/access-control-v2/debug-test`

### Cómo es para no disponible en Producción

El endpoint automáticamente:
- ✅ Funciona en localhost/staging (NODE_ENV !== 'production')
- ❌ Rechaza en producción (403 Forbidden)

### Uso: HTTP GET Requests

Hay 5 actions disponibles. Las puedes llamar desde:
- Browser (URL directa)
- Postman
- `curl` en terminal
- fetch() en consola del navegador

---

## 📍 ACTION 1: `history` - Ver Historial Completo

**Obtiene:** Todos los eventos de un vehículo en orden cronológico

**Llamada:**
```
GET /api/access-control-v2/debug-test?action=history&licensePlate=TEST001
```

**Parámetros:**
| Param | Tipo | Requerido |
|-------|------|-----------|
| action | string | ✅ = "history" |
| licensePlate | string | ✅ |

**Respuesta:**
```json
{
  "vehiculo": {
    "id": "uuid-xxx",
    "licensePlate": "TEST001",
    "estadoActual": "DENTRO"
  },
  "historial": [
    {
      "paso": 1,
      "tipo": "ENTRADA",
      "porteria_id": "abc",
      "porteria_nombre": "Portería Entrada Minera",
      "porteria_orden": 1,
      "fecha_hora": "2026-03-18T10:15:30.000Z",
      "observacion": "Checkpoint 1 de ENTRADA",
      "duracion_desde_anterior_ms": null
    },
    {
      "paso": 2,
      "tipo": "ENTRADA",
      "porteria_nombre": "Control Caseta",
      "porteria_orden": 2,
      "fecha_hora": "2026-03-18T10:16:00.000Z",
      "observacion": "Checkpoint 2 de ENTRADA",
      "duracion_desde_anterior_ms": 30000
    }
  ],
  "totalEventos": 4
}
```

**En Consola del Navegador (F12):**
```javascript
// Llamar desde DevTools Console
fetch('/api/access-control-v2/debug-test?action=history&licensePlate=TEST001')
  .then(r => r.json())
  .then(data => console.table(data.historial))
```

---

## 📍 ACTION 2: `validate` - Validar Evento (Dry-Run)

**Obtiene:** ¿Sería aceptado este evento? (sin guardarlo)

**Llamada:**
```
GET /api/access-control-v2/debug-test?action=validate&licensePlate=TEST001&porteria_id=abc123&tipoEvento=ENTRADA
```

**Parámetros:**
| Param | Tipo | Requerido | Valores |
|-------|------|-----------|---------|
| action | string | ✅ | "validate" |
| licensePlate | string | ✅ | - |
| porteria_id | string | ✅ | UUID de portería |
| tipoEvento | string | ✅ | "ENTRADA" o "SALIDA" |

**Respuesta (Válido):**
```json
{
  "valid": true,
  "message": "Evento es válido para registrar",
  "vehiculo": "TEST001",
  "porteria": "Control Caseta",
  "tipoEvento": "ENTRADA"
}
```

**Respuesta (Inválido - Duplicado):**
```json
{
  "valid": false,
  "reason": "ANTI_DUPLICATE",
  "message": "Mismo evento en portería Control Caseta hace 2.3 minutos",
  "tiempoMinutosRestantes": "2.7"
}
```

**Respuesta (Inválido - Secuencia):**
```json
{
  "valid": false,
  "reason": "INVALID_SEQUENCE",
  "message": "Entrada debe ser en orden ascendente. Última: Control Caseta (orden 2), Intento: Portería Entrada Minera (orden 1)",
  "esperada": "Portería orden > 2"
}
```

---

## 📍 ACTION 3: `simulate` - Simular Evento

**Obtiene:** ¿Qué pasaría si registro este evento?

**Similar a validate, pero más detallado**

**Llamada:**
```
GET /api/access-control-v2/debug-test?action=simulate&licensePlate=TEST001&porteria_id=abc123&tipoEvento=ENTRADA
```

**Respuesta (Aceptado):**
```json
{
  "simulado": true,
  "aceptado": true,
  "historico_actual": 4,
  "detalles": {
    "estado_actual": "EN_TRANSITO",
    "ultimo_evento": {
      "paso": 4,
      "tipo": "ENTRADA",
      "porteria_nombre": "Portería Salida Operativa",
      "porteria_orden": 3,
      "fecha_hora": "2026-03-18T10:20:00.000Z"
    }
  }
}
```

**Respuesta (Rechazado):**
```json
{
  "simulado": true,
  "aceptado": false,
  "razon": "ANTI_DUPLICATE",
  "detalles": { ... }
}
```

---

## 📍 ACTION 4: `next` - Próxima Portería Esperada

**Obtiene:** ¿Cuál es la siguiente portería válida en la secuencia?

**Llamada:**
```
GET /api/access-control-v2/debug-test?action=next&licensePlate=TEST001&tipoEvento=ENTRADA
```

**Parámetros:**
| Param | Tipo | Requerido |
|-------|------|-----------|
| action | string | ✅ |
| licensePlate | string | ✅ |
| tipoEvento | string | ✅ |

**Respuesta (En Secuencia):**
```json
{
  "siguiente": {
    "id": "p4-uuid",
    "nombre": "Portería Salida Operativa",
    "orden": 3
  },
  "razon": "Continuar secuencia ascendente"
}
```

**Respuesta (Secuencia Completa):**
```json
{
  "siguiente": null,
  "razon": "Entrada completa (última portería)"
}
```

**Respuesta (Sin Eventos Previos):**
```json
{
  "siguiente": {
    "id": "p1-uuid",
    "nombre": "Portería Entrada Minera",
    "orden": 1
  },
  "razon": "Sin eventos previos"
}
```

---

## 📍 ACTION 5: `clean` - Limpiar Eventos (Destructivo)

**⚠️ DESTRUCTIVO:** Elimina TODOS los eventos de un vehículo

**SOLO EN STAGING - NO EN PRODUCCIÓN**

**Llamada:**
```
GET /api/access-control-v2/debug-test?action=clean&licensePlate=TEST001
```

**Parámetros:**
| Param | Tipo | Requerido |
|-------|------|-----------|
| action | string | ✅ |
| licensePlate | string | ✅ |

**Respuesta:**
```json
{
  "cleaned": true,
  "vehiculo": "TEST001",
  "eventosEliminados": 12
}
```

**Efecto:**
- ✅ Elimina todos los eventos_acceso del vehículo
- ✅ Resetea estadoRecinto a NULL
- ✅ Listo para pruebas nuevas

---

## 🧪 FLUJO DE TESTING PRÁCTICO

### Escenario: Probar entrada secuencial (4 porterías)

**Paso 1: Ver estado inicial**
```
GET /api/access-control-v2/debug-test?action=history&licensePlate=TEST001
```
✅ Debería devolver: `totalEventos: 0`

**Paso 2: Validar primera portería**
```
GET /api/access-control-v2/debug-test
  ?action=validate
  &licensePlate=TEST001
  &porteria_id=[PORTERIA_1_ID]
  &tipoEvento=ENTRADA
```
✅ Debería devolver: `valid: true`

**Paso 3: Simular evento (antes de guardarlo realmente)**
```
GET /api/access-control-v2/debug-test
  ?action=simulate
  &licensePlate=TEST001
  &porteria_id=[PORTERIA_1_ID]
  &tipoEvento=ENTRADA
```
✅ Debería devolver: `aceptado: true`

**Paso 4: Guardar evento REAL vía /guard UI**
- Ir a `/guard/v2`
- Escanear/ingresar TEST001
- Seleccionar Portería 1, Tipo: ENTRADA
- Click en "Registrar Acceso"

**Paso 5: Verificar valor siguiente**
```
GET /api/access-control-v2/debug-test
  ?action=next
  &licensePlate=TEST001
  &tipoEvento=ENTRADA
```
✅ Debería devolver: `siguiente.nombre = "Control Caseta"` (Portería 2)

**Paso 6: Repetir P2, P3, P4**

**Paso 7: Ver historial completo**
```
GET /api/access-control-v2/debug-test?action=history&licensePlate=TEST001
```
✅ Debería devolver: 4 eventos en orden, estado = DENTRO

---

## 🔍 DEBUGGING: Errores Comunes

### Error: "Vehículo no encontrado"
**Causa:** Patente diferente o no existe en BD  
**Solución:** 
```sql
SELECT "licensePlate" FROM vehicles LIMIT 5;
-- Copia la patente exacta (con mayúsculas/minúsculas)
```

### Error: "Portería ID no existe"
**Causa:** ID de portería inválida  
**Solución:** 
```sql
SELECT id, nombre, orden FROM porterias;
-- Copia el ID exacto (UUID)
```

### Evento rechazado "ANTI_DUPLICATE"
**Causa:** Mismo evento en la misma portería hace < 5 minutos  
**Solución:**
- Esperar 5 minutos, O
- Cambiar de portería, O
- Usar `action=clean` para resetear vehículo

### Evento rechazado "INVALID_SEQUENCE"
**Causa:** Portería fuera de orden  
**Ejemplo:** Si último fue orden 2, no puedes ir a orden 1 (debe ser orden > 2)  
**Solución:**
- Consultar `action=next` para saber cuál es la siguiente válida
- Ver historial con `action=history`

### Estado no actualiza a DENTRO
**Causa:** Secuencia incompleta (aún no pasó por última portería)  
**Solución:**
- Continuar añadiendo eventos hasta pasar por portería orden 4
- Ver con `action=history` cuántos eventos faltan

---

## 📊 MONITOREO EN TIEMPO REAL

Si tienes **servidor running** (`npm run dev`), puedes:

**Opción 1: Consola del Navegador (F12)**
```javascript
// Script para monitorear TEST001 cada 3 segundos
setInterval(async () => {
  const res = await fetch('/api/access-control-v2/debug-test?action=history&licensePlate=TEST001');
  const data = await res.json();
  console.clear();
  console.log(`Total eventos: ${data.totalEventos}`);
  console.log(`Estado: ${data.vehiculo.estadoActual}`);
  console.table(data.historial.slice(-3)); // Últimos 3 eventos
}, 3000);
```

**Opción 2: Terminal Node (si ejecutas en script)**
```typescript
import { debugGetVehicleSequenceHistory } from '@/lib/porteria/staging-debug';

const history = await debugGetVehicleSequenceHistory('TEST001');
console.log(history);
```

---

## 🎯 CHECKLIST DE VALIDACIÓN

Usa estas preguntas para validar que TODO funciona:

- [ ] ¿Puedo ver historial vacío de TEST001?
- [ ] ¿Valida correctamente primera portería (orden 1)?
- [ ] ¿Rechaza portería fuera de orden (ej: orden 3 primero)?
- [ ] ¿Anti-duplicado funciona (rechaza hace < 5 min)?
- [ ] ¿Siguiente portería es correcta después de cada evento?
- [ ] ¿Estado pasa a EN_TRANSITO durante entrada?
- [ ] ¿Estado cambia a DENTRO cuando completa entrada (4 eventos)?
- [ ] ¿Salida es orden inverso (4→3→2→1)?
- [ ] ¿Estado EN_TRANSITO durante salida?
- [ ] ¿Estado FUERA cuando completa salida?
- [ ] ¿Historial muestra observación "Checkpoint N de ENTRADA/SALIDA"?
- [ ] ¿Puedo limpiar y empezar de nuevo?

✅ **Si TODOS están ✅, el sistema está listo para STAGING_FUNCTIONAL_TESTS.md**

---

## 🚀 NEXT STEPS

1. Ejecuta `scripts/staging-setup.sql` en BD Staging
2. Abre `/api/access-control-v2/debug-test` sin parámetros para ver help
3. Sigue "FLUJO DE TESTING PRÁCTICO" arriba
4. Una vez validado, pasa a `STAGING_FUNCTIONAL_TESTS.md` para tests formales

**¿Preguntas o necesitas ajustes? Avísame cuál action no funciona.**
