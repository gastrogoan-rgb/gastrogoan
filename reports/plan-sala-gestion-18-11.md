# Plan Sala + Gestión (18/11) — pedido por el dueño, SIN agentes, uno a uno, calidad antes que velocidad

Norma del dueño: hacer yo mismo, paso a paso, aprobar cada cambio con prueba, y al acabar haber hecho ABSOLUTAMENTE todo.

## TPV · comanda (prioridad máxima; PDA clásica; vale para mesa, take away y delivery)
- [x] T1 Cabecera de la ventana: «Mesa N · X pers.» centrado; debajo, pequeños y juntos, «Cambiar de mesa» y «Alérgenos»; quitar chip «Propietario» (solo se ve en la vista general de mesas).
- [x] T2 Alérgenos: quitar el recuadro repetido «Alérgenos presentes»; en cocina, aviso discreto con botón que despliega.
- [x] T3 Pestañas Tomar nota / Pedido: «Tomar nota» pequeña, «Pedido N total» grande y sin desbordar.
- [x] T4 (verificado a 320 y 360) Pedido: cada plato en UNA línea (cantidad · nombre · precio), botones más pequeños; apartados de menú y carta bien separados; título Menú/Carta más visible; «Marchar» sin recolocar nada.
- [x] T5 (test/tpv-scroll.mjs; falta registrar en todo.sh y revisar otras pantallas) Marchar plato NO sube la pantalla arriba (revisar toda la app: scroll preservado al repintar).
- [x] T6 (test/tpv-tomar-nota-pda.mjs) Tomar nota: cartas en desplegable; secciones/platos compactos; selección elegida visible en un desplegable inferior (estilo Take Away/Delivery de la web).
- [~] T7 (pestañas con reparto envueltas y nombre de menú sin repetir hechos; falta captura de delivery) Delivery/Take away del TPV: mismo trato (pestañas sin desbordar, nombre de menú no repetido).
- [ ] T8 Vale/tique: revisar (captura del dueño).
## Resto de Sala
- [ ] S1 Anulaciones y arqueos: solo mes en curso con selector de periodo.
- [ ] S2 Reservas: filas desplegables (hora · nombre · personas; resto al desplegar); título de fecha sin cortar; «Hoy»/«Imprimir»/«Nueva» sin filas sueltas; semana compacta.
- [ ] S3 Promoción: quitar botón «más», ver todo directamente.
## Gestión
- [ ] G1 Mi Negocio horario: turnos en una línea, selects pequeños; «Por turnos» limpio.
- [ ] G2 Mi Negocio: «Zonas con tarifa propia» y «Códigos promocionales» no hacen nada al escribir → revisar que guardan y se usan; auditar el resto de campos sin efecto.
- [ ] G3 Panel: Semana/Mes al lado del título de cada bloque; textos superpuestos (gráfico equilibrio); avisos alineados.
- [ ] G4 Gestión Económica: quitar el botón «más» de las secciones.
- [ ] G5 Existencias a fin de mes: revisar cálculo y lógica.
- [ ] G6 Quitar «fiabilidad» de toda la app (sin romper el motor ni las pruebas).
- [ ] G7 Punto de equilibrio: maquetar sublime (cifras desbordadas en móvil).
## Web pública
- [ ] W1 Flecha de cada opción de entrada centrada/bien.
- [ ] W2 Menús: tarjeta con título y precio + «i» con lo que lleva.
- [ ] W3 Carta: quitar «evitar alérgenos».
## Respuestas
- Copo de nieve = «mesa fría» (servida hace rato sin cobrar).

## Verificación final
Al terminar: releer el mensaje del dueño frase a frase, mapear cada petición a un punto de este plan y a una prueba o captura a 360 px, y marcar solo lo comprobado. Lo no comprobado se dice.
