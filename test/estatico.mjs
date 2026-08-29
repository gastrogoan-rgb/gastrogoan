// Auditoría en frío del código — R20.
//
// Dos clases de fallo que ninguna prueba veía, y que son especialmente
// peligrosas en esta app porque los once ficheros se concatenan en uno solo
// al construir:
//
// 1. UN BOTÓN QUE LLAMA A UNA FUNCIÓN QUE NO EXISTE. No avisa de nada: el
//    botón simplemente no hace nada y el error se queda en la consola, donde
//    un hostelero no entra jamás. La prueba de botones pulsa 275, pero solo
//    los visibles de 31 pantallas: los de dentro de ventanas y filas de
//    tabla no los alcanza.
//
// 2. DOS FUNCIONES CON EL MISMO NOMBRE. Al concatenar, la última gana en
//    silencio y la primera deja de existir. El código que uno lee no es el
//    que se ejecuta: es de los fallos más caros de encontrar a mano.
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';

const res = [];
function caso(nombre, fn){
  try{ const d = fn(); console.log(`✅ ${nombre}${d?'  → '+d:''}`); res.push(true); }
  catch(e){ console.log(`❌ ${nombre}\n     ⤷ ${e.message}`); res.push(false); }
}

// El mismo orden que usa build.sh: importa, porque decide quién gana.
const ORDEN = ['core.js','i18n.js','ui.js','finance.js','recipes.js','menu.js','tpv.js','operations.js','hr.js','idr.js','polish.js','app.js'];
const dir = new URL('../js/', import.meta.url);
const ficheros = ORDEN.filter(f => readdirSync(dir).includes(f));
const fuentes = {};
ficheros.forEach(f => { fuentes[f] = readFileSync(new URL(f, dir), 'utf8'); });
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

// Quita SOLO las líneas que son comentario entero. Nada de recortar dentro
// de una línea: un "https://" o un "/*" dentro de una cadena hacían que el
// recorte se comiera código de verdad (540 líneas de operations.js, y por
// eso esta misma prueba daba por muertas funciones que existen).
function sinComentarios(code){
  let dentroDeBloque = false;
  return code.split('\n').map(l => {
    const t = l.trim();
    if(dentroDeBloque){ if(t.includes('*/')) dentroDeBloque = false; return ''; }
    if(t.startsWith('/*')){ if(!t.includes('*/')) dentroDeBloque = true; return ''; }
    if(t.startsWith('//') || t.startsWith('*')) return '';
    return l;
  }).join('\n');
}

const declaradas = new Map();   // nombre -> [ficheros]
ficheros.forEach(f => {
  const limpio = sinComentarios(fuentes[f]);
  const anota = n => { if(!declaradas.has(n)) declaradas.set(n, []); declaradas.get(n).push(f); };
  [...limpio.matchAll(/^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm)].forEach(m => anota(m[1]));
  // También las que se declaran como constante: const x = () => {} / function
  // Solo las de NIVEL SUPERIOR (sin sangrar): una "const el = x => ..."
  // dentro de una función es una variable local, no una función del programa,
  // y contarla daba duplicados falsos.
  [...limpio.matchAll(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?(?:function\b|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/gm)].forEach(m => anota(m[1]));
  // Y las que se cuelgan del window
  [...limpio.matchAll(/^\s*window\.([A-Za-z_$][\w$]*)\s*=/gm)].forEach(m => anota(m[1]));
});

caso('Ninguna función está declarada dos veces', ()=>{
  const repes = [...declaradas.entries()].filter(([,fs]) => fs.length > 1)
    .map(([n,fs]) => `${n} (${fs.join(' y ')})`);
  assert.deepEqual(repes, [], `${repes.length} duplicadas: ${repes.join(' · ')}`);
  return `${declaradas.size} funciones, todas únicas`;
});

// Nombres del navegador y de las librerías que se usan sin declararlas aquí.
const CONOCIDAS = new Set([
  'alert','confirm','print','open','close','focus','blur','event','this','return','if','for','while',
  'setTimeout','clearTimeout','setInterval','JSON','Math','Date','String','Number','Array','Object',
  'parseInt','parseFloat','isNaN','isFinite','encodeURIComponent','decodeURIComponent','firebase',
  'console','window','document','localStorage','navigator','location','history','fetch','Promise',
  // var(--color): CSS dentro de un style, no una llamada a función.
  'var',
]);

caso('Todo lo que llama un onclick existe de verdad', ()=>{
  const llamadas = new Map();   // nombre -> dónde
  const buscar = (code, donde) => {
    // on*="algo(" en HTML generado o escrito a mano
    [...code.matchAll(/\son(?:click|change|input|submit|keydown|keyup|blur|focus)\s*=\s*(["'`])([\s\S]*?)\1/g)]
      .forEach(m => {
        // (?<![.\w$]) evita contar métodos: .replace(, this.select(...
        [...m[2].matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(/g)].forEach(f => {
          if(!llamadas.has(f[1])) llamadas.set(f[1], donde);
        });
      });
  };
  ficheros.forEach(f => buscar(sinComentarios(fuentes[f]), f));
  buscar(html, 'index.html');
  const rotas = [...llamadas.entries()]
    .filter(([n]) => !declaradas.has(n) && !CONOCIDAS.has(n))
    .map(([n,d]) => `${n} (${d})`);
  assert.deepEqual(rotas.slice(0,20), [], `${rotas.length} botones muertos: ${rotas.slice(0,10).join(', ')}`);
  return `${llamadas.size} funciones llamadas desde botones, todas existen`;
});

caso('Ninguna vista del menú se queda sin pantalla en el HTML', ()=>{
  // Un módulo declarado en FOLDERS sin su <section id="view-x"> no se
  // pinta: se navega a él y la pantalla queda en blanco.
  const ui = sinComentarios(fuentes['ui.js']);
  const bloque = ui.slice(ui.indexOf('const FOLDERS'), ui.indexOf('function', ui.indexOf('const FOLDERS')));
  const ids = [...bloque.matchAll(/\{\s*id:\s*'([\w-]+)'/g)].map(m => m[1]);
  const sinPantalla = [...new Set(ids)].filter(id => !html.includes(`id="view-${id}"`));
  assert.deepEqual(sinPantalla, [], `sin pantalla: ${sinPantalla.join(', ')}`);
  return `${new Set(ids).size} módulos, todos con su pantalla`;
});

caso('Cada vista del enrutador tiene su función de dibujo', ()=>{
  const ui = sinComentarios(fuentes['ui.js']);
  const casos = [...ui.matchAll(/case\s+'([\w-]+)':\s*(?:await\s+)?([A-Za-z_$][\w$]*)\s*\(/g)];
  const rotas = casos.filter(([,,fn]) => !declaradas.has(fn)).map(([,v,fn]) => `${v} → ${fn}`);
  assert.deepEqual(rotas, [], rotas.join(', '));
  return `${casos.length} vistas enrutadas, todas con su función`;
});

caso('Los ficheros se concatenan en el orden que espera el build', ()=>{
  const build = readFileSync(new URL('../build.sh', import.meta.url), 'utf8');
  const linea = build.split('\n').find(l => l.includes('for f in js/'));
  assert.ok(linea, 'no se encuentra el orden en build.sh');
  const enBuild = [...linea.matchAll(/js\/([\w.-]+\.js)/g)].map(m => m[1]);
  assert.deepEqual(enBuild, ORDEN, 'el orden del build no coincide con el que asume esta prueba');
  // Y que estén todos los ficheros que hay en la carpeta
  const enDisco = readdirSync(dir).filter(f => f.endsWith('.js')).sort();
  assert.deepEqual(enDisco, [...ORDEN].sort(), 'hay un fichero .js que el build no incluye');
  return `${ORDEN.length} ficheros, ninguno suelto`;
});

caso('Ninguna función se llama antes de que exista, entre ficheros', ()=>{
  // Las declaraciones function se elevan dentro de su fichero, pero si un
  // fichero EJECUTA algo al cargarse que vive en otro posterior, revienta.
  const problemas = [];
  ficheros.forEach((f, i) => {
    const code = sinComentarios(fuentes[f]);
    // Solo el nivel superior: líneas que empiezan sin indentar y llaman algo
    code.split('\n').forEach((linea, n) => {
      const m = linea.match(/^([A-Za-z_$][\w$]*)\s*\(/);
      if(!m) return;
      const fn = m[1];
      if(['if','for','while','switch','catch','function','return','typeof'].includes(fn)) return;
      const donde = declaradas.get(fn);
      if(!donde) return;
      const iDecl = ficheros.indexOf(donde[0]);
      if(iDecl > i) problemas.push(`${f}:${n+1} llama a ${fn}(), que vive en ${donde[0]}`);
    });
  });
  assert.deepEqual(problemas, [], problemas.join(' · '));
  return 'nada se ejecuta antes de tiempo';
});

console.log('\n' + '═'.repeat(64));
const fallos = res.filter(x=>!x).length;
console.log(fallos ? `❌ ${fallos} de ${res.length} fallaron` : `✅ los ${res.length} casos pasaron`);
process.exit(fallos ? 1 : 0);
