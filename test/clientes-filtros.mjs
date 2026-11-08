// Clientes · filtros completos (Recurrentes y Ocasionales) y Promoción › Clientes con la última visita REAL (8/11). (Base de pruebas: TPV rehecho 1/11): franja corta, cartas en un botón, mesas como fichas con filtros, tomar nota con la comanda siempre
// a la vista, notas rápidas, para llevar con el mismo lenguaje y AIRE por los cuatro lados en las ventanas.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}
async function abrir(w, h){
  const page = await browser.newPage();
  await page.setViewport({width:w, height:h, isMobile:w < 500, hasTouch:w < 1000});
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  page.on('dialog', d => d.dismiss().catch(() => {}));
  page.setDefaultTimeout(20000);
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
  await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
  await page.evaluate(() => {
    localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'TPVTEST01', tenantId: ggBizTenantId('TPVTEST01')}));
    localStorage.setItem('gastrogoan_owner_login', '1');
    localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
    localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
  });
  await page.reload({waitUntil:'domcontentloaded'});
  await new Promise(r => setTimeout(r, 2000));
  await page.evaluate(() => {
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id => document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    DB.tables.length = 0; DB.tpvOrders.length = 0; DB.cartas.length = 0; DB.sales.length = 0;
    const zonas = ['Salón','Salón','Salón','Salón','Salón','Salón','Terraza','Terraza','Terraza','Terraza','Barra','Barra'];
    zonas.forEach((zona, i) => DB.tables.push({id:i+1, name:`Mesa ${i+1}`, zona, plazas:4}));
    let pid = 100, sid = 10;
    const pl = (n, p) => ({id:pid++, nombre:n, precio:p, disponible:true, alergenos:''});
    DB.cartas.push({id:1, nombre:'Carta del día', secciones:[
      {id:sid++, nombre:'Entrantes', icono:'ic:none', platos:[pl('Croquetas de jamón ibérico', 9.5), pl('Patatas bravas', 6.5)]},
      {id:sid++, nombre:'Principales', icono:'ic:none', platos:[pl('Solomillo al Pedro Ximénez', 22), pl('Hamburguesa de ternera', 14)]},
    ]}, {id:2, nombre:'Bebidas', tipo:'bebida', secciones:[{id:sid++, nombre:'Cervezas y vinos', icono:'ic:none', platos:[pl('Caña de cerveza', 2.5)]}]});
    DB.activeCartaIds = [1, 2];
    const now = Date.now();
    const L = (n, p, q, tanda, estado, marchada, bebida) => ({lineId:genId(), platoId:pid++, recipeId:null, name:n, price:p, qty:q, tanda, estado, marchada, bebida:!!bebida, notas:''});
    const ord = (id, t, mins, items, pax) => DB.tpvOrders.push({id, tableId:t, tipo:'mesa', status:'abierta', pax, items, tandas:[...new Set(items.map(i => i.tanda))], createdAt:new Date(now - mins*60000).toISOString()});
    ord(900, 1, 12, [Object.assign(L('Croquetas de jamón ibérico', 9.5, 2, 'Entrantes', null, 0), {platoId:100})], 2);
    ord(901, 2, 34, [L('Solomillo al Pedro Ximénez', 22, 2, 'Principales', 'cocina', 2)], 3);
    ord(902, 3, 71, [L('Hamburguesa de ternera', 14, 2, 'Principales', 'entregado', 2)], 2);
    ord(903, 4, 5, [], 4);
    ord(905, 11, 95, [L('Caña de cerveza', 2.5, 4, 'Bebidas', 'entregado', 4, true)], 2);
    DB.tpvOrders.push({id:950, tableId:null, tipo:'takeaway', status:'abierta', clienteNombre:'Marta Ruiz', items:[L('Hamburguesa de ternera', 14, 1, 'Principales', null, 0)], tandas:['Principales'], createdAt:new Date(now - 4*60000).toISOString(), date:todayStr(), pagado:true});
    DB.tpvOrders.push({id:953, tableId:null, tipo:'takeaway', status:'pendiente-online', clienteNombre:'Lucía Gómez', items:[L('Patatas bravas', 6.5, 2, 'Entrantes', null, 0)], tandas:['Entrantes'], createdAt:new Date(now - 1*60000).toISOString(), date:todayStr(), origenOnline:true, clientRef:'ABCD1234EFGH'});
    saveDB();
    currentFolder = 'sala'; navigate('tpv');
  });
  await new Promise(r => setTimeout(r, 700));
  return {page, errs};
}



const esperar = ms => new Promise(r => setTimeout(r, ms));
const sembrar = page => page.evaluate(() => {
  const dia = n => { const d = new Date(); d.setDate(d.getDate() - n); return dateStr(d); };
  DB.clients = []; DB.sales = [];
  const cli = (id, name, extra) => DB.clients.push(Object.assign({id, name, phone:'612345678', email:name.toLowerCase().replace(/\W/g,'')+'@x.com', points:0, marketingConsent:true, allergies:'', noShows:0}, extra||{}));
  const venta = (cid, n, total) => DB.sales.push({id:9000 + DB.sales.length, clientId:cid, date:dia(n), createdAt:new Date().toISOString(), total:total||30, status:'cobrada', items:[], metodoPago:'Efectivo'});
  cli(1, 'Ana Reciente'); venta(1, 20); venta(1, 10); venta(1, 2);
  cli(2, 'Berta Ocasional'); venta(2, 100);
  cli(3, 'Carla Sinvisitas');
  cli(4, 'Dani Vip', {points:8}); venta(4, 10);
  cli(5, 'Eva Hace Cinco'); venta(5, 5); venta(5, 90);
  cli(6, 'Fran Sin Permiso', {marketingConsent:false, noShows:2, allergies:'gluten'}); venta(6, 2);
  saveDB(); currentFolder='sala'; navigate('clientes'); clientesPantalla = 'lista'; clientesFiltro = ''; renderClientes();
});
const nombres = page => page.evaluate(() => [...document.querySelectorAll('#clientes-content .cl-card-nom b')].map(b => b.innerText).sort());
const filtro = async (page, id) => { await page.evaluate(id => clSetFiltro(id), id); await esperar(200); return nombres(page); };

await caso('Clientes: los nueve filtros existen en el orden pedido y cada uno cuenta bien', async () => {
  const {page, errs} = await abrir(1280, 800);
  await sembrar(page); await esperar(500);
  const ids = await page.evaluate(() => clFiltrosDef().map(d => d.id));
  assert.deepEqual(ids, ['', 'new', 'vip', 'recurrent', 'occasional', 'atrisk', 'inactive', 'allergies', 'noshows', 'noconsent']);
  assert.deepEqual(await filtro(page, 'recurrent'), ['Ana Reciente', 'Dani Vip'], 'recurrentes: 2 visitas en 30 d o VIP');
  assert.deepEqual(await filtro(page, 'occasional'), ['Berta Ocasional', 'Eva Hace Cinco', 'Fran Sin Permiso'], 'ocasionales: con visitas pero no frecuentes');
  assert.deepEqual(await filtro(page, 'vip'), ['Dani Vip']);
  assert.deepEqual(await filtro(page, 'noconsent'), ['Fran Sin Permiso']);
  assert.deepEqual(await filtro(page, 'allergies'), ['Fran Sin Permiso']);
  assert.deepEqual(await filtro(page, 'noshows'), ['Fran Sin Permiso']);
  assert.ok((await filtro(page, 'inactive')).includes('Berta Ocasional') && (await filtro(page, 'inactive')).includes('Carla Sinvisitas'));
  const chips = await page.evaluate(() => [...document.querySelectorAll('#clientes-content .cl-chips button')].map(b => b.innerText.replace(/\s+/g, ' ').trim()));
  assert.ok(chips.some(c => /Recurrentes/.test(c)) && chips.some(c => /Ocasionales/.test(c)), chips.join('|'));
  assert.deepEqual(errs, []); await page.close();
});

await caso('Promoción › Clientes: «Visitas recientes» sale tras Cumpleaños con quien vino entre ayer y hace 3 días, según sus ventas', async () => {
  const {page, errs} = await abrir(1280, 800);
  await sembrar(page);
  await page.evaluate(() => { navigate('promocion'); setPromoTab && setPromoTab('clientes'); });
  await esperar(700);
  const r = await page.evaluate(() => {
    const secs = [...document.querySelectorAll('#promo-tab-content .pm-sec')];
    const titulos = secs.map(s => s.querySelector('h3').innerText.replace(/\s+/g, ' ').trim());
    const rec = secs.find(s => /recientes/i.test(s.querySelector('h3').innerText));
    return {titulos, recientes: rec ? [...rec.querySelectorAll('.pm-card-tit')].map(x => x.innerText) : null};
  });
  assert.match(r.titulos[0], /cumplea/i); assert.match(r.titulos[1], /Visitas recientes/i, r.titulos.join(' | '));
  // Ana vino hace 2 días (sí); Eva hace 5 (no); Fran vino hace 2 pero retiró el permiso (no)
  assert.deepEqual(r.recientes, ['Ana Reciente']);
  assert.deepEqual(errs, []); await page.close();
});

await browser.close();
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ casos pasaron');
process.exit(fallos ? 1 : 0);
