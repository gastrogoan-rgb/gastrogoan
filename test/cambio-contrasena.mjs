// CAMBIO DE CONTRASEÑA (25/11, el dueño: «al cambiar la contraseña sigue usando la antigua; mira modo dueño y modo trabajador»).
// El PIN de la cuenta se guarda hasheado EN CADA APARATO para poder entrar sin internet. Al cambiarlo en uno, la nube muda la cuenta a la ruta nueva y
// borra la vieja, pero los DEMÁS aparatos conservaban su copia y daban por buena la contraseña antigua para siempre. Aquí:
//  · el aparato que cambia la contraseña: la antigua deja de valer y la nueva vale;
//  · otro aparato que aún tenía la antigua: con internet se rechaza y se pide la nueva; sin internet NO se bloquea a nadie;
//  · abrir la app con la sesión iniciada y la contraseña ya cambiada en otro sitio: se vuelve a la pantalla de acceso;
//  · empleado: si su PIN cambió en otro aparato, manda la nube (la copia local puede estar anticuada); sin internet, la copia local.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const w = ms => new Promise(r => setTimeout(r, ms));
const USER = 'casapaco', VIEJO = 'ABC234', NUEVO = 'XYZ789';

async function aparato(arbol){
  const ctx = await (browser.createBrowserContext ? browser.createBrowserContext() : browser.createIncognitoBrowserContext());
  const page = await ctx.newPage(); await page.setViewport({width:390, height:800});
  page.errs = []; page.on('pageerror', e => page.errs.push(e.message));
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|raw.githubusercontent/.test(r.url()) ? r.abort() : r.continue());
  await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'}); await w(900);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10)); });
  await page.goto('about:blank'); await page.goto('http://localhost:8950/dist/index.html#home', {waitUntil:'domcontentloaded'}); await w(900);
  await page.evaluate(arbol => {
    // Nube de la plataforma SIMULADA en memoria.
    window.__nube = {arbol, caida: false};
    const get = ruta => ruta.split('/').filter(Boolean).reduce((o, k) => (o == null ? null : (o[k] === undefined ? null : o[k])), window.__nube.arbol);
    const set = (ruta, v) => { const ks = ruta.split('/').filter(Boolean); let o = window.__nube.arbol; ks.slice(0, -1).forEach(k => { if(o[k] == null || typeof o[k] !== 'object') o[k] = {}; o = o[k]; }); if(v === null) delete o[ks[ks.length - 1]]; else o[ks[ks.length - 1]] = v; };
    const app = {database: () => ({ref: ruta => ({
      once: () => Promise.resolve({val: () => { const v = get(ruta); return v == null ? null : JSON.parse(JSON.stringify(v)); }, exists: () => get(ruta) != null}),
      set: v => (set(ruta, JSON.parse(JSON.stringify(v))), Promise.resolve()),
      remove: () => (set(ruta, null), Promise.resolve())
    })})};
    window.getPlatformFirebaseApp = async () => window.__nube.caida ? null : app;
    // Lo que NO es el objeto de la prueba, fuera de en medio.
    window.initCloud = () => {}; window.initPublicRequestsListener = () => {}; window.checkLicenseRevocation = () => {};
    window.marcarPinYaCambiadoSiLaCuentaLoDice = async () => {};
    window.__entro = false; window.enterAsOwner = () => { window.__entro = true; };
    // El formulario de acceso, con los ids que lee confirmOwnerAccess.
    document.body.insertAdjacentHTML('beforeend', '<div id="t-form"><input id="acc-owner-user"><input id="acc-owner-pin"><div id="acc-owner-error" style="display:none"></div><button id="acc-owner-btn"></button></div>');
  }, arbol);
  return page;
}
const claves = page => page.evaluate((u, v, n) => ({viejo: ggOwnerAuthKey(u, v), nuevo: ggOwnerAuthKey(u, n)}), USER, VIEJO, NUEVO);
const guardarLogin = (page, pin, clave) => page.evaluate((u, pin, clave) => { setOwnerLogin(u, clave, pin); localStorage.setItem('gastrogoan_owner_pass_prompted', '1'); }, USER, pin, clave);
const intentar = (page, pin) => page.evaluate(async (u, pin) => {
  window.__entro = false;
  document.getElementById('acc-owner-user').value = u; document.getElementById('acc-owner-pin').value = pin;
  document.getElementById('acc-owner-error').style.display = 'none';
  await confirmOwnerAccess();
  const err = document.getElementById('acc-owner-error');
  return {entro: window.__entro, error: err.style.display !== 'none' ? err.textContent : ''};
}, USER, pin);

// ── Estado inicial: la cuenta existe en la ruta del PIN viejo.
const arbolBase = k => ({gastrogoan: {ownerAuth: {[k]: {user: USER, createdAt: 1, businesses: {}}}}});
const A = await aparato({});
const K = await claves(A);
await A.evaluate((arbol) => { __nube.arbol = arbol; }, arbolBase(K.viejo));
await guardarLogin(A, VIEJO, K.viejo);

await caso('Dueño · el aparato que cambia la contraseña: la nube muda la cuenta (la nueva existe, la vieja ya no)', async () => {
  const r = await A.evaluate(async n => await changeOwnerAccessPin(n), NUEVO);
  assert.equal(r.ok, true, JSON.stringify(r));
  const ar = await A.evaluate(() => __nube.arbol.gastrogoan.ownerAuth);
  assert.ok(ar[K.nuevo], 'la ruta nueva debe existir'); assert.ok(!ar[K.viejo], 'la ruta vieja debe haberse borrado');
});
await caso('Dueño · en ese mismo aparato la contraseña ANTIGUA ya no entra y la NUEVA sí', async () => {
  const vieja = await intentar(A, VIEJO);
  assert.equal(vieja.entro, false, 'la antigua no debe entrar: ' + JSON.stringify(vieja));
  assert.ok(vieja.error, 'y debe avisar');
  const nueva = await intentar(A, NUEVO);
  assert.equal(nueva.entro, true, 'la nueva debe entrar: ' + JSON.stringify(nueva));
});

// ── Otro aparato que se quedó con la contraseña antigua guardada.
const arbolTrasCambio = await A.evaluate(() => JSON.parse(JSON.stringify(__nube.arbol)));
const B = await aparato(arbolTrasCambio);
await guardarLogin(B, VIEJO, K.viejo);
await caso('Dueño · OTRO aparato con la copia antigua y con internet: la antigua se RECHAZA y avisa de que cambió', async () => {
  const r = await intentar(B, VIEJO);
  assert.equal(r.entro, false, 'no debe entrar con la antigua: ' + JSON.stringify(r));
  assert.match(r.error, /otro aparato|altre aparell|another device/i, r.error);
});
await caso('Dueño · y en ese otro aparato la contraseña NUEVA entra', async () => {
  const r = await intentar(B, NUEVO);
  assert.equal(r.entro, true, JSON.stringify(r));
  const login = await B.evaluate(() => getOwnerLogin());
  assert.equal(login.authKey, K.nuevo, 'el aparato guarda ya la ruta nueva');
});
const C = await aparato(arbolTrasCambio);
await guardarLogin(C, VIEJO, K.viejo);
await caso('Dueño · SIN internet nadie se queda fuera: con la copia guardada entra (un restaurante sin wifi tiene que poder abrir)', async () => {
  await C.evaluate(() => { __nube.caida = true; });
  const r = await intentar(C, VIEJO);
  assert.equal(r.entro, true, JSON.stringify(r));
});
const D = await aparato(arbolTrasCambio);
await guardarLogin(D, VIEJO, K.viejo);
await caso('Dueño · abrir la app con la sesión iniciada tras cambiarse la contraseña en otro aparato: vuelve a la pantalla de acceso', async () => {
  await D.evaluate(() => { localStorage.setItem('gastrogoan_access_session', JSON.stringify({type: 'owner', ts: Date.now()})); });
  await D.evaluate(async () => { await comprobarVigenciaDelAcceso(); });
  await w(600);
  const r = await D.evaluate(() => ({sesion: getAccessSession(), login: getOwnerLogin()}));
  assert.equal(r.sesion, null, 'la sesión debe cerrarse'); assert.equal(r.login, null, 'y la copia antigua del PIN, borrarse');
});
await caso('Dueño · con la sesión iniciada y la contraseña VIGENTE no pasa nada', async () => {
  const E = await aparato(arbolTrasCambio);
  await guardarLogin(E, NUEVO, K.nuevo);
  await E.evaluate(() => { localStorage.setItem('gastrogoan_access_session', JSON.stringify({type: 'owner', ts: Date.now()})); });
  await E.evaluate(async () => { await comprobarVigenciaDelAcceso(); });
  await w(300);
  assert.ok(await E.evaluate(() => getAccessSession()), 'la sesión sigue');
});
await caso('Dueño · si la ruta antigua no se pudo borrar, se apunta y se borra después (el PIN viejo no puede quedar valiendo)', async () => {
  const F = await aparato(arbolBase(K.viejo));
  await guardarLogin(F, VIEJO, K.viejo);
  await F.evaluate(() => { const orig = window.getPlatformFirebaseApp; window.__orig = orig;
    const app = {database: () => ({ref: ruta => ({
      once: () => Promise.resolve({val: () => __nube.arbol.gastrogoan.ownerAuth[ruta.split('/').pop()] || null, exists: () => !!__nube.arbol.gastrogoan.ownerAuth[ruta.split('/').pop()]}),
      set: v => { __nube.arbol.gastrogoan.ownerAuth[ruta.split('/').pop()] = JSON.parse(JSON.stringify(v)); return Promise.resolve(); },
      remove: () => (window.__fallaBorrado ? Promise.reject(new Error('sin conexión')) : (delete __nube.arbol.gastrogoan.ownerAuth[ruta.split('/').pop()], Promise.resolve()))
    })})};
    window.getPlatformFirebaseApp = async () => app; window.__fallaBorrado = true; });
  const r = await F.evaluate(async n => await changeOwnerAccessPin(n), NUEVO);
  assert.equal(r.ok, true);
  assert.ok((await F.evaluate(() => __nube.arbol.gastrogoan.ownerAuth))[K.viejo], 'el borrado falló: la vieja sigue en la nube');
  assert.ok(JSON.parse(await F.evaluate(() => localStorage.getItem('gastrogoan_owner_old_authkeys')) || '[]').includes(K.viejo), 'queda apuntada');
  await F.evaluate(async () => { window.__fallaBorrado = false; await limpiarCuentasAntiguasPendientes(); });
  assert.ok(!(await F.evaluate(() => __nube.arbol.gastrogoan.ownerAuth))[K.viejo], 'al reintentar se borra');
  assert.ok((await F.evaluate(() => __nube.arbol.gastrogoan.ownerAuth))[K.nuevo], 'y la vigente NO se toca');
});

// ── Empleado: el PIN cambiado en otro aparato.
const CODE = 'NEGOCIOA';
const G = await aparato({});
await G.evaluate(async (CODE) => {
  localStorage.setItem(SLOTS_LS, JSON.stringify([{id: 'default', name: 'Casa Paco', code: CODE, ownerId: ggOwnerId('casapaco')}]));
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code: CODE, tenantId: ggBizTenantId(CODE)}));
  DB.employees = [{id: 7, name: 'Ana', area: 'sala', active: true, pin: hashPin('1111', CODE), pinChanged: true}];
  saveDB(); await guardarLocalDB();
  document.body.insertAdjacentHTML('beforeend', '<div><input id="acc-emp-name"><input id="acc-emp-pin"><input id="acc-emp-code"></div>');
  window.hideAccessSelectScreen = () => {}; window.resumeEmployeeSession = () => {};
}, CODE);
const empleado = (page, pin) => page.evaluate(async (pin, CODE) => {
  clearAccessSession();
  document.getElementById('acc-emp-name').value = 'Ana'; document.getElementById('acc-emp-pin').value = pin; document.getElementById('acc-emp-code').value = CODE;
  await confirmEmployeeAccess();
  const s = getAccessSession(); return !!(s && s.type === 'employee');
}, pin, CODE);
await caso('Trabajador · sin internet manda la copia local: su PIN de siempre entra', async () => {
  assert.equal(await empleado(G, '1111'), true);
});
await caso('Trabajador · con internet manda la NUBE: si Ana cambió el PIN en otro aparato, el antiguo ya no entra y el nuevo sí', async () => {
  await G.evaluate(CODE => { window.empleadosFrescosDeLaNube = async () => [{id: 7, name: 'Ana', area: 'sala', active: true, pin: hashPin('2222', CODE), pinChanged: true}]; }, CODE);
  assert.equal(await empleado(G, '1111'), false, 'el PIN antiguo no debe entrar');
  assert.equal(await empleado(G, '2222'), true, 'el PIN nuevo debe entrar');
});
await caso('Trabajador · si la nube dice que Ana está dada de baja, no entra aunque la copia local la tenga activa', async () => {
  await G.evaluate(CODE => { window.empleadosFrescosDeLaNube = async () => [{id: 7, name: 'Ana', area: 'sala', active: false, pin: hashPin('1111', CODE), pinChanged: true}]; }, CODE);
  assert.equal(await empleado(G, '1111'), false);
});
await caso('Trabajador · si la nube no contesta (null) se usa la copia local y nadie se queda fuera', async () => {
  await G.evaluate(() => { window.empleadosFrescosDeLaNube = async () => null; });
  assert.equal(await empleado(G, '1111'), true);
});
await caso('Ningún error de JavaScript', async () => { const e = [...A.errs, ...B.errs, ...C.errs, ...D.errs, ...G.errs]; assert.deepEqual(e, []); });

await browser.close();
console.log(fallos ? `\n❌ ${fallos} caso(s) fallaron` : '\n✅ todos los casos pasaron'); process.exit(fallos ? 1 : 0);
