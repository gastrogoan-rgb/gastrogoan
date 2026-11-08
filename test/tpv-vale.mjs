// TPV · vale regalo como forma de pago (8/11). (Base de pruebas: TPV rehecho 1/11): franja corta, cartas en un botón, mesas como fichas con filtros, tomar nota con la comanda siempre
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
  DB.giftVouchers = [
    {id:1, code:'GGAB-1234', tipo:'importe', importe:30, createdAt:todayStr(), venceEn:null, fiscal:'polivalente', iva:0},
    {id:2, code:'GGCD-5678', tipo:'importe', importe:100, createdAt:todayStr(), venceEn:null, fiscal:'polivalente', iva:0},
    {id:3, code:'GGEX-0001', tipo:'importe', importe:20, createdAt:'2020-01-01', venceEn:'2021-01-01', fiscal:'polivalente', iva:0},
    {id:4, code:'GGXP-0002', tipo:'experiencia', descripcion:'Cena para dos', importe:0, createdAt:todayStr(), venceEn:null, fiscal:'ninguno'}];
  DB.ge = DB.ge || {}; DB.ge.vales = [];
  DB.giftVouchers.filter(v => v.tipo === 'importe').forEach(v => valeAsientoAlta(v));
  saveDB();
});
const abrirCobro = (page, id) => page.evaluate(id => { paymentTab = 'full'; renderPaymentModal(id); }, id);
const poner = (page, code) => page.evaluate(code => { document.getElementById('payment-vale-code').value = code; aplicarValeEnCobro(DB.tpvOrders.find(o => o.items.length && o.status !== 'pagada' && document.getElementById('payment-vale-code')).id); }, code);
const due = page => page.evaluate(() => document.getElementById('payment-final-total').textContent.replace(/[^\d,.]/g, ''));

await caso('Un vale que cubre parte de la cuenta: resta del cobro y se resta del saldo del vale al cobrar (queda canje parcial)', async () => {
  const {page, errs} = await abrir(1280, 800);
  await sembrar(page);
  // mesa 2 (order 901): 44 €
  await abrirCobro(page, 901);
  await page.evaluate(() => { document.getElementById('payment-vale-code').value = 'ggab 1234'; aplicarValeEnCobro(901); });
  assert.match(await due(page), /14[,.]00/, 'quedan 14 € por cobrar tras 30 € de vale');
  assert.ok(await page.evaluate(() => /GGAB-1234/.test(document.querySelector('.pm-vale-ap').innerText)));
  await page.evaluate(() => { document.getElementById('payment-method').value = 'Tarjeta'; togglePaymentCash(); finalizeCharge(901); });
  const r = await page.evaluate(() => { const s = DB.sales.find(x => x.id === 901); const v = DB.giftVouchers[0]; return {total:s.total, pagos:s.pagos, valeId:s.valeId, valeImporte:s.valeImporte, estado:valeEstado(v), saldo:valeSaldo(v), asiento:DB.ge.vales[0].canjeFecha}; });
  assert.equal(r.total, 44); assert.equal(r.valeImporte, 30); assert.equal(r.estado, 'canjeado'); assert.equal(r.saldo, 0);
  assert.deepEqual(r.pagos.map(p => [p.metodoPago, p.amount]), [['Tarjeta', 14], ['Vale', 30]]);
  assert.ok(r.asiento, 'el asiento contable del vale queda canjeado');
  assert.deepEqual(errs, []); await page.close();
});

await caso('Un vale mayor que la cuenta cubre todo y le queda saldo; cobrar no pide efectivo ni tarjeta', async () => {
  const {page, errs} = await abrir(1280, 800);
  await sembrar(page);
  await abrirCobro(page, 901);
  await page.evaluate(() => { document.getElementById('payment-vale-code').value = 'GGCD-5678'; aplicarValeEnCobro(901); });
  assert.match(await due(page), /^0[,.]00/);
  await page.evaluate(() => finalizeCharge(901));
  const r = await page.evaluate(() => { const s = DB.sales.find(x => x.id === 901); const v = DB.giftVouchers[1]; return {s, estado:valeEstado(v), saldo:valeSaldo(v), pagos:s.pagos}; });
  assert.equal(r.estado, 'parcial'); assert.equal(r.saldo, 56);
  assert.deepEqual(r.pagos.map(p => [p.metodoPago, p.amount]), [['Vale', 44]]);
  assert.equal(r.s.metodoPago, 'Vale');
  assert.deepEqual(errs, []); await page.close();
});

await caso('Vale caducado, inexistente o de experiencia: se rechaza y la cuenta no cambia', async () => {
  const {page, errs} = await abrir(1280, 800);
  await sembrar(page);
  await abrirCobro(page, 901);
  for(const c of ['GGEX-0001', 'NOEXISTE', 'GGXP-0002']){
    await page.evaluate(c => { document.getElementById('payment-vale-code').value = c; aplicarValeEnCobro(901); }, c);
    assert.match(await due(page), /44[,.]00/, c);
    assert.equal(await page.evaluate(() => !!document.querySelector('.pm-vale-ap')), false, c);
  }
  assert.deepEqual(errs, []); await page.close();
});

await caso('Quitar el vale antes de cobrar no consume nada; anular la venta devuelve el saldo al vale', async () => {
  const {page, errs} = await abrir(1280, 800);
  await sembrar(page);
  await abrirCobro(page, 901);
  await page.evaluate(() => { document.getElementById('payment-vale-code').value = 'GGAB-1234'; aplicarValeEnCobro(901); quitarValeEnCobro(901); });
  assert.match(await due(page), /44[,.]00/);
  assert.equal(await page.evaluate(() => valeSaldo(DB.giftVouchers[0])), 30);
  await page.evaluate(() => { document.getElementById('payment-vale-code').value = 'GGAB-1234'; aplicarValeEnCobro(901); document.getElementById('payment-method').value = 'Tarjeta'; finalizeCharge(901); });
  assert.equal(await page.evaluate(() => valeSaldo(DB.giftVouchers[0])), 0);
  await page.evaluate(() => { const s = DB.sales.find(x => x.id === 901); devolverValeDeVenta(s); });
  const r = await page.evaluate(() => ({saldo: valeSaldo(DB.giftVouchers[0]), est: valeEstado(DB.giftVouchers[0]), asiento: DB.ge.vales[0].canjeParcial}));
  assert.equal(r.saldo, 30); assert.equal(r.est, 'pendiente'); assert.equal(r.asiento, 0);
  assert.deepEqual(errs, []); await page.close();
});

await caso('Cierre de caja: el vale no entra en el efectivo ni en la tarjeta esperadas', async () => {
  const {page, errs} = await abrir(1280, 800);
  await sembrar(page);
  await abrirCobro(page, 901);
  await page.evaluate(() => { document.getElementById('payment-vale-code').value = 'GGAB-1234'; aplicarValeEnCobro(901); document.getElementById('payment-method').value = 'Efectivo'; document.getElementById('payment-cash').value = '14'; finalizeCharge(901); });
  const t = await page.evaluate(() => computeClosureTotals(DB.sales.filter(s => s.id === 901)).totales);
  assert.equal(t.Efectivo, 14); assert.equal(t.Tarjeta, 0); assert.equal(t.Otro, 30);
  assert.deepEqual(errs, []); await page.close();
});

await caso('El modal de cobro con el vale cabe en móvil (360) sin scroll lateral', async () => {
  const {page, errs} = await abrir(360, 740);
  await sembrar(page);
  await abrirCobro(page, 901);
  await page.evaluate(() => { document.getElementById('payment-vale-code').value = 'GGAB-1234'; aplicarValeEnCobro(901); });
  const m = await page.evaluate(() => { const b = document.querySelector('.modal-body, .modal'); return {sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, ap: !!document.querySelector('.pm-vale-ap')}; });
  assert.ok(m.ap && m.sw <= m.cw, JSON.stringify(m));
  assert.deepEqual(errs, []); await page.close();
});

await browser.close();
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ casos pasaron');
process.exit(fallos ? 1 : 0);
