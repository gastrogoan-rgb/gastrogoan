// Genera js/iconos-comida.js: el catálogo de iconos de las secciones de la carta (29/10).
//   node tools/generar-iconos-comida.mjs <carpeta-tabler> <carpeta-lucide> <carpeta-phosphor>
// <carpeta-tabler> = donde esté tabler-nodes-outline.json (paquete @tabler/icons)
// <carpeta-lucide> = donde esté icons/*.svg (paquete lucide-static)
// <carpeta-phosphor> = donde esté assets/regular/*.svg (paquete @phosphor-icons/core)
// La lista de iconos vive en tools/iconos-comida-lista.txt. Los dos juegos son de trazo de 24 px y el mismo
// grosor y los de Phosphor (peso «regular», trazo convertido en relleno de 256 px) se reducen a 24 px con el mismo
// peso visual: conviven sin que se note de dónde viene cada uno. Licencias: Tabler (MIT), Lucide (ISC), Phosphor (MIT).
import fs from 'node:fs';
import path from 'node:path';

const [tablerDir, lucideDir, phosphorDir] = process.argv.slice(2);
if(!tablerDir || !lucideDir || !phosphorDir){ console.error('Uso: node tools/generar-iconos-comida.mjs <tabler> <lucide> <phosphor>'); process.exit(1); }
const tabler = JSON.parse(fs.readFileSync(path.join(tablerDir, 'tabler-nodes-outline.json'), 'utf8'));
const num = n => String(Math.round(parseFloat(n) * 100) / 100);
// «M12 21.5c-3.04 0 -5.95» → quita espacios y ceros que sobran (el catálogo viaja dentro de dos ficheros HTML)
const d = s => s.replace(/(\d)\.(\d+)/g, (m, a, b) => a + '.' + b.slice(0, 2).replace(/0+$/, '')).replace(/\.(?=[^\d])/g, '').replace(/ ?([a-zA-Z]) ?/g, '$1').replace(/ -/g, '-').replace(/\s+/g, ' ');
const nodo = ([tag, at]) => `<${tag} ${Object.entries(at).filter(([k]) => k !== 'key').map(([k, v]) => `${k}="${k === 'd' ? d(String(v)) : v}"`).join(' ')}/>`;
const delTabler = n => {
  if(!tabler[n]) throw new Error('Tabler no tiene «' + n + '»');
  return tabler[n].filter(([, at]) => !(at.d === 'M0 0h24v24H0z')).map(nodo).join('');
};
const delLucide = n => {
  const f = path.join(lucideDir, 'icons', n + '.svg');
  if(!fs.existsSync(f)) throw new Error('Lucide no tiene «' + n + '»');
  const svg = fs.readFileSync(f, 'utf8');
  const cuerpo = svg.slice(svg.indexOf('>', svg.indexOf('<svg')) + 1, svg.lastIndexOf('</svg>'));
  return [...cuerpo.matchAll(/<(path|circle|rect|line|polyline|polygon|ellipse)\b([^>]*?)\/?>/g)]
    .map(([, tag, at]) => `<${tag}${at.replace(/\s+/g, ' ').replace(/ d="([^"]*)"/, (m, v) => ' d="' + d(v) + '"').replace(/\s*$/, '')}/>`).join('');
};

const delPhosphor = n => {
  const f = path.join(phosphorDir, 'assets', 'regular', n + '.svg');
  if(!fs.existsSync(f)) throw new Error('Phosphor no tiene «' + n + '»');
  const svg = fs.readFileSync(f, 'utf8');
  const cuerpo = svg.slice(svg.indexOf('>', svg.indexOf('<svg')) + 1, svg.lastIndexOf('</svg>'));
  const formas = [...cuerpo.matchAll(/<(path|circle|rect|line|polyline|polygon|ellipse)\b([^>]*?)\/?>/g)]
    .filter(([, tag, at]) => !(tag === 'rect' && /fill="none"/.test(at)))
    .map(([, tag, at]) => `<${tag}${at.replace(/\s+/g, ' ').replace(/ d="([^"]*)"/, (m, v) => ' d="' + v.replace(/(\d+\.\d{1})\d+/g, '$1').replace(/\s+/g, ' ') + '"').replace(/\s*$/, '')}/>`).join('');
  // 24/256 = 0,09375: el dibujo de 256 px pasa a la rejilla de 24 px, relleno en vez de trazo
  return `<g transform="scale(.09375)" fill="currentColor" stroke="none">${formas}</g>`;
};

const filas = fs.readFileSync('tools/iconos-comida-lista.txt', 'utf8').split('\n').filter(l => l.trim() && !l.startsWith('#'));
const iconos = {};
const grupos = [];
for(const fila of filas){
  const [grupo, clave, origen, es, ca, en] = fila.split('|').map(x => x.trim());
  if(!grupos.includes(grupo)) grupos.push(grupo);
  const [src, nombre] = origen.split(':');
  if(iconos[clave]) throw new Error('Clave repetida: ' + clave);
  iconos[clave] = [src === 't' ? delTabler(nombre) : src === 'l' ? delLucide(nombre) : delPhosphor(nombre), es, ca, en, grupo];
}
const NOMBRES_GRUPO = {
  pan: ['Pan y para empezar', 'Pa i per començar', 'Bread and starters'],
  verdura: ['Verdura y huerta', 'Verdura i hort', 'Vegetables'],
  carne: ['Carnes y brasa', 'Carns i brasa', 'Meat and grill'],
  pescado: ['Pescado y marisco', 'Peix i marisc', 'Fish and seafood'],
  arroz: ['Arroces, sopas y guisos', 'Arrossos, sopes i guisats', 'Rice, soups and stews'],
  huevo: ['Huevos y lácteos', 'Ous i làctics', 'Eggs and dairy'],
  postre: ['Postres y dulces', 'Postres i dolços', 'Desserts and sweets'],
  fruta: ['Fruta', 'Fruita', 'Fruit'],
  vino: ['Vino y espumosos', 'Vi i escumosos', 'Wine and sparkling'],
  cerveza: ['Cerveza y destilados', 'Cervesa i destil·lats', 'Beer and spirits'],
  cafe: ['Café y té', 'Cafè i te', 'Coffee and tea'],
  refresco: ['Sin alcohol', 'Sense alcohol', 'Soft drinks'],
  servicio: ['Cocina y servicio', 'Cuina i servei', 'Kitchen and service'],
  utensilios: ['Utensilios y equipo de cocina', 'Estris i equip de cuina', 'Kitchen tools and equipment'],
};
const q = s => JSON.stringify(s);
let out = `/* ═══ CATÁLOGO DE ICONOS DE COMIDA (GENERADO — no editar a mano) ═══
   Lo escribe tools/generar-iconos-comida.mjs a partir de tools/iconos-comida-lista.txt. ${filas.length} iconos de trazo
   (Tabler Icons, MIT · Lucide, ISC). Los usan la carta de la app (secciones) y la web de reservas: es el mismo
   fichero en los dos sitios, así que lo que el dueño elige es exactamente lo que ve su cliente.
   El valor que se guarda en una sección es «ic:<clave>»; «ic:none» es «sin icono». */
const ICONOS_COMIDA = {
${Object.entries(iconos).map(([k, [svg, es, ca, en, g]]) => `  ${q(k)}:[${q(svg)},${q(es)},${q(ca)},${q(en)},${q(g)}]`).join(',\n')}
};
const ICONOS_COMIDA_GRUPOS = [${grupos.map(g => `[${q(g)},${q(NOMBRES_GRUPO[g][0])},${q(NOMBRES_GRUPO[g][1])},${q(NOMBRES_GRUPO[g][2])}]`).join(',')}];
`;
fs.writeFileSync('js/iconos-comida.js', out);
// La web pública (reservagastrogoan.html) tiene que poder abrirse suelta, sin pasar por el build, así que el
// catálogo y su código van COPIADOS dentro, entre dos marcas. Esto las rellena.
const uso = fs.readFileSync('js/iconos-comida-uso.js', 'utf8');
const pub = 'reservagastrogoan.html';
let html = fs.readFileSync(pub, 'utf8');
const ini = '/*ICONOS_COMIDA:INICIO — lo escribe tools/generar-iconos-comida.mjs, no editar a mano*/';
const fin = '/*ICONOS_COMIDA:FIN*/';
const a = html.indexOf(ini), b = html.indexOf(fin);
if(a < 0 || b < 0) throw new Error('Faltan las marcas ICONOS_COMIDA en ' + pub);
html = html.slice(0, a) + ini + '\n' + out + '\n' + uso + '\n' + html.slice(b);
fs.writeFileSync(pub, html);
console.log(`✅ js/iconos-comida.js: ${filas.length} iconos, ${(out.length / 1024).toFixed(1)} KB, ${grupos.length} grupos`);
