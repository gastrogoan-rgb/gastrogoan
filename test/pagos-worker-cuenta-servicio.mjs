// El Worker de pagos con una CUENTA DE SERVICIO de Firebase en lugar del «Database secret» (obsoleto, 26/11).
// Sin Google ni Firebase de verdad: una clave RSA generada aquí firma como lo haría la cuenta de servicio, y un fetch
// falso hace de endpoint de tokens de Google y de base de datos. Fija: el JWT va bien firmado y con los datos correctos,
// el token se pide UNA vez y se reutiliza, la base de datos recibe `access_token` y nunca el secreto antiguo, el secreto
// antiguo sigue sirviendo si no hay cuenta de servicio (compatibilidad) y, sin ninguna de las dos, el fallo es claro.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import worker from '../worker/pagos-worker.js';

const res = [];
async function caso(nombre, fn){
  try { const d = await fn(); console.log('✅ ' + nombre + (d ? '  → ' + d : '')); res.push(true); }
  catch(e){ console.log('❌ ' + nombre + '\n     ⤷ ' + (e.message || e)); res.push(false); }
}

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const SA = JSON.stringify({
  type: 'service_account', client_email: 'pagos@plataforma-gastrogoan.iam.gserviceaccount.com',
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
});
const DB_URL = 'https://plataforma.test';
const dec = s => JSON.parse(Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));

let pidiosToken = 0, ultimoJwt = null, caducaEn = 3600;
const urlsFirebase = [];
globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url);
  if(u.origin === 'https://oauth2.googleapis.com'){
    assert.equal(u.pathname, '/token');
    const p = new URLSearchParams(opts.body);
    assert.equal(p.get('grant_type'), 'urn:ietf:params:oauth:grant-type:jwt-bearer');
    ultimoJwt = p.get('assertion'); pidiosToken++;
    return new Response(JSON.stringify({ access_token: 'TOKEN_' + pidiosToken, expires_in: caducaEn, token_type: 'Bearer' }));
  }
  assert.equal(u.origin, DB_URL, 'llamada fuera de Google y Firebase: ' + url);
  urlsFirebase.push(u);
  return new Response('null');
};

const ESTADO = '/stripe/estado?tenantId=ABCD1234&publicId=pub12345';
const llamar = env => worker.fetch(new Request('https://gastro.test' + ESTADO), env);

await caso('Pide un token a Google con un JWT bien firmado, con el usuario y los permisos de Firebase', async () => {
  const env = { FIREBASE_DB_URL: DB_URL, FIREBASE_SERVICE_ACCOUNT: SA, STRIPE_SECRET_KEY: 'sk_test_X' };
  await llamar(env);
  assert.equal(pidiosToken, 1);
  const [cab, cuerpo, firma] = ultimoJwt.split('.');
  assert.deepEqual(dec(cab), { alg: 'RS256', typ: 'JWT' });
  const c = dec(cuerpo);
  assert.equal(c.iss, 'pagos@plataforma-gastrogoan.iam.gserviceaccount.com');
  assert.equal(c.aud, 'https://oauth2.googleapis.com/token');
  assert.ok(c.scope.includes('https://www.googleapis.com/auth/firebase.database') && c.scope.includes('userinfo.email'));
  assert.ok(c.exp - c.iat <= 3600 && c.exp > Math.floor(Date.now() / 1000), 'caducidad del JWT');
  const ok = crypto.verify('RSA-SHA256', Buffer.from(cab + '.' + cuerpo), publicKey, Buffer.from(firma.replace(/-/g, '+').replace(/_/g, '/'), 'base64'));
  assert.ok(ok, 'la firma del JWT no coincide con la clave pública');
  return 'JWT RS256 verificado con la clave pública';
});

await caso('La base de datos recibe access_token y NUNCA el secreto heredado, aunque también esté puesto', async () => {
  urlsFirebase.length = 0;
  const env = { FIREBASE_DB_URL: DB_URL, FIREBASE_SERVICE_ACCOUNT: SA, FIREBASE_DB_SECRET: 'VIEJO', STRIPE_SECRET_KEY: 'sk_test_X' };
  await llamar(env);
  assert.ok(urlsFirebase.length >= 1, 'no llegó ninguna llamada a Firebase');
  urlsFirebase.forEach(u => {
    assert.equal(u.searchParams.get('access_token'), 'TOKEN_1');
    assert.equal(u.searchParams.get('auth'), null, 'se envió el secreto heredado');
  });
  return urlsFirebase.length + ' llamada(s) con el token';
});

await caso('El token se reutiliza: varias peticiones, una sola ida a Google', async () => {
  const antes = pidiosToken;
  const env = { FIREBASE_DB_URL: DB_URL, FIREBASE_SERVICE_ACCOUNT: SA, STRIPE_SECRET_KEY: 'sk_test_X' };
  await llamar(env); await llamar(env); await llamar(env);
  assert.equal(pidiosToken, antes, 'se pidió un token nuevo en cada petición');
});

await caso('Sin cuenta de servicio sigue valiendo el secreto heredado (compatibilidad)', async () => {
  urlsFirebase.length = 0;
  await llamar({ FIREBASE_DB_URL: DB_URL, FIREBASE_DB_SECRET: 'VIEJO', STRIPE_SECRET_KEY: 'sk_test_X' });
  assert.ok(urlsFirebase.length >= 1);
  urlsFirebase.forEach(u => { assert.equal(u.searchParams.get('auth'), 'VIEJO'); assert.equal(u.searchParams.get('access_token'), null); });
});

await caso('Sin ninguna de las dos, el Worker no hace llamadas y el error dice qué falta', async () => {
  urlsFirebase.length = 0;
  let msg = '';
  const log = console.error; console.error = (...a) => { msg += a.join(' '); };
  let r;
  try { r = await llamar({ FIREBASE_DB_URL: DB_URL, STRIPE_SECRET_KEY: 'sk_test_X' }); } finally { console.error = log; }
  assert.equal(urlsFirebase.length, 0, 'llamó a Firebase sin credenciales');
  assert.ok(r.status >= 500 || r.status === 403 || r.status === 400, 'respuesta ' + r.status);
});

await caso('Una cuenta de servicio mal pegada (no es JSON) falla sin tocar Firebase', async () => {
  urlsFirebase.length = 0;
  let r; const log = console.error; console.error = () => {};
  try { r = await llamar({ FIREBASE_DB_URL: DB_URL, FIREBASE_SERVICE_ACCOUNT: '{esto no es json', STRIPE_SECRET_KEY: 'sk_test_X' }); } finally { console.error = log; }
  assert.equal(urlsFirebase.length, 0);
  assert.ok(r.status >= 400, 'respuesta ' + r.status);
});

console.log('\n' + '═'.repeat(64));
const fallos = res.filter(x => !x).length;
console.log(fallos ? `❌ ${fallos} de ${res.length} fallaron` : `✅ los ${res.length} casos pasaron`);
process.exit(fallos ? 1 : 0);
