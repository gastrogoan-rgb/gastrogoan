/* Que el recorte de la fuente de iconos no deje ningún hueco.
 *
 * Por qué existe: desde el 14/09 `build.sh` recorta Tabler Icons a los que
 * la app usa (5.147 → 264, 800 KB → 53 KB), porque la fuente viaja como
 * woff2 en base64 y woff2 ya viene comprimido: gzip no lo tocaba y era un
 * tercio de la primera descarga.
 *
 * El riesgo del recorte es silencioso y feo: si alguien añade mañana un
 * icono que el rastreador no reconoce, no falla nada — sale un cuadradito
 * vacío en una pantalla, y solo se entera quien abra ESA pantalla. Que es
 * exactamente el tipo de fallo que aquí encuentra el dueño usando la app y
 * no las pruebas.
 *
 *   node test/iconos.mjs      (necesita dist/: bash build.sh antes)
 */
import fs from 'node:fs';

let ok = 0, mal = 0;
const comprobar = (nombre, condicion, detalle) => {
  if(condicion){ ok++; console.log(`✅ ${nombre}` + (detalle ? `  → ${detalle}` : '')); }
  else { mal++; console.log(`❌ ${nombre}` + (detalle ? `  → ${detalle}` : '')); }
};

if(!fs.existsSync('dist/index.html')){
  console.log('❌ No hay dist/index.html — hace falta `bash build.sh` antes');
  process.exit(1);
}
const dist = fs.readFileSync('dist/index.html', 'utf8');
const completo = fs.readFileSync('css/tabler-icons.min.css', 'utf8');

/* Los que el juego completo sabe pintar. */
const disponibles = new Set(
  [...completo.matchAll(/\.ti-([a-z0-9-]+):before\{content:"\\[0-9a-f]+"\}/g)].map(m => m[1]));
/* Los que han sobrevivido al recorte y van dentro del entregable. */
const enDist = new Set(
  [...dist.matchAll(/\.ti-([a-z0-9-]+):before\{content:"\\[0-9a-f]+"\}/g)].map(m => m[1]));

/* Los que la app nombra. Mismo rastreo generoso que el recortador: si aquí
   se buscara de otra forma, la prueba aprobaría justo lo que el recortador
   se dejó. */
const FUENTES = ['index.html', 'reservagastrogoan.html', 'css/styles.css'];
for(const f of fs.readdirSync('js')) if(f.endsWith('.js')) FUENTES.push('js/' + f);
const DINAMICOS = ['sunrise', 'sunset', 'chevron-up', 'history'];

const usados = new Set(DINAMICOS);
for(const ruta of FUENTES){
  if(!fs.existsSync(ruta)) continue;
  for(const m of fs.readFileSync(ruta, 'utf8').matchAll(/\bti-([a-z0-9-]+)\b/g)) usados.add(m[1]);
}
const usadosReales = [...usados].filter(n => disponibles.has(n));

comprobar('el recorte se ha aplicado al entregable',
  enDist.size > 0 && enDist.size < disponibles.size,
  `${enDist.size} iconos en dist/, de ${disponibles.size} del juego completo`);

const faltan = usadosReales.filter(n => !enDist.has(n));
comprobar('ningún icono que la app usa se ha quedado fuera',
  faltan.length === 0,
  faltan.length ? `FALTAN ${faltan.length}: ${faltan.slice(0, 12).join(', ')}` : `${usadosReales.length} comprobados`);

/* Los cuatro que se arman en tiempo de ejecución no aparecen escritos
   enteros en ningún sitio, así que solo están si alguien se acordó de
   ponerlos en la lista del recortador. Es justo el caso que se olvida. */
for(const n of DINAMICOS){
  comprobar(`el icono dinámico "${n}" sigue dentro`, enDist.has(n));
}

/* La fuente tiene que ir de verdad en el entregable, y recortada. Si el
   recortador fallara y se colara la completa, el peso volvería sin que
   ninguna otra prueba lo viera. */
const fuente = dist.match(/font-family:"tabler-icons"[^}]*?base64,([A-Za-z0-9+/=]+)\)/);
comprobar('la fuente de iconos viaja incrustada en el entregable', !!fuente);
if(fuente){
  const kb = Math.round(fuente[1].length * 0.75 / 1024);
  comprobar('la fuente incrustada es la recortada, no la entera',
    kb < 200, `${kb} KB (la completa son ~600 KB)`);
}

console.log('\n' + '═'.repeat(64));
if(mal === 0) console.log(`✅ los ${ok} casos pasaron`);
else { console.log(`❌ ${mal} fallaron (de ${ok + mal})`); process.exit(1); }
