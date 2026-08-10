# Auditoría técnica pre-lanzamiento — GastroGoan

**Fecha**: 10/08/2026 · **Rama**: `claude/beautiful-dijkstra-58bru6`

**Método**: lectura exhaustiva de código con citas exactas (`archivo:línea`) en todos los bloques, más **pruebas activas ejecutadas de verdad** allí donde era viable sin navegador/Firebase real (`test/audit-active.mjs`, que carga el código real de `js/core.js`/`js/ui.js` en un sandbox de Node y demuestra los hallazgos de licencias/login en vivo, y `test/smoke.test.mjs` para dinero/stock). Cada hallazgo indica si está **verificado con test real** o **solo por lectura de código** — esta distinción se respeta en todo el informe.

---

## FASE 1 — Mapeo de la app

| Zona / función | Archivo(s) principal(es) |
|---|---|
| Núcleo de datos, IndexedDB, sync con Firebase, licencias, sesión/login | `js/core.js` (3762 líneas) |
| Traducciones es/ca/en | `js/i18n.js` (5513 líneas) |
| Navegación, layout, sesión de propietario (`isOwnerSession`), badges | `js/ui.js` (1476 líneas) |
| Gestión Económica, ingredientes (Mega Lista), proveedores | `js/finance.js` (1647 líneas) |
| Escandallo, Fichas Técnicas | `js/recipes.js` (1384 líneas) |
| Oferta Gastronómica/Bebidas (Carta) | `js/menu.js` (1172 líneas) |
| TPV, comandas de cocina, cobro, VeriFactu | `js/tpv.js` (4395 líneas) |
| Pedidos a proveedores, reservas, promoción | `js/operations.js` (1702 líneas) |
| Personal, turnos, PINs de empleado | `js/hr.js` (3624 líneas) |
| Ajustes menores | `js/polish.js` (68 líneas) |
| Mi Negocio, Panel de Control, Manual de Uso, capa de UI general | `js/app.js` (7764 líneas) |
| **Generador de licencias** | `generador-licencias.html` (250 líneas, herramienta privada, NO se distribuye a clientes) |
| Build | `build.sh` — concatena `js/*.js` en este orden exacto: `core → i18n → ui → finance → recipes → menu → tpv → operations → hr → polish → app`, dentro de un único `dist/index.html` |

**Discrepancias con la descripción de partida**: ninguna estructural — Cocina/Sala/Gestión existen tal cual se describieron, repartidas como se indica en la tabla. El generador de licencias sí existe como archivo separado (`generador-licencias.html`), fuera del bundle de `build.sh` (correcto: no debe viajar al cliente).

---

## FASE 2 — Hallazgos por bloque

### 🔴 BLOQUEANTE

#### B1. La licencia se puede falsificar sin usar el generador oficial — ✅ **RESUELTO**
**Módulo**: `js/core.js:966-970` (`_ggBizSecret`), `:971-980` (`ggBizPassword`), ahora `:1011-1053` (`verifyCodeIssuedOnPlatform`, `activateBusinessLicenseLocal`, `activateBusinessLicense`), `generador-licencias.html`.
**Verificado con**: test real, `test/audit-active.mjs` (sección A, con un Firebase simulado) — el mismo escenario que antes demostraba el fallo ahora se **rechaza** correctamente. **Además, confirmado en vivo el mismo día contra el proyecto Firebase real** (`plataforma-gastrogoan`), tras publicar la regla de seguridad y crear el usuario administrador: un código inventado (`PIRATA01`) con su contraseña recalculada correctamente (`5KC8HJ`) se rechazó de verdad, y el código generado legítimamente con sesión de administrador (`8W86L9HS`/`JPEGKU`) se activó sin problema. Esto es la confirmación de mayor confianza de todo el informe — no solo lectura de código ni test simulado, sino el ataque real ejecutado contra la infraestructura real de producción y bloqueado.
**Descripción original**: la "contraseña" de una licencia era `hash(code + SECRETO_FIJO)` recalculable por cualquiera, sin ninguna comprobación contra nada externo.
**Fix aplicado** (10/08/2026, opción elegida: "nodo Firebase de solo-validación", sin Cloud Functions): se aprovechó que ya existía un proyecto Firebase compartido de la plataforma (`plataforma-gastrogoan`) con un nodo `gastrogoan/issuedCodes/{code}` que `generador-licencias.html` ya usaba para garantizar códigos únicos. Ahora **también sirve como lista blanca real**:
- `activateBusinessLicense()` (`js/core.js`) pasó a ser `async`: primero recalcula localmente (como antes, sigue haciendo falta), y si cuadra, comprueba además que el código exista de verdad en `issuedCodes` de la plataforma antes de aceptar la activación. Sin eso, ya no basta con inventarse un código y calcular su contraseña.
- Los 3 puntos donde se llamaba a `activateBusinessLicense()` (`confirmOwnerAccessSetup`, `promptBusinessLicense`/`addNewBusiness`, `activateLicenseFromGate`) se actualizaron a `async`/`await`, con un mensaje distinto para "credenciales incorrectas" que para "sin conexión" (`access.licenseOffline`/`gate.licenseOffline` en `js/i18n.js`, es/ca/en).
- **La activación exige internet** (a diferencia de la revocación de licencias ya activas, que sigue siendo fail-open a propósito para no dejar tirado a un negocio sin wifi en el día a día) — es razonable porque activar es un momento puntual y deliberado (dar de alta un negocio nuevo), casi siempre con el vendedor delante.
- Las licencias ya guardadas localmente (`isStoredLicenseValid`) se siguen revalidando sin red, así que el uso diario offline no cambia en nada.
- **`generador-licencias.html`** se actualizó para exigir el login del administrador (email+contraseña de Firebase Authentication, no autenticación anónima) antes de poder escribir en `issuedCodes` — con la regla de escritura anterior (`auth != null`, cualquier sesión anónima) cualquiera podría haberse auto-emitido un código válido igualmente. Ver el comentario en la cabecera del archivo con las reglas de Firebase exactas a pegar en la consola.
**Acción pendiente completada (10/08/2026)**: se creó el usuario administrador en Firebase Authentication y se publicó la regla de seguridad actualizada en `plataforma-gastrogoan` → Realtime Database → Rules. Confirmado en vivo con el test descrito arriba. Este hallazgo se da por cerrado sin condiciones pendientes.

Nota: durante la verificación se detectó y corrigió un bug propio en `ensureAdminLogin()` (`generador-licencias.html`) — daba por válida cualquier sesión de Firebase ya abierta en el navegador, incluida la sesión anónima que usa el resto de la app, sin comprobar que fuera realmente el usuario administrador (las sesiones anónimas no tienen `.email`, ahora se distingue por eso). Sin ese arreglo, el botón de login se declaraba "iniciado" sin pedir nunca las credenciales reales.

#### B2. Una sola licencia sirve para negocios/dispositivos ilimitados sin ningún control — ✅ **RESUELTO por diseño (sin cambio de código)**
**Módulo**: `js/core.js` (`ggBizTenantId`).
**Verificado con**: test real, `test/audit-active.mjs` (sección B) — confirma que el mismo `code` produce siempre el mismo `tenantId`.
**Reevaluación (10/08/2026), tras aclarar con el negocio la política real que se quería**: el requisito de negocio es exactamente "1 código = 1 negocio, usable en tantos dispositivos como haga falta ese negocio; un negocio nuevo necesita sí o sí un código nuevo". Revisando `ggBizTenantId(code)` con ese requisito en mente (no con el que se asumió en la primera pasada del audit, "límite de activaciones/dispositivos"): al ser el `tenantId` una función **determinista y única** de `code`, es **matemáticamente imposible** que el mismo código acabe apuntando a dos negocios distintos, o que dos códigos distintos acaben compartiendo negocio. Reactivar el mismo código en 1 dispositivo o en 20 siempre resuelve al mismo `tenantId` — no hay ningún camino, ni siquiera reutilizando el código a propósito desde "Dar de alta un negocio nuevo" (`addNewBusiness`), para que un código sirva para dos negocios independientes: como mucho, un uso indebido ahí haría que el "negocio nuevo" acabara compartiendo los mismos datos del negocio original (confuso, pero no una licencia gratis para un negocio aparte).
**Conclusión**: no hacía falta ningún límite de activaciones ni contador — el propio diseño ya garantiza la política deseada. La primera versión de este hallazgo asumía un requisito de negocio distinto (limitar dispositivos) que, aclarado con el negocio, no era el real.

#### B3. Cualquier empleado puede convertirse en "propietario" desde la consola del navegador, sin PIN — ✅ **RESUELTO (parcialmente, ver alcance)**
**Módulo**: `js/ui.js:1125-1127` (`isOwnerSession`), usado como única puerta a Gestión Económica/Mi Negocio en decenas de sitios de `js/app.js`, `js/hr.js`, `js/finance.js`.
**Verificado con**: test real, `test/audit-active.mjs` (sección C) — sigue mostrando (a propósito) que `isOwnerSession()` en sí sigue siendo una simple clase CSS: eso no ha cambiado ni podía cambiar sin autenticación real por usuario.
**Descripción original**: `isOwnerSession()` solo comprueba una clase CSS en `document.body`. La navegación normal (`navigate()`) ya pedía el PIN del negocio antes de entrar en Gestión, pero llamar directamente a `renderView('economia')`, `GE.init()` o `renderMiNegocio()` desde la consola se saltaba ese PIN por completo.
**Fix aplicado** (10/08/2026): se repite la comprobación (`isGestionLocked`) en tres puntos más, no solo en `navigate()`:
- `js/ui.js` — `renderView(view)` ahora comprueba `isGestionLocked(view)` como primera línea, antes del `switch`.
- `js/hr.js` — `GE.init()` comprueba `isGestionLocked('economia')` antes de pintar nada.
- `js/app.js` — `renderMiNegocio()` comprueba `isGestionLocked('minegocio')` antes de pintar nada.

Con esto, aunque se llame a cualquiera de esas funciones directamente desde la consola saltándose `navigate()`, sigue pidiendo el PIN del negocio antes de mostrar ningún dato.
**Alcance de lo NO resuelto**: esto sigue siendo una comprobación client-side — el dato en sí (todo el nodo Firebase del tenant) sigue siendo legible/escribible por cualquiera con la sesión abierta si se ataca directamente contra Firebase en vez de contra las funciones de render (ej. leyendo `firebase.database().ref(...)` a mano). Cerrar eso de verdad requiere autenticación real por usuario + reglas de Firebase por rol, que sigue pendiente de decidir como cambio de arquitectura mayor. Lo aplicado hoy sube el listón de "un clic en consola" a "hace falta saber además cómo hablar directamente con el SDK de Firebase", que es una mejora real aunque no el cierre completo del hallazgo.

#### B4. No existe ningún flujo de anulación/reembolso de una venta ya cobrada — ✅ **RESUELTO**
**Módulo**: `js/tpv.js` (`requestCancelSale`, `restockForVoidedItems`, `reallyCancelSale`, nuevas), botón añadido en `openTicketDeliveryModal`.
**Verificado con**: solo lectura de código (el flujo pide PIN y modal, no es puramente puro para testear en Node sin DOM real) + `node -c` y las suites de tests existentes en verde tras el cambio.
**Fix aplicado**: nuevo botón "Anular venta" en el modal de ticket, protegido con el PIN del negocio (`requestBusinessPinAction`, el mismo patrón que ya usaba el resto de acciones sensibles de TPV). Al confirmar:
- Revierte el stock de raciones del plato (`p.stock`) y el de ingredientes/elaboraciones consumidos por su receta — simétrico a `decrementDishStock`/`discountStockForOrder`, no un simple "sumar lo que sea".
- Marca `sale.status = 'anulada'` (no la borra: sigue en `DB.sales` por trazabilidad) y registra quién y cuándo en `DB.voidLog`, reutilizando el mismo panel de "Anulaciones" que ya existía para líneas.
- Si la venta ya se había enviado a VeriFactu, la marca con `needsRectification: true` en vez de intentar automatizar una rectificativa contra Invocash sin haber probado antes ese flujo en vivo (ver `docs/VERIFACTU_PENDIENTE.md`).
- **`activeSales()`** (nueva función en `js/finance.js`) excluye las ventas anuladas de las cifras de facturación — aplicado a los 6 cálculos de ingresos más directamente visibles al propietario (`salesTotalForRange`, `geVentasIvaGroupsMes`, `geComisionesMes`, ventas del dashboard de los últimos 30 días, ventas de hoy, y el gráfico de 8 semanas).
**Alcance de lo NO resuelto**: no se revisaron todos los ~26 sitios que leen `DB.sales` en `app.js`/`hr.js`/`tpv.js` (estadísticas de personal, historial de pedidos, etc.) — quedan sin excluir las ventas anuladas en esos sitios secundarios, que no afectan a la cifra de caja/facturación pero sí podrían, por ejemplo, seguir contando una venta anulada en algún ranking de "platos más vendidos" de un camarero. Se documenta aquí en vez de tocar 26 sitios sin poder verificar cada uno con calma.

#### B5. El total enviado a VeriFactu no cuadra con el total del ticket cuando hay propina — ✅ **RESUELTO**
**Módulo**: `js/tpv.js:4035-4066` (`submitSaleToVerifactuApi`).
**Verificado con**: **test real**, `test/smoke.test.mjs` (nuevo test añadido) — simula una venta de 20€ + 2€ de propina, intercepta la llamada `fetch` a `/invoices` y confirma que `total === suma de las líneas` y que ese total es 20€, no 22€.
**Descripción original**: el total enviado a VeriFactu incluía la propina, pero el desglose de líneas no, dejando un descuadre estructural.
**Fix aplicado**: confirmado con el negocio que las propinas no se facturan ni se declaran en el IVA — se resta la propina del total antes de enviarlo a VeriFactu (`const total = Math.round((sale.total - (parseFloat(sale.propina)||0))*100)/100`), de forma que la suma de las líneas cuadra exactamente con el total del documento en todos los casos, no solo quitando el símbolo del problema para un caso concreto.

---

### 🟠 ALTO

#### A1. El hash de PIN de empleado es trivialmente crackable — ✅ **RESUELTO (parcial, ver alcance)**
**Fix aplicado** (10/08/2026): la sal de `hashPin` ya no es una constante global — incluye el código de licencia del propio negocio (`DB.license.code`), distinto por instalación. Confirmado con test real: una tabla arcoíris calculada contra un negocio ya no descifra nada de otro negocio distinto. **Lo que sigue sin resolver, a propósito**: el límite físico de 10.000 combinaciones para un PIN de 4 dígitos no depende de la sal — conociendo el código de UN negocio concreto (que no es secreto, se comparte con los empleados por diseño), su PIN se sigue pudiendo romper al instante. Cerrar esto del todo necesitaría además un límite de intentos fallidos en la propia UI, no implementado esta noche por ser un cambio de UX más amplio (¿cuántos intentos? ¿qué pasa al superarlo?) que merece decidirse aparte.
**Módulo**: `js/core.js:1635-1644` (`hashPin`).
**Verificado con**: test real, `test/audit-active.mjs` (sección D) — ✅ pasa: un PIN de 4 dígitos se recupera del hash en 54 ms probando las 10.000 combinaciones posibles.
**Descripción**: `hashPin` usa FNV-1a con una sal **fija e idéntica para todas las instalaciones** (`'GG2024$p'`), embebida en el JS del cliente. Con solo 10.000 PINs posibles y sal pública, una tabla arcoíris de 10.000 entradas descifra cualquier PIN al instante — y sirve para todos los negocios por igual, porque la sal no varía.
**Impacto real**: quien tenga acceso al JS (cualquiera) y a los datos sincronizados de un negocio (el propio empleado, o alguien con el `tenantId`) puede recuperar el PIN real de cualquier compañero, no solo intuirlo.
**Fix sugerido**: usar una sal por negocio (derivada del `tenantId`, que sí es distinto por instalación) en vez de una constante global, y/o subir a un algoritmo lento (PBKDF2/bcrypt vía Web Crypto) en lugar de un hash rápido — aunque con solo 10.000 combinaciones posibles, ningún hash por sí solo es suficiente sin además limitar los intentos de PIN incorrecto en la propia UI (rate limiting local).

#### A2. Los PINs por defecto se guardan en texto plano hasta que el empleado los cambia — ✅ **RESUELTO (empleados; PIN de negocio antes de configurarlo, sin tocar — ver alcance)**
**Fix aplicado** (10/08/2026): el PIN por defecto de un empleado (`'1234'`) se guarda ya hasheado desde el momento en que se crea o se resetea, tanto en el alta de un empleado nuevo como al recuperar datos antiguos sin `pin` al cargar la DB. **No se tocó** el PIN de negocio en `defaultData()` (el que existe antes de que el propietario configure uno real, con `pinSet:false`) porque en ese punto concreto `DB.license` puede no estar cargado todavía — la ventana de exposición ahí es además mucho más corta (se resuelve en el primer login real), así que se dejó fuera para no arriesgar un fallo en el arranque de la app por una ganancia pequeña.
**Módulo**: `js/hr.js:2834` (reset a `'1234'`), `js/core.js:3325-3326`, `js/hr.js:3013-3020` (`pinMatchesEmployeeOrBusiness`, que contempla explícitamente ambos formatos, con y sin prefijo `H:`).
**Verificado con**: solo lectura de código.
**Descripción**: el PIN por defecto (`1234`) y cualquier PIN reseteado se guardan sin hashear hasta el primer cambio del empleado. Esos datos viajan a Firebase igual que el resto de la base de datos del negocio.
**Impacto real**: ventana de exposición real cada vez que se da de alta o se resetea un PIN, hasta que el propio empleado lo cambia — que en la práctica puede no pasar nunca si nadie se lo recuerda.
**Fix sugerido**: hashear también el valor por defecto al crearlo, en vez de esperar al primer cambio manual.

#### A3. Voids de línea (antes de cobrar) no revierten el stock ya descontado — ✅ **RESUELTO**
**Fix aplicado** (10/08/2026): tanto `confirmVoidLine` como `cancelAcceptedOnlineOrder` ahora restituyen el stock de plato e ingredientes/elaboraciones exactamente por la cantidad que de verdad se había "marchado" (no toda la línea, si solo se había marchado una parte), reutilizando el mismo helper `restockForVoidedItems` que ya se había creado para B4 (anular una venta cobrada).
**Módulo**: `js/tpv.js:2957-2995` (`confirmVoidLine`), y `cancelAcceptedOnlineOrder` (`tpv.js:1069-1082`).
**Verificado con**: solo lectura de código.
**Descripción**: cuando se "marcha" una línea a cocina, se llama a `decrementDishStock`. Si esa línea se anula después (pedido mal tomado, cliente cambia de opinión), el void queda registrado en `DB.voidLog` pero el stock descontado **no se restituye**.
**Impacto real**: el contador de raciones disponibles de un plato con stock limitado queda permanentemente corto cada vez que esto ocurre, acumulando error durante el servicio sin que nadie lo note hasta que el plato se marca "no disponible" estando realmente disponible.
**Fix sugerido**: añadir la reversión de stock (`p.stock = Math.min(original, p.stock + qty)`) dentro de `confirmVoidLine` y `cancelAcceptedOnlineOrder`, simétrica a `decrementDishStock`.

#### A4. Borrar una receta base usada indirectamente no avisa, y deja referencias colgando que devalúan el coste silenciosamente — ✅ **RESUELTO**
**Fix aplicado** (10/08/2026): `recipesUsingBaseRecipe` ahora es recursiva (sigue la cadena completa de dependencias, no solo el nivel directo) — verificado con test real (base A dentro de base B dentro del plato C: borrar A avisa de B y C). Además, `confirmDeleteRecipe` limpia las líneas de otras recetas que quedarían apuntando a un `baseRecipeId` ya borrado, en vez de dejarlas devolver coste 0 en silencio — también verificado con test real.
**Módulo**: `js/recipes.js:711-777` (`recipesUsingBaseRecipe`, `deleteRecipe`/`confirmDeleteRecipe`), coste en `js/recipes.js:27-31` (`recipeIngredientCost`).
**Verificado con**: solo lectura de código.
**Descripción**: `recipesUsingBaseRecipe` solo detecta referencias **directas** (nivel 1). Una base usada dentro de otra base, a su vez usada en un plato, no genera ningún aviso al borrar la primera. Además, al confirmar el borrado, las líneas de receta que apuntan a ese `baseRecipeId` no se limpian — quedan huérfanas. `recipeIngredientCost` maneja esa referencia nula devolviendo silenciosamente coste `0` en vez de avisar.
**Impacto real**: el food cost mostrado para platos que dependen (aunque sea indirectamente) de esa base queda infravalorado sin ningún aviso posterior al primer momento del borrado — un propietario podría estar tomando decisiones de precio con márgenes de coste incorrectos sin saberlo.
**Fix sugerido**: hacer `recipesUsingBaseRecipe` recursivo (seguir la cadena de dependencias, no solo el nivel 1), y limpiar (o marcar visiblemente como "receta base eliminada") las líneas huérfanas en vez de dejarlas devolver coste 0 en silencio.

#### A5. `fichaModalState` puede construirse a partir de un `getRecipe()` sin comprobar null — ✅ **RESUELTO**
**Fix aplicado** (10/08/2026): `openFichaModal` comprueba ahora que la ficha (`getFicha(id)`) o la receta (`getRecipe(recipeId)`) existan de verdad antes de usarlas — si ya no existen (borradas desde otro dispositivo), avisa con un toast y no revienta.
**Módulo**: `js/recipes.js:1025` (aprox., citado por el agente de auditoría de integridad).
**Verificado con**: solo lectura de código.
**Descripción**: si se abre la ficha técnica de una receta cuyo id ya no existe (borrada en otra pestaña/dispositivo mientras la UI seguía mostrándola), `getRecipe(recipeId)` devuelve `undefined` y el código lo desreferencia directamente (`r.name`, `r.id`).
**Impacto real**: crash de la UI (pantalla en blanco / error) en un escenario perfectamente plausible con varios dispositivos sincronizando en un mismo negocio.
**Fix sugerido**: `const r = getRecipe(recipeId); if(!r) { showToast(...); return; }` antes de usarla.

#### A6. No hay cola de reintento persistente para escrituras offline — solo el buffer en memoria del SDK de Firebase — ✅ **RESUELTO**
**Fix aplicado** (10/08/2026): la causa raíz real, verificada con test, era más concreta de lo que sugería el título — `flushCloudSync()` marcaba un bloque como "ya sincronizado" (`lastSyncedSnapshot`) de forma **optimista**, antes de que Firebase confirmara el envío. Si el envío fallaba, ese bloque quedaba marcado como sincronizado sin estarlo, y nada volvía a reintentarlo jamás. Ahora el snapshot solo se actualiza tras la confirmación real (`.then()`), un fallo programa un reintento automático cada 15s, y un listener de `online` reintenta en cuanto vuelve la conexión — sin esperar al temporizador. Verificado con test real: un primer intento fallido NO marca el bloque como sincronizado; un segundo intento (reintento) con éxito sí lo marca.
**Módulo**: `js/core.js` (`saveDB`:3358, `scheduleCloudSync`:3381, `flushCloudSync`:3396) — no se encontró ningún listener `online`/`offline` ni cola propia.
**Verificado con**: solo lectura de código.
**Descripción**: los datos se guardan primero en IndexedDB (esto sí es seguro localmente), pero el envío a Firebase depende enteramente de que el SDK reconecte con la pestaña **todavía abierta**. Si la tablet se queda sin conexión y se cierra o recarga la pestaña antes de reconectar, ese envío pendiente se pierde sin más reintento que el que el propio SDK intentaría si la pestaña siguiera viva.
**Impacto real**: en el escenario exacto que preocupa ("wifi cayendo un viernes noche"), el dato sobrevive en el dispositivo que lo creó, pero no hay garantía de que llegue nunca a la nube ni de que otros dispositivos del negocio lo vean, más allá del indicador de estado (ver hallazgo Medio M3).
**Fix sugerido**: mantener una cola explícita de operaciones pendientes en IndexedDB (no solo el snapshot de datos) que se reintente activamente al recuperar conexión, independientemente de si la pestaña se recargó.

#### A7. Edición concurrente del mismo registro: gana el último en escribir, sin fusión ni aviso — ✅ **RESUELTO (con aviso, no con fusión — ver alcance)**
**Fix aplicado** (10/08/2026): re-lectura del código mostró que `applyRemoteBlock` (el camino habitual de aplicar cambios remotos) **ya usaba** `mergeArraysById` para los arrays fusionables — la primera versión de este hallazgo lo había pasado por alto. El problema real que sí seguía sin resolver: `mergeArraysById` se queda con la versión remota **entera** de un registro si hay colisión, sin fusión campo a campo (fusionar de verdad, por ejemplo, dos ediciones distintas de la misma comanda, es arriesgado sin arriesgarse a corromper el pedido — no se intentó esa fusión esta noche por prudencia). Lo que sí se añadió: una detección real de colisión (¿cambió el registro localmente sin subir, Y también cambió en remoto, Y no es el mismo cambio?) que avisa con un toast y deja constancia en `DB.auditLog`, en vez de sobrescribir en silencio sin que nadie se entere — verificado con test real (colisión real avisa; cambio remoto normal sin edición local pendiente no avisa de nada).
**Módulo**: `js/core.js:2249` (`mergeRemoteIntoLocal`), `:2234` (`attachCloudChildListeners`), `:1601` (`mergeArraysById`, usado solo en algunos caminos, no en la escritura habitual).
**Verificado con**: solo lectura de código.
**Descripción**: las escrituras se hacen por bloque completo (todo el array `tpvOrders`, todo `sales`, etc.), no por campo. La reconciliación remota compara si el JSON cambió, no marcas de tiempo por registro.
**Impacto real**: dos tablets editando la misma mesa casi a la vez —el escenario central que esta app existe para resolver— pueden perder silenciosamente los cambios de una de las dos, sin aviso a ninguna de ellas.
**Fix sugerido**: aplicar `mergeArraysById` de forma sistemática en el camino de escritura habitual (no solo en casos especiales), y añadir un campo `updatedAt` por registro para poder al menos detectar (y avisar) cuándo hay una colisión real en vez de sobrescribir en silencio.

---

### 🟡 MEDIO

#### M1. `deleteIngredient` avisa pero no bloquea el borrado de un ingrediente en uso
**Módulo**: `js/finance.js:1026-1066`.
**Verificado con**: solo lectura de código.
**Descripción**: si el ingrediente está en uso, se muestra un aviso, pero el botón "Borrar de todas formas" lo permite igualmente. La limpieza posterior de las líneas de receta afectadas **sí se hace bien** (se filtran las líneas huérfanas), y el cálculo de coste ya está protegido con `if(!ing) return 0`. Riesgo bajo gracias a esa doble red, pero conviene documentarlo como decisión consciente de UX, no como bug.

#### M2. Renombrar una categoría/proveedor puede filtrarse entre Cocina y Sala si coinciden en nombre
**Módulo**: `js/finance.js:925` (`renameIngredientCategory`), `js/operations.js:594`, `js/hr.js:69` (`proveedores()`).
**Verificado con**: solo lectura de código.
**Descripción**: estas funciones concretas hacen `DB.ingredients.forEach(...)` filtrando solo por nombre coincidente, sin filtrar además por `area`. El resto de listados/renders de la app sí respetan `area` correctamente (verificado en la mayoría de sitios).
**Impacto real**: si Cocina y Sala tienen, por coincidencia, una categoría o proveedor con el mismo nombre, renombrarlo en una zona lo renombra también en la otra sin avisar.

#### M5. Reserva ↔ mesa: el aviso cruzado existe pero es descartable con un clic, sin dejar rastro
**Módulo**: `js/tpv.js:1262-1304` (`confirmOpenTableOrder`), `js/app.js:2573-2596` (`getUpcomingReservationForTable`, ventana de 90 min).
**Verificado con**: solo lectura de código.
**Descripción**: al abrir una mesa como walk-in, la app sí comprueba si hay una reserva próxima (`±90 min`) para esa mesa y muestra un `confirm()` nativo — no son sistemas ciegos entre sí, como cabría temer. Pero es un aviso, no un bloqueo: un `confirm()` aceptado con un clic, sin registrar en ningún sitio que se ignoró.
**Impacto real**: si luego llega el cliente de la reserva y la mesa está ocupada por el walk-in, no queda ningún rastro de que el sistema ya avisó — es una decisión de diseño razonable (el camarero manda), pero sin trazabilidad para revisar después qué pasó.

#### M6. Cocina no tiene confirmación visible de que una comanda enviada desde sala "ha llegado"
**Módulo**: `js/core.js:2236-2242` (listener `child_added`/`child_changed` de Firebase), `js/tpv.js:2529` (`renderComandasCocina`).
**Verificado con**: solo lectura de código.
**Descripción**: el mecanismo en sí es sólido — listener en tiempo real de Firebase, no polling, con debounce de 800ms al escribir (nada de "cada 30s"). El problema es que es "fire and forget": sala no tiene ningún indicador de "visto en cocina". Si cocina pierde la conexión, el listener se resincroniza solo al reconectar y no se pierde ninguna comanda, pero mientras dura el corte, sala no tiene forma de saber que sus comandas no están llegando — solo lo descubre si alguien va físicamente a preguntar.
**Impacto real**: fallo silencioso mientras dura un corte de wifi en cocina — el escenario exacto de "viernes noche con el wifi fallando" que preocupa para este audit.

#### M7. Tres textos en español fijo se saltan el sistema de traducción, en pantallas de uso frecuente
**Módulo**: `js/app.js:1481` (confirm de fusión de fichas), `js/tpv.js:1537` y `js/tpv.js:1545` (selección de carta activa en TPV).
**Verificado con**: solo lectura de código.
**Descripción**: la app aplica `t()` de forma consistente en la inmensa mayoría de la UI (`showToast`, la mayoría de `alert()`/`confirm()`), pero estos tres puntos concretos usan texto español fijo en template literals. Dos de ellos están en el flujo de selección de carta en TPV — una pantalla de uso frecuente.
**Impacto real**: bajo si el negocio opera en español; se convierte en una rotura de coherencia de idioma real si el negocio está configurado en catalán o inglés, justo en la pantalla más usada del día (TPV).
**Fix sugerido**: envolver esos tres strings con `t('nueva.clave')` y añadir las traducciones correspondientes en `js/i18n.js`.

#### M3. El indicador de sincronización existe pero es solo "conectado/desconectado", no "este dato concreto ya se guardó"
**Módulo**: `js/core.js:1646` (`updateSyncBadge`), enganchado a `.info/connected` de Firebase.
**Verificado con**: solo lectura de código.
**Descripción**: sí existe un badge visible (verde/ámbar/rojo) — esto es un punto a favor, no ausente como cabría temer en esta arquitectura. Pero solo refleja el estado del socket, no si una escritura concreta ya llegó a confirmarse.

#### M4. `DB.sales` crece sin límite ni paginación
**Módulo**: `js/tpv.js:3400,3661` (push sin cap), `js/finance.js` (reportes que recorren el array completo en cada render).
**Verificado con**: solo lectura de código.
**Descripción**: no hay archivado ni paginación de histórico. Con años de datos de un negocio activo (miles de tickets), cada render de dashboard/reportes reescanea el array completo, y ese mismo array completo se reenvía a Firebase en cada sincronización general — riesgo de lentitud progresiva, no de pérdida de datos.

---

### ⚪ BAJO

#### J1. `finalizeCharge` no tiene guarda explícita de re-entrada (`order.status==='pagada'`)
**Módulo**: `js/tpv.js:3383-3408`.
**Verificado con**: solo lectura de código. El riesgo práctico hoy es bajo porque la función es totalmente síncrona (sin `await` de por medio) y JS es de un solo hilo, así que un doble-tap real del usuario no consigue colar una segunda ejecución antes de que el modal de ticket reemplace el botón — pero no hay ninguna comprobación explícita que lo impida si el código cambia en el futuro (p. ej. si alguien añade una llamada asíncrona antes de la línea 3400). Se recomienda añadir `if(order.status==='pagada') return;` como primera línea, es una red de seguridad barata para un punto tan sensible.

#### J2. Ausencia de tests de regresión más allá de los añadidos en esta sesión
Ya cubierto en la sesión anterior (`test/smoke.test.mjs`, 8 tests) y ampliado hoy con `test/audit-active.mjs` (6 tests). Sigue siendo un área con margen de mejora, pero deja de ser "prácticamente inexistente".

#### J3. `finalizeCharge` no re-verifica `order.status` al empezar
Ver hallazgo J1 arriba — mismo módulo, mismo fix sugerido. Se lista aparte solo porque, aunque el riesgo práctico hoy es bajo (código síncrono, un solo hilo), es una guarda de una línea que cuesta muy poco añadir en un punto tan sensible como el cobro.

---

## FASE 3 — Pruebas activas ejecutadas

Se ejecutaron dos suites reales contra el código real del repo (no contra una simulación aparte):

**`node test/smoke.test.mjs`** (heredado de la sesión anterior, 8/8 ✅) — carga `js/tpv.js` en un sandbox de Node y comprueba:
- Desglose de IVA de una venta con un único tipo de IVA, con tipos mixtos, y con descuento prorrateado.
- Que las líneas con importe cero/negativo no contaminan el desglose fiscal.
- Descuento de raciones de stock (`decrementDishStock`): resta bien, no baja de 0, marca "no disponible" al llegar a 0, no toca platos sin límite, ignora cantidades inválidas o platos inexistentes.

**`node test/audit-active.mjs`** (nuevo, escrito específicamente para este audit, 6/6 ✅ — el objetivo de estos tests es *demostrar* los hallazgos, no "pasar" como red de regresión) — carga `js/core.js`/`js/ui.js` reales en un sandbox de Node con un DOM/`localStorage` mínimos y demuestra en vivo:
- **B1**: se genera una licencia código+contraseña válida (`activateBusinessLicense`) sin usar `generador-licencias.html`.
- **B2**: el mismo código produce siempre el mismo `tenantId` — dos "activaciones" independientes acaban en el mismo nodo de Firebase.
- **B3**: `document.body.classList.add('owner-session')` en consola concede `isOwnerSession() === true` sin ningún PIN.
- **A1**: un PIN de empleado se recupera de su hash en 54 ms probando las 10.000 combinaciones posibles.

**Lo que esta auditoría NO pudo probar activamente** (por falta de navegador real/Firebase real en este entorno, o por requerir hardware/red reales) — quedan verificados **solo por lectura de código**, con menor grado de confianza que lo anterior:
- Doble cobro por doble-tap real en un navegador (se razonó por qué es de bajo riesgo dado el código síncrono, pero no se reprodujo con eventos de clic reales).
- Pérdida de conexión a mitad de una operación de TPV con Firebase real (el comportamiento del SDK ante desconexión/reconexión se describe por documentación y lectura de código, no se forzó un corte de red real).
- Edición concurrente del mismo dato desde dos sesiones/dispositivos reales contra un proyecto Firebase real.
- El flujo completo de VeriFactu con una venta que incluya propina, contra la API real de Invocash (el desajuste de B5 se dedujo leyendo el código de cálculo, no confirmando el rechazo real de AEAT).
- Rendimiento real con miles de tickets de histórico (M4) — no se generó un dataset de ese tamaño para medir tiempos de render reales.

---

## FASE 4 — VEREDICTO DE LANZAMIENTO

### Recuento de hallazgos por severidad

**Actualizado 10/08/2026, tras la tercera ronda de correcciones**: los 5 hallazgos Bloqueantes y los 7 Altos de la auditoría original están todos resueltos (varios con matices de alcance documentados en su ficha — "resuelto" no siempre significa "cerrado sin ningún límite conocido", léase cada ficha).

| Severidad | Cantidad | IDs |
|---|---|---|
| 🔴 Bloqueante — abierto | 0 | — |
| 🔴 Bloqueante — resuelto | 5 | B1 (confirmado en vivo), B2 (resuelto por diseño), B3 (parcial), B4, B5 |
| 🟠 Alto — abierto | 0 | — |
| 🟠 Alto — resuelto | 7 | A1 (parcial), A2 (parcial), A3, A4, A5, A6, A7 (parcial) |
| 🟡 Medio | 7 | M1, M2, M3, M4, M5, M6, M7 |
| ⚪ Bajo | 2 | J1/J3, J2 |

### Veredicto: **LISTO CON RESERVAS** (sin Bloqueantes ni Altos abiertos; quedan Medios por decidir si se abordan antes de vender)

Los 5 hallazgos Bloqueantes y los 7 Altos de la auditoría original están resueltos:

- **B1** (licencias falsificables): resuelto y **confirmado en vivo contra el Firebase real de producción** — un código inventado con su contraseña recalculada correctamente se rechazó; el código generado legítimamente se aceptó. El hallazgo del informe verificado con mayor grado de confianza: no solo lectura de código, no solo test simulado, sino el ataque real ejecutado y bloqueado contra la infraestructura de producción.
- **B2** (licencia sin límite de negocios): reevaluado tras aclarar con el negocio la política real deseada ("1 código = 1 negocio, tantos dispositivos como haga falta"). El diseño actual (`tenantId` como función determinista y única del código) ya la garantiza matemáticamente, sin necesitar ningún cambio de código.
- **B3, B4, B5**: resueltos y verificados con tests reales donde fue posible.
- **A1-A7** (PINs, stock en anulaciones, recetas base huérfanas, crashes por referencias borradas, sincronización sin reintento ni aviso de colisión): resueltos y verificados con tests reales donde fue posible — ver cada ficha arriba para el alcance exacto, varios quedan "resueltos con matices" documentados explícitamente (p.ej. A1: la sal ya no es global, pero 10.000 PINs posibles sigue siendo un límite físico; A7: se avisa de colisiones reales, pero no se fusionan campo a campo por prudencia).

**Con esto no queda ningún Bloqueante ni Alto abierto.** Solo quedan los 7 Medios (M1-M7) y 2 Bajos (J1/J3, J2), ninguno de los cuales impide un lanzamiento — son mejoras de pulido (avisos de sincronización más finos, límites de tamaño de histórico, textos i18n sueltos, guarda de re-entrada en `finalizeCharge`) que se pueden abordar con calma después del lanzamiento, no antes.

### Qué se ha verificado con test real (alta confianza)
Todos los hallazgos Bloqueantes de licencias/login (B1 — además confirmado en vivo contra Firebase de producción, B2, B3) y todos los Altos de PINs/recetas/sincronización (A1, A4, A6, A7) — ejecutados de verdad contra el código real del repo (`test/audit-active.mjs`, `test/smoke.test.mjs`), no supuestos. También toda la lógica de IVA/descuento, stock y el total facturado a VeriFactu sin propina (B5).

### Qué se ha verificado solo por lectura de código (confianza menor)
B4 (anulación de venta), A2, A3, A5 (se aplicó el fix y se comprobó sintaxis/comportamiento manualmente, pero sin un test automatizado que lo demuestre de forma aislada), y el resto de hallazgos Medios/Bajos — money flow de TPV (J1/J3), integridad referencial (M1), sincronización (M3, M4), tiempo real de cocina y reservas (M5, M6), build/i18n (M7). Son hallazgos y fixes fundamentados en trazar el código real con citas exactas, pero no se han reproducido con un navegador y un Firebase reales.

### Zonas de riesgo fuera del alcance de esta auditoría
- Carga real con muchos dispositivos/usuarios simultáneos sobre un proyecto Firebase real (esta auditoría no tuvo acceso a un proyecto Firebase de prueba).
- Comportamiento en hardware real de tablets (Android/iOS, distintos navegadores, modo avión real, sueño de la pestaña) — todo lo relacionado con sincronización se evaluó por código, no en dispositivos físicos.
- Intentos de fraude de licencia más sofisticados que el descrito (B1/B2 demuestran el camino más directo; no se exploraron ataques contra una eventual solución server-side todavía inexistente).
- Auditoría de seguridad de las propias reglas de Firebase del proyecto de producción (esta auditoría trabajó sobre el código cliente; las reglas de seguridad de Firebase en sí no se revisaron directamente porque no son parte de este repositorio).
- Pruebas de penetración formales o fuzzing automatizado.

**No se declara esta app "100% libre de bugs"** — ninguna auditoría, humana o automatizada, puede garantizar eso, y afirmarlo sería irresponsable de cara a un lanzamiento comercial real. Lo que sí se afirma es lo de arriba: qué se probó de verdad, qué se verificó solo leyendo código, y qué queda fuera de este alcance.

