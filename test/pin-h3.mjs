// HASH H3 (PBKDF2-SHA256) DE LOS PIN — hallazgo 4 de la auditoría de seguridad (25/11).
// H2 (FNV-1a de 32 bits × 8.000) se rompe en milisegundos. H3 es PBKDF2 con sal aleatoria, y se introduce SIN dejar a nadie fuera:
//  · el H3 va en un campo APARTE (pin3 / pinHash3) y el H2 se queda: un aparato con la versión vieja sigue entrando;
//  · se calcula de forma perezosa al validar con éxito un PIN con hash antiguo;
//  · un H3 que ya no corresponde a su H2 (un aparato viejo cambió el PIN) se ignora;
//  · sin WebCrypto se usa el camino de siempre.
// ⚠️ Lo que NO cambia: ggOwnerAuthKey (es la RUTA de la cuenta en la nube).
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
let fallos = 0, total = 0;
async function caso(n, fn){ total++; try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const w = ms => new Promise(r => setTimeout(r, ms));
const URL_APP = 'http://localhost:8950/dist/index.html';
const CODE = 'PINH3COD', USER = 'casapaco';

async function aparato(){
  const ctx = await (browser.createBrowserContext ? browser.createBrowserContext() : browser.createIncognitoBrowserContext());
  const page = await ctx.newPage(); await page.setViewport({width:390, height:800});
  page.errs = []; page.on('pageerror', e => page.errs.push(e.message));
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|raw.githubusercontent/.test(r.url()) ? r.abort() : r.continue());
  await page.goto(URL_APP, {waitUntil:'domcontentloaded'}); await w(900);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10)); });
  await page.goto('about:blank'); await page.goto(URL_APP + '#home', {waitUntil:'domcontentloaded'}); await w(900);
  await page.evaluate(CODE => {
    window.initCloud = () => {}; window.initPublicRequestsListener = () => {}; window.checkLicenseRevocation = () => {};
    window.marcarPinYaCambiadoSiLaCuentaLoDice = async () => {};
    window.ownerLoginSigueVigente = async () => null;   // sin nube: no se bloquea a nadie
    window.__entro = false; window.enterAsOwner = () => { window.__entro = true; };
    document.body.insertAdjacentHTML('beforeend', '<div id="t-form"><input id="acc-owner-user"><input id="acc-owner-pin"><div id="acc-owner-error" style="display:none"></div><button id="acc-owner-btn"></button></div>');
    localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code: CODE, tenantId: ggBizTenantId(CODE)}));
  }, CODE);
  return page;
}
const esperarH3 = (page, js, ms = 6000) => page.waitForFunction(js, {timeout: ms}).then(() => true, () => false);
const intentar = (page, pin) => page.evaluate(async (u, pin) => {
  window.__entro = false;
  document.getElementById('acc-owner-user').value = u; document.getElementById('acc-owner-pin').value = pin;
  await confirmOwnerAccess();
  return window.__entro;
}, USER, pin);

const A = await aparato();

// ── 1. Primitivas
await caso('H3 se genera con el formato H3:iteraciones:sal:hash, con sal aleatoria (dos hashes del mismo PIN difieren) y se verifica', async () => {
  const r = await A.evaluate(async () => {
    const a = await hashPinH3('4093', 'X1'), b = await hashPinH3('4093', 'X1');
    return {a, b, ok: await pinH3Coincide('4093', a, 'X1'), mal: await pinH3Coincide('4094', a, 'X1'), otroCtx: await pinH3Coincide('4093', a, 'X2')};
  });
  assert.match(r.a, /^H3:\d+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/); assert.ok(Number(r.a.split(':')[1]) >= 100000, 'iteraciones: ' + r.a.split(':')[1]);
  assert.notEqual(r.a, r.b, 'sal aleatoria'); assert.equal(r.ok, true); assert.equal(r.mal, false, 'PIN equivocado'); assert.equal(r.otroCtx, false, 'otro negocio (otro contexto)');
});
await caso('Un H3 manipulado (iteraciones absurdas, basura) se rechaza sin colgar nada', async () => {
  const r = await A.evaluate(async () => [await pinH3Coincide('1', 'H3:999999999:AAAA:BBBB', 'X'), await pinH3Coincide('1', 'H3:basura', 'X'), await pinH3Coincide('1', 'H3:150000:%%%:@@@', 'X').catch(() => false)]);
  assert.deepEqual(r, [false, false, false]);
});
await caso('Coste: ≲ 300 ms con la CPU a 4× más lenta (móvil modesto)', async () => {
  const cdp = await A.createCDPSession(); await cdp.send('Emulation.setCPUThrottlingRate', {rate: 4});
  const ms = await A.evaluate(async () => { await hashPinH3('1234', 'X'); const t0 = performance.now(); await hashPinH3('1234', 'X'); return performance.now() - t0; });
  await cdp.send('Emulation.setCPUThrottlingRate', {rate: 1});
  console.log('   · hashPinH3 con CPU ×4: ' + Math.round(ms) + ' ms');
  assert.ok(ms < 300, ms + ' ms');
});

// ── 2. Empleado con hash de ANTES (H2): entra y se refuerza
await A.evaluate(CODE => {
  DB.employees = [
    {id: 7, name: 'Ana', area: 'sala', active: true, pin: hashPin('1111', CODE), pinChanged: true},
    {id: 8, name: 'Luis', area: 'cocina', active: true, pin: 'H:' + hashPinRaw('2222', CODE), pinChanged: true}   // el formato más antiguo
  ];
  DB.business.pin = hashPin('9999', CODE);
}, CODE);
await caso('Cuenta de ANTES (H2): el PIN entra y NO falla nada', async () => {
  assert.equal(await A.evaluate(CODE => pinMatchesEmployeeOrBusinessAsync('1111', DB.employees[0]), CODE), true);
});
await caso('…y se actualiza a H3 sin perder el H2 (pin3 vigente, pin intacto)', async () => {
  assert.ok(await esperarH3(A, () => DB.employees[0].pin3), 'no se escribió pin3');
  const e = await A.evaluate(() => DB.employees[0]);
  assert.match(e.pin3, /^H3:/); assert.equal(e.pin3De, e.pin); assert.match(e.pin, /^H2:/, 'el H2 sigue ahí');
});
await caso('Formato H: (el más antiguo) también entra y se refuerza', async () => {
  assert.equal(await A.evaluate(() => pinMatchesEmployeeOrBusinessAsync('2222', DB.employees[1])), true);
  assert.ok(await esperarH3(A, () => DB.employees[1].pin3), 'no se escribió pin3');
  assert.match(await A.evaluate(() => DB.employees[1].pin), /^H:/);
});
await caso('Con H3 vigente, un PIN EQUIVOCADO no entra y el correcto sí', async () => {
  const r = await A.evaluate(async () => [await pinMatchesEmployeeOrBusinessAsync('1112', DB.employees[0]), await pinMatchesEmployeeOrBusinessAsync('1111', DB.employees[0]), await pinMatchesEmployeeOrBusinessAsync('', DB.employees[0])]);
  assert.deepEqual(r, [false, true, false]);
});
await caso('Con H3 vigente decide SOLO el H3: aunque el H2 coincidiera, un PIN que no es no entra (se simula alterando el pin3)', async () => {
  const r = await A.evaluate(async CODE => {
    const e = DB.employees[0]; const orig = e.pin3;
    e.pin3 = await hashPinH3('7777', CODE);   // el H3 es de OTRO PIN, el H2 sigue siendo el de 1111
    const r = await pinMatchesEmployeeOrBusinessAsync('1111', e);
    e.pin3 = orig; return r;
  }, CODE);
  assert.equal(r, false);
});
await caso('PIN del negocio: entra con H2, se refuerza con H3 y se guarda en DB.business', async () => {
  assert.equal(await A.evaluate(() => pinDeNegocioCoincideAsync('9999')), true);
  assert.ok(await esperarH3(A, () => DB.business.pin3), 'no se escribió business.pin3');
  assert.equal(await A.evaluate(() => pinDeNegocioCoincideAsync('9998')), false);
  assert.equal(await A.evaluate(() => pinDeNegocioCoincideAsync('9999')), true);
});
await caso('El PIN del negocio sirve para fichar (rama «o el del negocio») y NO se copia como H3 del empleado', async () => {
  const r = await A.evaluate(async () => { const e = DB.employees[0]; const antes = e.pin3; const ok = await pinMatchesEmployeeOrBusinessAsync('9999', e); return {ok, igual: e.pin3 === antes}; });
  assert.equal(r.ok, true); assert.equal(r.igual, true);
  assert.equal(await A.evaluate(() => pinMatchesEmployeeOrBusinessAsync('1111', DB.employees[0])), true, 'su propio PIN sigue valiendo');
});

// ── 3. VERSIONES MEZCLADAS
await caso('Versión VIEJA simulada (solo entiende H2): sigue entrando porque el H2 sigue ahí', async () => {
  const r = await A.evaluate(CODE => ({ana: pinMatchesEmployeeOrBusiness('1111', DB.employees[0]), luis: pinMatchesEmployeeOrBusiness('2222', DB.employees[1]), emp: !!findEmployeeMatch(DB.employees, 'Ana', '1111', CODE), negocio: pinDeNegocioCoincide('9999'), mal: pinMatchesEmployeeOrBusiness('0000', DB.employees[0])}), CODE);
  assert.deepEqual(r, {ana: true, luis: true, emp: true, negocio: true, mal: false});
});
await caso('Un aparato VIEJO cambia el PIN (escribe pin nuevo y deja el pin3 viejo): el PIN nuevo entra y el ANTIGUO ya no', async () => {
  const r = await A.evaluate(async CODE => {
    const e = DB.employees[0];
    e.pin = hashPin('3333', CODE);   // lo que haría una versión sin H3
    const vigente = pinH3Vigente(e, 'pin');   // se mide ANTES de validar: validar lanza el refuerzo en segundo plano
    return {nuevo: await pinMatchesEmployeeOrBusinessAsync('3333', e), viejo: await pinMatchesEmployeeOrBusinessAsync('1111', e), vigente};
  }, CODE);
  assert.deepEqual(r, {nuevo: true, viejo: false, vigente: false}, JSON.stringify(r));
  assert.ok(await esperarH3(A, () => pinH3Vigente(DB.employees[0], 'pin')), 'debe refrescar el H3 con el PIN nuevo');
  assert.equal(await A.evaluate(() => pinMatchesEmployeeOrBusinessAsync('3333', DB.employees[0])), true);
  assert.equal(await A.evaluate(() => pinMatchesEmployeeOrBusinessAsync('1111', DB.employees[0])), false);
});
await caso('Cambiar el PIN en esta versión escribe los DOS hashes (H2 + H3 nuevo) y descarta el H3 antiguo', async () => {
  const r = await A.evaluate(async CODE => {
    const e = DB.employees[0]; const h3viejo = e.pin3;
    e.pin = hashPin('4444', CODE); await pinH3Anotar(e, 'pin', '4444', CODE, () => saveDB());
    return {h3nuevo: e.pin3 !== h3viejo, vigente: pinH3Vigente(e, 'pin'), v4: pinMatchesHash('4444', e.pin, CODE), h3ok: await pinH3Coincide('4444', e.pin3, CODE), h3viejo: await pinH3Coincide('3333', e.pin3, CODE)};
  }, CODE);
  assert.deepEqual(r, {h3nuevo: true, vigente: true, v4: true, h3ok: true, h3viejo: false});
});
await caso('Resetear el PIN de un empleado (vuelve al de fábrica) borra su H3: el 1234 entra y el PIN anterior no', async () => {
  const r = await A.evaluate(async CODE => {
    const e = DB.employees[0]; e.pin = hashPin('1234', CODE); pinH3Borrar(e, 'pin');
    const sinH3 = e.pin3 === undefined;   // antes de validar: validar el 1234 lanza su propio refuerzo en segundo plano
    return {fabrica: await pinMatchesEmployeeOrBusinessAsync('1234', e), anterior: await pinMatchesEmployeeOrBusinessAsync('4444', e), sinH3};
  }, CODE);
  assert.deepEqual(r, {fabrica: true, anterior: false, sinH3: true}, JSON.stringify(r));
});

// ── 4. Sin WebCrypto
await caso('SIN WebCrypto: entra por el camino de siempre (con y sin H3 guardado) y no escribe nada', async () => {
  const r = await A.evaluate(async CODE => {
    const sub = Object.getOwnPropertyDescriptor(crypto, 'subtle');
    Object.defineProperty(crypto, 'subtle', {value: undefined, configurable: true});
    try{
      const luis = {id: 9, name: 'Eva', active: true, pin: hashPin('5555', CODE)};
      const sin = await pinMatchesEmployeeOrBusinessAsync('5555', luis);
      const con = {id: 10, name: 'Pepe', active: true, pin: hashPin('6666', CODE), pin3: 'H3:150000:AAAA:BBBB', pin3De: null};
      con.pin3De = con.pin;
      const conH3 = await pinMatchesEmployeeOrBusinessAsync('6666', con);
      const mal = await pinMatchesEmployeeOrBusinessAsync('6667', con);
      return {disp: pinH3Disponible(), sin, conH3, mal, escribio: luis.pin3 !== undefined};
    } finally { if(sub) Object.defineProperty(crypto, 'subtle', sub); else delete crypto.subtle; }
  }, CODE);
  assert.deepEqual(r, {disp: false, sin: true, conH3: true, mal: false, escribio: false});
});

// ── 5. Dueño: cuentas de antes, cambio de PIN y GGGG
const claveVieja = await A.evaluate((u) => ggOwnerAuthKey(u, 'ABC234'), USER);
await caso('La derivación de authKey NO cambia (es la ruta de la cuenta en la nube)', async () => {
  // Valor de referencia calculado con la implementación ANTERIOR a este cambio.
  assert.equal(claveVieja, await A.evaluate(u => ggOwnerAuthKey(u, 'ABC234'), USER));
  assert.equal(claveVieja, 'KKK6QMMJ2XBV7RZ77HC5T3MD');
});
await caso('Dueño con login de ANTES (solo pinHash H2): entra, se refuerza con pinHash3 y el H2 se queda', async () => {
  await A.evaluate((u, k) => { localStorage.setItem('gastrogoan_owner_login', JSON.stringify({user: u, authKey: k, pinHash: hashPin('ABC234', u)})); }, USER, claveVieja);
  assert.equal(await intentar(A, 'ABC234'), true);
  assert.ok(await esperarH3(A, () => (getOwnerLogin() || {}).pinHash3), 'no se escribió pinHash3');
  const l = await A.evaluate(() => getOwnerLogin());
  assert.match(l.pinHash, /^H2:/); assert.match(l.pinHash3, /^H3:/); assert.equal(l.pinHash3De, l.pinHash); assert.equal(l.authKey, claveVieja, 'la ruta no se toca');
});
await caso('Dueño con H3: el PIN equivocado NO entra y el correcto sí; la versión vieja (verifyOwnerLogin síncrona) también entra', async () => {
  assert.equal(await intentar(A, 'ABC235'), false);
  assert.equal(await intentar(A, 'ABC234'), true);
  assert.equal(await A.evaluate(u => verifyOwnerLogin(u, 'ABC234'), USER), true);
});
await caso('Dueño: «Cambiar PIN» escribe ambos hashes y la ruta nueva; el PIN anterior deja de valer', async () => {
  await A.evaluate((u, k) => {
    const arbol = {gastrogoan: {ownerAuth: {[k]: {user: u, createdAt: 1, businesses: {}}}}};
    const get = ruta => ruta.split('/').filter(Boolean).reduce((o, x) => (o == null ? null : (o[x] === undefined ? null : o[x])), arbol);
    const set = (ruta, v) => { const ks = ruta.split('/').filter(Boolean); let o = arbol; ks.slice(0, -1).forEach(x => { if(o[x] == null) o[x] = {}; o = o[x]; }); if(v === null) delete o[ks[ks.length - 1]]; else o[ks[ks.length - 1]] = v; };
    const app = {database: () => ({ref: ruta => ({once: () => Promise.resolve({val: () => { const v = get(ruta); return v == null ? null : JSON.parse(JSON.stringify(v)); }, exists: () => get(ruta) != null}), set: v => (set(ruta, JSON.parse(JSON.stringify(v))), Promise.resolve()), remove: () => (set(ruta, null), Promise.resolve())})})};
    window.getPlatformFirebaseApp = async () => app; window.__arbol = arbol;
  }, USER, claveVieja);
  const r = await A.evaluate(async () => await changeOwnerAccessPin('XYZ789'));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.ok(await esperarH3(A, () => (getOwnerLogin() || {}).pinHash3), 'falta pinHash3 tras cambiar');
  const l = await A.evaluate(() => getOwnerLogin());
  assert.match(l.pinHash, /^H2:/); assert.equal(l.pinHash3De, l.pinHash);
  assert.equal(l.authKey, await A.evaluate(u => ggOwnerAuthKey(u, 'XYZ789'), USER), 'authKey = derivación de siempre');
  assert.equal(await intentar(A, 'ABC234'), false); assert.equal(await intentar(A, 'XYZ789'), true);
});
await caso('Código maestro GGGG: sigue reseteando el acceso del dueño y deja los dos hashes', async () => {
  const r = await A.evaluate(async () => {
    window.promptText = async () => 'NEW456';
    window.__entro = false;
    document.getElementById('acc-owner-user').value = 'casapaco'; document.getElementById('acc-owner-pin').value = 'GGGG';
    await confirmOwnerAccess();
    return window.__entro;
  });
  assert.equal(r, true, 'GGGG debe entrar tras fijar el PIN nuevo');
  assert.ok(await esperarH3(A, () => { const l = getOwnerLogin(); return l && l.pinHash3 && l.pinHash3De === l.pinHash; }), 'GGGG debe dejar H3');
  assert.equal(await intentar(A, 'NEW456'), true); assert.equal(await intentar(A, 'XYZ789'), false);
});

// ── 6. Entrada de empleado por «Acceso Empleados» (negocio abierto)
const B = await aparato();
await B.evaluate(async CODE => {
  localStorage.setItem(SLOTS_LS, JSON.stringify([{id: 'default', name: 'Casa Paco', code: CODE, ownerId: ggOwnerId('casapaco')}]));
  DB.employees = [{id: 7, name: 'Ana', area: 'sala', active: true, pin: hashPin('1111', CODE), pinChanged: true}];
  saveDB(); await guardarLocalDB();
  document.body.insertAdjacentHTML('beforeend', '<div><input id="acc-emp-name"><input id="acc-emp-pin"><input id="acc-emp-code"></div>');
  window.hideAccessSelectScreen = () => {}; window.resumeEmployeeSession = () => {};
  window.empleadosFrescosDeLaNube = async () => null;
}, CODE);
const empleado = (page, pin) => page.evaluate(async (pin, CODE) => {
  clearAccessSession();
  document.getElementById('acc-emp-name').value = 'Ana'; document.getElementById('acc-emp-pin').value = pin; document.getElementById('acc-emp-code').value = CODE;
  await confirmEmployeeAccess();
  const s = getAccessSession(); return !!(s && s.type === 'employee');
}, pin, CODE);
await caso('Acceso de empleado con hash de antes: entra y su PIN queda reforzado con H3 en el negocio abierto', async () => {
  assert.equal(await empleado(B, '1111'), true);
  assert.ok(await esperarH3(B, () => DB.employees[0].pin3), 'no se reforzó');
  assert.equal(await empleado(B, '1111'), true, 'con H3 sigue entrando');
  assert.equal(await empleado(B, '1112'), false, 'y el equivocado no');
});
await caso('Acceso de empleado con la lista de la NUBE (sin H3 y con H3 de otro aparato): ambas entran', async () => {
  const r = await B.evaluate(async CODE => {
    const h3 = await hashPinH3('2222', CODE);
    const h2 = hashPin('2222', CODE);
    window.empleadosFrescosDeLaNube = async () => [{id: 7, name: 'Ana', area: 'sala', active: true, pin: h2, pin3: h3, pin3De: h2, pinChanged: true}];
    return true;
  }, CODE);
  assert.equal(await empleado(B, '2222'), true); assert.equal(await empleado(B, '1111'), false);
});

// ── 7. Aviso de PIN corto
const C = await aparato();
const avisoPin = page => page.evaluate(() => ({campana: avisosDeLaApp().some(i => i.id === 'pinCorto'), fila: avisosLista().some(f => f.id === 'pinCorto')}));
await caso('Aviso de PIN corto: NO sale con un PIN de 6-12 caracteres', async () => {
  await C.evaluate(() => { document.body.classList.add('owner-session'); });
  await C.evaluate(async (u) => { localStorage.setItem('gastrogoan_owner_login', JSON.stringify({user: u, authKey: 'ak', pinHash: hashPin('ABC234', u)})); }, USER);
  assert.equal(await intentar(C, 'ABC234'), true);
  assert.deepEqual(await avisoPin(C), {campana: false, fila: false});
});
await caso('Aviso de PIN corto: SALE con un PIN de 4 dígitos, solo para el propietario, con botón que lleva a «Cambiar contraseña»', async () => {
  await C.evaluate(async (u) => { localStorage.setItem('gastrogoan_owner_login', JSON.stringify({user: u, authKey: 'ak', pinHash: hashPin('1234', u)})); }, USER);
  assert.equal(await intentar(C, '1234'), true);
  assert.deepEqual(await avisoPin(C), {campana: true, fila: true});
  const item = await C.evaluate(() => { const i = avisosDeLaApp().find(x => x.id === 'pinCorto'); return {ocultable: i.ocultable, onclick: i.onclick, label: i.label, soloDueno: i.soloDueno}; });
  assert.equal(item.ocultable, true); assert.equal(item.soloDueno, true); assert.match(item.onclick, /promptChangeOwnerPassword/); assert.match(item.label, /6-12/);
  await C.evaluate(() => { toggleAvisosPanel(); }); await w(250);
  assert.match(await C.evaluate(() => document.getElementById('avisos-cuerpo').innerText), /PIN es corto/);
  await C.evaluate(() => avisosIr('promptChangeOwnerPassword()')); await w(300);
  assert.ok(await C.evaluate(() => !!document.getElementById('owner-new-pass-1')), 'debe abrir «Cambiar contraseña»');
  await C.evaluate(() => closeModal());
});
await caso('Aviso de PIN corto: «Visto» lo apaga en este aparato y no vuelve a salir', async () => {
  await C.evaluate(() => avisosMarcarVisto('pinCorto', 1));
  assert.deepEqual(await avisoPin(C), {campana: false, fila: false});
  assert.equal(await intentar(C, '1234'), true);   // volver a entrar con el PIN corto no lo resucita
  assert.deepEqual(await avisoPin(C), {campana: false, fila: false});
});
await caso('Aviso de PIN corto: un empleado nunca lo ve, y cambiar a un PIN largo borra la marca', async () => {
  await C.evaluate(() => { localStorage.removeItem('gastrogoan_avisos_vistos'); });
  assert.equal((await avisoPin(C)).campana, true);
  await C.evaluate(() => document.body.classList.remove('owner-session'));
  assert.deepEqual(await avisoPin(C), {campana: false, fila: false});
  await C.evaluate(() => { document.body.classList.add('owner-session'); ownerPinCortoAnotar('LARGO123'); });
  assert.equal((await avisoPin(C)).campana, false);
});

await caso('Ningún error de JavaScript', async () => { assert.deepEqual([...A.errs, ...B.errs, ...C.errs], []); });

await browser.close();
console.log(fallos ? `\n❌ ${fallos} caso(s) fallaron` : `\n✅ los ${total} casos pasaron`); process.exit(fallos ? 1 : 0);
