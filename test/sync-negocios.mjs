// SYNC DE NEGOCIOS ENTRE APARATOS (12/11, el caso más grave que ha contado el dueño): con un iPhone entró con su cuenta de siempre y
//  (1) un negocio borrado del selector SEGUÍA ahí, (2) al abrir su negocio ya configurado le pedía configurar la nube y el TPV virtual,
//  (3) le salía el asistente inicial. Esta prueba reproduce eso con una nube simulada (para poder forzar fallos de conexión y de orden):
//  · un negocio ya configurado en la nube NO pide ningún asistente en un aparato nuevo;
//  · si no se puede comprobar, NO pregunta nada (comprobando / reintentar);
//  · un negocio de verdad nuevo sigue su alta normal;
//  · un borrado llega a TODOS los aparatos (lápida), aunque falle la conexión al borrar, y no vuelve a aparecer;
//  · volver a canjear el código lo reactiva.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const w = ms => new Promise(r => setTimeout(r, ms));
const AUTH = 'k'.repeat(24);
const CODE_A = 'NEGOCIOA', CODE_B = 'NEGOCIOB';
/* Un aparato "nuevo": sesión de propietario, ningún negocio abierto, y la nube de la plataforma SIMULADA (en memoria, compartida entre
   aparatos a través del objeto `nube` que se le inyecta). */
async function aparato(nube, {conLicencia = null, slots = null} = {}){
  // Cada aparato en su PROPIO contexto: si no, tablet y móvil compartirían localStorage e IndexedDB, o sea, serían el mismo aparato.
  const ctx = await (browser.createBrowserContext ? browser.createBrowserContext() : browser.createIncognitoBrowserContext());
  const page = await ctx.newPage(); await page.setViewport({width:390,height:800,isMobile:true,hasTouch:true});
  page.errs = []; page.on('pageerror', e => page.errs.push(e.message));
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|raw.githubusercontent/.test(r.url()) ? r.abort() : r.continue());
  await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'}); await w(1000);
  await page.evaluate(async (AUTH, conLicencia, slots) => {
    localStorage.clear();
    localStorage.setItem('gastrogoan_owner_login', JSON.stringify({user:'jefe', authKey: AUTH, pinHash:'h'}));
    localStorage.setItem('gastrogoan_owner_pass_prompted','1');
    localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
    localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts: Date.now()}));
    if(conLicencia) localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code: conLicencia, tenantId: ggBizTenantId(conLicencia)}));
    // Como en el aparato real: la ficha del negocio abierto lleva su código (se pone al canjear / al traerlo de la cuenta).
    if(slots) localStorage.setItem(SLOTS_LS, JSON.stringify(slots.map(s => Object.assign({}, s, {ownerId: ggOwnerId('jefe')}))));
    else if(conLicencia) localStorage.setItem(SLOTS_LS, JSON.stringify([{id: 'default', name: 'Mi negocio', code: conLicencia, ownerId: ggOwnerId('jefe')}]));
  }, AUTH, conLicencia, slots);
  await page.goto('about:blank'); await page.goto('http://localhost:8950/dist/index.html#home', {waitUntil:'domcontentloaded'}); await w(900);
  // Nube de la plataforma simulada, con fallos controlables.
  await page.evaluate(nube => {
    window.__nube = nube;
    const get = ruta => ruta.split('/').filter(Boolean).reduce((o, k) => (o == null ? null : (o[k] === undefined ? null : o[k])), window.__nube.arbol);
    const set = (ruta, v) => { const ks = ruta.split('/').filter(Boolean); let o = window.__nube.arbol; ks.slice(0, -1).forEach(k => { if(o[k] == null || typeof o[k] !== 'object') o[k] = {}; o = o[k]; }); if(v === null) delete o[ks[ks.length - 1]]; else o[ks[ks.length - 1]] = JSON.parse(JSON.stringify(v)); };
    const app = {database: () => ({ref: ruta => ({
      once: () => window.__nube.lecturaCae ? Promise.reject(new Error('sin conexión')) : Promise.resolve({val: () => { const v = get(ruta); return v == null ? null : JSON.parse(JSON.stringify(v)); }}),
      set: v => window.__nube.escrituraCae ? Promise.reject(new Error('sin conexión')) : (set(ruta, v), Promise.resolve()),
      remove: () => (set(ruta, null), Promise.resolve())
    })})};
    window.getPlatformFirebaseApp = async () => window.__nube.plataformaCaida ? null : app;
    window.fetchRemoteTenantDB = async (tid) => { if(window.__nube.negocioCae) throw new Error('sin conexión'); const d = window.__nube.arbol.negocios && window.__nube.arbol.negocios[tid]; return d ? JSON.parse(JSON.stringify(d)) : null; };
  }, nube);
  await w(2600);   // que termine el arranque del propio aparato (a los 1,8 s decide los asistentes): el escenario empieza DESPUÉS
  await page.evaluate(() => {
    ['netlify-gate','license-gate','firebase-gate','extconn-gate','revoked-gate','comprobando-negocio'].forEach(id => document.getElementById(id)?.remove());
    Object.keys(negocioHidratado).forEach(k => delete negocioHidratado[k]);
    if(getLicense()){ ['netlifySetupDone','extConnPromptSeen','tourSeen','categoryIconHintSeen'].forEach(f => { delete DB.business[f]; }); delete DB.business.ownFirebase; delete DB.business.name; }
  });
  return page;
}
// La nube es UNA: lo que escribe un aparato lo ve el otro. (Cada página tiene su copia en memoria; aquí se pasa de una a otra.)
const compartir = async (origen, destino) => { const arbol = await origen.evaluate(() => __nube.arbol); await destino.evaluate(a => { __nube.arbol = a; }, arbol); };
const nubeNueva = () => ({arbol: {gastrogoan: {ownerAuth: {}, tenantLookup: {}}, negocios: {}}});
const rutaLista = `gastrogoan/ownerAuth/${AUTH}/businesses`;
const gates = p => p.evaluate(() => ['netlify-gate','license-gate','firebase-gate','extconn-gate','revoked-gate','comprobando-negocio'].filter(id => document.getElementById(id)).concat(document.querySelector('.tour-bubble, #tour-overlay') ? ['tour'] : []));
const tid = (p, code) => p.evaluate(c => ggBizTenantId(c), code);

// ───────────────────────── La nube ya tiene el negocio A configurado y el B borrado ─────────────────────────
const nube = nubeNueva();
{
  const p0 = await aparato(nube);
  const tA = await tid(p0, CODE_A), tB = await tid(p0, CODE_B);
  nube.arbol.gastrogoan.ownerAuth[AUTH] = {user: 'jefe', businesses: {[tA]: {code: CODE_A, name: 'Casa Paco'}, [tB]: {code: CODE_B, name: 'Bar Viejo', deleted: true, deletedAt: 1}}};
  nube.arbol.gastrogoan.tenantLookup[tA] = {apiKey: 'AIzaSyEJEMPLO', databaseURL: 'https://casapaco-default-rtdb.europe-west1.firebasedatabase.app'};
  nube.arbol.negocios[tA] = {business: {name: 'Casa Paco', netlifySetupDone: true, extConnPromptSeen: true, tourSeen: true, categoryIconHintSeen: true, ownFirebase: {apiKey: 'AIzaSyEJEMPLO', databaseURL: 'https://casapaco-default-rtdb.europe-west1.firebasedatabase.app'}}};
  await p0.close();
}

let iphone = await aparato(nube);
await caso('iPhone nuevo: la lista trae el negocio de siempre y NO el que se borró', async () => {
  const cambio = await iphone.evaluate(() => syncOwnerBusinessList());
  assert.equal(cambio, true);
  const nombres = await iphone.evaluate(() => getBusinessSlots().filter(s => s.code).map(s => s.code));
  assert.deepEqual(nombres, [CODE_A], 'lista: ' + JSON.stringify(nombres));
});
await iphone.close();

// Entrar en el negocio A en un aparato que nunca lo abrió: mismo estado que el iPhone al elegir el negocio (DB vacía + licencia).
iphone = await aparato(nube, {conLicencia: CODE_A});
await caso('Negocio YA configurado en la nube, aparato nuevo: NO pide nube, TPV virtual ni asistente inicial', async () => {
  const antes = await iphone.evaluate(() => ({setup: !!DB.business.netlifySetupDone, nube: !!getCloudConfig(), ext: !!DB.business.extConnPromptSeen, tour: !!DB.business.tourSeen}));
  assert.deepEqual(antes, {setup: false, nube: false, ext: false, tour: false}, 'el aparato debía estar virgen: ' + JSON.stringify(antes));
  const devuelve = await iphone.evaluate(() => continuePendingOwnerSetup());
  assert.equal(devuelve, true, 'debe quedarse «comprobando»');
  await w(900);
  const g = await gates(iphone); assert.deepEqual(g, [], 'sale algún asistente: ' + JSON.stringify(g));
  const despues = await iphone.evaluate(() => ({setup: !!DB.business.netlifySetupDone, nube: !!getCloudConfig(), ext: !!DB.business.extConnPromptSeen, tour: !!DB.business.tourSeen, url: getCloudConfig() && getCloudConfig().databaseURL, nombre: DB.business.name}));
  assert.deepEqual([despues.setup, despues.nube, despues.ext, despues.tour], [true, true, true, true]); assert.match(despues.url, /casapaco/); assert.equal(despues.nombre, 'Casa Paco');
});
await caso('Y al volver a entrar ya no vuelve a preguntar (ni comprueba)', async () => {
  assert.equal(await iphone.evaluate(() => continuePendingOwnerSetup()), false);
  assert.deepEqual(await gates(iphone), []);
});
await iphone.close();

// ───────────────────────── Sin conexión / la nube tropieza: no se pregunta NADA ─────────────────────────
iphone = await aparato(nube, {conLicencia: CODE_A});
await caso('Si no se puede comprobar (plataforma sin conexión): NO sale ningún asistente, sale «No se ha podido comprobar» con Reintentar', async () => {
  await iphone.evaluate(() => { window.firebase = window.firebase || {}; __nube.plataformaCaida = true; });   // el SDK está cargado, pero la plataforma no contesta
  await iphone.evaluate(() => continuePendingOwnerSetup()); await w(700);
  const g = await gates(iphone); assert.deepEqual(g, ['comprobando-negocio'], JSON.stringify(g));
  const txt = await iphone.evaluate(() => document.getElementById('comprobando-negocio').innerText);
  assert.match(txt, /No se ha podido comprobar/); assert.match(txt, /Reintentar/);
  assert.equal(await iphone.evaluate(() => !!DB.business.netlifySetupDone), false, 'no se debe haber tocado nada');
});
await caso('Con la nube de ESE negocio caída (la plataforma contesta) tampoco se pregunta nada', async () => {
  await iphone.evaluate(() => { __nube.plataformaCaida = false; __nube.negocioCae = true; document.getElementById('comprobando-negocio-reintentar').click(); }); await w(700);
  assert.deepEqual(await gates(iphone), ['comprobando-negocio']);
  assert.equal(await iphone.evaluate(() => !!getCloudConfig()), false, 'no se debe inventar la configuración');
});
await caso('Al volver la conexión, «Reintentar» lo resuelve sin preguntar nada', async () => {
  await iphone.evaluate(() => { __nube.negocioCae = false; document.getElementById('comprobando-negocio-reintentar').click(); }); await w(900);
  assert.deepEqual(await gates(iphone), []); assert.equal(await iphone.evaluate(() => !!DB.business.extConnPromptSeen), true);
});
await iphone.close();

// ───────────────────────── Un negocio YA configurado abre SIN internet, falte la bandera que falte ─────────────────────────
iphone = await aparato(nube, {conLicencia: CODE_A});
await caso('Aparato con el negocio ya configurado, SIN internet y sin haber hecho el tour: abre directo, no se queda «comprobando»', async () => {
  await iphone.evaluate(() => { window.firebase = window.firebase || {}; __nube.plataformaCaida = true; __nube.negocioCae = true;
    Object.assign(DB.business, {netlifySetupDone: true, extConnPromptSeen: false, tourSeen: false}); DB.business.ownFirebase = {apiKey: 'x', databaseURL: 'https://x-default-rtdb.firebaseio.com'}; });
  const necesita = await iphone.evaluate(() => negocioNecesitaHidratar());
  assert.equal(necesita, false, 'un aparato ya configurado no debe pedir comprobar nada a la nube');
  await iphone.evaluate(() => continuePendingOwnerSetup()); await w(600);
  assert.ok(!(await gates(iphone)).includes('comprobando-negocio'), 'se quedó «comprobando» sin internet');
});
await iphone.close();

// ───────────────────────── Un negocio de verdad NUEVO sigue su alta ─────────────────────────
const nubeNuevoNegocio = nubeNueva();
iphone = await aparato(nubeNuevoNegocio, {conLicencia: CODE_A});
await caso('Un negocio que la plataforma NO conoce (alta nueva) sí enseña su asistente de la nube', async () => {
  await iphone.evaluate(() => { DB.business.netlifySetupDone = true; });   // en la web real (alojada) el aviso de alojamiento se resuelve solo
  await iphone.evaluate(() => continuePendingOwnerSetup()); await w(900);
  const g = await gates(iphone); assert.ok(g.includes('firebase-gate'), 'debía salir el asistente de la nube: ' + JSON.stringify(g));
});
await iphone.close();

// ───────────────────────── Borrar un negocio llega a TODOS los aparatos ─────────────────────────
const nubeBorrado = nubeNueva();
{
  const p0 = await aparato(nubeBorrado);
  const tA = await tid(p0, CODE_A), tB = await tid(p0, CODE_B);
  nubeBorrado.arbol.gastrogoan.ownerAuth[AUTH] = {user: 'jefe', businesses: {[tA]: {code: CODE_A, name: 'Casa Paco'}, [tB]: {code: CODE_B, name: 'Bar Nuevo'}}};
  await p0.close();
}
const slotsDos = [{id: 'default', name: 'Casa Paco', code: CODE_A, ownerId: 'x'}, {id: 'bB', name: 'Bar Nuevo', code: CODE_B, ownerId: 'x'}];
const tablet = await aparato(nubeBorrado, {conLicencia: CODE_A, slots: slotsDos});
const movil = await aparato(nubeBorrado, {conLicencia: CODE_A, slots: slotsDos});
await caso('La tablet borra «Bar Nuevo» SIN conexión: se apunta, no se pierde, y la nube sigue sin saberlo', async () => {
  await tablet.evaluate(() => { __nube.escrituraCae = true; localStorage.setItem(slotLicenseKey('bB'), JSON.stringify({code: 'NEGOCIOB', tenantId: ggBizTenantId('NEGOCIOB')})); reallyRemoveBusinessSlot('bB'); }); await w(600);
  const r = await tablet.evaluate(() => ({cola: ownerListOutboxLeer(), slots: getBusinessSlots().map(s => s.code)}));
  assert.equal(r.cola.length, 1); assert.equal(r.cola[0].op, 'unlink'); assert.deepEqual(r.slots, [CODE_A]);
  const enNube = await tablet.evaluate(() => Object.values(__nube.arbol.gastrogoan.ownerAuth[Object.keys(__nube.arbol.gastrogoan.ownerAuth)[0]].businesses).map(b => !!b.deleted));
  assert.deepEqual(enNube, [false, false], 'la nube no debería saber nada todavía');
});
await caso('Vuelve la conexión: la cola se vacía sola y la nube guarda una LÁPIDA (no quita el nodo)', async () => {
  await tablet.evaluate(() => { __nube.escrituraCae = false; return vaciarOwnerListOutbox(); }); await w(500);
  const r = await tablet.evaluate(() => ({cola: ownerListOutboxLeer().length, lista: Object.values(__nube.arbol.gastrogoan.ownerAuth[Object.keys(__nube.arbol.gastrogoan.ownerAuth)[0]].businesses)}));
  assert.equal(r.cola, 0); assert.equal(r.lista.length, 2, 'el nodo se debe conservar como lápida'); assert.ok(r.lista.some(b => b.code === CODE_B && b.deleted === true));
});
await caso('El MÓVIL, que aún lo tenía, lo quita al sincronizar la lista (y avisa), sin tocar el negocio que sí sigue', async () => {
  await compartir(tablet, movil);
  const cambio = await movil.evaluate(() => syncOwnerBusinessList());
  assert.equal(cambio, true); assert.deepEqual(await movil.evaluate(() => getBusinessSlots().map(s => s.code)), [CODE_A]);
  assert.equal(await movil.evaluate(() => localStorage.getItem(slotLicenseKey('bB'))), null, 'queda la licencia del negocio borrado');
});
await caso('Ninguno de los dos aparatos lo vuelve a traer, por mucho que se sincronice', async () => {
  await compartir(tablet, movil);
  for(const a of [tablet, movil]){ await a.evaluate(() => syncOwnerBusinessList()); await a.evaluate(() => syncOwnerBusinessList()); assert.deepEqual(await a.evaluate(() => getBusinessSlots().map(s => s.code)), [CODE_A]); }
});
await caso('Volver a canjear el mismo código lo REACTIVA en la nube y en el otro aparato', async () => {
  await tablet.evaluate(() => { const lic = {code: 'NEGOCIOB', tenantId: ggBizTenantId('NEGOCIOB')}; linkBusinessToOwnerAccount(lic.tenantId, lic.code, 'Bar Nuevo'); }); await w(500);
  const enNube = await tablet.evaluate(() => Object.values(__nube.arbol.gastrogoan.ownerAuth[Object.keys(__nube.arbol.gastrogoan.ownerAuth)[0]].businesses).filter(b => b.code === 'NEGOCIOB').map(b => !!b.deleted));
  assert.deepEqual(enNube, [false]);
  await compartir(tablet, movil);
  await movil.evaluate(() => syncOwnerBusinessList()); assert.deepEqual((await movil.evaluate(() => getBusinessSlots().map(s => s.code))).sort(), [CODE_A, CODE_B].sort());
});
await caso('El negocio ABIERTO en ese momento no se quita bajo los pies del usuario aunque lo hayan borrado en otro aparato', async () => {
  await movil.evaluate(() => { const t = ggBizTenantId('NEGOCIOA'); __nube.arbol.gastrogoan.ownerAuth[Object.keys(__nube.arbol.gastrogoan.ownerAuth)[0]].businesses[t].deleted = true; });
  await movil.evaluate(() => syncOwnerBusinessList());
  assert.ok((await movil.evaluate(() => getBusinessSlots().map(s => s.code))).includes(CODE_A), 'se quitó el negocio activo');
});
await caso('Un aparato nuevo NO vuelve a ofrecer cambiar el PIN si la cuenta ya lo cambió', async () => {
  await movil.evaluate(() => { localStorage.removeItem('gastrogoan_owner_pass_prompted'); });
  await movil.evaluate(authKey => marcarPinYaCambiadoSiLaCuentaLoDice(authKey), AUTH);
  assert.equal(await movil.evaluate(() => localStorage.getItem('gastrogoan_owner_pass_prompted')), null, 'sin la marca en la cuenta se ofrece como siempre');
  await movil.evaluate(authKey => { __nube.arbol.gastrogoan.ownerAuth[authKey].pinCambiado = true; }, AUTH);
  await movil.evaluate(authKey => marcarPinYaCambiadoSiLaCuentaLoDice(authKey), AUTH);
  assert.equal(await movil.evaluate(() => localStorage.getItem('gastrogoan_owner_pass_prompted')), '1');
});
await caso('Sin errores de página', async () => { for(const p of [tablet, movil]) assert.deepEqual(p.errs, []); });
await tablet.close(); await movil.close();
await browser.close();
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ todos los casos pasaron');
process.exit(fallos ? 1 : 0);
