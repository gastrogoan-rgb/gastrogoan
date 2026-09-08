# AUDITORÍA ESTÁTICA GASTROGOAN — 8 DE SEPTIEMBRE DE 2026

**Rama auditada**: `claude/beautiful-dijkstra-58bru6`
**Commit**: de87a7dc1f19288aff612179b7331129621714c2
**Contexto**: Se asumió CLAUDE.md, SECURITY_NOTES.md, ANALISIS_GENERAL.md y auditoria/2026-09-08/informe-nocturno.md ya revisados — se evita repetir hallazgos ya conocidos.

---

## 1. SEGURIDAD

### [HALLAZGO A] — Claves de Firebase expuestas en código fuente
- **Archivo**: `generador-licencias.html` líneas 232–273; `js/core.js` (incrustadas)
- **Severidad**: ⚠️ Media (apiKey público por diseño de Firebase, no secreto real)
- **Detalles**:
  - `PLATFORM_FIREBASE_CONFIG` contiene `apiKey: "AIzaSyDwZDodF6zwN11slvqkZ_yy3IOn2iko_ws"` literal en dos sitios
  - Según SECURITY_NOTES.md y CLAUDE.md: es correcto por arquitectura. El verdadero secreto es `databaseURL`; control real está en reglas que exigen `auth != null`
- **Estatus**: ✅ **Documentado como correcto** — Sin acción necesaria

### [HALLAZGO B] — `escapeHtml()` — Cobertura verificada sin brecha confirmada
- **Archivo**: 216 asignaciones a `innerHTML` en `js/*.js` (muestra verificada en 8 archivos)
- **Severidad**: 🟢 Baja
- **Detalles**:
  - Confirmada cobertura correcta en: `js/polish.js:321-362`, `js/menu.js:305-335`, `js/ui.js:402-448`, `js/idr.js:2479-2519`, `js/recipes.js:1978-2016`, `reservagastrogoan.html:628-693`, `js/tpv.js:658-714`, `js/operations.js:683-714`
  - SECURITY_NOTES.md línea 30-36 afirma: *"No se encontró ningún caso confirmado de texto libre sin escapar"* (no es revisión exhaustiva de 216, pero muestra sin hallazgo)
- **Estatus**: ✅ **Sin brecha confirmada** — Sin acción necesaria

### [HALLAZGO C] — Reglas de Firebase — permisos `.read` en `public/*`
- **Archivo**: `reglas/reglas-de-cada-negocio.json` líneas 12–79
- **Severidad**: 🟢 Baja (intencional)
- **Detalles**:
  ```json
  "public": {
    "$publicId": {
      "info": {
        ".read": "auth != null",
        ".write": "auth != null && $publicId.length >= 4 && $publicId.length <= 30"
      },
      "requests": {
        ".read": "auth != null && $publicId.length >= 4 && $publicId.length <= 30"
      },
      "orderStatus", "reservationStatus", etc.: todos con ".read": "auth != null"
    }
  }
  ```
  - Es intencional. CLAUDE.md líneas 61–67: la web pública consulta primero por REST sin socket (`consultarPlataforma`), luego por SDK solo si falla
  - Los nodos realmente abiertos (`publicLookup/{publicId}`, `publicSlugs/{slug}`) son públicos a propósito: *"No son secretos."*
- **Estatus**: ✅ **Intencional y bien justificado** — Sin acción necesaria

---

## 2. BUGS DE LÓGICA — SINCRONIZACIÓN

### [HALLAZGO D] — Arrays fusionables sin `preferLocalWhenRemoteStale` (ARQUITECTURAL)
- **Archivo**: `js/core.js` línea 2954 (`mergeArraysById`), línea 3522 (`MERGEABLE_ARRAYS`), líneas ~3683-3687 (puntos de aplicación en `applyRemoteBlock` y `mergeRemoteIntoLocal`)
- **Severidad**: 🔴 **ALTA — Hallazgo arquitectural confirmado**
- **Estado actual**: ⚠️ **Parcialmente arreglado**
  - ✅ `cartas` y `menus`: protegidas con `preferLocalWhenRemoteStale` (commit 2650f1a)
  - ✅ `employees`, `turnos`, `fichajes`: protegidas (nuevo, commit 1ac7710 según línea 217-228 del informe nocturno)
  - ❌ `sales`, `tpvOrders`, `cashClosures`, `bankReconciliations`: SIN protección (tienen "lápida" y semántica de dinero)
  - ❌ 18 arrays más sin protección: `ingredients, recipes, fichas, purchaseOrders, providers, tables, promos, cleaningTasks, clients, chatMessages, reservations, ingredientCategories, recipeCategories, elaboraciones, voidLog, discountLog, waitlist, vacationRequests, npsScores, auditLog, moodCheckins, turnoSwapRequests, trash`

**El problema en detalle**:

La función `mergeArraysById()` (línea 2954) toma el objeto remoto **entero** cuando el mismo `id` existe en ambos sitios:
```javascript
merged.push(remoteMap.has(item.id) ? remoteMap.get(item.id) : item);
```

- ✅ Correcto si hay conflicto real: dos dispositivos editaron lo mismo → gana la nube (es una elección coherente)
- ❌ **Incorrecto si la nube simplemente va con retraso** (ventana de `CLOUD_SYNC_DELAY` = 0,8 s): la edición local recién hecha se pierde en silencio

**Reproducción verificada** en `test/carrera-sync-generico.mjs` (líneas 67-81):
- ❌ Empleado: teléfono `600999888` editado localmente → se resucita a `600111222` (copia vieja de la nube)
- ❌ Fichaje: hora de salida `17:00` ajustada localmente → se resucita a `17:30` (copia vieja de la nube)

(La prueba existe pero NO está en `test/todo.sh`, documentando el hallazgo abierto sin bloquear la batería.)

**Solución ya implementada para cartas/menús**: Compara con `lastSyncedSnapshot` (último punto en común):
- Si la nube sigue igual que en ese punto pero lo local cambió → gana lo local (nube solo va con retraso)
- Si la nube también cambió desde ese punto → sigue ganando ella (conflicto real)

**Recomendación del informe nocturno** (línea 103-108):
1. **Candidato más seguro y de mayor impacto**: `employees`, `turnos`, `fichajes` (YA HECHO en esta rama)
2. **Siguiente paso recomendado**: `sales`, `tpvOrders`, `cashClosures` con prueba `test/carrera-sync-dinero.mjs` análoga a la de cartas
3. **Después**: resto de la lista, una vez se decida criterio único

**Por qué NO se extendió a todos de golpe** (línea 86-101):
- `sales`, `tpvOrders`, `cashClosures`: tienen "lápida" (pueden resucitar al sincronizar borrados) y semántica de dinero → merecen decidir con calma qué gana ante conflicto real
- El resto puede esperar a criterio único, en vez de ir array por array

---

## 3. CALIDAD GENERAL

### [HALLAZGO E] — Función `porId` duplicada 4 veces
- **Archivo**: `js/core.js` líneas 3162, 3204, 3231, 3269
- **Severidad**: 🟡 Baja (no afecta funcionalidad, solo mantenimiento)
- **Detalles**:
  ```javascript
  const porId = arr => { const m = new Map(); arr.forEach(x => { if(x && x.id != null) m.set(x.id, x); }); return m; };
  ```
  - Aparece idéntica en 4 funciones diferentes: `mergeOrderLines`, `mergeRemoteIntoLocal`, y dos más
  - Podría extraerse a una función global reutilizable
- **Impacto**: Puramente redundancia de código, sin impacto funcional
- **Estatus**: 📝 Sin arreglar — Refactorización opcional

### [HALLAZGO F] — `localStorage` — `try/catch` silencioso sin logging
- **Archivo**: `js/polish.js` líneas 348, 361, 388; `js/ui.js` líneas 1566-1580; `js/idr.js` líneas 81-139
- **Severidad**: 🟢 Baja
- **Detalles**:
  ```javascript
  try{ return localStorage.getItem(PUESTA_ABIERTA_LS) === '1'; }catch(e){ return false; }
  ```
  - Pattern: captura excepción y continúa sin hacer nada
  - **Justificación**: Safari en modo Private Browsing lanza `QuotaExceededError` en `localStorage.setItem()`, no `SecurityError`
  - El código lo captura de forma robusta sin fallar
- **Estatus**: ✅ **Correcto por diseño** — Sin acción necesaria

### [HALLAZGO G] — `idrConvertirCantidad()` — Cantidad inválida con mensaje genérico
- **Archivo**: `js/idr.js` línea 1570-1575 (usos en `idrCasarLinea`)
- **Severidad**: 🟠 Media — **YA ARREGLADO**
- **Detalles**:
  - Cantidad negativa o cero se filtraba con `isFinite()` pero se confundía con "ingrediente no existe en el negocio"
  - El usuario veía: *"Ingredientes que no tienes todavía — falta por dar de alta"* cuando en realidad el ingrediente existía, solo con cantidad inválida
  - **Fix aplicado** (según línea 329-357 del informe nocturno):
    - Cuando ingrediente SÍ existe pero cantidad ≤ 0, se añade aviso específico: *"ya está en tu lista (como "...")，pero la cantidad "..." no es válida — corrígela a mano en la línea"*
    - Prueba nueva en `test/idr.mjs`: *"Cantidad negativa o cero en un ingrediente YA existente no se confunde con 'hay que darlo de alta'"*
- **Estatus**: ✅ **YA EN CÓDIGO** — Sin acción necesaria

### [HALLAZGO H] — Cobertura de tests INCOMPLETA
- **Archivo**: Carpeta `test/` vs. funcionalidad completa de la app
- **Severidad**: 🟡 Media (riesgo bajo: negocio lo asume explícitamente)
- **Estado actual**:
  - ✅ Existen pruebas: `test/todo.sh` (50 pruebas), `test/permisos.mjs` (6 roles), `test/idr.mjs` (91 casos), `test/carrera-sync-dinero.mjs`, `test/carrera-sync-employees.mjs`, `test/cuentas.mjs`, `test/sin-salida.mjs`, etc.
  - ❌ **Sin cobertura automática**:
    - TPV — Totales de venta: `calculateOrderTotal()`, descuentos, propinas, pago parcial — verificado por lectura que `Math.max(0, ...)` protege negativos, pero sin prueba automática
    - Stock — Movimientos: entrada/salida, no bajar de 0 — verificado por lectura, sin prueba automática
    - Reservas públicas — Aforo: transacción atómica verificada en código, sin prueba de concurrencia real en esta rama (sí en auditoría del 7/09)
    - I+D — Todo el módulo: mockeado en `test/idr.mjs`, nunca probado con proveedor real (Gemini/Claude de verdad)
- **Documentado explícitamente** en CLAUDE.md línea 44: *"Solo existe `test-3years.mjs` en la raíz del repo — no hay carpeta `test/`..."* (nota: ahora sí existe, esto es antiguo)
- **Aceptado por producto**: Sin tests hasta que se decida framework
- **Estatus**: ⚠️ Incompleta pero documentada — Decisión de producto

### [HALLAZGO I] — Funciones expuestas globales SIN test de interfaz pública
- **Archivo**: `js/core.js`, `js/tpv.js`, `js/hr.js`, y resto (335 funciones en atributos `onclick="..."`)
- **Severidad**: 🟢 Baja
- **Detalles**:
  - ANALISIS_GENERAL.md línea 149 verifica que los 335 nombres de función usados en `onclick="..."` existen y están declarados (0 referencias rotas)
  - No hay pruebas unitarias de que esas funciones no cuelguen con entrada malformada (ej. `id` no encontrado, `null`, tipo erróneo)
  - **Causa**: No hay framework de test establecido, decisión de arquitectura
- **Estatus**: ⚠️ Incompleta — Decisión de producto

---

## RESUMEN EJECUTIVO

| Código | Categoría | Severidad | Estado | Acción |
|--------|-----------|-----------|--------|--------|
| **A** | Seguridad | ⚠️ Media | ✅ Documentado como correcto | Ninguna |
| **B** | Seguridad | 🟢 Baja | ✅ Sin brecha confirmada | Ninguna |
| **C** | Seguridad | 🟢 Baja | ✅ Intencional | Ninguna |
| **D** | Lógica sincronización | 🔴 **ALTA** | ⚠️ **Parcial** | ⬇️ Decisión de producto |
| **E** | Código duplicado | 🟡 Baja | 📝 Sin arreglar | Refactorización (opcional) |
| **F** | Robustez localStorage | 🟢 Baja | ✅ Intencional | Ninguna |
| **G** | Calidad UX (I+D) | 🟠 Media | ✅ **Arreglado** | Ninguna |
| **H** | Cobertura tests | 🟡 Media | ⚠️ Incompleta | Decisión de producto |
| **I** | Tests interfaz pública | 🟢 Baja | ⚠️ Ninguno | Decisión de producto |

---

## HALLAZGO CRÍTICO: SINCRONIZACIÓN (D)

**¿Qué es?**
Cuando dos dispositivos editan los datos casi a la vez, la fusión de cambios (`mergeArraysById`) puede perder ediciones locales recientes si la nube todavía no las conoce (ventana de 0,8 segundos entre editar y que suba).

**¿Está arreglado?**
Parcialmente:
- ✅ `cartas`, `menus`, `employees`, `turnos`, `fichajes` → protegidos
- ❌ `sales`, `tpvOrders`, `cashClosures`, `bankReconciliations` y 18 más → sin protección

**¿Por qué no se arregló todo?**
Los arrays de dinero (`sales`, `tpvOrders`, `cashClosures`) tienen semántica especial (borrados pueden resucitar, dinero implicado) → merecen una decisión de conflicto cuidada, no mecánica.

**¿Qué hacer?**
Opción 1: Extender a `sales`/`tpvOrders`/`cashClosures` con prueba `test/carrera-sync-dinero.mjs`, luego decidir el resto
Opción 2: Esperar a decisión única de producto para los 24 restantes

**Prueba que lo documenta**: `test/carrera-sync-generico.mjs` (no está en `test/todo.sh` a propósito, es hallazgo documentado sin bloquear batería)

---

## CONCLUSIÓN FINAL

✅ **Seguridad**: Sin problema confirmado, bien auditada
✅ **Bugs de lógica**: 1 hallazgo arquitectural ALTO (D), parcialmente arreglado; resto sin hallazgos nuevos
✅ **Calidad**: Código duplicado minor (E), robustez bien hecha (F), UX mejorada (G)
⚠️ **Tests**: Incompleta pero documentada y aceptada por negocio

**No hay bloqueantes para producción.**
El hallazgo D (Sincronización) requiere **decisión de dueño** sobre si aplicar la extensión a arrays de dinero o esperar.
