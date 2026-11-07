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


## Abiertas (no tocadas, con motivo)

| # | Dónde | Qué | Por qué no se ha tocado |
|---|---|---|---|
| A-01 | `landing.html`, `catalogo.html` | Identidad antigua (naranja/azul marino) y promesa «pago único… tuyo para siempre», que no cuadra con licencia anual de 100 €/año | No se publican (no están en `deploy/` ni en `build.sh`). **Decisión del dueño:** borrarlos o rehacerlos |
| A-02 | `generador-licencias.html`, `admin-panel/*.html` | ~90 emojis como marcadores y botón primario negro | Herramientas privadas del dueño, sin cobertura de pruebas; un cambio masivo a ciegas arriesga el generador (emite licencias) |
| A-04 | Pantalla de entrada | La tarjeta de accesos se ve atenuada en la captura a los 2 s | No se ha podido confirmar si es animación en curso o defecto |
| A-06 | Web comercial (`deploy/web/public`) | Lista numerada 01/02/03 sin que el orden signifique nada; faltan ~10 páginas por inspeccionar | CLAUDE.md la deja como pendiente conocida |
| A-07 | Ventanas | ≈79 de 86 sin inspección visual | Tiempo |
| A-08 | Documentos descargables (PDF, Excel, tickets, ficha) | Sin revisión visual esta noche | Tiempo |
