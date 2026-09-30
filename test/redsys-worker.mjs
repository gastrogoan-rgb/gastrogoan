// El Worker de Redsys (worker/redsys-worker.js), sin Cloudflare ni Firebase:
// la base de datos es un objeto en memoria detrás de un fetch falso. Fija lo
// que se arregló el 30/09: nadie cambia ni desactiva un TPV sin su clave
// actual, el publicId tiene que ser del negocio, la confirmación del banco
// llega a gastrogoan/pagos y la firma sigue siendo la de Redsys.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import worker from '../worker/redsys-worker.js';

const res = [];
async function caso(nombre, fn){
  try { const d = await fn(); console.log('✅ ' + nombre + (d ? '  → ' + d : '')); res.push(true); }
  catch(e){ console.log('❌ ' + nombre + '\n     ⤷ ' + (e.message || e)); res.push(false); }
}

/* ---- Firebase de mentira: rutas → valores ---- */
const DB_URL = 'https://plataforma.test';
let datos = {};
const leer = ruta => ruta.split('/').filter(Boolean).reduce((o, k) => (o && typeof o === 'object') ? o[k] : undefined, datos);
function escribir(ruta, valor){
  const partes = ruta.split('/').filter(Boolean);
  let o = datos;
  partes.slice(0, -1).forEach(k => { if(!o[k] || typeof o[k] !== 'object') o[k] = {}; o = o[k]; });
  if(valor === null) delete o[partes[partes.length - 1]]; else o[partes[partes.length - 1]] = valor;
}
let pushN = 0;
globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url);
  assert.equal(u.origin, DB_URL, 'el Worker ha llamado fuera de Firebase: ' + url);
  assert.equal(u.searchParams.get('auth'), 'SECRETO');
  const ruta = decodeURIComponent(u.pathname.replace(/\.json$/, ''));
  const m = (opts.method || 'GET').toUpperCase();
  if(m === 'GET') return new Response(JSON.stringify(leer(ruta) ?? null));
  if(m === 'PUT'){ escribir(ruta, JSON.parse(opts.body)); return new Response(opts.body); }
  if(m === 'POST'){ const k = 'p' + (++pushN); escribir(ruta + '/' + k, JSON.parse(opts.body)); return new Response(JSON.stringify({name: k})); }
  if(m === 'DELETE'){ escribir(ruta, null); return new Response('null'); }
  throw new Error('método ' + m);
};
const env = {FIREBASE_DB_URL: DB_URL, FIREBASE_DB_SECRET: 'SECRETO'};
const llamar = async (metodo, ruta, cuerpo) => {
  const r = await worker.fetch(new Request('https://gastro.test' + ruta, {method: metodo, headers: {'content-type': 'application/json'}, body: cuerpo ? JSON.stringify(cuerpo) : undefined}), env);
  const txt = await r.text();
  let j; try { j = JSON.parse(txt); } catch(e){ j = txt; }
  return {status: r.status, j};
};

// La de pruebas pública de Redsys (entorno sis-t): 24 bytes en Base64.
const CLAVE = 'sq7HjrUOBfKmC576ILgskD5srU870gJ7';
const OTRA = Buffer.alloc(24, 7).toString('base64');
const TENANT = 'TENANTABCDEF';
const derivado = (() => { let h = 0x811c9dc5 >>> 0; const s = TENANT + '·gastrogoan·public·v1'; for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return (h >>> 0).toString(36).padStart(7, '0'); })();

await caso('La firma HMAC_SHA256_V1 es la misma que la de Node (3DES + HMAC)', async () => {
  datos = {gastrogoan: {private: {[derivado]: {redsysConfig: {fuc: '999008881', terminal: '1', claveSecreta: CLAVE, ambiente: 'test'}}}}};
  const r = await llamar('POST', '/sign', {publicId: derivado, orderRef: 'REF123456789', amount: 19.9, description: 'x'});
  assert.equal(r.status, 200, JSON.stringify(r.j));
  const params = r.j.fields.Ds_MerchantParameters;
  const order = JSON.parse(Buffer.from(params, 'base64').toString()).Ds_Merchant_Order;
  const cipher = crypto.createCipheriv('des-ede3-cbc', Buffer.from(CLAVE, 'base64'), Buffer.alloc(8));
  cipher.setAutoPadding(false);
  const o = Buffer.alloc(Math.ceil(order.length / 8) * 8); o.write(order);
  const k = Buffer.concat([cipher.update(o), cipher.final()]);
  const esperada = crypto.createHmac('sha256', k).update(params).digest('base64');
  assert.equal(r.j.fields.Ds_Signature, esperada);
  assert.equal(JSON.parse(Buffer.from(params, 'base64').toString()).Ds_Merchant_Amount, '1990');
  assert.match(order, /^\d{12}$/);
  return 'firma idéntica · 19,90 € = 1990 céntimos';
});

await caso('Nadie cambia ni desactiva un TPV configurado sin su clave actual', async () => {
  datos = {};
  let r = await llamar('POST', '/config', {tenantId: TENANT, fuc: '999008881', terminal: '1', claveSecreta: CLAVE});
  assert.equal(r.status, 200, 'la primera configuración debería entrar');
  r = await llamar('POST', '/config', {tenantId: TENANT, fuc: '111111111', terminal: '1', claveSecreta: OTRA});
  assert.equal(r.j.code, 'clave_actual', 'se ha podido poner OTRO código de comercio sin la clave');
  assert.equal(leer(`gastrogoan/private/${derivado}/redsysConfig/fuc`), '999008881');
  r = await llamar('POST', '/config', {tenantId: TENANT, disabled: true, claveActual: OTRA});
  assert.equal(r.j.code, 'clave_actual', 'se ha podido desactivar con una clave falsa');
  r = await llamar('POST', '/config', {tenantId: TENANT, fuc: '999008881', terminal: '2', claveSecreta: OTRA, claveActual: CLAVE});
  assert.equal(r.status, 200, 'el dueño, con su clave, no ha podido cambiarlo');
  r = await llamar('POST', '/config', {tenantId: TENANT, disabled: true, claveActual: OTRA});
  assert.equal(r.status, 200, 'desactivar con la clave buena no funciona');
  r = await llamar('GET', `/config?publicId=${derivado}`);
  assert.equal(r.j.configured, false, 'desactivado sigue saliendo como configurado');
  r = await llamar('POST', '/sign', {publicId: derivado, orderRef: 'REF123456789', amount: 10});
  assert.equal(r.status, 404, 'un TPV desactivado sigue firmando pagos');
  return 'sin clave: no · con clave: sí · desactivado no firma';
});

await caso('Un publicId sorteado solo se acepta si es del negocio (misma nube)', async () => {
  datos = {gastrogoan: {
    tenantLookup: {[TENANT]: {apiKey: 'k', databaseURL: 'https://negocio.firebaseio.com'}},
    publicLookup: {pub_bueno1: {apiKey: 'k', databaseURL: 'https://negocio.firebaseio.com'}, pub_ajeno1: {apiKey: 'k', databaseURL: 'https://otro.firebaseio.com'}},
  }};
  let r = await llamar('POST', '/config', {tenantId: TENANT, publicId: 'pub_ajeno1', fuc: '999008881', terminal: '1', claveSecreta: CLAVE});
  assert.equal(r.j.code, 'no_vinculado', 'se ha enganchado un TPV a la web de reservas de otro');
  r = await llamar('POST', '/config', {tenantId: TENANT, publicId: 'pub_bueno1', fuc: '999008881', terminal: '1', claveSecreta: CLAVE});
  assert.equal(r.status, 200, JSON.stringify(r.j));
  assert.ok(leer('gastrogoan/private/pub_bueno1/redsysConfig'), 'no se guarda con el publicId que usa la web');
  r = await llamar('POST', '/config', {tenantId: 'x/../y', fuc: '1', terminal: '1', claveSecreta: CLAVE});
  assert.equal(r.status, 400, 'un tenantId con «/» se ha colado en la ruta');
  return 'ajeno: no · suyo: sí · rutas limpias';
});

await caso('La configuración antigua (publicId deducido) se muda sola al publicId de verdad', async () => {
  datos = {gastrogoan: {
    tenantLookup: {[TENANT]: {databaseURL: 'https://negocio.firebaseio.com'}},
    publicLookup: {pub_nuevo1: {databaseURL: 'https://negocio.firebaseio.com'}},
    private: {[derivado]: {redsysConfig: {fuc: '999008881', terminal: '1', claveSecreta: CLAVE, ambiente: 'test'}}},
  }};
  const r = await llamar('GET', `/config?tenantId=${TENANT}&publicId=pub_nuevo1`);
  assert.equal(r.j.configured, true);
  assert.ok(leer('gastrogoan/private/pub_nuevo1/redsysConfig'), 'no se ha mudado');
  assert.equal(leer(`gastrogoan/private/${derivado}/redsysConfig`), undefined, 'se ha quedado una copia vieja');
  assert.equal(r.j.claveSecreta, undefined, '¡el GET devuelve la clave!');
  return 'mudada · sin devolver la clave';
});

await caso('La confirmación del banco llega a gastrogoan/pagos; una falsa, no', async () => {
  datos = {gastrogoan: {private: {pub_bueno1: {redsysConfig: {fuc: '999008881', terminal: '1', claveSecreta: CLAVE, ambiente: 'test'}}}}};
  const params = {Ds_Order: '123456789012', Ds_Amount: '1990', Ds_Response: '0000', Ds_MerchantData: JSON.stringify({publicId: 'pub_bueno1', orderRef: 'REFabc12345'})};
  const b64 = Buffer.from(JSON.stringify(params)).toString('base64');
  const cipher = crypto.createCipheriv('des-ede3-cbc', Buffer.from(CLAVE, 'base64'), Buffer.alloc(8)); cipher.setAutoPadding(false);
  const k = Buffer.concat([cipher.update(Buffer.from(params.Ds_Order.padEnd(16, '\0'))), cipher.final()]);
  const firma = crypto.createHmac('sha256', k).update(b64).digest('base64').replace(/\+/g, '-').replace(/\//g, '_');
  let r = await llamar('POST', '/notify', {Ds_SignatureVersion: 'HMAC_SHA256_V1', Ds_MerchantParameters: b64, Ds_Signature: 'falsa' + firma.slice(5)});
  assert.equal(r.status, 400);
  assert.equal(leer('gastrogoan/pagos/pub_bueno1/REFabc12345'), undefined, 'una firma falsa ha dado un pago por bueno');
  r = await llamar('POST', '/notify', {Ds_SignatureVersion: 'HMAC_SHA256_V1', Ds_MerchantParameters: b64, Ds_Signature: firma});
  assert.equal(r.status, 200);
  const pago = leer('gastrogoan/pagos/pub_bueno1/REFabc12345');
  assert.ok(pago && pago.amount === 19.9, 'el pago no está donde lo pregunta la app');
  // Redsys reintenta el aviso: no se duplica.
  await llamar('POST', '/notify', {Ds_SignatureVersion: 'HMAC_SHA256_V1', Ds_MerchantParameters: b64, Ds_Signature: firma});
  assert.equal(Object.keys(leer('gastrogoan/pagos/pub_bueno1')).length, 1);
  return 'falsa rechazada · buena en /pagos · reintento sin duplicar';
});

console.log('\n' + '═'.repeat(64));
const fallos = res.filter(x => !x).length;
console.log(fallos ? `❌ ${fallos} de ${res.length} fallaron` : `✅ los ${res.length} casos pasaron`);
process.exit(fallos ? 1 : 0);
