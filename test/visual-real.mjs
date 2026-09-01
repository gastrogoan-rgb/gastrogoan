// AUDITORÍA VISUAL DE VERDAD — PC, tablet y móvil.
//
// La otra auditoría visual mira desbordamientos sobre datos de prueba
// mínimos. Esta corre sobre la DEMO, con un negocio lleno (33 ingredientes,
// carta, 1.600 ventas, turnos), que es cuando las pantallas se rompen de
// verdad: con cuatro filas todo cabe.
//
// Comprueba lo que se ve mal de un vistazo y deja las capturas para poder
// mirarlas a ojo, que es lo único que caza lo que ninguna regla detecta.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

/* `tactil` no es un adorno: sin él el navegador se declara "ratón"
   (pointer: fine) y las reglas de CSS pensadas para el dedo no se aplican,
   así que la auditoría medía botones de escritorio creyendo que eran de
   tablet. Un móvil y una tablet de verdad SON táctiles. */
const TAMANOS = [
  {nombre: 'movil',      w: 390,  h: 844,  tactil: true},
  {nombre: 'tablet',     w: 820,  h: 1180, tactil: true},
  {nombre: 'escritorio', w: 1440, h: 900,  tactil: false},
];

/* Los nombres REALES de las vistas (los ids de index.html). Poner
   'empleados' o 'ingredientes' no da error: navega a una vista que no existe
   y deja la pantalla en blanco, así que la auditoría cree haber revisado algo
   que nunca se pintó. Se comprueban con:
     grep -o 'id="view-[a-z-]*"' index.html */
const VISTAS = [
  ['inicio',        "navigate('home')"],
  ['cocina',        "currentFolder='cocina'; navigate('folder')"],
  ['megalista',     "navigate('megalista')"],
  ['escandallo',    "navigate('escandallo')"],
  ['fichas',        "navigate('fichas')"],
  ['idr',           "navigate('idr')"],
  ['stock',         "navigate('stock')"],
  ['proveedores',   "navigate('proveedores')"],
  ['pedidos',       "navigate('pedidos')"],
  ['comandascocina',"navigate('comandascocina')"],
  ['tpv',           "navigate('tpv')"],
  ['carta',         "navigate('carta')"],
  ['reservas',      "navigate('reservas')"],
  ['clientes',      "navigate('clientes')"],
  ['panel',         "navigate('dashboard')"],
  ['horarios',      "navigate('horarios')"],
  ['distribucion',  "navigate('distribucion')"],
  ['limpieza',      "navigate('limpieza')"],
  ['economia',      "navigate('economia')"],
  ['promocion',     "navigate('promocion')"],
  ['minegocio',     "navigate('minegocio')"],
];


const REVISION = (tactil) => `(() => {
  const TACTIL = ${tactil};
  const fuera = [], pequenos = [], cortados = [], tapados = [];
  const W = window.innerWidth;
  const vista = document.querySelector('.view.active') || document.body;

  const visible = el => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  };
  /* Una tabla ancha DENTRO de un contenedor que se desplaza en horizontal no
     es un defecto: es la solución. Ya se dio por hallazgo una vez y se perdió
     el rato. Se ignora lo que cuelgue de un ancestro con scroll propio. */
  const enContenedorConScroll = el => {
    for(let p = el.parentElement; p && p !== document.body; p = p.parentElement){
      const o = getComputedStyle(p).overflowX;
      if(o === 'auto' || o === 'scroll') return true;
    }
    return false;
  };
  const nombre = el => (el.id ? '#'+el.id : '') + (el.className && typeof el.className === 'string' ? '.'+el.className.split(' ').filter(Boolean).slice(0,2).join('.') : '') + ' «' + (el.textContent||'').trim().slice(0,30) + '»';

  vista.querySelectorAll('*').forEach(el => {
    if(!visible(el)) return;
    const r = el.getBoundingClientRect();
    const cs0 = getComputedStyle(el);
    // 1) Se sale por la derecha de la pantalla
    if(r.right > W + 2 && r.width < W * 1.6 && !enContenedorConScroll(el)) fuera.push(nombre(el) + ' (' + Math.round(r.right - W) + 'px fuera)');
    /* 2) Objetivo táctil. Solo se exige en móvil y tablet: en escritorio se
          usa ratón, y un botón de 36 px es lo normal y no molesta a nadie.
          Aplicarlo también ahí llenaba el informe de ruido y tapaba lo real. */
    /* Solo lo que ES un botón. Un teléfono o un "WhatsApp" dentro de un
       párrafo son enlaces de texto: no se pulsan con el pulgar buscando un
       objetivo, se leen. Exigirles 44 px llenaba el informe de ruido. */
    const esBoton = el.tagName === 'BUTTON' ||
      (el.tagName === 'A' && (/\bbtn\b/.test(el.className||'') || ['block','flex','inline-flex','inline-block'].includes(cs0.display)));
    if(TACTIL && esBoton && (r.height < 40 || r.width < 24)){
      pequenos.push(nombre(el) + ' (' + Math.round(r.width) + '×' + Math.round(r.height) + ')');
    }
    // 3) Texto recortado sin posibilidad de leerlo
    const cs = cs0;
    if(el.children.length === 0 && (el.textContent||'').trim().length > 3 &&
       cs.overflow !== 'visible' && cs.textOverflow !== 'ellipsis' &&
       el.scrollWidth > el.clientWidth + 4 && cs.overflowX !== 'auto' && cs.overflowX !== 'scroll'){
      cortados.push(nombre(el));
    }
  });

  return {
    fuera: [...new Set(fuera)].slice(0, 6),
    pequenos: [...new Set(pequenos)].slice(0, 6),
    cortados: [...new Set(cortados)].slice(0, 6),
    scrollHorizontal: document.documentElement.scrollWidth > W + 2,
    // Una pantalla que no pinta nada es tan defecto como una rota
    elementos: vista.querySelectorAll('*').length,
    tieneTitulo: !!(vista.querySelector('h1, h2, .view-title, .folder-top-title, .home-hero') || {}).textContent,
    alto: Math.round(vista.getBoundingClientRect().height),
  };
})()`;

const SALIDA = 'test/capturas';
fs.rmSync(SALIDA, {recursive: true, force: true});
fs.mkdirSync(SALIDA, {recursive: true});

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox'],headless:true});
const page = await browser.newPage();
const errores = [];
page.on('pageerror', e => errores.push(e.message));

let hallazgos = 0;
const informe = [];

for(const t of TAMANOS){
  await page.setViewport({width: t.w, height: t.h, isMobile: t.tactil, hasTouch: t.tactil});
  /* ⚠️ `hasTouch` NO cambia lo que el CSS ve como tipo de puntero: la
     consulta `pointer: coarse` seguía dando "ratón" y las reglas pensadas
     para el dedo no se aplicaban. Medíamos botones de escritorio creyendo que
     eran de tablet. Hay que emularlo explícitamente. */
  // Puppeteer no admite 'pointer' en emulateMediaFeatures, así que se manda
  // por el protocolo del navegador directamente.
  const cdp = await page.createCDPSession();
  await cdp.send('Emulation.setEmulatedMedia', {features: [
    {name: 'pointer', value: t.tactil ? 'coarse' : 'fine'},
    {name: 'any-pointer', value: t.tactil ? 'coarse' : 'fine'},
  ]});
  await cdp.detach();
  // El cambio de viewport recarga y borra el estado: se abre de nuevo.
  await page.goto('http://localhost:8950/dist/kit-gastrogoan-DEMO.html', {waitUntil:'domcontentloaded'});
  await new Promise(r => setTimeout(r, 3200));

  for(const [nombre, codigo] of VISTAS){
    try{
      await page.evaluate(c => { try{ eval(c); }catch(e){} }, codigo);
      await new Promise(r => setTimeout(r, 450));
      const r = await page.evaluate(REVISION(t.tactil));
      await page.screenshot({path: path.join(SALIDA, `${t.nombre}-${nombre}.png`)});

      const problemas = [];
      if(r.scrollHorizontal) problemas.push('la página se desplaza en horizontal');
      if(r.fuera.length) problemas.push('se salen de la pantalla: ' + r.fuera.join(' · '));
      if(r.pequenos.length) problemas.push('botones por debajo del objetivo táctil: ' + r.pequenos.join(' · '));
      if(r.cortados.length) problemas.push('texto recortado: ' + r.cortados.join(' · '));
      if(!r.tieneTitulo) problemas.push('LA PANTALLA NO SE PINTÓ: sin título (' + r.elementos + ' elementos). ¿Existe esa vista?');

      if(problemas.length){
        hallazgos += problemas.length;
        informe.push({donde: `${t.nombre} / ${nombre}`, problemas});
        console.log(`⚠ ${t.nombre} / ${nombre}`);
        problemas.forEach(p => console.log('   · ' + p));
      }
    }catch(e){
      hallazgos++;
      informe.push({donde: `${t.nombre} / ${nombre}`, problemas: ['reventó: ' + e.message]});
      console.log(`❌ ${t.nombre} / ${nombre} — ${e.message}`);
    }
  }
  console.log(`— ${t.nombre} (${t.w}×${t.h}) revisado`);
}

await browser.close();
fs.writeFileSync(path.join(SALIDA, 'informe.json'), JSON.stringify(informe, null, 2));

const capturas = fs.readdirSync(SALIDA).filter(f => f.endsWith('.png')).length;
console.log('\n' + '─'.repeat(64));
console.log(`${capturas} capturas en ${SALIDA}/ · ${TAMANOS.length} tamaños × ${VISTAS.length} vistas`);
const erroresReales = errores.filter(e => !/Failed to fetch|NetworkError|firebase|net::/i.test(e));
if(erroresReales.length) console.log('⚠ errores de JavaScript: ' + erroresReales.join(' | '));
console.log(hallazgos ? `⚠ ${hallazgos} hallazgos — ver arriba` : '✅ Nada que señalar');
process.exit(0);
