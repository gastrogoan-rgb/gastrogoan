# Pendientes del vídeo móvil — NO se da por cerrado hasta que todo esto esté hecho (norma del dueño, 16/11)

## Paquetes aún por terminar
- [ ] Paquete 3 · Gestión Económica + Panel (reanudado, trabajando)
- [ ] Paquete 2 · TPV, Comandas, Reservas, Promoción, Clientes (parado, su trabajo está en su worktree)
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

## Al juntar todo (lo hago yo)
- [ ] Batería completa `bash test/todo.sh` en verde (y con `GG_FECHA` de otra hora).
- [ ] `bash build.sh` + `bash deploy/actualizar.sh`, merge a `main`, decir al dueño qué sello de versión mirar y qué pantallas comprobar.
- [ ] Repetir el vídeo de móvil tras publicar y comparar.
