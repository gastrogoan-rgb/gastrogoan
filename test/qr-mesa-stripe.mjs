// COBRO AL PEDIR, DE PUNTA A PUNTA CON STRIPE SIMULADO (12/11).
//
// La prueba más parecida a un cobro real que se puede hacer sin tocar Stripe ni la nube de nadie. Todo el código es el de verdad:
//   · la web pública (reservagastrogoan.html) en un móvil, con el pedido por QR de una mesa;
//   · el Worker de pagos (worker/pagos-worker.js) ejecutado tal cual, con sus rutas /stripe/pagar y /stripe/webhook;
//   · la app del negocio (index.html), que PREGUNTA por REST si el pago llegó (comprobarPagosTarjeta).
// Lo único simulado son las dos cosas de fuera: Stripe (crea la sesión de pago, cobra y manda el aviso FIRMADO con el mismo HMAC que usa
// Stripe) y la base de datos de la plataforma (un objeto en memoria detrás del fetch). La web «navega» a la página de pago, el cliente
// «paga» (o abandona), y el navegador vuelve por la dirección que el Worker dio a Stripe.
//
// Lo que tiene que cumplirse:
//   · el pago se crea en la cuenta DEL RESTAURANTE, en céntimos, con la dirección de vuelta a la mesa;
//   · hasta que Stripe confirma, NADA entra en cocina (también si el cliente abandona);
//   · confirmado: entra solo, pagado, con la comisión REAL de Stripe apuntada como gasto;
//   · el aviso duplicado, firmado mal o de otra cuenta no hace nada;
//   · el atacante que manda un importe de 0,50 € para un pedido de 24 € no consigue cocina;
//   · si el Worker o Stripe fallan, no se registra ningún pedido huérfano y el comensal puede reintentar;
//   · dos mesas pagando a la vez no se mezclan.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import worker from '../worker/pagos-worker.js';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUERTO = 8964;
const web = spawn('python3', ['-m', 'http.server', String(PUERTO)], {cwd: RAIZ, stdio: 'ignore'});
await new Promise(r => setTimeout(r, 1200));
const res = [];
async function caso(nombre, fn){
  try { const d = await fn(); console.log('✅ ' + nombre + (d ? '  → ' + d : '')); res.push(true); }
  catch(e){ console.log('❌ ' + nombre + '\n     ⤷ ' + (e.message || e)); res.push(false); }
}
const esperar = ms => new Promise(r => setTimeout(r, ms));

/* ================= LO DE FUERA: Stripe y la base de la plataforma ================= */
const PUBLIC_ID = 'pubqrstr01', DB_URL = 'https://plataforma.test';
let datos = {};
const leer = ruta => ruta.split('/').filter(Boolean).reduce((o, k) => (o && typeof o === 'object') ? o[k] : undefined, datos);
function escribir(ruta, valor){
  const partes = ruta.split('/').filter(Boolean);
  let o = datos;
  partes.slice(0, -1).forEach(k => { if(!o[k] || typeof o[k] !== 'object') o[k] = {}; o = o[k]; });
  if(valor === null) delete o[partes[partes.length - 1]]; else o[partes[partes.length - 1]] = valor;
}
const sesiones = [];          // lo que el Worker le pidió a Stripe
let stripeCae = false;        // Stripe devuelve un 500
let comisionCentimos = 55;
let pushN = 0;
const nodeFetch = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url);
  const m = (opts.method || 'GET').toUpperCase();
  if(u.origin === 'https://api.stripe.com'){
    assert.equal(opts.headers.Authorization, 'Bearer sk_test_X');
    if(stripeCae) return new Response(JSON.stringify({error: {message: 'Stripe está caído'}}), {status: 500});
    const cuerpo = Object.fromEntries(new URLSearchParams(opts.body || ''));
    if(u.pathname === '/v1/checkout/sessions' && m === 'POST'){
      const s = {id: 'cs_test_' + sesiones.length, url: 'https://checkout.stripe.com/c/pay/cs_test_' + sesiones.length};
      sesiones.push({s, cuerpo, cuenta: opts.headers['Stripe-Account'], pagada: false});
      return new Response(JSON.stringify(s));
    }
    if(u.pathname.startsWith('/v1/payment_intents/')) return new Response(JSON.stringify({id: 'pi_1', latest_charge: {balance_transaction: {fee: comisionCentimos}}}));
    throw new Error('Stripe: ruta no simulada ' + u.pathname);
  }
  assert.equal(u.origin, DB_URL, 'el Worker ha llamado fuera de Firebase y Stripe: ' + url);
  const ruta = decodeURIComponent(u.pathname.replace(/\.json$/, ''));
  if(m === 'GET') return new Response(JSON.stringify(leer(ruta) ?? null));
  if(m === 'PUT'){ escribir(ruta, JSON.parse(opts.body)); return new Response(opts.body); }
  if(m === 'POST'){ const k = 'p' + (++pushN); escribir(ruta + '/' + k, JSON.parse(opts.body)); return new Response(JSON.stringify({name: k})); }
  throw new Error('método ' + m);
};
const env = {FIREBASE_DB_URL: DB_URL, FIREBASE_DB_SECRET: 'SECRETO', STRIPE_SECRET_KEY: 'sk_test_X', STRIPE_WEBHOOK_SECRET: 'whsec_Y'};
const firmar = (cuerpo, secreto = 'whsec_Y', t = Math.floor(Date.now() / 1000)) => `t=${t},v1=${crypto.createHmac('sha256', secreto).update(`${t}.${cuerpo}`).digest('hex')}`;
const conectarNegocio = () => { datos = {gastrogoan: {private: {[PUBLIC_ID]: {stripe: {accountId: 'acct_1', activo: true, modo: 'pruebas'}}}}}; };
// El cliente paga en la página de Stripe: Stripe avisa al Worker con un evento FIRMADO.
async function stripeCobra(sesion, {centimos, firma = 'whsec_Y', cuenta = 'acct_1'} = {}){
  const s = sesion.s;
  const evento = JSON.stringify({id: 'evt_' + crypto.randomUUID(), type: 'checkout.session.completed', account: cuenta,
    data: {object: {id: s.id, payment_status: 'paid', amount_total: centimos ?? Number(sesion.cuerpo['line_items[0][price_data][unit_amount]']), payment_intent: 'pi_1',
      metadata: {publicId: sesion.cuerpo['metadata[publicId]'], orderRef: sesion.cuerpo['metadata[orderRef]']}}}});
  const r = await worker.fetch(new Request('https://gastro.test/stripe/webhook', {method: 'POST', headers: {'stripe-signature': firmar(evento, firma)}, body: evento}), env);
  if(r.status === 200) sesion.pagada = true;
  return r.status;
}
const CORS = {'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS'};

/* ================= LOS NAVEGADORES ================= */
const browser = await puppeteer.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'], headless: true});
const BLOQUEADO = /firebase|firebaseio|gstatic|googleapis|github|qrserver/;
const enrutar = async (page) => {
  await page.setRequestInterception(true);
  page.on('request', async r => {
    const url = r.url();
    if(url.startsWith('https://gastro.gastrogoan.workers.dev/')){
      if(r.method() === 'OPTIONS') return r.respond({status: 204, headers: CORS});
      const cuerpo = r.postData();
      const resp = await worker.fetch(new Request(url.replace('https://gastro.gastrogoan.workers.dev', 'https://gastro.test'), {method: r.method(), headers: r.headers(), body: cuerpo || undefined}), env);
      return r.respond({status: resp.status, headers: Object.assign({'content-type': 'application/json'}, CORS), body: await resp.text()});
    }
    if(url.startsWith('https://checkout.stripe.com/')) return r.respond({status: 200, contentType: 'text/html', body: '<h1>Stripe Checkout (simulado)</h1>'});
    const pago = url.match(/\/gastrogoan\/pagos\/([^/]+)\/([^/.]+)\.json/);
    if(pago) return r.respond({status: 200, headers: Object.assign({'content-type': 'application/json'}, CORS), body: JSON.stringify(leer(`gastrogoan/pagos/${pago[1]}/${decodeURIComponent(pago[2])}`) ?? null)});
    if(BLOQUEADO.test(url)) return r.abort();
    r.continue();
  });
};

/* ---------------------------- LA APP DEL NEGOCIO ---------------------------- */
const app = await browser.newPage();
const errsApp = []; app.on('pageerror', e => errsApp.push(e.message));
await enrutar(app);
await app.goto(`http://localhost:${PUERTO}/index.html`, {waitUntil: 'domcontentloaded'});
await app.evaluate(() => {
  const code = 'QRSTR001';
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_login', '1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type: 'owner', ts: Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
});
await app.reload({waitUntil: 'domcontentloaded'});
await esperar(2200);
await app.evaluate(({pid}) => {
  ['netlify-gate', 'license-gate', 'extconn-gate', 'firebase-gate', 'revoked-gate'].forEach(id => document.getElementById(id)?.remove());
  Object.assign(DB.business, {name: 'Casa Stripe', netlifySetupDone: true, extConnPromptSeen: true, tourSeen: true, categoryIconHintSeen: true, publicId: pid});
  DB.business.ownFirebase = {apiKey: 'fake', databaseURL: 'https://fake-default-rtdb.firebaseio.com'};
  DB.tables = [{id: 1, name: 'Mesa 1', plazas: 4}, {id: 2, name: 'Mesa 2', plazas: 2}];
  DB.cartas = [{id: 1, nombre: 'Carta', secciones: [{id: 10, nombre: 'Principales', platos: [
    {id: 100, nombre: 'Hamburguesa', precio: 12}, {id: 101, nombre: 'Ensalada', precio: 9.9}]}]}];
  DB.activeCartaIds = [1];
  DB.tpvOrders = []; DB.sales = []; DB.pedidosMesaQr = []; DB.pagosTarjetaEsperados = [];
  DB.business.qrMesa = {activo: true, aceptaCamarero: true, cobroLocal: false, cobroTarjeta: true};
  pagoOnlineActivo = true;
  (DB.tables || []).forEach(asegurarTokenMesa);
  const oyentes = [];
  const ref = ruta => ({
    on: (ev, cb) => { if(/\/requests$/.test(ruta)) oyentes.push(cb); },
    set: () => Promise.resolve(), remove: () => Promise.resolve(), once: () => Promise.resolve({val: () => null}), child: () => ref(ruta + '/x'),
  });
  if(typeof firebase === 'undefined') window.firebase = {};
  espejoEnNubePropia = true;
  getPublicMirrorApp = () => Promise.resolve({database: () => ({ref})});
  comprobarSaturacionPublica = () => Promise.resolve();
  window.__empujar = req => new Promise(resolve => {
    const snap = {val: () => JSON.parse(JSON.stringify(req)), ref: {child: () => ({transaction: () => Promise.resolve({committed: true})}), remove: () => { resolve(); return Promise.resolve(); }}};
    if(!oyentes.length) resolve('SIN_OYENTE');
    oyentes.forEach(cb => cb(snap));
    setTimeout(() => resolve('TIEMPO'), 4000);
  });
  publicRequestsListenerAttached = false;
  initPublicRequestsListener();
}, {pid: PUBLIC_ID});
await esperar(300);
const TOKENS = await app.evaluate(() => DB.tables.map(t => t.qrToken));

/* ----------------------------- LA WEB PÚBLICA ----------------------------- */
const pub = await browser.newPage();
await pub.setViewport({width: 390, height: 800, isMobile: true, hasTouch: true});
const errsPub = []; pub.on('pageerror', e => errsPub.push(e.message));
const pedidosEnviados = [];
await pub.exposeFunction('__guardarPedido', json => { pedidosEnviados.push(JSON.parse(json)); });
await enrutar(pub);
const urlMesa = n => `http://localhost:${PUERTO}/reservagastrogoan.html?neg=${PUBLIC_ID}&mesa=${TOKENS[n]}`;
const abrirMesa = async (n) => {
  await pub.goto(urlMesa(n), {waitUntil: 'domcontentloaded'});
  await esperar(1200);
  await pub.evaluate(({pid, nombre}) => {
    db = {ref: () => ({on: (ev, cb) => { cb({val: () => ({mesa: nombre, abierta: false, total: 0, pagado: 0, pendiente: 0})}); }, push: v => { window.__guardarPedido(JSON.stringify(v)); return Promise.resolve(); }})};
    publicId = pid; qrMesaListener = false; qrMesaCuenta = undefined;
    DB = {business: {name: 'Casa Stripe', tiposServicio: {mesa: true, takeaway: true, delivery: true}, qrMesa: {activo: true, cobroLocal: false, cobroTarjeta: true}},
      cartas: [{id: 1, nombre: 'Carta', secciones: [{id: 10, nombre: 'Principales', platos: [
        {id: 100, nombre: 'Hamburguesa', precio: 12, disponible: true}, {id: 101, nombre: 'Ensalada', precio: 9.9, disponible: true}]}]}],
      activeCartaIds: [1], menus: [], activeMenuIds: [], reservasResumen: {}, mesasOcupadas: {}, pedidosResumen: {}, cocinaCargaActiva: 0,
      tables: [{id: 1, name: 'Mesa 1', plazas: 4}, {id: 2, name: 'Mesa 2', plazas: 2}], promos: [], allergens: {}};
    pagoOnlineActivo = true; currentTab = 'mesa'; renderApp();
  }, {pid: PUBLIC_ID, nombre: 'Mesa ' + (n + 1)});
};
// Pide y pulsa «Pagar y enviar»; espera a que la web salga hacia la página de pago de Stripe (o muestre un error).
const pedirYPagar = async (lineas, {importeForzado} = {}) => {
  const antes = pedidosEnviados.length;
  await pub.evaluate(({lineas, importeForzado}) => {
    menuOpenSection = '1:10'; renderTabContent();
    cart = lineas.map((l, i) => ({key: 'k' + i, recipeId: l.id, sectionId: 10, name: l.name, price: l.price, qty: l.qty}));
    renderCartSummary();
    document.getElementById('o-privacy-consent').checked = true;
    submittingRequest = false;
    if(importeForzado != null){
      // El atacante: la web que manda a Stripe un importe distinto del pedido.
      const orig = payWithCard;
      payWithCard = (req, amount, d, f, b) => orig(req, importeForzado, d, f, b);
    }
    submitMesaQrOrder();
  }, {lineas, importeForzado});
  for(let i = 0; i < 40; i++){ await esperar(150); if(pub.url().startsWith('https://checkout.stripe.com/') || pedidosEnviados.length > antes) break; }
  await esperar(300);
  return {url: pub.url(), pedido: pedidosEnviados[pedidosEnviados.length - 1], nuevos: pedidosEnviados.length - antes};
};
const HAMB2 = [{id: 100, name: 'Hamburguesa', price: 12, qty: 2}];
const estado = (mesaId = 1) => app.evaluate(id => { const o = getOpenOrderForTable(id); return {
  lineas: o ? o.items.map(l => ({q: l.qty, p: l.price, e: l.estado, pagada: !!l.pagadoOnline})) : null, status: o && o.status,
  esperando: (DB.pedidosMesaQr || []).filter(p => p.estado === 'esperando-pago').length,
  pendientes: pedidosMesaQrPendientes().length, devolver: (DB.unmatchedOnlinePayments || []).map(u => u.amount),
  comisiones: (DB.ge.variables || []).filter(v => v.categoria === 'COMISIONES VENTA').map(v => [v.importe, !!v.comisionEstimada]),
  pagado: o ? cuentaMesaQr(o).pagado : 0, pendiente: o ? cuentaMesaQr(o).pendiente : 0}; }, mesaId);
const appPregunta = () => app.evaluate(async () => { await comprobarPagosTarjeta(); });

/* ================================== CASOS ================================== */
let S1;   // sesión del pago de la mesa 1

await caso('Al pulsar «Pagar y enviar», el Worker crea el pago en la cuenta DEL RESTAURANTE, en céntimos, con vuelta a la mesa', async () => {
  conectarNegocio();
  await abrirMesa(0);
  const r = await pedirYPagar(HAMB2);
  assert.ok(r.url.startsWith('https://checkout.stripe.com/c/pay/cs_test_0'), 'la web no ha ido a la página de pago: ' + r.url);
  S1 = sesiones[0];
  assert.equal(S1.cuenta, 'acct_1', 'el cobro no va a la cuenta del restaurante');
  assert.equal(S1.cuerpo['line_items[0][price_data][unit_amount]'], '2400');
  assert.equal(S1.cuerpo['line_items[0][price_data][currency]'], 'eur');
  assert.match(S1.cuerpo.success_url, new RegExp(`mesa=${TOKENS[0]}&pago=ok$`), 'la vuelta tras pagar no lleva a la mesa: ' + S1.cuerpo.success_url);
  assert.equal(S1.cuerpo['metadata[publicId]'], PUBLIC_ID);
  assert.equal(r.nuevos, 1); assert.equal(r.pedido.type, 'pedido_mesa'); assert.equal(r.pedido.pagoAlPedir, true);
  assert.equal(S1.cuerpo['metadata[orderRef]'], r.pedido.clientRef, 'el pedido y el pago llevan referencias distintas');
  assert.ok((leer(`gastrogoan/private/${PUBLIC_ID}/pagosLog`) || {}), 'no queda rastro del cobro');
  // El pedido llega al buzón del negocio.
  await app.evaluate(req => __empujar(req), r.pedido);
  return '24,00 € = 2400 céntimos en acct_1 · vuelta a la mesa · pedido con la misma referencia';
});

await caso('Mientras el cliente está en la página de Stripe (o la abandona), NADA entra en cocina', async () => {
  const antes = await estado();
  assert.equal(antes.lineas, null, 'entró en la mesa antes de pagar'); assert.equal(antes.esperando, 1);
  assert.equal(antes.pendientes, 0, 'sala lo ve como un pedido pendiente de aceptar');
  await appPregunta(); await appPregunta();
  const despues = await estado();
  assert.equal(despues.lineas, null, 'preguntar al banco sin pago metió el pedido');
  assert.equal(despues.esperando, 1, 'se dio por perdido un pago que aún puede llegar');
  return 'esperando-pago · cocina vacía tras preguntar dos veces';
});

await caso('Un aviso de pago con firma FALSA o de OTRA cuenta de Stripe no mueve nada', async () => {
  assert.equal(await stripeCobra(S1, {firma: 'whsec_FALSO'}), 400);
  assert.equal(await stripeCobra(S1, {cuenta: 'acct_999'}), 200, 'el Worker contesta 200 y lo ignora');
  assert.equal(leer(`gastrogoan/pagos/${PUBLIC_ID}/${S1.cuerpo['metadata[orderRef]']}`), undefined, 'se apuntó un pago sin firma válida / de otra cuenta');
  await appPregunta();
  assert.equal((await estado()).lineas, null);
  return 'firma falsa → 400 · otra cuenta → ignorado';
});

await caso('El cliente PAGA: el aviso firmado llega al Worker, la app lo pregunta y el pedido entra en cocina ya pagado, con la comisión real', async () => {
  assert.equal(await stripeCobra(S1), 200);
  const guardado = leer(`gastrogoan/pagos/${PUBLIC_ID}/${S1.cuerpo['metadata[orderRef]']}`);
  assert.equal(guardado.amount, 24); assert.equal(guardado.comision, 0.55);
  await appPregunta();
  const e = await estado();
  assert.deepEqual(e.lineas, [{q: 2, p: 12, e: 'cocina', pagada: true}]);
  assert.equal(e.pendiente, 0); assert.equal(e.pagado, 24);
  assert.equal(e.status, 'abierta', 'cobrar al pedir cerró la mesa');
  assert.deepEqual(e.devolver, []);
  assert.deepEqual(e.comisiones, [[0.55, false]], 'la comisión real de Stripe no queda apuntada como gasto');
  return '2 × Hamburguesa pagadas · comisión 0,55 € apuntada · mesa abierta';
});

await caso('La vuelta del banco lleva al comensal a su mesa con el aviso de pago recibido', async () => {
  await pub.goto(S1.cuerpo.success_url, {waitUntil: 'domcontentloaded'});
  await esperar(900);
  const aviso = await pub.evaluate(() => (typeof qrMesaAviso !== 'undefined') ? qrMesaAviso : null);
  assert.match(String(aviso), /Pago recibido|Pagament rebut|Payment received/);
  assert.ok(!/pago=ok/.test(pub.url()), 'la dirección conserva «pago=ok»: al recargar saldría siempre el aviso');
  return aviso;
});

await caso('Stripe REINTENTA el aviso (lo hace si no ve un 200): no se duplica nada, ni en la plataforma ni en cocina', async () => {
  await stripeCobra(S1); await stripeCobra(S1);
  assert.equal(Object.keys(leer(`gastrogoan/pagos/${PUBLIC_ID}`)).length, 1);
  await appPregunta();
  const e = await estado();
  assert.equal(e.lineas.length, 1); assert.deepEqual(e.devolver, []); assert.equal(e.comisiones.length, 1);
  return 'una sola línea · un solo pago · una sola comisión';
});

await caso('ATAQUE: la web manda a Stripe 0,50 € por un pedido de 24 €. El cliente paga lo que se le pide y NO consigue cocina', async () => {
  await abrirMesa(1);
  const r = await pedirYPagar(HAMB2, {importeForzado: 0.5});
  const S = sesiones[sesiones.length - 1];
  assert.equal(S.cuerpo['line_items[0][price_data][unit_amount]'], '50', 'el ataque no se ha simulado');
  assert.equal(r.nuevos, 1);
  await app.evaluate(req => __empujar(req), r.pedido);
  assert.equal(await stripeCobra(S), 200);
  await appPregunta();
  const e = await estado(2);
  assert.equal(e.lineas, null, 'pagando 0,50 € se consiguió un pedido de 24 € en cocina');
  assert.equal(e.pendientes, 1, 'el pedido no queda para el camarero'); assert.deepEqual(e.devolver, [0.5]);
  const html = await app.evaluate(() => renderQrMesaPendientes());
  assert.match(html, /Pagó menos|pagat menys|paid less/i);
  return '0,50 € de 24 € → fuera de cocina · queda para el camarero · 0,50 € a devolver';
});

await caso('Si Stripe o el Worker fallan, NO se registra ningún pedido huérfano y el comensal puede reintentar', async () => {
  await abrirMesa(0);
  stripeCae = true;
  const r = await pedirYPagar([{id: 101, name: 'Ensalada', price: 9.9, qty: 1}]);
  stripeCae = false;
  assert.equal(r.nuevos, 0, 'se registró el pedido aunque no se pudo crear el pago');
  const v = await pub.evaluate(() => ({error: (document.getElementById('app').innerText || '').match(/pago|pay|pagament/i) ? true : false, boton: !document.getElementById('o-submit').disabled, url: location.href}));
  assert.ok(v.boton, 'el botón se queda bloqueado: el comensal no puede reintentar');
  assert.ok(!v.url.startsWith('https://checkout'), 'se fue a Stripe sin pago');
  // Reintenta con Stripe ya recuperado: ahora sí.
  const r2 = await pedirYPagar([{id: 101, name: 'Ensalada', price: 9.9, qty: 1}]);
  assert.equal(r2.nuevos, 1);
  assert.equal(sesiones[sesiones.length - 1].cuerpo['line_items[0][price_data][unit_amount]'], '990', '9,90 € mal pasados a céntimos');
  return '500 de Stripe → sin pedido huérfano, botón libre · reintento: 9,90 € = 990 céntimos';
});

await caso('Negocio con Stripe desconectado: la web recibe el 404 del Worker y no registra ningún pedido', async () => {
  const guardado = datos.gastrogoan.private[PUBLIC_ID].stripe.activo;
  datos.gastrogoan.private[PUBLIC_ID].stripe.activo = false;
  await abrirMesa(0);
  const r = await pedirYPagar(HAMB2);
  datos.gastrogoan.private[PUBLIC_ID].stripe.activo = guardado;
  assert.equal(r.nuevos, 0);
  return 'sin pedido huérfano';
});

await caso('Dos mesas pagando a la vez no se mezclan: cada cobro llega a SU mesa', async () => {
  // Mesa 1 con la ensalada pagada (9,90 €) y mesa 2 con una hamburguesa (12 €), avisos de Stripe en orden cruzado.
  await abrirMesa(1);
  const r2 = await pedirYPagar([{id: 100, name: 'Hamburguesa', price: 12, qty: 1}]);
  const sMesa2 = sesiones[sesiones.length - 1];
  await app.evaluate(req => __empujar(req), r2.pedido);
  // El pedido de la ensalada (reintento del caso anterior) de la mesa 1:
  const pedidoEnsalada = pedidosEnviados.find(p => p.clientRef && sesiones.some(s => s.cuerpo['metadata[orderRef]'] === p.clientRef && s.cuerpo['line_items[0][price_data][unit_amount]'] === '990'));
  await app.evaluate(req => __empujar(req), pedidoEnsalada);
  const sMesa1 = sesiones.find(s => s.cuerpo['metadata[orderRef]'] === pedidoEnsalada.clientRef);
  await stripeCobra(sMesa2); await stripeCobra(sMesa1);
  await appPregunta();
  const e1 = await estado(1), e2 = await estado(2);
  assert.ok(e1.lineas.some(l => l.q === 1 && l.p === 9.9 && l.pagada), 'la ensalada no está en la mesa 1');
  assert.ok(e2.lineas.some(l => l.q === 1 && l.p === 12 && l.pagada), 'la hamburguesa no está en la mesa 2');
  assert.ok(!e2.lineas.some(l => l.p === 9.9) && !e1.lineas.some(l => l.p === 12 && l.q === 1), 'los pedidos se han mezclado entre mesas');
  return 'mesa 1 ← 9,90 € · mesa 2 ← 12 €';
});

await caso('Ningún error de JavaScript', async () => {
  const ruido = e => /Failed to fetch|NetworkError|network-request-failed|ERR_FAILED|firebase is not defined|Load failed/i.test(e);
  assert.deepEqual([...errsApp, ...errsPub].filter(e => !ruido(e)).slice(0, 5), []);
  return 'consola limpia';
});

console.log('\n' + '═'.repeat(64));
const fallos = res.filter(x => !x).length;
console.log(fallos ? `❌ ${fallos} de ${res.length} fallaron` : `✅ los ${res.length} casos pasaron`);
await browser.close();
web.kill();
process.exit(fallos ? 1 : 0);
