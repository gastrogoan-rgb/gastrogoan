// UNA VERSIÓN VIEJA DEL PROGRAMA ESCRIBIENDO SOBRE UN NEGOCIO QUE YA USA CAMPOS NUEVOS (26/11).
// Un aparato que no se actualizó (service worker que no refrescó) sigue subiendo SU copia. ¿Borra o pisa lo que la versión nueva añadió
// (H3 `pin3`/`pin3De` en empleados, claves nuevas de `business`, lápidas `borrados`)? Dos navegadores reales contra el emulador con las
// reglas reales: la TABLET con el código actual y un aparato con una COMPILACIÓN ANTIGUA (VIEJA_DIR, p. ej. el commit del 16/11).
// Uso: VIEJA_DIR=/ruta/al/arbol/compilado SOLO=version-vieja.mjs bash test/emulador/run.sh
// UN APARATO NUEVO CONTRA FIREBASE DE VERDAD (12/11, el caso más grave que ha contado el dueño).
// Con un iPhone entró con su cuenta de siempre y: (1) un negocio borrado del selector SEGUÍA ahí, (2) al abrir su negocio ya configurado le pedía
// configurar la nube y el TPV virtual, (3) le salía el asistente inicial. No era cosa del iPhone: pasaba en CUALQUIER aparato nuevo.
// Esto corre la PLATAFORMA (cuentas, lista de negocios, referencias de nube) y el negocio contra el emulador, con las reglas REALES de las dos, y
// repite el caso con DOS aparatos nuevos distintos. Se ejecuta desde run.sh (necesita los emuladores y el SDK local).
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const PDB = process.env.VN_DB || '9000', PWEB = process.env.VN_WEB || '8951', SDKD = process.env.VN_DB ? '__sdk_vn' : '__sdk', POLD = process.env.VN_OLD || '8953';
const DB_NEGOCIO = `http://127.0.0.1:${PDB}/?ns=demo-gastrogoan`;
const NS_PLAT = 'demo-plataforma', NS_NEG = 'demo-gastrogoan';
const CODE1 = 'EMUOWN01', CODE2 = 'EMUOWN02', CODE3 = 'EMUOWN03';
const USER = 'casapaco', PIN = 'clave1234';
// La app se abre desde un NOMBRE DE DOMINIO (como app.gastrogoan.com), no desde localhost: en localhost la app se cree «archivo local» y enseña el aviso de
// alojamiento, que en la web real no sale. app.test apunta a 127.0.0.1 solo dentro de este Chromium.
const BASE = `http://app.test:${PWEB}`;
const BASE_VIEJA = `http://app.test:${POLD}`;   // la versión VIEJA del programa, compilada aparte (VIEJA_DIR)
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox', '--host-resolver-rules=MAP app.test 127.0.0.1'], headless:true});
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const w = ms => new Promise(r => setTimeout(r, ms));

// ---- acceso administrador al emulador (para sembrar lo que en producción hace el generador de licencias) ----
async function rest(ns, ruta, metodo = 'GET', cuerpo){
  const r = await fetch(`http://127.0.0.1:${PDB}/${ruta}.json?ns=${ns}`, {method: metodo, headers: {Authorization: 'Bearer owner', 'Content-Type': 'application/json'}, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo)});
  return r.json();
}

async function aparato(nombre, base = BASE, ruta = '/index.html'){
  const ctx = await (browser.createBrowserContext ? browser.createBrowserContext() : browser.createIncognitoBrowserContext());   // cada aparato, su propio almacenamiento
  const page = await ctx.newPage(); await page.setViewport({width: 390, height: 844, isMobile: true, hasTouch: true});
  await page.setCacheEnabled(false);
  const errs = []; page.on('pageerror', e => errs.push(nombre + ': ' + e.message));
  await page.setRequestInterception(true);
  page.on('request', req => {
    const m = req.url().match(/gstatic\.com\/firebasejs\/[\d.]+\/(firebase-[a-z-]+\.js)/);
    if(m) return req.continue({url: `http://localhost:${PWEB}/${SDKD}/` + m[1]});
    // Solo se bloquea lo EXTERNO: la ruta del emulador de autenticación (127.0.0.1:9099/identitytoolkit.googleapis.com/…) también contiene «googleapis».
    let host = ''; try{ host = new URL(req.url()).hostname; }catch(e){}
    if(host !== '127.0.0.1' && host !== 'localhost' && /googleapis|raw.githubusercontent|qrserver/.test(req.url())) return req.abort();
    req.continue();
  });
  page.on('console', m => { if(m.type() === 'error' && !/ERR_|Failed to load resource|favicon/.test(m.text())) errs.push(nombre + ' [consola]: ' + m.text()); });
  await page.evaluateOnNewDocument(() => { try{ localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10)); }catch(e){} });   // el recordatorio diario de copia de seguridad es otra cosa
  await page.goto(base + ruta, {waitUntil: 'domcontentloaded'});
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
const VIEJA_DIR = process.env.VIEJA_DIR;
if(!VIEJA_DIR){ console.log('⏭  sin VIEJA_DIR: no hay versión antigua con la que probar'); await browser.close(); process.exit(0); }
const { spawn } = await import('node:child_process');
const srvViejo = spawn('python3', ['-m', 'http.server', POLD], {cwd: VIEJA_DIR, stdio: 'ignore'});
process.on('exit', () => { try{ srvViejo.kill(); }catch(e){} });
await w(1500);

// La versión NUEVA escribe lo que la vieja no conoce.
await caso('La tablet (versión nueva) guarda campos que la vieja no conoce: H3 del empleado, claves nuevas del negocio y una lápida', async () => {
  await tablet.page.evaluate(() => {
    const ana = DB.employees.find(e => e.id === 7001);
    ana.pin3 = 'H3:210000:salXYZ:hashXYZ'; ana.pin3De = ana.pin;
    DB.business.plan360ContratoMant = {firmado: true, ts: 1700000000000};
    DB.business.campoNuevoDeLaVersionNueva = {a: 1, b: 'x'};
    DB.borrados = Object.assign({}, DB.borrados, {'recipes:99': Date.now()});
    saveDB();
  });
  await w(3500);
  const ana = await rest(NS_NEG, `gastrogoan/tenants/${tenant}/db/employees`);
  assert.ok(JSON.stringify(ana).includes('salXYZ'), 'no llegó a la nube: ' + JSON.stringify(ana));
});

// Un aparato con la versión VIEJA entra con la cuenta y abre el negocio.
const viejo = await aparato('VIEJO', BASE_VIEJA, '/index.html');
await viejo.page.evaluate(([u, p]) => { showAccessSelectScreen(); setAccessScreenMode('owner'); document.getElementById('acc-owner-user').value = u; document.getElementById('acc-owner-pin').value = p; confirmOwnerAccess(); }, [USER, PIN]);
await w(6000);
const idSlot = await viejo.page.evaluate(c => (getBusinessSlots().find(s => s.code === c) || {}).id, CODE1);
await Promise.all([viejo.page.waitForNavigation({waitUntil: 'domcontentloaded'}), viejo.page.evaluate(i => enterBusiness(i), idSlot)]);
await viejo.page.evaluate(() => (typeof dbReadyPromise !== 'undefined') ? dbReadyPromise : null).catch(() => {});
await w(8000);

const enNube = async () => ({
  emp: JSON.stringify(await rest(NS_NEG, `gastrogoan/tenants/${tenant}/db/employees`)),
  biz: await rest(NS_NEG, `gastrogoan/tenants/${tenant}/db/business`),
  bor: await rest(NS_NEG, `gastrogoan/tenants/${tenant}/db/borrados`),
});
await caso('Precondición: el aparato viejo abrió el negocio y ve a ANA', async () => {
  const r = await viejo.page.evaluate(() => ({ana: (DB.employees || []).some(e => e.id === 7001), nombre: DB.business.name}));
  assert.deepEqual(r, {ana: true, nombre: 'Casa Paco'}, JSON.stringify(r));
});
await caso('CONECTADA: la versión vieja edita un empleado, el negocio y una receta y sube: lo nuevo sigue en la nube', async () => {
  await viejo.page.evaluate(() => {
    const ana = DB.employees.find(e => e.id === 7001); Object.assign(ana, {name: 'ANA B', phone: '600000001'});
    DB.business.name = 'Casa Paco 2';
    DB.recipes.push({id: 501, name: 'Plato del aparato viejo', price: 10, ingredients: [], area: 'cocina', isBase: false});
    saveDB();
  });
  await w(4000);
  const n = await enNube();
  assert.ok(n.emp.includes('ANA B'), 'la edición del aparato viejo no llegó: ' + n.emp);
  assert.ok(n.emp.includes('salXYZ'), 'LA VERSIÓN VIEJA BORRÓ pin3 del empleado: ' + n.emp);
  assert.deepEqual(n.biz && n.biz.plan360ContratoMant, {firmado: true, ts: 1700000000000}, 'borró plan360ContratoMant: ' + JSON.stringify(n.biz));
  assert.deepEqual(n.biz && n.biz.campoNuevoDeLaVersionNueva, {a: 1, b: 'x'}, 'borró una clave nueva del negocio');
  assert.ok(n.bor && n.bor['recipes:99'], 'borró la lápida: ' + JSON.stringify(n.bor));
});
await caso('SIN CONEXIÓN: el aparato viejo trabaja desconectado mientras la nueva añade más cosas; al volver, nada nuevo se pierde', async () => {
  await viejo.page.evaluate(() => { try{ firebase.database().goOffline(); }catch(e){} });
  await tablet.page.evaluate(() => {
    DB.business.otroCampoNuevo = {z: 9};
    DB.employees.find(e => e.id === 7001).pin3 = 'H3:210000:salNUEVA:hashNUEVO';
    saveDB();
  });
  await w(3000);
  await viejo.page.evaluate(() => { DB.business.phone = '999999999'; DB.employees.find(e => e.id === 7001).phone = '611111111'; DB.recipes.push({id: 502, name: 'Otro plato desconectado', price: 8, ingredients: [], area: 'cocina', isBase: false}); saveDB(); });
  await w(1500);
  await viejo.page.evaluate(() => { try{ firebase.database().goOnline(); }catch(e){} });
  await w(9000);
  const n = await enNube();
  assert.ok(n.emp.includes('611111111'), 'lo hecho sin conexión por el aparato viejo no llegó');
  // Los dos aparatos tocaron el MISMO empleado sin conexión (uno el teléfono, otro el pin3): como entre dos aparatos nuevos, gana un objeto entero.
  // Lo que importa aquí es que el H3 no DESAPAREZCA (un H3 anterior del mismo PIN sigue siendo válido: `pin3De === pin`).
  assert.ok(/pin3":"H3:/.test(n.emp) && /pin3De/.test(n.emp), 'el aparato viejo, al volver, BORRÓ el H3 del empleado: ' + n.emp);
  assert.deepEqual(n.biz && n.biz.otroCampoNuevo, {z: 9}, 'el aparato viejo, al volver, borró una clave nueva del negocio: ' + JSON.stringify(n.biz));
  const rec = await rest(NS_NEG, `gastrogoan/tenants/${tenant}/db/recipes`);
  assert.ok(JSON.stringify(rec).includes('Otro plato desconectado'), 'se perdió la receta hecha sin conexión');
});
await caso('Sin errores de JavaScript en la versión nueva', async () => { assert.deepEqual(tablet.errs, []); });
await browser.close();
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ una versión vieja no pisa lo que añadió la nueva');
process.exit(fallos ? 1 : 0);
