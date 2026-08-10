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

#### B1. La licencia se puede falsificar sin usar el generador oficial
**Módulo**: `js/core.js:966-970` (`_ggBizSecret`), `:971-980` (`ggBizPassword`), `:994-999` (`activateBusinessLicense`).
**Verificado con**: test real, `test/audit-active.mjs` (sección A) — ✅ pasa: se genera una licencia código+contraseña válida (`FORJADO1` / `V8SAS5`) sin tocar `generador-licencias.html`.
**Descripción**: la "contraseña" de una licencia es `hash(code + SECRETO_FIJO)`. El `SECRETO_FIJO` (`_ggBizSecret()`) es una constante embebida en el JS que se envía **a todos los navegadores**, ligeramente ofuscada restando 14 al código de cada carácter — trivialmente recuperable. No hay firma criptográfica ni validación contra un servidor: todo el cálculo es reproducible por cualquiera que abra el `index.html` entregado.
**Impacto real**: cualquier persona con conocimientos básicos de JS puede generar licencias válidas ilimitadas sin pagar, sin necesidad siquiera de acceder al generador privado. Esto rompe el modelo de negocio de raíz — no es un riesgo teórico, es un bypass de 5 minutos.
**Fix sugerido**: mover la generación/validación de licencias a un endpoint servidor (aunque sea una Cloud Function ligera) que firme con una clave que **nunca** viaje al cliente, y que la app solo pueda verificar (firma asimétrica) pero no recrear. Alternativa mínima a corto plazo: verificar la licencia contra una lista/registro en Firebase (un nodo "licencias vendidas" con reglas de solo-lectura para el cliente, solo-escritura desde el generador con sus propias credenciales), no solo recalculando localmente.

#### B2. Una sola licencia sirve para negocios/dispositivos ilimitados sin ningún control
**Módulo**: `js/core.js:983-991` (`ggBizTenantId`).
**Verificado con**: test real, `test/audit-active.mjs` (sección B) — ✅ pasa: el mismo `code` produce siempre el mismo `tenantId`, confirmado activando la "misma licencia" dos veces.
**Descripción**: el `tenantId` (que determina a qué nodo de Firebase se conecta un negocio) es una función determinista de `code` únicamente. No hay vínculo a un dispositivo, a un pago, ni un contador de activaciones.
**Impacto real**: una única licencia vendida puede compartirse (voluntaria o involuntariamente) y usarse en negocios distintos sin que la app lo detecte ni lo impida — todos acabarían, además, apuntando exactamente al **mismo** tenant de Firebase, mezclando los datos de negocios que deberían ser independientes.
**Fix sugerido**: mismo fix que B1 (validación server-side) más un registro de activaciones con límite configurable por licencia (ej. "máximo 1 negocio, N dispositivos dentro de ese negocio").

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

#### A1. El hash de PIN de empleado es trivialmente crackable
**Módulo**: `js/core.js:1635-1644` (`hashPin`).
**Verificado con**: test real, `test/audit-active.mjs` (sección D) — ✅ pasa: un PIN de 4 dígitos se recupera del hash en 54 ms probando las 10.000 combinaciones posibles.
**Descripción**: `hashPin` usa FNV-1a con una sal **fija e idéntica para todas las instalaciones** (`'GG2024$p'`), embebida en el JS del cliente. Con solo 10.000 PINs posibles y sal pública, una tabla arcoíris de 10.000 entradas descifra cualquier PIN al instante — y sirve para todos los negocios por igual, porque la sal no varía.
**Impacto real**: quien tenga acceso al JS (cualquiera) y a los datos sincronizados de un negocio (el propio empleado, o alguien con el `tenantId`) puede recuperar el PIN real de cualquier compañero, no solo intuirlo.
**Fix sugerido**: usar una sal por negocio (derivada del `tenantId`, que sí es distinto por instalación) en vez de una constante global, y/o subir a un algoritmo lento (PBKDF2/bcrypt vía Web Crypto) en lugar de un hash rápido — aunque con solo 10.000 combinaciones posibles, ningún hash por sí solo es suficiente sin además limitar los intentos de PIN incorrecto en la propia UI (rate limiting local).

#### A2. Los PINs por defecto se guardan en texto plano hasta que el empleado los cambia
**Módulo**: `js/hr.js:2834` (reset a `'1234'`), `js/core.js:3325-3326`, `js/hr.js:3013-3020` (`pinMatchesEmployeeOrBusiness`, que contempla explícitamente ambos formatos, con y sin prefijo `H:`).
**Verificado con**: solo lectura de código.
**Descripción**: el PIN por defecto (`1234`) y cualquier PIN reseteado se guardan sin hashear hasta el primer cambio del empleado. Esos datos viajan a Firebase igual que el resto de la base de datos del negocio.
**Impacto real**: ventana de exposición real cada vez que se da de alta o se resetea un PIN, hasta que el propio empleado lo cambia — que en la práctica puede no pasar nunca si nadie se lo recuerda.
**Fix sugerido**: hashear también el valor por defecto al crearlo, en vez de esperar al primer cambio manual.

#### A3. Voids de línea (antes de cobrar) no revierten el stock ya descontado
**Módulo**: `js/tpv.js:2957-2995` (`confirmVoidLine`), y `cancelAcceptedOnlineOrder` (`tpv.js:1069-1082`).
**Verificado con**: solo lectura de código.
**Descripción**: cuando se "marcha" una línea a cocina, se llama a `decrementDishStock`. Si esa línea se anula después (pedido mal tomado, cliente cambia de opinión), el void queda registrado en `DB.voidLog` pero el stock descontado **no se restituye**.
**Impacto real**: el contador de raciones disponibles de un plato con stock limitado queda permanentemente corto cada vez que esto ocurre, acumulando error durante el servicio sin que nadie lo note hasta que el plato se marca "no disponible" estando realmente disponible.
**Fix sugerido**: añadir la reversión de stock (`p.stock = Math.min(original, p.stock + qty)`) dentro de `confirmVoidLine` y `cancelAcceptedOnlineOrder`, simétrica a `decrementDishStock`.

#### A4. Borrar una receta base usada indirectamente no avisa, y deja referencias colgando que devalúan el coste silenciosamente
**Módulo**: `js/recipes.js:711-777` (`recipesUsingBaseRecipe`, `deleteRecipe`/`confirmDeleteRecipe`), coste en `js/recipes.js:27-31` (`recipeIngredientCost`).
**Verificado con**: solo lectura de código.
**Descripción**: `recipesUsingBaseRecipe` solo detecta referencias **directas** (nivel 1). Una base usada dentro de otra base, a su vez usada en un plato, no genera ningún aviso al borrar la primera. Además, al confirmar el borrado, las líneas de receta que apuntan a ese `baseRecipeId` no se limpian — quedan huérfanas. `recipeIngredientCost` maneja esa referencia nula devolviendo silenciosamente coste `0` en vez de avisar.
**Impacto real**: el food cost mostrado para platos que dependen (aunque sea indirectamente) de esa base queda infravalorado sin ningún aviso posterior al primer momento del borrado — un propietario podría estar tomando decisiones de precio con márgenes de coste incorrectos sin saberlo.
**Fix sugerido**: hacer `recipesUsingBaseRecipe` recursivo (seguir la cadena de dependencias, no solo el nivel 1), y limpiar (o marcar visiblemente como "receta base eliminada") las líneas huérfanas en vez de dejarlas devolver coste 0 en silencio.

#### A5. `fichaModalState` puede construirse a partir de un `getRecipe()` sin comprobar null
**Módulo**: `js/recipes.js:1025` (aprox., citado por el agente de auditoría de integridad).
**Verificado con**: solo lectura de código.
**Descripción**: si se abre la ficha técnica de una receta cuyo id ya no existe (borrada en otra pestaña/dispositivo mientras la UI seguía mostrándola), `getRecipe(recipeId)` devuelve `undefined` y el código lo desreferencia directamente (`r.name`, `r.id`).
**Impacto real**: crash de la UI (pantalla en blanco / error) en un escenario perfectamente plausible con varios dispositivos sincronizando en un mismo negocio.
**Fix sugerido**: `const r = getRecipe(recipeId); if(!r) { showToast(...); return; }` antes de usarla.

#### A6. No hay cola de reintento persistente para escrituras offline — solo el buffer en memoria del SDK de Firebase
**Módulo**: `js/core.js` (`saveDB`:3358, `scheduleCloudSync`:3381, `flushCloudSync`:3396) — no se encontró ningún listener `online`/`offline` ni cola propia.
**Verificado con**: solo lectura de código.
**Descripción**: los datos se guardan primero en IndexedDB (esto sí es seguro localmente), pero el envío a Firebase depende enteramente de que el SDK reconecte con la pestaña **todavía abierta**. Si la tablet se queda sin conexión y se cierra o recarga la pestaña antes de reconectar, ese envío pendiente se pierde sin más reintento que el que el propio SDK intentaría si la pestaña siguiera viva.
**Impacto real**: en el escenario exacto que preocupa ("wifi cayendo un viernes noche"), el dato sobrevive en el dispositivo que lo creó, pero no hay garantía de que llegue nunca a la nube ni de que otros dispositivos del negocio lo vean, más allá del indicador de estado (ver hallazgo Medio M3).
**Fix sugerido**: mantener una cola explícita de operaciones pendientes en IndexedDB (no solo el snapshot de datos) que se reintente activamente al recuperar conexión, independientemente de si la pestaña se recargó.

#### A7. Edición concurrente del mismo registro: gana el último en escribir, sin fusión ni aviso
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

**Actualizado 10/08/2026, tras la primera ronda de correcciones**: B3, B4 y B5 se han resuelto (B3 parcialmente, ver alcance en su ficha). B1 y B2 siguen abiertos — requieren una decisión de infraestructura (validación de licencias fuera del cliente) antes de poder tocarse.

| Severidad | Cantidad | IDs |
|---|---|---|
| 🔴 Bloqueante — abierto | 2 | B1, B2 |
| 🔴 Bloqueante — resuelto | 3 | B3 (parcial), B4, B5 |
| 🟠 Alto | 7 | A1, A2, A3, A4, A5, A6, A7 |
| 🟡 Medio | 7 | M1, M2, M3, M4, M5, M6, M7 |
| ⚪ Bajo | 2 | J1/J3, J2 |

### Veredicto: **NO LISTO** (mejorado desde la ronda anterior, sigue sin poder venderse)

Quedan dos hallazgos Bloqueantes sin resolver, y los dos caen en la categoría más crítica de todas para un lanzamiento comercial: **el modelo de licencias en sí**.

- **B1 y B2 rompen el modelo de negocio de raíz**: cualquiera puede generar licencias válidas ilimitadas sin pagar, y una única licencia puede usarse en negocios distintos sin control. Esto no es un riesgo remoto — se demostró con un test real ejecutándose en segundos. Mientras esto no se resuelva, **no tiene sentido vender licencias de verdad**: quien quiera usar la app gratis puede hacerlo hoy mismo sin que se note.
- **B3, B4 y B5 ya están resueltos** (ver fichas arriba para el alcance exacto de cada uno) y verificados con tests reales donde fue posible.

B1/B2 requieren la pieza que hoy falta en esta arquitectura 100% cliente: algún punto de validación que no viva íntegramente en el JS que se entrega al usuario (aunque sea una función ligera en la nube, no un backend completo). Es la única pieza pendiente que de verdad bloquea poder vender licencias con garantías — el resto de bloqueantes ya no lo son.

Los Altos (A1-A7) no bloquean por sí solos un lanzamiento, pero varios de ellos (A3 stock que se descuadra solo, A4 coste de recetas infravalorado en silencio, A6/A7 pérdida/colisión de datos entre dispositivos) son justo el tipo de fallo que un hostelero real notará semanas después, sin saber por qué sus números no cuadran — conviene resolver al menos A3, A4 y A6/A7 antes de vender a negocios con varios dispositivos simultáneos, que es el caso de uso principal de la app.

### Qué se ha verificado con test real (alta confianza)
Todos los hallazgos Bloqueantes de licencias/login (B1, B2, B3) y el de PINs (A1) — ejecutados de verdad contra el código real del repo, no supuestos. También toda la lógica de IVA/descuento y stock de la sesión anterior (`smoke.test.mjs`).

### Qué se ha verificado solo por lectura de código (confianza menor)
El resto de hallazgos — money flow de TPV (B4, B5, J1/J3), integridad referencial (A4, A5, M1), sincronización (A6, A7, M3, M4), tiempo real de cocina y reservas (M5, M6), build/i18n (M7). Son hallazgos fundamentados en trazar el código real con citas exactas, pero no se han reproducido con un navegador y un Firebase reales.

### Zonas de riesgo fuera del alcance de esta auditoría
- Carga real con muchos dispositivos/usuarios simultáneos sobre un proyecto Firebase real (esta auditoría no tuvo acceso a un proyecto Firebase de prueba).
- Comportamiento en hardware real de tablets (Android/iOS, distintos navegadores, modo avión real, sueño de la pestaña) — todo lo relacionado con sincronización se evaluó por código, no en dispositivos físicos.
- Intentos de fraude de licencia más sofisticados que el descrito (B1/B2 demuestran el camino más directo; no se exploraron ataques contra una eventual solución server-side todavía inexistente).
- Auditoría de seguridad de las propias reglas de Firebase del proyecto de producción (esta auditoría trabajó sobre el código cliente; las reglas de seguridad de Firebase en sí no se revisaron directamente porque no son parte de este repositorio).
- Pruebas de penetración formales o fuzzing automatizado.

**No se declara esta app "100% libre de bugs"** — ninguna auditoría, humana o automatizada, puede garantizar eso, y afirmarlo sería irresponsable de cara a un lanzamiento comercial real. Lo que sí se afirma es lo de arriba: qué se probó de verdad, qué se verificó solo leyendo código, y qué queda fuera de este alcance.

