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
    const esV2 = u.pathname.startsWith('/v2/');
    if(esV2) assert.ok(opts.headers['Stripe-Version'], 'una llamada a la API v2 sin Stripe-Version');
    const cuerpo = esV2 ? JSON.parse(opts.body || '{}') : Object.fromEntries(new URLSearchParams(opts.body || ''));
    llamadasStripe.push({m, ruta: u.pathname, cuerpo, cuenta: opts.headers['Stripe-Account']});
    assert.ok(!(u.pathname === '/v1/accounts' && m === 'POST'), 'se crean cuentas con la API v1, que Stripe ya no deja usar');
    if(u.pathname === '/v2/core/accounts' && m === 'POST'){ const id = 'acct_' + (++nCuenta); cuentas[id] = {id, contact_email: 'dueno@bar.es', display_name: '', configuration: {merchant: {capabilities: {card_payments: {status: 'pending'}}}}}; return new Response(JSON.stringify(cuentas[id])); }
    const acc = u.pathname.match(/^\/v2\/core\/accounts\/(acct_\w+)$/);
    if(acc) return new Response(JSON.stringify(cuentas[acc[1]]));
    if(u.pathname === '/v2/core/account_links') return new Response(JSON.stringify({url: 'https://connect.stripe.com/setup/' + cuerpo.account}));
    if(u.pathname.startsWith('/v1/payment_intents/')){ assert.ok(opts.headers['Stripe-Account'], 'la comisión se lee fuera de la cuenta del restaurante'); return new Response(JSON.stringify({id: 'pi_1', latest_charge: {balance_transaction: {fee: 55}}})); }
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

/* El negocio y su dueño se fabrican con las funciones REALES de js/core.js (extraídas del fichero), no con copias: así la prueba también
   comprueba que el Worker deriva el tenantId, el dueño y su authKey igual que la app. */
import fs from 'node:fs';
const core = fs.readFileSync(new URL('../js/core.js', import.meta.url), 'utf8');
const funcion = nombre => {            // una función de core.js entera, cerrando llaves (no hay llaves en cadenas dentro de estas)
  const i = core.indexOf('function ' + nombre + '(');
  let n = 0, j = core.indexOf('{', i);
  for(let k = j; k < core.length; k++){ if(core[k] === '{') n++; else if(core[k] === '}' && --n === 0) return core.slice(i, k + 1); }
  throw new Error('no encuentro ' + nombre);
};
const alfabeto = core.match(/const GG_ALPHABET = '[A-Z0-9]+';/)[0];
const app = new Function(`${alfabeto}
${['ggLicHash', '_ggBizSecret', 'ggBizTenantId', 'ggOwnerUser', '_ggOwnerSecret', 'ggOwnerDerive', 'ggOwnerAuthKey', 'ggOwnerId'].map(funcion).join('\n')}
return {ggBizTenantId, ggOwnerAuthKey, ggOwnerId, ggOwnerUser};`)();
const CODE = 'ABCD2345';
const TENANT = app.ggBizTenantId(CODE);
const AUTHKEY = app.ggOwnerAuthKey('Casa Paco', '123456');
const OWNERID = app.ggOwnerId('Casa Paco');
// La plataforma con la cuenta del dueño (de ella cuelga su lista de negocios) y la reserva de su código.
const plataformaBase = () => ({ownerAuth: {[AUTHKEY]: {user: 'casapaco', businesses: {[TENANT]: {code: CODE, name: 'Casa Paco'}}}}, codeClaims: {[CODE]: OWNERID}});
const sembrar = extra => { datos = {gastrogoan: Object.assign(plataformaBase(), extra || {})}; };
const DUENO = {ownerAuthKey: AUTHKEY};
const derivado = (() => { let h = 0x811c9dc5 >>> 0; const s = TENANT + '·gastrogoan·public·v1'; for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return (h >>> 0).toString(36).padStart(7, '0'); })();
const VOLVER = 'https://app.gastrogoan.com/';

await caso('Conectar: crea la cuenta del restaurante (Accounts v2, su panel, sus comisiones) y da el enlace de alta de Stripe', async () => {
  sembrar(); cuentas = {}; nCuenta = 0;
  const r = await llamar('POST', '/stripe/conectar', {tenantId: TENANT, ...DUENO, volver: VOLVER});
  assert.equal(r.status, 200, JSON.stringify(r.j));
  assert.match(r.j.url, /^https:\/\/connect\.stripe\.com\//);
  const alta = llamadasStripe.find(c => c.ruta === '/v2/core/accounts' && c.m === 'POST');
  assert.equal(alta.cuerpo.dashboard, 'full', 'el restaurante no tendría su panel de Stripe');
  assert.deepEqual(alta.cuerpo.defaults.responsibilities, {fees_collector: 'stripe', losses_collector: 'stripe'}, 'GastroGoan quedaría pagando comisiones o pérdidas');
  assert.equal(alta.cuerpo.configuration.merchant.capabilities.card_payments.requested, true);
  assert.equal(leer(`gastrogoan/private/${derivado}/stripe/accountId`), 'acct_1');
  // Volver a pulsar no crea otra cuenta.
  await llamar('POST', '/stripe/conectar', {tenantId: TENANT, ...DUENO, volver: VOLVER});
  assert.equal(Object.keys(cuentas).length, 1, 'cada vez que se pulsa «Conectar» se crea una cuenta nueva');
  const mala = await llamar('POST', '/stripe/conectar', {tenantId: TENANT, ...DUENO, volver: 'https://phishing.example/'});
  assert.equal(mala.status, 400, 'deja volver a cualquier web');
  return 'cuenta estándar · un solo alta · vuelta solo a la app';
});

await caso('Un negocio que ya cobra no abre formularios de alta; y el estado se guarda para la web', async () => {
  cuentas.acct_1.configuration.merchant.capabilities.card_payments.status = 'active';
  let r = await llamar('GET', `/stripe/estado?publicId=${derivado}`);
  assert.equal(r.j.activo, false, 'la web ofrece tarjeta antes de que el dueño lo haya comprobado');
  r = await llamar('POST', '/stripe/estado', {tenantId: TENANT, ...DUENO});
  assert.equal(r.j.activo, true);
  assert.equal(r.j.email, 'dueno@bar.es', 'no se ve a nombre de quién está la cuenta');
  r = await llamar('GET', `/stripe/estado?publicId=${derivado}`);
  assert.deepEqual(r.j, {activo: true}, 'la web pública recibe más datos de los necesarios');
  const antes = llamadasStripe.filter(c => c.ruta === '/v2/core/account_links').length;
  r = await llamar('POST', '/stripe/conectar', {tenantId: TENANT, ...DUENO, volver: VOLVER});
  assert.equal(r.j.yaConectado, true);
  assert.equal(llamadasStripe.filter(c => c.ruta === '/v2/core/account_links').length, antes, 'con el tenantId se ha abierto el alta de una cuenta que ya cobra');
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
  await llamar('POST', '/stripe/desconectar', {tenantId: TENANT, ...DUENO});
  r = await llamar('POST', '/stripe/pagar', {publicId: derivado, orderRef: 'REFx1234567', amount: 10, urlOk: 'https://reservas.gastrogoan.com/', urlKo: 'https://reservas.gastrogoan.com/'});
  assert.equal(r.status, 404, 'desconectado sigue cobrando');
  await llamar('POST', '/stripe/conectar', {tenantId: TENANT, ...DUENO, volver: VOLVER});   // se vuelve a activar
  return '19,90 € = 1990 céntimos en acct_1 · desconectar corta';
});

await caso('Pedido en grupo: la sesión de cada comensal CADUCA (30-120 min) y lleva su hueco; sin pedirlo, nada cambia', async () => {
  const ok = 'https://reservas.gastrogoan.com/?neg=x&mesa=T&pago=ok', ko = 'https://reservas.gastrogoan.com/?neg=x&mesa=T&pago=ko';
  let r = await llamar('POST', '/stripe/pagar', {publicId: derivado, orderRef: 'REFgrupo0001', amount: 12.4, description: 'Mesa 3 · Ana', urlOk: ok, urlKo: ko});
  assert.equal(r.status, 200);
  let s = sesiones[sesiones.length - 1];
  assert.equal(s.cuerpo.expires_at, undefined, 'sin expiraMin la sesión tiene que seguir como antes (24 h de Stripe)');
  assert.equal(s.cuerpo['metadata[slot]'], undefined);
  const ahora = Math.floor(Date.now() / 1000);
  const casos = [[30, 30], [5, 30], [60, 60], [9999, 120], ['x', null], [-4, null]];
  for(const [pide, minutos] of casos){
    r = await llamar('POST', '/stripe/pagar', {publicId: derivado, orderRef: 'REFgrupo0002', amount: 12.4, description: 'Mesa 3 · Ana', urlOk: ok, urlKo: ko, expiraMin: pide, slot: 'm3'});
    assert.equal(r.status, 200, JSON.stringify(r.j));
    s = sesiones[sesiones.length - 1];
    if(minutos == null){ assert.equal(s.cuerpo.expires_at, undefined, 'expiraMin ' + pide + ' no es un número válido: no se inventa una caducidad'); continue; }
    const dentro = Number(s.cuerpo.expires_at) - ahora;
    assert.ok(dentro >= minutos * 60 + 60 - 5 && dentro <= minutos * 60 + 60 + 5, `expiraMin ${pide}: caduca a ${dentro} s, esperado ≈ ${minutos * 60 + 60}`);
    assert.ok(dentro >= 30 * 60, 'Stripe rechaza caducidades de menos de 30 minutos');
    assert.equal(s.cuerpo['metadata[slot]'], 'm3');
  }
  r = await llamar('POST', '/stripe/pagar', {publicId: derivado, orderRef: 'REFgrupo0003', amount: 12.4, urlOk: ok, urlKo: ko, expiraMin: 30, slot: 'm99; DROP'});
  assert.equal(sesiones[sesiones.length - 1].cuerpo['metadata[slot]'], undefined, 'un hueco que no existe no se escribe en Stripe');
  r = await llamar('POST', '/stripe/pagar', {publicId: derivado, orderRef: 'REFgrupo0004', amount: 0.2, urlOk: ok, urlKo: ko, expiraMin: 30});
  assert.equal(r.status, 400, 'el importe mínimo sigue siendo el de siempre');
  return 'expires_at acotado a 30-120 min';
});

await caso('El aviso de pago solo vale con la firma de Stripe, de la cuenta correcta, y no se duplica', async () => {
  const evento = (cuenta, orderRef = 'REFabc12345') => JSON.stringify({type: 'checkout.session.completed', account: cuenta,
    data: {object: {id: 'cs_0', payment_status: 'paid', amount_total: 1990, payment_intent: 'pi_1', metadata: {publicId: derivado, orderRef}}}});
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
  assert.equal(pago.comision, 0.55, 'no se apunta la comisión real de Stripe');
  await llamar('POST', '/stripe/webhook', cuerpo, {'stripe-signature': firmar(cuerpo)});
  assert.equal(Object.keys(leer(`gastrogoan/pagos/${derivado}`)).length, 1, 'Stripe reintenta y se duplica');
  return 'firma falsa, vieja o de otra cuenta: no · buena: en /pagos, una vez';
});

await caso('Al pasar a modo real, la cuenta de pruebas se olvida: «Conectar» crea una nueva', async () => {
  // Hay una cuenta guardada de las de antes (sin modo = de pruebas). Con la clave real
  // NO existe en Stripe: si se usara, el negocio se quedaría con un error.
  const antes = Object.keys(cuentas).length;
  env.STRIPE_SECRET_KEY = 'sk_live_X';
  const orig = globalThis.fetch;
  globalThis.fetch = (url, opts = {}) => { if(String(url).startsWith('https://api.stripe.com')) opts.headers.Authorization = 'Bearer sk_test_X'; return orig(url, opts); };
  try{
    const e = await llamar('POST', '/stripe/estado', {tenantId: TENANT, ...DUENO});
    assert.equal(e.j.conectado, false, 'en modo real la cuenta de pruebas sigue saliendo como conectada');
    const r = await llamar('POST', '/stripe/conectar', {tenantId: TENANT, ...DUENO, volver: VOLVER});
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(Object.keys(cuentas).length, antes + 1, 'no se creó una cuenta nueva en modo real');
    const guardada = Object.values(datos.gastrogoan.private)[0].stripe;
    assert.equal(guardada.modo, 'real');
  } finally { env.STRIPE_SECRET_KEY = 'sk_test_X'; globalThis.fetch = orig; }
  return 'la de pruebas no se usa · cuenta nueva marcada «real»';
});

await caso('Un publicId sorteado solo se acepta si es del negocio (misma nube)', async () => {
  sembrar({
    tenantLookup: {[TENANT]: {databaseURL: 'https://negocio.firebaseio.com'}},
    publicLookup: {pub_bueno1: {databaseURL: 'https://negocio.firebaseio.com'}, pub_ajeno1: {databaseURL: 'https://otro.firebaseio.com'}},
  });
  let r = await llamar('POST', '/stripe/conectar', {tenantId: TENANT, ...DUENO, publicId: 'pub_ajeno1', volver: VOLVER});
  assert.equal(r.j.code, 'no_vinculado', 'se ha enganchado una cuenta de Stripe a la web de reservas de otro');
  r = await llamar('POST', '/stripe/conectar', {tenantId: TENANT, ...DUENO, publicId: 'pub_bueno1', volver: VOLVER});
  assert.equal(r.status, 200, JSON.stringify(r.j));
  assert.ok(leer('gastrogoan/private/pub_bueno1/stripe/accountId'));
  r = await llamar('POST', '/stripe/conectar', {tenantId: 'x/../y', ...DUENO, volver: VOLVER});
  assert.equal(r.status, 400, 'un tenantId con «/» se ha colado en la ruta');
  return 'ajeno: no · suyo: sí · rutas limpias';
});

/* ══ Hallazgo 2 de la auditoría (25/11): el tenantId NO prueba que quien llama sea el dueño ══ */
await caso('Con solo el tenantId (lo conoce cualquier empleado) NO se conecta, ni se desconecta, ni se ve a nombre de quién está la cuenta', async () => {
  sembrar(); cuentas = {}; nCuenta = 0;
  const antes = llamadasStripe.length;
  let r = await llamar('POST', '/stripe/conectar', {tenantId: TENANT, volver: VOLVER});
  assert.equal(r.status, 403); assert.equal(r.j.code, 'no_dueno', 'se ha creado una cuenta de Stripe a nombre de otro con solo el tenantId');
  assert.equal(llamadasStripe.length, antes, 'se ha llamado a Stripe sin comprobar al dueño');
  assert.equal(leer(`gastrogoan/private/${derivado}/stripe`), undefined, 'se ha enlazado una cuenta al negocio ajeno');
  // Dueño real: sí. Y ya con cuenta, el desconocido tampoco la apaga ni la ve.
  r = await llamar('POST', '/stripe/conectar', {tenantId: TENANT, ...DUENO, volver: VOLVER}); assert.equal(r.status, 200, JSON.stringify(r.j));
  cuentas.acct_1.configuration.merchant.capabilities.card_payments.status = 'active';
  await llamar('GET', `/stripe/estado?tenantId=${TENANT}`);
  r = await llamar('POST', '/stripe/desconectar', {tenantId: TENANT});
  assert.equal(r.status, 403, 'un desconocido apagó el cobro con tarjeta de un negocio');
  assert.equal(leer(`gastrogoan/private/${derivado}/stripe/disabled`), false, 'el cobro quedó apagado');
  r = await llamar('GET', `/stripe/estado?tenantId=${TENANT}`);
  assert.equal(r.j.activo, true); assert.equal(r.j.email, undefined, 'el estado sin prueba enseña el correo de la cuenta');
  assert.equal(r.j.accountId, undefined, 'el estado sin prueba enseña el accountId');
  r = await llamar('POST', '/stripe/estado', {tenantId: TENANT});
  assert.equal(r.status, 403, 'POST /estado sin prueba');
  return 'conectar, desconectar y datos de la cuenta: solo con la prueba del dueño';
});
await caso('Un authKey ajeno, una cuenta que se cuelga un negocio con un código inventado y un código reservado por otro NO valen', async () => {
  const otraClave = app.ggOwnerAuthKey('Bar Pepe', '654321');
  const intento = async (extra, authKey) => { sembrar(extra); return llamar('POST', '/stripe/conectar', {tenantId: TENANT, ownerAuthKey: authKey, volver: VOLVER}); };
  // 1. Otro cliente de pago, con SU cuenta, sin el negocio en su lista.
  let r = await intento({ownerAuth: {[AUTHKEY]: plataformaBase().ownerAuth[AUTHKEY], [otraClave]: {user: 'barpepe', businesses: {}}}}, otraClave);
  assert.equal(r.j.code, 'no_dueno', 'una cuenta ajena conecta Stripe en un negocio que no es suyo');
  // 2. Se cuelga el tenantId ajeno en su propia lista (las reglas lo permiten) con un código inventado.
  r = await intento({ownerAuth: {[otraClave]: {user: 'barpepe', businesses: {[TENANT]: {code: 'ZZZZ9999', name: 'robado'}}}}}, otraClave);
  assert.equal(r.j.code, 'no_dueno', 'colgarse el tenantId ajeno con un código cualquiera basta');
  // 3. Con el código verdadero, pero reservado por el dueño legítimo.
  r = await intento({ownerAuth: {[otraClave]: {user: 'barpepe', businesses: {[TENANT]: {code: CODE, name: 'x'}}}}}, otraClave);
  assert.equal(r.j.code, 'no_dueno', 'con el código pero siendo otro dueño de la reserva');
  // 4. Una lápida (negocio dado de baja en esa cuenta) tampoco.
  r = await intento({ownerAuth: {[AUTHKEY]: {user: 'casapaco', businesses: {[TENANT]: {code: CODE, deleted: true}}}}}, AUTHKEY);
  assert.equal(r.j.code, 'no_dueno', 'un negocio dado de baja sigue valiendo');
  // 5. authKeys malformados (la ruta de Firebase no se puede manipular).
  for(const malo of ['', 'a/../b', 'x'.repeat(200), null, 123]){
    sembrar(); r = await llamar('POST', '/stripe/conectar', {tenantId: TENANT, ownerAuthKey: malo, volver: VOLVER});
    assert.equal(r.j.code, 'no_dueno', 'authKey raro aceptado: ' + JSON.stringify(malo));
  }
  return 'cuenta ajena, tenantId colgado, código ajeno, lápida y authKey raro: todos rechazados';
});
await caso('Cambiar el PIN no deja al dueño sin gestionar su Stripe, y un negocio anterior a las reservas de código sigue pudiendo', async () => {
  // changeOwnerAccessPin muda la cuenta a la ruta nueva CON su lista de negocios: el authKey nuevo es otro, la cuenta es la misma.
  const nueva = app.ggOwnerAuthKey('Casa Paco', 'NUEVOPIN99');
  assert.notEqual(nueva, AUTHKEY);
  sembrar(); delete datos.gastrogoan.ownerAuth[AUTHKEY]; datos.gastrogoan.ownerAuth[nueva] = {user: 'casapaco', businesses: {[TENANT]: {code: CODE, name: 'Casa Paco'}}};
  let r = await llamar('POST', '/stripe/conectar', {tenantId: TENANT, ownerAuthKey: nueva, volver: VOLVER});
  assert.equal(r.status, 200, 'tras cambiar el PIN el dueño no puede conectar: ' + JSON.stringify(r.j));
  r = await llamar('POST', '/stripe/conectar', {tenantId: TENANT, ownerAuthKey: AUTHKEY, volver: VOLVER});
  assert.equal(r.j.code, 'no_dueno', 'el PIN viejo (ruta ya borrada) sigue valiendo');
  // Negocio de antes de codeClaims: sin reserva, se acepta (pasar el paso del código ya exige conocerlo).
  sembrar(); delete datos.gastrogoan.codeClaims;
  r = await llamar('POST', '/stripe/conectar', {tenantId: TENANT, ...DUENO, volver: VOLVER});
  assert.equal(r.status, 200, 'un negocio antiguo sin reserva de código se queda sin poder conectar');
  return 'PIN nuevo vale, PIN viejo no, negocio antiguo vale';
});
await caso('El Worker deriva tenantId y dueño IGUAL que la app (si se separan, ningún dueño pasaría la prueba)', async () => {
  for(const c of ['ABCD2345', 'ZXCV8765', 'MNBH2468']){
    sembrar(); datos.gastrogoan.ownerAuth[AUTHKEY].businesses = {[app.ggBizTenantId(c)]: {code: c, name: 'x'}};
    datos.gastrogoan.codeClaims = {[c]: app.ggOwnerId('Casa Paco')};
    const r = await llamar('POST', '/stripe/conectar', {tenantId: app.ggBizTenantId(c), ...DUENO, volver: VOLVER});
    assert.equal(r.status, 200, `con el código ${c}: ${JSON.stringify(r.j)}`);
  }
  // El nombre «Casa Paco» con tildes y mayúsculas es el mismo dueño (ggOwnerUser).
  sembrar(); datos.gastrogoan.codeClaims[CODE] = app.ggOwnerId('CASA PACÓ');
  assert.equal((await llamar('POST', '/stripe/conectar', {tenantId: TENANT, ...DUENO, volver: VOLVER})).status, 200);
  return '3 códigos y el nombre con tildes';
});

console.log('\n' + '═'.repeat(64));
const fallos = res.filter(x => !x).length;
console.log(fallos ? `❌ ${fallos} de ${res.length} fallaron` : `✅ los ${res.length} casos pasaron`);
process.exit(fallos ? 1 : 0);
