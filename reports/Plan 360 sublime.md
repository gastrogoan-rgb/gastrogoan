# Plan 360º sublime — plan de trabajo

**Estado: EN ESPERA** (15/11, decisiones del dueño ya recogidas abajo). El dueño lo aprobó como dirección («dale caña a todo y no pares hasta acabar»), pero pidió dejarlo aparcado hasta terminar un par de cosas antes. Cuando se retome, se ejecuta entero, fase a fase, sin pararse a preguntar salvo en las decisiones marcadas con ❓.

Base: revisión en profundidad del 15/11 (panel del coach `admin-panel/plan360.html` + app del negocio `js/app.js` 5596-7263, `js/core.js`, `js/finance.js`). 15 problemas en el panel y 12 en la app; los más graves, reproducidos.

## La idea

El Plan 360º es un servicio de 950 € + IVA que se hace **cara a cara**. La herramienta tiene que servir para eso: que en la mesa con el hostelero el coach lo tenga todo a mano, que lo que se decide quede escrito al momento, que el cliente vea durante las 4 semanas que hay alguien encima, y que al final se lleve un documento con sus cifras de verdad. Hoy los datos se pisan, el «antes» puede ser falso y lo prometido en la web (informe de cierre, plan por áreas) no existe.

Regla de siempre: nada cuesta dinero por cliente. Todo vive en la nube de cada negocio.

---

## Fase 0 · Que no falle nada (lo primero, sin discusión)

| # | Qué | Dónde |
|---|---|---|
| 0.1 | **El 2.º cliente de la sesión sale en blanco**: `lastPushedJson = null` (y `mantBase`) en `openClient`/`closeClient`. | plan360.html:390, 423 |
| 0.2 | **Fusión por id**, no por posición, en `tasks`, `objectives`, `mediciones`, `inversiones` del programa (fusión a tres bandas por campo dentro de cada elemento). Guardar objetivos NO reordena el array: se ordena al pintar. | core.js `fusion3` 9618; app.js 6894 |
| 0.3 | **El panel sube por diferencias** todo `plan360*` (generalizar `mantDiferencias` con rutas por id) y casa los formularios **por `data-id`**, volviendo a buscar el día en `remoteBiz` en cada acción (tareas, objetivos, inversiones, cuestionario inicial, contrato, cierre). | plan360.html:572, 8827-8973, 8709, 5769 |
| 0.4 | **La app sube `plan360*` por rutas**, no dentro del `business` entero; una tablet que vuelve a tener conexión no reescribe lo del coach. Probar con `test/emulador` (dos aparatos + uno sin conexión). | core.js:12295 |
| 0.5 | **Fecha de inicio pendiente** hasta que el coach la confirme (`plan360StartDateConfirmed`). Ni el panel ni la app la fijan solos. Sin fecha: la app dice «Tu coach está fijando la primera visita», sin «hoy toca», sin atrasados, sin `dia1`; la agenda lo pone en «Por empezar». No escribir 100 KB de estructura por solo abrir un cliente. | core.js:4826; plan360.html:4158 |
| 0.6 | **«Antes» = un mes COMPLETO** cerrado antes del inicio confirmado, con mínimo de días de venta; si no lo hay, «sin datos del Día 1» (nunca un mes a medias). Se recalcula si cambia la fecha (`dia1.desde`). | finance.js:1034 |
| 0.7 | `savePresencial` usa `o.text` (campo viejo) y borraría objetivos. | plan360.html:8719 |

Pruebas nuevas: abrir dos clientes seguidos; coach borra/inserta tarea mientras el negocio marca otra (los 4 casos de `fusion3`); cuestionario guardado por los dos a la vez; fecha sin confirmar; Día 1 con mes parcial.

## Fase 1 · El modo «cara a cara» (lo que lo hace potente en la mesa)

- **Modo sesión** en el panel: pantalla limpia para tablet/portátil delante del cliente, letra grande, una cosa cada vez, sin menús del coach a la vista. Navegación por los bloques del día (misterioso → reunión → cuestionario → objetivos…).
- **Acta en vivo**: durante la reunión, cada decisión se apunta como tarea u objetivo con un toque, con responsable y fecha. Al terminar, «Enviar acta» y el negocio la tiene en su app.
- **Dictado por voz** (ya existe en la reunión inicial) en todos los campos de texto largos.
- **Cuestionario en profundidad por áreas con progreso** (8 áreas, 323 preguntas): saltar a un área, ver qué falta, adjuntos.
- **Cliente misterioso con resultado visual**: puntuación por bloque en una rueda de las 6/8 áreas (la misma idea de la web), que se enseña al cliente el día 1.
- **Objetivos con métrica puesta por el coach** (hoy solo la pone el negocio), valor inicial, objetivo y fecha; botón borrar.
- **Área en objetivos y tareas** (las 8 del cuestionario; la categoría del banco la rellena sola) → vista y impreso **«Plan de acción por área»** (lo que promete la web).
- Funciona **sin conexión** en el local y sube al volver (por diferencias, Fase 0).

## Fase 2 · Las 4 semanas: que se vea que hay alguien encima

- **Panel de Control y campana del negocio**: tareas de hoy y atrasadas del Plan 360, reunión de hoy, «tu coach te ha enviado X» (misterioso, inversiones, libro, acta), «firma el contrato / contesta el cuestionario» mientras falte. Patrón `avisosDeLaApp()`.
- **Guía de primeros pasos** en la pantalla del Plan 360: carta ✓, contrato, cuestionario N/28, fecha de la primera visita.
- **Cuestionario inicial prerrellenado** con lo que la app ya sabe (Mi Negocio, Personal, Gestión Económica).
- **Tareas al equipo**: asignar una tarea del plan a un empleado o área y que salga en su «Mi puesto» con «Puesta por el coach».
- **Actividad para el coach**: `hechaEn` en tareas, reunión, mediciones y objetivos; `plan360PingActivity` en cada acción; «Nuevo» y «X tareas marcadas desde tu última visita» en las tarjetas de «Mi agenda»; «llámale» también en la fase 360.
- **Indicador de avance** que premie la mejora (no solo «cumplidos»: «mejorando» si la última medición mejora a la primera).
- **Plantilla de programa** (`coachConfig/programaPlantilla`): 26 días con tareas del banco repartidas por semanas; «Copiar el plan de otro cliente»; «Repartir tareas por objetivo». Ahorra horas por cliente.
- **Calendario flexible**: fecha propia para el día 2, días cerrados del local que se saltan, pausar o alargar. ❓ Unificar la duración que se vende: web «2 días + 1 mes», contrato «28 días», carta «4 semanas (26 días)».

## Fase 3 · El cierre: lo que el cliente se lleva

- **Informe de cierre en PDF** (ventana de impresión con `ggEsperarYImprimir`, tipografía de la marca): Día 1 → hoy con las cifras REALES de la app + las manuales, objetivos con métrica y evolución, plan por área con lo hecho, mejoras, qué vigilar, siguiente nivel, oferta de mantenimiento. En el panel y en la app.
- **Estado del cierre**: borrador → «Enviar el cierre al negocio». La app no lo enseña hasta entonces.
- **«En números» también en el cierre** y botón para pasar esas cifras a `cierre.kpis`.
- **Respuestas al mantenimiento**: Acepto / Me lo pienso (fecha ≥ hoy) / **No, gracias**. Al aceptar se guardan precio y texto aceptados (como `signedText`). Sin alerta roja eterna.
- **Después del día 28**: los atrasados pasan al balance del cierre; arriba del todo, el cierre y la oferta.

## Fase 4 · Mantenimiento y negocio del coach

- **Cobros del Plan 360** (`plan360Servicio.cobros360 = {firma, dia15}`), aviso del segundo pago en la agenda y suma del mes; **exportar cobros a CSV** (360 + mantenimiento).
- **Mes nuevo autorrellenado** con el mes tipo al abrirlo (con deshacer); **adjuntos en las entregas**; «Abrir WhatsApp» del negocio con el texto puesto (`whatsappDeTelefono`).
- **«Mi mantenimiento» en la app**: cuota, meses pagados y pendientes, renovación y **«Solicitar la baja»** con fecha (cláusula 11).
- **Al terminar el servicio**, el Plan 360 queda en **solo lectura** (libro, contrato, informes) en vez de desaparecer.
- **Archivar clientes terminados** (no se leen en la agenda); un solo `onLoggedIn`.

## Fase 5 · Peso, privacidad y limpieza

- Sacar de `business` lo pesado y lo interno: `db/plan360Adjuntos/{id}` (adjuntos con carga bajo demanda) y `db/coachPrivate` (cuestionario en profundidad, nota privada, borradores sin enviar). No copiar los 35 KB de textos semilla de Recursos a cada cliente.
- «Mi agenda» lee un resumen ligero, no el programa entero con adjuntos.
- Libro de marca: sin `<embed>` (no se ve en Android), botones Abrir/Descargar con miniatura; el PDF solo se baja al pedirlo.
- **Quitar DNI e IBAN del coach del código fuente** (core.js:4563, 4574; plan360.html:2745) → configuración en `coachConfig`.
- Reglas: `coaching360/$tid` y `tenantLookup/$tid` solo escribibles si no existen o por el mismo negocio (publicar en los tres sitios).
- i18n de los textos fijos (precio, categorías, inversiones, títulos de día) y tamaños con `.txt-xs`; `onclick` con ids escapados de verdad; código muerto fuera; textos viejos («día 0», «pídemelo», «interno»/«lo verá»); un solo tope del PDF del libro (7 MB) en código, README y CLAUDE.md; manual al día en los tres idiomas.

## Cómo se ejecuta

- Una fase cada vez, en este orden; cada una con su prueba permanente en `test/` y en `todo.sh` (las dos listas).
- Antes de dar una fase por buena: `bash test/todo.sh`, el emulador de dos aparatos para todo lo que sincroniza, capturas a 390 y 1280 px de cada pantalla tocada (y sus ventanas), y la norma de espacios muertos.
- Publicar por tandas (cada 4-5 cambios): build, `deploy/actualizar.sh`, merge a `main`, y decir al dueño qué ver y dónde (panel en `admin.gastrogoan.com`).
## Decisiones del dueño (15/11) — ya tomadas, no volver a preguntar

- **Duración: 4 semanas.** Unificar web, contrato, carta, app, panel y manual con esa cifra (2 días presenciales dentro de las 4 semanas).
- **El informe de cierre NO lleva la oferta de mantenimiento.** Orden: primero se enseña el informe de cierre; el paso SIGUIENTE (pantalla aparte) es ofrecer el mantenimiento.
- **Quitar lo que ya no sirva**, comprobándolo antes (p. ej. el «borrador en PDF» antiguo del libro de marca, código muerto de presenciales, plantillas duplicadas): asegurarse de que nada lo usa.
- **Mandato de fondo**: «ultra top» en funcionamiento y utilidades, *absolutamente todo*. No quedarse con lo que hay: entender primero la FUNCIÓN del método (diagnóstico 360 → plan por áreas → implementación acompañada → resultado medible → continuidad) y añadir lo que haga falta para que sirva de verdad trabajando cara a cara con el hostelero. Las fases de arriba son el mínimo, no el techo: al retomarlo, empezar por una pasada de diseño del método (qué necesita el coach en cada momento de la relación) y ampliar el plan con lo que salga.
