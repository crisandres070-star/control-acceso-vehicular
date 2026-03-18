# 📝 ADDING DEBUG LOGS TO sequential-access.ts

**Ubicación:** `lib/porteria/sequential-access.ts`

**Propósito:** Agregar logging condicional (NO-INTRUSIVO) cuando `DEBUG_SEQUENTIAL_PORTERIA=true`

**Por qué:** Ver en consola qué está validando el sistema en cada evento

---

## Paso 1: Agregar función de debug al inicio del archivo

Después de las importaciones (línea ~2), agrega:

```typescript
import { prisma } from "@/lib/prisma";
import { TipoEventoAcceso, EstadoRecintoVehiculo } from "@prisma/client";

// ============ AGREGAR ESTO ============
// Debug logging utility (only if DEBUG_SEQUENTIAL_PORTERIA env var is set)
const DEBUG = process.env.DEBUG_SEQUENTIAL_PORTERIA === 'true';
function debugLog(msg: string, data?: any) {
    if (DEBUG) {
        const timestamp = new Date().toISOString();
        if (data) {
            console.log(`[${timestamp}] [SEQ-PORTERIA] ${msg}`, data);
        } else {
            console.log(`[${timestamp}] [SEQ-PORTERIA] ${msg}`);
        }
    }
}
// ======================================

/**
 * Sequential Portería Access Control
 * ...
```

---

## Paso 2: Agregar logs a `hasRecentDuplicate()` 

En función `hasRecentDuplicate`, RETORNO:

**ANTES:**
```typescript
async function hasRecentDuplicate(
    vehiculoId: number,
    porteriaId: number,
    windowMinutes: number = 5
): Promise<boolean> {
    const fiveMinutesAgo = new Date(Date.now() - windowMinutes * 60 * 1000);

    const recent = await prisma.eventoAcceso.findFirst({
        where: {
            vehiculoId,
            porteriaId,
            fechaHora: { gte: fiveMinutesAgo },
        },
        orderBy: { fechaHora: "desc" },
    });

    return !!recent;
}
```

**DESPUÉS:**
```typescript
async function hasRecentDuplicate(
    vehiculoId: number,
    porteriaId: number,
    windowMinutes: number = 5
): Promise<boolean> {
    const fiveMinutesAgo = new Date(Date.now() - windowMinutes * 60 * 1000);

    const recent = await prisma.eventoAcceso.findFirst({
        where: {
            vehiculoId,
            porteriaId,
            fechaHora: { gte: fiveMinutesAgo },
        },
        orderBy: { fechaHora: "desc" },
    });

    if (recent) {
        debugLog(`[DUPLICATE] Portería ${porteriaId} registrada hace ${
            Math.round((Date.now() - recent.fechaHora.getTime()) / 1000 / 60 * 10) / 10
        } minutos`);
    }
    
    return !!recent;
}
```

---

## Paso 3: Agregar logs a `validateNextCheckpoint()`

En función `validateNextCheckpoint()`, después de CADA `return`:

**Línea ~155 (primer return - DUPLICATE):**
```typescript
    if (await hasRecentDuplicate(vehiculoId, porteriaId)) {
        debugLog(`[DUPLICATE] Portería ${porteriaId} registrado recientemente`);
        return {
            valid: false,
            message: `Ya fue registrado recientemente en esta portería. Espere un momento.`,
        };
    }
```

**Línea ~168 (no encontrada):**
```typescript
    if (!currentPorteria) {
        debugLog(`[NOT_FOUND] Portería ${porteriaId} no existe`);
        return {
            valid: false,
            message: `Portería no encontrada.`,
        };
    }
```

**Línea ~177 (primer evento):**
```typescript
    const lastEvent = await getLastCheckpoint(vehiculoId);
    if (!lastEvent) {
        debugLog(`[FIRST_EVENT] Vehículo ${vehiculoId} sin eventos previos`, {
            porteria: currentPorteria.nombre,
            tipoEvento,
        });
        return {
            valid: true,
            nextExpectedPorteria: currentPorteria,
        };
    }
```

**Línea ~186 (secuencia completa - mismo tipo):**
```typescript
    if (!nextExpected) {
        if (lastEvent.tipoEvento === tipoEvento) {
            debugLog(`[SEQUENCE_COMPLETE] No hay más porterías esperadas para ${tipoEvento}`);
            return {
                valid: false,
                message: `La secuencia de ${tipoEvento === "ENTRADA" ? "entrada" : "salida"} ya se completó.`,
            };
        }
```

**Línea ~193 (nueva secuencia):**
```typescript
        debugLog(`[NEW_SEQUENCE] Iniciando nueva secuencia de ${tipoEvento} (era ${lastEvent.tipoEvento})`);
        return {
            valid: true,
            nextExpectedPorteria: currentPorteria,
        };
```

**Línea ~202 (secuencia inválida):**
```typescript
    if (nextExpected.id !== porteriaId) {
        debugLog(`[INVALID_SEQUENCE] Vehículo ${vehiculoId}`, {
            intento: { porteria: currentPorteria.nombre, orden: currentPorteria.orden },
            esperada: { porteria: nextExpected.nombre, orden: nextExpected.orden },
        });
        return {
            valid: false,
            message: `El siguiente checkpoint esperado es ${nextExpected.nombre}. Se intentó registrar en ${currentPorteria.nombre}.`,
            nextExpectedPorteria: nextExpected,
        };
    }
```

**Línea ~210 (válido):**
```typescript
    debugLog(`[VALID] Evento aceptado para vehículo ${vehiculoId}`, {
        porteria: currentPorteria.nombre,
        tipoEvento,
        orden: currentPorteria.orden,
    });
    return {
        valid: true,
        nextExpectedPorteria: currentPorteria,
    };
```

---

## Paso 4: Agregar logs a `determineSequenceCompletion()`

En función `determineSequenceCompletion()`:

**Entrada completa:**
```typescript
    if (tipoEvento === "ENTRADA") {
        if (!nextExpected) {
            debugLog(`[ENTRADA_COMPLETE] Vehículo ${vehiculoId} completó entrada → DENTRO`);
            return { isComplete: true, suggestedEstado: "DENTRO" };
        }
        debugLog(`[EN_TRANSITO] Vehículo ${vehiculoId} en tránsito durante entrada`);
        return { isComplete: false, suggestedEstado: "EN_TRANSITO" };
    }
```

**Salida completa:**
```typescript
    if (tipoEvento === "SALIDA") {
        if (!nextExpected) {
            debugLog(`[SALIDA_COMPLETE] Vehículo ${vehiculoId} completó salida → FUERA`);
            return { isComplete: true, suggestedEstado: "FUERA" };
        }
        debugLog(`[EN_TRANSITO] Vehículo ${vehiculoId} en tránsito durante salida`);
        return { isComplete: false, suggestedEstado: "EN_TRANSITO" };
    }
```

---

## Cómo Usar

**Habilitar logs:**
```bash
# En .env.local o al correr servidor
export DEBUG_SEQUENTIAL_PORTERIA=true
npm run dev
```

**Verás en consola del servidor:**
```
[2026-03-18T10:15:30.000Z] [SEQ-PORTERIA] [FIRST_EVENT] Vehículo 123 sin eventos previos {
  porteria: 'Portería Entrada Minera',
  tipoEvento: 'ENTRADA'
}

[2026-03-18T10:15:35.000Z] [SEQ-PORTERIA] [VALID] Evento aceptado para vehículo 123 {
  porteria: 'Portería Entrada Minera',
  tipoEvento: 'ENTRADA',
  orden: 1
}

[2026-03-18T10:15:45.000Z] [SEQ-PORTERIA] [EN_TRANSITO] Vehículo 123 en tránsito durante entrada

[2026-03-18T10:16:00.000Z] [SEQ-PORTERIA] [INVALID_SEQUENCE] Vehículo 123 {
  intento: { porteria: 'Control Caseta', orden: 2 },
  esperada: { porteria: 'Control Caseta', orden: 2 }
}
```

---

## Deshabilitar Logs

```bash
# O simplemente no setear la variable, o:
export DEBUG_SEQUENTIAL_PORTERIA=false
npm run dev
```

Los logs desaparecerán (cero overhead en performance).

---

## Logs Disponibles Completos

| Log | Significado |
|-----|-------------|
| `[FIRST_EVENT]` | Primer evento del vehículo |
| `[VALID]` | Evento aceptado |
| `[DUPLICATE]` | Duplicado en ventana de 5 min |
| `[INVALID_SEQUENCE]` | Portería fuera de orden |
| `[SEQUENCE_COMPLETE]` | No hay más porterías en secuencia |
| `[NEW_SEQUENCE]` | Cambio ENTRADA→SALIDA o viceversa |
| `[EN_TRANSITO]` | Vehículo en tránsito (continúa secuencia) |
| `[ENTRADA_COMPLETE]` | Entrada completada, estado = DENTRO |
| `[SALIDA_COMPLETE]` | Salida completada, estado = FUERA |
| `[NOT_FOUND]` | Portería no existe |

---

## Integración con DEBUG_TOOLS_GUIDE.md

Los logs aquí **se complementan** con:
- `/api/access-control-v2/debug-test` (HTTP API)
- `lib/porteria/staging-debug.ts` (funciones helper)

**Flujo recomendado:**
1. Habilita `DEBUG_SEQUENTIAL_PORTERIA=true` en `.env.local`
2. Corre `npm run dev`
3. Ejecuta pruebas en `/guard/v2`
4. Monitorea logs en consola del servidor
5. Usa `/api/access-control-v2/debug-test?action=history` para detalle

---

## Testing sin Código

Si NO quieres editar el archivo, puedes usar:
- ✅ Debug API endpoint (`/api/access-control-v2/debug-test`)
- ✅ SQL queries en `scripts/staging-setup.sql`
- ✅ staging-debug.ts helper functions

El archivo `sequential-access.ts` funciona perfecto sin logs.
