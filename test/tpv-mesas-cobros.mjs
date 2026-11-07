// TPV rehecho (1/11): franja corta, cartas en un botón, mesas como fichas con filtros, tomar nota con la comanda siempre
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


const nuevoPedido = (page, id, mesa, lineas) => page.evaluate((id, mesa, lineas) => {
  const L = (n, p, q, estado) => ({lineId:genId(), platoId:null, recipeId:null, name:n, price:p, qty:q, tanda:'Principales', estado, marchada:estado ? q : 0, bebida:false, notas:'', vale:1});
  DB.tpvOrders = DB.tpvOrders.filter(o => o.id !== id);
  DB.tpvOrders.push({id, tableId:mesa, tipo:'mesa', status:'abierta', pax:2, items:lineas.map(l => L(...l)), tandas:['Principales'], createdAt:new Date().toISOString(), valeActual:1});
  saveDB();
}, id, mesa, lineas);
const cobrar = (page, id, campos) => page.evaluate(async (id, campos) => {
  const esp = ms => new Promise(r => setTimeout(r, ms));
  closeModal(); openPaymentModal(id); await esp(250);
  const set = (k, v) => { const e = document.getElementById(k); if(e){ e.value = v; e.dispatchEvent(new Event('input', {bubbles:true})); e.dispatchEvent(new Event('change', {bubbles:true})); } };
  Object.entries(campos).forEach(([k, v]) => set(k, v));
  const antes = DB.sales.length;
  finalizeCharge(id); await esp(300);
  const sale = DB.sales.find(x => x.id === id);
  return {nuevas: DB.sales.length - antes, total: sale && sale.total, metodo: sale && sale.metodoPago, pagos: sale && (sale.pagos || []).map(p => p.metodoPago + ':' + p.amount), propina: sale && sale.propina, estado: (DB.tpvOrders.find(o => o.id === id) || {}).status, numero: sale && (sale.numero || sale.ticketNumero || sale.nTicket)};
}, id, campos);

await caso('Cobro en efectivo: con cambio se cierra; entregando de menos NO se cierra', async () => {
  const {page} = await abrir(1280, 800);
  await nuevoPedido(page, 2001, 5, [['Solomillo', 22, 2, 'entregado']]);
  const corto = await cobrar(page, 2001, {'payment-method':'Efectivo', 'payment-cash':'10'});
  assert.equal(corto.nuevas, 0, 'con 10 € de 44 no se cobra: ' + JSON.stringify(corto));
  const ok = await cobrar(page, 2001, {'payment-method':'Efectivo', 'payment-cash':'50'});
  assert.equal(ok.nuevas, 1); assert.equal(ok.total, 44); assert.equal(ok.metodo, 'Efectivo'); assert.equal(ok.estado, 'pagada');
  await page.close();
});
await caso('Tarjeta con propina: la venta lleva la propina y el total', async () => {
  const {page} = await abrir(1280, 800);
  await nuevoPedido(page, 2002, 6, [['Hamburguesa', 14, 1, 'entregado']]);
  const r = await cobrar(page, 2002, {'payment-method':'Tarjeta', 'payment-tip':'2'});
  assert.equal(r.nuevas, 1); assert.equal(r.total, 16, JSON.stringify(r)); assert.equal(r.propina, 2, JSON.stringify(r)); assert.equal(r.metodo, 'Tarjeta');
  await page.close();
});
await caso('Mixto: al teclear el efectivo la tarjeta se ajusta al resto y suman lo debido', async () => {
  const {page} = await abrir(1280, 800);
  await nuevoPedido(page, 2003, 7, [['Solomillo', 22, 1, 'entregado'], ['Hamburguesa', 14, 1, 'entregado']]);
  // Al teclear el efectivo, la tarjeta se ajusta sola al resto: no se puede dejar un mixto que no cuadre.
  const bien = await cobrar(page, 2003, {'payment-method':'Mixto', 'payment-mixed-cash':'20'});
  assert.equal(bien.nuevas, 1); assert.equal(bien.total, 36); assert.deepEqual(bien.pagos.sort(), ['Efectivo:20', 'Tarjeta:16'], JSON.stringify(bien));
  await page.close();
});
await caso('Descuento autorizado: el total cobrado lo lleva y queda el motivo', async () => {
  const {page} = await abrir(1280, 800);
  await nuevoPedido(page, 2004, 8, [['Solomillo', 22, 2, 'entregado']]);
  await page.evaluate(() => { const o = DB.tpvOrders.find(x => x.id === 2004); o.descuentoPct = 10; o.descuentoMotivo = 'Cliente habitual'; o.descuentoResponsableNombre = 'Dueño'; saveDB(); });
  const r = await cobrar(page, 2004, {'payment-method':'Tarjeta'});
  assert.equal(r.nuevas, 1); assert.equal(r.total, 39.6, JSON.stringify(r));
  await page.close();
});
await caso('Dividir a partes iguales: suman exactamente el total, una parte en efectivo corta no se acepta y al final se cierra UNA venta', async () => {
  const {page} = await abrir(1280, 800);
  await nuevoPedido(page, 2005, 9, [['Solomillo', 22, 1, 'entregado'], ['Hamburguesa', 14, 1, 'entregado'], ['Croquetas', 9.5, 1, 'entregado']]);   // 45,50
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms));
    closeModal(); openPaymentModal(2005); await esp(250);
    setPaymentTab(2005, 'equal'); await esp(200);
    document.getElementById('split-equal-n').value = '3'; generateEqualSplit(2005); await esp(250);
    const o = DB.tpvOrders.find(x => x.id === 2005);
    const suma = roundMoney(o.splitPayments.reduce((s, p) => s + p.amount, 0));
    const out = {n: o.splitPayments.length, suma};
    // parte 1 en efectivo con 5 € (de ~15,17): no
    openSplitPartPayment(2005, 1); await esp(200);
    document.getElementById('split-part-method').value = 'Efectivo'; document.getElementById('split-part-cash').value = '5';
    confirmSplitPartPayment(2005, 1); await esp(200);
    out.corta = o.splitPayments[0].paid;
    for(const p of o.splitPayments){ openSplitPartPayment(2005, p.id); await esp(120); document.getElementById('split-part-method').value = 'Tarjeta'; confirmSplitPartPayment(2005, p.id); await esp(120); }
    out.todas = o.splitPayments.every(p => p.paid);
    const antes = DB.sales.length;
    finalizeSplitOrder(2005); await esp(350);
    out.nuevas = DB.sales.length - antes; out.total = (DB.sales.find(x => x.id === 2005) || {}).total;
    return out;
  });
  assert.equal(r.n, 3); assert.equal(r.suma, 45.5, 'las tres partes suman justo la cuenta: ' + JSON.stringify(r)); assert.equal(r.corta, false, 'efectivo corto no se acepta: ' + JSON.stringify(r));
  assert.ok(r.todas && r.nuevas === 1 && r.total === 45.5, JSON.stringify(r));
  await page.close();
});

await caso('Cambio de mesa: la comanda pasa a la mesa libre, cocina lo ve («antes: Mesa X») y avisa por el chat', async () => {
  const {page} = await abrir(1280, 800);
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms));
    openTableOrder(2, 901); await esp(300);
    openTableTransferModal(901); await esp(250);
    const libres = [...document.querySelectorAll('#transfer-table-sel option')].map(o => o.textContent).filter(x => x !== '—');
    document.getElementById('transfer-table-sel').value = '10'; confirmTransferTable(901); await esp(300);
    const o = DB.tpvOrders.find(x => x.id === 901);
    currentFolder = 'cocina'; navigate('comandascocina'); await esp(500);
    const tk = document.querySelector('.kt[data-orden="901"]');
    return {libres: libres.length, tableId: o.tableId, antes: o.mesaAnterior, ticket: tk ? tk.querySelector('.kt-mesa').textContent.trim() + ' | ' + tk.querySelector('.kt-meta').textContent.replace(/\s+/g,' ').trim() : null, chat: (DB.chatMessages || []).some(m => /Mesa 2.*Mesa 10/.test(m.text))};
  });
  assert.equal(r.tableId, 10); assert.equal(r.antes, 'Mesa 2'); assert.match(r.ticket, /Mesa 10/); assert.match(r.ticket, /antes: Mesa 2/i, JSON.stringify(r)); assert.ok(r.chat, JSON.stringify(r));
  await page.close();
});
await caso('Fusionar mesas: no se pierden los alérgenos ni la cuenta, y cocina sigue viendo DOS vales distintos', async () => {
  const {page} = await abrir(1280, 800);
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms));
    const a = DB.tpvOrders.find(x => x.id === 901), b = DB.tpvOrders.find(x => x.id === 902);
    a.tableAllergenList = ['Gluten']; b.tableAllergenList = ['Huevos']; b.tableAllergenNote = 'Celíaco'; a.tableAllergens = tableAllergensTexto(a); b.tableAllergens = tableAllergensTexto(b);
    b.items.forEach(l => { l.estado = 'cocina'; l.enviadoAt = new Date().toISOString(); });
    window.confirmModal = async () => true;
    openTableOrder(3, 902); await esp(250);
    openTableTransferModal(902); await esp(250);
    document.getElementById('merge-table-sel').value = String(a.tableId);
    await confirmMergeTable(902); await esp(400);
    const m = DB.tpvOrders.find(x => x.id === 901);
    return {existeOrigen: !!DB.tpvOrders.find(x => x.id === 902), lista: m.tableAllergenList, nota: m.tableAllergenNote, lineas: m.items.length, vales: [...new Set(m.items.map(l => l.vale || 1))].sort(), total: orderTotal(m)};
  });
  assert.ok(!r.existeOrigen && r.lineas === 2, JSON.stringify(r)); assert.deepEqual(r.lista.sort(), ['Gluten', 'Huevos']); assert.match(r.nota, /Celíaco/);
  assert.equal(r.vales.length, 2, 'dos vales, no uno mezclado: ' + JSON.stringify(r)); assert.equal(r.total, 72, '44 + 28: ' + JSON.stringify(r));
  await page.close();
});
await caso('Ningún error de JavaScript', async () => { const {page, errs} = await abrir(1280, 800); await new Promise(r => setTimeout(r, 400)); assert.deepEqual(errs, []); await page.close(); });
console.log('\n' + '═'.repeat(70));
console.log(fallos ? `❌ ${fallos} casos fallaron` : '✅ casos pasaron');
await browser.close(); process.exit(fallos ? 1 : 0);
