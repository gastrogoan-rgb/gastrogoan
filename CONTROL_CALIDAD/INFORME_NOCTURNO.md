# Informe de la noche — 6→7 de noviembre de 2026

**Sello de versión publicado (tanda móvil):** 07/11/2026 10:48 (hora de Madrid).

## En una frase
He recorrido **todas** las pantallas de la app con un navegador real, he corregido los fallos que había y he dejado escrito qué falta por mirar. **No he rehecho el diseño**: el rediseño total sigue revertido por tu decisión del 28/10, así que he igualado lo que ya está aprobado.

## 1. Lo que he inspeccionado
- 33 estados de página de la app (23 vistas, 3 carpetas, 8 pestañas de Gestión Económica…) en **390 y 1280 px**, con un negocio de prueba lleno, mirados uno a uno (solo la primera pantalla).
- 7 ventanas. La entrada, el generador (solo acceso), el panel del coach (solo acceso), la web comercial (portada), `landing.html` y `catalogo.html`.
- La web pública de reservas y pedidos: selector de servicio, carta, hoja de extras, seguimiento de pedido, seguimiento y edición de reserva.

## 2. Terminado y validado (arreglado, recapturado, batería en verde)
1. **Carpeta Sala:** el módulo I+D enseñaba `module.sala.idr.name` y `.desc` (faltaban sus textos en los tres idiomas). Arreglado, y **prueba nueva** que vigila esto en todas las pantallas y los 3 idiomas. Comprobé que la prueba falla sin el arreglo.
2. **Gestión Económica:** la pestaña activa era **negra** (en el resto de la app es verde). Ahora verde. Además, el aviso fiscal y la lista de pendientes empujaban las pestañas y el contenido fuera de la primera pantalla en móvil: ahora las pestañas van arriba y la lista empieza plegada en móvil.
3. **Ventana «Enviar al gestor»:** en móvil el botón salía cortado («nviar / compar»). Arreglado.
4. **Franjas de cifras en móvil:** una celda impar dejaba un hueco con borde (Distribución, APPCC, Stock, Promoción, Personal). Arreglado. Oferta mostraba sus dos cifras apiladas y sangradas: ahora lado a lado.
5. **Selector de idioma de la entrada:** medía 44×26 en móvil y tablet (27 hallazgos de `acceso-alta`, el fallo que arrastrábamos desde el 28/10). Ahora 44 px: **0 hallazgos**.
6. **Web pública:** seguimiento de pedido/reserva con lo hecho en verde (era negro); botones de edición de reserva con el mismo ancho; ya sin raya negra en tarjetas, sin filetes en las etiquetas, sin barras de acento, sin controles que se vuelven negros.
7. **`movil.mjs`** no medía `idr` ni `plan360`. Añadidas: 0 hallazgos.

## 3. Pruebas
**Batería final: 150 ✅, 0 ❌**, más 1 🟡 aceptado (botones compactos de Comandas, tu decisión del 9/09). Detalle en `PRUEBAS.md`. Un fallo mío intermedio (la ventana de descripción de plato reventaba sin carta en edición) lo pilló la batería y está corregido.

## 4. Cobertura REAL (sin inflar)
| | |
|---|---|
| Estados de página inspeccionados a ojo (primera pantalla, 2 anchos) | 33 de 33 conocidos |
| …con defecto corregido y validado | 15 |
| Ventanas inspeccionadas a ojo | **7 de 86 (8 %)** |
| Documentos descargables revisados a ojo | **0** |
| Pestañas internas y scroll completo | **no revisados** en la mayoría |

## 5. Pendiente (lo que NO está hecho)
- ≈79 ventanas sin ver, pestañas internas (Escandallo, Fichas, Promoción, Reservas, Clientes, Calendario…), selector de negocios, asistente de nube, tour, chat.
- Diseño de impresos, PDF, Excel y tickets.
- Panel del coach (`app.html`, `plan360.html`) y ~10 páginas de la web comercial.
- No he ejecutado el emulador de Firebase de dos aparatos ni probado en iPhone/iPad ni con la impresora.

## 6. Decisiones que son tuyas (no las he tomado)
- **`landing.html` y `catalogo.html`**: identidad antigua (naranja) y prometen «pago único… tuyo para siempre», que no cuadra con tu licencia anual. No se publican. ¿Se borran o se rehacen?
- **Emojis y botón negro en el generador y el panel del coach** (~90 emojis): son herramientas tuyas; cambiarlo a ciegas puede romper el generador.
- **Índice «Ir a:» de Mi Negocio en móvil** (13 botones, ≈400 px antes del contenido): ¿desplegable?

## 7. Qué hacer ahora
1. Abrir la app y mirar que el sello es el de arriba.
2. Decidir los tres puntos de la sección 6.
3. Si quieres seguir con el barrido: ventanas y pestañas internas (instrucciones exactas en `CONTINUIDAD.md`).

## Nota sobre cómo he trabajado
No he usado subagentes ni flujos paralelos (coste); todo con el navegador real y la batería. El rediseño total del prompt maestro no lo he aplicado por tu instrucción previa y por CLAUDE.md; si de verdad lo quieres, dímelo y se hace con tu visto bueno, porque cambia pantallas ya aprobadas.
