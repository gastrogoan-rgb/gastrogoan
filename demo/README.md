# La demo y el vídeo

Dos cosas que **se generan**, no se mantienen a mano. La anterior era una copia
suelta del HTML congelada en junio: tres meses después enseñaba una app que ya
no existía, con la mitad de los módulos sin aparecer.

```bash
bash build.sh          # la app
bash demo/generar.sh   # → dist/kit-gastrogoan-DEMO.html
node video/grabar.mjs  # → dist/gastrogoan-tour.mp4   (necesita el servidor en :8950)
```

## Cómo funciona

`demo/generar.sh` coge `dist/index.html` recién compilado y le inyecta dos
ficheros antes de `</body>`:

- **`demo/datos.js`** — el negocio de ejemplo: Cal Ramon, un bistró de Vic.
- **`demo/sembrar.js`** — lo carga en la base de datos y quita los asistentes
  del alta.

**No se toca ni una línea de la app.** Por eso la demo siempre enseña
exactamente lo que se vende.

⚠️ Se inyecta en el **ÚLTIMO** `</body>`. Dentro del JavaScript de la app hay
plantillas de impresión que contienen esa cadena en un texto: cortando por el
primero se parte el script en dos y la app no carga — y encima la demo "abre"
y parece medio bien.

## Los datos tienen que ser creíbles

Un hostelero detecta una demo falsa en diez segundos. Por eso `test/demo.mjs`
comprueba que **el food cost de todos los platos esté entre el 12% y el 45%**:

- Se coló un bacalao a 0,16 €: el ingrediente se compra por GRAMOS y la
  cantidad estaba puesta como si fueran kilos. El plato salía al 3,5%.
- Y una escalivada al 7%, porque le faltaban la mitad de los ingredientes.

También comprueba que las pantallas salgan **llenas**: clientes, reservas y
ventas usan los nombres de campo REALES de la app (`name`, `phone`, `date`,
`clientName`…). Inventárselos no rompe nada — pinta una tabla de guiones, que
en un vídeo de venta es peor.

Y que haya **ventas de hoy**: el TPV y el panel enseñan justo esas cifras, y
con solo datos de días anteriores salían a cero.

## El vídeo

`video/guion.js` es el recorrido: a dónde va, qué rótulo sale y cuántos
segundos. Cambiar el orden o los textos no obliga a tocar el motor.

El rótulo y el cursor se dibujan **dentro de la página**, no con ffmpeg: así
usan la misma tipografía y colores que la app.

La demo fuerza el indicador de nube en verde. No se conecta a ninguna nube de
verdad —sería inaceptable que escribiera en la de alguien—, pero sin eso la
cabecera salía con **"Error de nube" en rojo**: lo peor que puede aparecer en
un vídeo de venta, y contando algo que no es cierto de la app real.
