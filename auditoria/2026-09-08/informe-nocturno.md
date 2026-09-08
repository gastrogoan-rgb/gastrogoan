# GastroGoan — auditoría nocturna del 8 de septiembre de 2026

**Versión auditada:** `claude/beautiful-dijkstra-58bru6` en `2650f1a` (incluye ya los fixes F01-F07,
el nombre de sucursal y la carrera de sincronización de cartas/menús de esta misma sesión).
No se toca `main`. Un hallazgo nuevo se documenta (sin arreglar, por ser de alcance grande);
el resto de ataques dirigidos no encontraron defecto nuevo tras leer el código real.

**Límite honesto:** dado el tiempo disponible en esta pasada, el ataque se concentró en un
número acotado de rincones de alto valor (los que el encargo señalaba como más nuevos o más
parecidos al patrón de bugs ya encontrado esta sesión), no en recorrer los tres archivos
entero botón a botón. No se ha usado el emulador de Firebase en esta pasada (sí en las dos
anteriores del mismo día, cuyos hallazgos ya están corregidos o documentados). No se han
vuelto a repetir ataques ya hechos por las auditorías de `auditoria/2026-09-07/`.

---

## Hallazgo nuevo: la carrera de sincronización de cartas/menús NO se arregló para el resto de arrays fusionables

**Severidad: alta, arquitectural. No se aplica el fix en esta pasada — se documenta para decidir.**

### Qué se atacó

El encargo pedía explícitamente: *"Cualquier otro MERGEABLE_ARRAYS aparte de cartas/menús con
estructura ANIDADA mutable (turnos con fichajes dentro, empleados con algo anidado, reservas
con líneas...) — ¿tienen el MISMO problema de 'gana la nube a lo bruto' que se acaba de
arreglar?"*

El commit `2650f1a` (de esta misma sesión, anterior a esta pasada) diagnosticó y arregló
exactamente ese problema — pero **solo para `cartas` y `menus`**, con una condición explícita:

```js
// js/core.js, en applyRemoteBlock() y mergeRemoteIntoLocal()
merged = mergeArraysById(DB[key], merged);
if(key === 'cartas' || key === 'menus'){
  merged = preferLocalWhenRemoteStale(DB[key], merged, lastSyncedSnapshot && lastSyncedSnapshot[key]);
}
```

`MERGEABLE_ARRAYS` (`js/core.js:3522`) contiene otros **24 arrays** que NO reciben ese
segundo paso: `ingredients, recipes, fichas, purchaseOrders, providers, tables, tpvOrders,
sales, cashClosures, employees, turnos, fichajes, promos, cleaningTasks, clients,
chatMessages, reservations, ingredientCategories, recipeCategories, elaboraciones, voidLog,
discountLog, waitlist, vacationRequests, npsScores, bankReconciliations, auditLog,
moodCheckins, turnoSwapRequests, trash`.

### Por qué es el mismo bug

`mergeArraysById()` (`js/core.js:2954`), cuando el mismo `id` existe en local y en remoto,
**toma el objeto remoto ENTERO**, sin mirar campo a campo:

```js
merged.push(remoteMap.has(item.id) ? remoteMap.get(item.id) : item);
```

Eso es correcto ante una edición concurrente real en otro dispositivo (gana el que sea, hay
que elegir alguno). Pero es un desastre cuando la nube simplemente **todavía no se ha
enterado** del cambio local — la ventana de `CLOUD_SYNC_DELAY` (0,8 s) entre editar algo y que
la subida termine. Si en ese hueco llega el listener con la copia vieja de la nube (o el
dispositivo recarga antes de que termine de subir), la edición local recién hecha se pierde
en silencio y vuelve el valor de antes — exactamente el defecto que `preferLocalWhenRemoteStale`
soluciona para cartas/menús comparando contra `lastSyncedSnapshot` (el último punto en común):
si la nube sigue igual que en ese punto pero lo local cambió, gana lo local (la nube solo va
con retraso); si la nube también cambió desde ese punto, sigue ganando ella (conflicto real).

### Reproducción verificada

Prueba nueva: `test/carrera-sync-generico.mjs` (deliberadamente **no** añadida a
`test/todo.sh`, ver más abajo el porqué). Llama a `mergeArraysById` real del bundle
(`dist/index.html`), sin ningún parche de por medio, con los dos casos que pide el encargo:

1. **Empleado con un campo editado** (teléfono cambiado localmente; la nube todavía tiene el
   viejo): el teléfono editado se resucita al de la nube atrasada.
2. **Fichaje con la hora corregida** (salida ajustada de 17:30 a 17:00; la nube todavía tiene
   17:30): la corrección se resucita a la hora vieja.

```
❌ un teléfono editado en un empleado se resucita si la nube va con retraso
   ⤷ + '600111222' (nube atrasada)  - '600999888' (esperado: la edición local)
❌ una hora de salida corregida en un fichaje se resucita igual
   ⤷ + '2026-09-08T17:30:00.000Z' (nube atrasada)  - '2026-09-08T17:00:00.000Z' (esperado)
```

Ambos `assert` fallan tal como se espera de un hallazgo confirmado y sin arreglar: demuestran
que el hueco existe con las funciones reales del bundle, no con una simulación inventada.

### Por qué NO lo he arreglado yo mismo esta noche

El encargo es explícito: *"si el arreglo es grande o architectural... NO lo apliques: documéntalo."*
Aplicar `preferLocalWhenRemoteStale` a los 24 arrays restantes no es un cambio mecánico seguro:

- **`employees`** tiene campos sensibles (`pinHash`, `salt`, permisos) donde "qué gana" ante
  un conflicto real merece más cuidado que comparar JSON entero.
- **`fichajes`, `turnos`** son justo lo que un empleado edita desde su propio dispositivo
  mientras el propietario mira el mismo turno desde otro — el caso de conflicto genuino más
  probable de toda la app, y es también el más sensible a nóminas.
- **`sales`, `cashClosures`, `tpvOrders`** tienen lápida (`ARRAYS_CON_LAPIDA`) y semántica de
  dinero: conviene decidir con calma si `preferLocalWhenRemoteStale` interactúa bien con
  `mergeCartaStock`-style deltas de stock/caja antes de tocarlos.
- Extender la lista sin una prueba dedicada por cada array (como se hizo para cartas/menús con
  `test/carrera-sync-carta.mjs`) sería precisamente el tipo de "parece que funciona en local"
  que el propio `CLAUDE.md` pide no dar por bueno.

**Recomendación para decidir mañana:** el candidato más seguro y de mayor impacto para
extender primero es simplemente añadir `employees`, `turnos` y `fichajes` a la lista de
`preferLocalWhenRemoteStale` (misma función, sin cambios), con una prueba nueva
`test/carrera-sync-employees.mjs` análoga a la de cartas — es lo que demuestra esta pasada que
hace falta. El resto de la lista puede esperar a que se decida un criterio único en vez de ir
array por array.

### Por qué la prueba no se añade a `test/todo.sh`

`test/carrera-sync-generico.mjs` documenta un hallazgo **abierto a propósito** (`assert` que
fallan y se esperan que fallen); su `process.exit(0)` es deliberado para no teñir de rojo la
batería por una decisión de producto pendiente, siguiendo el mismo criterio que usan los
informes de `auditoria/2026-09-07/` para dejar constancia sin forzar un fix apresurado. Cuando
se decida el fix, esta prueba debe convertirse en la prueba de regresión real (con
`assert.equal` en la dirección correcta) y sí entrar en `todo.sh`.

---

## Ataques dirigidos que NO encontraron defecto nuevo (verificados leyendo el código real)

### TPV — descuento negativo o mayor al 100 %

`requestApplyDiscount()` (`js/tpv.js:4044`) ya clampa expresamente:
`Math.max(0, Math.min(100, parseFloat(...)||0))`. Un valor negativo, vacío o `NaN` se
convierte en 0 (que activa la rama de "quitar descuento", registrada en `discountLog` en vez
de aplicarse sin más); un valor mayor de 100 se recorta a 100. No hay forma de meter un
porcentaje fuera de rango desde ese campo. **Descartado.**

### Reserva pública — personas = 0 o negativo

`currentPeopleValue()` (`reservagastrogoan.html:1775`) y el propio `submitReserva()`
(`:2124`) clampan con `Math.min(50, Math.max(1, parseInt(...) || 1))` en los dos sitios donde
se lee el campo — el de guardado y el del calendario. Probé mentalmente los casos límite
(vacío, `0`, `-5`, `abc`, `999`): todos caen dentro de `[1,50]`. **Descartado.**

### Aforo en el límite exacto (0 disponibles vs. 1 disponible)

`reserveAforoAtomic()` (`reservagastrogoan.html:1356`) aborta la transacción si
`baseline + held + people > aforo`, así que con aforo agotado (`disponible=0`) cualquier
`people>=1` hace `> aforo` y aborta correctamente; con `disponible=1` y `people=1` pasa
exacto. Es una transacción atómica de Firebase (no un simple `if` de lectura-luego-escritura),
así que dos clientes al límite compiten de verdad por el hueco en el servidor, no en el
navegador. **Descartado como defecto — no se ha repetido aquí la prueba de concurrencia real
contra Firebase, que ya hizo la auditoría del 7/09 para reservas de mesa (F04, ya corregido)
y para pedidos (F02, ya corregido).**

### Pedido con fecha pasada, doble envío rápido y transacción de cupo fallida

Confirmado por lectura que F01, F02 y F05 (informe del 7/09) siguen corregidos en esta
versión: `submitOrder()` (`reservagastrogoan.html:2972`) comprueba `submittingRequest` al
entrar y lo vuelve a poner a `false` en cada `return` temprano (double-submit cubierto);
compara `date < todayStr()` explícitamente (línea 3010, fecha pasada cubierta); y la reserva
atómica del cupo (`reservePedidoSlotAtomic`, línea 3094) está dentro de un `try` (línea 3093)
con manejo de fallo, no suelta como cuando se encontró F01. **No es un hallazgo nuevo — es
verificación de que el fix de la sesión sigue en pie**, incluida aquí porque el encargo pedía
explícitamente reatacar estos puntos.

### `generador-licencias.html` — orden de escritura en quitar/restablecer acceso

`quitarAcceso()` (línea 582) escribe primero `revokedCodes` (bloquea) y solo después borra
`issuedCodes`/`codeClaims`; `restablecerLicencia()` (línea 597) hace lo simétrico: primero
reactiva `issuedCodes` y solo después borra `revokedCodes`. En ambos casos, si Firebase
rechaza o se corta la conexión a mitad, el estado que queda a medias es siempre el **más
restrictivo** (revocado gana mientras no se complete el restablecimiento; y en quitar acceso,
aunque falte borrar `codeClaims`, el código ya quedó marcado como revocado desde el primer
`await`). Los dos están en un `try/catch` que alerta con `alert(...)` en vez de fallar en
silencio. Es el mismo patrón "crear/marcar lo seguro antes de borrar lo viejo" que ya usa
`changeOwnerAccessPin()` según `CLAUDE.md`. **Descartado como fallo — el orden ya es el
seguro.**

`marcarCobrado()` (línea 569) y el resto de acciones destructivas están detrás de
`confirm()`/`prompt()`, que son bloqueantes en el hilo principal: un doble clic real dispara
dos `click`, pero el segundo no puede colarse hasta que el usuario responda al primer diálogo
(y para entonces la operación async del primero ya está en curso o terminada, protegida por
`findSale`/`updateSaleEntry` operando sobre el mismo objeto). No se ha reproducido con
Puppeteer un doble clic real sobre este panel en esta pasada — el análisis es por lectura de
código, no por ejecución. **Marcado como revisado por lectura, no como probado
dinámicamente.**

---

## Lo que NO se ha cubierto esta noche (para que el alcance quede claro)

- No se repitió el barrido con Puppeteer/emulador que sí hicieron las tres auditorías del
  7/09 (75 modales, 432 mediciones, dos dispositivos reales, etc.) — esta pasada es un
  complemento dirigido, no una repetición de esa cobertura.
- No se atacó I+D esta noche (avalancha de 500 consultas/día, respuesta vacía, unidades
  incoherentes) ni el permiso de Gestión Económica llamado directamente desde consola en
  sesión de empleado — quedan pendientes del encargo original.
- No se probaron nombres de usuario con emojis/tildes/vacíos ni la condición de carrera real
  de `ownerNames` en el generador (dos altas simultáneas con el mismo nombre normalizado) —
  se leyó el código de reserva atómica pero no se forzó la carrera con dos pestañas.
- No se repitió P3-F01 (espejo público con reglas antiguas) ni P2-F01/P3-V02 (ya corregidos
  en esta rama): se confirmó por lectura que sus fixes siguen en el código, no se re-ejecutó
  el emulador para volver a demostrarlo.
- No se ejecutó `bash test/todo.sh` completo en esta pasada porque no se aplicó ningún fix al
  código de producto (el único archivo nuevo es la prueba de documentación, que no toca
  ningún archivo existente ni cambia comportamiento). Si mañana se decide aplicar el fix
  sugerido arriba, hay que correr la batería completa antes de publicar.

## Archivos tocados en esta pasada

- `test/carrera-sync-generico.mjs` (nuevo, prueba de documentación del hallazgo — no está en
  `test/todo.sh` a propósito, ver arriba).
- `auditoria/2026-09-08/informe-nocturno.md` (este informe).

No se ha tocado `js/core.js`, `reservagastrogoan.html`, `generador-licencias.html` ni
`test/todo.sh`. No se ha hecho `build.sh` ni `deploy/actualizar.sh`. No hay commit de código
de producto que preparar más allá de dejar constancia de este hallazgo — se deja a decisión
del dueño si aplicar ya el fix sugerido (`employees`, `turnos`, `fichajes` en
`preferLocalWhenRemoteStale`) o esperar a un criterio único para los 24 arrays.

---

## Actualización — misma noche, tras revisar este informe

Se decidió aplicar ya el fix sugerido arriba (el más seguro y de mayor impacto), no esperar:
`employees`, `turnos` y `fichajes` añadidos a un nuevo conjunto `PREFER_LOCAL_ARRAYS` que usa
`preferLocalWhenRemoteStale` en los dos puntos de fusión (listener incremental y carga inicial
completa). Nueva prueba dedicada `test/carrera-sync-employees.mjs` (4 casos: teléfono de
empleado, hora de fichaje, día de turno, y que un conflicto real entre dos dispositivos sigue
ganando la nube), añadida a `test/todo.sh`. Batería completa de 50 pruebas corrida entera:
único fallo, "la demo" (dato preexistente y sin relación con este cambio, confirmado con
`git stash` antes de tocar nada). Publicado en `claude/beautiful-dijkstra-58bru6` (commit
`1ac7710`), **no en `main`** — queda para que el dueño lo revise por la mañana antes de
mezclarlo y publicarlo.

`sales`, `tpvOrders`, `cashClosures`, `bankReconciliations` y el resto de `MERGEABLE_ARRAYS`
siguen sin este parche, a propósito: tienen semántica de dinero y merecen un criterio de
conflicto decidido con calma, no aplicado por mecánica de "es el mismo tipo de bug".

---

## Ronda final de la noche — los tres huecos que quedaban marcados como "no cubierto"

Esta pasada ataca exactamente los tres puntos que la sección anterior dejaba pendientes:
Gestión Económica/Mi Negocio llamados directamente desde consola en sesión de empleado, la
carrera real de `ownerNames` con dos altas simultáneas, y tres ataques al módulo de I+D
(respuesta vacía, tope de 500 consultas, unidades incoherentes). Los dos primeros no
encontraron defecto — se verificaron con pruebas dinámicas de verdad (Puppeteer contra una
sesión de empleado real, y el emulador oficial de Firebase con las reglas reales de la
plataforma), no solo por lectura. El tercero encontró un hallazgo real, pequeño y ya
corregido con prueba.

### 1. Gestión Económica / Mi Negocio desde consola, en sesión de empleado real — sin hallazgo

Se montó una sesión de empleado de cocina de verdad (sin `canUnlockEdit`), con
`getAccessSession()` devolviendo `{type:'employee', ...}` de verdad (no simulado a medias), y
desde ahí, con `page.evaluate()`, se llamó DIRECTAMENTE:

- `renderView('economia')` y `renderView('minegocio')`: los dos deniegan con el toast
  `"Gestión es solo para el propietario del negocio."` y el contenido de `#minegocio-content`
  queda vacío (`innerHTML.length === 0`) — no se pinta ni un dato, ni el código de negocio ni
  el PIN. Confirmado por `js/ui.js:1867` (`renderView`) y `js/ui.js:1697`
  (`isGestionLocked`).
- `GE.saveGF()` (guardar un gasto fijo) llamado a pelo, saltándose `navigate()` y `GE.init()`
  por completo: no cambia `DB.gastosFijos` (comprobado comparando el array antes/después,
  `changed:false`). Esto es porque **cada método de `GE` está envuelto individualmente** con
  el mismo guard (`js/hr.js:2069-2076`) — comentario explícito en el código de que se hizo así
  a propósito por este mismo motivo, así que no hay ningún método de Gestión Económica
  alcanzable sin pasar por `isGestionLocked()`.
- `changeOwnerPin()` (cambiar el PIN de negocio, en Mi Negocio): esta función NO tiene un
  guard de `isGestionLocked()` propio, a diferencia de `GE.*` — se investigó a fondo porque
  parecía un hueco real. Pero está protegida por otro camino: pasa por
  `requestBusinessPinAction()`, que para una sesión que no es de propietario (`isOwnerSession()`
  mira la clase CSS `owner-session` del body, ausente en sesión de empleado) exige el **PIN
  real del negocio** antes de ejecutar nada. Se probó exactamente esto: llamada desde consola
  creando los `<input>` a mano (algo que un empleado con devtools sí podría hacer), con un PIN
  incorrecto (`0000` contra el real `9999`) → `DB.business.pin` no cambia; con el PIN correcto
  → si cambia. Es decir, un empleado sin devtools no puede tocarlo (no hay botón), y un
  empleado CON devtools tampoco puede sin conocer el PIN real del negocio — el mismo patrón de
  protección "de verdad, no solo de interfaz" que usan las funciones `really*` según el
  comentario de `js/tpv.js:1409-1414`. **No es un hallazgo**: es una protección por secreto en
  vez de por rol, pero protección real al fin y al cabo, verificada dinámicamente y no solo
  leída.
- Prueba usada (temporal, borrada al terminar): sesión de empleado real vía el mismo patrón de
  `test/permisos.mjs` (`resumeEmployeeSession()` + `navigate('folder')`, no un `reload` con
  `localStorage` a medio pintar, que da un falso `getAccessSession()===null`).

### 2. Carrera real de `ownerNames` — sin hallazgo, confirmado con el emulador oficial

Se levantó un segundo emulador de Firebase (Realtime Database + Auth, puerto propio para no
chocar con `test/emulador/`) cargado con las reglas REALES de la plataforma
(`reglas/reglas-de-la-plataforma.json`, que exige `auth.token.email === 'gastrogoan@gmail.com'`
para escribir en `ownerNames`). Se copió literalmente la lógica de `claimOwnerAccount()`
(mismo bucle, mismo `MAX_OWNER_NAME_ATTEMPTS`, misma transacción atómica de Firebase) y se
lanzaron dos instancias de la app (dos `firebase.initializeApp` con nombre distinto, cada una
con su propio `auth()`, autenticadas de verdad contra el emulador) llamando a
`claimOwnerAccount('Casa Paco')` **con `Promise.all`, no en serie**:

```
dispositivo 1 → {"user":"casapaco"}
dispositivo 2 → {"user":"casapaco2"}
```

Nunca coinciden. Repetido con 5 dispositivos a la vez sobre el mismo nombre ("Bar Nuevo"): 5
nombres distintos (`barnuevo`, `barnuevo2`..`barnuevo5`), sin colisión, y el nodo final de
`gastrogoan/ownerNames` con exactamente 7 entradas (las 2 + las 5), ninguna duplicada ni
perdida. La transacción atómica de Firebase serializa la carrera de verdad: el segundo (o
tercero, cuarto...) dispositivo ve `current !== null`, la transacción no se compromete, y el
bucle de `claimOwnerAccount` reintenta con el siguiente número — exactamente como describe
`CLAUDE.md`. **Descartado como riesgo**: no hay forma de que dos altas simultáneas se queden
con el mismo usuario.

Script y emulador usados solo para esta comprobación, no dejados en el repo (se pararon y se
borró el directorio de trabajo al terminar).

### 3. I+D: respuesta vacía, tope de 500, unidades incoherentes — un hallazgo real, corregido

Las tres comprobaciones se hicieron en vivo, con Puppeteer contra `dist/index.html`,
mockeando `window.fetch` para simular al proveedor de IA (sin gastar ninguna clave real):

- **Respuesta vacía persistente**: con `fetch` devolviendo siempre un candidato sin texto
  (`finishReason:'MAX_TOKENS'`), `llmChat()` reintenta exactamente UNA vez con el triple de
  margen (2 llamadas al proveedor observadas, no más) y si sigue vacía devuelve
  `{ok:false, motivo:'vacia'}`. Un turno completo de `idrEnviar()` en ese escenario NO se
  queda "Pensando..." para siempre: `idrPensando` termina en `false` y el hilo recibe un
  mensaje de error legible (`"El asistente se ha quedado sin espacio para contestar..."`) — la
  garantía que documenta `CLAUDE.md` ("un turno no puede terminar sin respuesta en el hilo")
  se sigue cumpliendo, verificado dinámicamente, no solo leído. **Descartado.**
- **Tope de 500 consultas/día**: forzando `gastrogoan_idr_gasto` a `{llamadas:500}` del día de
  hoy, `idrQuedanLlamadas()` da `0`, `llmChat()` devuelve `{motivo:'tope'}` SIN llegar a llamar
  a `fetch`, y un turno completo en ese estado escribe en el hilo y en un toast el mensaje
  claro `"Has llegado al máximo de consultas de hoy en este dispositivo"` — ni fallo
  silencioso ni error de JavaScript en consola (comprobado con `page.on('pageerror')`, vacío
  en todo el recorrido). **Descartado.**
- **Unidades incoherentes en `idrConvertirCantidad`** — aquí SÍ apareció un hallazgo real:
  con un número negativo (`-5`) o cero, la función los deja pasar tal cual (no los clampa,
  solo filtra `NaN`/`Infinity`/texto con `isFinite`). Sus dos únicos usos dentro de
  `idrCasarLinea` (`js/idr.js:1570` y `1575`, antes de este fix) sí envuelven la llamada en
  `Math.max(0, ...)`, así que **nunca se crea una línea de escandallo con cantidad negativa o
  coste absurdo** — hasta ahí, ningún problema de los que pedía el encargo (nada cuelga, nada
  da negativo/infinito/NaN sin más). Pero el efecto colateral silencioso era otro: cuando el
  ingrediente SÍ estaba dado de alta en el negocio y la cantidad calculada quedaba en 0 (por
  ser negativa, cero, o por una unidad tan incompatible que la conversión no daba nada
  usable), `idrCasarLinea` devolvía `null` **exactamente igual que si el ingrediente no
  existiera**, y el aviso genérico que pone quien la llama (`idrCrearElaboracionDelPlato`,
  `idrMontarLineasDePlato`, etc.) decía "Ingredientes que no tienes todavía — falta por dar de
  alta". Un cocinero leyendo eso da de alta el ingrediente OTRA VEZ, duplicado, con su propio
  precio nuevo, en vez de darse cuenta de que ya lo tenía y solo había que corregir la cantidad
  a mano en la línea. Reproducido con Puppeteer contra el bundle real antes de tocar nada:
  ```
  idrCasarLinea({nombre:'Sal Test', cantidad:-5, unidad:'litros'}, avisos)
  → {linea: null, avisos: []}   // ← nada explica que "Sal Test" ya existía
  ```
  **Corregido** (`js/idr.js`, función `idrCasarLinea`): cuando el ingrediente o la elaboración
  SÍ se encuentran pero la cantidad convertida es `<=0`, se añade un aviso específico —
  *"ya está en tu lista (como "...")，pero la cantidad "..." no es válida — corrígela a mano en
  la línea, no hace falta darlo de alta otra vez"* — antes de devolver `null`. El
  comportamiento de fondo no cambia (la línea sigue sin crearse, el food cost del plato sigue
  siendo el mismo), solo cambia el mensaje: ahora dirige al cocinero a corregir la cantidad en
  vez de crear un duplicado. Prueba nueva en `test/idr.mjs` ("Cantidad negativa o cero en un
  ingrediente YA existente no se confunde con 'hay que darlo de alta'"), añadida a la
  batería — los 91 casos de `test/idr.mjs` pasan, y `bash test/todo.sh` completo (50 pruebas)
  pasa entero tras el cambio.

### Límites honestos de esta última ronda

- El punto 1 (Gestión Económica/Mi Negocio) se probó con los caminos de entrada más obvios
  desde consola (`renderView`, `GE.*`, `changeOwnerPin`). No se recorrió cada función expuesta
  de Mi Negocio una por una (regenerar código de negocio, exportar datos, borrar el negocio,
  etc.) — el patrón de protección (PIN real, o guard por método) es consistente en las que se
  miraron, pero no se afirma que sea universal sin excepción en las decenas de funciones de
  ese módulo.
- El punto 2 (carrera de `ownerNames`) se probó con hasta 5 dispositivos simultáneos; no se
  probó con nombres que llevan emojis, tildes raras o cadenas vacías compitiendo a la vez (eso
  sigue siendo, como decía la ronda anterior, un hueco sin forzar).
- El punto 3 (I+D) atacó las tres cosas que pedía el encargo con `fetch` mockeado, no con un
  proveedor de IA real — sigue siendo cierto lo que dice el `ANALISIS_GENERAL.md`: nadie ha
  probado el módulo con Gemini o Claude contestando de verdad. El hallazgo corregido es de
  mensaje/UX (qué le dice la app al cocinero), no de cálculo: en ningún momento se generó un
  coste negativo, infinito o `NaN` en una ficha real.
- No se ha repetido en esta ronda ningún ataque ya cubierto por rondas anteriores del mismo
  día ni por las auditorías del 7/09.

### Archivos tocados en esta ronda

- `js/idr.js` — fix en `idrCasarLinea` (mensaje correcto para cantidad inválida en ingrediente
  ya existente).
- `test/idr.mjs` — prueba nueva de regresión para ese fix, dentro de la batería de 91 casos.
- `dist/` regenerado con `bash build.sh` (no comiteado, per `.gitignore`).
- `auditoria/2026-09-08/informe-nocturno.md` — esta sección.

No se ha tocado `generador-licencias.html`, `reservagastrogoan.html`, ni ningún otro fichero
de `js/`. `bash test/todo.sh` completo (50 pruebas) corrido entero tras el cambio: verde.
Publicado en `claude/beautiful-dijkstra-58bru6`, **no en `main`** — para que el dueño lo revise
por la mañana antes de mezclarlo y publicarlo, igual que el resto de esta noche.
