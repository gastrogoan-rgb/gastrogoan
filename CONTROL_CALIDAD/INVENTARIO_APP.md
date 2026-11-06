# Inventario de la app — 7/11/2026

Generado desde el código (`index.html`, `js/ui.js`, `js/*.js`) y comprobado en navegador real. Los números salen de comandos, no de memoria.

## Superficies

| Superficie | Fichero | Qué es |
|---|---|---|
| App de gestión | `index.html` + `js/*.js` + `css/styles.css` → `dist/index.html` | 23 vistas `view-*`, 3 carpetas (Cocina, Sala, Gestión), ~86 funciones `open*Modal` |
| Web pública de reservas y pedidos | `reservagastrogoan.html` | Un solo fichero: selector de servicio, reservar mesa, take away, delivery, seguimiento, gestión de reserva, encuesta, pedido en mesa (QR) |
| Generador de licencias (PRIVADO) | `generador-licencias.html` | Solo para el dueño. No se publica |
| Panel del coach | `admin-panel/index.html`, `app.html`, `plan360.html` | Plan 360 y mantenimiento |
| Web comercial | `deploy/web/public/*.html` (es/ca/en) + `landing.html`, `catalogo.html` | Páginas de venta |
| Legales / tutoriales | `deploy/app/public/legal/`, `tutorial-*.html` | Texto legal y guías |

## Vistas de la app (23)

`home`, `folder` (×3 carpetas), `carta`, `clientes`, `comandascocina`, `dashboard`, `distribucion`, `economia` (8 pestañas visibles + «módulos» condicional), `escandallo`, `fichas`, `horarios`, `idr` (×2 áreas), `limpieza`, `manual`, `megalista`, `minegocio`, `pedidos`, `plan360`, `promocion`, `proveedores`, `reservas`, `stock`, `tpv`.

- Con el diseño nuevo registrado en `GG_VISTAS_NUEVAS` (js/ui.js): 21 de 23. Las otras dos son `home` (rediseñada el 29/10 por otra vía) y `folder`.

## Ventanas (modales)

- 86 funciones `open*Modal` en `js/`.
- `test/modales-todas.mjs` abre 100 ventanas: 46 se abren con datos de prueba y 54 necesitan un estado que no se puede fabricar desde fuera.

## Documentos generados

Excel real del gestor (`construirXlsx`) + CSV + ZIP con facturas, ticket/factura/rectificativa, ficha técnica impresa, informes (`printReportWindow`), vale regalo, QR de mesa, contrato, hoja de sala de reservas, hoja de pedido, libro de marca (`tools/libro-marca/`).

## Pendiente de inspección visual (a 7/11, 23:50)

Ver `SEGUIMIENTO_PAGINAS.md`.
