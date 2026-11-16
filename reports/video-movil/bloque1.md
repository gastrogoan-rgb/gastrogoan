# Bloque 1 · tramos t001–t028 (00:00–04:40)

### Tramo 1 (00:00–00:10) · Escritorio del móvil y apertura de Chrome
- No se ve la app: escritorio de Android, Chrome arrancando y la página de nueva pestaña (accesos «Kit de Ge…», «gastrogo…»).

### Tramo 2 (00:10–00:20) · Carga de la app y pantalla de acceso
- 👍 Pantalla de carga limpia (logo, «Cargando tu kit…», barra de progreso) y entrada a los ~5 s.
- ❌ A los 2-3 s de ver la entrada aparece la barra «Hay una versión nueva de GastroGoan (15/11/2026 03:52)» y TAPA la frase del día y el autor. La norma dice que si la app se acaba de abrir sin tocar nada se actualiza sola: aquí ya se está actualizando («Actualizando…») pero se enseña la barra igualmente, con un «Más tarde» que no tiene sentido en ese estado → ✅ si la actualización es automática (arranque sin interacción), no pintar la barra: como mucho un aviso discreto de 1 línea («Actualizando…») o directamente la recarga. Reservar la barra con dos botones para cuando hay trabajo a medias.
- ❌ Botón «Actualizando…» deshabilitado: texto crema claro sobre beige, contraste muy flojo (parece roto, no «en curso») → ✅ estado de carga con contraste ≥4,5:1 y un indicador de progreso (spinner/puntos) en vez de bajar la opacidad.
- ❌ La barra de aviso usa un ocre/mostaza que no es de la paleta (tinta/oliva/crema) → ✅ usar tinta con texto crema o crema con filete oliva, como el resto de avisos.
- ❌ El título del botón principal «Acceso Propietarios» parte en dos líneas y su subtítulo también («Panel completo del / negocio» con «negocio» huérfano), mientras «Acceso Empleados» va en una: las dos tarjetas quedan de alto distinto → ✅ reducir el hueco reservado a la flecha/icono o permitir que el título use todo el ancho; o fijar `text-wrap:balance` en subtítulos para evitar la palabra huérfana.
- 👍 Logo, selector de idioma «ES» y frase del día con autor se ven bien a este ancho.

### Tramo 3 (00:20–00:30) · Recarga por actualización y formulario de propietario
- ❌ La actualización obliga a pasar OTRA VEZ por la pantalla de carga (~5 s, de 00:21 a 00:26): en total el usuario ve dos cargas y la entrada «parpadea» entre medias → ✅ comprobar `version.json` ANTES de pintar la entrada (o durante el splash) y, si hay versión nueva sin interacción, recargar desde el propio splash: una sola carga visible.
- ❌ En la pantalla de carga (00:22) aparece un rectángulo negro suelto abajo en el centro (≈50×30 px), sin texto: parece un aviso (toast) vacío o un resto de la barra de actualización → ✅ no pintar el toast si no tiene texto / ocultarlo durante el splash.
- 👍 Formulario «Acceso Propietarios»: usuario recordado («gastrogoan»), etiquetas en mono, campos altos y botón «Desbloquear» a todo el ancho. Bien.
- ❌ La flecha «volver» (arriba a la derecha de la tarjeta) es un icono suelto pequeño, parece < 44 px de toque, y va a la DERECHA, donde nadie busca «atrás» → ✅ zona de toque de 44×44 y a la izquierda del título (o «‹ Volver» con texto).
- ❌ Botón principal «Desbloquear» en negro puro, mientras en la entrada el principal era oliva → ✅ coherencia: el botón principal de las pantallas de acceso en el mismo color (tinta que pasa a oliva, o oliva).
- Nota: el texto del usuario va centrado en el campo y el del PIN también; correcto pero distinto del resto de campos de la app (alineados a la izquierda). Menor.

### Tramo 4 (00:30–00:40) · PIN, selector de negocios e Inicio
- 👍 Al teclear el PIN la tarjeta sube y el campo y «Desbloquear» quedan por encima del teclado. Bien.
- ❌❌ **GRAVE · Selector de negocios: el nombre «PruebasGastroGoanApp» se parte LETRA A LETRA** en una columna de ~40 px («Pru / eb / as / Ga / str / oG / oa / nA / pp», 9 renglones). Es justo lo que prohíbe la norma («una palabra nunca se parte»). Causa: la fila es flex con icono + nombre + chip «ACTUAL» + papelera; el nombre tiene `min-width:0` (o `overflow-wrap:anywhere`/`word-break:break-all`) y el chip y la papelera no encogen, así que el nombre se queda con el resto mínimo → ✅ en la fila del negocio: nombre con `flex:1 1 auto; min-width:8ch; overflow-wrap:break-word` (nunca `anywhere`/`break-all`), y en ≤430 px pasar «ACTUAL» debajo del nombre (o a la línea de metadatos) y la papelera al ⋯. Además, un nombre de una sola palabra larga debe recortarse con elipsis en 1-2 líneas, no partirse. Revisar cualquier otro sitio con `break-all`.
- ❌ La tarjeta del negocio se estira a ~310 px de alto por culpa de lo anterior, y empuja «Cambiar mi contraseña» fuera de la vista → se arregla con lo mismo.
- ❌ Botón «Nuevo independiente» en negro de relleno y «Comprar nueva licencia» con borde punteado: tres estilos de botón distintos seguidos; el principal no es el oliva → ✅ uno principal (oliva/tinta según norma) y el resto secundarios con el mismo estilo.
- ❌ Teclado del PIN: sale el teclado alfabético con la fila de números arriba; correcto si el PIN admite letras (6-12), pero conviene `autocomplete="current-password"` y no centrar los puntos (menor).
- 👍 Inicio: tres áreas grandes (Cocina blanco, Sala oliva, Gestión tinta), fecha a la izquierda y pregunta, sello de versión abajo. Se ve limpio y cabe sin scroll.
- ❌ Barra superior de Inicio: 8 controles (punto de nube, ES, Negocios, Actualizar, Ayuda, Campana con «2», Chat, Salir) apretados en ~440 px, iconos sin rótulo de ~32 px de caja; la campana lleva un borde rojo que la hace parecer un error → ✅ en ≤430 px agrupar Actualizar/Ayuda/Idioma/Salir en un único menú «⋯» y dejar a la vista solo Negocios, Campana y Chat con 44×44; el aviso de la campana basta con el globo «2».
- ❌ En el selector, la «X» de cerrar arriba a la derecha (00:35) es pequeña → 44×44.

### Tramo 5 (00:40–00:50) · Carpeta Cocina y Comandas Cocina (pestaña Cerradas)
- (00:40) Encima sale el «¿Guardar la contraseña?» de Chrome: es del navegador, no de la app. Pasa porque el formulario del PIN parece de contraseña; aceptable.
- 👍 Carpeta Cocina: lista de módulos con icono, título, descripción y flecha; legible y con buen tamaño de toque.
- ❌ El globo de la campana pasa de «2» (Inicio) a «7» al entrar en Cocina sin que haya pasado nada visible → coherencia: si el número depende del área, que se note; si no, que sea el mismo desde el primer pintado (calcularlo antes de pintar la cabecera).
- ❌ Comandas Cocina: la rejilla de 3×2 mezcla PESTAÑAS (Activas / Cerradas) con ACCIONES (Avisar a sala, Modo caos, Marcar agotado, Deshacer) con el mismo aspecto: no se sabe qué es filtro y qué hace algo → ✅ pestañas en su propia fila (segmentado Activas|Cerradas) y acciones aparte (o en un ⋯).
- ❌ «Avisar a sala» y «Marcar agotado» se SALEN de su caja (el texto en mono toca/rebasa el borde: la «A» de «Avisar» y la «o» final de «agotado» pegadas al filete) → ✅ las celdas de esa botonera deben dejar envolver el texto (`white-space:normal`, `text-wrap:balance`) o usar letra proporcional; nunca `nowrap` en botones de rejilla en móvil. Revisar la causa general: botones en mono MAYÚS/espaciado con ancho fijo.
- ❌ «hace 680 min» → ✅ formato humano a partir de 60 min: «hace 11 h 20 min» (y en Cerradas, mejor la hora de cierre).
- ❌ La tarjeta de la mesa no ocupa todo el ancho (deja ~70 px vacíos a la derecha) y tiene un gran hueco blanco bajo «Entregado» (tarjeta estirada) → ✅ en móvil, tarjetas de comanda a ancho completo y alto según contenido.
- ❌ Cabecera: en Comandas el enlace es «← VOLVER» y en la carpeta «← INICIO»; mismo control, dos textos → ✅ unificar (nombre del destino: «← Cocina»).
- 👍 «Prueba» tachado y «Entregado» con icono: el estado se entiende.

### Tramo 6 (00:50–01:00) · TPV, «Abrir mesa» y comanda de la Mesa 5
- ❌ El globo de la campana vuelve a cambiar (7 → 5) al pasar a Sala: el usuario no sabe qué significa el número (ver tramo 5).
- 👍 Botonera del TPV en rejilla de 3 columnas (Cartas 4 · Espera · Caja / Anulaciones · Agotado · Arqueos) y filtros con su cuenta: ordenado y con buen toque.
- ❌ «Barra» ocupa una fila entera sola (zona sola en su fila, todo el ancho para un chip) → espacio muerto; ✅ las zonas en la misma fila que «Mías», envolviendo (flex-wrap), sin forzar una fila por chip.
- ❌ Las zonas salen como «Interior» y «exterior» (mayúscula/minúscula): es dato del negocio, pero la app podría capitalizar la primera letra al pintar.
- ❌ Fichas de mesa (abajo, 00:50): «Mesa 1» se parte en «Mesa / 1» y el número queda cortado por el borde inferior; el cronómetro marca «3703'» y «8652'» (61 h y 144 h) → ✅ (1) el nombre de la mesa no debe compartir fila con el reloj en dos columnas de 210 px: nombre arriba, reloj debajo; (2) a partir de 60 min mostrar «1 h 05», y a partir de unas horas (p. ej. >12 h) avisar «abierta desde ayer» en vez de minutos: una mesa con 61 h es una mesa olvidada y debería salir como aviso.
- ❌ «Abrir mesa»: las opciones «CLIENTE DE PASO / TIENE RESERVA» en mono gris claro sobre blanco, contraste flojo, y el círculo de la opción no elegida casi invisible; mucho aire entre las dos (≈100 px) → ✅ texto en tinta, radios con borde visible (#716C65 mínimo) y opciones como dos botones segmentados juntos.
- ❌ El texto de ayuda «Si coincide con un cliente ya dado de alta…» es pequeño (~11-12 px) y gris claro. Menor.
- 👍 Botones Cancelar / Abrir mesa al pie, de buen tamaño.
- ❌❌ **GRAVE · Cabecera de la comanda (00:55-00:57): «Mesa 5 · 2 pers.» se aplasta en una columna estrecha («Mesa / 5 / 2 / pers.») y los botones «Cambiar de mesa», «Liberar mesa» y la X de cerrar se SOLAPAN entre sí** (el icono de Liberar pisa la «a» de «mesa», la X pisa «Liberar mesa») → ✅ en ≤430 px la cabecera en dos filas: fila 1 = «Mesa 5 · 2 pers.» + X; fila 2 = «Cambiar de mesa» y «Liberar mesa» (o en ⋯). Revisar la causa: botones `white-space:nowrap` en una fila flex sin `flex-wrap`. La prueba `sala-cabecera-mesa.mjs` debería medir solapes a 360-430 px.
- ❌ «Tomar nota» / «Pedido 0,00 €» y «CARTA PRINCIPAL» no llegan al borde derecho: quedan huecos de 20-170 px (la pestaña de carta deja media fila vacía) → espacio muerto; ✅ pestañas a ancho completo (grid de N columnas) o la carta junto a otra acción.
- ❌ Una barra gris gruesa suelta entre «PROPIETARIO/ALÉRGENOS» y «CARTA PRINCIPAL» sin función aparente (parece un separador o barra de progreso huérfana). Comprobar qué es.
- ❌ «Cobrar 0,00 €» desactivado en gris muy claro: contraste flojo y una franja de ~110 px sólo para un botón inactivo → ✅ con 0 € ocultarlo o mostrarlo compacto; contraste mínimo 3:1 incluso desactivado.
- 👍 Fichas de carpeta «Bebidas · 6 productos» / «Cócteles · 7 productos» grandes y claras.

### Tramo 7 (01:00–01:10) · Comanda Mesa 5, carta (casi sin cambios)
- Los tres primeros fotogramas son idénticos (7 s sin cambios): el usuario parece buscar o dudar; en el último aparece la pestaña «BEBIDAS Y CÓCTELES» (oliva) sobre «CARTA PRINCIPAL».
- ❌❌ Se repite la cabecera rota del tramo 6: «Mesa / 5 / 2 / pers.» en columna de ~60 px y los botones «Cambiar de mesa», «Liberar mesa» y X solapados → ✅ ver tramo 6 (dos filas, sin nowrap).
- ❌ Las pestañas de carta («BEBIDAS Y CÓCTELES», «CARTA PRINCIPAL», «Menú del día», «Plato único») se apilan cada una en su fila a ancho parcial, dejando ~40 % vacío a la derecha y ocupando ~250 px antes de ver un solo plato → ✅ en móvil, selector de carta como desplegable de una línea o chips que envuelven; así la carta de platos sube y se ve más.
- ❌ El scroll de la zona de carta es interno y muy corto (la ventana útil son ~450 px entre cabecera y «Cobrar»); con la cabecera de 3 filas + pestañas + buscador, los platos quedan en la mitad inferior → ✅ compactar el cabecero (norma: «cabeceras que ocupan media pantalla»).
- ❌ Barra oliva gruesa sobre «CARTA PRINCIPAL» (se vuelve a ver) sin significado: si es indicador de pestaña activa, está desalineada (ancho ≠ pestaña).
- ❌ «Cobrar 0,00 €» sigue ocupando una franja fija de ~110 px con el botón casi invisible.

### Tramo 8 (01:10–01:20) · Añadir un plato, «Enviando…» y vuelta al mapa de mesas
- 👍 Al añadir un plato: la cabecera pasa a «Mesa 5 / 2 pers.» en limpio y el botón «Pedido 1 · 11,00 €» y «Cobrar 11,00 €» se activan. Es decir, la cabecera rota de los tramos 6-7 sólo ocurre con el pedido VACÍO → es un fallo de ese estado (aparece «Liberar mesa», que ahí ocupa sitio y rompe la fila). ✅ Reservar sitio a «Liberar mesa» sin romper la fila: dos filas siempre.
- ❌ Las pestañas de carta se mueven y se redibujan en 3 s (00:10 «CARTA PRINCIPAL» verde con texto cortado por arriba; 00:12 desaparece; 00:15 sólo queda la barra oliva): la pestaña activa se pinta con el texto recortado por la mitad en un fotograma → parpadeo/salto de layout al cambiar de carta. ✅ Altura fija para la tira de pestañas y sin animar su alto.
- ❌ La barra oliva gruesa sobre las pestañas reaparece (00:12, 00:15) ya sin pestaña debajo: parece un resto. ✅ Quitarla o convertirla en el subrayado de la pestaña activa.
- ❌ Una sola carpeta («PLATO DE PRUEBA · 1 producto») ocupa media fila y la otra mitad queda vacía (tarjeta no ocupa el ancho) → espacio muerto; con una sola carpeta, ancho completo.
- ❌ El título de la carpeta «PLATO DE PRUEBA» parte en dos líneas dentro de la ficha (2 palabras, 2 renglones, OK) pero el icono es un tenedor y cuchillo cruzados con trazo gris claro: contraste flojo.
- ❌ Línea del plato: «Prueba» con precio y el «ⓘ» en una columna propia de ~80 px; el «×1» y el «−» se apilan en la esquina; las dos acciones («−» y «i») son cajas de unos 40 px → ✅ 44×44 y la cantidad con «− 1 +» visible (no hay «+» en la fila: para añadir otro hay que tocar la tarjeta, no es descubrible).
- ❌ «ENVIANDO…» (chip) aparece sin que se haya pulsado nada visible y sin saber qué envía; mono muy claro. ✅ Texto de estado con contraste y que diga «Enviando a cocina…».
- ❌ «Secciones» (botón de volver) a mitad de pantalla bajo el buscador; el «← Secciones» es el mismo patrón que «← Volver» y «← Inicio» (3 textos distintos de «atrás» ya vistos).
- Fotograma 4: mapa de mesas. ❌ La fila superior de fichas aparece CORTADA arriba (scroll a medias, sin nombre: «1», «2 Propietario»): normal al hacer scroll, pero las fichas son muy altas (~170-230 px) con mucho hueco interno (Mesa 6 libre: 230 px de alto para «LIBRE / 4 pers.») → tarjetas estiradas a la altura de la vecina (norma de espacios muertos) ✅ altura según contenido (`align-items:start`) o, las libres, compactas.
- ❌ Cronómetros «1657'» y «681'» (27 h y 11 h) en mono pequeño en la esquina: ilegible como tiempo (ver tramo 6).
- ❌ «Mesa 3» y «Mesa 4» parten en dos renglones («Mesa / 3») porque el reloj comparte fila → ✅ reloj debajo del nombre.
- ❌ Chips «Propietario» con una «P» negra: el icono es un cuadrado negro (negro donde manda el oliva; ver norma «lo elegido en verde»). Menor, pero repetido en cada ficha.
- 👍 Estados por color de barra izquierda (oliva, ámbar, sin barra) y texto (TOMANDO NOTA, SERVIDO, MARCHADO, LIBRE).

### Tramo 9 (01:20–01:30) · Comandas Cocina (Activas) con el pedido recién enviado
- ❌ Transición carpeta Cocina → Comandas: la carpeta se pinta a medio desvanecer (items con opacidad creciente) mientras ya entra la pantalla nueva; la tarjeta de la comanda aparece desplazada (sube de abajo) → la ficha «Mesa 5» llega con el encabezado cortado (00:22 y 00:25 sólo se ve «SALA · 2 PERS.») hasta que termina de asentarse a los ~7 s. ✅ Acortar o quitar la animación de entrada en vistas operativas; que la comanda no «viaje» más de 1 s.
- ❌ Se repite la botonera de 6 botones con pestañas y acciones mezcladas (ver tramo 5); «Avisar a sala» y «Marcar agotado» tocan los bordes de su caja → ✅ envolver texto/grid de 2 columnas.
- ❌ La tarjeta de comanda ocupa ~380 de 440 px de ancho (queda un margen derecho de ~60 px que no cuadra con la botonera, que sí llega al borde) → ✅ ancho completo y alineado con la botonera.
- ❌ Dentro de la ficha: «ESPERANDO» y «0'» arriba a la derecha pequeños; el bloque «PLATO DE PRUEBA » NUEVO» es un botón (norma de Comandas: el nombre del bloque avanza) pero parece una etiqueta: el «»» de avance es un icono diminuto de unos 16 px → ✅ rótulo explícito («Empezar») o el bloque entero como botón de 44 px con acción visible.
- ❌ «Incidencia» y «Deshacer» en dos filas separadas, cada una sola con todo el ancho libre (espacio muerto); «Deshacer» además desalineado a la derecha y en gris muy claro → ✅ una sola fila con las dos acciones.
- ❌ Doble scroll: la ficha tiene su propia barra de scroll lateral interna (00:22-00:25) además del scroll de la página → ✅ la tarjeta no debe tener scroll propio; que crezca.
- ❌ Un punto naranja (estado) y la raya ámbar a la izquierda, más la etiqueta «NUEVO» amarilla: ámbar/ocre + oliva + negro en una sola ficha; demasiados colores para decir una sola cosa.
- ❌ La campana pasa de 4 a 6 en 3 s (por el pedido enviado). Coherente, pero sin pausa; fine.

### Tramo 10 (01:30–01:40) · Comandas: avance de estado, pestaña Cerradas y ventana «Avisar a sala»
(Con hoja extra de 01:37–01:40 para la ventana.)
- 👍 El avance de la comanda se ve claro: «EN PREPARACIÓN» → «LISTO EN EL PASE» → «Todo listo en el pase», con el plato tachado y una barra verde.
- ❌ «LISTO EN EL PASE · RECOGI…» (00:32) se CORTA por la derecha dentro de su caja (el texto «RECOGIDO» queda recortado y la caja se sale de la tarjeta) → ✅ el chip debe envolver o abreviar; nada de `nowrap` con mono mayúsculas en tarjetas de ~330 px.
- ❌ La tarjeta de comanda sigue sin ocupar todo el ancho (~385 de 440 px) y tiene su propio scroll lateral/vertical interno (barra gris a la derecha) → ✅ ancho completo, sin scroll interno.
- ❌ Estado vacío de «Cerradas» (00:35): icono de campana muy claro y texto «No hay comandas pendientes. Cuando sala marche un pedido aparecerá aquí al instante.» — mensaje de Activas en la pestaña Cerradas (dice «pendientes», pero estamos en Cerradas) → ✅ texto propio: «Aún no hay comandas cerradas hoy». Y a esta hora (01:35) la pestaña mostraba vacío cuando 5 s después sí hay una cerrada (Mesa 5 «Entregado»): el estado vacío se pintó antes de cargar → parpadeo de vacío falso; ✅ no pintar el vacío hasta tener datos.
- ❌ Después de 01:37, en la pestaña Cerradas la comanda muestra «ahora» y «Entregado» pero la tarjeta sigue con el alto de la de Activas (hueco blanco de ~120 px debajo) → tarjeta estirada.
- Ventana «Avisar a sala» (01:38–01:40, hoja extra):
  - 👍 Cabe entera, título con X, 4 avisos rápidos como filas de ancho completo con icono, campo libre y Cerrar/Enviar al pie. Es un buen patrón.
  - ❌ La ventana se abre como PANTALLA COMPLETA, no como hoja/modal: la cabecera de la app (campana, ES…) se ve difuminada a través durante la animación, y hay unos 2 fotogramas con DOS pantallas superpuestas (texto fantasma de la lista y de la ventana encima de «Comandas Cocina»). Efecto de transición con cross-fade que se lee como fallo → ✅ entrada con un solo desplazamiento (hoja desde abajo) o fundido corto sin mostrar el contenido anterior.
  - ❌ El primer texto de la ventana está cortado por arriba («Llega a todo el equipo de sala como aviso» pierde la primera línea) cuando hay scroll interno: el cuerpo desplaza el texto bajo la cabecera → ✅ cuerpo con scroll sólo si hace falta y que empiece en 0.
  - ❌ Botones «Cerrar» y «Enviar»: «Enviar» en oliva ya activo con el campo vacío (no debería enviar nada) → desactivarlo hasta elegir un aviso.
  - ❌ Textos de ejemplo mal escritos para producto: «id más despacio» (imperativo vosotros, mezcla de tuteo con «Marcar agotado») — son frases de cocina; correcto por contexto, pero «mirad Marcar agotado» mezcla mayúscula en medio de la frase. Menor.

### Tramo 11 (01:40–01:50) · Cerradas con scroll horizontal, «Modo caos» y «Marcar plato agotado»
- ❌❌ **Scroll HORIZONTAL de tarjetas en Cerradas**: las comandas cerradas se pintan en fila (carrusel) y la de al lado asoma por la derecha cortada («M…», «Mesa 4» a medio ver, «Entreg…» cortado, y barra de desplazamiento gris abajo). La norma dice «nada cortado, sin scroll horizontal»; el usuario no sabe que hay más → ✅ en ≤430 px, una columna a ancho completo (grid `1fr`), nunca `overflow-x:auto` para tarjetas de contenido.
- ❌ En el fotograma 2 (01:42) la lista se desplaza con inercia y el nombre «Mesa 5» se ve cortado por la mitad por la barra lateral gris («M sa 5», «PRC ETARIO»): una barra de desplazamiento VERTICAL de ~15 px de ancho se dibuja SOBRE el contenido, tapando letras → ✅ scrollbar fino/overlay o `scrollbar-gutter:stable` para que no pise el texto.
- ❌ «Modo caos» se activa (verde) pero no se ve ningún cambio en la pantalla durante 5 s, o sólo los tickets Cerrados se mueven; el usuario no recibe respuesta visible a su toque → ✅ feedback inmediato (la vista cambia o aparece un aviso «Modo caos activado»), o dejar desactivado el botón si no hay comandas activas.
- ❌ Seguimos con la tarjeta estirada: debajo de «Entregado» hay ~150 px de blanco (altura igualada con la tarjeta vecina) → ✅ `align-items:start`.
- Ventana «Marcar plato agotado» (01:45):
  - 👍 Lista de cartas y menús con icono, nombre, nº de platos y «1 agotado» en rojo oscuro: informativa, filas altas, con flecha; Cerrar al pie. Bien resuelta.
  - ❌ Mucho aire vacío entre el título y «CARTAS» (≈80 px) y la ventana ocupa casi toda la pantalla (cabecera de la app desaparece) → ✅ reducir el padding superior.
  - ❌ Mezcla de capitalización en los nombres: «CARTA PRINCIPAL», «CARTA GG BURGER», «MENÚ GG» en MAYÚSCULAS y «Menú del día», «Plato único» en normal. Son datos del negocio, pero la app podría uniformar el estilo al pintarlos (p. ej. `text-transform:none`).
  - ❌ El icono de «agotado» en el título (tenedor tachado) es un trazo muy fino, casi ilegible a 20 px. Menor.
  - ❌ Los iconos de cada fila son iguales para cartas (hoja) y menús (lista) pero con trazo muy claro (#BBB): contraste < 3:1.

### Tramo 12 (01:50–02:00) · Oferta Gastronómica: lista de cartas y editor de «CARTA PRINCIPAL»
- (Se pasa de Comandas a Oferta sin que se vea el cambio en el vídeo; el primer fotograma ya está en Oferta, a mitad de scroll.)
- ❌ Primer fotograma (01:50): la pantalla está a mitad de transición/repintado: la fila de días de «CARTA GG BURGER» muestra texto SUPERPUESTO y corrupto («22-304-27:04-22…04-6:04-9:04-10:55») sobre «LUN MAR MIÉ…», y «…» suelto a la izquierda. Es un repintado a medias (dos versiones del texto superpuestas) → ✅ no repintar la lista mientras entra el scroll/animación, o pintar de una vez (sin animar opacidad de hijos).
- ❌ La tarjeta de la carta tiene siete columnas de días («LUN MAR MIÉ JUE VIE SÁB DOM» con «Todo» debajo) en letra ≈11 px y color muy claro, apretadas en 410 px; con «Todo» repetido siete veces no dice nada → ✅ si todos los días son «Todo el día», una línea «Todos los días»; sólo desglosar si difieren.
- ❌ En la lista, «ACTIVA EN TPV» es una caja de borde fino en mono: se lee como botón. Y los puntos «…» (⋯) quedan solos en una fila vacía de la tarjeta (espacio muerto de ~100 px) → ✅ subir el ⋯ a la fila del título (norma de espacios muertos: «sube la acción a una fila que ya existe»).
- 👍 Franja de cifras «CARTAS 1 · TOTAL PLATOS 7» y la lista de cartas son claras.
- ❌ «+ Nueva carta» queda cortado arriba al hacer scroll (botón bajo la cabecera); no es un fallo, pero no hay cabecera fija: al bajar se pierden título y acciones → considerar barra superior pegajosa sólo con el título de pantalla.
- Editor de carta (01:52):
  - 👍 El nombre de la carta es un campo ancho y «Guardar» queda debajo, «Nueva sección» con buscador: orden razonable.
  - ❌ «Guardar» ocupa una fila sola con el 70 % del ancho vacío a su derecha → ✅ subirlo a la fila del nombre (como pide la norma: «el campo importante crece y ocupa el hueco») o ponerlo en la cabecera.
  - ❌ «← Cartas» (volver) pequeño, texto en mono ~13 px, tocando el borde superior sin aire.
  - ❌ «DÍAS Y HORARIO EN QUE ESTÁ ACTIVA ESTA CARTA» ocupa 3 renglones en mayúsculas con espaciado (≈ 40 caracteres): ilegible y largo → ✅ título corto («Días y horario») y el resto como ayuda.
  - ❌ Cada sección tiene una cabecera de ~250 px: nombre («PLATO DE PRUEBA» en 2 renglones y «PRINCIPALES» en mayúsculas), icono, dos flechas ⌃⌄ (subir/bajar), «1 platos», «Plato manual» y «Escandallo» y «⋯» en TRES filas separadas, cada una con huecos a la derecha → ✅ una fila con título + ⋯ y una sola fila de acciones; subir/bajar sólo en el ⋯ o con arrastre.
  - ❌ «1 platos» (error de concordancia; debería ser «1 plato») → ✅ plural por cantidad en los tres idiomas.
  - ❌ En la cabecera de «PRINCIPALES» el texto «1 platos · 1 agotado» se parte («1 / agotado» en la línea siguiente) y el subrayado punteado del precio «11,00 €» y de «24,20 €» parece enlace roto (subrayado de puntos en cada precio) → ✅ sin subrayado salvo que sea editable, y que se sepa.
  - ❌ Estado «AGOTADO» del Salmón: nombre tachado + chip rojo claro «AGOTADO» sobre fondo rosa muy suave: contraste flojo (~2,5:1).
  - ❌ En 01:55–01:57 el scroll y el fondo gris de la sección se «lavan» (los textos «1 platos» arriba salen difuminados): es un velo de scroll (mask) demasiado fuerte que tapa información.

### Tramo 13 (02:00–02:10) · Oferta: «Importar del Escandallo», plato importado y menú ⋯
- Ventana «Importar del Escandallo»:
  - 👍 Cabe entera como hoja desde abajo, buscador, «← Categoría», casillas de ~36 px, «Cancelar / Importar (1)» con el contador. Funciona.
  - ❌ La hoja sube sólo hasta la mitad y deja arriba un fondo oscuro con la pantalla de atrás (correcto), pero entre el título y el buscador hay ≈70 px de aire y entre las filas y los botones otros ≈70 → el listado, que es lo importante, ve sólo 2 filas → ✅ compactar el padding vertical y dar a la lista el resto de altura.
  - ❌ Las casillas («SELECCIONAR TODO», fila del plato) miden unos 36×36 px y la zona de toque parece ser sólo el recuadro; el nombre del plato envuelve en 2 líneas con el precio alineado a la derecha: la fila entera debe ser el área de toque (≥44 px). En el vídeo se pulsó la casilla.
  - ❌ «Tapas» (el nombre de la categoría) queda a la derecha de «← Categoría» como un título suelto pegado: se lee como botón doble → ✅ migas «Categorías › Tapas».
  - ❌ «Importar» está activo en gris-oliva con 0 seleccionados (frame 1) → ✅ deshabilitado y con otro aspecto.
- ❌ Aviso negro «1 plato importado» (02:05) aparece EN MEDIO de la pantalla, tapando el texto de los botones «Disponible» y «Sin límite» (se leen «Dispo… mite»): el toast va a mitad de pantalla sobre contenido, no abajo → ✅ abajo, sobre la barra del sistema y con el área segura, y sin tapar los controles. La norma (13/11) dice que debe ir a `--vvb + 24px`; aquí se ve centrado verticalmente (≈ a 63 % de alto) → revisar.
- ❌ Fila de plato expandida («Patatas GG con salsa de la casa»): nombre en 2 renglones, precio y chevron a la derecha, chip «9 % FC» (food cost) en caja gris; luego fila «⌃ ⌄» (subir/bajar) con dos botones de ~44 px que dejan todo el ancho vacío, luego «Disponible», «Sin límite», «Extras y opciones», «⋯» → 4 filas de controles ≈ 330 px por plato. En lugar de lo plegable que pide la norma («nombre y precio, el resto cuelga de un toque»), aquí se despliega TODO. ✅ Agrupar: «Disponible / Sin límite» como un único conmutador de estado y mover subir/bajar al ⋯.
- ❌ «⌃ ⌄» (subir/bajar): el «⌄» está en gris muy claro (deshabilitado, porque es el último), sin explicar; y no se sabe qué orden afecta.
- ❌ El «⋯» del plato no tiene nombre accesible; al abrirse el menú sale «Editar / Eliminar» con iconos, filas de ~64 px: bien dimensionado, 👍. Pero el menú flota sobre el contenido con sombra y NO se cierra con el scroll visible (comprobar).
- ❌ Precio con subrayado de puntos (editable) sigue sin parecer un campo; el lápiz junto al nombre es un icono de ~14 px, sin zona de toque clara.

### Tramo 14 (02:10–02:20) · Oferta: guardar carta, lista de cartas y menús, vuelta a la carpeta Cocina
- ❌ Aviso negro «Carta guardada» (02:12) otra vez en MITAD de pantalla y tapando contenido («Todo» de la fila de días, «JUE», «VIE»…): el toast no está anclado abajo → ✅ anclarlo abajo (sobre la barra del sistema, `--vvb + 24px`) y que no tape los controles.
- ❌ Al guardar, el editor se cierra y vuelve a la lista sin transición ni scroll a la carta guardada; el usuario pierde el sitio donde estaba (de la mitad de una sección larga pasa al principio) → ✅ al volver, recolocar en la tarjeta recién guardada.
- ❌ Lista de Oferta: la cabecera con subtítulo «Gestiona tus cartas y menús · Vincula con Escandallo» envuelve en 2 renglones con la palabra «Escandallo» sola en el segundo (palabra huérfana). Y el selector «Carta | Menús» y «+ Nueva Carta» van en dos filas separadas con huecos a la derecha → ✅ juntarlos en una (norma: «el Nueva carta a la fila de las pestañas»; esa norma está hecha en PC, no en móvil).
- ❌ «Nueva Carta» con N mayúscula (inconsistente con «Nueva sección» en otro sitio).
- 👍 La franja de cifras «CARTAS 2 · TOTAL PLATOS 19» y «MENÚS 3 · TOTAL GRUPOS 7» es clara.
- ❌ Fila de días otra vez como siete cajitas con «Todo» ×7 (≈ 70 px de alto, letra ≈ 11 px, gris): ver tramo 12. En las dos tarjetas de menús es lo que más sitio ocupa.
- ❌ En la tarjeta de «Menú del día»: «⋯» solo en una fila vacía, debajo de «Disponible» y «Sin límite» → espacio muerto; ✅ subir el ⋯ a la fila del título.
- ❌ «3 grupos» / «1 grupos»: error de concordancia («1 grupo»).
- ❌ «ACTIVO EN TPV» como caja con borde junto al título: se lee como botón pulsable. ✅ un punto verde + «En TPV» como texto, sin caja.
- 👍 Los menús (Menú del día 11,00 €, Plato único 12,10 €) enseñan el precio y los grupos: informativo.
- (02:17) Vuelta a la carpeta Cocina (se hace scroll arriba en vertical): la lista aparece con el scroll a mitad y el primer módulo cortado («Comandas Cocina» sin cabecera); sin cabecera de carpeta visible → ✅ al navegar «atrás» restaurar el scroll a la posición guardada o a 0, pero no a mitad de camino.
- ❌ En la lista de la carpeta Cocina, los textos de descripción («Pantalla en tiempo real de pedidos», «Menú por horarios»…) y los iconos tienen un contraste visiblemente bajo en algunos fotogramas (el velo de la animación de entrada: opacidad parcial) → misma causa que en el tramo 9: animación de entrada de lista.

### Tramo 15 (02:20–02:30) · I+D (menú de creación), carpeta Cocina y Proveedores
- (02:20) I+D: cuatro opciones («Nueva elaboración base», «Nuevo plato», «Nuevo menú», «Nueva carta») con icono, título, descripción y flecha. Fotograma en plena transición: texto de las descripciones con efecto fantasma/desenfoque (doble imagen) → misma animación de entrada que causa texto borroso 0,5-1 s.
- ❌ «Nueva elaboración base»: el título parte en 2 renglones y la descripción en 4 («Un fondo, una salsa madre, una crema… lo que tienes hecho de antemano»): el icono + flecha comen el ancho (≈ 250 px de texto útil de 440) → ✅ icono más pequeño o encima del título en móvil, y descripción de 1-2 renglones.
- ❌ Contraste de las descripciones: gris claro sobre crema/blanco (≈ 3,4:1 en este tramo) a ~14 px → comprobar con `--muted` (norma: ≥ 4,5:1).
- ❌ Al volver a la carpeta Cocina (02:22) la lista entra con un fundido MUY lento (I+D casi invisible a 02:22): sensación de lentitud/parpadeo → ✅ sin fundido o ≤ 150 ms.
- Proveedores (02:25–02:28):
  - 👍 La lista es de una columna, con nombre grande, «ⓘ» y «⋯» a la derecha (cada uno en caja de ~58×44 px): objetivos de toque bien. Filtros «Todos (13)», «Cereales y Panadería 1», «Especias 1», «Sin tipo 11» envuelven en filas: correcto según norma.
  - ❌ Los filtros envuelven pero los chips son de ancho muy distinto y dejan huecos irregulares; «Todos (13)» queda cortado por arriba en el scroll (cabecera de pantalla perdida: no se ve el título de la pantalla ni el volver) → ✅ cabecera de pantalla con «← Cocina» sticky.
  - ❌ Los 11 proveedores «Sin tipo» no muestran etiqueta de tipo y el resto sí (chip «ESPECIAS» bajo el nombre): filas con alturas distintas (≈ 85 vs 105 px) → ✅ reservar la línea o poner el tipo a la derecha del nombre.
  - ❌ Nombres de proveedor en minúsculas («makro», «masso», «alvilardan») frente a «Gros mercat»/«Cárnicas Vallès»: dato del usuario; la app podría capitalizar al pintar o avisar al guardar. Menor.
  - ❌ En 02:27 (último fotograma) los iconos «ⓘ» y «⋯» y los filtros salen con halo/ghosting (texto duplicado) por el scroll rápido: parpadeo de repintado.
  - ❌ El mismo icono de fábrica/almacén repetido en cada fila (no aporta) → puede quitarse y ganar ancho.

### Tramo 16 (02:30–02:40) · Ficha del proveedor «makro» y «Artículos de este proveedor»
- 👍 Ficha del proveedor: etiquetas en mono sobre valor en sans, teléfono y email como enlaces, WhatsApp visible; Cerrar / Editar al pie. Se lee bien y cabe en una hoja con scroll.
- ❌ La ventana de la ficha ocupa la pantalla entera (incluida la franja de la cabecera de la app) mientras que la de «Artículos» deja ver la cabecera de la app atenuada por arriba: dos alturas de ventana distintas para el mismo flujo → ✅ una sola regla de altura de ventanas (hoja con 16 px arriba).
- ❌ Entre el nombre «makro» y el primer campo hay un salto grande, y «juanjo» (nombre del contacto) aparece sin etiqueta («Contacto») → ✅ etiqueta «CONTACTO» como el resto.
- ❌ «Calle sin numero, barcelona» (dato del cliente): sin acento ni capitalización, es de prueba; ignorable.
- ❌ El texto «Revisar productos en frío siempre» (Notas) y «Contado» sin icono distinto: correcto.
- ❌ IBAN vacío se muestra como «----» → ✅ «No indicado» en gris, o ocultar el campo.
- ❌ Etiquetas del mono «TELÉFONO», «EMAIL», «ENTREGA» en gris muy claro y ~12 px: contraste flojo (≈ 3:1) → comprobar con la regla de ≥ 4,5:1.
- Ventana «makro» (artículos): 
  - 👍 Tabla simple en 3 columnas (nombre, unidad, precio) con precios alineados a la derecha en mono: legible, sin scroll horizontal.
  - ❌ El título «makro» con icono de lista es igual que el de la ficha: no se sabe que es «Artículos de makro» → ✅ título «Artículos · makro».
  - ❌ Mucho aire (≈ 100 px) entre el título y la primera fila, y hueco antes de «Volver / Cerrar» → ver norma de aire útil: se lleva la mitad del espacio visible sin información.
  - ❌ «Volver» y «Cerrar» son dos botones casi idénticos juntos: el usuario no sabe cuál usar; «Volver» regresa a la ficha, «Cerrar» cierra todo → ✅ un solo botón «Volver» + la X.
  - ❌ Sin buscador ni orden en una lista que puede tener cientos de artículos (aquí 8).
- ❌ En el último fotograma se ve la ficha con «Artículos de este proveedor (8)» e «Historial de Pedidos (2)» como botones de ancho distinto (el segundo mide ~350 px y el primero ~440) y alineados a la izquierda → ✅ mismo ancho.

### Tramo 17 (02:40–02:50) · Historial de pedidos del proveedor, Proveedores (cabecera) y entrada a Mega Lista
- Ventana «makro · Historial de pedidos» (02:40):
  - ❌ El texto del resumen «2 pedidos · 628,60 € recibidos (con IVA)» parte con «IVA)» huérfano en una 2.ª línea; y en las filas de pedido el recuento «2 / artículos» se apila en 2 renglones pegados al importe «362,50 €» (el «artículos» roza el importe) → ✅ «2 artículos» en una línea o debajo de la fecha; el importe a la derecha.
  - ❌ Fecha en formato ISO «2026-11-11» y «2026-09-14» (la norma de impresos dice que una fecha se lee como fecha: «11 nov 2026») → ✅ `localeActual()` con día y mes en letra.
  - ❌ «(llegó 1)» en ámbar junto a «2 L»: la cantidad recibida se mezcla con la pedida en la misma línea con un color que no es de la paleta; y «Vinagre de manzana 200 L» (200 litros) aparece sin indicar si llegó → ✅ columnas «Pedido / Recibido».
  - ❌ Chip «RECIBIDO» con borde: es una etiqueta, no un botón, pero tiene aspecto de botón. Y el chevron «⌃/⌄» de 20 px es el único control para desplegar → ✅ toda la fila como área de toque (≥ 44 px).
  - ❌ «← Volver» y «Abrir en Pedidos» en dos botones desiguales, el segundo con icono de «salir» ambiguo.
- Ficha «makro» (02:42): 👍 más aire y mejor ordenada (ahora con «PERSONA DE CONTACTO» etiquetada: la etiqueta que faltaba en 02:30 → inconsistente, en el tramo 16 aparecía «juanjo» sin etiqueta).
- ❌ Esta ficha se abre en una hoja que ocupa casi toda la pantalla y se queda con la franja de la cabecera atenuada arriba (02:35) mientras en 02:42 la ficha cubre incluso la barra de la app: la altura de las ventanas varía entre aperturas.
- Pantalla Proveedores (02:45):
  - ❌ «Buscar prov…» (campo estrecho) y «+ Nuevo Proveedor» comparten fila: el campo queda en ~180 px y el placeholder «Buscar prov…» se CORTA («prov…» no es una palabra) → ✅ el buscador crece (`flex:1`) y «Nuevo» pasa a icono «+» de 44 px, o a la fila de abajo.
  - ❌ «Nuevo Proveedor» con P mayúscula (otros sitios «Nueva Carta»): criterio de mayúsculas inconsistente («Nueva sección» con minúscula).
  - 👍 «Todos (13)» en oliva y los chips envuelven.
- (02:47) Mega Lista (pantalla nueva) — fotograma con ghosting fuerte:
  - ❌ Los números «Sin precio 1682 · Sin IVA 1739 · Sin proveedor 1682» se ven DUPLICADOS/superpuestos (texto fantasma «POR REVISAR» debajo) por el repintado durante el scroll; es el mismo defecto de animación del tramo 15.
  - ❌ Aviso «por revisar»: tres cifras de más de 1.600 artículos cada una (casi todo el catálogo sin precio/IVA/proveedor) → el aviso, tan alto, enseña a ignorarlo: ✅ resumen único «1.739 productos por revisar» con un botón «Revisar».
  - ❌ En las carpetas (dos por fila) el título de «Aceites de Vilafranca del penedés» parte en 3 renglones y el contador «56 PRODUCTOS» + «POR REVISAR: 56» (más 2 líneas) hace las tarjetas altas (~200 px) → ✅ título a 2 líneas con elipsis, contador en una línea.
  - ❌ Subtítulo «POR REVISAR: 56» en gris muy claro (contraste mínimo) a ~11 px: al límite de la norma.

### Tramo 18 (02:50–03:00) · Mega Lista: carpeta «Aceites de Vilafranca del penedés» y ficha de ingrediente
- ❌ Cabecera de Mega Lista muy larga antes de ver ningún producto: dos desplegables a ancho completo («Todos los proveedores», «Ingrediente»), botón «+ Nuevo Ingrediente» solo en una fila, tres chips «Sin precio / Sin IVA / Sin proveedor» y «← Categorías» (≈ 650 px = más de 2/3 de la pantalla). Es la norma «cabeceras que ocupan media pantalla» → ✅ filtros plegados en un único botón «Filtros», «Nuevo» como «+» en la fila del buscador, y las tres cifras «por revisar» en una sola línea.
- ❌ «+ Nuevo Ingrediente» ocupa una fila entera con el 55 % vacío a la derecha (espacio muerto) → ✅ subirlo a la fila de los desplegables.
- ❌ Chips «Sin IVA 1739» y «Sin proveedor 1682» envuelven en distinta fila dejando huecos; las cifras en 3-4 dígitos son enormes para ser un filtro → ver tramo 17.
- ❌ Título «Aceites de Vilafranca del pendes» (en la carpeta: «penedés» sin tilde porque lo escribió el usuario; en la tarjeta: «penedés»). Dato del cliente; ignorar. Pero el título de la carpeta está en Schibsted 600 ≈ 28 px y el «1 PRODUCTO» en mono 11-12 px sin separación → jerarquía correcta.
- ❌ «IVA DE TODA LA CARPETA [10% ▾] [Aplicar]»: la etiqueta en mono mayúsculas ocupa 270 px y el desplegable y «Aplicar» se quedan en 3 elementos apretados en una fila; «Aplicar» es un botón sin relleno que no parece botón (borde fino, texto mono) → ✅ botón primario o secundario claro; y confirmar el efecto (afecta a todos los productos).
- Ficha de ingrediente (02:52–02:55):
  - ❌ La fila del producto muestra «Aceite de oliva virgen» partido en 2 renglones, debajo «Aceites de Vilafranca del pendes» en mono gris en 3 renglones (≈ 100 px de alto) y a la derecha «1 L × 6,20 €» y «6,2 €/L»: el nombre y la carpeta compiten por 230 px de ancho → ✅ no repetir el nombre de la carpeta dentro de la carpeta (ya se sabe), así la fila queda en 2 renglones.
  - ❌ Al desplegar («⌃»), el detalle trae «PROVEEDOR / Distribucions Camp» e «IVA [10% ▾]» en una tarjeta gris, y debajo un «⋯» solo en una fila (espacio muerto), con campos cortados por el borde derecho de la tarjeta (el desplegable «10%» llega al borde sin margen).
  - ❌ Dos fotogramas seguidos (02:52 y 02:55) muestran la misma tarjeta en estados distintos, con la carpeta y el aviso de Nuevo Ingrediente a medio scroll: la pantalla «salta» entre un fotograma y el siguiente (scroll rápido, no un defecto, pero el contenido desplaza 300 px de golpe).
  - ❌ Gris muy claro de las etiquetas en mono («PROVEEDOR», «IVA») sobre fondo gris de la tarjeta: contraste < 3:1.
- (02:57) Se vuelve a la lista de carpetas: 👍 tarjetas de 2 columnas con icono, nombre, nº de productos y «por revisar: N»; ❌ el ⋮ vertical de cada tarjeta es un icono de ~6 px de ancho (zona de toque minúscula) y distinto del «⋯» horizontal usado en el resto de la app → ✅ un único patrón «⋯» de 44×44.

### Tramo 19 (03:00–03:10) · Mega Lista: carpeta «Bebidas» y carpeta «Arroces»
- ❌ **Duplicados visibles**: «Agua mineral» aparece 4 veces seguidas, «Café en grano» 2 veces, «Arroz basmati» 3 veces y «Arroz bomba» 2, todos «Sin precio» y sin proveedor. Con 1.600+ productos «sin precio» y nombres repetidos, la lista no sirve para trabajar → ✅ aviso de duplicados (mismo nombre + misma unidad) con botón «Fusionar», y al menos mostrar la unidad/formato en la fila para distinguirlos.
- ❌ Las filas «sin precio» sólo dicen «Sin precio» en mono gris claro (≈ 3:1) a ~13 px: es la información que falta y no destaca; el nombre y la categoría («Bebidas», repetida en TODAS las filas de la carpeta «Bebidas», «Arroces» en todas las de «Arroces») ocupan una línea entera sin aportar → ✅ quitar la categoría dentro de su propia carpeta (ahorra 1/3 de alto por fila).
- ❌ Las filas miden ≈ 100 px de alto con sólo 2 datos: hay mucho aire interior; en una lista de 35-135 filas son 3.500-13.500 px de scroll → ✅ filas de ~64 px con nombre, unidad y precio en una línea.
- ❌ La fila de «Agua mineral 50 cl ■» lleva un cuadradito ámbar sin leyenda (¿IVA pendiente? ¿por revisar?) → ✅ chip con texto o icono con rótulo (`data-tip`).
- ❌ «Aplicar» (IVA de toda la carpeta): botón blanco con borde fino y texto mono, sin relleno; aparece sin explicación de si ya se aplicó (nada confirma). Y ocupa una fila sola (espacio muerto).
- ❌ Desplegable de la fila de «Arroz bomba» (03:07): el campo «IVA» muestra «Elige» en un cajetín ROSA/rojizo (obligatorio) a todo el ancho y «PROVEEDOR: Sin proveedor» como texto suelto en ámbar; y el «⋯» de la fila queda de nuevo SOLO en una fila (≈ 60 px de hueco) → ✅ juntar proveedor, IVA y ⋯ en 2 filas; el error de «Elige» en rojo con texto, no sólo con fondo rosa pálido.
- ❌ La ficha del ingrediente se abre dentro de la propia lista (acordeón) y empuja las filas de abajo; con el teclado/zoom puede perderse el sitio. Aceptable, pero sin scroll automático a la fila abierta: la fila abierta queda a medio pantalla.
- ❌ Un fotograma (03:05) está de vuelta en la lista de carpetas con scroll en medio (tarjetas Aceites/Arroces/Bebidas/Bodega/Carnes); la nube de rastro «Ingrediente» arriba cortada. Un cambio de carpeta puso el scroll a mitad en vez de arriba (la lista de carpetas debe abrir arriba).
- 👍 Los números de la franja «por revisar» sirven de acceso directo (en teoría); las filas de producto tienen su chevron de 44 px a la derecha, bien para tocar.

### Tramo 20 (03:10–03:20) · Mega Lista: menú ⋯, «Editar Ingrediente» con teclado, confirmación de duplicado
- 👍 Menú ⋯ de la fila: «Editar / Eliminar» con iconos y filas de ~64 px (cumple la norma de los tres puntos).
- ❌ El menú ⋯ se abre pegado y SOBRE la fila siguiente (tapa «Sin precio» de la fila de abajo; 03:10) y la fila desplegada deja el ⋯ en una fila sola → ver tramo 19.
- Ventana «Editar Ingrediente» (03:12):
  - ❌❌ **El teclado que sale en «Precio de compra (sin IVA)» y en «Cantidad por compra» es el QWERTY completo**, no el numérico → ✅ `inputmode="decimal"` (y `type="text"` con patrón si se quiere coma) en TODOS los campos de importe, cantidad, stock, PIN numérico, etc. Es una causa general: revisar los `<input type="number">` (en Android el teclado numérico sale, pero con `type=text` o sin inputmode no).
  - ❌ El teclado (≈ 330 px) tapa el campo «IVA» (queda a medio ver encima del teclado) y los botones Guardar/Cancelar del pie de la ventana desaparecen detrás del teclado. El campo enfocado sí queda visible (👍), pero la ventana no se reduce al área visible → ✅ ya existe `--vvh`/`--vvb`; comprobar que el pie con acciones sube sobre el teclado (sticky) o que aparece una acción «Hecho».
  - ❌ El valor «0» aparece como precio por defecto: el usuario tiene que borrarlo antes de escribir (el cursor queda DETRÁS del 0) → ✅ campo vacío con placeholder «0,00» o seleccionar todo al enfocar.
  - ❌ «CÓMO LO COMPRAS» (cabecera de sección) + etiquetas en mono mayúsculas ≈ 12 px, grises: se leen a duras penas.
  - 👍 Campos a ancho completo, ≥ 16 px (no hay zoom), etiquetas encima.
- Confirmación «Ya existe un ingrediente con este nombre (Arroz bomba). ¿Guardar igualmente?» (03:15):
  - 👍 Aviso útil que evita duplicados, botones Cancelar/Confirmar al pie.
  - ❌ Pero se avisa DESPUÉS de rellenar todo y justo el nombre ya existe 3 veces en la lista (ver tramo 19): el sistema permite crear duplicados con sólo un «¿guardar igualmente?». ✅ ofrecer «Usar el existente» como acción principal.
  - ❌ La ventana de confirmación sube desde abajo con un hueco enorme sobre el título (≈ 40 px) y otro entre el texto y los botones; no cubre el ancho al 100 % (margen derecho de ~0).
- (03:17) Aviso negro «Ingrediente guardado» aparece de nuevo a MITAD de pantalla, encima de la fila («Arroz b…» queda tapado y el chevron a la derecha): ver tramos 13-14, ahora ya es la TERCERA vez → es un defecto general del anclaje del toast con la barra de Chrome visible: `--vvb` se calcula mal (o `bottom` en vez de `fixed`+área visible) cuando Chrome Android muestra/oculta su barra → ✅ anclar a `visualViewport` + `env(safe-area-inset-bottom)`, y comprobar en Chrome Android con barra inferior de gestos.
- ❌ Tras guardar, la fila «Arroz bomba» ya tiene precio («1 kg × 8,00 €») pero la tarjeta sigue abierta con «IVA: Elige» en rojo: el estado guardado no incluye el IVA y la fila no se cierra. El usuario no sabe si ha terminado → ✅ marcar como «por revisar: falta IVA» en la propia fila.

### Tramo 21 (03:20–03:30) · Mega Lista: más «Arroz bomba», vuelta a la pantalla y a la carpeta Cocina
- ❌ «Arroz bomba» aparece ≥ 10 veces seguidas en la carpeta «Arroces» (más «Arroz basmati»): al confirmar «¿Guardar igualmente?» se duplican productos de verdad; la lista queda inservible → ✅ además de avisar, ofrecer fusionar/ocultar duplicados (ver tramo 19). Hay que decidir si el catálogo de 275 artículos sembrado debería traer 1 solo «Arroz bomba» y no ~10: parece un fallo de la siembra (datos), no de la pantalla.
- ❌ El selector «IVA» enfocado se pinta con un borde NEGRO grueso (anillo de foco en tinta, 03:20): lo elegido/enfocado debe ir en oliva, nunca en negro.
- ❌ Contador «Sin precio» baja de 1682 a 1681 y «Sin IVA» de 1739 a 1738 tras guardar (👍 se actualiza), pero NO sube la cuenta de «Sin proveedor» (1681 sí bajó, pues se puso proveedor «makro»): coherente. Sin embargo el IVA se dejó en 10 % al final: el usuario tuvo que abrir otro desplegable para algo que ya sabe el sistema por la carpeta («IVA de toda la carpeta») → ✅ preseleccionar el IVA de la carpeta al crear.
- Transición a la pantalla Mega Lista (03:25):
  - ❌ La pantalla entra con texto DESENFOCADO/ghosting («Gestión de ingredientes y proveedores», «Buscar ingrediente…», «Sin IVA 1738», «Arroces 53 PRODUCTOS» borrosos y dobles): es el mismo defecto de animación de entrada de los tramos 9, 15 y 17; se repite en CADA cambio de pantalla → ✅ quitar `filter:blur` / cross-fade de las entradas; probablemente `backdrop-filter` o `transform` + opacidad en un contenedor grande (en un Android de gama media se nota 300-600 ms).
  - ❌ Al llegar, el scroll no está arriba (el título «Mega Lista» ya está a 100 px del borde y la parte alta de la lista conserva la posición anterior): la nueva pantalla hereda el scroll de la anterior.
- Carpeta Cocina (03:27): la lista de módulos con el texto «Oferta Gastronómica / I+D / Proveedores / Mega Lista / Escandallo / Fichas Técnicas» con descripción: 👍 legible; ❌ de nuevo con el texto de descripción entre 3:1 y 4:1 de contraste y con efecto fantasma por la animación; ❌ sin cabecera de carpeta ni botón «Inicio» a la vista (el scroll la esconde): al volver de una pantalla debería recolocarse arriba.
- Observación de uso: para llegar de Mega Lista a otra pantalla el usuario pasa SIEMPRE por la carpeta (2 toques + volver). Una barra inferior o un menú de módulos rápidos ahorraría toques (frecuencia alta en TPV ↔ cocina).

### Tramo 22 (03:30–03:40) · Escandallo: lista de platos y hoja de «Patatas GG con salsa de la casa»
- Lista de platos (03:30):
  - ❌ Cabecera con 5 filas antes del primer plato: subtítulo, pestañas «Platos | Elaboraciones», «+ Nuevo Plato» SOLO en su fila (hueco a la derecha), buscador, desplegable «Todas las categorías», «← Categoría · Tapas» → la tarjeta del plato empieza a ~640 px (de 810 útiles) → ✅ «Nuevo plato» a la fila de las pestañas (norma de espacios muertos), buscador y categoría en una sola fila.
  - ❌ «← Categoría» junto a «Tapas» (título suelto): mismo patrón ambiguo del tramo 13 (miga mal formada).
  - 👍 Tarjeta del plato: nombre en 2 renglones, chip «8,5 % FC», «COSTE TOTAL 0,47 € · PVP 6,05 €» con cifras en mono grandes y el «⋯» arriba: es limpia y legible.
- Hoja de escandallo (03:32–03:40): 
  - 👍 Es una sola hoja (crear/ver/editar), con COSTE TOTAL y MARGEN en cifras grandes arriba; el «Precio base» con teclado correcto (no se ve el teclado aquí).
  - ❌ «Consumibles [5] % 0,02 €»: el campo del % es una caja de ~90 px alineada a la derecha entre el texto y la cifra; la etiqueta, el campo y el resultado quedan separados por huecos → ✅ rejilla de 3 columnas con anchos fijos.
  - ❌ «SUPLEMENTO DELIVERY» es un campo con valor «0,00» en gris muy claro (parece deshabilitado) y debajo un párrafo de 5 líneas en gris claro ≈ 12-13 px («Importe fijo (con IVA) que se suma al precio de sala en pedidos a domicilio con vuestro propio reparto…») → ✅ texto de ayuda plegado tras una «?» (norma: las explicaciones largas no van a la vista), y el campo en tinta.
  - ❌ Etiquetas «PRECIO BASE (SIN IVA)», «TIPO DE IVA (REPERCUTIDO)» y «SUPLEMENTO DELIVERY» en mono gris claro y ≈ 12 px: contraste flojo.
  - ❌ «DÓNDE SE USA»: «CARTA PRINCIPAL · PRINCIPALES» / «CARTA GG BURGER · Para picar» con iconos de 14 px; ok. Pero la sección «INGREDIENTES» pinta cada ingrediente en UNA tarjeta de ~150 px de alto con: nombre en 2 renglones («Patata para / freír»), campo de cantidad (≈ 125 px), unidad «kg ▾», y debajo «COSTE: 0,31 / €» — **el «€» cae a una 3.ª línea sola** («COSTE: 0,00» y luego «€» en otra línea) → número y unidad separados: «una palabra nunca se parte» y N palabras no deberían necesitar más de N renglones → ✅ `white-space:nowrap` en «0,31 €» (con espacio duro ` ` entre cifra y símbolo) y que el coste vaya a la derecha, no debajo del nombre.
  - ❌ Nombres de ingrediente partidos en 2 renglones aunque son cortos («Patata para freír», «Aceite de girasol», «Salsa GG de la casa (base)») porque la columna del nombre mide ≈ 140 px; y el selector de unidad «kg ▾» con chevron ocupa ≈ 90 px → ✅ en móvil, cantidad+unidad en una fila bajo el nombre (nombre a ancho completo) o plegar (norma: ingredientes plegables en móvil, que consta como hecha: aquí NO están plegados: se ven todos con todos sus campos).
  - ❌ Altura total: 4 ingredientes = ≈ 600 px; un plato real con 12 ingredientes serán 1.800 px de scroll sólo en esa sección.
  - ❌ Al final, «Buscar ingrediente…» y una caja con «1» + «+ Añadir»: el «1» (cantidad) sin etiqueta ni unidad; el lector no sabe qué es.

### Tramo 23 (03:40–03:50) · Escandallo: cabecera de la hoja, pestaña Elaboraciones y hoja de una elaboración
- Hoja del plato (03:40, arriba):
  - ❌ «Guardar» y «⋯» ocupan una fila sola bajo «← Volver», que a su vez está solo en otra fila: tres filas de cabecera (título, volver, guardar) con el 60 % de cada una vacío → ✅ «← Volver» a la izquierda y «Guardar» a la derecha en la MISMA fila (norma de espacios muertos).
  - ❌ Párrafo de ayuda de 8 renglones en gris claro: «Se calcula siempre para 1 ración/persona porque cada venta del plato descuenta del stock exactamente esas cantidades: si las pusieras pensando en varias raciones…» (≈ 150 px) entre «Categoría» y «Números» → ✅ detrás de un «?» o un «Más información»: la norma es que las explicaciones largas no van a la vista. Además el fotograma sale con efecto fantasma (animación de entrada, ver tramo 21).
- Pestaña «Elaboraciones» (03:42):
  - ❌ Cabecera: subtítulo «Bases, caldos, salsas y masas para usar en platos» envuelve en 2 renglones (sin palabra huérfana, bien) pero luego «Platos | Elaboraciones», «+ Nueva Elaboración» en OTRA fila y buscador + desplegable cada uno en la suya: 5 filas antes del contenido; el contenido real son 2 tarjetas de carpetas («salsas», «Sin categoría») → ✅ pestañas + «Nueva» en una fila.
  - 👍 Tarjetas de carpetas a 2 columnas con icono, nombre y «1 PLATO» / «3 PLATOS».
  - ❌ En las carpetas de Elaboraciones el contador dice «1 PLATO» / «3 PLATOS» pero son ELABORACIONES (no platos) → ✅ «1 elaboración» (el texto de Escandallo de Sala ya usa tA(); aquí parece no aplicarse la variante de la pestaña).
  - ❌ Mismo ⋮ vertical de ~6 px en la tarjeta «salsas» (ver tramo 18).
- Hoja de una elaboración (03:45):
  - 👍 «COSTE TOTAL 6,91 € · RENDIMIENTO 2 L · COSTE POR L 3,46 €» en cifras grandes mono, claras; los alérgenos «Huevos» y «Mostaza» como chips ámbar con texto (👍 con texto, no sólo color).
  - ❌ «Consumibles [7] % 0,45 €» igual que en el tramo 22 (campo flotante).
  - ❌ El desplegable «UNIDAD [L ▾]» es un campo de ancho completo (≈ 390 px) para elegir «L»: sobredimensionado; mejor al lado del rendimiento.
- Ingredientes (03:47): 
  - ❌❌ Se repite el fallo de cifra y símbolo separados: «COSTE: 0,41» y el «€» solo en la línea de abajo (también «0,24 / €», «0,00 / €») → ✅ `white-space:nowrap` + espacio duro, y mover el coste a la derecha de la fila (hay hueco). Es el mismo fallo de causa general: un contenedor de ~100 px con `overflow-wrap:anywhere`/columnas fijas.
  - ❌ «Mezcla de especias burger» en 3 renglones y «Mostaza de Dijon» en 2 porque la columna del nombre mide ≈ 120 px → ✅ ver tramo 22 (cantidad y unidad debajo del nombre, o fila plegable).
  - ❌ Unidades «kg» y «L» en gris claro (≈ 3:1) junto al campo: se leen mal.
  - ❌ Los chevrons «⌄» de unidad son iconos sueltos de 20 px a la derecha del todo, aparte del «kg» → un solo control («kg ▾») con zona de 44 px.

### Tramo 24 (03:50–04:00) · Escandallo (carpeta «salsas», «Sin categoría») y entrada a Fichas Técnicas
- Escandallo › Elaboraciones › carpeta «salsas» (03:50): tarjeta «Salsa GG de la casa» con «3,46 €/L», «COSTE TOTAL 6,91 € · RENDIMIENTO 2 L» y «⋯»: 👍 compacta y legible. ❌ El «⋯» es una caja blanca de ~56×44 px sola a la derecha del título; correcto, pero el icono de la elaboración (cuenco) es de 20 px y gris.
- Carpetas del Escandallo (03:52–03:55): 
  - ❌ «Sin categoría · 1 PLATO» ocupa una tarjeta a media fila y deja el resto de la fila vacío (3 carpetas = 2 + 1) → es el comportamiento normal de una rejilla; ✅ si hay una carpeta «Sin categoría» con 1 elemento, poner la tarjeta a ancho completo o esconderla.
  - ❌ La carpeta «Sin categoría» tiene icono de carpeta genérico mientras las demás llevan icono propio; ok.
  - ❌ **«FICHAS SIN VINCULAR A UN PLATO 4»** (título de sección en mono mayúsculas ≈ 13 px) con 4 tarjetas «Patatas GG con salsa de la casa (copia)», «(copia 2)»… cada una de ≈ 250 px de alto con: icono, nombre en 2 renglones, «⋯», chip «SIN VINCULAR» (caja con borde, parece botón) y una fila «PASOS — / TIEMPO — / ALÉRGENOS —» con tres rayas vacías → ✅ comprimir a una línea («Sin pasos · Sin tiempo · Sin alérgenos» sólo si faltan, o nada), chip como texto y tarjeta de ~100 px. Es en parte el problema del dato (copias de prueba), pero con 20 fichas sin vincular sería una pared.
  - ❌ En esta pestaña de Escandallo aparece la sección «Fichas sin vincular a un plato» que pertenece a Fichas Técnicas, no a Escandallo (¿se está mostrando en la pantalla equivocada o es la entrada a la siguiente? a 03:57 el título ya es «Fichas Técnicas»). Revisar el orden: el fotograma 3 (03:55) parece de Fichas Técnicas con el scroll a mitad de la lista, de ahí «Hamburguesas / Postres» → no se ve cabecera en el fotograma, así que no puedo asegurarlo (fotograma sin título). No concluyo.
- Ficha Técnica (03:57, abierta):
  - ❌ Cabecera: «Fichas Técnicas» (título) + «← Volver» (otra fila) + «Imprimir / Guardar / ⋯» (otra fila): 3 filas y ≈ 260 px antes del contenido (ver tramos 22 y 23: mismo patrón).
  - ❌ La foto de la ficha es una captura de pantalla (una tarta con una interfaz alrededor) mostrada pequeña (~170 px de alto) dentro de un recuadro de 390 px de ancho, con el resto del recuadro vacío: la imagen no ocupa el ancho (contain) y deja hueco a los lados; ✅ `object-fit:cover` a ancho completo con proporción 4:3, o miniatura al lado del nombre. (Foto de prueba, pero el hueco es real.)
  - ❌ «Quitar foto» es un botón de ancho completo en rosa pálido con texto gris/rosa: contraste flojo (≈ 2,3:1) y ocupa una fila entera para una acción destructiva poco frecuente → ✅ al menú ⋯.
  - ❌ «Plato del escandallo: Patatas GG con salsa de la casa» y «Ver escandallo» en gris con borde: «Ver escandallo» parece un enlace sin forma de botón, tamaño < 44 px.
  - 👍 Campo «NOMBRE DEL PLATO» a ancho completo, con etiqueta encima.

### Tramo 25 (04:00–04:10) · Ficha técnica (alérgenos, ingredientes, pasos, producción) y vuelta a Cocina
- Alérgenos (04:00 y 04:05):
  - ❌ Los alérgenos elegidos («LÁCTEOS», «MOSTAZA», «HUEVOS») se distinguen sólo por un borde fino rojizo/oscuro y un fondo casi igual al de los no elegidos; los NO elegidos son cajas gris claro con texto gris. No se ve «marcado» de un vistazo y no usa el verde oliva → ✅ elegido = relleno oliva con texto crema y tick; no elegido = borde fino y texto tinta.
  - ❌ Los chips envuelven bien (✅ norma), pero con anchos distintos dejan huecos de ~100 px a la derecha de cada fila («MOLUSCOS» solo en su fila) → es el comportamiento de `flex-wrap`; aceptable.
  - ❌ Letra de los chips en mono mayúsculas con espaciado ≈ 13 px: «FRUTOS DE CÁSCARA» ocupa 220 px.
- Ingredientes «para 1 ración»:
  - ❌❌ **«0 kg Sal»**: la sal de 0,003 kg se muestra redondeada a «0 kg» (04:00): la cantidad real desaparece. ✅ mostrar «3 g» (cambiar a la unidad menor cuando < 0,1) o 3 decimales; dato erróneo en un documento que se imprime para cocinar.
  - 👍 La lista en 3 columnas (cantidad mono · unidad · nombre) es limpia y cabe sin partir palabras.
  - ❌ La nota «Las cantidades salen del Escandallo y se ajustan solas a la producción.» en gris claro ≈ 12 px (3 renglones); información útil pero poco visible.
- Pasos (04:02): 
  - ❌❌ **Texto del paso en MAYÚSCULAS y con la palabra partida a mitad** («SIERACORTAR A / LA MITAD CON / EL CUCHILLO DE / SIERACORTAR A…» y «SIERA» solo): la columna del texto del paso mide ≈ 190 px (de 440) porque el número (cuadro negro), el lápiz y el «⋯» le roban el ancho, y el texto está en mayúsculas (probable `text-transform:uppercase` en un título de paso). Los renglones de ≈ 15 caracteres hacen que un paso de 10 palabras ocupe 10 renglones → ✅ en móvil, número a la izquierda y texto a ancho completo; acciones (lápiz, ⋯) en la fila de abajo o dentro del ⋯; y texto de paso en minúsculas normales (las mayúsculas dificultan leer una receta). (Los pasos de prueba repiten un texto sin sentido; el fallo es de maquetación.)
  - ❌ El número del paso va en un cuadrado NEGRO sólido de 46 px (lo elegido/numerado debería ir en oliva o tinta fina; aquí negro).
  - ❌ Chip «⏱ 3 min» y «⏱ 5 min» con borde y caja: parece botón y su zona es ≈ 100×36 px (< 44).
  - ❌ «DECORAR AL GUSTO Y RELLENAR» tiene el lápiz y el «⋯» muy pequeños (≈ 20 px) y juntos.
  - ❌ «+ Añadir paso» es un texto mono sin caja (parece etiqueta, no botón) y sin tamaño de toque claro.
  - ❌ «DESCRIPCIÓN EN CARTA» (04:02, abajo) con efecto fantasma (ver animación).
- Campos de producción (04:05): «COMENSALES [1]», «PRODUCCIÓN (RACIONES A ELABORAR) [1]», «TIEMPO DE ELABORACIÓN (MIN) [90]», «TEMPERATURA DE SERVICIO [CALIENTE ▾]»: 
  - ❌ Los campos se pintan SIN caja (sólo una raya inferior gris casi invisible) mientras en el resto de la app los campos son cajas con borde → parecen texto, no campos editables; y las etiquetas en mono gris muy claro (≈ 11 px) con texto fantasma. ✅ misma caja de campo que el resto.
  - ❌ Cuatro campos de un solo valor corto cada uno a ancho completo (≈ 100 px de alto cada uno): comensales y producción podrían ir en una fila de dos (espacio muerto).
- (04:07) Vuelta a la carpeta Cocina: 👍 limpia y sin fantasma esta vez. Fue el tramo del «Volver» desde la ficha: 4 s para ir de la ficha a la carpeta (sin aviso de «cambios sin guardar»; se supone que no había cambios).

### Tramo 26 (04:10–04:20) · Pedidos: «Realizar pedido» (elegir proveedor, fecha de entrega)
- Lista de proveedores (04:10, scroll a mitad; sin cabecera visible):
  - 👍 Una tarjeta por proveedor con nombre, «14 artículos · Lun Jue» (días de reparto): informativa, a ancho completo, sin cortes.
  - ❌ «Forn del Barri · 3 artículos · Lun Mar Mié Jue Vie Sáb» llega a ≈ 400 px de ancho y roza el borde derecho de la tarjeta (sin margen); con 7 días («Lun Mar Mié Jue Vie Sáb Dom») se cortaría o envolvería → ✅ «Lun–Sáb» / «Todos los días» cuando son consecutivos.
  - ❌ Singular/plural: «1 artículo» (sí correcto aquí) pero «0 artículos» ok.
- Pestaña «Realizar Pedido» (04:12):
  - ❌ «+ Realizar Pedido» y «Historial de Pedidos» son dos botones en filas distintas, de anchos distintos y alineados a la izquierda con el 40-50 % de la fila vacío; además «Realizar Pedido» es lo que ya se está haciendo (es la pestaña): parece botón de la pestaña activa → ✅ fila de pestañas «Realizar | Historial» (el patrón «Platos | Elaboraciones» que sí usa la app) y ahorrar una fila.
  - ❌ «Selecciona un proveedor para cargar sus artículos» (frase de ayuda) y debajo la lista de proveedores con «makro 9 artículos · Lun Mié Vie · 1 BAJO MÍNIMO» (raya roja a la izquierda) y «alvilardan 0 artículos…» → la pantalla muestra DOS maneras de elegir proveedor a la vez (el desplegable y la lista), con la lista debajo de la frase de ayuda: redundante y empuja todo hacia abajo (≈ 700 px) → ✅ quitar el desplegable (la lista es suficiente) o la lista (si hay desplegable).
  - ❌ En la fila de «makro» el aviso «1 BAJO MÍNIMO» (mono rojo) y la raya roja son ✅ buenos avisos, pero el texto «9 artículos · Lun Mié Vie» sale en gris muy claro (≈ 3:1).
  - ❌ El campo «FECHA DE ENTREGA [16/11/2026 ▾]» muestra la fecha con formato «16/11/2026» y un chevron; en Android abrirá el selector nativo; formato numérico en lugar de «lunes 16 nov» (el sistema ya sabe que el proveedor reparte lun/mié/vie).
- Selector del proveedor (04:15): 
  - 👍 Es el selector NATIVO de Chrome en hoja inferior con radios de ~50 px y filas de ≈ 98 px: perfecto para el dedo, accesible y fiable. ❌ Pero el chrome nativo no sigue la identidad (tipografía del sistema, radios en gris): inevitable con `<select>`. Mantenerlo.
  - ❌ La hoja nativa cubre desde casi la parte superior (deja ≈ 45 px) y no hay indicación de cuál está elegido (ninguno marcado): normal con «— Selecciona proveedor —».
- Con «makro» elegido (04:17):
  - 👍 Chips de días de reparto: «LUN», «MIÉ», «VIE» en verde oliva relleno (elegidos) y «MAR/JUE/SÁB/DOM» en gris: correcto (lo elegido en oliva).
  - ❌ Los chips no marcados («MAR», «JUE», «SÁB», «DOM») están en gris MUY claro sobre blanco (≈ 1,8:1) → ilegibles; «SÁB» a medio cortar por el borde derecho de la tarjeta («SÁB» se ve casi pegado al borde) y «DOM» cae a otra fila sola con «⏱ 12:30» → ✅ envolver con la hora siempre en su línea, o 7 columnas iguales (grid de 7) y letras en tinta tenue (≥ 4,5:1).
  - ❌ «Envío: gratis desde 100,00 €», «WhatsApp» y «Email» como tres líneas sueltas con iconos de 16 px: «WhatsApp»/«Email» son acciones, pero parecen texto (≈ 22 px de alto) → ✅ botones de 44 px.
  - ❌ «ARTÍCULOS DEL PROVEEDOR 9» + «Sugerir por déficit de stock» (texto con icono, sin caja de botón) + buscador + «Todos 9 · Bajo mínimo 1»: cuatro filas de controles antes del primer artículo.

### Tramo 27 (04:20–04:30) · Pedidos: lista de la compra con índice A–Z y resumen del pedido
- Filtros e índice (04:20–04:22):
  - ❌ «Todos 9», «Bajo mínimo 1» y «Con cantidad 0» salen en TRES filas porque cada chip va con su propia caja y huecos: «Con cantidad 0» queda solo en la tercera → ✅ los tres caben en una fila de 440 px; los chips parecen tener `padding` y margen excesivos. Y los chips NO marcados y los marcados se parecen (ninguno en verde) → ✅ el activo en oliva.
  - ❌ El índice A–Z (26 letras en rejilla de 6 columnas × 5 filas ≈ 300 px) ocupa media pantalla para elegir una letra: sólo la «A» y la «V» tienen artículos y las otras 24 están en gris muy claro (≈ 1,5:1) y siguen ocupando sitio → ✅ mostrar SÓLO las letras con artículos (en una fila que envuelve) o una tira horizontal; con 9 artículos no hace falta índice.
  - ❌ En 04:20 ya está elegida la «V» (oliva, 👍) pero todas las demás letras son casi invisibles; la «A» en negro (tinta) parece otra selección distinta → dos estados distintos sin leyenda.
  - ❌ Fotograma 04:22: ghosting en las letras (repintado).
- Lista de artículos (04:20–04:27):
  - 👍 Cada artículo: nombre grande, «Stock: 0 L», precio «1,80 €/L» a la derecha y una fila «− [1] + L» con botones de ≈ 50×50 px y campo central ancho: cantidad cómoda de teclear y de tocar.
  - ❌ «Stock: 0 L» en gris muy claro y mono ≈ 12 px (poco legible), y es justo el dato para decidir cuánto pedir → ✅ en tinta y con aviso (rojo) si está bajo mínimo.
  - ❌ La unidad «L» queda suelta a la derecha del «+» (gris claro), a ≈ 14 px: poco clara.
  - ❌ El «+» recién pulsado conserva un aro de foco negro de 2 px (04:25 y 04:27: «+» con borde oscuro): ✅ el foco debe ser oliva (o desaparecer tras el toque con `:focus-visible`).
  - ❌ Hay un cambio de fondo en las filas con cantidad (verde muy claro + raya oliva a la izquierda) bien, pero el fondo cambia el alto: la fila de «Vinagre de manzana» salta ≈ 10 px al ser seleccionada.
  - 👍 Sin palabras partidas en esta lista: «Vinagre de Módena» cabe en una línea.
- Resumen del pedido (04:25–04:27): 
  - 👍 Tarjeta «RESUMEN DEL PEDIDO» con cada línea «1 L × 2,96 €» y total a la derecha en mono, «Subtotal / IVA / Envío» alineados: legible y ordenado.
  - ❌ El aviso «Te faltan 98,20 € para el envío gratis (mínimo 100,00 €)» en ÁMBAR sobre blanco (≈ 3:1) y luego cambia a «90,24 €» al añadir dos artículos; correcto. Pero «IVA 0,00 €» con subtotal 9,76 € y envío 12,50 €: el IVA parece mal (el «IVA 0,00 €» debería ser ≥ 1 €), o es que la línea «IVA 21 % envío» está debajo cortada. No puedo afirmarlo (sale cortado por abajo): fotograma incompleto; revisar en los siguientes tramos.
  - ❌ El resumen empieza muy abajo (tras 9 artículos); el botón de enviar no se ve en este tramo: el usuario debe hacer scroll para encontrar «Enviar pedido» → ✅ barra inferior fija con «Total · Enviar» como en el TPV («Cobrar 11,00 €»).

### Tramo 28 (04:30–04:40) · Pedidos: «Hay cambios sin guardar», historial de recibidos y recepción con verificación
- Aviso «Hay cambios sin guardar» (04:32):
  - 👍 Funciona: aparece al salir con un pedido sin enviar y explica «Pedido a makro sin enviar ni guardar. Si sales ahora, se perderán».
  - ❌ Es una hoja que ocupa ≈ 55 % de la pantalla con mucho aire (título → texto ≈ 60 px, texto → botones ≈ 50 px) y TRES botones en dos filas: «Seguir editando» y «Descartar» (rosa) lado a lado, «Guardar y salir» debajo en oliva. El orden «Descartar» junto a «Seguir editando» invita a pulsar la acción destructiva por error; el botón principal queda en una fila aparte → ✅ una columna con «Guardar y salir» (oliva) arriba, «Seguir editando» y «Salir sin guardar» debajo; la acción destructiva a un lado, nunca junto a la de continuar.
  - ❌ «Descartar» en rosa pálido con texto rojo-gris: contraste ≈ 3:1; el texto «Si sales ahora, se perderán. ¿Qué quieres hacer?» (gris claro, ≈ 15 px) está bien, pero la X de cerrar (arriba a la derecha) no dice qué hace (¿cierra el aviso o descarta?) → ✅ la X = «Seguir editando».
- Historial de pedidos recibidos (04:35):
  - ❌ Fechas ISO «2026-11-11», «2026-11-09» en la tarjeta (ya vistas en el tramo 17): deben leerse «11 nov 2026».
  - ❌ Aviso «Tienes 3 pedidos pendientes de recibir en otros periodos. [Ver todos]»: el texto envuelve en 2 renglones y «Ver todos» (enlace mono sin caja) queda a la derecha pegado al borde, sin zona de toque clara (≈ 30 px de alto) → ✅ botón de 44 px.
  - ❌ Cabecera «RECIBIDOS · NOVIEMBRE 2026 · 2 PEDIDOS» (en mono ≈ 13 px, gris claro) + «TOTAL DE LO FILTRADO: 362,50 €» como texto suelto, sin tarjeta ni jerarquía: el total, que es la cifra clave, parece una nota al pie → ✅ cifra grande en una franja de resumen (como «CARTAS 2 · TOTAL PLATOS 19»).
  - ❌ Cada pedido: chips «RECIBIDO» y «⚠ HA FALTADO ALGO» (cajas con borde) lado a lado, y «ENTREGA / ARTÍCULOS / TOTAL» en tres columnas; la segunda tarjeta (Beguda Distribució) muestra «TOTAL 0,00 €» con 1 artículo y «HA FALTADO ALGO»: el estado cuenta que no llegó nada. Información coherente; pero los chips parecen botones y «RECIBIDO» no es un estado destacado (ni verde) → ✅ chip de estado con color (oliva = recibido, ámbar = incidencia) sin borde de botón.
  - 👍 La tarjeta tiene el «⋯» a la derecha del nombre (norma de los tres puntos) y la raya lateral oliva.
- Recepción / verificación (04:37, hoja de un pedido):
  - ❌❌ **Texto de ayuda de 8 renglones** («Escribe en «Recibido» lo que llega de cada artículo: se pone verde si coincide con lo pedido y rojo si no (y suma al stock lo que de verdad llegó). El tick rellena «llegó todo» y la cruz es «no llegó». Explica cualquier diferencia en la nota. Lo que no apuntes cuenta como no llegado.») entre «ARTÍCULOS 2» y la primera línea, en gris claro ≈ 14 px → ocupa ≈ 200 px y empuja los artículos fuera de la vista; es la información que se debe leer UNA vez → ✅ plegada tras «¿Cómo funciona?» o un aviso de una línea («Apunta lo recibido; ✓ = llegó todo, ✗ = no llegó»).
  - ❌❌ **La etiqueta de la casilla dice «PEDIDO»** en las dos filas (junto al campo con «1» y «200») mientras el texto de ayuda habla de «Recibido»: o la casilla que se edita es la de lo pedido (y no la de lo recibido), o la etiqueta está mal. Según el diseño del 8/11 debería haber «Pedido» fijo y «Recibido» editable: aquí sólo se ve UNA casilla, rotulada «PEDIDO» → ✅ revisar que se pinten las dos y que la editable se llame «Recibido». (Fotograma limpio; no creo que sea un recorte, pero no se ve la fila entera: confirmar en el siguiente bloque.)
  - ❌ Las filas se pintan con fondo rojo claro («Aceite de girasol», el pedido con 1) o verde claro («Vinagre de manzana», con 200): ✅ correcto el semáforo, pero el nombre «Vinagre de manzana» va SUBRAYADO (¿enlace?) y no el otro; inconsistente. Además la fila roja no dice POR QUÉ (¿falta?, ¿cantidad distinta?): sólo el color → ✅ texto («Pedido 2 · recibido 1»), no sólo color (accesibilidad daltónicos).
  - 👍 Botones ✓ y ✗ de ≈ 50×50 px, con el ✓ relleno en oliva cuando está confirmado: buen tamaño táctil y estado claro.
  - ❌ «RECEPCIÓN / APPCC» abajo con «⚠ 1 artículo(s) no coinciden con lo pedido. El control debe constar como…»: «artículo(s)» con paréntesis (plural a medias) → ✅ «1 artículo no coincide» / «N artículos no coinciden».
