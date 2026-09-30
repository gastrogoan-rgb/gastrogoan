// El Worker de pagos (worker/pagos-worker.js) sin Cloudflare, Stripe ni
// Firebase de verdad: los dos son objetos en memoria detrás de un fetch falso.
// Fija lo importante: la cuenta de Stripe queda ligada al negocio correcto,
// el cobro va a la cuenta DEL RESTAURANTE, el aviso de pago solo vale con la
// firma de Stripe y llega a gastrogoan/pagos, y un negocio que ya cobra no
// se puede tocar solo con el tenantId.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import worker from '../worker/pagos-worker.js';

const res = [];
async function caso(nombre, fn){
  try { const d = await fn(); console.log('✅ ' + nombre + (d ? '  → ' + d : '')); res.push(true); }
  catch(e){ console.log('❌ ' + nombre + '\n     ⤷ ' + (e.message || e)); res.push(false); }
}

/* ---- Firebase de mentira ---- */
const DB_URL = 'https://plataforma.test';
let datos = {};
const leer = ruta => ruta.split('/').filter(Boolean).reduce((o, k) => (o && typeof o === 'object') ? o[k] : undefined, datos);
function escribir(ruta, valor){
  const partes = ruta.split('/').filter(Boolean);
  let o = datos;
  partes.slice(0, -1).forEach(k => { if(!o[k] || typeof o[k] !== 'object') o[k] = {}; o = o[k]; });
  if(valor === null) delete o[partes[partes.length - 1]]; else o[partes[partes.length - 1]] = valor;
}
/* ---- Stripe de mentira ---- */
let cuentas = {}, sesiones = [], nCuenta = 0;
const llamadasStripe = [];
let pushN = 0;
globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url);
  const m = (opts.method || 'GET').toUpperCase();
  if(u.origin === 'https://api.stripe.com'){
    assert.equal(opts.headers.Authorization, 'Bearer sk_test_X');
    const cuerpo = Object.fromEntries(new URLSearchParams(opts.body || ''));
    llamadasStripe.push({m, ruta: u.pathname, cuerpo, cuenta: opts.headers['Stripe-Account']});
    if(u.pathname === '/v1/accounts' && m === 'POST'){ const id = 'acct_' + (++nCuenta); cuentas[id] = {id, charges_enabled: false, details_submitted: false, email: 'dueno@bar.es'}; return new Response(JSON.stringify(cuentas[id])); }
    const acc = u.pathname.match(/^\/v1\/accounts\/(acct_\w+)$/);
    if(acc) return new Response(JSON.stringify(cuentas[acc[1]]));
    if(u.pathname === '/v1/account_links') return new Response(JSON.stringify({url: 'https://connect.stripe.com/setup/' + cuerpo.account}));
    if(u.pathname === '/v1/checkout/sessions'){ const s = {id: 'cs_' + sesiones.length, url: 'https://checkout.stripe.com/c/pay/cs_' + sesiones.length}; sesiones.push({s, cuerpo, cuenta: opts.headers['Stripe-Account']}); return new Response(JSON.stringify(s)); }
    throw new Error('Stripe: ruta no simulada ' + u.pathname);
  }
  assert.equal(u.origin, DB_URL, 'el Worker ha llamado fuera de Firebase y Stripe: ' + url);
  assert.equal(u.searchParams.get('auth'), 'SECRETO');
  const ruta = decodeURIComponent(u.pathname.replace(/\.json$/, ''));
  if(m === 'GET') return new Response(JSON.stringify(leer(ruta) ?? null));
  if(m === 'PUT'){ escribir(ruta, JSON.parse(opts.body)); return new Response(opts.body); }
  if(m === 'PATCH'){ const actual = leer(ruta) || {}; escribir(ruta, Object.assign({}, actual, JSON.parse(opts.body))); return new Response(opts.body); }
  if(m === 'POST'){ const k = 'p' + (++pushN); escribir(ruta + '/' + k, JSON.parse(opts.body)); return new Response(JSON.stringify({name: k})); }
  throw new Error('método ' + m);
};
const env = {FIREBASE_DB_URL: DB_URL, FIREBASE_DB_SECRET: 'SECRETO', STRIPE_SECRET_KEY: 'sk_test_X', STRIPE_WEBHOOK_SECRET: 'whsec_Y'};
const llamar = async (metodo, ruta, cuerpo, cabeceras) => {
  const r = await worker.fetch(new Request('https://gastro.test' + ruta, {method: metodo, headers: Object.assign({'content-type': 'application/json'}, cabeceras || {}), body: cuerpo === undefined ? undefined : (typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo))}), env);
  const txt = await r.text();
  let j; try { j = JSON.parse(txt); } catch(e){ j = txt; }
  return {status: r.status, j};
};
const firmar = (cuerpo, secreto = 'whsec_Y', t = Math.floor(Date.now() / 1000)) =>
  `t=${t},v1=${crypto.createHmac('sha256', secreto).update(`${t}.${cuerpo}`).digest('hex')}`;

const TENANT = 'TENANTABCDEF';
const derivado = (() => { let h = 0x811c9dc5 >>> 0; const s = TENANT + '·gastrogoan·public·v1'; for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return (h >>> 0).toString(36).padStart(7, '0'); })();
const VOLVER = 'https://app.gastrogoan.com/';

await caso('Conectar: crea una cuenta ESTÁNDAR del restaurante y da el enlace de alta de Stripe', async () => {
  datos = {}; cuentas = {}; nCuenta = 0;
  const r = await llamar('POST', '/stripe/conectar', {tenantId: TENANT, volver: VOLVER});
  assert.equal(r.status, 200, JSON.stringify(r.j));
  assert.match(r.j.url, /^https:\/\/connect\.stripe\.com\//);
  const alta = llamadasStripe.find(c => c.ruta === '/v1/accounts' && c.m === 'POST');
  assert.equal(alta.cuerpo.type, 'standard');
  assert.equal(leer(`gastrogoan/private/${derivado}/stripe/accountId`), 'acct_1');
  // Volver a pulsar no crea otra cuenta.
  await llamar('POST', '/stripe/conectar', {tenantId: TENANT, volver: VOLVER});
  assert.equal(Object.keys(cuentas).length, 1, 'cada vez que se pulsa «Conectar» se crea una cuenta nueva');
  const mala = await llamar('POST', '/stripe/conectar', {tenantId: TENANT, volver: 'https://phishing.example/'});
  assert.equal(mala.status, 400, 'deja volver a cualquier web');
  return 'cuenta estándar · un solo alta · vuelta solo a la app';
});

await caso('Un negocio que ya cobra no abre formularios de alta; y el estado se guarda para la web', async () => {
  cuentas.acct_1.charges_enabled = true; cuentas.acct_1.details_submitted = true;
  let r = await llamar('GET', `/stripe/estado?publicId=${derivado}`);
  assert.equal(r.j.activo, false, 'la web ofrece tarjeta antes de que el dueño lo haya comprobado');
  r = await llamar('GET', `/stripe/estado?tenantId=${TENANT}`);
  assert.equal(r.j.activo, true);
  assert.equal(r.j.email, 'dueno@bar.es', 'no se ve a nombre de quién está la cuenta');
  r = await llamar('GET', `/stripe/estado?publicId=${derivado}`);
  assert.deepEqual(r.j, {activo: true}, 'la web pública recibe más datos de los necesarios');
  const antes = llamadasStripe.filter(c => c.ruta === '/v1/account_links').length;
  r = await llamar('POST', '/stripe/conectar', {tenantId: TENANT, volver: VOLVER});
  assert.equal(r.j.yaConectado, true);
  assert.equal(llamadasStripe.filter(c => c.ruta === '/v1/account_links').length, antes, 'con el tenantId se ha abierto el alta de una cuenta que ya cobra');
  return 'activo · a nombre del dueño · sin formulario';
});

await caso('Pagar: el cobro se crea en la cuenta DEL RESTAURANTE, en céntimos, y con vuelta solo a la web', async () => {
  let r = await llamar('POST', '/stripe/pagar', {publicId: derivado, orderRef: 'REFabc12345', amount: 19.9, description: 'Pedido para recoger',
    urlOk: 'https://reservas.gastrogoan.com/?neg=x&track=REFabc12345&pago=ok', urlKo: 'https://reservas.gastrogoan.com/?neg=x&pago=ko'});
  assert.equal(r.status, 200, JSON.stringify(r.j));
  assert.match(r.j.url, /^https:\/\/checkout\.stripe\.com\//);
  const s = sesiones[sesiones.length - 1];
  assert.equal(s.cuenta, 'acct_1', 'el cobro no va a la cuenta del restaurante');
  assert.equal(s.cuerpo['line_items[0][price_data][unit_amount]'], '1990');
  assert.equal(s.cuerpo['metadata[orderRef]'], 'REFabc12345');
  r = await llamar('POST', '/stripe/pagar', {publicId: derivado, orderRef: 'REFabc12345', amount: 10, urlOk: 'https://malo.example/', urlKo: 'https://malo.example/'});
  assert.equal(r.status, 400, 'deja mandar al cliente a cualquier web tras pagar');
  await llamar('POST', '/stripe/desconectar', {tenantId: TENANT});
  r = await llamar('POST', '/stripe/pagar', {publicId: derivado, orderRef: 'REFx1234567', amount: 10, urlOk: 'https://reservas.gastrogoan.com/', urlKo: 'https://reservas.gastrogoan.com/'});
  assert.equal(r.status, 404, 'desconectado sigue cobrando');
  await llamar('POST', '/stripe/conectar', {tenantId: TENANT, volver: VOLVER});   // se vuelve a activar
  return '19,90 € = 1990 céntimos en acct_1 · desconectar corta';
});

await caso('El aviso de pago solo vale con la firma de Stripe, de la cuenta correcta, y no se duplica', async () => {
  const evento = (cuenta, orderRef = 'REFabc12345') => JSON.stringify({type: 'checkout.session.completed', account: cuenta,
    data: {object: {id: 'cs_0', payment_status: 'paid', amount_total: 1990, metadata: {publicId: derivado, orderRef}}}});
  let cuerpo = evento('acct_1');
  let r = await llamar('POST', '/stripe/webhook', cuerpo, {'stripe-signature': firmar(cuerpo, 'whsec_OTRO')});
  assert.equal(r.status, 400);
  assert.equal(leer(`gastrogoan/pagos/${derivado}/REFabc12345`), undefined, 'un aviso sin la firma buena ha dado un pago por bueno');
  r = await llamar('POST', '/stripe/webhook', cuerpo, {'stripe-signature': firmar(cuerpo, 'whsec_Y', Math.floor(Date.now() / 1000) - 3600)});
  assert.equal(r.status, 400, 'un aviso de hace una hora reenviado vale');
  const otra = evento('acct_999', 'REFotro12345');
  await llamar('POST', '/stripe/webhook', otra, {'stripe-signature': firmar(otra)});
  assert.equal(leer(`gastrogoan/pagos/${derivado}/REFotro12345`), undefined, 'un pago de OTRA cuenta de Stripe se apunta a este negocio');
  r = await llamar('POST', '/stripe/webhook', cuerpo, {'stripe-signature': firmar(cuerpo)});
  assert.equal(r.status, 200);
  const pago = leer(`gastrogoan/pagos/${derivado}/REFabc12345`);
  assert.ok(pago && pago.amount === 19.9, 'el pago no está donde lo pregunta la app');
  await llamar('POST', '/stripe/webhook', cuerpo, {'stripe-signature': firmar(cuerpo)});
  assert.equal(Object.keys(leer(`gastrogoan/pagos/${derivado}`)).length, 1, 'Stripe reintenta y se duplica');
  return 'firma falsa, vieja o de otra cuenta: no · buena: en /pagos, una vez';
});

await caso('Un publicId sorteado solo se acepta si es del negocio (misma nube)', async () => {
  datos = {gastrogoan: {
    tenantLookup: {[TENANT]: {databaseURL: 'https://negocio.firebaseio.com'}},
    publicLookup: {pub_bueno1: {databaseURL: 'https://negocio.firebaseio.com'}, pub_ajeno1: {databaseURL: 'https://otro.firebaseio.com'}},
  }};
  let r = await llamar('POST', '/stripe/conectar', {tenantId: TENANT, publicId: 'pub_ajeno1', volver: VOLVER});
  assert.equal(r.j.code, 'no_vinculado', 'se ha enganchado una cuenta de Stripe a la web de reservas de otro');
  r = await llamar('POST', '/stripe/conectar', {tenantId: TENANT, publicId: 'pub_bueno1', volver: VOLVER});
  assert.equal(r.status, 200, JSON.stringify(r.j));
  assert.ok(leer('gastrogoan/private/pub_bueno1/stripe/accountId'));
  r = await llamar('POST', '/stripe/conectar', {tenantId: 'x/../y', volver: VOLVER});
  assert.equal(r.status, 400, 'un tenantId con «/» se ha colado en la ruta');
  return 'ajeno: no · suyo: sí · rutas limpias';
});

console.log('\n' + '═'.repeat(64));
const fallos = res.filter(x => !x).length;
console.log(fallos ? `❌ ${fallos} de ${res.length} fallaron` : `✅ los ${res.length} casos pasaron`);
process.exit(fallos ? 1 : 0);
