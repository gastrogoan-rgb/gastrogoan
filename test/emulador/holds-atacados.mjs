/* Auditoría de seguridad del 25/11, hallazgo 1 (ALTA): bloquear el aforo de cualquier negocio desde fuera.
 *
 * Con el publicId (va en el QR: es público a propósito) y una sesión anónima gratuita, ~13 PUT seguidos de +40 dejaban
 * `aforoHold` de un turno en 500: la agenda online del negocio, cerrada. Unas reglas de Firebase NO pueden limitar cuántas
 * escrituras seguidas hace alguien (no hay backend), y un intervalo mínimo entre escrituras dañaría a clientes reales que reservan
 * a la vez. Así que son dos capas, y esta prueba, contra el EMULADOR oficial con las reglas REALES, comprueba las dos:
 *   1. Reglas: el salto por escritura baja a lo que una reserva real puede sumar (la web limita a 50 comensales y a
 *      `reservaConfirmManualDesde - 1` si el negocio lo configura; pedidos de uno en uno).
 *   2. Auto-curación: la app del negocio detecta un candado que nadie justifica, lo borra y avisa en la campana.
 * Falla sin cualquiera de las dos (sin las reglas nuevas aceptaría +40; sin la curación el 500 se quedaría para siempre).
 * También fija el cierre de `tenantLookup` en las reglas de la plataforma (hallazgo del 25/11). Se ejecuta desde run.sh. */
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const CODE = 'EMUHLD01', NS_NEG = 'demo-gastrogoan', NS_PLAT = 'demo-plataforma';
const DB_NEGOCIO = `http://127.0.0.1:9000/?ns=${NS_NEG}`;
const BASE = 'http://app.test:8951';
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const w = ms => new Promise(r => setTimeout(r, ms));

/* Sesión anónima de verdad, como la de cualquiera que abra la web pública. */
async function anonimo(){
  const r = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({returnSecureToken: true})});
  return (await r.json()).idToken;
}
const url = (ns, ruta, tok) => `http://127.0.0.1:9000/${ruta}.json?ns=${ns}&auth=${encodeURIComponent(tok)}`;
const put = (ns, ruta, tok, valor) => fetch(url(ns, ruta, tok), {method: 'PUT', body: JSON.stringify(valor)}).then(r => r.status);
const leer = (ns, ruta) => fetch(`http://127.0.0.1:9000/${ruta}.json?ns=${ns}`, {headers: {Authorization: 'Bearer owner'}}).then(r => r.json());
const admin = (ns, ruta, valor) => fetch(`http://127.0.0.1:9000/${ruta}.json?ns=${ns}`, {method: valor === null ? 'DELETE' : 'PUT', headers: {Authorization: 'Bearer owner'}, body: JSON.stringify(valor)});
const man = new Date(Date.now() + 86400000), FECHA = `${man.getFullYear()}-${String(man.getMonth() + 1).padStart(2, '0')}-${String(man.getDate()).padStart(2, '0')}`;
const PID = 'pubhold01';
const AFORO = `gastrogoan/public/${PID}/aforoHold/${FECHA}/0`, PEDIDOS = `gastrogoan/public/${PID}/pedidosHold/${FECHA}/20:00`;
const MANUAL = `gastrogoan/public/${PID}/info/business/reservaConfirmManualDesde`;

/* ══ 1. REGLAS: el salto por escritura (las dos nubes: la de cada negocio y la compartida) ══ */
for(const [quien, ns] of [['nube del negocio', NS_NEG], ['plataforma', NS_PLAT]]){
  const tok = await anonimo();
  await caso(`${quien}: sin configuración, una reserva real (50 comensales, el tope de la web) cabe y 51 no`, async () => {
    await admin(ns, `gastrogoan/public/${PID}`, null);
    assert.equal(await put(ns, AFORO, tok, 51), 401, '51 de golpe tendría que rechazarse');
    assert.equal(await put(ns, AFORO, tok, 50), 200, 'una reserva de 50 (lo máximo que deja la web) no puede rechazarse');
  });
  await caso(`${quien}: con «grupos desde 8 por teléfono» el salto máximo es 7 (el grupo más grande que la web deja reservar)`, async () => {
    await admin(ns, `gastrogoan/public/${PID}`, null);
    await admin(ns, MANUAL, 8);
    assert.equal(await put(ns, AFORO, tok, 8), 401, '+8 no puede salir de ninguna reserva online');
    assert.equal(await put(ns, AFORO, tok, 7), 200);
    assert.equal(await put(ns, AFORO, tok, 15), 401, 'subir 8 sobre lo que había');
    assert.equal(await put(ns, AFORO, tok, 14), 200);
    assert.equal(await put(ns, AFORO, tok, 3), 200, 'bajar (soltar una reserva) siempre se puede');
  });
  await caso(`${quien}: pedidosHold sube de uno en uno (la web suma 1 por pedido)`, async () => {
    await admin(ns, `gastrogoan/public/${PID}`, null);
    assert.equal(await put(ns, PEDIDOS, tok, 2), 401, 'un pedido no suma 2: así se cerraba la franja de golpe');
    assert.equal(await put(ns, PEDIDOS, tok, 1), 200);
    assert.equal(await put(ns, PEDIDOS, tok, 3), 401);
    assert.equal(await put(ns, PEDIDOS, tok, 2), 200);
  });
}
await caso('Límite honesto: las reglas SOLAS no impiden una ráfaga (10 escrituras llenan 500); por eso existe la curación', async () => {
  // Honestidad sobre el límite: con salto 50 y sin configuración, 10 escrituras seguidas llenan 500. Lo que protege es la curación de abajo.
  const tok = await anonimo(); await admin(NS_NEG, `gastrogoan/public/${PID}`, null);
  let v = 0; for(let i = 0; i < 10; i++){ v += 50; await put(NS_NEG, AFORO, tok, v); }
  assert.equal(await leer(NS_NEG, AFORO), 500, 'el emulador debería haber dejado llegar a 500 (si no, las reglas ya lo impiden y esta nota sobra)');
  await admin(NS_NEG, `gastrogoan/public/${PID}`, null);
});

/* ══ 2. tenantLookup (plataforma): no se puede desviar el negocio de otro ══ */
await caso('tenantLookup: crear sí; reescribir a otra nube no; el mismo databaseURL (otra apiKey) sí; borrar no; el admin sí', async () => {
  const a = await anonimo(), b = await anonimo(), T = 'TENANT-HOLD-PRUEBA';
  const ref = `gastrogoan/tenantLookup/${T}`;
  await admin(NS_PLAT, ref, null);
  assert.equal(await put(NS_PLAT, ref, a, {apiKey: 'k1', databaseURL: 'https://dueno.firebaseio.com'}), 200, 'el alta del negocio (primera escritura) tiene que poder');
  assert.equal(await put(NS_PLAT, ref, b, {apiKey: 'k1', databaseURL: 'https://atacante.firebaseio.com'}), 401, 'otra sesión desviando el negocio a una nube ajena');
  assert.equal(await put(NS_PLAT, ref, a, {apiKey: 'k2', databaseURL: 'https://dueno.firebaseio.com'}), 200, 'rotar la apiKey en el mismo proyecto es legítimo');
  const del = await fetch(url(NS_PLAT, ref, b), {method: 'DELETE'});
  assert.equal(del.status, 401, 'borrar la referencia ajena');
  assert.equal((await leer(NS_PLAT, ref)).databaseURL, 'https://dueno.firebaseio.com');
  await admin(NS_PLAT, ref, null);
});

/* ══ 3. AUTO-CURACIÓN en la app del negocio ══ */
const browser = await puppeteer.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--host-resolver-rules=MAP app.test 127.0.0.1'], headless: true});
const ctx = await (browser.createBrowserContext ? browser.createBrowserContext() : browser.createIncognitoBrowserContext());
const app = await ctx.newPage(); await app.setViewport({width: 1000, height: 900}); await app.setCacheEnabled(false);
app.errs = []; app.on('pageerror', e => app.errs.push(e.message));
await app.setRequestInterception(true);
app.on('request', req => {
  const m = req.url().match(/gstatic\.com\/firebasejs\/[\d.]+\/(firebase-[a-z-]+\.js)/);
  if(m) return req.continue({url: 'http://localhost:8951/__sdk/' + m[1]});
  let host = ''; try{ host = new URL(req.url()).hostname; }catch(e){}
  if(host !== '127.0.0.1' && host !== 'localhost' && host !== 'app.test' && /googleapis|raw.githubusercontent|qrserver/.test(req.url())) return req.abort();
  req.continue();
});
await app.evaluateOnNewDocument(() => { try{ localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0, 10)); }catch(e){} });
await admin(NS_NEG, 'gastrogoan', null);
await app.goto(BASE + '/index.html', {waitUntil: 'domcontentloaded'});
await app.evaluate(() => (typeof dbReadyPromise !== 'undefined') ? dbReadyPromise : null).catch(() => {});
await app.evaluate(async ([code, dburl]) => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
  localStorage.setItem('gastrogoan_owner_login', JSON.stringify({user: 'jefe', authKey: 'k'.repeat(20), pinHash: 'h'}));
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type: 'owner', ts: Date.now()}));
  Object.assign(DB.business, {name: 'Casa Paco', netlifySetupDone: true, extConnPromptSeen: true, tourSeen: true, categoryIconHintSeen: true, aforo: 60});
  DB.business.ownFirebase = {apiKey: 'fake-api-key', databaseURL: dburl};
  DB.tables = [{id: 1, name: 'Mesa 1', zona: 'Salón', plazas: 4}];
  await saveDB();
}, [CODE, DB_NEGOCIO]);
await app.reload({waitUntil: 'domcontentloaded'}); await w(9000);
const publicId = await app.evaluate(() => getPublicId());
const A = `gastrogoan/public/${publicId}/aforoHold/${FECHA}/0`, P = `gastrogoan/public/${publicId}/pedidosHold/${FECHA}/20:00`;
const M = `gastrogoan/public/${publicId}/mesaHold/${FECHA}/1`;
const atacante = await anonimo();

await caso('El espejo público arranca el repaso de candados (sin esto la curación no correría nunca)', async () => {
  assert.equal(await app.evaluate(() => !!holdsCtx && holdsCtx.publicId === getPublicId()), true, 'syncPublicMirror no llama a programarReparacionHolds');
});
await caso('Un atacante lleva aforo, pedidos y mesa a tope; un candado RECIÉN puesto NO se toca (puede ser una reserva real)', async () => {
  await app.evaluate(() => { HOLDS_GRACIA_MS = 3000; holdsPrevios = {}; });
  await admin(NS_NEG, `gastrogoan/public/${publicId}/info/business/reservaConfirmManualDesde`, null);
  let v = 0; for(let i = 0; i < 10; i++){ v += 50; await put(NS_NEG, A, atacante, v); }
  for(let i = 1; i <= 5; i++) await put(NS_NEG, P, atacante, i);
  const slots = {}; ['20:00', '20:15', '20:30', '20:45', '21:00', '21:15', '21:30', '21:45', '22:00'].forEach(s => slots[s] = true);
  await admin(NS_NEG, M, slots);
  assert.equal(await leer(NS_NEG, A), 500, 'el ataque no se montó');
  await app.evaluate(() => repararHoldsAtacados(holdsCtx.app, holdsCtx.publicId, true)); await w(800);
  assert.equal(await leer(NS_NEG, A), 500, 'la app borró un candado que podía ser legítimo (sin esperar)');
});
await caso('Pasada la gracia, la app lo repone: aforo, pedidos y mesa vuelven a 0', async () => {
  await w(3200);
  await app.evaluate(() => repararHoldsAtacados(holdsCtx.app, holdsCtx.publicId, true)); await w(1500);
  assert.equal(await leer(NS_NEG, A), null, 'aforoHold sigue bloqueado en 500');
  assert.equal(await leer(NS_NEG, P), null, 'pedidosHold sigue bloqueado');
  assert.equal(await leer(NS_NEG, M), null, 'mesaHold sigue bloqueado');
});
await caso('Y el dueño lo ve en la campana: «alguien intentó bloquear tu aforo del <día>; ya se corrigió»', async () => {
  const filas = await app.evaluate(() => avisosLista().map(f => f.html));
  const fila = filas.find(h => /intent|tried|intentar/i.test(h));
  assert.ok(fila, 'no hay aviso en la campana: ' + JSON.stringify(filas));
  assert.match(fila, /ya se corrigi|fixed|corregit/i);
});
await caso('Un candado legítimo que SE VA SOLO (la app lo suelta al sincronizar) no genera ningún aviso ni se toca', async () => {
  await app.evaluate(() => { localStorage.removeItem(HOLDS_ATAQUES_LS + ':' + getPublicId()); holdsPrevios = {}; });
  const antes = await app.evaluate(() => avisoAforoAtacado().length);
  assert.equal(antes, 0);
  await put(NS_NEG, A, atacante, 4);
  await app.evaluate(() => repararHoldsAtacados(holdsCtx.app, holdsCtx.publicId, true)); await w(600);
  await admin(NS_NEG, A, null);                       // limpiarHolds de la app lo suelta
  await w(3300);
  await put(NS_NEG, A, atacante, 3);                  // otra reserva distinta, más baja
  await app.evaluate(() => repararHoldsAtacados(holdsCtx.app, holdsCtx.publicId, true)); await w(800);
  assert.equal(await leer(NS_NEG, A), 3, 'se borró un candado nuevo y legítimo');
  assert.equal(await app.evaluate(() => avisoAforoAtacado().length), 0, 'avisó de un ataque que no lo era');
});
await caso('Sin errores de JavaScript', async () => { assert.deepEqual(app.errs.filter(e => !/network|offline/i.test(e)), []); });
await browser.close();
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ el aforo ya no se puede bloquear a escondidas: reglas + curación + aviso');
process.exit(fallos ? 1 : 0);
