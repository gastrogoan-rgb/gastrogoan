# Pendientes del vídeo móvil — NO se da por cerrado hasta que todo esto esté hecho (norma del dueño, 16/11)

## Paquetes aún por terminar
- [x] Paquete 3 · Gestión Económica + Panel (juntado; quedan los puntos de abajo)
- [x] Paquete 2 · TPV, Comandas, Reservas, Promoción, Clientes (juntado; quedan los puntos de abajo)
- [ ] Paquete 4 · Cocina, Personal, Limpieza, Stock, Escandallo (parado, ídem)

## Lo que los paquetes 1 y 5 dejaron sin hacer
- [ ] `fmtMoney` (js/i18n.js): cifra y «€» separados en dos líneas → espacio duro `' €'`; hay que correr las ~52 pruebas que comparan «N €» y ajustarlas.
- [ ] ~1 s en blanco al entrar en Sala y Gestión (medir con CPU limitada y arreglar).
- [ ] Doble pantalla de carga al actualizar (medir).
- [ ] Botones «Ver» y «Copiar enlace» sin caja y < 44 px (localizar).
- [ ] El «+» con foco en negro y los iconos «P» del propietario en negro (localizar, pasar a oliva).
- [ ] Textos de ayuda largos: plegarlos tras un «?» con `.gg-ayuda` (Escandallo, recepción, Mega Lista, Manual).
- [ ] Aplicar `.gg-fila` a Personal, Gastos Fijos/Variables, Inversiones, matriz de clientela (paquetes 3 y 4).
- [ ] Aplicar `.gg-pest-col` a Promoción, Clientes, Gestión Económica, APPCC, mesas del TPV.
- [ ] Ventana «Nube»: el código de licencia sale entero; enmascararlo.
- [ ] Visión global, Mi Negocio, Novedades, Proveedores, Oferta, I+D, Mi Negocio en móvil: no se han abierto en este repaso.
- [ ] Manual: plegar las tarjetas de aviso largas.
- [ ] `admin-panel/plan360.html` (coach): sigue enseñando el relleno «(Contenido pendiente de definir)».
- [ ] Comprobar que las pruebas nuevas FALLAN sin los arreglos (paquetes 1, 2, 3, 4, 5).

## Lo que el paquete 3 dejó sin hacer
- [ ] Fechas ISO («2026-11-10») y «8.8/10» con punto en Gestión/Panel (fechaImpresaLegible, coma según idioma).
- [ ] «¿Cómo se calcula?» a ancho completo en Cuenta de Resultados y demás pantallas de Gestión (espacio muerto).
- [ ] Panel: ceros de ~240 px, globos de cifra en los extremos, etiquetas de los 12 meses.
- [ ] Contraste de ayudas en gris claro: revisión exhaustiva (solo se tocaron tres sitios).
- [ ] Icono de «Análisis de Platos»: el que se puso no existe en la fuente recortada (revisar `tools/recortar-iconos.py`).
- [ ] `economia-equilibrio` no terminó y `movil-lectura` no terminó en 270 s: correrlas enteras al juntar.

## Lo que el paquete 2 dejó sin hacer
- [ ] «Cobrar 0,00 €» desactivado con poco contraste en el TPV.
- [ ] Estado vacío de «Mías + exterior» (mensaje poco claro).
- [ ] Textos de las ventanas «Abrir mesa» y «Marcar bebida agotada».
- [ ] Comprobar que el aviso negro ya no tapa «Cobrar» en el TPV (lo hizo el paquete 1; no se verificó en el TPV).
- [ ] Correr `movil`, `movil-lectura` y `ventanas-visibles` enteras (no se corrieron).
- [ ] Del resto de las 112 notas del vídeo (TPV, Reservas, Clientes) solo se hicieron los 11 puntos del encargo: repasar las notas de esos tramos y cerrar lo que quede.

## Al juntar todo (lo hago yo)
- [ ] Batería completa `bash test/todo.sh` en verde (y con `GG_FECHA` de otra hora).
- [ ] `bash build.sh` + `bash deploy/actualizar.sh`, merge a `main`, decir al dueño qué sello de versión mirar y qué pantallas comprobar.
- [ ] Repetir el vídeo de móvil tras publicar y comparar.

## Estado a 16/11 17:01 (publicado en main, sello «16/11/2026 17:01»)
Hecho y publicado: paquetes 1, 2, 3, 4 y 5; parpadeo; alérgenos de comensales en Comandas Cocina; VIP ≠ Recurrentes; aviso de anclar a la pantalla de inicio; enlace de compra nuevo; campana sin aro rojo. Batería completa en verde.

### Lo que sigue SIN hacer (hay que cerrarlo)
- [ ] Paquete 4: pasos de la ficha técnica en mayúsculas (no reproducido), «Ocup./Serv.» y «12 atrasadas» repetidas y «Verlas» duplicado en Distribución, «jabr» cortado y «VENCIDO» con «estado ok» en Mantenimiento, ayuda de Mega Lista sin plegar, «Sin precio» y chips de contraste, iconos «P» y foco del «+» en negro, alto de la tarjeta de Stock (~135 px), plurales sueltos en Distribución.
- [ ] Paquete 2: «Cobrar 0,00 €» con poco contraste, estado vacío «Mías + exterior», textos de «Abrir mesa» y «Marcar bebida agotada», comprobar que el aviso negro no tapa «Cobrar».
- [ ] Paquete 3: «¿Cómo se calcula?» a ancho completo, ceros de 240 px y globos del Panel, contraste de ayudas, icono de «Análisis de Platos».
- [ ] Paquete 1: cifra y «€» sin partir en `fmtMoney` (espacio duro; ajusta ~52 pruebas), segundo en blanco al entrar en Sala/Gestión, doble pantalla de carga, botones «Ver»/«Copiar enlace» sin caja.
- [ ] Paquete 5: ventana «Nube» enseña el código de licencia entero (enmascararlo), Visión global/Mi Negocio/Novedades sin repasar, plegar avisos largos del Manual, `admin-panel/plan360.html` aún enseña el relleno.
- [ ] Comprobar que las pruebas nuevas FALLAN sin los arreglos.
- [ ] Repetir el vídeo en el móvil tras esta versión y comparar.
- [ ] Parpadeo: si vuelve a pasar, mirar `ggDiagRepintados()` en la consola (guarda de dónde viene cada repintado).

## Añadido el 17/11
- [ ] Manual: el capítulo de TPV/Pedidos online no explica la barra de pedidos (Cocina saturada, Alarma, Pedido por teléfono, Mi reparto, Pantalla de listos) ni dónde están ahora Captación y Tiempos de entrega (Mi Negocio › Pedidos online). Escribirlo en es/ca/en.
