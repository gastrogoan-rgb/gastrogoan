// Carta por QR en la mesa, con pedido y pago (7/10).
//
// De punta a punta y sin tocar ninguna Firebase de verdad: la web pública
// (reservagastrogoan.html) y la app (index.html) en dos pestañas, con la red
// de Firebase bloqueada y una «nube» de mentira en medio. Lo que la web
// pública empuja al buzón se le entrega al oyente REAL de la app
// (initPublicRequestsListener), y lo que la app publica en `mesaQr/{token}`
// se le da a la web pública como si lo leyera de la nube.
//
// Lo que tiene que cumplirse siempre:
//   · el QR lleva un token por mesa, no el id, y el token no se publica;
//   · el pedido entra con los precios de la carta aunque el móvil mande otros;
//   · pagar una parte (o de menos) NO cierra la mesa;
//   · pagar el resto la cierra sola, como venta con su ticket numerado.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUERTO = 8963;
const web = spawn('python3', ['-m', 'http.server', String(PUERTO)], {cwd: RAIZ, stdio: 'ignore'});
await new Promise(r => setTimeout(r, 1200));

const browser = await puppeteer.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'], headless: true});
const res = [];
async function caso(nombre, fn){
  try { const d = await fn(); console.log('✅ ' + nombre + (d ? '  → ' + d : '')); res.push(true); }
  catch(e){ console.log('❌ ' + nombre + '\n     ⤷ ' + (e.message || e)); res.push(false); }
}
const bloquear = page => page.on('request', r => /firebase|firebaseio|gstatic|googleapis|workers\.dev|github|qrserver/.test(r.url()) ? r.abort() : r.continue());
const ruidoDeRed = e => /Failed to fetch|NetworkError|network-request-failed|ERR_FAILED|firebase is not defined/i.test(e);

/* ------------------------------ LA APP ------------------------------ */
const app = await browser.newPage();
const errsApp = []; app.on('pageerror', e => errsApp.push(e.message));
await app.setRequestInterception(true); bloquear(app);
await app.goto(`http://localhost:${PUERTO}/index.html`, {waitUntil: 'domcontentloaded'});
await app.evaluate(() => {
  const code = 'QRMESA01';
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_login', '1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type: 'owner', ts: Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
});
await app.reload({waitUntil: 'domcontentloaded'});
await new Promise(r => setTimeout(r, 2200));

await app.evaluate(() => {
  ['netlify-gate', 'license-gate', 'extconn-gate', 'firebase-gate', 'revoked-gate'].forEach(id => document.getElementById(id)?.remove());
  Object.assign(DB.business, {name: 'Casa QR', netlifySetupDone: true, extConnPromptSeen: true, tourSeen: true, categoryIconHintSeen: true, publicId: 'pubqrmesa1'});
  DB.business.ownFirebase = {apiKey: 'fake', databaseURL: 'https://fake-default-rtdb.firebaseio.com'};
  DB.tables = [{id: 1, name: 'Mesa 1', plazas: 4}, {id: 2, name: 'Mesa 2', plazas: 2}];
  DB.cartas = [{id: 1, nombre: 'Carta', secciones: [{id: 10, nombre: 'Principales', platos: [
    {id: 100, nombre: 'Hamburguesa', precio: 12, modificadores: [{id: 1, nombre: 'Queso', precio: 1.5}]},
    {id: 101, nombre: 'Ensalada', precio: 9},
  ]}]}];
  DB.activeCartaIds = [1];
  DB.tpvOrders = []; DB.sales = []; DB.pedidosMesaQr = [];
  DB.business.qrMesa = {activo: true};       // por defecto: lo acepta el camarero
  // Una nube de mentira: guarda lo que se publica y reparte lo que se empuja.
  window.__nube = {};
  window.__borrado = [];
  const oyentes = [];
  const ref = ruta => ({
    on: (ev, cb) => { if(/\/requests$/.test(ruta)) oyentes.push(cb); },
    set: v => { __nube[ruta] = JSON.parse(JSON.stringify(v)); return Promise.resolve(); },
    remove: () => { __borrado.push(ruta); delete __nube[ruta]; return Promise.resolve(); },
    once: () => Promise.resolve({val: () => null}),
    child: () => ref(ruta + '/x'),
  });
  const fakeApp = {database: () => ({ref})};
  if(typeof firebase === 'undefined') window.firebase = {};
  espejoEnNubePropia = true;
  getPublicMirrorApp = () => Promise.resolve(fakeApp);
  comprobarSaturacionPublica = () => Promise.resolve();
  window.__empujar = req => new Promise(resolve => {
    const snap = {val: () => JSON.parse(JSON.stringify(req)), ref: {
      child: () => ({transaction: () => Promise.resolve({committed: true})}),
      remove: () => { resolve(); return Promise.resolve(); },
    }};
    if(!oyentes.length) resolve('SIN_OYENTE');
    oyentes.forEach(cb => cb(snap));
    setTimeout(() => resolve('TIEMPO'), 4000);
  });
  // Lo que «confirma Stripe» (el Worker lo deja en la plataforma).
  window.__pagos = {};
  window.fetch = async url => {
    const m = String(url).match(/gastrogoan\/pagos\/pubqrmesa1\/([^.]+)\.json$/);
    if(!m) return new Response('null');
    return new Response(JSON.stringify(__pagos[decodeURIComponent(m[1])] || null));
  };
  publicRequestsListenerAttached = false;
  initPublicRequestsListener();
});
await new Promise(r => setTimeout(r, 300));
assert.ok(await app.evaluate(() => publicRequestsListenerAttached), 'el oyente del buzón no se ha enganchado');

let TOKEN = '';
await caso('Cada mesa tiene su QR con un token largo y al azar, no el id; el token no sale en el espejo público', async () => {
  const r = await app.evaluate(async () => {
    const e1 = enlaceQrMesa(DB.tables[0]), e2 = enlaceQrMesa(DB.tables[1]);
    syncPublicMirror();
    await new Promise(r => setTimeout(r, 300));
    const info = __nube['gastrogoan/public/pubqrmesa1/info'];
    const t1 = DB.tables[0].qrToken;
    const tarjeta = typeof renderTableQrCard === 'function' ? renderTableQrCard() : '';
    return {e1, e2, t1, t2: DB.tables[1].qrToken, infoTieneToken: JSON.stringify(info || {}).includes(t1),
      mesasPublicas: (info && info.tables || []).map(x => Object.keys(x).sort().join(',')),
      cuenta: __nube['gastrogoan/public/pubqrmesa1/mesaQr/' + t1], tarjetaImprimir: tarjeta.includes('imprimirQrMesas()')};
  });
  TOKEN = r.t1;
  assert.equal(r.t1.length, 20);
  assert.match(r.t1, /^[A-Za-z][A-Za-z0-9]{19}$/);
  assert.notEqual(r.t1, r.t2, 'dos mesas con el mismo token');
  assert.ok(r.e1.endsWith('&mesa=' + r.t1) && !r.e1.includes('&mesa=1&') && !/&mesa=1$/.test(r.e1), 'el QR lleva el id de la mesa');
  assert.equal(r.infoTieneToken, false, 'el token de la mesa se publica en el espejo: cualquiera podría pedir a todas las mesas');
  assert.deepEqual(r.mesasPublicas, ['id,name,plazas', 'id,name,plazas']);
  assert.equal(r.cuenta && r.cuenta.mesa, 'Mesa 1', 'no se publica el nodo de la mesa con su token');
  assert.ok(r.tarjetaImprimir, 'no hay botón para imprimir todos los QR');
  return 'token de 20, solo en mesaQr/{token}';
});

/* --------------------------- LA WEB PÚBLICA --------------------------- */
const pub = await browser.newPage();
await pub.setViewport({width: 360, height: 760, isMobile: true, hasTouch: true});
const errsPub = []; pub.on('pageerror', e => errsPub.push(e.message));
await pub.setRequestInterception(true); bloquear(pub);
await pub.goto(`http://localhost:${PUERTO}/reservagastrogoan.html?neg=pubqrmesa1&mesa=${TOKEN}`, {waitUntil: 'domcontentloaded'});
await new Promise(r => setTimeout(r, 1500));
// Lo que haría loadBusinessInfo() con el espejo, y una «nube» que sirve la
// cuenta de la mesa tal como la publicó la app.
const pintarPublica = async (cuenta, stripe) => pub.evaluate(({cuenta, stripe}) => {
  window.__empujados = window.__empujados || [];
  window.__cuenta = cuenta;
  window.__oyenteCuenta = null;
  db = {ref: ruta => ({
    on: (ev, cb) => { if(/\/mesaQr\//.test(ruta)){ window.__oyenteCuenta = cb; cb({val: () => window.__cuenta}); } },
    push: v => { __empujados.push(JSON.parse(JSON.stringify(v))); return Promise.resolve(); },
  })};
  publicId = 'pubqrmesa1';
  qrMesaListener = false; qrMesaCuenta = undefined;
  DB = {business: {name: 'Casa QR', tiposServicio: {mesa: true, takeaway: true, delivery: true}, qrMesa: {activo: true}},
    cartas: [{id: 1, nombre: 'Carta', secciones: [{id: 10, nombre: 'Principales', platos: [
      {id: 100, nombre: 'Hamburguesa', precio: 12, disponible: true}, {id: 101, nombre: 'Ensalada', precio: 9, disponible: true}]}]}],
    activeCartaIds: [1], menus: [], activeMenuIds: [], reservasResumen: {}, mesasOcupadas: {}, pedidosResumen: {}, cocinaCargaActiva: 0,
    tables: [{id: 1, name: 'Mesa 1', plazas: 4}, {id: 2, name: 'Mesa 2', plazas: 2}], promos: [], allergens: {100: ['Gluten']}};
  pagoOnlineActivo = stripe;
  currentTab = 'mesa';
  renderApp();
}, {cuenta, stripe});

await caso('El comensal ve la carta con alérgenos y envía el pedido A SU MESA con el token', async () => {
  const cuenta = await app.evaluate(t => __nube['gastrogoan/public/pubqrmesa1/mesaQr/' + t], TOKEN);
  await pintarPublica(cuenta, true);
  const r = await pub.evaluate(() => {
    const txt = document.getElementById('app').innerText;
    menuOpenSection = '1:10'; renderTabContent();
    const conPlatos = document.getElementById('app').innerText;
    cart = [{key: 'a', recipeId: 100, sectionId: 10, name: 'Hamburguesa', price: 0.01, qty: 2}];
    renderCartSummary();
    document.getElementById('o-privacy-consent').checked = true;
    document.getElementById('m-name').value = 'Ana';
    submitMesaQrOrder();
    return new Promise(ok => setTimeout(() => ok({txt, conPlatos, req: __empujados[__empujados.length - 1],
      aviso: !!document.getElementById('mesaqr-aviso'), carrito: cart.length}), 200));
  });
  assert.ok(r.txt.includes('Mesa 1'), 'no sale el nombre de la mesa');
  assert.ok(/Gluten/.test(r.conPlatos), 'la carta no enseña los alérgenos');
  assert.equal(r.req.type, 'pedido_mesa');
  assert.equal(r.req.mesaToken, TOKEN);
  assert.equal(r.req.tableId, undefined, 'el pedido manda el id de la mesa');
  assert.ok(r.aviso && r.carrito === 0, 'tras enviar no se confirma ni se vacía el carrito');
  // El pedido viaja a la app tal cual lo mandó el móvil (precio 0,01 €).
  await app.evaluate(req => __empujar(req), r.req);
  return 'pedido_mesa con token';
});

await caso('El pedido entra con los precios de la carta y espera a que sala lo acepte', async () => {
  const r = await app.evaluate(async () => {
    const pend = pedidosMesaQrPendientes(1);
    const enTpv = typeof renderQrMesaPendientes === 'function' ? renderQrMesaPendientes() : '';
    const antes = !!getOpenOrderForTable(1);
    aceptarPedidoMesaQr(pend[0].id);
    const o = getOpenOrderForTable(1);
    return {n: pend.length, precio: pend[0].items[0].price, qty: pend[0].items[0].qty, corregido: !!pend[0].preciosCorregidos,
      enTpv: enTpv.includes('Hamburguesa') && enTpv.includes('aceptarPedidoMesaQr'), antes,
      lineas: o.items.map(l => ({p: l.price, q: l.qty, e: l.estado, id: l.platoId})), estado: pend[0].estado};
  });
  assert.equal(r.n, 1);
  assert.equal(r.precio, 12, 'el precio inventado (0,01 €) ha entrado');
  assert.equal(r.qty, 2);
  assert.ok(r.corregido, 'no queda constancia de la corrección de precio');
  assert.ok(r.enTpv, 'el pedido no aparece en sala para aceptarlo');
  assert.equal(r.antes, false, 'el pedido entró en la mesa SIN que nadie lo aceptara');
  assert.deepEqual(r.lineas, [{p: 12, q: 2, e: 'cocina', id: 100}]);
  assert.equal(r.estado, 'aceptado');
  return '0,01 € → 12 € · aceptado y marchado';
});

await caso('Configurado "directo a cocina", entra sin esperar; un token falso, rotado o con el QR apagado no entra', async () => {
  const r = await app.evaluate(async t => {
    const linea = {platoId: 101, name: 'Ensalada', price: 1, qty: 1};
    DB.business.qrMesa = {activo: true, aceptaCamarero: false};
    await __empujar({type: 'pedido_mesa', mesaToken: t, items: [linea], createdAt: new Date().toISOString()});
    const directo = getOpenOrderForTable(1).items.filter(l => l.platoId === 101).map(l => [l.price, l.estado]);
    const n0 = getOpenOrderForTable(1).items.length;
    await __empujar({type: 'pedido_mesa', mesaToken: 'Xinventado0000000000', items: [linea], createdAt: new Date().toISOString()});
    await __empujar({type: 'pedido_mesa', mesaToken: '1', items: [linea], createdAt: new Date().toISOString()});
    // Rotar: el QR viejo de la mesa 2 deja de valer.
    const viejo = DB.tables[1].qrToken;
    DB.tables[1].qrToken = nuevoTokenMesaQr();
    await __empujar({type: 'pedido_mesa', mesaToken: viejo, items: [linea], createdAt: new Date().toISOString()});
    DB.business.qrMesa = {activo: false};
    await __empujar({type: 'pedido_mesa', mesaToken: t, items: [linea], createdAt: new Date().toISOString()});
    DB.business.qrMesa = {activo: true};
    // Un plato que no está en la carta no entra (no hay precio de confianza).
    await __empujar({type: 'pedido_mesa', mesaToken: t, items: [{platoId: 999, name: 'Langosta', price: 0.5, qty: 1}], createdAt: new Date().toISOString()});
    return {directo, n0, n1: getOpenOrderForTable(1).items.length, mesa2: !!getOpenOrderForTable(2),
      pendientes: pedidosMesaQrPendientes().length, viejoDistinto: viejo !== DB.tables[1].qrToken};
  }, TOKEN);
  assert.deepEqual(r.directo, [[9, 'cocina']]);
  assert.equal(r.n1, r.n0, 'entró algo con un token falso, rotado, con el QR apagado o fuera de carta');
  assert.equal(r.mesa2, false);
  assert.equal(r.pendientes, 0);
  return 'directo · falso, "1", rotado, apagado y fuera de carta: fuera';
});

let CUENTA;
await caso('La cuenta publicada de la mesa no lleva datos personales', async () => {
  const r = await app.evaluate(async t => {
    const o = getOpenOrderForTable(1);
    o.clienteNombre = 'Ana Pérez'; o.items[0].notas = 'alergia al marisco'; o.items[0].pagadorNombre = 'Ana Pérez';
    syncPublicMirror();
    await new Promise(r => setTimeout(r, 300));
    return __nube['gastrogoan/public/pubqrmesa1/mesaQr/' + t];
  }, TOKEN);
  CUENTA = r;
  const txt = JSON.stringify(r);
  assert.ok(!/Ana|marisco|clienteNombre|notas|telefono|email/i.test(txt), 'la cuenta publicada lleva datos personales: ' + txt);
  assert.equal(r.total, 33);
  assert.equal(r.pendiente, 33);
  assert.equal(r.abierta, true);
  return `total ${r.total} € · ${r.lineas.length} líneas`;
});

const pagarDesdeElMovil = async (modo, importe) => {
  await pintarPublica(CUENTA, true);
  const req = await pub.evaluate(({modo, importe}) => {
    window.fetch = async () => new Response(JSON.stringify({url: '#stripe'}));
    submittingRequest = false;
    if(modo === 'parte') document.getElementById('mq-importe').value = String(importe);
    const n = __empujados.length;
    pagarCuentaMesaQr(modo);
    return new Promise(r => setTimeout(() => r(__empujados.slice(n)[0] || null), 300));
  }, {modo, importe});
  assert.ok(req, 'el móvil no ha anunciado el pago');
  await app.evaluate(req => __empujar(req), req);
  return req;
};
const confirmarEnStripe = (ref, amount) => app.evaluate(async ({ref, amount}) => {
  __pagos[ref] = {amount, createdAt: new Date().toISOString()};
  await comprobarPagosTarjeta();
  const venta = DB.sales.find(s => s.tableId === 1);
  const o = DB.tpvOrders.find(x => x.tableId === 1);
  syncPublicMirror();
  await new Promise(r => setTimeout(r, 300));
  return {estado: o && o.status, pagado: (o.pagosMesaQr || []).reduce((s, p) => s + p.importe, 0), queda: cuentaMesaQr(o).pendiente,
    venta: venta ? {total: venta.total, ticket: venta.ticketNum, metodo: venta.metodoPago} : null,
    publicada: __nube['gastrogoan/public/pubqrmesa1/mesaQr/' + DB.tables[0].qrToken]};
}, {ref, amount});

await caso('Pagar una parte (y que el banco confirme menos) NO cierra la mesa', async () => {
  const sinStripe = await (async () => { await pintarPublica(CUENTA, false); return pub.evaluate(() => ({todo: !!document.getElementById('mq-pagar-todo'), txt: document.getElementById('mesaqr-cuenta').innerText})); })();
  assert.equal(sinStripe.todo, false, 'sin Stripe conectado se ofrece pagar desde el móvil');
  const req = await pagarDesdeElMovil('parte', 10);
  assert.equal(req.type, 'pago_mesa'); assert.equal(req.importe, 10); assert.equal(req.mesaToken, TOKEN); assert.ok(req.clientRef);
  // Anunció 10 € pero el banco solo confirma 8: cuenta lo confirmado, y la mesa sigue.
  const r = await confirmarEnStripe(req.clientRef, 8);
  assert.equal(r.estado, 'abierta', 'un pago parcial ha cerrado la mesa');
  assert.equal(r.pagado, 8);
  assert.equal(r.queda, 25);
  assert.equal(r.venta, null, 'se ha apuntado la venta con la mesa a medio pagar');
  assert.equal(r.publicada.pagado, 8); assert.equal(r.publicada.pendiente, 25);
  CUENTA = r.publicada;
  const descuadre = await app.evaluate(() => (DB.paymentAmountMismatches || []).length);
  assert.equal(descuadre, 1, 'el pago de menos no queda avisado');
  return 'pagado 8 € de 33 · quedan 25 €, mesa abierta';
});

await caso('Pagar el resto cierra la mesa sola: venta normal con su ticket numerado (factura simplificada)', async () => {
  const req = await pagarDesdeElMovil('todo');
  assert.equal(req.importe, 25);
  const r = await confirmarEnStripe(req.clientRef, 25);
  assert.equal(r.estado, 'pagada', 'pagada entera y la mesa sigue abierta');
  assert.ok(r.venta, 'no hay venta');
  assert.equal(r.venta.total, 33);
  assert.equal(r.venta.metodo, 'Online');
  assert.match(String(r.venta.ticket || ''), /^T\d\d/, 'la venta no tiene número de factura simplificada');
  const extra = await app.evaluate(() => ({sinPedido: (DB.unmatchedOnlinePayments || []).length, mesaLibre: !getOpenOrderForTable(1)}));
  assert.equal(extra.sinPedido, 0);
  assert.ok(extra.mesaLibre);
  return `venta ${r.venta.total} € · ${r.venta.ticket}`;
});

await caso('Un pago que llega con la mesa ya cobrada queda para devolver, no se pierde', async () => {
  const r = await app.evaluate(async t => {
    DB.business.qrMesa = {activo: true, aceptaCamarero: false};
    await __empujar({type: 'pedido_mesa', mesaToken: t, items: [{platoId: 101, name: 'Ensalada', price: 9, qty: 1}], createdAt: new Date().toISOString()});
    await __empujar({type: 'pago_mesa', mesaToken: t, clientRef: 'REFtarde00001', importe: 9, createdAt: new Date().toISOString()});
    const o = getOpenOrderForTable(1);
    o.status = 'pagada';   // la cobró el camarero en caja mientras tanto
    __pagos['REFtarde00001'] = {amount: 9};
    await comprobarPagosTarjeta();
    return (DB.unmatchedOnlinePayments || []).map(u => u.amount);
  }, TOKEN);
  assert.deepEqual(r, [9]);
  return '9 € en «Pagos sin pedido»';
});

await caso('La pantalla de la mesa cabe en 320 y 360 px sin scroll lateral', async () => {
  const out = [];
  for(const w of [320, 360]){
    await pub.setViewport({width: w, height: 760, isMobile: true, hasTouch: true});
    await new Promise(r => setTimeout(r, 400));
    await pintarPublica(Object.assign({}, CUENTA, {pendiente: 25, pagado: 8}), true);
    const d = await pub.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(d <= 0, `${w} px: ${d} px de scroll lateral`);
    out.push(w);
  }
  return out.join(' y ') + ' px';
});

await caso('Ningún error de JavaScript', async () => {
  const reales = [...errsApp, ...errsPub].filter(e => !ruidoDeRed(e));
  assert.deepEqual(reales.slice(0, 5), []);
  return 'consola limpia';
});

console.log('\n' + '═'.repeat(64));
const fallos = res.filter(x => !x).length;
console.log(fallos ? `❌ ${fallos} de ${res.length} fallaron` : `✅ los ${res.length} casos pasaron`);
await browser.close();
web.kill();
process.exit(fallos ? 1 : 0);
