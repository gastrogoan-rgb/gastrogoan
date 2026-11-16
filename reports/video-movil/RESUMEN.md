# Vídeo de la app en un móvil real: resumen conjunto

Vídeo de 18:40, Chrome de Android, versión de la app 15/11/2026 03:52. El móvil mide unos 360 px CSS de ancho (el vídeo está a 480×1096). Se revisó tramo a tramo (112 tramos de 10 s, 4 fotogramas por tramo, más hojas extra donde había movimiento). Las notas de cada tramo están en `bloque1.md` a `bloque4.md`.

Cuatro causas explican casi todo. Arreglarlas una vez arregla decenas de pantallas, como pide la norma de móvil de CLAUDE.md.

## Las cuatro causas de fondo

**1. Filas de «nombre + chips + importe + botones» en una sola línea.** El nombre se queda con 40-100 px y se parte a mitad de palabra o en 2-9 renglones. Lo que lo provoca: los chips y los botones no encogen y el nombre sí, y en algunos sitios hay `overflow-wrap:anywhere` o `break-all`.
- Dónde: selector de negocios («PruebasGastroGoanApp» en 9 renglones), cabecera de la comanda de mesa («Mesa / 6»), Personal («Romer / o»), Gastos Fijos, Gastos Variables, Inversiones, matriz de clientela, KPIs, fichas de mesa con tiempo.
- Arreglo único: patrón de fila para ≤430 px. Nombre a todo ancho (`flex:1 1 auto`, `min-width:8ch`, solo `overflow-wrap:break-word`, nunca `anywhere` ni `break-all`) y chips, importe y menú ⋯ en una segunda línea. Buscar y quitar todo `break-all`/`anywhere` del CSS.

**2. Tablas y cifras que no caben en 360 px.**
- Dónde: Tesorería (OBJETIVO / REAL / DIF. montadas unas sobre otras), matriz de rentabilidad (botón «REVISAR» recortado), Ventas por día, Cuenta de Resultados (se pierden la columna de meses y la de variación), «Comida o cena», cabeceras del calendario de pedidos («MAF», «DON»), alérgenos recortados en Alérgenos por plato.
- Arreglo único: en móvil, toda tabla de más de tres columnas pasa a tarjetas apiladas (`.table-cards`) con el rótulo de cada cifra delante. La cifra y su «€» van en un solo bloque `white-space:nowrap`. Si no se puede apilar, scroll horizontal con sombra y la primera columna fija. Y los alérgenos no se recortan nunca: envuelven.

**3. Texto que se pinta encima de otro (rótulos en `.table-cards`).** «PLATO/ELABORACIÓN» pisa el nombre en Alérgenos por plato y en Anulaciones del TPV; «¿Cómo se calcula?» pisa la nota de previsión; el chip contador tapa el número del día en los calendarios. Es un rótulo largo en una columna de ancho fijo. Arreglo: rótulo en su propia línea, siempre.

**4. Todo lo que cambia de pantalla o aparece solo (avisos, fundidos, cargas).**
- Aviso negro a mitad de pantalla que tapa el botón «Cobrar» («Stock justo…», «Comanda marchada a cocina», «Carta guardada», «Datos actualizados»).
- Al cambiar de pantalla el texto sale borroso o doble durante más de 1 s (fundido a media opacidad), y Sala y Gestión tardan ~1 s en blanco.
- Al abrir la app, la barra «Hay una versión nueva» tapa la frase del día aunque la app ya se esté actualizando sola, y obliga a pasar por la carga dos veces.
- Arreglo: el aviso se coloca por encima de la zona de acciones (o arriba), con tope de duración corto y sin tapar un botón principal; fundidos solo con opacidad plena al terminar; comprobar la versión durante la carga para recargar una sola vez; sin barra si la actualización es automática.

## Lo más grave, por orden de arreglo

| # | Qué | Dónde | Por qué es grave |
|---|---|---|---|
| 1 | «(Contenido pendiente de definir)» aparece 25 veces entre las tareas atrasadas, también en el Día 19 y en el balance | Plan 360º, app del negocio | Un cliente que lo vea pensará que el producto está sin terminar. Es lo más vendible de la app. |
| 2 | Nombres partidos letra a letra | Selector de negocios, comanda de mesa, Personal | Es lo primero que ve el hostelero al entrar. |
| 3 | Cifras de dinero superpuestas y tablas cortadas | Tesorería, Cuenta de Resultados, Ventas por día | Dinero que no se puede leer. |
| 4 | Alérgenos recortados por el borde, sin señal de que hay más | Alérgenos por plato | Seguridad alimentaria. |
| 5 | Avisos negros que tapan «Cobrar» | TPV | Se ve en pleno servicio. |
| 6 | Tour guiado: hoja casi a media pantalla, botones cortados por abajo, focos que señalan huecos vacíos o algo que no es lo explicado | Todos los pasos | El primer contacto con la app. |
| 7 | Comandas Cocina con scroll horizontal que arrastra toda la página, y tickets de alto fijo con scroll interno | Comandas Cocina | Pantalla de servicio. |
| 8 | Teclado de letras en los campos de importe y cantidad | Escandallo, recepción de pedidos | Fricción en lo más frecuente: añade `inputmode="decimal"`. |
| 9 | Tiempos de mesa en minutos crudos («8662'», «hace 690 min») | TPV, Comandas | Rompe la ficha de la mesa; mostrar «hace 2 d» o «hace 3 h» a partir de cierto tope. |
| 10 | Stock con «+»: al guardar, la lista se repinta y el scroll salta arriba | Stock | Se pierde el sitio. |

## Los fallos que se repiten por toda la app

- **Espacios muertos** (norma del 7/11): botones solos en su fila con medio ancho vacío («Hoy», «Imprimir el día», «Nueva reserva», «Historial de vales», «Vale regalo», el ⋯ de Personal). Subir cada acción a una fila que ya existe.
- **Pestañas y filtros en 3-6 filas** antes del contenido: Promoción (6), Clientes (9 filtros), mesas del TPV, APPCC, Calendario, Gestión Económica (7 pestañas, 6 filas, y la activa cambia de sitio). Envolver está bien, pero con filtros tan largos conviene un desplegable en móvil o una sola fila con «más».
- **Formatos de máquina**: fechas «2026-11-11» (`fechaImpresaLegible`, `ggPeriodoHtml`), «8.8/10» con punto, plurales mal («1 platos», «1 grupos», «1 PLATO»).
- **Lo elegido en negro y no en verde oliva** (norma del 7/11): foco del «+», número de paso, iconos «P» del propietario, alérgenos elegidos, tira semanal de «Mi puesto», calendarios, pestañas del chat. Rayas negras gruesas en las tarjetas del Plan 360º.
- **Contraste y tamaño**: etiquetas mono y textos de ayuda en gris claro (< 4,5:1) y por debajo de 11 px. Botones «Ver» y «Copiar enlace» sin caja y por debajo de 44 px.
- **Textos de ayuda largos a la vista** (5-8 renglones) en Escandallo, recepción y Mega Lista. Plegarlos tras un «¿?».
- **Frases de PC en una app táctil** («pasa el ratón», «click para plegar»).
- **El botón de «atrás» con distinto nombre** según la pantalla («VOLVER», «INICIO», «← Categoría»), y en el acceso va a la derecha.
- **Cifra y «€» en renglones distintos**, cabeceras plegables en mono mayúsculas partidas en 2-3 renglones con «AUTO» colgando solo.
- **Tarjetas altísimas o estiradas** por la vecina: mesas del TPV (350 px), Personal, Distribución, Stock (~190 px por producto). Con `align-items:start` en la rejilla.
- **Sin traducir**: «Manager needs help right now» en el chat; «CAPEX» sigue en dos sitios en vez de «Inversiones».
- **Contradicciones de datos**: «VENCIDO» con «estado ok» en Mantenimiento; «Descanso» con 0/2 tareas y 12 atrasadas.
- **Selector nativo de Android** en «¿Es deducible?» (frente al resto de selectores de la app).

## Lo que está bien

Pantalla de carga limpia; formulario de propietario con el usuario recordado y el teclado que no tapa «Desbloquear» ni «Abrir mesa»; campos que no hacen zoom; Inicio como página fija; nombre y precio claros en las filas de Mega Lista y de Pedidos; menú ⋯ con acciones de 44 px; ventana «Marcar plato agotado»; chips de días de reparto en oliva; el contador «×N» y los totales de la comanda se actualizan al instante.

## Cautelas

- Los revisores marcaron algunos fotogramas como **no concluyentes** (fantasmas de compresión del vídeo, o sin título para saber a qué pantalla pertenecen). Están así en las notas.
- La versión del vídeo es de las 03:52 del 15/11. Cosas como el tour o los avisos pueden haberse tocado después: **antes de arreglar nada, reproducir cada fallo en 360 px con las pruebas** (`test/movil-lectura.mjs`, `test/ventanas-visibles.mjs`).
- Los duplicados de Mega Lista («Arroz bomba» ×10) parecen datos de la siembra de la cuenta de pruebas, no un fallo de la app.
- Las pruebas actuales miden la primera pestaña de cada pantalla y datos de un negocio lleno; este vídeo muestra varios fallos que no cazan, sobre todo **tablas con datos reales** y **textos largos**. Conviene añadirlas.
