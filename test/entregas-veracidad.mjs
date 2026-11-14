// VERACIDAD de lo que ve el cliente en su pedido para llevar / domicilio (14/11, pedido del dueño: «verifica que el tiempo estimado y el proceso del
// pedido que ve el cliente realmente son veraces y sin fallos»). Recorre la vida de un pedido en la app, mira EXACTAMENTE lo que se publica
// para el cliente y lo pinta en la web. Regla: cada estado y cada hora tiene que salir de un hecho real, nunca de un relleno.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {semilla} from './_semilla-publica.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUERTO = 8972;
const web = spawn('python3', ['-m', 'http.server', String(PUERTO)], {cwd: RAIZ, stdio: 'ignore'});
await new Promise(r => setTimeout(r, 1200));
const browser = await puppeteer.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'], headless: true});
let fallos = 0;
async function caso(n, fn){ try{ const d = await fn(); console.log('✅ ' + n + (d ? '  → ' + d : '')); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + (e.message || e)); } }
const bloquear = page => page.on('request', r => /firebase|firebaseio|gstatic|googleapis|workers\.dev|github|qrserver/.test(r.url()) ? r.abort() : r.continue());

/* ============================ LA APP ============================ */
const app = await browser.newPage();
await app.setRequestInterception(true); bloquear(app);
await app.goto(`http://localhost:${PUERTO}/index.html`, {waitUntil: 'domcontentloaded'});
await app.evaluate(() => {
  const code = 'VERAZ001';
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_login', '1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type: 'owner', ts: Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
});
await app.reload({waitUntil: 'domcontentloaded'});
await new Promise(r => setTimeout(r, 2200));
await app.evaluate(() => {
  ['netlify-gate', 'license-gate', 'extconn-gate', 'firebase-gate', 'revoked-gate'].forEach(id => document.getElementById(id)?.remove());
  Object.assign(DB.business, {name: 'Casa Veraz', netlifySetupDone: true, extConnPromptSeen: true, tourSeen: true, categoryIconHintSeen: true, publicId: 'pubveraz01'});
  DB.business.ownFirebase = {apiKey: 'fake', databaseURL: 'https://fake-default-rtdb.firebaseio.com'};
  DB.business.pedidos = {ventanaMin: 10};   // SIN repartoMin: el negocio no ha dicho cuánto tarda su reparto
  DB.sales = []; DB.tpvOrders = [];
  // Lo que se publica de verdad, capturado.
  window.__pub = {};
  window.firebase = window.firebase || {};
  window.getPublicMirrorApp = () => Promise.resolve({database: () => ({ref: ruta => ({set: v => { window.__pub[ruta] = JSON.parse(JSON.stringify(v)); return Promise.resolve(); }})})});
});
const publicado = async (tok = 'tok-veraz-delivery-1') => { await app.evaluate(() => new Promise(r => setTimeout(r, 60))); return app.evaluate(tok => __pub[Object.keys(__pub).find(x => x.endsWith('/' + tok))] || null, tok); };
const hoy = () => app.evaluate(() => { const p = n => String(n).padStart(2, '0'), d = new Date(Date.now() + 40 * 60000); return {date: d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()), time: p(d.getHours()) + ':' + p(d.getMinutes())}; });

await caso('Un pedido recién llegado dice «pendiente»; aceptado y en cola de cocina dice «aceptado» (no «preparando»)', async () => {
  const h = await hoy();
  await app.evaluate(h => { DB.tpvOrders = [{id: 1, tipo: 'delivery', status: 'pendiente-online', clientRef: 'tok-veraz-delivery-1', clienteNombre: 'Ana', clienteCodigoPostal: '08001', date: h.date, time: h.time, items: [{name: 'Hamburguesa', price: 12, qty: 1}], createdAt: new Date().toISOString()}]; syncOrderStatusForPublic(DB.tpvOrders[0]); }, h);
  assert.equal((await publicado()).status, 'pendiente');
  await app.evaluate(() => { const o = DB.tpvOrders[0]; o.status = 'abierta'; o.items[0].estado = 'cocina'; syncOrderStatusForPublic(o); });
  const p = await publicado();
  assert.equal(p.status, 'aceptado', 'con el plato solo en cola no se puede decir que se prepara: ' + p.status);
  assert.ok(p.desde && p.hasta, 'falta la ventana prometida');
  assert.equal(new Date(p.hasta) - new Date(p.desde), 10 * 60000);
});

await caso('«Preparando» solo cuando el cocinero lo empieza; «listo» solo con todo terminado', async () => {
  await app.evaluate(() => { const o = DB.tpvOrders[0]; o.items = [{name: 'A', price: 5, qty: 1, estado: 'preparando'}, {name: 'B', price: 5, qty: 1, estado: 'cocina'}]; syncOrderStatusForPublic(o); });
  assert.equal((await publicado()).status, 'preparando');
  await app.evaluate(() => { const o = DB.tpvOrders[0]; o.items[0].estado = 'entregado'; syncOrderStatusForPublic(o); });
  assert.equal((await publicado()).status, 'preparando', 'un plato listo y otro no: sigue preparando');
  await app.evaluate(() => { const o = DB.tpvOrders[0]; o.items[1].estado = 'entregado'; syncOrderStatusForPublic(o); });
  const p = await publicado();
  assert.equal(p.status, 'listo'); assert.ok(p.listoAt, 'falta la marca de «listo»');
});

await caso('Un pedido que SOLO lleva bebidas también llega a «listo» (antes se quedaba en «aceptado» para siempre)', async () => {
  await app.evaluate(() => { DB.tpvOrders.push({id: 2, tipo: 'takeaway', status: 'abierta', clientRef: 'tok-veraz-bebidas-02', items: [{name: 'Cola', price: 2, qty: 2, bebida: true, estado: 'entregado'}], createdAt: new Date().toISOString()}); syncOrderStatusForPublic(DB.tpvOrders[1]); });
  assert.equal((await publicado('tok-veraz-bebidas-02')).status, 'listo');
});

await caso('Sin «Salgo» NO hay «en camino»; con «Salgo» sí, y sin dato de reparto NO se inventa una hora de llegada', async () => {
  await app.evaluate(() => { const o = DB.tpvOrders[0]; syncOrderStatusForPublic(o); });
  assert.notEqual((await publicado()).status, 'encamino');
  await app.evaluate(() => { const o = DB.tpvOrders[0]; o.empaq = {c: {l0: true, l1: true, cub: true, sal: true, tic: true}}; markRepartoSalida(1); });
  const p = await publicado();
  assert.equal(p.status, 'encamino'); assert.ok(p.salidaAt, 'falta la hora de salida real');
  assert.equal(p.llegadaEstimada, undefined, 'el negocio no ha puesto su tiempo de reparto ni hay histórico: no debe haber llegada estimada');
});

await caso('Con el tiempo de reparto del negocio la llegada estimada = salida + ese tiempo; con histórico del código postal, la mediana real', async () => {
  await app.evaluate(() => { DB.business.pedidos.repartoMin = 20; syncOrderStatusForPublic(DB.tpvOrders[0]); });
  let p = await publicado();
  assert.equal(Math.round((new Date(p.llegadaEstimada) - new Date(p.salidaAt)) / 60000), 20);
  await app.evaluate(() => {
    const mk = (i, min) => ({id: 'h' + i, createdAt: new Date().toISOString(), tiempos: {cp: '08001', salio: new Date(Date.now() - 7200000).toISOString(), entregado: new Date(Date.now() - 7200000 + min * 60000).toISOString()}});
    DB.sales = [mk(1, 8), mk(2, 9), mk(3, 10), mk(4, 11), mk(5, 30)]; syncOrderStatusForPublic(DB.tpvOrders[0]);
  });
  p = await publicado();
  assert.equal(Math.round((new Date(p.llegadaEstimada) - new Date(p.salidaAt)) / 60000), 10, 'debía usar la mediana real (10), no el valor fijo');
});

await caso('Entregado: el estado final sale solo al marcar la entrega y el PIN deja de publicarse', async () => {
  await app.evaluate(() => { DB.tpvOrders[0].pinEntrega = '4821'; syncOrderStatusForPublic(DB.tpvOrders[0]); });
  assert.equal((await publicado()).pin, '4821');
  await app.evaluate(() => { markRepartoEntregado(1); });
  const p = await publicado();
  assert.equal(p.status, 'entregado'); assert.equal(p.pin, undefined, 'el código de entrega no debe seguir publicado');
});

await caso('Un pedido programado para MAÑANA no se «prepara» hoy: dice «aceptado» y su ventana es la de mañana', async () => {
  await app.evaluate(() => { const d = new Date(Date.now() + 86400000), p = n => String(n).padStart(2, '0'); DB.tpvOrders.push({id: 3, tipo: 'takeaway', status: 'abierta', clientRef: 'tok-veraz-manana-03', date: d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()), time: '13:00', items: [{name: 'Pizza', price: 9, qty: 1}], createdAt: new Date().toISOString()}); syncOrderStatusForPublic(DB.tpvOrders[2]); });
  const p = await publicado('tok-veraz-manana-03');
  assert.equal(p.status, 'aceptado'); assert.ok(new Date(p.desde) > new Date(Date.now() + 20 * 3600000), 'la ventana debe ser la de mañana');
});

/* ============================ LA WEB ============================ */
const pub = await browser.newPage(); const errs = []; pub.on('pageerror', e => errs.push(e.message));
await pub.setRequestInterception(true); bloquear(pub);
await pub.goto(`http://localhost:${PUERTO}/reservagastrogoan.html?neg=pubveraz01`, {waitUntil: 'domcontentloaded'});
await new Promise(r => setTimeout(r, 1500));
await pub.evaluate(s => { s.business.pedidos = {tiempoBasePrep: 15, extraPorPedidoEnCola: 3, tiempoMaxEstimado: 60, repartoMin: 15, deliveryFee: 2.5, pedidoMinimo: 12}; s.cocinaCargaActiva = 4; DB = s; businessInfoLoadedOnce = true; }, semilla());
const textoSeg = data => pub.evaluate(d => { trackToken = 'tok-track-veraz-01'; document.getElementById('app').innerHTML = ''; renderTrackStatus(d); return document.getElementById('app').textContent; }, data);

await caso('Web: el tiempo estimado del chip, el de «¿cuánto tarda?» y el primer hueco «Cuanto antes» son EL MISMO número', () => pub.evaluate(() => {
  const p = DB.business.pedidos;
  const eta = etaPedidoMin(p, true);
  if(eta !== 15 + 4 * 3 + 15) throw new Error('eta delivery esperado 42 y es ' + eta);
  if(etaPedidoMin(p, false) !== 27) throw new Error('eta recoger esperado 27 y es ' + etaPedidoMin(p, false));
  currentTab = 'delivery';
  if(!servicioChipsHtml(p, true).includes('42')) throw new Error('el chip no dice 42: ' + servicioChipsHtml(p, true));
  if(!etaHintHtml().includes('42')) throw new Error('el aviso del carrito no dice 42');
  return eta + ' min';
}));

await caso('Web: el hueco «Cuanto antes» de hoy nunca es anterior a ahora + tiempo estimado', async () => {
  const r = await pub.evaluate(() => {
    currentTab = 'delivery'; renderApp(); wzIr && 0;
    const inp = document.getElementById('o-time'); updateOrderSlots();
    const slots = [...document.querySelectorAll('#o-slots button')].map(b => b.textContent.replace(/[^\d:]/g, ''));
    return {primero: slots[0] || null, ahora: Date.now(), n: slots.length};
  });
  if(!r.primero) return 'sin huecos hoy (cerrado a esta hora): no aplica';
  const [h, m] = r.primero.slice(-5).split(':').map(Number); const d = new Date(r.ahora); d.setHours(h, m, 0, 0);
  assert.ok(d.getTime() >= r.ahora + 41 * 60000, 'el primer hueco (' + r.primero + ') promete antes de 42 min');
  return r.primero;
});

await caso('Web: con la carga de cocina vieja (nadie mira la app) no se usa para prometer tiempos y se avisa', () => pub.evaluate(() => {
  DB.appVistaTs = Date.now() - 40 * 60000;
  if(appVistaFresca()) throw new Error('debía estar vieja');
  if(etaPedidoMin(DB.business.pedidos, true) !== 30) throw new Error('sin carga debía ser 15+15 = 30: ' + etaPedidoMin(DB.business.pedidos, true));
  if(!entNoVistoHtml().includes('no está mirando')) throw new Error('falta el aviso');
  DB.appVistaTs = Date.now() - 60000; if(!appVistaFresca() || entNoVistoHtml()) throw new Error('con latido reciente no debe avisar');
  DB.appVistaTs = 0; if(!appVistaFresca()) throw new Error('sin latido (app antigua) se asume visible');
  return null;
}));

await caso('Web: cada estado que publica la app se pinta con su texto y sin inventar horas', async () => {
  const ahora = Date.now(), iso = ms => new Date(ahora + ms).toISOString();
  let t = await textoSeg({status: 'aceptado', tipo: 'delivery', desde: iso(1800000), hasta: iso(2400000)});
  assert.ok(/Pedido confirmado/.test(t) && /Hora prometida/.test(t) && !/Llegada estimada/.test(t) && !/retraso/i.test(t));
  t = await textoSeg({status: 'preparando', tipo: 'delivery', desde: iso(-1200000), hasta: iso(-600000)});
  assert.ok(/Lo estamos preparando/.test(t) && /retraso/i.test(t), 'pasada la ventana debe avisar del retraso');
  t = await textoSeg({status: 'listo', tipo: 'delivery', desde: iso(600000), hasta: iso(1200000)});
  assert.ok(/esperando al repartidor/.test(t) && !/Va de camino/.test(t), 'listo en domicilio no es «va de camino»');
  t = await textoSeg({status: 'encamino', tipo: 'delivery', desde: iso(-100000), hasta: iso(500000), salidaAt: iso(-60000)});
  assert.ok(/Va de camino/.test(t) && /Salió a las/.test(t) && !/Llegada estimada/.test(t), 'sin llegada publicada la web no la inventa');
  t = await textoSeg({status: 'listo', tipo: 'takeaway', desde: iso(-100000), hasta: iso(500000)});
  assert.ok(/Listo para recoger/.test(t) && !/Hora prometida/.test(t), 'recoger listo es el estado final: ya no se enseña la ventana');
  t = await textoSeg({status: 'entregado', tipo: 'delivery'});
  assert.ok(/Pedido entregado/.test(t) && !/retraso/i.test(t));
});

await caso('Sin errores de JavaScript en la web', async () => { assert.deepEqual(errs.filter(x => !/Failed to fetch|NetworkError|network-request-failed|ERR_FAILED|firebase is not defined/i.test(x)), []); });

await browser.close(); web.kill();
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ lo que ve el cliente (estados, ventana, llegada estimada) es veraz');
process.exit(fallos ? 1 : 0);
