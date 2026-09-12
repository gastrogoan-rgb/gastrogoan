/* EL vídeo de demo. Monta la grabación real del dueño (que llega partida en
 * trozos, porque entera son 380 MB) en una sola pieza vendible:
 *
 *   portada → recorrido acelerado con rótulos → cierre con el precio y el CTA
 *
 *   node video/montar-demo-final.mjs
 *
 * Lo que hace con el metraje:
 *   · normaliza cada trozo al mismo lienzo, sin deformar nada;
 *   · lo acelera (se ve igual de claro y no se hace largo);
 *   · quita los tramos que no deben salir (CORTES);
 *   · encadena todo con fundidos, nunca con cortes secos;
 *   · y superpone los rótulos, que se dibujan aparte con la tipografía real
 *     de la app (ver rotulos.mjs).
 */
import { spawn } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import fs from 'node:fs';
import path from 'node:path';
import { dibujar, rotulo, PORTADA, CIERRE, ANCHO, ALTO } from './rotulos.mjs';

const FPS = 25;
const VELOCIDAD = 2.6;        // ritmo del recorrido
const FUNDIDO = 0.45;         // transición entre trozos
const FONDO = '0x1C1A17';
const BARRA_SISTEMA = 82;     // barra de Android, solo si el trozo viene crudo
const DUR_PORTADA = 3.2, DUR_CIERRE = 6.0;
const SALIDA = 'dist/gastrogoan-demo.mp4';

/* El material, en orden, con lo que cuenta cada tramo. Los segundos son del
   ORIGINAL (antes de acelerar): así se pueden ajustar mirando el archivo que
   mandó el dueño, sin tener que recalcular nada. */
const PARTES = [
  {
    archivo: '/tmp/parte1.mp4',
    cortes: [],
    rotulos: [
      [1, 11, 'Se abre en el navegador. <b>Nada que instalar</b>'],
      [13, 21, 'Tu cuenta, tu negocio, tu nube'],
      [24, 33, 'Cocina, Sala y Gestión: <b>cada uno ve lo suyo</b>'],
      [44, 54, 'Tu carta, con extras, menús y alérgenos'],
      [66, 75, 'Todo lo que compras, <b>con su precio real</b>'],
      [88, 99, '¿Sabes lo que te cuesta <b>cada plato</b>?'],
      [112, 121, 'Proveedores y albaranes, conectados al coste'],
      [131, 141, 'Ficha técnica de cada elaboración'],
    ],
  },
  {
    archivo: '/tmp/parte2.mp4',
    cortes: [],
    rotulos: [
      [1, 10, 'Tu equipo: turnos, fichajes y documentos'],
      [26, 36, '<b>APPCC al día</b>, sin papeles'],
      [58, 68, 'El TPV: mesas, comandas y alérgenos en pantalla'],
      [84, 94, 'La comanda sale sola hacia cocina'],
      [110, 120, 'Reservas, con el plano de tu sala'],
    ],
  },
  {
    archivo: '/tmp/parte3.mp4',
    cortes: [],
    rotulos: [
      [1, 10, 'Ficha de cliente y fidelización'],
      [22, 32, 'Promoción: <b>qué hacer esta semana</b>'],
      [46, 56, 'El panel: cómo va el negocio hoy'],
    ],
  },
  {
    archivo: '/tmp/parte4.mp4',
    cortes: [],
    rotulos: [
      [1, 11, 'Gestión Económica: <b>lo que de verdad ganas</b>'],
      [24, 34, 'Tesorería: cuánto apartar para Hacienda'],
      [38, 47, 'Tu punto de equilibrio, al día'],
      [55, 65, 'Y <b>tu propia web</b> de reservas y pedidos'],
      [68, 77, 'Los pedidos entran en tu cocina. <b>Sin comisiones</b>'],
    ],
  },
];

const correr = (argv, etiqueta) => new Promise((resolve, reject) => {
  const p = spawn(ffmpeg, argv, {stdio:['ignore','ignore','pipe']});
  let err = '';
  p.stderr.on('data', d => err += d);
  p.on('close', c => c === 0 ? resolve() : reject(new Error(`${etiqueta} falló:\n${err.slice(-1200)}`)));
});
const sondear = (file, re) => new Promise((resolve, reject) => {
  const p = spawn(ffmpeg, ['-hide_banner', '-i', file]);
  let txt = '';
  p.stderr.on('data', d => txt += d);
  p.on('close', () => { const m = txt.match(re); m ? resolve(m) : reject(new Error('no se pudo leer ' + file)); });
});
const duracion = async f => { const m = await sondear(f, /Duration: (\d+):(\d+):([\d.]+)/); return +m[1]*3600 + +m[2]*60 + parseFloat(m[3]); };
const medidas = async f => { const m = await sondear(f, /Video:.*?, (\d{2,5})x(\d{2,5})/); return {ancho:+m[1], alto:+m[2]}; };

for(const p of PARTES) if(!fs.existsSync(p.archivo)){ console.error('Falta ' + p.archivo); process.exit(1); }

const TMP = fs.mkdtempSync('/tmp/ggdemo-');
fs.mkdirSync(TMP + '/rot', {recursive: true});

// 1. Los rótulos, dibujados con la tipografía de la app.
const piezas = [
  {archivo: `${TMP}/rot/portada.png`, html: PORTADA},
  {archivo: `${TMP}/rot/cierre.png`, html: CIERRE},
];
PARTES.forEach((parte, i) => parte.rotulos.forEach((r, j) => {
  piezas.push({archivo: `${TMP}/rot/r${i}_${j}.png`, html: rotulo(r[2]), transparente: true});
}));
await dibujar(piezas);
console.log(`· ${piezas.length} rótulos dibujados`);

// 2. Cada parte: recortes, lienzo común, velocidad y rótulos encima.
const normalizados = [];
for(const [i, parte] of PARTES.entries()){
  const nombre = path.basename(parte.archivo);
  const dur = await duracion(parte.archivo);
  const {ancho: aO, alto: hO} = await medidas(parte.archivo);
  // Más alto que 16:9 = viene crudo de la tablet, con su barra de botones.
  const recorte = (hO / aO > 9/16 + 0.01) ? BARRA_SISTEMA : 0;

  const cortes = (parte.cortes || []).slice().sort((a,b) => a[0]-b[0]);
  // Cada segundo que se corta adelanta todos los rótulos posteriores.
  const desplazado = t => t - cortes.filter(([a]) => a < t).reduce((s,[a,b]) => s + Math.min(b,t) - a, 0);

  const base = `${TMP}/n${i}.mp4`;
  const tramos = [];
  let desde = 0;
  for(const [a, b] of cortes){ if(a > desde) tramos.push([desde, Math.min(a, dur)]); desde = Math.max(desde, b); }
  if(desde < dur) tramos.push([desde, dur]);

  const vf = [
    ...(recorte ? [`crop=iw:ih-${recorte}:0:0`] : []),
    // decrease + pad: entra entero, sin deformarse y sin salirse del lienzo.
    `scale=${ANCHO}:${ALTO}:force_original_aspect_ratio=decrease:flags=lanczos`,
    `pad=${ANCHO}:${ALTO}:(ow-iw)/2:(oh-ih)/2:color=${FONDO}`,
    `setpts=PTS/${VELOCIDAD}`, `fps=${FPS}`, 'format=yuv420p',
  ].join(',');

  const trozos = [];
  for(const [j, [a, b]] of tramos.entries()){
    const sal = `${TMP}/t${i}_${j}.mp4`;
    await correr(['-y','-v','error','-ss',String(a),'-to',String(b),'-i',parte.archivo,
      '-vf',vf,'-an','-c:v','libx264','-preset','veryfast','-crf','20',sal], `normalizar ${nombre}`);
    trozos.push(sal);
  }
  if(trozos.length === 1){ fs.renameSync(trozos[0], base); }
  else {
    const lista = `${TMP}/lista${i}.txt`;
    fs.writeFileSync(lista, trozos.map(t => `file '${t}'`).join('\n'));
    await correr(['-y','-v','error','-f','concat','-safe','0','-i',lista,'-c','copy',base], `unir tramos ${nombre}`);
  }

  // Rótulos: los segundos del original pasan a los del vídeo ya acelerado.
  const conRotulos = `${TMP}/r${i}.mp4`;
  const durBase = await duracion(base);
  const entradas = [];
  const filtros = [];
  let cadena = '[0:v]';
  parte.rotulos.forEach((r, j) => {
    const [desdeO, hastaO] = r;
    const d = desplazado(desdeO) / VELOCIDAD, h = desplazado(hastaO) / VELOCIDAD;
    /* -loop/-framerate/-t: sin esto el PNG es UN SOLO fotograma, el fade
       de alfa se evalúa solo en t=0 (donde todavía vale 0) y overlay se
       pasa el resto del vídeo repitiendo ese fotograma invisible. Resultado:
       ningún rótulo se veía, y en la hoja de contactos parecía que el
       filtro ni se había aplicado. */
    entradas.push('-loop','1','-framerate',String(FPS),'-t',String(durBase.toFixed(2)),
      '-i', `${TMP}/rot/r${i}_${j}.png`);
    const salida = `[v${j}]`;
    // Aparece y desaparece con un fundido corto: entrar de golpe da tirón.
    filtros.push(`[${j+1}:v]format=rgba,fade=t=in:st=${d.toFixed(2)}:d=0.25:alpha=1,`
      + `fade=t=out:st=${(h-0.25).toFixed(2)}:d=0.25:alpha=1[o${j}]`);
    filtros.push(`${cadena}[o${j}]overlay=0:0:enable='between(t,${d.toFixed(2)},${h.toFixed(2)})'${salida}`);
    cadena = salida;
  });
  if(entradas.length){
    await correr(['-y','-v','error','-i',base, ...entradas,
      '-filter_complex', filtros.join(';'), '-map', cadena, '-an',
      '-c:v','libx264','-preset','veryfast','-crf','20', conRotulos], `rótulos ${nombre}`);
    normalizados.push(conRotulos);
  } else normalizados.push(base);

  const quitado = cortes.reduce((s,[a,b]) => s + (b-a), 0);
  console.log(`· ${nombre}: ${dur.toFixed(0)}s${quitado?` −${quitado.toFixed(0)}s`:''} → ${((dur-quitado)/VELOCIDAD).toFixed(0)}s · ${parte.rotulos.length} rótulos`);
}

// 3. Portada y cierre, como clips de su duración.
const clipDeImagen = async (png, seg, sal) => {
  await correr(['-y','-v','error','-loop','1','-t',String(seg),'-i',png,
    '-vf',`fps=${FPS},format=yuv420p`,'-c:v','libx264','-preset','veryfast','-crf','20', sal], 'clip ' + path.basename(png));
  return sal;
};
const portada = await clipDeImagen(`${TMP}/rot/portada.png`, DUR_PORTADA, `${TMP}/portada.mp4`);
const cierre  = await clipDeImagen(`${TMP}/rot/cierre.png`,  DUR_CIERRE,  `${TMP}/cierre.mp4`);

// 4. Todo encadenado con fundidos, de dos en dos (xfade solo admite dos).
const secuencia = [portada, ...normalizados, cierre];
let actual = secuencia[0];
for(let i = 1; i < secuencia.length; i++){
  const dA = await duracion(actual);
  const sal = `${TMP}/x${i}.mp4`;
  await correr(['-y','-v','error','-i',actual,'-i',secuencia[i],
    '-filter_complex',`[0:v][1:v]xfade=transition=fade:duration=${FUNDIDO}:offset=${Math.max(0, dA-FUNDIDO).toFixed(2)},format=yuv420p[v]`,
    '-map','[v]','-an','-c:v','libx264','-preset','veryfast','-crf','20', sal], `encadenar ${i}`);
  actual = sal;
}

// 5. Pasada final: codec parejo y fundido de entrada/salida.
const total = await duracion(actual);
await correr(['-y','-v','error','-i',actual,
  '-vf',`fade=t=in:st=0:d=0.6,fade=t=out:st=${(total-0.8).toFixed(2)}:d=0.8,format=yuv420p`,
  '-an','-c:v','libx264','-preset','medium','-crf','22','-movflags','+faststart', SALIDA], 'pasada final');

fs.rmSync(TMP, {recursive: true, force: true});
const dur = await duracion(SALIDA);
console.log(`\n✅ ${SALIDA} · ${Math.floor(dur/60)}m${String(Math.round(dur%60)).padStart(2,'0')}s · ${(fs.statSync(SALIDA).size/1048576).toFixed(1)} MB`);
