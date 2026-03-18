# ⚡ 5-MINUTE QUICK START

**For the impatient. Full docs available in other files.**

---

## Step 0: BD Setup (one-time)

```sql
-- Open SQL client → Execute scripts/staging-setup.sql
-- Main sections:
--   1. ALTER TABLE porterias ADD COLUMN orden
--   2. UPDATE porterias SET orden = 1,2,3,4
--   3. ALTER TYPE enum ADD VALUE EN_TRANSITO
--   4. INSERT vehículo TEST001

-- Verify:
SELECT nombre, orden FROM porterias;  -- Should show 4 rows with orden 1,2,3,4
SELECT * FROM vehicles WHERE "licensePlate" = 'TEST001';  -- Should exist, estadoRecinto=NULL
```

Done? ✅ Continue.

---

## Step 1: Start Server

```bash
cd d:\proyectos\web-acceso
npm run dev
```

Server runs on `http://localhost:3000`

---

## Step 2: Test the API Endpoint

Open these URLs in browser (one at a time):

### 2a. See current state
```
http://localhost:3000/api/access-control-v2/debug-test?action=history&licensePlate=TEST001
```

Should return:
```json
{ "historial": [], "totalEventos": 0 }
```

### 2b. Register real event via Guard UI
```
http://localhost:3000/guard/v2
- Enter: TEST001
- Select: Portería 1 (Portería Entrada Minera)
- Type: ENTRADA
- Click: "Registrar Acceso"
```

### 2c. Check updated state
```
http://localhost:3000/api/access-control-v2/debug-test?action=history&licensePlate=TEST001
```

Should now show 1 event in historial

### 2d. Get next expected portería
```
http://localhost:3000/api/access-control-v2/debug-test?action=next&licensePlate=TEST001&tipoEvento=ENTRADA
```

Should return: Portería 2 (Control Caseta)

---

## Step 3: Complete Entry Sequence

Repeat Step 2b for Porterías 2, 3, 4 (in order)

After Portería 4, check:
```
http://localhost:3000/api/access-control-v2/debug-test?action=history&licensePlate=TEST001
```

Should show:
- `totalEventos: 4`
- `estadoActual: "DENTRO"`
- All 4 eventos in order

---

## Step 4: Test Exit Sequence

Register salida in reverse order: 4 → 3 → 2 → 1

After Portería 1, check:
```
http://localhost:3000/api/access-control-v2/debug-test?action=history&licensePlate=TEST001
```

Should show:
- `totalEventos: 8`
- `estadoActual: "FUERA"`

---

## Step 5: Test Anti-Duplicate

Try to register same portería twice within 5 minutes:

```
http://localhost:3000/api/access-control-v2/debug-test
?action=validate
&licensePlate=TEST001
&porteria_id=[LAST_PORTERIA_ID]
&tipoEvento=SALIDA
```

Should return: `{ "valid": false, "reason": "ANTI_DUPLICATE" }`

---

## Step 6: Test Wrong Sequence

Try portería out of order:

```
First: register P1 (ENTRADA)
Then: try to validate P3 directly (skipping P2)
```

```
http://localhost:3000/api/access-control-v2/debug-test
?action=validate
&licensePlate=TEST001
&porteria_id=[PORTERIA_3_ID]
&tipoEvento=ENTRADA
```

Should return: `{ "valid": false, "reason": "INVALID_SEQUENCE" }`

---

## Step 7: Check Dashboard

```
http://localhost:3000/admin/dashboard-faena
```

Should show:
- "En tránsito" card with vehicle count
- 3 separate tables (Dentro, En tránsito, Fuera)
- TEST001 in the appropriate section

---

## Step 8: Reset for Next Test

```
http://localhost:3000/api/access-control-v2/debug-test?action=clean&licensePlate=TEST001
```

Clears all events. Ready to test again.

---

## If Something Breaks

### Event rejected when shouldn't be?
```
?action=validate&licensePlate=TEST001&porteria_id=XXX&tipoEvento=ENTRADA
```
Check the response for the reason

### Want to see SQL data?
```sql
SELECT tipoEvento, p.nombre, p.orden, fecha_hora 
FROM eventos_acceso ea
JOIN porterias p ON ea.porteria_id = p.id
WHERE ea.vehiculo_id = (SELECT id FROM vehicles WHERE "licensePlate"='TEST001')
ORDER BY fecha_hora;
```

### Need to reset vehicle?
```sql
DELETE FROM eventos_acceso 
WHERE vehiculo_id = (SELECT id FROM vehicles WHERE "licensePlate"='TEST001');

UPDATE vehicles 
SET "estadoRecinto" = NULL 
WHERE "licensePlate" = 'TEST001';
```

Or use the endpoint: `?action=clean&licensePlate=TEST001`

---

## Summary

| What | URL / Command |
|------|---|
| See history | `/debug-test?action=history&licensePlate=TEST001` |
| Validate event | `/debug-test?action=validate&licensePlate=TEST001&porteria_id=X&tipoEvento=ENTRADA` |
| Get next portería | `/debug-test?action=next&licensePlate=TEST001&tipoEvento=ENTRADA` |
| Reset vehicle | `/debug-test?action=clean&licensePlate=TEST001` |
| Register event | Go to `/guard/v2` manually |
| Check dashboard | `/admin/dashboard-faena` |

---

## Validation Criteria

- ✅ 4 porterías entrada in order → estado DENTRO
- ✅ 4 porterías salida in reverse → estado FUERA  
- ✅ EN_TRANSITO active during sequence
- ✅ Anti-duplicate rejects < 5min
- ✅ Wrong order rejected
- ✅ Historial shows all 8 events
- ✅ Dashboard has 3 estados visible

All checks pass? You're done. Move to full validation in `STAGING_FUNCTIONAL_TESTS.md`

---

**For detailed explanations, see:**
- `DEBUG_TOOLS_GUIDE.md` → Full instructions
- `STAGING_FUNCTIONAL_TESTS.md` → 12 formal test cases
- `STAGING_DEBUGGING_TOOLKIT.md` → Overview of all tools
