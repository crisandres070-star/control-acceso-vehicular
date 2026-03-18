# 📋 STAGING TESTING TOOLKIT - INDEX

**Status:** ✅ Build Clean - Ready for Staging Validation  
**Date:** 18 Marzo 2026  
**Goal:** Test sequential porterías without modifying production code  

---

## 📁 NEW FILES CREATED

### 1. SQL & Database
```
scripts/staging-setup.sql
├─ Agregar columna orden a porterias
├─ Poblar orden 1, 2, 3, 4
├─ Agregar EN_TRANSITO al enum
├─ Crear vehículo TEST001
└─ Helper queries para debugging
```

### 2. Debug API Endpoint
```
app/api/access-control-v2/debug-test/route.ts
├─ ?action=history          → Ver historial completo
├─ ?action=validate         → Validar evento (sin guardar)
├─ ?action=simulate         → Simular con detalles
├─ ?action=next             → Próxima portería esperada
└─ ?action=clean            → Limpiar eventos
```

### 3. Debug Helper Library
```
lib/porteria/staging-debug.ts
├─ debugGetVehicleSequenceHistory()
├─ debugValidateSequence()
├─ debugSimulateEvent()
├─ debugGetNextExpectedPorteria()
├─ debugCleanVehicleEvents()
└─ debugFormatHistoryForConsole()
```

### 4. Documentation
```
PRE_STAGING_CHECKLIST.md
├─ Verificaciones pre-testing
├─ Debugging guide
└─ PHASE 4 resumen

DEBUG_TOOLS_GUIDE.md
├─ Cómo usar cada herramienta
├─ Flujo de testing práctico
├─ Errores comunes
└─ Monitoreo en tiempo real

ADDING_DEBUG_LOGS.md
├─ Agregar logs a sequential-access.ts (opcional)
├─ Habilitar con DEBUG_SEQUENTIAL_PORTERIA=true
└─ Detalles línea por línea

STAGING_DEBUGGING_TOOLKIT.md
├─ Resumen de todas las herramientas
├─ Plan de uso recomendado
├─ Comparativa de herramientas
└─ Flujo rápido de 5 minutos

STAGING_FUNCTIONAL_TESTS.md
├─ 12 test cases completos
├─ Expected responses
├─ 16 criterios de validación
└─ Patente de prueba: TEST001
```

### 5. Previous Documentation (Already Created)
```
SEQUENTIAL_PORTERIA_IMPLEMENTATION.md
├─ Documentación técnica general
├─ Comportamiento de los 3 estados
├─ Ejemplo de historial
└─ Pre-production checklist

PRE_STAGING_CHECKLIST.md (versión anterior)
├─ Pasos iniciales
├─ Verificación de desarrollo
└─ Uso de herramientas
```

---

## 🚀 QUICK START (5 MIN)

```bash
# 1. SQL Setup
cd d:\proyectos\web-acceso
# Abre client SQL → Ejecuta scripts/staging-setup.sql

# 2. Empezar servidor
npm run dev

# 3. Verificar en navegador
http://localhost:3000/api/access-control-v2/debug-test?action=history&licensePlate=TEST001

# 4. Ver endpoint response
{
  "vehiculo": { "licensePlate": "TEST001", "estadoActual": null },
  "historial": [],
  "totalEventos": 0
}

# ✅ Si ves esto, estás listo
```

---

## 📖 RECOMMENDED READING ORDER

1. **Este archivo** → Referencia rápida (5 min)
2. `STAGING_DEBUGGING_TOOLKIT.md` → Visión general (10 min)
3. `PRE_STAGING_CHECKLIST.md` → Preparación paso a paso (15 min)
4. `DEBUG_TOOLS_GUIDE.md` → Detalles de cada herramienta (15 min)
5. `STAGING_FUNCTIONAL_TESTS.md` → Ejecutar tests (60-90 min)

**Opcional:**
- `ADDING_DEBUG_LOGS.md` → Si necesitas logs en consola
- `SEQUENTIAL_PORTERIA_IMPLEMENTATION.md` → Documentación técnica completa

---

## 🛠️ TOOLS AT A GLANCE

| Tool | Command / File | Purpose | Time |
|------|---|---------|------|
| **SQL Setup** | `scripts/staging-setup.sql` | Prepare BD | 5 min |
| **API Debug** | `/api/.../debug-test?action=...` | Test events | instant |
| **Helper Lib** | `lib/porteria/staging-debug.ts` | Programmatic testing | flexible |
| **Console Logs** | Set `DEBUG_SEQUENTIAL_PORTERIA=true` | Monitor validation | real-time |
| **Full Tests** | `STAGING_FUNCTIONAL_TESTS.md` | Complete validation | 60-90 min |

---

## 📍 API ENDPOINT CHEAT SHEET

```bash
# Get history
/api/access-control-v2/debug-test?action=history&licensePlate=TEST001

# Validate event
/api/access-control-v2/debug-test?action=validate&licensePlate=TEST001&porteria_id=UUID&tipoEvento=ENTRADA

# Simulate
/api/access-control-v2/debug-test?action=simulate&licensePlate=TEST001&porteria_id=UUID&tipoEvento=ENTRADA

# Get next expected
/api/access-control-v2/debug-test?action=next&licensePlate=TEST001&tipoEvento=ENTRADA

# Clean (DESTRUCTIVE)
/api/access-control-v2/debug-test?action=clean&licensePlate=TEST001
```

---

## ✅ VALIDATION CHECKLIST

Before starting tests, verify:

- [ ] BD migrated (orden column + EN_TRANSITO enum)
- [ ] 4 porterías configured (orden 1, 2, 3, 4)
- [ ] TEST001 vehicle created (estadoRecinto = NULL)
- [ ] Server running (`npm run dev`)
- [ ] API endpoint accessible
- [ ] Can access `/guard/v2` interface
- [ ] Can access `/admin/dashboard-faena`

---

## 🔴 WHEN YOU GET STUCK

1. **Check status:** `?action=history&licensePlate=TEST001`
2. **Debug:** `?action=validate&...` to see if event would be accepted
3. **Reset:** `?action=clean&licensePlate=TEST001` then start over
4. **SQL:** Run verification queries from `scripts/staging-setup.sql`
5. **Read:** Section "Debugging: Errores Comunes" in `DEBUG_TOOLS_GUIDE.md`

---

## 🎯 WHAT'S NEXT

### Immediatamente:
1. Prepara BD con `scripts/staging-setup.sql`
2. Abre `/api/access-control-v2/debug-test` (sin params)
3. Lee entrada en `STAGING_DEBUGGING_TOOLKIT.md` (10 min)

### En 15 minutos:
1. Corre `?action=history` para TEST001
2. Corre evento en `/guard/v2` para TEST001
3. Verifica cambios con `?action=history` nuevamente

### En 30 minutos:
1. Sigue flujo en `DEBUG_TOOLS_GUIDE.md`
2. Valida entrada secuencial completa (4 porterías)
3. Valida salida secuencial completa (4 porterías)

### Cuando estés listo:
1. Sigue `STAGING_FUNCTIONAL_TESTS.md` (12 tests)
2. Marca cada test ✅ cuando pase
3. Cuando TODO esté ✅, avísame para build final

---

## 💾 NO CHANGES TO PRODUCTION CODE

✅ All tools are additive:
- New endpoint (`/api/access-control-v2/debug-test`) → isolated
- New helper lib (`lib/porteria/staging-debug.ts`) → optional
- Console logging → conditional (if DEBUG=true)
- SQL scripts → only for staging BD

❌ NO changes to:
- `sequential-access.ts` main logic (unless you manually add logs)
- `access-control-v2/events/route.ts` 
- Any other production code

---

## 🚀 BUILD STATUS

```
✅ Last build: CLEAN
   - 37 routes compiled
   - 0 errors, 0 warnings
   - Ready for staging testing
   - TypeScript strict mode: OK
```

**Next:** Staging functional tests, then final build

---

## 📞 HELP

Each document has detailed instructions:
- **API questions?** → `DEBUG_TOOLS_GUIDE.md`
- **SQL questions?** → `scripts/staging-setup.sql` comments
- **Test failing?** → `STAGING_FUNCTIONAL_TESTS.md`
- **General approach?** → `STAGING_DEBUGGING_TOOLKIT.md`

---

**Ready to begin? Start with `PRE_STAGING_CHECKLIST.md` → then follow the guides.** 👍
