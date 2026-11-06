# Sistema de diseño (el que ya manda en la app)

Fuente de la verdad: `css/styles.css` (tokens en `:root`, líneas ~16-45) y `CLAUDE.md`. Este documento **no inventa una identidad nueva**: recoge la vigente y las reglas con las que se ha auditado hoy.

## Decisión de esta noche

Se pidió «llevar el nuevo diseño a toda la app». El diseño nuevo es el ya aprobado (pantalla a pantalla, desde el 29/10). El rediseño total «Nórdico + Comanda» **sigue revertido** por decisión del dueño (CLAUDE.md, 28/10). Por eso el trabajo ha sido **igualar**, no sustituir.

## Color

| Token | Valor | Uso |
|---|---|---|
| `--ink` | `#1C1A17` | texto y estructura |
| `--olive` | `#4A5D4E` | **el acento y lo marcado/elegido** |
| `--brand-cream` | `#F1EFE9` | fondo al pasar el ratón |
| `--bg` / `--surface` / `--border` | `#FAF8F4` / `#FFFFFF` / `#E7E2D9` | fondo, superficie, filete |
| `--muted` | `#716C65` | texto secundario (contraste ≥ 4,5:1 en los 4 fondos) |
| `--red` / `--red-l` | `#8A4A3B` / `#F5EBE7` | error / aviso |
| `--amber` / `--green-l` | `#8A7440` / `#EDF1EC` | pendiente / correcto |

Tipografía: **Schibsted Grotesk** (texto y títulos) + **IBM Plex Mono** (etiquetas, cifras, botones). Radio 0 en tarjetas, 3-4 px en controles.

## Reglas que se han aplicado esta noche (y que antes se rompían)

1. **Lo marcado/elegido va en verde oliva, nunca en negro** (`.is-on`, pestañas, selectores, horas). Se encontró negro en las pestañas de Gestión Económica y en varios controles de la web pública.
2. **Sin raya negra gruesa encima de cada tarjeta**, sin barras de acento a un lado, sin sombras de brillo al pasar. Al pasar: fondo crema + borde verde.
3. **Botones**: letra mono, esquina de 3 px; primario verde oliva.
4. **Franja de cifras (`.st-resumen`, `.grid-N:has(> .kpi)`)**: en móvil, 2 columnas; si el número de celdas es impar, la última ocupa la fila entera (antes dejaba una celda vacía con borde).
5. **Cabecera de módulo**: la navegación (pestañas) va antes que los avisos largos; lo que empuja el contenido fuera de la primera pantalla en móvil empieza plegado (`.ck-det`).
6. **Pies de ventana con 3 botones**: reparten el ancho y saltan de línea (`.pg-footer`); el texto no se recorta.
7. **Ninguna clave interna a la vista** (`module.sala.idr.name`): lo vigila `test/claves-sin-traducir.mjs` en es/ca/en.

## Pendiente de documentar

Escala tipográfica exacta y espaciados por componente: hoy están repartidos en `styles.css`. No se ha unificado nada esta noche.
