# Seguimiento por página — 7/11/2026

Estados permitidos: PENDIENTE · INSPECCIÓN EN CURSO · INSPECCIONADA · REDISEÑO EN CURSO · IMPLEMENTADA · VALIDACIÓN PENDIENTE · VALIDADA · BLOQUEADA.

**Alcance de «inspeccionada»:** captura real en Chromium con el negocio de prueba lleno (`dist/ggburger.json`), a **390 px y 1280 px**, **primera pantalla (sin scroll)** y revisada a ojo. Las pestañas internas y los estados que exigen scroll **no** cuentan salvo que se diga. **«VALIDADA» = defecto corregido, recapturado y batería en verde**, no «perfecta».

## App de gestión

| Página | Estado | Observaciones |
|---|---|---|
| Inicio | INSPECCIONADA | Sin defectos en 390/1280. (La primera captura salió con la pantalla de carga: error de mi script, no de la app.) |
| Carpeta Cocina | INSPECCIONADA | Sin defectos. |
| Carpeta Sala | VALIDADA | **Defecto:** el módulo I+D enseñaba `module.sala.idr.name/desc`. Textos añadidos en es/ca/en. Prueba permanente nueva. |
| Carpeta Gestión | INSPECCIONADA | En móvil la lista se centra con un hueco arriba: es decisión documentada en el CSS, no se toca. |
| Comandas Cocina | INSPECCIONADA | Botones compactos aceptados por el dueño (9/09). Botón «Empezar todo junto» en negro: decisión de ticket, no se toca. |
| Oferta Gastronómica | VALIDADA | **Defecto:** las dos cifras de arriba salían apiladas y la segunda sangrada en móvil. Ahora lado a lado. |
| I+D (Cocina) / I+D de Sala | INSPECCIONADA | Faltaban en la lista de `movil.mjs` (hueco de esa prueba). |
| Mega Lista | INSPECCIONADA | Sin defectos. |
| Escandallo | INSPECCIONADA | Solo pestaña Platos. |
| Fichas Técnicas | INSPECCIONADA | Solo pestaña Platos. |
| Proveedores | INSPECCIONADA | Sin defectos. |
| Pedidos | INSPECCIONADA | Solo «Realizar pedido» vacío. |
| Stock | VALIDADA | Franja de cifras con celda impar: ahora la última ocupa la fila. |
| Personal (Horarios) | VALIDADA | Ídem. Pestaña Calendario sin inspeccionar. |
| Distribución del Trabajo | VALIDADA | **Defecto:** celda huérfana con borde. Corregido. |
| APPCC e Higiene | VALIDADA | **Defecto:** ídem (5 celdas en 2 columnas). Corregido. Solo pestaña Apertura/Cierre. |
| TPV | INSPECCIONADA | Sin defectos en la primera pantalla. |
| Reservas | INSPECCIONADA | Solo vista Día. |
| Clientes | INSPECCIONADA | Solo lista. |
| Promoción | VALIDADA | Franja de cifras; solo vista Día. |
| Panel de Control | INSPECCIONADA | Solo primera pantalla. |
| Gestión Económica (8 pestañas) | VALIDADA | **Defectos:** pestaña activa en NEGRO (resto de la app: verde); aviso fiscal y lista de pendientes empujaban pestañas y contenido fuera de la primera pantalla en móvil. Ahora pestañas arriba, activa en verde, lista plegada en móvil. Solo primera pantalla de cada pestaña. |
| Mi Negocio | INSPECCIONADA | Solo arriba. El índice «Ir a:» ocupa ~400 px en móvil (ver INCIDENCIAS). |
| Manual de uso | INSPECCIONADA | Sin defectos. |
| Plan 360 (vista del negocio) | INSPECCIONADA | Faltaba en `movil.mjs`. |

## Ventanas (86 `open*Modal`)

| Ventana | Estado |
|---|---|
| Enviar al gestor | VALIDADA — **defecto:** el botón «Enviar / compartir» salía cortado («nviar / compar») en 390 px. Corregido. |
| Abrir mesa, Centro de ayuda, Nueva reserva, Nuevo cliente, Nuevo empleado, Nuevo ingrediente | INSPECCIONADA |
| Resto (≈79) | **PENDIENTE de inspección visual.** Comprobadas solo por comportamiento en `test/modales-todas.mjs` (abre 100, 0 revientan tras el arreglo de hoy) |

## Entrada y accesos

| Página | Estado | Observaciones |
|---|---|---|
| Selector de idioma de la entrada | VALIDADA | Medía 44×26 en móvil y tablet (27 hallazgos de `acceso-alta`). Ahora 44 px: 0 hallazgos. |
| Pantalla de entrada (Propietarios / Empleados) | INSPECCIONADA | Captura a los 2 s; la tarjeta se ve atenuada (probable animación en curso, **no confirmado**). |
| Selector de negocios, asistente de nube, tour guiado, chat | **PENDIENTE** | No inspeccionados visualmente esta noche. `sin-salida.mjs` y `acceso-alta.mjs` cubren su recorrido. |

## Web pública (`reservagastrogoan.html`)

| Pantalla | Estado | Observaciones |
|---|---|---|
| Selector de servicio, elegir (delivery/carta), hoja de extras, seguimiento de pedido, seguimiento de reserva, edición de reserva | VALIDADA | Raya negra, filetes, controles negros y barras de acento quitados; botones verdes; seguimiento en verde; botones de edición igualados. 24 casos de `web-publica-pasos` + `descripcion-plato` en verde. |
| Error, saturación, elegir local, encuesta NPS, pedido en mesa | INSPECCIONADA | Revisadas en la tanda anterior; no se han vuelto a capturar tras el cambio de hoy. |

## Otras superficies

| Superficie | Estado | Observaciones |
|---|---|---|
| Generador de licencias (login) | INSPECCIONADA | Privado. Solo la pantalla de acceso (el resto exige credenciales de admin). 94 emojis en el fichero. |
| Panel del coach `index.html` | INSPECCIONADA | Solo login. |
| Panel del coach `app.html`, `plan360.html` | PENDIENTE | No inspeccionados. |
| Web comercial `deploy/web/public/index.html` | INSPECCIONADA | Solo la portada, a 390/1280. Faltan ~10 páginas (es/ca/en). |
| `landing.html`, `catalogo.html` | INSPECCIONADA | **No se publican** y son de la identidad antigua (naranja). Ver INCIDENCIAS. |
| Impresos y exportaciones (PDF, Excel, CSV, ticket, ficha) | PENDIENTE | Cubiertos por pruebas de contenido (`paquete-gestor`, `impresion`, `auditoria-contable`); **diseño no revisado visualmente esta noche**. |

## Cobertura real (cada métrica por separado)

| Métrica | Valor | Base |
|---|---|---|
| Páginas de la app inventariadas | 100 % | 33 estados (23 vistas + 3 carpetas + 8 pestañas de Gestión – solapes) |
| Páginas de la app inspeccionadas **a ojo** (primera pantalla, 2 anchos) | 33 / 33 | no incluye pestañas internas ni scroll |
| Páginas con defecto corregido y VALIDADAS | 15 / 33 | Sala, Oferta, Stock, Personal, Distribución, APPCC, Promoción + 8 pestañas de Gestión Económica |
| Ventanas inspeccionadas a ojo | 7 / 86 (8 %) | |
| Ventanas ejercitadas por comportamiento | 46 abiertas de 100 candidatas | |
| Pruebas de la batería en verde | 149 + 2 fallos conocidos → ver PRUEBAS.md | |
| Documentos descargables revisados visualmente | 0 | |
