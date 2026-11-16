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

> **NORMA EXIGIBLE DEL DUEÑO (15/11): mejorar sobre la marcha.** Mientras se construye, cualquier idea, mejora o funcionalidad que beneficie al programa **se aplica en el momento**, sin esperar a que esté en este plan ni a pedir permiso. Este documento es el suelo, no el techo. Cada mejora añadida se apunta al final, en «Añadido sobre la marcha» (qué, por qué y dónde), para que el dueño la vea al revisar.

## Decisiones del dueño (15/11) — ya tomadas, no volver a preguntar

- **Duración: 4 semanas.** Unificar web, contrato, carta, app, panel y manual con esa cifra (2 días presenciales dentro de las 4 semanas).
- **El informe de cierre NO lleva la oferta de mantenimiento.** Orden: primero se enseña el informe de cierre; el paso SIGUIENTE (pantalla aparte) es ofrecer el mantenimiento.
- **LO PRINCIPAL ES AÑADIR Y MULTIPLICAR VALOR** (aclarado por el dueño): funcionalidades y formatos nuevos que de verdad sumen al programa. Quitar es secundario. Ver la sección «Multiplicar el valor» al final.
- **Quitar lo que ya no sirva**, comprobándolo antes (p. ej. el «borrador en PDF» antiguo del libro de marca, código muerto de presenciales, plantillas duplicadas): asegurarse de que nada lo usa.
- **Mandato de fondo**: «ultra top» en funcionamiento y utilidades, *absolutamente todo*. No quedarse con lo que hay: entender primero la FUNCIÓN del método (diagnóstico 360 → plan por áreas → implementación acompañada → resultado medible → continuidad) y añadir lo que haga falta para que sirva de verdad trabajando cara a cara con el hostelero. Las fases de arriba son el mínimo, no el techo: al retomarlo, empezar por una pasada de diseño del método (qué necesita el coach en cada momento de la relación) y ampliar el plan con lo que salga.

---

## Multiplicar el valor: funcionalidades y formatos nuevos

La ventaja que no tiene ningún consultor de hostelería: **el Plan 360º vive dentro de la app con la que el negocio trabaja cada día**. Ventas, escandallos, personal, mermas, proveedores, reservas y clientes ya están ahí. Así el diagnóstico, el plan y los resultados se apoyan en datos reales y se miden solos, no en lo que el hostelero recuerda. Todo lo de abajo nace de esa ventaja y no cuesta nada por cliente (la IA solo es opcional, con la clave de quien la use).

### 1. Diagnóstico que impresiona el día 1
- **Radar 360 del negocio**: una puntuación de 0 a 100 por área. Se calcula con tres fuentes: el cliente misterioso, el cuestionario y los **datos reales de la app** (food cost, coste de personal sobre ventas, ticket medio, rotación de mesas, NPS, mermas, subidas de proveedores, no-shows). Se compara con rangos orientativos del sector, con su fuente, y se repite el día 28 y cada trimestre.
- **Diagnóstico automático con sus datos**: ingeniería de carta (matriz de popularidad × margen: estrellas, caballos, puzles y perros, sacada de las ventas y del Escandallo), horas y días flojos, peso de cada canal, clientes en riesgo, proveedores que más suben y platos con peor food cost. El coach llega al día 1 sabiendo ya dónde está el dinero.
- **«Dinero sobre la mesa»**: cada hallazgo se traduce a € al año con los números del propio negocio («tu food cost está 4 puntos por encima del objetivo: 11.800 € al año»).
- **Encuesta a clientes** (NPS por QR en mesa, que ya existe) y **encuesta anónima al equipo** (clima, por enlace) como parte del diagnóstico.
- **Fotos anotadas** del recorrido del misterioso, que servirán para el antes y después.
- **Modo presentación**: el diagnóstico en pantalla grande (TV o tablet) para enseñárselo al dueño y al equipo, una idea por pantalla.

### 2. Un plan que se entiende y se mide solo
- **Hoja de ruta por área** con semáforo y fechas, imprimible como póster para la oficina o la cocina.
- **Objetivos SMART enganchados a un dato de la app** (food cost, ticket medio, coste de personal, NPS, mermas, reseñas): se miden solos cada día, sin teclear nada.
- **Biblioteca de palancas**: acciones tipo por área, cada una con su impacto estimado con SUS números (por ejemplo, «+0,50 € de ticket medio con tus 9.000 tickets = 4.500 €/año»). El coach elige en la mesa y la palanca se convierte en objetivo y tareas.
- **Simulador «¿y si…?» en la mesa** (reutiliza `peCalcular`): precio, food cost, plantilla, plazas, rotación, días de apertura. Se toca una cifra y se ve el resultado al momento.
- **Plan de inversiones con retorno**: plazo de recuperación de cada inversión.

### 3. Implementación acompañada (las 4 semanas)
- **Acta en vivo → tareas con responsable**, y cada tarea sale en el «Mi puesto» de ese empleado. Una tarea sabe dónde se hace en la app: «Ir a Escandallo», «Ir a Fichas», «Ir a Limpieza».
- **Misión de la semana**, con su progreso y un recordatorio en la campana.
- **Formación del equipo**: microlecciones (la masterclass ya existe) con un test corto, registro de quién la ha hecho y certificado imprimible.
- **Recursos que son herramientas vivas**: las plantillas de Recursos abren la pantalla de la app que les corresponde (la del escandallo abre Escandallo, la del APPCC abre Limpieza), en vez de quedarse en texto.
- **Canal «Coach»** dentro del chat interno, con notas de voz y adjuntos, para hablar coach ↔ negocio sin salir de la app.
- **Antes y después en fotos** (sala, cámara, carta, pase).
- **Rediseño de carta asistido**: propuesta de carta nueva con precios, orden y descripciones, a partir de la ingeniería de carta, y se aplica a Oferta con un toque.

### 4. Resultados que se ven cada semana
- **Marcador semanal automático** frente al Día 1 (ventas, ticket, food cost, personal, NPS, mermas) con su gráfica, y «€ ganados desde que empezamos» acumulado.
- **Informe semanal listo para WhatsApp** (texto + imagen), para el dueño y para el coach.

### 5. Cierre y continuidad
- **Informe de cierre en PDF**, tipo libro (radar antes y después, cifras, objetivos, lo implantado, fotos, qué vigilar). **Después**, en pantalla aparte, la oferta de mantenimiento, argumentada con los objetivos que quedaron a medias.
- **Sello «Plan 360º completado»** para el local (diploma imprimible y pegatina digital para redes) y **caso de éxito** con permiso del cliente, para la web de la Asesoría. Petición de reseña y testimonio.
- **Revisión trimestral 360**: el radar se repite y se compara.
- **Alertas al coach** cuando un indicador se desvía (food cost +3 puntos, ventas −15 %, NPS en caída): el coach llama antes de que el dueño lo note. Es el gran argumento del mantenimiento.
- **Recomendación**: un cliente que recomienda a otro tiene su ventaja; se registra en el panel.

### 6. Herramientas del coach para escalar el negocio
- **Embudo de clientes** en el panel: contacto → diagnóstico exprés → propuesta → firma → 360 → mantenimiento.
- **Diagnóstico exprés** (15-20 preguntas, unos 15 minutos) que genera un PDF con el «potencial de mejora en €», para captar clientes en la primera visita. Se puede enlazar desde la web de la Asesoría.
- **Propuesta comercial y contrato** generados desde el diagnóstico exprés.
- **Plantilla de programa**, **guiones de cada reunión**, **banco de tareas y palancas por área**, y **modo sesión sin conexión**.
- **Cartera**: ingresos (360 + mantenimiento), cobros, facturas y CSV para el gestor, clientes por fase y **resultados medios de los clientes** («de media, nuestros clientes ganan X € al mes»): la mejor frase de venta.

### Formatos
PDF (diagnóstico, plan, informe semanal, informe de cierre, certificados), modo presentación en pantalla, póster imprimible, resumen para WhatsApp, notas de voz, fotos de antes y después, checklists imprimibles y microlecciones.

### Orden al retomarlo
Primero la Fase 0 (que nada falle). Después, en este orden: diagnóstico con datos reales y el radar (es lo que vende) → objetivos que se miden solos y el marcador semanal → acta en vivo y tareas al equipo → informe de cierre y lo que viene después → herramientas del coach (diagnóstico exprés y embudo) → el resto. Cada bloque, con su prueba y sus capturas.

---

## Carne en el asador: la anatomía de cada pieza

Pedido del dueño (15/11): no basta con la lista de ideas. **Cada pieza del Plan 360 tiene que pensarse entera**: qué datos lleva, en qué formatos se ve, qué se puede hacer con ella y cómo se conecta con el resto de la app. El objetivo es que el trabajo del hostelero sea fluido: que nunca tenga que preguntarse qué toca, por qué, cuánto cuesta, quién lo hace ni cómo va.

Regla de diseño para todas: **una pieza se crea en un toque** (con lo mínimo) y **se enriquece después** sin estorbar. Lo opcional aparece cuando hace falta.

### Tarea
- **Datos**:
  - título;
  - qué hay que hacer, con pasos en forma de *subtareas con casilla*;
  - **por qué** (a qué objetivo y a qué área sirve);
  - responsable, que puede ser el dueño, uno o varios empleados o un área entera;
  - fecha límite y hora;
  - duración estimada;
  - **prioridad** (crítica, alta, media o baja) e **impacto × esfuerzo**;
  - coste previsto y real, enlazado al presupuesto;
  - proveedor implicado;
  - dónde se hace en la app (enlace directo a Escandallo, Fichas, Limpieza, Oferta…);
  - **criterio de hecho**: qué tiene que verse para darla por terminada;
  - evidencia exigida (foto, documento, firma, cifra);
  - tarea de la que depende (no se puede empezar sin la otra);
  - repetición (diaria, semanal, mensual), para hábitos como «revisar mermas cada lunes»;
  - etiquetas;
  - quién la puso: «Puesta por tu coach» o «Puesta por mí».
- **Estados**: por hacer → en curso → **bloqueada (con motivo)** → para revisar (el coach da el visto bueno) → hecha / no hecha (con motivo) / aplazada (con nueva fecha). Cada cambio queda en su **historial**, con quién lo hizo y cuándo.
- **Formatos**:
  - fila compacta en «Hoy»;
  - tarjeta en el tablero;
  - barra en el cronograma;
  - ficha completa;
  - hoja imprimible con sus casillas y firma, para colgar en la cocina;
  - mensaje de WhatsApp para pasarla al responsable;
  - entrada en el calendario (un archivo .ics, que no cuesta nada).
- **Dentro de la tarea**:
  - comentarios entre el coach y el negocio;
  - notas de voz;
  - fotos de antes y después;
  - adjuntos;
  - plantilla o recurso de apoyo;
  - un vídeo o una microlección de «cómo se hace».
- **Acciones**: duplicar, mover de día, delegar, partir en dos, convertir en hábito, pedir ayuda al coach (le llega un aviso), y guardarla en el banco para reutilizarla con otros clientes.
- **Avisos**: la campana el día que toca, «vence mañana», «atrasada», «bloqueada» (al coach) y «para revisar» (al coach).

### Objetivo
- **Datos**:
  - qué se quiere conseguir, redactado en formato SMART con ayuda en pantalla;
  - área;
  - **por qué importa en €** (lo calcula la app);
  - **indicador** enganchado a un dato de la app o tecleado a mano;
  - valor de partida (día 1), valor objetivo y fecha;
  - hitos intermedios (semana 1, 2, 3 y 4);
  - prioridad (prioritario, esencial o complementario) y peso;
  - responsable;
  - tareas que lo empujan;
  - riesgos.
- **Estados**: sin empezar · en marcha · **en camino / en riesgo / desviado** (calculado comparando el ritmo con la fecha) · cumplido · parcial · no cumplido (con motivo y aprendizaje).
- **Formatos**:
  - tarjeta con una barra de progreso hacia la meta;
  - **gráfica de evolución** con la línea objetivo;
  - semáforo;
  - fila del «tablero de objetivos»;
  - página del informe de cierre;
  - póster «Nuestros objetivos del mes» para el equipo, imprimible.
- **Ver claramente objetivos y prioridades**:
  - una pantalla **«Lo importante»**: los 3 objetivos prioritarios arriba, en grande, con su cifra de hoy frente a la meta;
  - debajo, los esenciales y los complementarios;
  - y una **matriz impacto × esfuerzo** donde cada objetivo o tarea es un punto que se arrastra (victorias rápidas, proyectos grandes, rellenos y lo que no compensa).

### Presupuesto (nuevo)
- **Presupuesto del Plan**: cuánto puede invertir el negocio en total y por área. Cada tarea, inversión o compra lo consume, y se ve **lo previsto, lo comprometido, lo gastado y lo que queda**.
- **Presupuestos de proveedores**: pedir presupuesto a dos o tres proveedores (mensaje ya escrito por WhatsApp o email desde Proveedores), apuntar lo que contesta cada uno, **comparar en una tabla** (precio, plazo, garantía, condiciones), elegir, y que se convierta en inversión o gasto con su factura.
- **Presupuesto que el coach le hace al negocio**: Plan 360, mantenimiento o extras, con aceptación y firma en la app (como el contrato) y paso a cobro.
- **Formatos**: barra de consumo por área, tabla comparativa, PDF del presupuesto, y la previsión de caja (usa Tesorería): «si haces estas tres inversiones, en marzo te quedas en X €».
- **Avisos**: te pasas del presupuesto, presupuesto de proveedor sin respuesta a los 3 días, presupuesto a punto de caducar.

### Inversión
Ya existe el plan de inversiones (rojo, ámbar, verde). Se añade:
- coste con y sin IVA;
- financiación (al contado, préstamo o renting), que **se da de alta sola en Gestión Económica → Inversiones**;
- **retorno**: ahorro o ingreso al mes y meses para recuperarla;
- prioridad;
- presupuestos comparados;
- foto del antes;
- estado: idea → aprobada → comprada → instalada → amortizándose.

### Reunión
- **Datos**: tipo (presencial, videollamada o WhatsApp), fecha, hora, duración y lugar o enlace; asistentes; **orden del día** (lo prepara el coach con los objetivos y las tareas atrasadas ya puestos).
- **Durante la reunión**: guion por puntos, notas, dictado por voz y decisiones; cada decisión se convierte en tarea u objetivo con un toque.
- **Después**:
  - **acta** con decisiones, tareas y responsables, firmable por los dos;
  - envío por WhatsApp o en PDF;
  - la próxima reunión queda propuesta.
- **Formatos**: archivo de calendario, recordatorio el día antes, acta en PDF y resumen en la campana.

### Día y semana del programa
- **Día**: lo que toca (reunión, tareas), el foco del día y el color de la prioridad. Lo que ya está hecho, lo pendiente y una nota del día.
- **Semana**: la **misión de la semana**, un resumen al cerrarla (lo hecho, lo que queda, cómo van las cifras) y la semana siguiente ya preparada. Los días cerrados del local se saltan.

### Vistas: la misma información, de la forma que mejor sirva
- **Hoy**: lo mío de hoy y lo atrasado.
- **Tablero**: columnas por estado, arrastrables.
- **Cronograma**: las 4 semanas con las tareas como barras y las dependencias.
- **Calendario**: mes y semana.
- **Por área**: la rueda del 360.
- **Por responsable**: qué tiene cada persona del equipo.
- **Por objetivo**: qué tareas empujan cada uno.
- **Matriz impacto × esfuerzo**.
- **Lista para imprimir**.

Todas con filtros, buscador y el mismo menú ⋯.

### Las demás piezas, con la misma exigencia
- **Indicador o KPI**: de dónde sale el dato, su fórmula explicada, cada cuánto se actualiza, una referencia del sector con su fuente, una gráfica, el umbral de alerta, y quién lo vigila.
- **Alerta**: qué la dispara, a quién le llega (coach, dueño o equipo), qué hacer (con un botón que crea la tarea), y cuándo desaparece sola.
- **Recurso o plantilla**: para qué sirve, en qué momento del programa se usa, y la pantalla de la app que abre. Se puede rellenar, imprimir o descargar, y lleva versión.
- **Formación**: lección corta (texto, imágenes, vídeo enlazado), test, quién la ha hecho, certificado y recordatorio a quien falta.
- **Checklist de implantación** (APPCC, carta nueva, apertura y cierre…): casillas, responsable, foto de evidencia, firma, y repetición.
- **Evidencia (foto o documento)**: antes y después emparejados, comentario, y a qué tarea u objetivo pertenece. Va a la galería del cierre.
- **Mensaje coach ↔ negocio**: en hilo por tarea u objetivo (no un chat suelto), con voz, adjuntos y «leído».
- **Informe** (diagnóstico, semanal, de cierre, trimestral): plantilla común con portada, radar, cifras, objetivos, fotos y siguientes pasos. En PDF, en modo presentación y como resumen para WhatsApp.
- **Cobro**: concepto, importe, IVA, vencimiento, estado, recordatorio y factura con número, con exportación para el gestor.
- **Ficha del cliente para el coach**: fase, salud del cliente (actividad, cumplimiento, cifras), próximo hito, cobros, notas privadas e historial de todo lo hecho.

### Lo que todas las piezas comparten
Plantillas reutilizables, duplicar, historial de cambios, comentarios, adjuntos, imprimir o PDF, enviar por WhatsApp, buscador global, el «⋯» de acciones, funcionar sin conexión, sincronizar por id (sin pisarse), los tres idiomas, el aviso de cambios sin guardar y la norma móvil (lo denso se pliega).

### Por qué esto hace fluido el trabajo del hostelero
Abre la app y en «Hoy» ve **qué toca, por qué, cuánto cuesta, quién lo hace y cómo va**. Cada tarea le lleva a la pantalla donde se hace, sus cifras se mueven solas y el coach se entera sin que nadie llame. Nada se apunta dos veces.

---

## Añadido sobre la marcha

(Se rellena al construir: cada mejora aplicada que no estaba en el plan.)
