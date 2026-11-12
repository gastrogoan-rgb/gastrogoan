// UN APARATO NUEVO CONTRA FIREBASE DE VERDAD (12/11, el caso más grave que ha contado el dueño).
// Con un iPhone entró con su cuenta de siempre y: (1) un negocio borrado del selector SEGUÍA ahí, (2) al abrir su negocio ya configurado le pedía
// configurar la nube y el TPV virtual, (3) le salía el asistente inicial. No era cosa del iPhone: pasaba en CUALQUIER aparato nuevo.
// Esto corre la PLATAFORMA (cuentas, lista de negocios, referencias de nube) y el negocio contra el emulador, con las reglas REALES de las dos, y
// repite el caso con DOS aparatos nuevos distintos. Se ejecuta desde run.sh (necesita los emuladores y el SDK local).
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const DB_NEGOCIO = 'http://127.0.0.1:9000/?ns=demo-gastrogoan';
const NS_PLAT = 'demo-plataforma', NS_NEG = 'demo-gastrogoan';
const CODE1 = 'EMUOWN01', CODE2 = 'EMUOWN02', CODE3 = 'EMUOWN03';
const USER = 'casapaco', PIN = 'clave1234';
// La app se abre desde un NOMBRE DE DOMINIO (como app.gastrogoan.com), no desde localhost: en localhost la app se cree «archivo local» y enseña el aviso de
// alojamiento, que en la web real no sale. app.test apunta a 127.0.0.1 solo dentro de este Chromium.
const BASE = 'http://app.test:8951';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox', '--host-resolver-rules=MAP app.test 127.0.0.1'], headless:true});
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const w = ms => new Promise(r => setTimeout(r, ms));

// ---- acceso administrador al emulador (para sembrar lo que en producción hace el generador de licencias) ----
async function rest(ns, ruta, metodo = 'GET', cuerpo){
  const r = await fetch(`http://127.0.0.1:9000/${ruta}.json?ns=${ns}`, {method: metodo, headers: {Authorization: 'Bearer owner', 'Content-Type': 'application/json'}, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo)});
  return r.json();
}

async function aparato(nombre){
  const ctx = await (browser.createBrowserContext ? browser.createBrowserContext() : browser.createIncognitoBrowserContext());   // cada aparato, su propio almacenamiento
  const page = await ctx.newPage(); await page.setViewport({width: 390, height: 844, isMobile: true, hasTouch: true});
  await page.setCacheEnabled(false);
  const errs = []; page.on('pageerror', e => errs.push(nombre + ': ' + e.message));
  await page.setRequestInterception(true);
  page.on('request', req => {
    const m = req.url().match(/gstatic\.com\/firebasejs\/[\d.]+\/(firebase-[a-z-]+\.js)/);
    if(m) return req.continue({url: 'http://localhost:8951/__sdk/' + m[1]});
    // Solo se bloquea lo EXTERNO: la ruta del emulador de autenticación (127.0.0.1:9099/identitytoolkit.googleapis.com/…) también contiene «googleapis».
    let host = ''; try{ host = new URL(req.url()).hostname; }catch(e){}
    if(host !== '127.0.0.1' && host !== 'localhost' && /googleapis|raw.githubusercontent|qrserver/.test(req.url())) return req.abort();
    req.continue();
  });
  page.on('console', m => { if(m.type() === 'error' && !/ERR_|Failed to load resource|favicon/.test(m.text())) errs.push(nombre + ' [consola]: ' + m.text()); });
  await page.evaluateOnNewDocument(() => { try{ localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10)); }catch(e){} });   // el recordatorio diario de copia de seguridad es otra cosa
  await page.goto(BASE + '/index.html', {waitUntil: 'domcontentloaded'});
  await page.evaluate(() => (typeof dbReadyPromise !== 'undefined') ? dbReadyPromise : null).catch(() => {});
  return {page, errs, nombre, ctx};
}
const asistentes = d => d.page.evaluate(() => ['netlify-gate','license-gate','firebase-gate','extconn-gate','revoked-gate','comprobando-negocio'].filter(id => document.getElementById(id))
  .concat(document.querySelector('.tour-bubble, #tour-overlay') ? ['tour'] : [])
  .concat(document.getElementById('modal-overlay') && document.getElementById('modal-overlay').classList.contains('active') ? ['modal:' + (document.getElementById('modal-box').innerText || '').slice(0, 50).replace(/\s+/g, ' ')] : []));

// ───────────── Siembra: lo que en producción hace el generador de licencias ─────────────
const tmp = await aparato('semilla');
const authKey = await tmp.page.evaluate(([u, p]) => ggOwnerAuthKey(u, p), [USER, PIN]);
const tenant = await tmp.page.evaluate(c => ggBizTenantId(c), CODE1);
const tenant2 = await tmp.page.evaluate(c => ggBizTenantId(c), CODE2);
const tenant3 = await tmp.page.evaluate(c => ggBizTenantId(c), CODE3);
await tmp.ctx.close();
await rest(NS_PLAT, `gastrogoan/ownerNames/${USER}`, 'PUT', {ts: 1});
// Una cuenta ESTABLECIDA (el dueño ya cambió el PIN de la compra): un aparato nuevo no se lo vuelve a ofrecer. changeOwnerAccessPin pone esta marca.
await rest(NS_PLAT, `gastrogoan/ownerAuth/${authKey}`, 'PUT', {user: USER, createdAt: 1, pinCambiado: true});
for(const c of [CODE1, CODE2, CODE3]) await rest(NS_PLAT, `gastrogoan/issuedCodes/${c}`, 'PUT', {issuedAt: 1});

// ───────────── La TABLET configura su negocio, y crea y borra otro ─────────────
const tablet = await aparato('TABLET');
await caso('La tablet canjea su código, configura el negocio (nube, asistentes, datos) y todo queda en Firebase', async () => {
  const r = await tablet.page.evaluate(async ([u, p, ak, c, dburl]) => {
    setOwnerLogin(u, ak, p);
    localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
    localStorage.setItem('gastrogoan_access_session', JSON.stringify({type: 'owner', ts: Date.now()}));
    const canje = await redeemBusinessCode(c);
    if(!canje.lic) return {error: canje.reason};
    localStorage.setItem('gastrogoan_license_v1', JSON.stringify(canje.lic));
    const slots = getBusinessSlots(); slots[0].code = canje.lic.code; slots[0].name = 'Casa Paco'; slots[0].ownerId = currentOwnerId(); saveBusinessSlots(slots);
    linkBusinessToOwnerAccount(canje.lic.tenantId, canje.lic.code, 'Casa Paco');
    Object.assign(DB.business, {name: 'Casa Paco', netlifySetupDone: true, extConnPromptSeen: true, tourSeen: true, categoryIconHintSeen: true});
    DB.business.ownFirebase = {apiKey: 'fake-api-key', databaseURL: dburl};
    DB.employees.push({id: 7001, name: 'ANA', rol: 'Camarera', area: 'sala', active: true, color: '#DF7039', pin: '1234'});
    DB.sales.push({id: 's1', date: '2026-11-10', total: 25, subtotal: 22.73, items: [{name: 'Menú', price: 25, qty: 1, ivaPct: 10}], pagos: [{metodoPago: 'Efectivo', amount: 25}]});
    await saveDB();
    return {ok: true};
  }, [USER, PIN, authKey, CODE1, DB_NEGOCIO]);
  assert.equal(r.ok, true, 'canje: ' + JSON.stringify(r));
  await tablet.page.reload({waitUntil: 'domcontentloaded'}); await w(7000);
  const nombreEnNube = await rest(NS_NEG, `gastrogoan/tenants/${tenant}/db/business/name`);
  assert.equal(nombreEnNube, 'Casa Paco', 'el negocio no llegó a Firebase: ' + JSON.stringify(nombreEnNube));
  const lookup = await rest(NS_PLAT, `gastrogoan/tenantLookup/${tenant}`);
  assert.equal(lookup && lookup.databaseURL, DB_NEGOCIO, 'la referencia de nube no se publicó (reglas de la plataforma): ' + JSON.stringify(lookup));
  const lista = await rest(NS_PLAT, `gastrogoan/ownerAuth/${authKey}/businesses/${tenant}`);
  assert.equal(lista && lista.code, CODE1, 'el negocio no quedó en la lista de la cuenta: ' + JSON.stringify(lista));
});
await caso('La tablet añade un segundo negocio y lo borra: en Firebase queda una LÁPIDA aceptada por las reglas', async () => {
  await tablet.page.evaluate(([t2, c2]) => { linkBusinessToOwnerAccount(t2, c2, 'Bar Viejo'); }, [tenant2, CODE2]); await w(2500);
  let n2 = await rest(NS_PLAT, `gastrogoan/ownerAuth/${authKey}/businesses/${tenant2}`);
  assert.equal(n2 && n2.code, CODE2, 'no se dio de alta en la lista: ' + JSON.stringify(n2));
  await tablet.page.evaluate(([t2, c2]) => { unlinkBusinessFromOwnerAccount(t2, c2, 'Bar Viejo'); }, [tenant2, CODE2]); await w(2500);
  n2 = await rest(NS_PLAT, `gastrogoan/ownerAuth/${authKey}/businesses/${tenant2}`);
  assert.ok(n2 && n2.deleted === true, 'la baja no llegó (¿las reglas la rechazan?): ' + JSON.stringify(n2));
  assert.equal(await tablet.page.evaluate(() => ownerListOutboxLeer().length), 0, 'la cola de reintentos no se vació');
});

// ───────────── Dos aparatos NUEVOS distintos entran con la cuenta ─────────────
async function entraUnAparatoNuevo(nombre){
  const d = await aparato(nombre);
  await d.page.evaluate(([u, p]) => { showAccessSelectScreen(); setAccessScreenMode('owner'); document.getElementById('acc-owner-user').value = u; document.getElementById('acc-owner-pin').value = p; confirmOwnerAccess(); }, [USER, PIN]);
  await w(6000);
  return d;
}
for(const nombre of ['MÓVIL NUEVO', 'OTRO APARATO NUEVO']){
  const d = await entraUnAparatoNuevo(nombre);
  await caso(`${nombre}: entra con la cuenta y el selector muestra SOLO el negocio vivo (no el borrado)`, async () => {
    const lista = await d.page.evaluate(() => getBusinessSlots().filter(s => s.code).map(s => s.code));
    if(JSON.stringify(lista) !== JSON.stringify([CODE1])){
      const diag = await d.page.evaluate(async () => ({login: !!getOwnerLogin(), sesion: (getAccessSession() || {}).type, error: (document.getElementById('acc-owner-error') || {}).textContent, pantalla: [...document.querySelectorAll('#access-select-screen, #business-select-screen')].map(e => e.id + ':' + (e.classList.contains('hide') ? 'oculta' : 'visible')).join(' '), slots: getBusinessSlots(), cola: ownerListOutboxLeer(), sync: await syncOwnerBusinessList().catch(e => 'ERR ' + e)}));
      assert.fail('lista del selector: ' + JSON.stringify(lista) + ' · diagnóstico: ' + JSON.stringify(diag));
    }
    assert.equal(await d.page.evaluate(() => !!document.querySelector('#business-select-screen:not(.hide)')), true, 'no está el selector a la vista');
  });
  await caso(`${nombre}: abre su negocio y NO pide nube, TPV virtual ni asistente inicial; ya tiene sus datos`, async () => {
    const id = await d.page.evaluate(c => getBusinessSlots().find(s => s.code === c).id, CODE1);
    await Promise.all([d.page.waitForNavigation({waitUntil: 'domcontentloaded'}), d.page.evaluate(i => enterBusiness(i), id)]);
    await d.page.evaluate(() => (typeof dbReadyPromise !== 'undefined') ? dbReadyPromise : null).catch(() => {});
    await w(8000);
    const g = await asistentes(d); assert.deepEqual(g, [], 'salen asistentes o ventanas: ' + JSON.stringify(g));
    const e = await d.page.evaluate(() => ({nombre: DB.business.name, setup: !!DB.business.netlifySetupDone, ext: !!DB.business.extConnPromptSeen, tour: !!DB.business.tourSeen, nube: !!getCloudConfig(), ana: (DB.employees || []).some(x => x.name === 'ANA'), ventas: (DB.sales || []).length, badge: (document.getElementById('sync-badge') || {}).textContent}));
    assert.equal(e.nombre, 'Casa Paco'); assert.deepEqual([e.setup, e.ext, e.tour, e.nube], [true, true, true, true], JSON.stringify(e));
    assert.equal(e.ana, true, 'no bajaron los empleados: ' + JSON.stringify(e)); assert.equal(e.ventas, 1, 'no bajaron las ventas: ' + JSON.stringify(e));
  });
  d.aparato = true;
  if(nombre === 'MÓVIL NUEVO') globalThis.movil = d; else globalThis.otro = d;
}

// ───────────── Lo que hace un aparato lo ven los demás, y la lista se mantiene igual en todos ─────────────
await caso('Lo que cambia el móvil nuevo llega a la tablet (misma información en todos)', async () => {
  await globalThis.movil.page.evaluate(() => { DB.employees.push({id: 7002, name: 'BETA', rol: 'Cocinero', area: 'cocina', active: true, color: '#4A5D4E', pin: '1234'}); saveDB(); });
  let visto = false;
  for(let i = 0; i < 20 && !visto; i++){ await w(1000); visto = await tablet.page.evaluate(() => (DB.employees || []).some(x => x.name === 'BETA')); }
  assert.equal(visto, true, 'la tablet no recibió el empleado nuevo');
  const otroLo = await globalThis.otro.page.evaluate(() => (DB.employees || []).some(x => x.name === 'BETA'));
  assert.equal(otroLo, true, 'el otro aparato no recibió el empleado nuevo');
});
await caso('Un negocio que la tablet da de alta aparece en los otros aparatos, y desaparece cuando lo borra', async () => {
  await tablet.page.evaluate(([t3, c3]) => { linkBusinessToOwnerAccount(t3, c3, 'Bar Nuevo'); }, [tenant3, CODE3]); await w(2500);
  await globalThis.movil.page.evaluate(() => syncOwnerBusinessList());
  assert.ok((await globalThis.movil.page.evaluate(() => getBusinessSlots().map(s => s.code))).includes(CODE3), 'no apareció el negocio nuevo');
  await tablet.page.evaluate(([t3, c3]) => { unlinkBusinessFromOwnerAccount(t3, c3, 'Bar Nuevo'); }, [tenant3, CODE3]); await w(2500);
  for(const d of [globalThis.movil, globalThis.otro]){
    await d.page.evaluate(() => syncOwnerBusinessList());
    const l = await d.page.evaluate(() => getBusinessSlots().map(s => s.code).filter(Boolean));
    assert.ok(!l.includes(CODE3) && !l.includes(CODE2), d.nombre + ' sigue viendo un negocio borrado: ' + JSON.stringify(l));
  }
});
await caso('Sin errores de JavaScript en ningún aparato', async () => {
  const todos = [tablet, globalThis.movil, globalThis.otro].flatMap(d => d.errs);
  assert.deepEqual(todos, []);
});
await browser.close();
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ un aparato nuevo ve lo mismo que los demás');
process.exit(fallos ? 1 : 0);
