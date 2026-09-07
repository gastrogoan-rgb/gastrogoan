# Auditoría GastroGoan — segunda parte (2026-09-07)

## Alcance y versiones

Solo exploración y documentación. No se aplica ningún fix. La única incorporación de esta pasada al repositorio es este informe. No se han editado `reservagastrogoan.html` ni `js/core.js`.

Las pruebas se ejecutan sobre una copia temporal del árbol `bcf612d` (base del primer informe), sin alterar los archivos de la aplicación del workspace. Para M01/M02 se contrasta además, en solo lectura, la rama ya publicada en `1a6d799` (código de `5ec1638`, más el primer informe). Las líneas sin indicación de versión corresponden a `bcf612d`. Los cambios que el propietario está haciendo en paralelo no se consideran validados por este informe.

## Bloque 5 — inventario completo de los 39 saltos

Resultado reproducido en Chromium: **75 aperturas, 39 saltos**. Los 39 son funciones candidatas, no 39 pantallas rotas ni necesariamente 39 modales distintos. Hay **23 exclusiones previas** (12 por estado, 10 por expresión de nombre y 1 infraestructura) y **16 intentos sin apertura detectable**. Corrige el recuento provisional comunicado durante la exploración.

### P2-T01 — limitación relevante de cobertura del test

**Archivo:** `test/modales-todas.mjs:88` (filtros), `:102` (salto), `:112` (argumentos), `:136` (candidatos), `:154` (detector), `:82` (silencia `showToast`). **Severidad:** calidad de verificación; no prueba un defecto funcional de esas 39 funciones.

El test llama funciones fuera de su flujo, solo cambia el primer ID y considera apertura exclusivamente un overlay activo. Además suprime las explicaciones de los guards. Por eso un salto no permite concluir ni «roto» ni «probado correctamente». Aparte, `:56` siembra `suppliers` en vez de `providers`; `:67` usa `pax/estado/phone` en reservas y `:68` usa `nombre/pax` en el fallback de mesas, distintos de `people/status/clientPhone` y `name/plazas` consumidos por sus pantallas. No se han corregido esas semillas en el repositorio.

**Importancia:** el mensaje global sin errores deja fuera acciones de cobro, cambios de turno y edición. **Reproducción:** ejecutar el mismo test registrando cada exclusión y cada resultado `no-abre`; instrumentación aplicada únicamente en `/tmp`. La siguiente tabla recoge los 39 y el flujo necesario para reproducirlos. Las condiciones se han contrastado leyendo cada función; la repetición del arnés no equivale a ejecutar todos los flujos CRUD propuestos en la tabla.

| Nº | Archivo y línea · función | Tipo de salto | Causa y reproducción |
|---|---|---|---|
| 1 | `js/app.js:1305` · `openDistEmployee` | Intento sin overlay | El empleado 30 existe; como propietario, la función deriva a `openDistEmployeeAuthed()` (línea 1315) y muestra la ficha dentro de la pantalla. El detector solo cuenta `modal-overlay.active`. Reproducir: Distribución → Ana como propietario; comparar con abrir un compañero desde sesión de empleado. |
| 2 | `js/app.js:3458` · `openOverbookedChoiceModal` | Exclusión: estado | Excluida antes de ejecutarse. Necesita los datos de una reserva y un turno `{abre,cierra}`, ocupación y aforo. Reproducir: guardar una reserva que exceda el aforo del turno. |
| 3 | `js/app.js:4559` · `openClientMessageModal` | Exclusión: estado | Excluida antes de ejecutarse. Necesita cliente y una clave válida de `PROMO_MESSAGE_TEMPLATES`, no un número genérico. Reproducir: Clientes → plantilla de mensaje → preparar mensaje; cancelar antes de enviar. |
| 4 | `js/app.js:5643` · `openConfirmRestoreBackupModal` | Exclusión: estado | Excluida antes de ejecutarse. Recibe una copia de seguridad ya parseada, no un ID. Reproducir: importar un backup válido y revisar/cancelar su confirmación. |
| 5 | `js/app.js:6067` · `openOwnCourierModal` | Exclusión: estado | Excluida antes de ejecutarse. Recibe título y objeto de repartidor `c` con nombre/teléfono. Reproducir: configuración de reparto propio → añadir/editar repartidor. |
| 6 | `js/app.js:6122` · `openDeliveryPlatformModal` | Exclusión: estado | Excluida antes de ejecutarse. Recibe título y objeto de plataforma `p` con nombre/comisiones. Reproducir: plataformas de delivery → añadir/editar. |
| 7 | `js/core.js:789` · `menuDeCarpeta` | Intento sin overlay | La heurística no conoce los argumentos `clave` y `tipo`: pasa `undefined` y el primer guard retorna. Reproducir: menú de puntos de la carpeta Secos; llamada de control `menuDeCarpeta("Secos","ingredient")`. |
| 8 | `js/core.js:1185` · `openConfirmRemoveBusinessModal` | Intento sin overlay | El slot tiene ID de texto (`default`), pero el arnés solo prueba números y `undefined`. Reproducir: selector de negocios → eliminar un negocio independiente sin sucursales → cancelar. |
| 9 | `js/finance.js:1163` · `onIngredientCategoryChange` | Exclusión: nombre | Excluida por la expresión `on.*Change`, aunque sí puede abrir una ventana nueva. Necesita el formulario de ingrediente abierto y su selector de categoría en `__new__`. Reproducir: ingrediente → categoría nueva. |
| 10 | `js/hr.js:3430` · `openTurnoSwapRequestModal` | Intento sin overlay | No hay turnos y solo existe un empleado de cocina. Los guards requieren turno futuro con ≥24 h desde la medianoche y otro compañero activo del área. Ambos muestran toast, que el arnés silencia. Reproducir: dos empleados del área, turno dentro de dos días → ficha → pedir cambio. |
| 11 | `js/hr.js:3716` · `openEditFichajeModal` | Intento sin overlay | No hay registros en `DB.fichajes`. Reproducir: fichar entrada/salida → historial → editar el registro existente. |
| 12 | `js/idr.js:2093` · `idrPintarSelectorPlatos` | Intento sin overlay | No hay creación I+D con ese ID. `idrCreacion(id)` retorna vacío; el selector necesita un encargo con bloques y platos escandallados. Reproducir: abrir una creación de menú en I+D y su selección de platos. |
| 13 | `js/menu.js:662` · `openCartaSectionIconModal` | Exclusión: estado | Excluida. Necesita `cartaEdit`, que se inicializa abriendo la carta 80, y su sección 81. Reproducir: editor de carta → icono de sección. |
| 14 | `js/menu.js:906` · `openPlatoModsModal` | Exclusión: estado | Excluida. Necesita la carta abierta en `cartaEdit` y sección 81/plato 82. Reproducir: editor de carta → plato → modificadores. |
| 15 | `js/menu.js:944` · `addPlatoMod` | Exclusión: nombre | Excluida por nombre. Lee los campos del formulario de modificadores y añade uno a `cartaEdit`; después repinta. No es otra ventana independiente. Reproducir: abrir modificadores → rellenar nombre/precio → añadir. |
| 16 | `js/menu.js:972` · `openPlatoAllergensModal` | Exclusión: estado | Excluida. Requiere `cartaEdit` y sección/plato válidos. Reproducir: editar carta → plato → alérgenos. |
| 17 | `js/menu.js:993` · `togglePlatoAllergen` | Exclusión: estado | Excluida. Alterna un alérgeno del plato y repinta el mismo selector; necesita carta/plato y alérgeno. Reproducir: selector de alérgenos → marcar/desmarcar. |
| 18 | `js/menu.js:1415` · `addMenuOpcion` | Exclusión: nombre | Excluida por `addMenuOpcion`, aunque abre el formulario de opción. No existe menú/grupo en `menuEdit`. Reproducir: crear/abrir menú → grupo → añadir opción. |
| 19 | `js/menu.js:1525` · `openMenuOpcionModsModal` | Exclusión: estado | Excluida. Necesita `menuEdit`, grupo y opción existentes. La semilla no crea menús. Reproducir: menú → opción → modificadores. |
| 20 | `js/operations.js:421` · `showClosureWarningsModal` | Exclusión: estado | Excluida. Necesita un array de advertencias producido por el cierre. Reproducir: cierre con incidencias → revisar avisos. |
| 21 | `js/operations.js:610` · `openTipsSplitModal` | Intento sin overlay | No existe cierre en `DB.cashClosures`. Reproducir: cerrar caja con propinas y personal fichado → reparto del cierre. |
| 22 | `js/operations.js:700` · `openSupplierIngredientsModal` | Intento sin overlay | La semilla usa `DB.suppliers` (test:56), pero esta función consulta `DB.providers`. Reproducir con un proveedor real de la UI → sus ingredientes. Es un error de fixture, no un proveedor perdido por la app. |
| 23 | `js/operations.js:1793` · `renderOrderModal` | Exclusión: nombre | Excluida por nombre. Repinta el pedido a proveedor abierto y su estado de edición. Reproducir: Compras → crear/editar pedido. |
| 24 | `js/recipes.js:466` · `renderRecipeModal` | Exclusión: nombre | Excluida por nombre. Necesita receta `r` y las líneas inicializadas por `openRecipeModal`. Reproducir: Escandallo → abrir receta. |
| 25 | `js/recipes.js:681` · `onRecipeCategoryChange` | Exclusión: nombre | Excluida por `on.*Change`; necesita formulario de receta abierto y categoría `__new__`. Reproducir: receta → crear categoría. |
| 26 | `js/recipes.js:1586` · `renderFichaModal` | Exclusión: nombre | Excluida por nombre. Usa `fichaModalState` preparado por `openFichaModal`. Reproducir: Fichas Técnicas → crear/editar ficha. |
| 27 | `js/tpv.js:1728` · `openMenuConfigModal` | Intento sin overlay | No hay menús; la heurística da `menuId=80`, que es una carta. Tampoco hay cuenta TPV. Reproducir: crear menú con opciones → abrir mesa → añadir menú. |
| 28 | `js/tpv.js:2004` · `renderTableOrderModal` | Exclusión: nombre | Excluida por nombre. No hay cuentas en `DB.tpvOrders`; con un ID inexistente cierra. Reproducir: TPV → abrir mesa y su cuenta. |
| 29 | `js/tpv.js:2482` · `openSeatWaitlistTableModal` | Intento sin overlay | No hay entrada en `DB.waitlist`. Reproducir: añadir cliente a lista de espera → asignar mesa disponible. |
| 30 | `js/tpv.js:2552` · `openSetCamareroModal` | Intento sin overlay | No existe la cuenta TPV. Reproducir: abrir mesa → cambiar camarero, con empleados de sala disponibles. |
| 31 | `js/tpv.js:2843` · `renderMarkDishOutModal` | Exclusión: nombre | Excluida automáticamente por `render.*Modal`; no demuestra ausencia de datos. Reproducir: TPV → marcar plato agotado con carta disponible. |
| 32 | `js/tpv.js:3341` · `openAddItemModal` | Intento sin overlay | `platoId` recibe 10, pero el plato existente es 82. Los reintentos solo cambian el PRIMER argumento; nunca corrigen el tercero. Reproducir: mesa → sección 81 → plato 82; abrir puede funcionar aun cuando después no se pueda guardar en una cuenta inexistente. |
| 33 | `js/tpv.js:3469` · `requestVoidLine` | Intento sin overlay | No hay cuenta/líneas TPV. Además `type` recibe el valor genérico `apertura`. Reproducir: cuenta con línea → quitar/anular cantidad → confirmación. |
| 34 | `js/tpv.js:3741` · `openLineNotesModal` | Intento sin overlay | No hay cuenta ni línea. Reproducir: cuenta local con un artículo → notas de la línea. |
| 35 | `js/tpv.js:3801` · `renderPaymentModal` | Exclusión: nombre | Excluida por nombre. Necesita cuenta cobrable y estado preparado por el abridor del cobro. Reproducir: cuenta con consumiciones → Cobrar. |
| 36 | `js/tpv.js:4038` · `requestApplyDiscount` | Intento sin overlay | No hay cuenta ni formulario de pago; el descuento vacío/cero tampoco debe abrir confirmación. Reproducir: Cobrar → introducir descuento positivo → aplicar. |
| 37 | `js/tpv.js:4458` · `openSplitPartPayment` | Exclusión: estado | Excluida. Necesita cuenta y parte en `splitPayments`. Reproducir: Cobrar → dividir cuenta → cobrar una parte. |
| 38 | `js/tpv.js:4694` · `openTableTransferModal` | Intento sin overlay | No hay cuenta ligada a una mesa. Reproducir: abrir mesa con cuenta → trasladar a otra mesa. |
| 39 | `js/ui.js:1944` · `openModal` | Exclusión: infraestructura | Excluida por ser infraestructura: recibe HTML y opciones. Se ejecuta indirectamente al abrir otras ventanas; no es una pantalla pendiente separada. |

## Bloques 4 y 5 — Firebase, segundo negocio y dispositivo nuevo

### Entorno y límites de la comprobación

Se ha montado **Firebase Emulator Suite oficial**, con CLI `15.29.0`, SDK compat `10.14.1`, emulador RTDB `4.11.2`, Auth y Chromium 149. Las operaciones de autenticación, lectura, escritura, transacción y escucha pasan por el SDK y el servidor del emulador; no se sustituyen `once`, `set`, `transaction` ni las funciones de la aplicación por respuestas simuladas.

La aplicación se sirve desde la copia temporal. Se redirige la inicialización del SDK a RTDB local `9010` y Auth `9098`. Cada dispositivo usa su propio `BrowserContext`: no comparte cookies, localStorage ni IndexedDB con el otro. Los recursos externos se bloquean, salvo la sustitución del CDN de Firebase por el mismo SDK servido localmente. No se ha escrito en Firebase de producción ni enviado emails o mensajes.

Las reglas del repositorio se cargan expresamente, por REST administrativo **solo del emulador**, en `demo-audit-business` y `demo-audit-platform`. Una lectura posterior devuelve reglas idénticas a los dos JSON del repositorio. Los datos iniciales —primer negocio, propietario, empleada y dos códigos emitidos— se preparan como fixtures; la segunda sucursal y el alta local del dispositivo de la empleada se crean por la UI y funciones reales, no mediante un segundo fixture de negocios.

Esto valida comportamiento con **Firebase real emulado y reglas del repositorio**, no las reglas actualmente desplegadas, conectividad WAN, cuotas ni latencias de un proyecto alojado en Google. Sigue pendiente una prueba autorizada en un proyecto Firebase de ensayo desplegado. No se llama «nube de producción comprobada» a este resultado.

### P2-F01 — la sucursal pierde el nombre introducido en su alta

**Bloque 5 · Severidad: defecto funcional, identificación del negocio.**

**Archivos:** `js/core.js:1062` pide el nombre; `:1093` copia íntegro `src.business`; `:1162` guarda el nombre nuevo solo en el slot; `:624` actualiza el nombre del slot; `:5216` lo sustituye por el de `business` al recibir la nube. En `1a6d799` las cuatro primeras referencias son iguales y la última está en `js/core.js:5556`.

**Qué está mal:** el nombre solicitado no se asigna a `snap.business.name`. La nueva base conserva `Auditoría Central`, aunque el formulario se confirma con `Auditoría Sucursal`. Al recibir ese bloque desde Firebase, el selector también pasa a mostrar `Auditoría Central`. La condición existe igualmente en la rama publicada; la reproducción dinámica se ha hecho sobre `bcf612d`.

**Por qué importa:** el usuario no conserva el nombre que acaba de guardar. Padre y sucursal terminan con el mismo nombre en cabecera/selector, aumentando el riesgo de operar en el local equivocado. No se ha observado mezcla de tenants: los códigos y las bases siguen siendo diferentes.

**Reproducción realizada:**

1. Partir de un negocio `Auditoría Central`, propietario identificado y Firebase conectado.
2. Pulsar **Negocios → Abrir sucursal**.
3. Introducir el código emitido `AUD2AAA2` y continuar. Se canjea mediante lectura de `issuedCodes` y transacción sobre `codeClaims` bajo las reglas reales.
4. Sustituir el nombre sugerido por `Auditoría Sucursal` y confirmar.
5. Avanzar por las conexiones opcionales sin contratar/configurar servicios externos.
6. Esperar a la sincronización y revisar cabecera y selector: muestran `Auditoría Central`.
7. Volver al padre y luego a la sucursal desde el selector: el nombre incorrecto persiste.

**Evidencia observada:** el padre usa tenant `7U3JQSVQMBWR4T4LTU44` (`AUD2AAA1`) y la sucursal `VKVU9GGS42UCKJVVTTLJ` (`AUD2AAA2`). El segundo `business.name` y su slot acaban en `Auditoría Central`; la segunda base sí existe en RTDB. No se propone ni aplica corrección en esta pasada.

### Resultado del flujo de acceso y conmutación

La creación de la sucursal, el canje de su código y los cambios **padre → sucursal → padre → sucursal** funcionan con recargas reales, licencia por slot y conexión a Firebase. Se ha elegido la variante sucursal solicitada como alternativa; no se presenta como probada además la variante independiente.

El dispositivo nuevo empieza con `login=null`, `license=null`, `session=null` y cero empleados. Desde **Acceso Empleados**, el nombre `Ana Auditoría`, PIN incorrecto `9999` y código `AUD2AAA1` devuelven «Nombre, PIN o código de negocio incorrectos», sin conceder sesión. Con su PIN `2468`, la app descubre la nube a través de `tenantLookup`, descarga el negocio y valida el hash del empleado usando su **código de negocio**. La sesión resultante es `type=employee`, `employeeId=777`, `area=cocina`, con un nuevo slot local y badge «Nube conectada». Se mantiene tras recargar.

**Referencias del flujo:** `js/core.js:484` (`findEmployeeMatch`), `:493` (`registerRemoteBusinessLocally`), `:527` (`confirmEmployeeAccess`), `:4597` (`lookupTenantFirebaseConfig`) y `:4605` (`fetchRemoteTenantDB`). No se ha sustituido ninguna de estas funciones durante la prueba.

La modificación de teléfono del propietario `600111222 → 600999888` llega al dispositivo de la empleada por el listener Firebase. Se verifica también un rechazo de escritura a `issuedCodes/AUD2AAAA` desde su SDK autenticado anónimo: `PERMISSION_DENIED`. Por tanto, estas ejecuciones no se apoyan en reglas globalmente abiertas.

### P2-T02 — el arnés del emulador no acredita por sí solo las reglas cargadas

**Bloques 4/5 · Severidad: defecto de verificación, con riesgo de falsos positivos de permisos.**

**Archivos:** `test/emulador/run.sh:96` copia solo las reglas de negocio; `:104` arranca `demo-gastrogoan`; `:111` comprueba el namespace `demo-gastrogoan`; `test/emulador/sync-real.mjs:7` usa ese namespace; `test/emulador/escenarios.mjs:48` dirige la plataforma a `demo-plataforma`. Además `test/emulador/sync-real.mjs:17` usa `browser.newPage()`, a diferencia de los contextos aislados de `escenarios.mjs:30`.

**Qué se observó:** con el CLI instalado en esta ejecución, el log de Firebase muestra las reglas cargadas en `demo-gastrogoan-default-rtdb`, mientras los tests consultan `demo-gastrogoan`. `escenarios.mjs` puede borrar la raíz de sus dos namespaces sin autenticación y anuncia «emulador vaciado»; eso no sería posible con las reglas restrictivas del repositorio. El arnés tampoco instala explícitamente las reglas de plataforma en `demo-plataforma`. La prueba `sync-real` comparte almacenamiento local entre sus dos páginas y no demuestra dos dispositivos limpios.

**Por qué importa:** los checks de sincronización pueden pasar sin ejercitar los permisos que se pretendían comprobar. Este resultado se limita a la combinación de CLI y configuración ejecutada; no demuestra cómo estaba configurada una ejecución histórica del autor.

**Reproducción:** ejecutar el arnés en una copia, observar el namespace de carga en `database-debug.log`, consultar `/.settings/rules.json?ns=...` con credencial administrativa del emulador y comparar con ambos JSON, y probar que un cliente no autenticado no puede leer/escribir un tenant. En esta segunda auditoría se cargaron y releyeron las reglas de ambos namespaces explícitamente para las pruebas dirigidas. No se ha modificado el arnés del repositorio.

## Bloque 1 — M01 confirmado: claves antiguas de I+D sin consumidores

**Severidad: mantenimiento/cosmética, sin fallo de traducción visible demostrado.** Son siete claves, con tres traducciones cada una: 21 entradas. No faltan traducciones; sobran claves respecto de los consumidores actuales.

| Clave | `js/i18n.js` en `bcf612d`: ES / CA / EN | `js/i18n.js` en `1a6d799`: ES / CA / EN |
|---|---|---|
| `idr.dnaDraft` | 191 / 2371 / 4551 | 191 / 2363 / 4535 |
| `idr.dnaDraftDone` | 192 / 2372 / 4552 | 192 / 2364 / 4536 |
| `idr.dnaNoCarta` | 193 / 2373 / 4553 | 193 / 2365 / 4537 |
| `idr.dnaFirstHint` | 194 / 2374 / 4554 | 194 / 2366 / 4538 |
| `idr.redoFromHere` | 205 / 2385 / 4565 | 205 / 2377 / 4549 |
| `idr.askAssistant` | 206 / 2386 / 4566 | 206 / 2378 / 4550 |
| `idr.otherIdeas` | 206 / 2386 / 4566 | 206 / 2378 / 4550 |

**Comprobación:** búsqueda de las claves y de sus sufijos en todos los JS de `js/` y HTML de la raíz, excluyendo el diccionario: cero consumidores para las siete, en ambas versiones. Se revisan también las llamadas dinámicas de I+D: `js/idr.js:207`, `:1284` y `:1346` consultan `IDR_MOTIVO_KEYS`, cuya tabla `:194` contiene únicamente `idr.err.*`, no estas claves. En la rama publicada esas referencias están desplazadas cinco líneas.

**Reproducción:** buscar, por ejemplo, `dnaDraft`, `dnaDraftDone`, `dnaNoCarta`, `dnaFirstHint`, `redoFromHere`, `askAssistant`, `otherIdeas` en las fuentes de ejecución, excluyendo `i18n.js`, informes y tests; revisar las construcciones dinámicas de `t(...)`. No se deduce que las demás claves candidatas del primer barrido sean huérfanas por no aparecer como literal.

**Por qué importa y decisión sugerida:** añaden ruido a futuras revisiones y traducciones, pero retirarlas no arregla ninguna pantalla actual. Es una limpieza de prioridad baja, razonable cuando se vuelva a editar ese diccionario. No justifica reabrir el I+D ni traducir nuevamente ingredientes sembrados. No se ha borrado ninguna entrada.

## Bloques 1 y 3 — M02 confirmado y actualizado tras retirar EmailJS

**Severidad: texto/contrato de comunicación con el cliente; no crash.** Conviene decidir primero qué comunicaciones se ofrecen realmente.

### En la versión del primer informe (`bcf612d`)

**Archivos:** `reservagastrogoan.html:309` (ES), `:386` (EN), `:463` (CA), presentación en `:2118`. El texto `email.pedido.hint` promete usar la dirección **solo si se cancela**. Sin embargo, `js/tpv.js:1311` llama a `sendOrderConfirmationEmail` al aceptar un pedido, definida en `js/core.js:6656` y condicionada a configuración/datos de email válidos.

**Qué está mal:** el texto no describe todos los usos posibles del email en esa versión. **Reproducción:** formulario de pedido con email → leer la ayuda; aceptar el pedido en un negocio con email configurado y observar la ruta de confirmación. En esta pasada se confirma la contradicción en el código; no se envían correos reales.

### En la rama publicada (`1a6d799`, código `5ec1638`)

El mensaje sigue en `reservagastrogoan.html:346` / `:430` / `:514`, presentado en `:2526`. **Ya no debe describirse el defecto como «también manda confirmación»**, porque las implementaciones de EmailJS han desaparecido.

Quedan referencias en `js/tpv.js:1319` (`rejectOnlineOrder`) y `:1341` (`cancelAcceptedOnlineOrder`) con `typeof sendOrderCancellationEmail === 'function'`. La búsqueda de su definición en los scripts de la aplicación no encuentra ninguna. Las llamadas se omiten, sin lanzar `ReferenceError`; el estado público sí sigue actualizándose mediante `syncOrderStatusForPublic`.

**Qué está mal ahora:** la ayuda conserva una expectativa de aviso por email que esas rutas ya no cumplen. El comentario `js/tpv.js:1336` también sigue diciendo que se avisa por email. No es necesario restaurar EmailJS para resolverlo: la decisión de producto es si debe mantenerse ese aviso o revisarse el texto según la retirada deliberada del servicio.

**Otro texto del mismo problema:** `reservagastrogoan.html:344` / `:428` / `:512` (`reserva.ok.emailHint`) aún promete enviar confirmación a la dirección. Se añade al éxito en `:2224`, `:2255` y `:2262`. Es un mensaje de reservas, no el hint del pedido, pero conviene revisarlo junto a M02 para no dejar la misma promesa en otro formulario.

**Reproducción:** abrir el formulario de pedido de esa versión y leer la ayuda del email; comprobar en el runtime que `typeof sendOrderCancellationEmail` devuelve `undefined`; seguir rechazo/cancelación y constatar que el guard omite el envío. Para reservas, proporcionar email y observar el texto de éxito. La comprobación de la rama publicada en esta segunda pasada es estática, no una prueba de entrega de correo. Los `mailto:` de tickets/mensajes son acciones manuales distintas y no sustituyen esos envíos automáticos.

**Por qué importa y decisión sugerida:** el cliente puede esperar una notificación que no llegará. Tiene más valor corregir esta expectativa que limpiar M01. No se toca el HTML mientras el propietario trabaja en él.

## Cobertura final y comprobaciones pendientes

| Comprobación solicitada | Resultado de esta pasada |
|---|---|
| Identificar los 39 saltos y explicar la semilla | Completado: inventario nominal, línea, motivo y ruta de reproducción de los 39. No se afirma haber ejecutado sus 39 CRUD completos. |
| Crear segundo negocio y conmutar con Firebase | Completado para sucursal en emulador oficial: canje por UI, creación y conmutación; detectado P2-F01. No probado además un segundo independiente. |
| Empleado desde dispositivo sin datos, Firebase y reglas | Completado en emulador: descubrimiento, descarga, PIN rechazado/aceptado, sesión persistente y actualización propietario → empleada. No validado contra un despliegue remoto. |
| M01 | Confirmado en ambas versiones, siete claves y líneas por idioma. |
| M02 | Confirmado en la base y reformulado para la rama que elimina EmailJS. |

La ampliación adicional para fichar entrada/salida desde la empleada y observarlo en el propietario **no ha concluido**. Hubo repeticiones con pérdida de la página de Chromium (`Protocol error (Runtime.callFunctionOn): Target crashed`) otras con timeout al esperar el selector de sucursales y, en la ampliación aislada final, `Runtime.callFunctionOn timed out` al esperar la carga de datos. No se convierten estos fallos del recorrido automatizado en hallazgos de producto. Tampoco se da por validado el intento adicional con un código de negocio incorrecto: lo confirmado es el rechazo del PIN incorrecto contra el código correcto. La ejecución anterior sí llegó a `RESULT completed` para el flujo principal descrito arriba.

Durante las pruebas dirigidas también se registró `PERMISSION_DENIED` en la publicación del espejo público y se mostró el aviso correspondiente. No bloqueó las lecturas/escrituras del tenant ni el acceso de la empleada. No se presenta como una nueva regresión confirmada: queda pendiente aislar la ruta/instancia concreta del espejo en este montaje. Por tanto, **no se certifica el espejo público** a partir de estas pruebas de login y sucursales. Los `ERR_FAILED` de recursos externos bloqueados tampoco se contabilizan como defectos de la aplicación.

El código protegido por el usuario permanece intacto. La comparación con los archivos de la primera auditoría publicada confirma que `informe.md` y sus evidencias no cambian; el único archivo nuevo de esta pasada es `informe-parte2.md`.
