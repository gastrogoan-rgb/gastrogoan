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

#### B3. Cualquier empleado puede convertirse en "propietario" desde la consola del navegador, sin PIN
**Módulo**: `js/ui.js:1125-1127` (`isOwnerSession`), usado como única puerta a Gestión Económica/Mi Negocio en decenas de sitios de `js/app.js`, `js/hr.js`, `js/finance.js`.
**Verificado con**: test real, `test/audit-active.mjs` (sección C) — ✅ pasa: `document.body.classList.add('owner-session')` desde consola concede acceso de propietario sin ningún PIN.
**Descripción**: `isOwnerSession()` solo comprueba una clase CSS en `document.body`. No existe ninguna capa de datos que vuelva a comprobar el rol — todo el negocio vive en un único nodo plano de Firebase (`gastrogoan/tenants/{tenantId}/db`) sin reglas por rol, así que quien pone esa clase a mano obtiene acceso de lectura/escritura completo a la contabilidad, los datos de otros empleados, los PINs, etc.
**Impacto real**: un empleado con rencor (o simple curiosidad) puede ver la facturación, los costes, los sueldos, y los PINs de sus compañeros abriendo las herramientas de desarrollador del navegador, sin necesitar el PIN del dueño en ningún momento.
**Fix sugerido**: dado que no hay backend, la mitigación realista sin reescribir la arquitectura es: (a) reglas de Firebase que segmenten por rol en vez de solo por tenant (requiere autenticación real por usuario, no anónima); (b) mientras tanto, blindar como mínimo las funciones más sensibles con una re-verificación de PIN en el momento de la acción (patrón que la propia app ya usa en otros sitios vía `requestBusinessPinAction`), no solo al entrar en la sesión.

#### B4. No existe ningún flujo de anulación/reembolso de una venta ya cobrada
**Módulo**: `js/tpv.js` (ausente — se buscó `anularVenta`/`voidSale`/`cancelSale`/`DB.sales.splice` y no aparece nada).
**Verificado con**: solo lectura de código (agente de auditoría de TPV), no ejecutado activamente.
**Descripción**: una vez `order.status = 'pagada'` (`tpv.js:3403`), la venta es permanente. Si un camarero cobra la mesa equivocada, o hay una disputa con una tarjeta, no hay ninguna función ni pantalla para revertir stock ni el total de caja — habría que editar `DB.sales` a mano.
**Impacto real**: cualquier error de cobro en un servicio real (algo que pasa con seguridad en un negocio real) no tiene camino de corrección dentro de la app.
**Fix sugerido**: añadir un flujo de "Anular venta" con PIN de propietario obligatorio, que revierta `decrementDishStock`, marque la venta como anulada (sin borrarla, por trazabilidad) y — crítico para VeriFactu — emita la factura rectificativa correspondiente en vez de solo borrar el registro local.

#### B5. El total enviado a VeriFactu no cuadra con el total del ticket cuando hay propina
**Módulo**: `js/tpv.js:3985-3999` (`saleIvaGroupsForFiscal`), `:4035-4066` (`submitSaleToVerifactuApi`).
**Verificado con**: solo lectura de código (agente de auditoría de TPV), no ejecutado activamente contra la API real.
**Descripción**: `saleIvaGroupsForFiscal` desglosa el IVA únicamente a partir de `sale.items` (con el descuento prorrateado) — la propina no entra en ningún grupo de IVA. Pero el campo `total` que se envía a Invocash es `sale.total`, que **sí** incluye la propina (`finalTotal = total - descuentoImporte + propina`, `tpv.js:3386,3397`). Resultado: la suma de las líneas de la factura queda por debajo del total del documento exactamente en el importe de la propina, en cualquier ticket con propina > 0.
**Impacto real**: esto es justo el tipo de descuadre que un sistema de reconciliación de la AEAT puede rechazar — no es un error de redondeo de un céntimo, es una discrepancia estructural. Como la integración con VeriFactu se acaba de confirmar en vivo (ver `docs/VERIFACTU_PENDIENTE.md`, 10/08/2026) contra una cuenta de prueba, esto todavía no se ha probado con una venta real que lleve propina.
**Fix sugerido** (diff conceptual):
```js
// En saleIvaGroupsForFiscal, añadir la propina como línea sin IVA (o al tipo que corresponda
// según cómo la trate VeriFactu — confirmar con Invocash) para que la suma de líneas cuadre
// exactamente con sale.total antes de enviar la factura.
```
Antes de activar VeriFactu en producción, probar en vivo un ticket con propina y confirmar con Invocash cómo debe declararse.

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

| Severidad | Cantidad | IDs |
|---|---|---|
| 🔴 Bloqueante | 5 | B1, B2, B3, B4, B5 |
| 🟠 Alto | 7 | A1, A2, A3, A4, A5, A6, A7 |
| 🟡 Medio | 7 | M1, M2, M3, M4, M5, M6, M7 |
| ⚪ Bajo | 2 | J1/J3, J2 |

### Veredicto: **NO LISTO**

Hay cinco hallazgos Bloqueantes sin resolver, y tres de ellos caen exactamente en las categorías que este mandato marcó como no negociables: **licencias/login** (B1, B2, B3) y **dinero/legal** (B4, B5). En concreto:

- **B1 y B2 rompen el modelo de negocio de raíz**: cualquiera puede generar licencias válidas ilimitadas sin pagar, y una única licencia puede usarse en negocios distintos sin control. Esto no es un riesgo remoto — se demostró con un test real ejecutándose en segundos.
- **B3 es un problema de confidencialidad real**: un empleado puede ver la contabilidad completa del negocio y los PINs de sus compañeros con una sola línea en la consola del navegador, sin conocer ningún PIN. También demostrado con test real.
- **B4** deja sin resolver algo que ocurrirá con seguridad en el uso real: errores de cobro sin forma de corregirlos dentro de la app.
- **B5** es un riesgo legal/fiscal concreto en la integración con VeriFactu que aún no se ha probado con el caso más común (una venta con propina).

Ninguno de estos cinco requiere una reescritura de arquitectura para arreglarse — B3, B4 y B5 son alcanzables en días, no semanas. B1/B2 sí requieren la pieza que hoy falta en esta arquitectura 100% cliente: algún punto de validación que no viva íntegramente en el JS que se entrega al usuario (aunque sea una función ligera en la nube, no un backend completo).

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

