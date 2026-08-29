// Paridad de los tres diccionarios — R19.
//
// Nadie comprobaba esto. La prueba de idiomas abre pantallas y mira que no
// se desborde el texto, pero una clave que falte en catalán solo se ve si
// esa pantalla concreta se abre en catalán: con más de 2.000 claves, la
// mayoría no se abren nunca en una prueba.
//
// Y hay algo peor que una clave que falte: una clave REPETIDA. En un objeto
// de JavaScript la segunda gana en silencio, así que el texto que se ve no
// es el que uno lee al buscar en el fichero. Es de los fallos más difíciles
// de encontrar mirando código.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {readdirSync} from 'node:fs';

const res = [];
function caso(nombre, fn){
  try{ const d = fn(); console.log(`✅ ${nombre}${d?'  → '+d:''}`); res.push(true); }
  catch(e){ console.log(`❌ ${nombre}\n     ⤷ ${e.message}`); res.push(false); }
}

const src = readFileSync(new URL('../js/i18n.js', import.meta.url), 'utf8');

// Se carga el fichero en un contexto aislado con lo justo para que no falle.
const ctx = {document:{documentElement:{}, addEventListener(){}, querySelectorAll:()=>[], getElementById:()=>null},
             window:{}, localStorage:{getItem:()=>null, setItem(){}, removeItem(){}},
             navigator:{language:'es'}, console};
ctx.window = ctx;
vm.createContext(ctx);
// `const I18N` no se cuelga del global: se expone a mano al final.
vm.runInContext(src + '\n;globalThis.__I18N = I18N;', ctx, {filename:'i18n.js'});

const IDIOMAS = ['es','ca','en'];
const dicts = {};
IDIOMAS.forEach(l => {
  const d = ctx.__I18N && ctx.__I18N[l];
  if(d) dicts[l] = d;
});

caso('Los tres diccionarios existen y tienen contenido', ()=>{
  IDIOMAS.forEach(l => {
    assert.ok(dicts[l], `falta el diccionario de ${l}`);
    assert.ok(Object.keys(dicts[l]).length > 500, `${l} tiene solo ${Object.keys(dicts[l]).length} claves`);
  });
  return IDIOMAS.map(l => `${l}: ${Object.keys(dicts[l]).length}`).join(' · ');
});

caso('Ninguna clave falta en catalán ni en inglés', ()=>{
  const base = Object.keys(dicts.es);
  const faltan = [];
  ['ca','en'].forEach(l => {
    base.forEach(k => { if(!(k in dicts[l])) faltan.push(`${l}: ${k}`); });
  });
  assert.deepEqual(faltan.slice(0,20), [], `${faltan.length} sin traducir → ${faltan.slice(0,10).join(', ')}`);
  return `${base.length} claves presentes en los tres`;
});

caso('No hay claves de más en catalán o inglés (restos de renombrados)', ()=>{
  const base = new Set(Object.keys(dicts.es));
  const sobran = [];
  ['ca','en'].forEach(l => {
    Object.keys(dicts[l]).forEach(k => { if(!base.has(k)) sobran.push(`${l}: ${k}`); });
  });
  assert.deepEqual(sobran.slice(0,20), [], `${sobran.length} sobran → ${sobran.slice(0,10).join(', ')}`);
  return 'ningún resto';
});

// Una clave repetida no da error: la segunda pisa a la primera en silencio.
caso('Ninguna clave está repetida dentro del mismo idioma', ()=>{
  const repes = [];
  // Se recorre el fichero por bloques de idioma, contando cada clave literal
  const lineas = src.split('\n');
  let idioma = null;
  const vistas = {es:new Map(), ca:new Map(), en:new Map()};
  lineas.forEach((linea, i) => {
    const cab = linea.match(/^\s{0,4}(es|ca|en)\s*:\s*\{\s*$/);
    if(cab){ idioma = cab[1]; return; }
    if(!idioma) return;
    const claves = [...linea.matchAll(/'([a-zA-Z][\w.]*)'\s*:/g)].map(m => m[1]);
    claves.forEach(k => {
      const m = vistas[idioma];
      if(m.has(k)) repes.push(`${idioma}: '${k}' (líneas ${m.get(k)} y ${i+1})`);
      else m.set(k, i+1);
    });
  });
  assert.deepEqual(repes.slice(0,20), [], `${repes.length} repetidas → ${repes.slice(0,8).join(' · ')}`);
  return 'sin duplicados';
});

caso('Los huecos ${...} coinciden entre idiomas', ()=>{
  // Si el castellano dice ${n} y el inglés se lo come, el mensaje sale roto.
  const malos = [];
  Object.keys(dicts.es).forEach(k => {
    // ${s} es el ayudante del plural en castellano y catalán ("1 usada",
    // "3 usadas"). El inglés no lo necesita, así que no cuenta como hueco.
    const huecos = txt => new Set([...String(txt).matchAll(/\$\{(\w+)\}/g)].map(m=>m[1]).filter(h => h !== 's'));
    if(typeof dicts.es[k] !== 'string') return;
    const base = huecos(dicts.es[k]);
    ['ca','en'].forEach(l => {
      if(typeof dicts[l][k] !== 'string') return;
      const otro = huecos(dicts[l][k]);
      const faltan = [...base].filter(h => !otro.has(h));
      const sobran = [...otro].filter(h => !base.has(h));
      if(faltan.length || sobran.length) malos.push(`${l}:${k} (falta ${faltan.join(',')||'-'} / sobra ${sobran.join(',')||'-'})`);
    });
  });
  assert.deepEqual(malos.slice(0,15), [], `${malos.length} con huecos descuadrados → ${malos.slice(0,8).join(' · ')}`);
  return 'los sustitutos cuadran en los tres idiomas';
});

caso('Ninguna traducción está vacía', ()=>{
  const vacias = [];
  IDIOMAS.forEach(l => {
    Object.keys(dicts[l]).forEach(k => {
      const v = dicts[l][k];
      if(typeof v === 'string' && v.trim() === '') vacias.push(`${l}: ${k}`);
    });
  });
  assert.deepEqual(vacias, [], vacias.join(', '));
  return 'todas con texto';
});

caso('Las listas traducidas tienen el mismo número de elementos', ()=>{
  // limpieza.defaultApertura y compañía son arrays: si en catalán falta un
  // paso, el protocolo sale incompleto sin que nadie se entere.
  const malos = [];
  Object.keys(dicts.es).forEach(k => {
    if(!Array.isArray(dicts.es[k])) return;
    ['ca','en'].forEach(l => {
      if(!Array.isArray(dicts[l][k])) { malos.push(`${l}:${k} no es lista`); return; }
      if(dicts[l][k].length !== dicts.es[k].length) malos.push(`${l}:${k} tiene ${dicts[l][k].length} y el castellano ${dicts.es[k].length}`);
    });
  });
  assert.deepEqual(malos, [], malos.join(' · '));
  const n = Object.keys(dicts.es).filter(k => Array.isArray(dicts.es[k])).length;
  return `${n} listas cuadradas`;
});

/* ── La que más vale ──
   Si el código llama a t('x.y') y esa clave no existe, en pantalla sale la
   CLAVE EN CRUDO. Es exactamente el fallo del módulo de I+D de ayer
   ("module.cocina.idr.name" en la baldosa de la carpeta), que solo se vio
   porque una prueba visual medía el ancho del texto y se salía. Esto lo
   caza siempre, en el acto y sin abrir ninguna pantalla. */
caso('Todas las claves que usa el código existen en el diccionario', ()=>{
  const dir = new URL('../js/', import.meta.url);
  const usadas = new Map();
  readdirSync(dir).filter(f => f.endsWith('.js')).forEach(f => {
    const code = readFileSync(new URL(f, dir), 'utf8');
    code.split('\n').forEach(linea => {
      // Fuera los comentarios: dentro se citan claves de ejemplo que no
      // existen ("como cualquier t('lang.xxx')") y darían falsa alarma.
      const limpia = linea.replace(/\/\/.*$/, '').replace(/\/\*[\s\S]*?\*\//g, '');
      // Solo t('clave') CERRADO. Las que se construyen al vuelo
      // -t('togocal.'+m)- no se pueden comprobar en frío y se dejan pasar.
      [...limpia.matchAll(/\bt\(\s*'([a-zA-Z][\w.]*)'\s*\)/g)].forEach(m => {
        if(!usadas.has(m[1])) usadas.set(m[1], f);
      });
    });
  });
  const rotas = [...usadas.entries()].filter(([k]) => !(k in dicts.es)).map(([k,f]) => `${k} (${f})`);
  assert.deepEqual(rotas.slice(0,20), [], `${rotas.length} saldrían en crudo → ${rotas.slice(0,10).join(', ')}`);
  return `${usadas.size} claves usadas, todas traducidas`;
});

console.log('\n' + '═'.repeat(64));
const fallos = res.filter(x=>!x).length;
console.log(fallos ? `❌ ${fallos} de ${res.length} fallaron` : `✅ los ${res.length} casos pasaron`);
process.exit(fallos ? 1 : 0);
