# Pruebas — 7/11/2026

## Batería completa (`bash test/todo.sh`)

| Pasada | Hora (aprox.) | Resultado |
|---|---|---|
| 1.ª, tras el despliegue de la web pública | 23:00 | 1 fallo nuevo (ventana de descripción de plato reventaba sin carta en edición) + 2 conocidos. **Corregido** |
| 2.ª, tras el barrido | 00:30 | 149 ✅, 2 conocidos (selector «ES» de la entrada y 🟡 Comandas) |
| 3.ª, final (con el arreglo del selector) | 01:30 | **150 ✅, 0 ❌**, 1 🟡 aceptado (botones compactos de Comandas, 91×25 px, decisión del dueño 9/09) |

Después de la 3.ª solo se tocaron `test/movil.mjs` (más vistas) y documentos; `movil.mjs` se ejecutó aparte: 0 hallazgos.

## Pruebas nuevas o ampliadas esta noche

| Prueba | Qué fija | Verificación de que sirve |
|---|---|---|
| `test/claves-sin-traducir.mjs` (nueva, registrada como P162 en `todo.sh`) | Ninguna de las 30 vistas enseña una clave interna en es/ca/en | **Se quitaron las claves, falló en las 3 lenguas con `module.sala.idr.name/desc`; se repusieron y pasó** |
| `test/movil.mjs` | Añadidas `idr`, `idr-sala`, `plan360` | 0 hallazgos en 320/360/390/412/430 |
| `test/descripcion-plato.mjs` | «Descripción en carta» (ficha → web → ⓘ del TPV) | 6/6 |
| `test/web-publica-pasos.mjs` | Web pública por pasos | 24 casos tras los cambios de hoy |

## Barrido visual (no automático)

- 33 estados de página × 2 anchos (390 y 1280) capturados con el negocio lleno y **revisados a ojo** (primera pantalla).
- 7 ventanas capturadas y revisadas.
- 8 superficies externas abiertas (entrada, generador, coach ×2, landing, catálogo, web comercial ×2): sin errores de página ni scroll lateral.
- Sin errores de consola/`pageerror` en ninguna captura.

## Lo que NO se ha probado

- Pestañas internas y scroll completo de la mayoría de pantallas.
- ≈79 ventanas a ojo; impresos, PDF, Excel y tickets a ojo.
- Selector de negocios, asistente de nube, tour y chat a ojo.
- iPhone/iPad reales, impresora térmica, nube real con dos aparatos (`test/emulador/run.sh` **no se ha ejecutado esta noche**).
- Contraste y accesibilidad más allá de lo que ya cubren `contraste.mjs` y `a11y` de la batería.
