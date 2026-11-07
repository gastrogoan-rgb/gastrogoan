// TPV · impresión (8/11, auditoría): lo que sale solo (primer plato, para llevar, bebidas, pedido web aceptado) también se imprime
// UNA vez (sin un vale por toque), una anulación de lo ya marchado imprime «ANULADO», el ticket sale por el rollo del aparato (no por
// una ventana emergente) y «Cuenta» imprime la cuenta antes de cobrar sin ser una factura.
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



const prep = page => page.evaluate(() => {
  DB.business.comandas = {modo:'impresion', anchoTicket:80, printers:[
    {id:'k1', nombre:'Cocina', activo:true, anchoTicket:80, contenido:'comida'},
    {id:'b1', nombre:'Barra', activo:true, anchoTicket:58, contenido:'bebida'}]};
  window.__imp = [];
  window.printComandaTicket = (destino, titulo, lineas) => window.__imp.push({destino, titulo, lineas: lineas.map(l => `${l.qty}x ${l.name}`)});
  window.__rollo = [];
  window.printViaBrowser = (html, ancho, titulo, o) => { window.__rollo.push({html, ancho, titulo, o}); return true; };
  window.__ventanas = 0; const wo = window.open; window.open = (...a) => { window.__ventanas++; return wo ? null : null; };
});
const esperar = ms => new Promise(r => setTimeout(r, ms));

await caso('Para llevar: añadir un plato lo imprime en cocina (un solo vale aunque se pulse varias veces)', async () => {
  const {page, errs} = await abrir(1280, 800);
  await prep(page);
  await page.evaluate(() => { addOrderItem(950, 11, 103); addOrderItem(950, 11, 103); addOrderItem(950, 10, 101); });
  await esperar(3200);
  const imp = await page.evaluate(() => window.__imp);
  assert.equal(imp.length, 1, 'un solo vale: ' + JSON.stringify(imp));
  assert.equal(imp[0].destino, 'Cocina');
  assert.deepEqual(imp[0].lineas.sort(), ['1x Patatas bravas', '2x Hamburguesa de ternera']);
  assert.deepEqual(errs, []); await page.close();
});

await caso('Mesa nueva: el primer plato sale en cocina y la bebida en barra (antes no salían)', async () => {
  const {page, errs} = await abrir(1280, 800);
  await prep(page);
  await page.evaluate(() => { addOrderItem(903, 10, 100); addOrderItem(903, 12, 104); addOrderItem(903, 12, 104); });
  await esperar(3200);
  const imp = await page.evaluate(() => window.__imp);
  assert.equal(imp.length, 2, JSON.stringify(imp));
  const cocina = imp.find(i => i.destino === 'Cocina'), barra = imp.find(i => i.destino === 'Barra');
  assert.deepEqual(cocina.lineas, ['1x Croquetas de jamón ibérico']);
  assert.deepEqual(barra.lineas, ['2x Caña de cerveza']);
  assert.ok(/Mesa 4/.test(cocina.titulo));
  assert.deepEqual(errs, []); await page.close();
});

await caso('Modo pantalla: nada se imprime', async () => {
  const {page} = await abrir(1280, 800);
  await prep(page);
  await page.evaluate(() => { DB.business.comandas.modo = 'pantalla'; addOrderItem(903, 10, 100); });
  await esperar(3200);
  assert.equal((await page.evaluate(() => window.__imp)).length, 0);
  await page.close();
});

await caso('Anular lo ya marchado imprime «ANULADO» en la impresora que toca; anular lo no marchado no imprime', async () => {
  const {page, errs} = await abrir(1280, 800);
  await prep(page);
  await page.evaluate(() => { requestVoidLine(901, 0, 'remove'); confirmVoidLine(); });
  await esperar(300);
  let imp = await page.evaluate(() => window.__imp);
  assert.equal(imp.length, 1, JSON.stringify(imp));
  assert.equal(imp[0].destino, 'Cocina');
  assert.ok(/ANULADO/.test(imp[0].titulo) && /Mesa 2/.test(imp[0].titulo), imp[0].titulo);
  assert.deepEqual(imp[0].lineas, ['2x Solomillo al Pedro Ximénez']);
  await page.evaluate(() => { window.__imp.length = 0; requestVoidLine(900, 0, 'remove'); });
  // 900: croquetas sin marchar
  await page.evaluate(() => { const o = DB.tpvOrders.find(x => x.id === 900); o.items[0].marchada = 0; confirmVoidLine(); });
  await esperar(300);
  assert.equal((await page.evaluate(() => window.__imp)).length, 0, 'no marchado: no se avisa a cocina');
  assert.deepEqual(errs, []); await page.close();
});

await caso('Pedido web aceptado: la cocina recibe el vale', async () => {
  const {page, errs} = await abrir(1280, 800);
  await prep(page);
  await page.evaluate(() => { const f = (typeof acceptOnlineOrder === 'function') ? acceptOnlineOrder : null; if(!f) throw new Error('sin acceptOnlineOrder'); return f(953); });
  await esperar(300);
  const imp = await page.evaluate(() => window.__imp);
  assert.ok(imp.some(i => i.destino === 'Cocina' && i.lineas.includes('2x Patatas bravas')), JSON.stringify(imp));
  assert.deepEqual(errs, []); await page.close();
});

await caso('Ticket de cliente: sale por el rollo del aparato (58/80 mm), sin ventana emergente', async () => {
  const {page, errs} = await abrir(1280, 800);
  await prep(page);
  await page.evaluate(() => {
    const sale = {id:7001, date:todayStr(), time:'13:00', status:'cobrada', items:[{name:'Hamburguesa de ternera', price:14, qty:2}], total:28, metodo:'efectivo', pagos:[{metodo:'efectivo', importe:28}], numero:'T26K4P-000001'};
    DB.sales.push(sale); printTicket(sale);
  });
  const r = await page.evaluate(() => ({rollo: window.__rollo, v: window.__ventanas}));
  assert.equal(r.rollo.length, 1); assert.equal(r.v, 0, 'sin ventana emergente');
  assert.equal(r.rollo[0].ancho, 80); assert.equal(r.rollo[0].o.html, true);
  assert.ok(/Hamburguesa de ternera/.test(r.rollo[0].html));
  await page.evaluate(() => setTicketPaperWidth(58)); await page.evaluate(() => printTicket(DB.sales.find(s => s.id === 7001)));
  assert.equal((await page.evaluate(() => window.__rollo))[1].ancho, 58);
  assert.deepEqual(errs, []); await page.close();
});

await caso('Cuenta antes de cobrar: botón en el pedido, imprime «CUENTA» con total y aviso de que no es factura', async () => {
  const {page, errs} = await abrir(1280, 800);
  await prep(page);
  await page.evaluate(() => { openTableOrder(2); });
  await esperar(500);
  const hayBoton = await page.evaluate(() => !!document.querySelector('.tp-com-cuenta'));
  assert.ok(hayBoton, 'botón Cuenta en el pedido');
  await page.evaluate(() => document.querySelector('.tp-com-cuenta').click());
  const r = await page.evaluate(() => window.__rollo);
  assert.equal(r.length, 1);
  assert.ok(/CUENTA/.test(r[0].html) && /Solomillo/.test(r[0].html) && /44[,.]00/.test(r[0].html), r[0].html.slice(0, 400));
  assert.ok(/no es una factura/i.test(r[0].html));
  // una mesa vacía no ofrece cuenta
  await page.evaluate(() => { openTableOrder(4); });
  await esperar(400);
  assert.equal(await page.evaluate(() => !!document.querySelector('.tp-com-cuenta')), false);
  assert.deepEqual(errs, []); await page.close();
});

await browser.close();
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ casos pasaron');
process.exit(fallos ? 1 : 0);
