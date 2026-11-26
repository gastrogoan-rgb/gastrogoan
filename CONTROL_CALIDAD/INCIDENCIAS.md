# Incidencias — 7/11/2026

## Corregidas esta noche

| # | Dónde | Defecto | Solución | Comprobado |
|---|---|---|---|---|
| I-01 | Carpeta Sala | El módulo I+D enseñaba las claves `module.sala.idr.name` / `.desc` | Textos añadidos en es/ca/en (`js/i18n.js`) | Recaptura + `test/claves-sin-traducir.mjs` (nueva): **falla sin el arreglo, pasa con él** |
| I-02 | Ventana «Enviar al gestor» (390 px) | El botón «Enviar / compartir» salía cortado | `.pg-footer`: los botones reparten ancho y saltan de línea | Recaptura |
| I-03 | Gestión Económica | Pestaña activa en negro (en el resto de la app, verde) | `#view-economia .ge-tab.active` → verde | Recaptura en las 8 pestañas |
| I-04 | Gestión Económica (móvil) | Aviso fiscal y lista de pendientes (≈450 px) empujaban pestañas y contenido fuera de la primera pantalla | Pestañas antes del aviso; lista de pendientes plegable (cerrada en móvil, abierta en PC, respeta lo que elija el usuario) | Recaptura + batería (`auditoria-contable` lee su texto) |
| I-05 | Franjas de cifras en móvil | Con número impar de celdas quedaba una celda vacía con borde (Distribución, APPCC; también Stock, Promoción, Personal) | La última celda ocupa la fila entera (`.st-resumen`, `.grid-N:has(> .kpi)`) | Recaptura de 5 pantallas |
| I-06 | Oferta Gastronómica (móvil) | Las dos cifras iban apiladas y la segunda sangrada | `.grid-2` pasa a 2 columnas en móvil | Recaptura |
| I-07 | Entrada, selector de idioma | 44×26 px en móvil y tablet (pendiente desde el 28/10; 27 hallazgos) | `min-height:44px` hasta 1100 px | `test/acceso-alta.mjs`: 27 → **0** |
| I-08 | Web pública, seguimiento | Estados «hecho» en tinta | En verde, con halo en el paso actual | Recaptura |
| I-09 | Web pública, editar reserva | «Cerrar» ocupaba casi todo el ancho y «Guardar cambios» salía partido | Ambos `flex:1 1 0` | `web-publica-pasos` (24 casos) |
| I-10 | `test/movil.mjs` | Su lista de vistas no incluía `idr` ni `plan360` | Añadidas (`idr`, `idr-sala`, `plan360`) | `movil.mjs` en los 5 anchos: **0 hallazgos** con las tres |
| I-11 | Todos los buscadores y 98 de los 123 campos de Mi Negocio (móvil) | Letra de **13 px**: Safari de iPhone **amplía toda la página** al tocar un campo y no vuelve solo | `@media (max-width:760px)`: `input, select, textarea` a 16 px | `test/movil-lectura.mjs` (nueva): 0 campos <16 px en 47 pantallas × 5 anchos; **falla sin el arreglo** |
| I-12 | Tesorería, «Dinero que no es tuyo» (móvil) | «Reserva IVA (modelo 303) · T4» salía **una letra por línea** (33 líneas para 7 palabras) | Una regla con más especificidad manda la descripción a fila propia | Prueba nueva, falla sin el arreglo |
| I-13 | APPCC, lecturas de temperatura (móvil) | El botón «⋯» salía medio fuera de la tarjeta (`width:1%` heredado) y cada lectura ocupaba 7 líneas | Celda a ancho completo y lectura en 2 columnas | Prueba nueva (detecta lo cortado por la izquierda aunque esté dentro de un scroll); falla sin el arreglo |
| I-14 | Mi Negocio (móvil) | **16.854 px** de alto (24 apartados seguidos) | Acordeón: 2.103 px plegado; lo abierto se recuerda al guardar y los saltos desde otras pantallas abren el apartado | Medido en navegador (abrir, tocar, repintar) |
| I-15 | Mi Negocio (móvil) | Índice «Ir a:» de 14 botones (~400 px) | Un desplegable (`.mn-indice-sel`) | `tabs-scroll-fade` en verde |
| I-16 | Desplegables en móvil | Cada pantalla enseñaba el suyo (flecha del sistema, alto y letra distintos) | Mismo aspecto: 44 px, flecha propia | Recaptura a 320 y 390 |
| I-17 | Proveedores (móvil) | Cada tarjeta medía el doble para dos iconos sueltos | Nombre y botones en una fila (1.207 → 827 px) | Recaptura |
| I-18 | TPV a 320 px | «Anulaciones» no cabía con su icono | Sin icono a ≤ 340 px | Recaptura |
| I-19 | `movil.mjs` | **Solo mide la primera pestaña de cada pantalla**: no veía Temperaturas, Calendario, Elaboraciones, Novedades… | `test/movil-lectura.mjs` recorre 47 estados (con pestañas) y 7 ventanas | — |

| I-20 | Panel de Control (móvil) | **14.047 px** de alto: una tarjeta («Análisis de Platos», un `<details>` abierto) medía 9.809 px | Secciones plegables solo en móvil (`.gg-plegable`, `ggAccPreparar` en `js/ui.js`): «Hoy — Atención» y «Evolución del año» abiertas, el resto plegadas; el análisis de platos empieza cerrado y sus 8 secciones también. Estado recordado al repintar | Medido: **2.440 px** |
| I-21 | Tesorería (móvil) | 5.164 px | Mismo mecanismo: «Distribución» abierta; «Pagos a Hacienda» y «Previsión» plegadas | Medido: **3.073 px**; `economia-tesoreria` en verde |
| I-22 | Mega Lista, Stock, Escandallo, Fichas (móvil) | Una carpeta por fila (Mega Lista 2.315 px, Stock 1.998 px) | Dos por fila, con icono y menú ⋯ arriba y el nombre debajo; también a 320 px | Medido: **1.623 px** y **1.495 px**; `megalista`, `stock`, `plegables` en verde |
| I-23 | Lo «elegido» en negro | Categoría de «Tomar nota», trimestres T1-T4 de la Cuenta de Resultados, alérgenos de APPCC, conmutador de vista y maridajes | Verde (regla del sistema) | Recaptura |
| I-24 | `movil-lectura.mjs` | Solo 5 anchos verticales y 7 ventanas | Añadidos **2 tamaños horizontales** (568×320, 667×375) y 8 ventanas más (merma, lista de espera, cartas activas, inversión, gasto fijo, compra, acción de promoción, cobro) | 47 pantallas × 7 tamaños + 15 ventanas: 0 hallazgos |

| I-25 | Entrada de la app | **PIN de «Sala»/«Cocina» encima de la pantalla de entrada** al abrir con sesión caducada y una dirección guardada (`#promocion`): el «login raro» que salía solo | El arranque no navega a la dirección guardada sin sesión válida; la entrada cierra cualquier ventana abierta | `test/acceso-caducado.mjs`: **falla sin el arreglo (4 casos)**, pasa con él; `acceso-alta`, `sin-salida`, `permisos`, `cuentas` en verde |

## Abiertas (no tocadas, con motivo)

| # | Dónde | Qué | Por qué no se ha tocado |
|---|---|---|---|
| A-01 | `landing.html`, `catalogo.html` | Identidad antigua (naranja/azul marino) y promesa «pago único… tuyo para siempre», que no cuadra con licencia anual de 100 €/año | No se publican (no están en `deploy/` ni en `build.sh`). **Decisión del dueño:** borrarlos o rehacerlos |
| A-02 | `generador-licencias.html`, `admin-panel/*.html` | ~90 emojis como marcadores y botón primario negro | Herramientas privadas del dueño, sin cobertura de pruebas; un cambio masivo a ciegas arriesga el generador (emite licencias) |
| A-04 | Pantalla de entrada | La tarjeta de accesos se ve atenuada en la captura a los 2 s | No se ha podido confirmar si es animación en curso o defecto |
| A-06 | Web comercial (`deploy/web/public`) | Lista numerada 01/02/03 sin que el orden signifique nada; faltan ~10 páginas por inspeccionar | CLAUDE.md la deja como pendiente conocida |
| A-07 | Ventanas | ≈79 de 86 sin inspección visual | Tiempo |
| A-08 | Documentos descargables (PDF, Excel, tickets, ficha) | Sin revisión visual esta noche | Tiempo |

## Cierre de pendientes pequeños (26/11, sesión de Haiku)

| Id | Dónde | Qué pasaba | Estado |
|---|---|---|---|
| C-01 | `js/novedades.js` (oferta semanal) | Literal de locale (`es-ES`) escrito a mano en la fecha del día de la semana. Medido: la salida ya era correcta en es, ca y en; el problema era el literal | **Cerrado**: `localeActual()`; `test/novedades-fecha.mjs` |
| C-02 | `admin-panel/plan360.html`, `PLAN360_DEFAULT_PROGRAM` | Campo `task` «(Contenido pendiente de definir)» en 26 días. La constante SÍ se lee (siembra el programa vacío) pero nadie leía `task` | **Cerrado**: campo quitado, la lectura se conserva; `test/plan360-programa-base.mjs`. Queda igual en `js/core.js` y en las copias de `deploy/` (zona ajena a esta tanda) |
| C-03 | Escandallo y Fichas (hojas) | «Atrás» no reabría ni cerraba la hoja: la hoja no era entrada del historial | **Cerrado** sin tocar `openModal`/`closeModal`: la hoja usa `ggRutaPagina` y `GG_RUTA_PROV`; `test/atras-hojas.mjs` (9 casos). Pasan `atras`, `sin-guardar`, `escandallo` y `fichas` (copias contra el código de desarrollo) |
| C-04 | `js/frases.js` | 357 frases, faltaban 8 para 365 | **Cerrado**: 8 citas comprobadas en Wikiquote (obra y referencia en `f`); `test/frases-dia.mjs`. Verificación vía las citas de Wikiquote, no de la fuente primaria |
| C-05 | `test/ventanas-todas.mjs` a 360 px | Se colgaba en inicio, Mega Lista e I+D: esperaba `finished` de TODAS las animaciones y la portada tiene infinitas (`gg-lampara`, `gg-flotar`, `splash-bar`). Además, una corrida sin ninguna ventana salía en verde | **Cerrado en el tiempo**: solo animaciones finitas con tope de 1,5 s; una corrida sin ventanas sale en rojo. **Cobertura baja**: inicio 0 ventanas, Mega Lista 1 de 5 botones, I+D 1 de 7 (solo se miran los botones de primer nivel y se deduplica por función) |
| C-06 | `test/emulador/espejo-sesion.mjs` | Fallaba: lanzaba `firebase.app()` sin esperar a la app `[DEFAULT]` | **Cerrado**: espera explícita a la app por defecto; 3 casos pasan contra el emulador |
| C-07 | `test/emulador/cobro.mjs` | 1 de 4 casos falla («el cobro duplicado queda anotado como crítico»), y el script sale con 0 porque no fija el código de salida | **Abierto**: es la zona de cobros y sincronización de ventas que otro agente está tocando; no se modifica aquí |
| C-08 | `docs/PENDIENTES.md`, sección 8 (push) | Mencionaba el despliegue en Netlify | **Cerrado**: marcado como histórico en una línea |
