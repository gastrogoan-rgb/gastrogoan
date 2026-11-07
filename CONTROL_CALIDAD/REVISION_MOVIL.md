# Revisión de la vista móvil — 7/11/2026

## Cómo se hizo (y qué NO se hizo)
- Capturas reales en Chromium con el negocio de prueba lleno, móvil emulado (`isMobile`, táctil), **desplazando cada pantalla entera**, incluidas **47 estados** (pantallas + pestañas internas: Elaboraciones, Historial, Calendario, Temperaturas, Alérgenos, Semana/Mes, Novedades, Clientes, Ideas, 8 pestañas de Gestión…).
- Revisión **a ojo** a **390 px** (todas) y **320 px** (las que se aprietan: Tesorería, Mi Negocio, APPCC, TPV, Comandas, Reservas, Stock, Mega Lista, Promoción, Clientes). **360 px** capturado completo pero revisado a ojo solo en parte.
- Revisión **automática** en **320, 360, 390, 412 y 430** con `test/movil-lectura.mjs` (47 estados + 7 ventanas).
- **No revisado a ojo:** 412 y 430 px; horizontal; ≈79 ventanas; pestañas de Gestión en 320 salvo Tesorería; iPhone/Android reales (**no se ha probado en un aparato**: el zoom de Safari es un fallo conocido por su comportamiento, no observado aquí).

## Lo encontrado y corregido
Ver `INCIDENCIAS.md` I-11 a I-19. Lo más grave:
1. **Campos a 13 px** en todos los buscadores y 98 de los 123 campos de Mi Negocio → en iPhone, zoom involuntario de toda la página al escribir.
2. **Tesorería**: texto en columna de una letra por línea (33 líneas para 7 palabras).
3. **Mi Negocio de 16.854 px** → acordeón de 2.103 px.
4. APPCC: lecturas de 7 líneas y botón «⋯» cortado por la izquierda.

## Por qué las pruebas no lo veían
`movil.mjs` mide la primera pestaña de cada pantalla y solo elementos «hoja». Los tres fallos graves estaban en pestañas internas, en un campo de formulario o en un texto que cuelga de un elemento con icono. `movil-lectura.mjs` cubre las tres cosas y **falla sin los arreglos** (comprobado).

## Pendiente
- Revisión a ojo a 412/430 y en horizontal.
- Pantallas largas por contenido real: Panel de Control (**14.047 px**), Gestión Económica pestañas Tesorería (5.164 px) y Punto de equilibrio (3.601 px). Son largas por contenido, no por un defecto, pero habría que decidir si se pliegan.
- Mega Lista / Stock: una carpeta por fila (2.000-2.300 px); dos por fila exigiría quitar iconos en 320 px.
- Botón «⋯» de Stock en una fila suelta tras «Anotar merma».
