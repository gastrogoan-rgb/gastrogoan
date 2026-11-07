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

## Segunda tanda (7/11, tarde): lo que quedaba
- **Panel de Control 14.047 → 2.440 px** y **Tesorería 5.164 → 3.073 px** (secciones plegables solo en móvil, con el estado recordado).
- **Mega Lista 2.315 → 1.623 px** y **Stock 1.998 → 1.495 px** (carpetas a dos por fila, también a 320 px).
- Lo «elegido» que seguía en negro, ahora en verde.
- **Anchos revisados a ojo:** 320, 360 (capturado, revisado en parte), 390 y 430 (4 pantallas), y **móvil en horizontal** (667×375, 4 pantallas). 412 solo con la prueba automática.
- **Ventanas:** 15 en la prueba automática (7 + 8 nuevas) y 11 vistas a ojo a 390 px. Siguen sin verse a ojo ≈70 de las 86.

## Pendiente
- Ventanas restantes a ojo; 412 px a ojo; PDF/Excel/tickets.
- Gestión Económica: Beneficio y caja (3.982 px) y Punto de equilibrio (3.601 px) siguen largas; no se han plegado.
- iPhone/Android reales: no probado en aparato.
