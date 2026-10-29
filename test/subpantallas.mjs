// Sub-pantallas de Comandas Cocina, Oferta Gastronómica e I+D (29/10): el diseño nuevo tiene que llegar a TODO lo que
// cuelga de un botón —modales, confirmaciones, selectores—, no solo a la pantalla principal. Abre cada uno y exige
// botones finos, sin barras de acento de color en el lado, sin las clases viejas de modal y sin desbordar, en PC y en 360.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox'], protocolTimeout:30000});
let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}
const esperar = ms => new Promise(r => setTimeout(r, ms));

async function abrir(ancho){
  const page = await browser.newPage();
  await page.setViewport({width:ancho, height: ancho < 600 ? 800 : 900});
  page.erroresJs = [];
  page.on('pageerror', e => page.erroresJs.push(e.message));
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
  await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
  await page.evaluate(code => {
    localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
    localStorage.setItem('gastrogoan_owner_login','1');
    localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted','1');
    localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
  }, 'SUBPANT01');
  await page.reload({waitUntil:'domcontentloaded'});
  await esperar(2200);
  await page.evaluate(()=>{
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, name:'Bar de Pruebas'});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    const pl = (id,n,pr,extra={}) => Object.assign({id,nombre:n,precio:pr,precioBase:pr/1.1,ivaPct:10,disponible:true,modificadores:[]}, extra);
    DB.recipes = [{id:1,name:'Croquetas de jamón',price:9,area:'cocina',ingredients:[],elaborations:[]},{id:2,name:'Arroz meloso',price:18,area:'cocina',ingredients:[],elaborations:[]}];
    DB.cartas = [{id:1,nombre:'CARTA PRINCIPAL',area:'cocina',horario:defaultItemHorario(),secciones:[{id:11,nombre:'Entrantes',platos:[pl(111,'Ensaladilla rusa',7.5,{modificadores:[{id:1,nombre:'Sin cebolla',precio:0}]}),pl(112,'Tartar de atún',16)]}]}];
    DB.menus = [{id:5,nombre:'Menú del día',area:'cocina',precio:14.5,precioBase:13.18,ivaPct:10,horario:defaultItemHorario(),grupos:[{id:51,nombre:'Primeros',opciones:[pl(511,'Sopa del día',0,{modificadores:[{id:1,nombre:'Sin sal',precio:0}]})]}]}];
    DB.idr = DB.idr || {}; DB.idr.adn = {cocina:'Cocina de mercado',nivel:'Bistró',publico:'Parejas'}; DB.idr.creaciones = []; DB.idr.carpetas = [];
    DB.tables = [{id:4,name:'Mesa 4',plazas:4}];
    DB.tpvOrders = [{id:901,tipo:'mesa',status:'abierta',area:'cocina',tableId:4,pax:4,cerrada:false,createdAt:new Date().toISOString(),items:[{platoId:111,name:'Croquetas',price:9,qty:2,tanda:'Entrantes',estado:'cocina',bebida:false,modificadores:[],enviadoAt:new Date().toISOString(),vale:1}]}];
    localStorage.setItem(idrKeyLS(), JSON.stringify({proveedor:'google', clave:'abc', modelo:'gemini-3.6-flash'}));
    saveDB();
  });
  return page;
}

// Lo que NO puede quedar en una sub-pantalla ya migrada.
const revisar = page => page.evaluate(() => {
  const m = document.getElementById('modal-box');
  const raiz = (document.getElementById('modal-overlay')?.classList.contains('active') ? m : null);
  if(!raiz) return {sinModal:true};
  const q = s => [...raiz.querySelectorAll(s)];
  return {
    botonesViejos: q('.btn:not(.btn-fino):not(.btn-back)').map(b => b.textContent.trim().slice(0,24)),
    claseVieja: q('.modal-head,.modal-foot,.card-compact').length + q('.modal-body .modal-body,.modal-body .modal-head').length,
    rayaLateral: q('[style*="border-left:4px"]').length,
    desborda: raiz.scrollWidth > raiz.clientWidth + 1,
    nuevo: raiz.classList.contains('ds-nuevo'),
  };
});

const MODALES = [
  ['Oferta · plato nuevo', () => { navigate('carta'); openCarta(1); addCartaPlato(11); }],
  ['Oferta · extras del plato', () => openPlatoModsModal(11,111)],
  ['Oferta · alérgenos', () => openPlatoAllergensModal(11,111)],
  ['Oferta · importar del Escandallo', () => importFromEscandallo(11)],
  ['Oferta · sección nueva', () => newCartaSection()],
  ['Oferta · iconos de la sección', () => openCartaSectionIconModal(11)],
  ['Oferta · raciones', () => setCartaPlatoStock(11,111)],
  ['Oferta · confirmar borrado', () => removeCartaPlato(11,111)],
  ['Oferta · grupo de menú nuevo', () => { setOfertaTab('menus'); openMenu(5); newMenuGrupo(); }],
  ['Oferta · opción de menú nueva', () => addMenuOpcion(51)],
  ['Oferta · extras de la opción', () => openMenuOpcionModsModal(51,511)],
  ['Comandas · aviso a sala', () => { navigate('comandascocina'); openAvisoSalaModal(); }],
  ['Comandas · incidencia', () => openIncidenciaModal(901,'cocina')],
  ['Comandas · plato agotado', () => openMarkDishOutModal()],
  ['I+D · asistente', () => { navigate('idr'); idrConfigModal(); }],
  ['I+D · ADN gastronómico', () => idrAdnModal()],
  ['I+D · elegir platos existentes', () => { const c = idrNuevaCreacion('menu'); c.encargo = {hecho:true,pvp:25,foodCost:30,bloques:[{nombre:'Entrantes',n:2}]}; idrElegirExistentes(c.id); }],
  ['I+D · pregúntale a tus números', () => abrirPreguntaNumeros()],
];

for(const ancho of [1280, 360]){
  const page = await abrir(ancho);
  for(const [nombre, f] of MODALES){
    await caso(`${nombre} (${ancho}px)`, async () => {
      await page.evaluate(`setTimeout(()=>{(${f.toString()})()},0)`);
      await esperar(450);
      const r = await revisar(page);
      assert.ok(!r.sinModal, 'no se abrió ningún modal');
      assert.deepEqual(r.botonesViejos, [], 'botones sin el estilo fino: ' + r.botonesViejos.join(', '));
      assert.equal(r.claseVieja, 0, 'quedan clases viejas de modal (modal-head/foot, card-compact)');
      assert.equal(r.rayaLateral, 0, 'barra de acento a un lado (estilo viejo)');
      assert.ok(!r.desborda, 'el modal desborda en horizontal');
      assert.ok(r.nuevo, 'el modal no lleva el marcador ds-nuevo');
      await page.evaluate(()=>{ try{ closeModal(); }catch(e){} document.getElementById('modal-overlay').classList.remove('active'); });
    });
  }
  await caso(`Ningún error de JavaScript (${ancho}px)`, async () => {
    assert.deepEqual(page.erroresJs, [], page.erroresJs.join(' | '));
  });
  await page.close();
}

console.log('\n' + '═'.repeat(70));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
