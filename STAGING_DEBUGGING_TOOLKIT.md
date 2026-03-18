# 🛠️ STAGING DEBUGGING TOOLKIT - Resumen Completo

**Fecha:** 18 Marzo 2026  
**Estado:** ✅ Listo para Testing  
**Ambiente:** Staging Only  

---

## 📦 Herramientas Disponibles

Te he preparado 5 herramientas complementarias para testing sin cambiar la lógica principal:

### 1️⃣ **SQL Setup Script**
📄 `scripts/staging-setup.sql`

**Qué hace:**
- Agrega columna `orden` a tabla porterias
- Puebla 4 porterías con orden 1,2,3,4
- Agrega valor EN_TRANSITO al enum
- Crea vehículo TEST001
- Proporciona queries útiles para debugging

**Cuándo usarla:**
- Primera vez antes de cualquier testing
- Para resetear datos entre pruebas

**Tiempo:** ~5 minutos

---

### 2️⃣ **Debug API Endpoint**
📍 `/api/access-control-v2/debug-test`

**Qué hace:**
- 5 actions HTTP GET para validar eventos sin guardar
- Inspecciona estado actual de vehículo
- Simula eventos (dry-run)
- Limpia datos para reset

**Actions:**
```
?action=history      → Ver historial completo
?action=validate     → Validar evento (sin guardar)
?action=simulate     → Simular evento detallado
?action=next         → Próxima portería esperada
?action=clean        → Limpiar eventos (DESTRUCTIVO)
```

**Seguridad:** ❌ Automáticamente deshabilitado en PRODUCCIÓN

**Tiempo:** Inmediato (no requiere setup)

---

### 3️⃣ **Debug Helper Functions**
📄 `lib/porteria/staging-debug.ts`

**Funciones disponibles:**
```typescript
debugGetVehicleSequenceHistory()        // Historial con timestamps
debugValidateSequence()                 // Validar evento (dry-run)
debugSimulateEvent()                    // Simular con detalles
debugGetNextExpectedPorteria()          // Próxima en secuencia
debugCleanVehicleEvents()               // Limpiar historial
debugFormatHistoryForConsole()          // Formatear para print
```

**Cuándo usarlas:**
- Desde Node scripts
- Importar en otros endpoints
- Debugging programático

**Instalación:** Copia las funciones a tu código

---

### 4️⃣ **Console Logging (Opcional)**
📄 `ADDING_DEBUG_LOGS.md`

**Qué hace:**
- Agrega logs condicionales a `sequential-access.ts`
- Muestra en consola qué validación ocurre
- Solo activo si `DEBUG_SEQUENTIAL_PORTERIA=true`

**Logs:**
```
[FIRST_EVENT]       → Primer evento del vehículo
[VALID]             → Evento aceptado
[DUPLICATE]         → Duplicado dentro de 5 min
[INVALID_SEQUENCE]  → Portería fuera de orden
[EN_TRANSITO]       → Vehículo en tránsito
[ENTRADA_COMPLETE]  → Entrada completada → DENTRO
[SALIDA_COMPLETE]   → Salida completada → FUERA
```

**Activar:**
```bash
export DEBUG_SEQUENTIAL_PORTERIA=true
npm run dev
```

**Tiempo:** ~5 minutos si lo agregas manualmente

---

### 5️⃣ **Comprehensive Testing Guide**
📄 `DEBUG_TOOLS_GUIDE.md`

**Contiene:**
- Instrucciones completas de cada herramienta
- Flujo de testing práctico (paso a paso)
- Debugging de errores comunes
- Scripts para monitoreo en tiempo real
- Checklist de validación (16 items)

**Tiempo:** Lectura ~10 minutos

---

## 🎯 PLAN RECOMENDADO DE USO

### **FASE 1: PREPARACIÓN (5-10 minutos)**

```bash
# 1. Ejecuta SQL setup
   - Abre client SQL (pgAdmin, DBeaver)
   - Copia scripts/staging-setup.sql
   - Ejecuta secciones en orden
   - Verifica 4 porterías con orden 1-4

# 2. Verifica BD
   - Vehículo TEST001 existe
   - Enum tiene EN_TRANSITO
   - Tabla porterias tiene columna orden
```

**Checklist:**
- [ ] BD actualizada con migración SQL
- [ ] 4 porterías configuradas (orden 1, 2, 3, 4)
- [ ] Vehículo TEST001 creado
- [ ] Enum EN_TRANSITO presente

---

### **FASE 2: TESTING RÁPIDO (10-15 minutos)**

**Opción A: API Endpoint (más fácil)**
```
1. Abre navegador → /api/access-control-v2/debug-test
2. Ejecuta:
   ?action=history&licensePlate=TEST001
   ?action=validate&licensePlate=TEST001&porteria_id=XXX&tipoEvento=ENTRADA
   ?action=simulate&licensePlate=TEST001&porteria_id=YYY&tipoEvento=ENTRADA
   ?action=next&licensePlate=TEST001&tipoEvento=ENTRADA
3. Verifica responses
```

**Opción B: Console Script (rápido)**
```javascript
// En DevTools Console (F12) del navegador
fetch('/api/access-control-v2/debug-test?action=history&licensePlate=TEST001')
  .then(r => r.json())
  .then(data => {
    console.table(data.historial);
    console.log('Total eventos:', data.totalEventos);
    console.log('Estado actual:', data.vehiculo.estadoActual);
  });
```

---

### **FASE 3: VALIDACIÓN COMPLETA (60-90 minutos)**

Sigue **STAGING_FUNCTIONAL_TESTS.md** (ya tienes este archivo):
- 12 test cases paso a paso
- Cada test con expected responses
- 16 criterios de validación
- SQL queries para verificar BD

---

### **FASE 4: MONITOREO EN TIEMPO REAL (Opcional)**

**Opción A: Habilitar logs en consola servidor**
```bash
export DEBUG_SEQUENTIAL_PORTERIA=true
npm run dev
```
Luego ejecuta pruebas y ve logs en terminal

**Opción B: Monitoreo en navegador**
```javascript
// En DevTools Console
setInterval(async () => {
  const res = await fetch('/api/access-control-v2/debug-test?action=history&licensePlate=TEST001');
  const data = await res.json();
  console.clear();
  console.log(`Eventos: ${data.totalEventos} | Estado: ${data.vehiculo.estadoActual}`);
  console.table(data.historial.slice(-2)); // Últimos 2
}, 2000); // Cada 2 segundos
```

---

## 📡 HERRAMIENTAS POR CASO DE USO

### "¿Qué pasó en el historial?"
→ Usa `action=history` or `debugGetVehicleSequenceHistory()`

### "¿Sería aceptado este evento?"
→ Usa `action=validate` or `debugValidateSequence()`

### "¿Cuál es la siguiente portería?"
→ Usa `action=next` or `debugGetNextExpectedPorteria()`

### "Necesito empezar del cero"
→ Usa `action=clean` or `debugCleanVehicleEvents()`

### "Quiero ver logs detallados de validación"
→ Habilita `DEBUG_SEQUENTIAL_PORTERIA=true`

### "Necesito debugging SQL avanzado"
→ Usa queries en `scripts/staging-setup.sql`

---

## 📊 COMPARATIVA DE HERRAMIENTAS

| Herramienta | Tipo | Complejidad | Velocidad | Requiere Setup |
|-------------|------|-------------|-----------|----------------|
| SQL Script | BD | Media | Instantáneo | ✅ (una sola vez) |
| API Endpoint | HTTP | Baja | Muy rápido | ❌ |
| Debug Functions | TypeScript | Media | Rápido | ❌ |
| Console Logging | Text | Baja | Tiempo real | ✅ (5 min) |
| Testing Guide | Documentación | Alta | 60-90 min | ❌ |

**Recomendación:** Empieza con API Endpoint (sin setup), luego habilita logs si necesitas más detalle.

---

## 🚀 FLUJO RÁPIDO (5 MINUTOS)

```bash
# 1. Abre navegador
http://localhost:3000/api/access-control-v2/debug-test?action=history&licensePlate=TEST001

# 2. Ver qué devuelve
# Debería tener totalEventos: 0 (si es nueva)

# 3. Ejecuta evento real en /guard/v2
# - Escanea TEST001
# - Selecciona Portería 1, ENTRADA
# - Click "Registrar"

# 4. Vuelve a llamar a endpoint
http://localhost:3000/api/access-control-v2/debug-test?action=history&licensePlate=TEST001

# 5. Verifica
# - totalEventos: 1
# - historial[0].tipo: ENTRADA
# - historial[0].porteria: Portería 1

# 6. Consulta siguiente esperada
http://localhost:3000/api/access-control-v2/debug-test?action=next&licensePlate=TEST001&tipoEvento=ENTRADA

# 7. Debería devolver portería orden 2
```

**✅ Si TODO funciona, estás listo para STAGING_FUNCTIONAL_TESTS.md**

---

## 🔴 SI ALGO FALLA

**Paso 1:** Revisa `DEBUG_TOOLS_GUIDE.md` sección "Debugging: Errores Comunes"

**Paso 2:** Consulta los logs apropiados:
```bash
# Error en validación? → Habilita DEBUG_SEQUENTIAL_PORTERIA
# Error en BD? → Ejecuta queries de verificación en SQL
# Error en API? → Revisa Network tab (F12) y response exacta
```

**Paso 3:** Limpia y reinicia:
```
http://localhost:3000/api/access-control-v2/debug-test?action=clean&licensePlate=TEST001
```

**Paso 4:** Avísame exactamente qué retorna el endpoint

---

## 📚 DOCUMENTAÇÃO DISPONIBLE

| Documento | Propósito |
|-----------|-----------|
| `PRE_STAGING_CHECKLIST.md` | Verificaciones antes de testing |
| `DEBUG_TOOLS_GUIDE.md` | Instrucciones detalladas de cada tool |
| `ADDING_DEBUG_LOGS.md` | Cómo agregar logs a sequential-access.ts |
| `STAGING_FUNCTIONAL_TESTS.md` | 12 test cases completos |
| `SEQUENTIAL_PORTERIA_IMPLEMENTATION.md` | Documentación técnica |

**Lectura recomendada:**
1. Este documento (STAGING_DEBUGGING_TOOLKIT.md)
2. PRE_STAGING_CHECKLIST.md
3. DEBUG_TOOLS_GUIDE.md
4. STAGING_FUNCTIONAL_TESTS.md

---

## ✅ VALIDACIÓN FINAL

Cuando termines los tests, tu sistema debería:

- ✅ Entrada: 4 portería en orden → Estado DENTRO
- ✅ Salida: 4 portería en orden inverso → Estado FUERA
- ✅ EN_TRANSITO: Activo durante secuencia
- ✅ Anti-duplicado: Rechaza < 5 minutos
- ✅ Historial: Claro y ordenado
- ✅ Dashboard: 3 estados visibles
- ✅ Excel: Sigue funcionando
- ✅ Manual contractors: Intacto

**Una vez TODO ✅, ejecuta:**
```bash
npm run build
# Debería compilar sin errores y sin warnings
```

**Luego:** Listo para producción

---

## 🎯 NEXT STEPS

1. **Lee** `PRE_STAGING_CHECKLIST.md` (preparación)
2. **Ejecuta** SQL setup desde `scripts/staging-setup.sql`
3. **Prueba** endpoint `/api/access-control-v2/debug-test`
4. **Sigue** tests en `STAGING_FUNCTIONAL_TESTS.md`
5. **Avísame** si algo no funciona

---

**¿Preguntas? Estoy acá para debuggear cualquier problema específico.**

Pero lo normal es que al seguir los checklistts, TODO funcione de una. 👍
