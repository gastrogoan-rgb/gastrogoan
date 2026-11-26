// DOS APARATOS COBRANDO LA MISMA MESA (26/11, decisión del dueño: «conservar las dos»).
// La venta lleva `id: order.id` a propósito (un doble toque no duplica), pero si dos aparatos cobran la misma mesa casi a la vez
// (efectivo en uno, tarjeta en otro) las dos ventas compartían id y la fusión (mergeArraysById / ventas una a una) se quedaba
// con UNA: el otro cobro se perdía en silencio y el cierre de caja no cuadraba. Ahora se conservan las dos (la más antigua
// guarda el id, la otra pasa a `id~createdAt`, igual en todos los aparatos), el dueño recibe un aviso y dos ventas IDÉNTICAS se
// siguen fundiendo en una. Dos aparatos = dos contextos de navegador (no comparten localStorage ni IndexedDB).
// Puerto: PUERTO=8961 (por defecto 8950, el de la batería).
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const PUERTO = process.env.PUERTO || '8950';
const URL = `http://localhost:${PUERTO}/dist/index.html`;
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
let fallos = 0, casos = 0;
async function caso(n, fn){ casos++; try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const w = ms => new Promise(r => setTimeout(r, ms));

async function aparato(){
  const ctx = await (browser.createBrowserContext ? browser.createBrowserContext() : browser.createIncognitoBrowserContext());
  const page = await ctx.newPage(); await page.setViewport({width:1280, height:800});
  page.errs = []; page.on('pageerror', e => page.errs.push(e.message));
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|raw.githubusercontent/.test(r.url()) ? r.abort() : r.continue());
  await page.goto(URL, {waitUntil:'domcontentloaded'}); await w(1500);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('gastrogoan_owner_login', '1'); localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
    localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts: Date.now()}));
    localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0, 10));
    localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code: 'COBROMES', tenantId: ggBizTenantId('COBROMES')}));
  });
  await page.goto('about:blank'); await page.goto(URL + '#tpv', {waitUntil:'domcontentloaded'}); await w(2500);
  await page.evaluate(() => {
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate','app-splash','access-select-screen'].forEach(id => document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    DB.sales = []; DB.auditLog = []; lastSyncedSnapshot = {};
  });
  return page;
}
/* La misma mesa abierta en el aparato (mismo id de pedido en los dos) y cobrada con el método dado. */
async function cobrar(page, metodo){
  return page.evaluate(m => {
    DB.tpvOrders = [{id: 777001, tableId: 1, tipo: 'mesa', status: 'abierta', pax: 2, items: [{id: 1, name: 'Menú del día', qty: 4, price: 25, estado: 'servido', tanda: 1}], tandas: [{n: 1}]}];
    document.getElementById('cobro-falso')?.remove();
    const d = document.createElement('div'); d.id = 'cobro-falso';
    d.innerHTML = `<select id="payment-method"><option value="${m}" selected>${m}</option></select><input id="payment-cash" value="100">`;
    document.body.appendChild(d);
    const s = finalizeCharge(777001);
    document.querySelectorAll('.modal-overlay').forEach(x => x.remove());
    d.remove();
    return s ? {id: s.id, createdAt: s.createdAt, total: s.total, metodoPago: s.metodoPago, ticketNum: s.ticketNum} : null;
  }, metodo);
}
const ventas = p => p.evaluate(() => JSON.parse(JSON.stringify(DB.sales)));
const aviso = p => p.evaluate(() => DB.auditLog.filter(e => e.action === 'cobro_duplicado').length);
const entrar = (p, lista) => p.evaluate(l => applyRemoteBlock('sales', JSON.parse(JSON.stringify(l))), lista);

// Dos aparatos, la misma mesa, 100 € en efectivo en uno y 100 € con tarjeta en el otro (con 25 ms de diferencia)
const A = await aparato(), B = await aparato();
const ca = await cobrar(A, 'Efectivo'); await w(25); const cb = await cobrar(B, 'Tarjeta');

await caso('punto de partida: los dos aparatos cobran la misma mesa y crean ventas con el MISMO id', async () => {
  assert.ok(ca && cb, 'finalizeCharge no devolvió venta: ' + JSON.stringify({ca, cb, ea: A.errs, eb: B.errs}));
  assert.equal(ca.id, cb.id); assert.equal(ca.id, 777001);
  assert.notEqual(ca.createdAt, cb.createdAt); assert.equal(ca.metodoPago, 'Efectivo'); assert.equal(cb.metodoPago, 'Tarjeta');
});

// Cada aparato recibe de la nube (bloque antiguo `sales`) lo del otro, varias veces
for(let i = 0; i < 3; i++){ await entrar(A, await ventas(B)); await entrar(B, await ventas(A)); }
const va = await ventas(A), vb = await ventas(B);

await caso('SE CONSERVAN LAS DOS ventas en los dos aparatos (efectivo y tarjeta)', async () => {
  for(const v of [va, vb]){
    assert.equal(v.length, 2, 'ventas: ' + JSON.stringify(v.map(s => [s.id, s.metodoPago])));
    assert.deepEqual(v.map(s => s.metodoPago).sort(), ['Efectivo', 'Tarjeta']);
  }
});
await caso('la más antigua conserva el id de siempre y la otra un id derivado, IGUAL en los dos aparatos', async () => {
  const idsA = va.map(s => String(s.id)).sort(), idsB = vb.map(s => String(s.id)).sort();
  assert.deepEqual(idsA, idsB);
  const vieja = va.find(s => s.createdAt === ca.createdAt), nueva = va.find(s => s.createdAt === cb.createdAt);
  assert.equal(vieja.id, 777001);
  assert.equal(nueva.id, '777001~' + cb.createdAt);
});
await caso('IDEMPOTENTE: sincronizar tres veces más no crea ni una venta más', async () => {
  for(let i = 0; i < 3; i++){ await entrar(A, await ventas(B)); await entrar(A, await ventas(A)); await entrar(B, await ventas(A)); }
  assert.equal((await ventas(A)).length, 2); assert.equal((await ventas(B)).length, 2);
});
await caso('el total cobrado y el cierre de caja cuadran: 100 € efectivo + 100 € tarjeta', async () => {
  for(const p of [A, B]){
    const r = await p.evaluate(() => { const l = getSalesForClosure(); const por = {}; l.forEach(s => { por[s.metodoPago] = (por[s.metodoPago] || 0) + s.total; }); return {n: l.length, total: l.reduce((x, s) => x + s.total, 0), por}; });
    assert.equal(r.n, 2); assert.equal(r.total, 200); assert.equal(r.por.Efectivo, 100); assert.equal(r.por.Tarjeta, 100);
  }
});
await caso('cada venta lleva su propio número de ticket (la derivada no repite número)', async () => {
  const n = va.map(s => s.ticketNum); assert.ok(n.every(Boolean)); assert.equal(new Set(n).size, 2, n.join(','));
});
await caso('el aviso al dueño sale (registro de actividad, crítico) y UNA sola vez, aunque se sincronice mil veces', async () => {
  assert.equal(await aviso(A), 1); assert.equal(await aviso(B), 1);
  const e = await A.evaluate(() => DB.auditLog.find(x => x.action === 'cobro_duplicado'));
  assert.equal(e.severity, 'critical'); assert.match(e.summary, /200/);
});
await caso('anular el cobro derivado funciona (rectificativa) y no toca el otro', async () => {
  const r = await A.evaluate(() => { const d = DB.sales.find(s => String(s.id).includes('~')); d.status = 'anulada'; emitirRectificativa(d, 'prueba'); return {rect: !!d.rectificativa, vivas: getSalesForClosure().length}; });
  assert.ok(r.rect); assert.equal(r.vivas, 1);
});

// Dos ventas IDÉNTICAS (doble toque o sincronización repetida) siguen fundiéndose en una
const C = await aparato(), D = await aparato();
await caso('dos ventas IDÉNTICAS (mismo contenido) siguen siendo UNA, y no hay aviso', async () => {
  const base = await C.evaluate(() => ({id: 5001, date: todayStr(), createdAt: '2026-11-26T20:00:00.000Z', total: 30, subtotal: 30, metodoPago: 'Efectivo', pagos: null, items: [{name: 'Café', qty: 2, price: 15}], ticketNum: 'T1-000001'}));
  const otra = Object.assign({}, base, {createdAt: '2026-11-26T20:00:00.040Z', ticketNum: 'T2-000001'});   // otro aparato, otro instante, MISMO dinero
  await C.evaluate(b => { DB.sales = [b]; }, base);
  await entrar(C, [otra]); await entrar(C, [otra]);
  const v = await ventas(C);
  assert.equal(v.length, 1, JSON.stringify(v.map(s => s.id))); assert.equal(await aviso(C), 0);
});
await caso('una venta MODIFICADA (anulada, con su cierre) sigue siendo la misma: no se duplica', async () => {
  const base = {id: 5002, date: new Date().toISOString().slice(0, 10), createdAt: '2026-11-26T20:10:00.000Z', total: 12, metodoPago: 'Tarjeta', pagos: null, items: [{name: 'Té', qty: 1, price: 12}], ticketNum: 'T1-000002'};
  await D.evaluate(b => { DB.sales = [b]; }, base);
  await entrar(D, [Object.assign({}, base, {status: 'anulada', anuladaAt: '2026-11-26T21:00:00.000Z'})]);
  await entrar(D, [Object.assign({}, base, {cierreId: 9})]);
  const v = await ventas(D); assert.equal(v.length, 1); assert.equal(await aviso(D), 0);
});
await caso('un pedido pagado online y REHECHO al recogerlo (mismo id, otro createdAt) se sustituye, no se duplica', async () => {
  const online = {id: 5003, date: new Date().toISOString().slice(0, 10), createdAt: '2026-11-26T12:00:00.000Z', total: 20, metodoPago: 'Online', pagoOnlineAnticipado: true, pagos: [{amount: 20, metodoPago: 'Online'}], items: [{name: 'Pizza', qty: 1, price: 20}]};
  const rehecha = {id: 5003, date: online.date, createdAt: '2026-11-26T13:00:00.000Z', total: 22, metodoPago: 'Efectivo', pagos: [{amount: 2, metodoPago: 'Efectivo'}, {amount: 20, metodoPago: 'Online'}], items: online.items};
  await D.evaluate(o => { DB.sales = [o]; }, online);
  await entrar(D, [rehecha]);
  const v = await ventas(D); assert.equal(v.length, 1, JSON.stringify(v.map(s => s.id)));
});

// Camino de las ventas una a una (js/ventas-nube.js): la nube manda el nodo ventas/{id} de OTRO aparato
const E = await aparato();
async function porVenta(p, sale){
  return p.evaluate(async s => { vnEntrantes.set(String(s.id), JSON.parse(JSON.stringify(s))); vnListoPendiente = true; await vnProcesar(); return null; }, sale);
}
await E.evaluate(() => { DB.business.ventasPorMes = true; });
const ea = await cobrar(E, 'Efectivo');
const ajena = {id: ea.id, date: await E.evaluate(() => todayStr()), createdAt: new Date(Date.parse(ea.createdAt) + 30).toISOString(), total: 100, subtotal: 100, metodoPago: 'Tarjeta', pagos: null, items: [{name: 'Menú del día', qty: 4, price: 25}], ticketNum: 'T9-000001'};
for(let i = 0; i < 3; i++) await porVenta(E, ajena);
await caso('ventas una a una: llega el otro cobro de la misma mesa y se CONSERVAN las dos (3 llegadas, 2 ventas)', async () => {
  const v = await ventas(E);
  assert.equal(v.length, 2, JSON.stringify(v.map(s => [s.id, s.metodoPago])));
  assert.deepEqual(v.map(s => s.metodoPago).sort(), ['Efectivo', 'Tarjeta']);
  assert.ok(v.some(s => s.id === 777001 && s.metodoPago === 'Efectivo'), 'la más antigua conserva el id');
  assert.ok(v.some(s => s.id === '777001~' + ajena.createdAt && s.metodoPago === 'Tarjeta'));
  assert.equal(await aviso(E), 1);
});
await caso('ventas una a una: la derivada NO está en vnNube, así que el siguiente envío la sube a su propio nodo', async () => {
  const r = await E.evaluate(() => ({derivada: vnNube.has('777001~' + DB.sales.find(s => String(s.id).includes('~')).createdAt), original: vnNube.has('777001')}));
  assert.equal(r.derivada, false); assert.equal(r.original, true);
});
await caso('ventas una a una: si el cobro AJENO es el más antiguo, conserva el id y el local pasa a derivado', async () => {
  const F = await aparato(); await F.evaluate(() => { DB.business.ventasPorMes = true; });
  const fa = await cobrar(F, 'Efectivo');
  const antigua = Object.assign({}, ajena, {id: fa.id, createdAt: new Date(Date.parse(fa.createdAt) - 500).toISOString()});
  await porVenta(F, antigua); await porVenta(F, antigua);
  const v = await ventas(F); assert.equal(v.length, 2);
  assert.equal(v.find(s => s.id === 777001).metodoPago, 'Tarjeta');
  assert.equal(v.find(s => String(s.id).includes('~')).metodoPago, 'Efectivo');
  await F.close();
});
await caso('sin errores de página en ningún aparato', async () => {
  for(const p of [A, B, C, D, E]) assert.deepEqual(p.errs.filter(m => !/firebase|fetch|network|Failed/i.test(m)), []);
});
await browser.close();
console.log(fallos ? `\n${fallos} de ${casos} casos fallaron` : `\nlos ${casos} casos pasaron`);
process.exit(fallos ? 1 : 0);
