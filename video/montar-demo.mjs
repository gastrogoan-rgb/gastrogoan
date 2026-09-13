/* Monta el vídeo de demo final:
 *
 *   [grabación real del dueño abriendo app.gastrogoan.com desde Google]
 *        ↓ fundido
 *   [recorrido por la app entera, grabado con el motor]
 *
 * La apertura tiene que ser real: un navegador de verdad, escribiendo la
 * dirección. Es lo que dice "esto se abre en dos segundos y ya está", y es
 * justo lo que no se puede fingir con capturas del interior de la app.
 *
 * De la grabación del dueño se recorta la franja inferior (la barra de
 * botones del sistema de la tablet, que no pinta nada en una demo) y se
 * acelera: el tecleo se ve, pero no se hace largo.
 *
 *   node video/montar-demo.mjs [apertura.mp4]
 */
import { spawn } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import fs from 'node:fs';

const APERTURA = process.argv[2] || 'video/apertura-google.mp4';
const RECORRIDO = 'dist/gastrogoan-recorrido.mp4';
const SALIDA = 'dist/gastrogoan-demo.mp4';

/* Mismo tamaño que el recorrido (ver ANCHO/ALTO en motor.mjs). La apertura
   viene de una tablet en 16:10: se le quita la barra de botones del sistema
   (abajo del todo, no pinta nada en una demo) y el resto se mete ENTERO,
   con dos franjas laterales del color de la app. Recortarla a 16:9 partía
   el teclado por la mitad, que quedaba peor que las franjas. */
const BARRA_SISTEMA = 82;   // píxeles de la barra de Android, abajo
const ANCHO = 1600, ALTO = 900;
const VELOCIDAD_APERTURA = 1.6;   // el tecleo se sigue leyendo
const FUNDIDO = 0.5;              // segundos de transición

if(!fs.existsSync(APERTURA)){
  console.error(`No encuentro la apertura: ${APERTURA}`);
  console.error('Pásala como argumento: node video/montar-demo.mjs <grabacion.mp4>');
  process.exit(1);
}
if(!fs.existsSync(RECORRIDO)){
  console.error(`No encuentro el recorrido (${RECORRIDO}). Grábalo antes: node video/grabar-recorrido.mjs`);
  process.exit(1);
}

const duracion = async file => new Promise((resolve, reject) => {
  const p = spawn(ffmpeg, ['-hide_banner', '-i', file]);
  let txt = '';
  p.stderr.on('data', d => txt += d);
  p.on('close', () => {
    const m = txt.match(/Duration: (\d+):(\d+):([\d.]+)/);
    if(!m) return reject(new Error('no se pudo leer la duración de ' + file));
    resolve(+m[1]*3600 + +m[2]*60 + parseFloat(m[3]));
  });
});

const dA = await duracion(APERTURA);
const dB = await duracion(RECORRIDO);
const dAFinal = dA / VELOCIDAD_APERTURA;
const corte = Math.max(0, dAFinal - FUNDIDO);

/* xfade encadena los dos trozos con un fundido de verdad (no un corte seco)
   y `setpts` acelera la apertura. El recorrido NO se toca: ya va al ritmo
   que toca y sus rótulos están medidos. */
const filtro = [
  `[0:v]crop=iw:ih-${BARRA_SISTEMA}:0:0,scale=-2:${ALTO}:flags=lanczos,`
    + `pad=${ANCHO}:${ALTO}:(ow-iw)/2:0:color=0x1C1A17,`
    + `setpts=PTS/${VELOCIDAD_APERTURA},fps=25,format=yuv420p[a]`,
  `[1:v]scale=${ANCHO}:${ALTO},fps=25,format=yuv420p[b]`,
  `[a][b]xfade=transition=fade:duration=${FUNDIDO}:offset=${corte.toFixed(2)}[v]`,
].join(';');

console.log(`Apertura: ${dA.toFixed(1)}s → ${dAFinal.toFixed(1)}s a ${VELOCIDAD_APERTURA}×`);
console.log(`Recorrido: ${dB.toFixed(1)}s · fundido a los ${corte.toFixed(1)}s`);

const args = [
  '-y', '-v', 'error',
  '-i', APERTURA,
  '-i', RECORRIDO,
  '-filter_complex', filtro,
  '-map', '[v]',
  // Sin audio a propósito: la grabación original lleva el ruido de la sala.
  '-an',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '22',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
  SALIDA,
];
const cod = await new Promise(r => spawn(ffmpeg, args, {stdio:['ignore','inherit','inherit']}).on('close', r));
if(cod !== 0){ console.error('ffmpeg falló'); process.exit(1); }

const total = await duracion(SALIDA);
const mb = (fs.statSync(SALIDA).size / 1048576).toFixed(1);
console.log(`\n✅ ${SALIDA} · ${Math.floor(total/60)}m${String(Math.round(total%60)).padStart(2,'0')}s · ${mb} MB`);
