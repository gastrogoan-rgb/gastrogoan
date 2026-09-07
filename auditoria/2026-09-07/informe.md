# GastroGoan — auditoría del 7 de septiembre de 2026

**Versión auditada: `main`, commit `bcf612d`. Sin fixes, sin build, sin publicación.** Solo se añaden este informe y sus evidencias.

Se confirman **7 hallazgos funcionales**, **1 incumplimiento táctil con varios casos** y **2 hallazgos menores de textos/mantenimiento**. Los más urgentes son el bloqueo permanente del envío de pedidos tras un error de transacción y el consumo de cupos por pedidos que no llegan a enviarse.

**Límite importante: esta auditoría es amplia, pero no certifica cada botón y cada combinación posible.** La batería abre 75 modales y reconoce otros 39 que no logra abrir con su semilla. No he convertido esos saltos en éxitos. Tampoco se han probado Firebase real, Safari real, Windows/macOS nativos, hardware ni pagos bancarios. Las pruebas entre páginas usan un transporte de nube simulado. Estos límites se detallan al final para que el informe no dé una cobertura que no tiene.

## Versión y método

- Leído `CLAUDE.md` completo antes de comenzar. No hay `AGENTS.md` adicional encontrado en el árbol inspeccionado.
- Árbol inicialmente limpio. `HEAD`, `main` y `origin/main` apuntan al mismo commit; **el diff de rama contra main está vacío**. Revisados los últimos 30 commits y el diff `HEAD~30..HEAD`, además del historial específico del generador.
- Hay una discrepancia con el encargo: **EmailJS no está eliminado** en este checkout. Los commits `a5cbd7b`, `2fca0eb` y `6c28c29` amplían sus funciones. La página pública **no contiene calendario propio día/semana/mes**: usa campos nativos de fecha y hora (`reservagastrogoan.html:1578`). El último cambio del generador es `5230473`, del 2 de septiembre. No se atribuyen a esta versión cambios que no contiene.
- Chromium 149 en Linux, servido por HTTP local. Se instalaron las bibliotecas necesarias para arrancarlo y se adaptó temporalmente la ruta del navegador, sin editar las pruebas del repositorio.
- Conexiones HTTPS/WSS externas bloqueadas en las páginas de prueba. No se escribió en Firebase de producción ni se enviaron mensajes, correos o pagos reales.
- **44 pruebas existentes ejecutadas: 44 con salida 0.** Esto corrige el recuento provisional de 45 comunicado durante el trabajo. Relación en [suite.log](evidencias/suite.log). No se ejecutaron `todo.sh` literalmente ni las pruebas que exigen generar `dist/`; tampoco el emulador oficial ni la simulación separada de I+D.
- Reproducciones adicionales con formularios, botones y la lógica real de la app; transporte de Firebase sustituido por un almacén en memoria. [Reproducciones](evidencias/dirigida.log), [circuito entre páginas](evidencias/e2e.log), [empleados](evidencias/empleados.log).
- 432 mediciones con puntero táctil en 360/430/768/1024 px y ratón en 1280/1920 px, en es/ca/en: 24 vistas por combinación. También hubo una primera pasada con ratón para todos los tamaños, usada solo para contrastar el efecto de `pointer:coarse`. Las conclusiones táctiles usan la segunda pasada. [Medidas](evidencias/medidas.json).

## A. Fallos funcionales

### F01 — El envío de pedidos queda bloqueado si falla la transacción de cupo

**Severidad: alta. Bloque 5.**

**Archivo:** [reservagastrogoan.html:2638](/workspaces/gastrogoan/reservagastrogoan.html:2638), dentro de `submitOrder()`; reserva atómica en la línea 2638. El estado de envío se activa en la línea 2538.

**Qué está mal:** `await reservePedidoSlotAtomic(...)` no está dentro de `try/catch/finally`. Si Firebase rechaza la operación, se abandona la función con `submittingRequest=true` y el botón deshabilitado en «Enviando…». No hay aviso ni recuperación.

**Por qué importa:** afecta tanto a Take Away como a Delivery cuando se configura un máximo por franja. Un fallo de conexión o permisos impide continuar incluso después de recuperarse la conexión, hasta recargar la página y perder el formulario.

**Reproducción comprobada:** configurar `pedidos.maxPorFranja=1`, añadir un plato, completar los datos y forzar que la transacción rechace. Pulsar Enviar. Resultado observado: `submittingRequest:true`, `disabled:true`, texto «Enviando…», excepción `Uncaught (in promise)`.

**Evidencia:** `DELIVERY ERROR TRANSACCION` en [dirigida.log](evidencias/dirigida.log). La excepción fue inducida en el transporte de prueba; la ausencia de recuperación corresponde a la función real.

### F02 — Un pedido inválido consume cupo antes de ser enviado

**Severidad: alta. Bloque 5.**

**Archivo:** [reservagastrogoan.html:2638](/workspaces/gastrogoan/reservagastrogoan.html:2638); validaciones posteriores de zona en 2649 y de efectivo en 2676.

**Qué está mal:** se incrementa `pedidosHold` antes de comprobar la zona de reparto y el importe con el que se paga. Si alguna comprobación posterior falla, el incremento no se revierte. Tampoco el error de `sendRequest()` devuelve ese cupo.

**Por qué importa:** corregir un error normal del formulario puede convertir una franja libre en «completa». Afecta también a otros clientes. El eventual refresco del espejo no sustituye a deshacer inmediatamente un intento no enviado.

**Reproducción comprobada:** máximo 1 pedido por franja; Delivery de 10 €; indicar un billete de 5 €. Enviar: aparece el aviso correcto, pero el contador pasa a 1 y no existe ninguna solicitud. Cambiar el billete a 20 € y volver a enviar: «ya no admitimos más pedidos para esa franja»; siguen existiendo cero solicitudes.

**Evidencia:** `DELIVERY EFECTIVO INSUFICIENTE` y `DELIVERY EFECTIVO CORREGIDO` en [dirigida.log](evidencias/dirigida.log).

### F03 — La página pública descarta la ocupación de mesas que recibe del negocio

**Severidad: media, funcional. Bloques 3 y 5.**

**Archivo:** [reservagastrogoan.html:971](/workspaces/gastrogoan/reservagastrogoan.html:971), reconstrucción de `DB` en `loadBusinessInfo()`; lector en 1337. Emisor: [js/core.js:4499](/workspaces/gastrogoan/js/core.js:4499).

**Qué está mal:** el negocio publica `mesasOcupadas`, pero `loadBusinessInfo()` no copia `val.mesasOcupadas` al nuevo `DB`. `getOccupiedSlotsForTable()` ve siempre un mapa vacío tras la carga real, aunque Firebase haya devuelto ocupación.

**Por qué importa:** la web puede ofrecer mesas ya reservadas o rechazar/pasar a revisión una solicitud que podría haber asignado a otra mesa libre. Las pruebas que inyectan `DB` directamente pueden ocultarlo. No afirmo que esto produzca dos reservas confirmadas: el panel vuelve a comprobar disponibilidad antes de confirmar.

**Reproducción comprobada:** entregar al callback real de `loadBusinessInfo()` un `info` con la mesa 1 ocupada a las 14:00. Después de cargar, `DB.mesasOcupadas` es `undefined` y `getBestFitTable()` sigue devolviendo esa mesa para las 14:00.

**Evidencia:** `CARGA ESPEJO MESAS` en [dirigida.log](evidencias/dirigida.log). El emisor y el consumidor existen; lo perdido es el campo que los conecta. No es un fallo introducido por los últimos 30 commits.

### F04 — Los candados de mesa no detectan solapamientos entre horas fuera de la misma rejilla

**Severidad: media, funcional. Bloque 5.**

**Archivo:** [reservagastrogoan.html:1317](/workspaces/gastrogoan/reservagastrogoan.html:1317), `slotsForReservation()`; comparación exacta en 1367. El espejo repite el mismo cálculo en [js/core.js:3495](/workspaces/gastrogoan/js/core.js:3495).

**Qué está mal:** se suman 30 minutos desde la hora exacta solicitada. Una reserva de 90 minutos a las 14:00 crea `14:00/14:30/15:00`; otra a las 14:15 crea `14:15/14:45/15:15`. No comparten ninguna clave, aunque ocupan la misma mesa al mismo tiempo. El input acepta minutos intermedios.

**Por qué importa:** la protección atómica que debería rechazar la segunda solicitud permite las dos. El panel contiene una segunda barrera por intervalos (`js/app.js:3183`), por lo que el resultado comprobado es **dos solicitudes enviadas para la misma mesa**, no dos confirmaciones garantizadas.

**Reproducción comprobada:** una mesa de 4 plazas, duración 90 minutos, sin aforo restrictivo. Enviar dos reservas de 2 personas a las 14:00 y 14:15. Ambas llegan a la pantalla de solicitud enviada y los dos conjuntos de candados quedan en el almacén.

**Evidencia:** `RESERVA 14:00` y `RESERVA SOLAPADA 14:15` en [dirigida.log](evidencias/dirigida.log). Son envíos secuenciales suficientes para demostrar el fallo; no se presentan como una prueba de concurrencia real de Firebase.

### F05 — Take Away/Delivery permite enviar una fecha pasada

**Severidad: media, funcional. Bloque 5.**

**Archivo:** [reservagastrogoan.html:2542](/workspaces/gastrogoan/reservagastrogoan.html:2542), lectura/validación de fecha en `submitOrder()`; input en 2123. Comparar con la validación explícita de reservas en 1706.

**Qué está mal:** se comprueba que haya fecha, pero no `date < todayStr()`. El `min` del campo no bloquea la función llamada por `onclick`: no hay un envío de formulario nativo que imponga esa validez.

**Por qué importa:** puede llegar a operativa un pedido con una fecha ya transcurrida. También falta una barrera equivalente para una hora pasada de hoy cuando la antelación es 0.

**Reproducción comprobada:** introducir `2020-01-01` en el campo real de fecha, completar el resto y pulsar el botón Enviar. La solicitud real generada contiene esa fecha y se muestra «Pedido enviado». Se fijó el valor del input en la automatización; no se modificó `submitOrder()`.

**Evidencia:** `TAKEAWAY FECHA PASADA` en [dirigida.log](evidencias/dirigida.log). La variante de hora pasada se señala por análisis, no como una segunda reproducción ejecutada.

### F06 — El generador presenta como entregable un código que no ha emitido en la plataforma

**Severidad: media, funcional. Bloques 3 y 5.**

**Archivo:** [generador-licencias.html:362](/workspaces/gastrogoan/generador-licencias.html:362), retornos de respaldo en 367/383/387; presentación y registro en 645. Canje estricto: [js/core.js:1999](/workspaces/gastrogoan/js/core.js:1999).

**Qué está mal:** si no hay conexión/sesión o falla la escritura, `claimUniqueBizCode()` devuelve un código aleatorio que no se registró en `issuedCodes`. `gen()` lo muestra, genera los enlaces para compartir y lo añade al registro de ventas como negocio normal.

**Por qué importa:** ese código no es canjeable. El aviso habla de no comprobar duplicados, pero el problema real es que la licencia no existe. La cuenta de propietario sí bloquea su alta si no puede registrarla; el código de negocio mantiene este respaldo incompatible con el canje actual.

**Reproducción comprobada:** simular `getPlatformFirebaseApp() → null`, rellenar cliente y pulsar Generar. Aparecen el código y una venta `kind:'negocio'`, pese a no haberse escrito ninguna licencia en la plataforma.

**Evidencia:** `GENERADOR SIN CONEXION` en [dirigida.log](evidencias/dirigida.log). No se compartió ese código con nadie. Es un fallo preexistente, no atribuido al último cambio visual del generador.

### F07 — El arreglo reciente de antelación sigue anunciando horas dentro del descanso entre turnos

**Severidad: media, funcional/UX. Bloque 3.**

**Archivo:** [reservagastrogoan.html:1418](/workspaces/gastrogoan/reservagastrogoan.html:1418) y [reservagastrogoan.html:1456](/workspaces/gastrogoan/reservagastrogoan.html:1456). Relacionado con `9bca341`.

**Qué está mal:** `updateTimeInputRange()` solo toma la primera apertura y el último cierre. `applyLeadTime()` hace el máximo entre esa apertura y «ahora + antelación», pero no salta los huecos de un horario partido. El comentario del cambio dice que cubre ese caso; el cálculo no lo hace.

**Por qué importa:** el aviso ofrece una hora que el propio envío rechazará por restaurante cerrado. No demuestra que se acepte un pedido fuera de horario: la validación final sí lo rechaza.

**Reproducción comprobada:** horario 13:00–16:00 y 20:00–23:00; reloj de prueba a las 17:00; antelación 30 minutos. Resultado: mínimo y aviso «17:30»; `isTimeAllowed(...,'17:30') === false`. La primera hora válida sería 20:00.

**Evidencia:** `ANTELACION ENTRE TURNOS` en [dirigida.log](evidencias/dirigida.log).

## B. Accesibilidad y mejoras menores

### A01 — Quedan objetivos táctiles que cumplen el alto, pero no el ancho de 44 px

**Severidad: media de accesibilidad; no rompe el guardado. Bloque 2.**

**Archivos y casos comprobados con puntero táctil:**

| Ubicación | Control | Medida observada |
|---|---|---|
| [index.html:296](/workspaces/gastrogoan/index.html:296) | Fichas: rejilla/lista | 33 × 44 px en 360, 430 y 768 px |
| [js/app.js:1897](/workspaces/gastrogoan/js/app.js:1897) | Clientes: contador de visitas que abre historial | 22,9 × 44 px en tablet de 768 px, con contador 0 |
| [js/app.js:353](/workspaces/gastrogoan/js/app.js:353) | Limpieza: imprimir apertura/cierre | 33 × 44 px en móvil; 37 × 44 px en 768 px |

**Qué está mal:** [css/styles.css:1894](/workspaces/gastrogoan/css/styles.css:1894) impone alto mínimo general; el ancho mínimo solo se da a la cabecera y a `.btn-icon`. Estos botones no tienen esa clase; en Clientes además se fuerza `padding:0`.

**Por qué importa:** el dedo sigue teniendo un blanco estrecho. Es un incumplimiento del objetivo propio del proyecto, aunque no equivale por sí solo a afirmar incumplimiento de todos los criterios WCAG.

**Cómo reproducir:** emular pantalla táctil, entrar en las vistas indicadas y medir el rectángulo del botón con `getBoundingClientRect()`. [Medidas completas](evidencias/medidas.json).

**Descartado:** la cabecera sí llega a 44 px con puntero táctil. No se reportan como fallo las medidas menores obtenidas con ratón ni los +/- del TPV de 40 px, excepción expresamente documentada en CSS.

### M01 — Restos de traducciones del flujo antiguo de I+D

**Severidad: baja, mantenimiento. Bloque 1.**

**Archivo:** [js/i18n.js:191](/workspaces/gastrogoan/js/i18n.js:191), 192–194 y 205–206; equivalentes en ca/en.

**Qué está mal:** siguen definidas, sin consumidor localizado en el código activo, `idr.dnaDraft`, `idr.dnaDraftDone`, `idr.dnaNoCarta`, `idr.dnaFirstHint`, `idr.redoFromHere`, `idr.askAssistant` e `idr.otherIdeas`.

**Por qué importa:** añaden textos que mantener y describen recorridos antiguos, dificultando distinguir funciones vigentes de restos. No rompen una pantalla actual.

**Reproducción:** buscar cada clave en `index.html` y `js/`, excluyendo el propio diccionario. No aparecen consumidores. No se propone borrar automáticamente todas las candidatas: la búsqueda encuentra 264 claves sin coincidencia literal, pero muchas se construyen dinámicamente, especialmente `module.<área>.<vista>.*`, y **no son huérfanas**.

### M02 — El texto público del email de pedido quedó desactualizado respecto al cambio reciente

**Severidad: baja, texto. Bloques 1 y 3.**

**Archivo:** [reservagastrogoan.html:309](/workspaces/gastrogoan/reservagastrogoan.html:309), equivalentes en inglés 386 y catalán 463; se pinta en 2118.

**Qué está mal:** dice «Solo lo usamos … si el negocio tuviera que cancelar tu pedido». Desde `6c28c29`, `acceptOnlineOrder()` también puede enviar confirmación de aceptación con enlace de seguimiento (`js/tpv.js:1311`, `js/core.js:6656`).

**Por qué importa:** el cliente recibe una explicación incompleta del uso del email. La contradicción está en los tres idiomas, no es una copia accidental del castellano dentro del inglés/catalán.

**Reproducción:** abrir Take Away o Delivery y leer la ayuda debajo del email; contrastarla con la aceptación de un pedido con EmailJS configurado. Se verificó el texto y la conexión de funciones; no se envió un correo real.

## C. Resultado por los cinco bloques

### 1. Traducciones

- 3.278 claves en cada idioma; paridad, listas y sustituciones pasan. Las 2.665 claves literales detectadas por la prueba existente están definidas. La búsqueda adicional incluyó comillas dobles y atributos `data-i18n`; la única candidata extra inexistente, `lang.xxx`, era un ejemplo en un comentario.
- Inspeccionados 1.021 objetos de traducción que empiezan por `es:` en los módulos: todos contienen es/ca/en. No se encontró una copia española evidente en inglés. Las coincidencias completas detectadas fueron «Stock» con marcado HTML y «Anthropic (Claude)», válidas. Este análisis incluye mapas que llegan a `gl(variable)`, no solo llamadas con un literal.
- No se encontró `toLocaleDateString('es-ES')` suelto en el código activo. Los formatos monetarios fijos no se confunden con fechas.
- La prueba de textos visibles pasa; las mediciones es/ca/en no detectaron overflow del documento. Se revisaron también capturas de móvil. No se afirma inspección visual humana de las 432 imágenes: no se generaron 432 capturas.
- No se considera fallo que el catálogo base ya sembrado conserve su idioma. Hallazgos: M01 y M02.

### 2. Responsive, contraste y Apple

- Tamaños pedidos cubiertos: 360, 430, 768, 1024, 1280 y 1920 px. Cero errores de navegación y cero overflow horizontal del documento en las 432 mediciones finales.
- Hay barras y tablas desplazables internamente. Que un hijo quede fuera del viewport dentro de un contenedor con scroll no se clasificó automáticamente como fallo.
- `--muted:#716C65`: contraste calculado de **5,20:1** contra blanco, **4,91:1** contra `#FAF8F4`, **4,53:1** contra `#F1EFE9`, **4,73:1** contra `#F4F4F4`. Cumple los cuatro mínimos; el menor tiene poco margen.
- `test/apple.mjs` pasa, pero usa Chromium con User-Agent de iPad: no es WebKit ni Safari.
- Puntos para prueba Apple real: scrollbars `::-webkit-scrollbar` (`css/styles.css:48`), `-webkit-overflow-scrolling` y scroll anidado (`:109`, `:1451`), recortes `-webkit-line-clamp` (`:221`), fuentes del sistema y safe areas (`:39`), `input[type=date/time]` públicos (`reservagastrogoan.html:1578`, `:2123`). Son dependencias de presentación a verificar, **no incompatibilidades demostradas**.
- Hallazgo demostrado: A01. No hay certificación de Windows/Mac por ejecutar Chromium sobre Linux.

### 3. Cambios recientes

- Revisión de 30 commits, diff histórico acumulado y cambios específicos del generador `67717a6`, `6f076fd`, `4bbeeeb`, `5230473`.
- La prueba estática reconoce 1.662 funciones únicas y 612 funciones llamadas desde botones, sin referencias inexistentes dentro de su alcance. El generador pasa sus pruebas de anular/reactivar/borrar y sus funciones nuevas están definidas.
- El flujo de señal de reserva y su umbral por personas tiene función de actualización definida y llamada desde el formulario. No se encontró llamada huérfana en ese cambio.
- EmailJS sigue presente con carga de SDK, cuatro plantillas y llamadas vigentes. No hay eliminación que auditar en esta rama.
- Fallo del cambio reciente: F07. Texto no actualizado al incorporar emails de pedidos: M02. Desajustes de conexión preexistentes: F03 y F06.

### 4. Empleados, permisos y operativa

- Las 10 comprobaciones de `permisos.mjs` pasan en propietario, cocina, cocina con edición, sala, sala con edición y sala repartidor. Esa es la matriz de seis casos del test; la bandera repartidor no constituye un permiso adicional.
- `.owner-strict` no aparece para empleados; los módulos de costes quedan cerrados sin edición; Gestión Económica/Mi Negocio y las otras vistas de Gestión se rechazan con aviso en los cinco perfiles de empleado.
- `saveEmployee()` avisa al denegar. No se reprodujo un guard visible que falle en silencio dentro de esta matriz.
- Altas reales desde el modal: cocina y sala, nombre/teléfono/email, edición posterior, cancelación sin guardar y cambio del PIN inicial. En sala se marcó repartidor; en cocina el formulario no ofrece esa casilla. Crear no permite elegir PIN libre: asigna 1234 y el empleado lo cambia en el flujo previsto.
- Los PIN personalizados validaron con el código del negocio y no con el usuario del propietario. Se conservaron después de recargar.
- Se recorrieron Personal/Semana de los perfiles, se crearon y editaron turnos con propietario y empleados con edición, y se registraron entrada/salida en los seis casos. Se conservaron los turnos y seis fichajes al recargar. Estas operaciones se ejecutaron sobre formularios y funciones reales; no equivalen a haber hecho seis logins nuevos por nombre/PIN/código.
- Cocina/sala, TPV, stock, comandas, carta y demás módulos se ejercitaron con las pruebas de permisos, botones, pestañas y recorridos; **no se ha ejecutado cada operación CRUD de cada módulo desde cada perfil**. La prueba de conexiones cubre liberar repartos al quitar la bandera/borrar al empleado. No se afirma una nueva prueba manual integral de baja y reingreso de todos los empleados.
- No se propone cambiar la decisión de privacidad: un encargado gestiona turnos y solo ve su tarjeta personal. Hallazgo visual relacionado: A01; ningún nuevo fallo de sal o acceso a Gestión demostrado.

### 5. Circuito completo y cobertura pendiente

**Comprobado en tres páginas reales con transporte simulado:**

1. Generar una cuenta nueva y un código; el generador escribe los nodos simulados de nombre, autenticación y licencia.
2. Introducir usuario y PIN en `index.html`; comprobar sesión `type:'owner'`; canjear el código y comprobar licencia y propietario del slot. Se exigió sesión válida antes de continuar.
3. Sembrar un negocio mínimo siguiendo los campos existentes; no completar una configuración Firebase real.
4. Enviar un Take Away y un Delivery mediante sus formularios, procesarlos con el listener real del negocio y obtener órdenes `abierta` con `clientRef`.
5. Publicar el estado mediante las funciones reales y mostrar «En preparación» en el seguimiento público. El transporte entregó manualmente los eventos entre páginas; no se probó descubrimiento de nube o entrega SDK real por URL.
6. Enviar una reserva de 2 personas, procesarla y obtener `confirmada`, mesa 1; mostrar la confirmación en la web pública.

[Evidencia del circuito](evidencias/e2e.log). Los intentos iniciales con campos sin foco se descartaron: el log conservado exige que el login sea realmente de propietario.

**Cobertura amplia existente:** 283 botones en 31 pantallas; 84 pestañas; 75 modales abiertos; formularios de proveedor/ingrediente/empleado/cliente y persistencia; recorridos de ingrediente a factura; servicio, cocina, sala, caja, errores, aislamiento entre cuentas y sincronización simulada. Que estas pruebas pasen no invalida F01–F07.

**No comprobado y necesario para cerrar literalmente el encargo:**

- Los 39 modales que el banco salta y cada botón anidado/CRUD restante. `test/modales-todas.mjs:226` reconoce el salto; su mensaje final «todas» es más amplio que su cobertura.
- Crear un segundo negocio y conmutar entre ambos mediante todo el flujo UI con nube; `cuentas.mjs` cubre aislamiento y datos, pero no sustituye ese recorrido completo.
- Login desde dispositivo nuevo de cada empleado contra Firebase real; nube propia, reglas, concurrencia y sincronización entre dispositivos reales. No se ejecutó `test/emulador/run.sh`.
- Calendario público día/semana/mes y eliminación de EmailJS: no existen en esta versión. Hace falta el commit que los contenga.
- Pago y devolución reales, correo recibido, proveedores IA reales, impresión/cajón y dispositivos Apple/Windows/Mac reales.
- Build de los HTML autocontenidos, demo y artefacto recién construido: se auditó el código fuente servido, sin regenerar `dist/`.

**Orden propuesto para revisar contigo los fixes, sin aplicarlos:** F01/F02 → F03/F04 → F06/F05/F07 → A01 → M01/M02.
