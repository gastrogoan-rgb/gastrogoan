# Las cuatro tareas de la noche

## 1. El generador ya puede deshacer una venta

Antes solo se podía **emitir**. Ni una devolución, ni un impago, ni un error al
vender tenían arreglo: el código quedaba emitido para siempre y el cliente
dentro. A 5.000 licencias eso deja de ser un detalle.

Ahora, en cada fila del registro:

- **⊘ Anular** (códigos de negocio) — hace las **tres** cosas que hacen falta:
  lo borra de los emitidos (no se puede canjear), libera su reserva, y lo
  apunta como anulado. Ese último paso es el único que bloquea a quien **ya lo
  tenía canjeado**: su app lo comprueba al abrirse y muestra la pantalla de
  licencia revocada. Con solo los dos primeros seguiría trabajando
  indefinidamente, porque la licencia vive en su dispositivo.
- **↺ Reactivar** — deshace la anulación. Existe porque anular el código
  equivocado a las once de la noche y no poder arreglarlo hasta que alguien
  toque la base de datos a mano sería mucho peor que este botón.
- **⊘ Borrar cuenta** (cuentas de propietario) — quita el acceso y **libera el
  nombre** para poder volver a venderlo. Los negocios de esa cuenta NO se
  anulan: son licencias aparte.
- **✕ Quitar del registro** — el de antes, ahora con un aviso claro: **NO
  anula la licencia**, solo limpia tu lista de ventas. Confundir las dos cosas
  era el riesgo principal.

Las anuladas se siguen viendo, tachadas y con su fecha y motivo, y salen en el
CSV: forman parte del historial.

⚠️ **Requiere publicar las reglas nuevas** en `plataforma-gastrogoan` (están en
`reglas/`). Sin ellas un código emitido no se puede borrar: la regla anterior
solo permitía crearlo.

## 2. La demo y el vídeo, reconstruidos

La demo era una copia suelta del HTML **congelada en junio**: tres meses
después enseñaba una app que ya no existía, sin I+D ni la mitad de lo de
después.

Ahora **se genera** desde la app recién compilada (`bash demo/generar.sh`), así
que no puede volver a quedarse vieja. Con un negocio completo: Cal Ramon, un
bistró de Vic con 33 ingredientes, carta de tres bloques, un fondo oscuro
encadenado a dos platos, 1.600 ventas de tres meses, clientes con fidelidad,
turnos y reservas.

Y **el vídeo** (`dist/gastrogoan-tour.mp4`, 1m37s) se graba solo desde esa
demo, recorriendo 20 paradas con su rótulo.

Tres fallos que salieron al hacerlo, y que se habrían visto en el vídeo:

| Qué se veía | Qué era |
|---|---|
| Un plato al **3,5% de food cost** | El bacalao se compra por gramos y puse la cantidad como si fueran kilos |
| **"Error de nube"** en rojo en la cabecera | La demo no tiene nube real y el indicador lo cantaba. Lo peor que puede salir en un vídeo de venta |
| **Clientes con guiones y ceros**, y "Personal" en blanco | Nombres de campo y de pantalla inventados: `nombre` en vez de `name`, `empleados` en vez de `horarios` |
| **El resultado del mes igual que la facturación** | La demo no tenía ni un gasto. Un P&L con costes a cero es lo primero que delata una demo |
| Y al meterlos, **el mes pasado en pérdidas** | Cifras infladas. Un restaurante que pierde dinero no vende la app |

Ahora las cuentas son las de un bistró que va bien: **~15.500 € de
facturación, 31% de food cost, 13% de margen**, con nóminas, alquiler,
suministros y las compras a proveedores mes a mes. Y del mes en curso solo
entran las compras que ya habrían ocurrido: si no, el día 1 salía un mes
entero de gastos contra un día de ventas.

El último es el importante: **`navigate('empleados')` no da error, deja la
pantalla en blanco.** Se grabó un vídeo entero con el rótulo "Personal —
turnos, fichajes y nóminas" sobre un fondo vacío.

## 3. Auditoría de código

La batería entera (**31 pruebas**). Todo en verde, incluidas las nuevas del
generador y de la demo.

Un hallazgo de mantenimiento: lanzaba las 31 **a la vez**, y con la app ya en
4 MB el contenedor se queda sin aire — fallaban por caducidad de navegación
pruebas que están perfectamente bien. Eso es peor que tardar, porque manda a
investigar fallos que no existen. Ahora van **de seis en seis**
(`GG_TANDA=12 bash test/todo.sh` para subirlo en una máquina más grande).

## 4. Auditoría visual — PC, tablet y móvil

Nueva (`test/visual-real.mjs`): recorre **21 pantallas × 3 tamaños** sobre la
demo llena —que es cuando las pantallas se rompen; con cuatro filas todo cabe—
y deja **63 capturas** en `test/capturas/` para poder mirarlas a ojo.

**El hallazgo real: los botones encogían justo donde más falta hace el dedo.**
El proyecto se fijó 44 px como mínimo táctil, pero las reglas responsive iban
por **ancho de pantalla** y hacían lo contrario: a partir de 1024 px los
botones bajaban a **34-36 px** en las pantallas de trabajo (barra de
herramientas, cabecera, acciones de cada fila). Una tablet de 820 px se maneja
con el dedo, no con ratón.

Arreglado preguntando por el **tipo de puntero** en vez de por el ancho
(`pointer: coarse` = dedo). El escritorio conserva su densidad y ningún
aparato táctil baja de 44. Excepción a propósito: los +/− de la comanda del
TPV, que son una rejilla densa de 40 px pensada para el pase.

Y una lección por el camino: el primer intento **no funcionó y parecía que
sí**. Las reglas de `.toolbar .btn` llevan dos clases y pesan más que un
`.btn` a secas, así que ganaban aunque la mía fuera después. En CSS no manda
solo el orden. Verificado quitando el arreglo: la auditoría pasa de 3
hallazgos a 34.

También corregido un texto desfasado en I+D que hablaba de "en cada paso",
cuando los pasos ya no existen.

Y tres falsos positivos de mi propia auditoría, ya afinados: una tabla ancha
dentro de un contenedor que se desplaza **no** es un defecto, un teléfono
dentro de un párrafo **no** es un botón, y una pantalla legítimamente vacía
("no hay comandas pendientes") **no** está rota.

---

## Lo que te toca a ti

1. **Publicar las reglas nuevas** en `plataforma-gastrogoan` (`reglas/`). Sin
   eso, anular una licencia no funciona.
2. **Mirar el vídeo** — `dist/gastrogoan-tour.mp4`. Si el orden o los textos no
   te convencen, están en `video/guion.js` y se regraba en dos minutos.
3. Probar el generador anulando un código de prueba.
