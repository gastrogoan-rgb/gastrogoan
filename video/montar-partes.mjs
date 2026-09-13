/* Monta el vídeo de demo a partir de la grabación REAL del dueño, que llega
 * partida en trozos (la grabación entera son 380 MB y no cabe de una pieza).
 *
 *   node video/montar-partes.mjs parte1.mp4 parte2.mp4 ... [--salida x.mp4]
 *
 * Qué hace con cada trozo:
 *   · le quita la barra de botones del sistema de la tablet (abajo del todo),
 *   · lo normaliza al mismo lienzo (16:9) sin deformar nada — la tablet graba
 *     en 16:10, así que entra entero con dos franjas del color de la app,
 *   · lo acelera (el recorrido se ve igual de claro, pero no se hace largo),
 *   · y los encadena entre sí con un fundido, no con un corte seco.
 *
 * Los trozos que NO se quieren (el rato en que se abrieron sin querer los
 * ajustes de la tablet) se recortan con CORTES, por segundo y dentro de la
 * parte que sea: es más fiable que pedir que se vuelva a grabar.
 */
import { spawn } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import fs from 'node:fs';
import path from 'node:path';

const ANCHO = 1600, ALTO = 900, FPS = 25;
const BARRA_SISTEMA = 82;     // píxeles de la barra de Android, abajo
const VELOCIDAD = 2.2;        // ritmo general del recorrido
const FUNDIDO = 0.4;          // segundos de transición entre trozos
const FONDO = '0x1C1A17';     // el negro de la app, para las franjas

/* Trozos a QUITAR, por nombre de archivo (basename) y segundos del original.
   Se rellena cuando se localiza algo que no debe salir — ajustes de la
   tablet, un menú del navegador, un error al tocar donde no era. */
const CORTES = {
  // 'parte3.mp4': [[72, 95]],
};

const args = process.argv.slice(2);
const iSalida = args.indexOf('--salida');
const SALIDA = iSalida >= 0 ? args[iSalida+1] : 'dist/gastrogoan-demo.mp4';
const partes = (iSalida >= 0 ? args.slice(0, iSalida) : args).filter(Boolean);
if(!partes.length){
  console.error('Uso: node video/montar-partes.mjs parte1.mp4 [parte2.mp4 ...] [--salida dist/x.mp4]');
  process.exit(1);
}
for(const p of partes) if(!fs.existsSync(p)){ console.error('No existe: ' + p); process.exit(1); }

const correr = (argv, etiqueta) => new Promise((resolve, reject) => {
  const p = spawn(ffmpeg, argv, {stdio:['ignore','ignore','pipe']});
  let err = '';
  p.stderr.on('data', d => err += d);
  p.on('close', c => c === 0 ? resolve() : reject(new Error(`${etiqueta} falló:\n${err.slice(-1500)}`)));
});

/* Cada trozo puede venir de dos sitios: la grabadora de la tablet (1920×1200,
   con la barra de botones de Android abajo) o ya exportado desde el editor
   del móvil (1920×1080, recortado). Aplicar el recorte de la barra a un
   vídeo ya recortado se comía contenido de verdad, así que se mira el
   tamaño real y solo se recorta lo que hace falta. */
const medidas = file => new Promise((resolve, reject) => {
  const p = spawn(ffmpeg, ['-hide_banner', '-i', file]);
  let txt = '';
  p.stderr.on('data', d => txt += d);
  p.on('close', () => {
    const m = txt.match(/Video:.*?, (\d{2,5})x(\d{2,5})/);
    m ? resolve({ancho:+m[1], alto:+m[2]}) : reject(new Error('sin medidas: ' + file));
  });
});

const duracion = file => new Promise((resolve, reject) => {
  const p = spawn(ffmpeg, ['-hide_banner', '-i', file]);
  let txt = '';
  p.stderr.on('data', d => txt += d);
  p.on('close', () => {
    const m = txt.match(/Duration: (\d+):(\d+):([\d.]+)/);
    m ? resolve(+m[1]*3600 + +m[2]*60 + parseFloat(m[3])) : reject(new Error('sin duración: ' + file));
  });
});

const TMP = fs.mkdtempSync('/tmp/ggdemo-');
const normalizados = [];

/* Cada trozo se normaliza por separado y se guarda en disco. Hacerlo todo en
   un solo filter_complex gigante se come la memoria y, cuando algo falla, no
   hay forma de saber en qué parte fue. */
for(const [i, parte] of partes.entries()){
  const nombre = path.basename(parte);
  const dur = await duracion(parte);
  const {ancho: anchoOrig, alto: altoOrig} = await medidas(parte);
  // Más alto que 16:9 = viene crudo de la tablet, con la barra del sistema.
  const recorte = (altoOrig / anchoOrig > 9/16 + 0.01) ? BARRA_SISTEMA : 0;
  const cortes = (CORTES[nombre] || []).slice().sort((a,b) => a[0]-b[0]);

  // Tramos que SÍ se quedan: lo que hay entre corte y corte.
  const tramos = [];
  let desde = 0;
  for(const [a, b] of cortes){
    if(a > desde) tramos.push([desde, Math.min(a, dur)]);
    desde = Math.max(desde, b);
  }
  if(desde < dur) tramos.push([desde, dur]);

  const trozos = [];
  for(const [j, [a, b]] of tramos.entries()){
    const salida = `${TMP}/n${i}_${j}.mp4`;
    const vf = [
      ...(recorte ? [`crop=iw:ih-${recorte}:0:0`] : []),
      // decrease + pad: entra entero, sin deformarse y sin pasarse del lienzo.
      `scale=${ANCHO}:${ALTO}:force_original_aspect_ratio=decrease:flags=lanczos`,
      `pad=${ANCHO}:${ALTO}:(ow-iw)/2:(oh-ih)/2:color=${FONDO}`,
      `setpts=PTS/${VELOCIDAD}`,
      `fps=${FPS}`,
      'format=yuv420p',
    ].join(',');
    await correr([
      '-y', '-v', 'error',
      '-ss', String(a), '-to', String(b), '-i', parte,
      '-vf', vf, '-an',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
      salida,
    ], `normalizar ${nombre} [${a}-${b}]`);
    trozos.push(salida);
  }
  normalizados.push(...trozos);
  const quitado = cortes.reduce((s,[a,b]) => s + (b-a), 0);
  console.log(`· ${nombre}: ${dur.toFixed(1)}s${quitado ? ` (−${quitado.toFixed(1)}s cortados)` : ''} → ${((dur-quitado)/VELOCIDAD).toFixed(1)}s`);
}

/* Encadenado con fundido. xfade solo empalma DOS entradas, así que se van
   encadenando de dos en dos: cada resultado es la entrada del siguiente. */
let actual = normalizados[0];
for(let i = 1; i < normalizados.length; i++){
  const dA = await duracion(actual);
  const offset = Math.max(0, dA - FUNDIDO);
  const salida = `${TMP}/x${i}.mp4`;
  await correr([
    '-y', '-v', 'error',
    '-i', actual, '-i', normalizados[i],
    '-filter_complex', `[0:v][1:v]xfade=transition=fade:duration=${FUNDIDO}:offset=${offset.toFixed(2)},format=yuv420p[v]`,
    '-map', '[v]', '-an',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
    salida,
  ], `encadenar ${i}`);
  actual = salida;
}

// Pasada final: un solo códec parejo para todo, más el fundido de entrada y
// de salida, que es lo que hace que no empiece y acabe de golpe.
const total = await duracion(actual);
await correr([
  '-y', '-v', 'error',
  '-i', actual,
  '-vf', `fade=t=in:st=0:d=0.5,fade=t=out:st=${(total-0.6).toFixed(2)}:d=0.6,format=yuv420p`,
  '-an',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '22',
  '-movflags', '+faststart',
  SALIDA,
], 'pasada final');

fs.rmSync(TMP, {recursive: true, force: true});
const dur = await duracion(SALIDA);
const mb = (fs.statSync(SALIDA).size / 1048576).toFixed(1);
console.log(`\n✅ ${SALIDA} · ${Math.floor(dur/60)}m${String(Math.round(dur%60)).padStart(2,'0')}s · ${mb} MB · ${partes.length} parte(s) a ${VELOCIDAD}×`);
