# Continuidad — estado al 7/11/2026, ~01:45

## Estado
- **Fase:** 6 (auditoría final) completada en lo abordable; quedan cosas pendientes y están listadas.
- **Rama de trabajo:** `claude/beautiful-dijkstra-58bru6`. **Publicado en `main`** al final de la noche (ver sello en `INFORME_NOCTURNO.md`).
- **Batería:** 150 ✅, 0 ❌, 1 🟡 aceptado.

## Última tarea completada
Selector de idioma de la entrada a 44 px; `idr` y `plan360` añadidos a `movil.mjs`.

## Archivos modificados esta noche
`css/styles.css` (bloque «Barrido nocturno» al final), `js/hr.js` (pie del gestor, lista de pendientes plegable), `js/i18n.js` (módulo I+D de Sala), `index.html` (pestañas antes del aviso en Gestión Económica), `reservagastrogoan.html` (seguimiento, edición), `test/claves-sin-traducir.mjs` (nuevo), `test/movil.mjs`, `test/todo.sh`, `CLAUDE.md`, `CONTROL_CALIDAD/*`.

## Problemas abiertos
Ver `INCIDENCIAS.md` (A-01…A-08). Las decisiones del dueño: **A-01** (`landing.html`/`catalogo.html`), **A-03** (índice de Mi Negocio en móvil), **A-02** (emojis en paneles privados).

## Herramientas usadas
Chromium + puppeteer-core (las 150 pruebas y las capturas), `python3 -m http.server 8950`, `bash build.sh`, `bash deploy/actualizar.sh`. No se han usado subagentes ni flujos de trabajo (coste); sí el navegador real para ver cada pantalla.

## Cómo retomar
1. `git checkout claude/beautiful-dijkstra-58bru6 && bash build.sh && python3 -m http.server 8950 &`
2. Capturar con el negocio de prueba: ver `test/movil.mjs` (carga `/dist/ggburger.json`). **Quitar `#app-splash`** antes de capturar `home`, o sale la pantalla de carga.
3. Siguiente acción exacta: inspeccionar a ojo las ≈79 ventanas restantes (`test/modales-todas.mjs` abre 100) y las pestañas internas de Escandallo, Fichas, Promoción, Reservas, Clientes, Personal/Calendario.
4. Después: el diseño de los impresos/Excel y la web comercial (≈10 páginas).
5. Antes de dar nada por hecho, `bash test/todo.sh`.
