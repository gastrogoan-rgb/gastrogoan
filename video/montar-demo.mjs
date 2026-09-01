// Monta el vídeo de venta a partir de una grabación de pantalla REAL.
//
//   node video/montar-demo.mjs <grabacion.mp4> [salida.mp4]
//
// La grabación la hace el dueño con sus manos y su ritmo, que es lo que un
// tour automático no va a tener nunca. Este script hace el trabajo de
// montaje: quita el navegador y la barra del sistema, elige los trozos que
// valen, los encadena con fundidos, pone los rótulos y cierra con la llamada
// a la acción.
//
// La MÚSICA sale de la propia grabación y se coge SEGUIDA desde el principio,
// no trozo a trozo: si se cortara con el vídeo, cada corte sonaría como un
// salto. Así se oye una sola pieza continua por debajo de todo.
//
// Lo que se deja fuera, y por qué (se vio revisando la grabación entera):
//  · La barra del navegador y la de Android. Un vídeo de venta no enseña
//    Chrome, enseña el producto.
//  · Todo lo que sale con "Error de nube" en rojo en la cabecera.
//  · Las pantallas del negocio de pruebas que están VACÍAS (reservas,
//    clientes, promoción, la economía con guiones) y el escandallo con los
//    costes a cero: enseñar la herramienta estrella dando 0,00 € es peor que
//    no enseñarla.
//  · Mi Negocio, donde se ven el código de negocio y el PIN.
import ffmpeg from 'ffmpeg-static';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { dibujarRotulos } from './rotulos.mjs';

const FUENTE = process.argv[2];
const SALIDA = process.argv[3] || 'dist/gastrogoan-demo-real.mp4';
if(!FUENTE || !fs.existsSync(FUENTE)){
  console.error('Uso: node video/montar-demo.mjs <grabacion.mp4> [salida.mp4]');
  process.exit(1);
}

const W = 1920, H = 1080, FPS = 30;
const FUNDIDO = 0.4;                       // lo que dura cada encadenado
const FONDO = '0x16150F';                  // el verde casi negro de la cabecera

/* La grabación viene a 1920x1200: 85 px de barra del navegador arriba y unos
   45 de barra de Android abajo. Lo de en medio es la app. */
const RECORTE = 'crop=1920:950:0:85';

/* Cada trozo: dónde empieza, cuánto dura y qué se lee debajo.
   Los tiempos están comprobados fotograma a fotograma sobre la grabación: la
   primera tanda se eligió a ojo y la mitad caían en la pantalla equivocada o
   en una vacía (Pedidos sin pedidos, el Escandallo dando 0,00 €).
   Ni de 5 en 5 bastó, y por un motivo que conviene saber: el filtro `fps` de
   ffmpeg NO coge el fotograma del principio de cada intervalo, sino el del
   centro, así que toda la hoja de contactos venía desplazada 2,5 s y los
   cortes elegidos sobre ella caían donde no era. Los de esta lista están
   sacados uno a uno con `-ss` a un segundo exacto, que es lo único fiable.
   Fuera quedan también los 10 segundos en los que Chrome enseña su diálogo de
   "¿Guardar la contraseña?" encima de la app.
   Y ninguno pasa del segundo 243, que es cuando la cabecera se pone en rojo
   con "Error de nube" y ya no se va. */
const TROZOS = [
  {t: 24.0, d: 4.0, txt: 'Tres áreas: Cocina, Sala y Gestión'},
  {t: 42.0, d: 5.0, txt: 'Tu carta, por secciones y con sus precios'},
  {t: 56.0, d: 6.0, txt: 'I+D: crea platos y menús con TUS ingredientes'},
  {t: 74.0, d: 7.0, txt: 'El catálogo de materia prima ya viene hecho'},
  {t:100.0, d: 5.0, txt: 'Fichas técnicas: la receta que ejecuta tu equipo'},
  {t:135.0, d: 6.0, txt: 'Stock con alertas de mínimos'},
  {t:154.0, d: 7.0, txt: 'Turnos, fichajes y horas de tu equipo'},
  {t:186.0, d: 6.0, txt: 'Y quién hace qué en cada turno'},
  {t:200.0, d: 7.0, txt: 'Los papeles de sanidad, hechos'},
  {t:224.0, d: 5.0, txt: 'El TPV: mesas, comandas y cobro'},
  {t:229.0, d: 5.0, txt: 'Abrir mesa en dos toques'},
  {t:236.0, d: 6.0, txt: 'De la comanda al cobro, sin salir de la app'},
];

const TMP = '/tmp/gg-montaje';
fs.rmSync(TMP, {recursive:true, force:true});
fs.mkdirSync(TMP, {recursive:true});

/* Los rótulos se dibujan con Chromium (ver rotulos.mjs): este ffmpeg viene
   sin drawtext. Sale ganando — se usan la tipografía y los colores de verdad
   de la app en vez de una fuente del sistema. */
const ROT = '/tmp/gg-rotulos';
const pintor = await dibujarRotulos(ROT);
await pintor.portada('portada.png');
await pintor.cierre('cierre.png');
for(const [i, tr] of TROZOS.entries()) await pintor.banda(tr.txt, `b${i}.png`);
await pintor.cerrar();

const partes = [];

// ── Cartón de entrada ──────────────────────────────────────────────────
{
  const s = path.join(TMP, 'p00.mp4');
  // Un zoom lentísimo (1.00 → 1.04): un cartón completamente quieto delata
  // que es una imagen pegada, y con el movimiento parece rodado.
  execFileSync(ffmpeg, ['-y','-v','error',
    '-loop','1','-t','4.2','-i', path.join(ROT,'portada.png'),
    '-vf', `zoompan=z='min(zoom+0.00035,1.045)':d=${Math.round(4.2*FPS)}:s=${W}x${H}:fps=${FPS},`
         + `fade=t=in:st=0:d=0.5,fade=t=out:st=3.8:d=0.4,format=yuv420p`,
    '-c:v','libx264','-preset','medium','-crf','20', s]);
  partes.push({f: s, d: 4.2});
}

// ── Los trozos de la grabación ─────────────────────────────────────────
TROZOS.forEach((tr, i) => {
  const s = path.join(TMP, `p${String(i+1).padStart(2,'0')}.mp4`);
  process.stdout.write(`  trozo ${i+1}/${TROZOS.length} · ${tr.txt}\n`);
  execFileSync(ffmpeg, ['-y','-v','error',
    '-ss', String(tr.t), '-t', String(tr.d), '-i', FUENTE,
    /* ⚠️ El rótulo entra EN BUCLE, no como imagen suelta. Con una sola imagen,
       el fundido de alfa la deja transparente en el instante 0 y overlay
       repite ESE fotograma para siempre: el rótulo no aparecía nunca, y sin
       dar ningún error. */
    '-loop','1','-framerate',String(FPS),'-t',String(tr.d), '-i', path.join(ROT, `b${i}.png`),
    '-filter_complex',
      `[0:v]${RECORTE},pad=${W}:${H}:0:0:color=${FONDO},fps=${FPS}[v];` +
      // El rótulo entra a los 0,25 s, no de golpe con el corte: aparecer a la
      // vez que cambia la imagen es lo que hace que se lea como diapositiva.
      `[1:v]format=rgba,fade=t=in:st=0.25:d=0.45:alpha=1[r];` +
      `[v][r]overlay=0:0:format=auto,format=yuv420p[out]`,
    '-map','[out]','-an','-c:v','libx264','-preset','medium','-crf','21', s]);
  partes.push({f: s, d: tr.d});
});

// ── Cierre: la llamada a la acción ─────────────────────────────────────
{
  const s = path.join(TMP, 'p99.mp4');
  execFileSync(ffmpeg, ['-y','-v','error',
    '-loop','1','-t','7.5','-i', path.join(ROT,'cierre.png'),
    '-vf', `zoompan=z='min(zoom+0.00025,1.03)':d=${Math.round(7.5*FPS)}:s=${W}x${H}:fps=${FPS},`
         + `fade=t=out:st=6.6:d=0.9,format=yuv420p`,
    '-c:v','libx264','-preset','medium','-crf','20', s]);
  partes.push({f: s, d: 7.5});
}

// ── Encadenar todo con fundidos ────────────────────────────────────────
console.log('Encadenando…');
const ent = [];
partes.forEach(p => ent.push('-i', p.f));
let cadena = '', etiqueta = '[0:v]', desplazamiento = 0;
for(let i = 1; i < partes.length; i++){
  desplazamiento += partes[i-1].d - FUNDIDO;
  const salida = (i === partes.length - 1) ? '[vid]' : `[x${i}]`;
  cadena += `${etiqueta}[${i}:v]xfade=transition=fade:duration=${FUNDIDO}:offset=${desplazamiento.toFixed(3)}${salida};`;
  etiqueta = salida;
}
const total = partes.reduce((s,p) => s + p.d, 0) - FUNDIDO * (partes.length - 1);

/* La música, seguida desde el principio de la grabación. Se recorta a la
   duración del montaje y se le pone entrada y salida. */
cadena += `[${partes.length}:a]atrim=0:${total.toFixed(3)},asetpts=PTS-STARTPTS,`
        + `afade=t=in:st=0:d=1.2,afade=t=out:st=${(total-2).toFixed(3)}:d=2[aud]`;

execFileSync(ffmpeg, ['-y','-v','error', ...ent, '-i', FUENTE,
  '-filter_complex', cadena,
  '-map','[vid]','-map','[aud]',
  '-c:v','libx264','-preset','medium','-crf','21','-pix_fmt','yuv420p',
  '-c:a','aac','-b:a','128k','-movflags','+faststart',
  SALIDA], {stdio:'inherit'});

fs.rmSync(TMP, {recursive:true, force:true});
const mb = (fs.statSync(SALIDA).size / 1048576).toFixed(1);
const seg = Math.round(total);
console.log(`\n✅ ${SALIDA} · ${Math.floor(seg/60)}m${String(seg%60).padStart(2,'0')}s · ${mb} MB`);
