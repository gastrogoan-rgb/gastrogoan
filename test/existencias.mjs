/* Variación de existencias (12/11). Cuentas a mano, las del ejemplo que se le explicó al dueño:
 *   ventas 10.000 · compras 4.000 · otros gastos 4.000 · existencias 1.500 → 2.500
 *   consumo = 4.000 + 1.500 − 2.500 = 3.000  →  resultado = 10.000 − 3.000 − 4.000 = 3.000 (sin el ajuste serían 2.000)
 * Y: el almacén que BAJA suma gasto; si falta el mes anterior no se aplica nada; la foto automática la toma la app sola. */
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.setRequestInterception(true); page.on('request', r => /firebase|gstatic|googleapis/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/index.html', {waitUntil: 'domcontentloaded'});
await page.evaluate(() => (typeof dbReadyPromise !== 'undefined') ? dbReadyPromise : null).catch(() => {});
await page.evaluate(() => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'EXIST001', tenantId: ggBizTenantId('EXIST001')}));
  localStorage.setItem('gastrogoan_owner_login', '1'); localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts: Date.now()}));
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
});
await page.reload({waitUntil: 'domcontentloaded'}); await new Promise(r => setTimeout(r, 2500));
await page.evaluate(() => { Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true}); DB.business.ownFirebase = {apiKey:'f', databaseURL:'https://f-default-rtdb.firebaseio.com'}; });
let fallos = 0;
async function caso(n, fn){ try{ const d = await fn(); console.log('✅ ' + n + (d ? '  → ' + d : '')); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }

await caso('El almacén SUBE 1.000 €: la variación es −1.000 (menos gasto) y el resultado sube de 2.000 a 3.000', async () => {
  const r = await page.evaluate(() => {
    DB.ge.existencias = {'2026-09': {v: 1500, manual: true}, '2026-10': {v: 2500, manual: true}};
    const v = geVariacionExistenciasMes(2026, 9);                  // octubre
    const sin = 10000 - 4000 - 4000, con = 10000 - 4000 - v - 4000; // ventas − compras − variación − otros
    return {v, sin, con};
  });
  assert.equal(r.v, -1000); assert.equal(r.sin, 2000); assert.equal(r.con, 3000);
});
await caso('El almacén BAJA 700 €: más gasto (+700) y el resultado baja', async () => {
  const v = await page.evaluate(() => { DB.ge.existencias = {'2026-09': {v: 2500, manual: true}, '2026-10': {v: 1800, manual: true}}; return geVariacionExistenciasMes(2026, 9); });
  assert.equal(v, 700);
});
await caso('Sin el mes anterior no se aplica NADA (0), y apagar «usar existencias» lo anula', async () => {
  const r = await page.evaluate(() => {
    DB.ge.existencias = {'2026-10': {v: 2500, manual: true}};
    const a = geVariacionExistenciasMes(2026, 9);
    DB.ge.existencias = {'2026-09': {v: 1500, manual: true}, '2026-10': {v: 2500, manual: true}};
    DB.ge.config = Object.assign({}, DB.ge.config, {usarExistencias: false});
    const b = geVariacionExistenciasMes(2026, 9);
    DB.ge.config.usarExistencias = true;
    return {a, b};
  });
  assert.equal(r.a, 0); assert.equal(r.b, 0);
});
await caso('La foto automática la toma la app sola, solo guarda si el stock cambió y un recuento a mano manda', async () => {
  const r = await page.evaluate(() => {
    DB.ge.existencias = {};
    DB.ingredients = [{id: 1, name: 'Aceite', unit: 'L', price: 4, activo: true}]; DB.stock = {1: {qty: 10}};
    const c1 = fotoExistenciasAuto();           // primera foto: cambia
    const c2 = fotoExistenciasAuto();           // sin cambios: no cambia
    const k = existenciasClave(new Date().getFullYear(), new Date().getMonth());
    const v1 = DB.ge.existencias[k].v;
    DB.stock[1].qty = 12; const c3 = fotoExistenciasAuto(); const v2 = DB.ge.existencias[k].v;
    DB.ge.existencias[k] = {v: 999, manual: true}; DB.stock[1].qty = 20; const c4 = fotoExistenciasAuto();
    return {c1, c2, c3, v1, v2, c4, v4: DB.ge.existencias[k].v};
  });
  assert.equal(r.c1, true); assert.equal(r.c2, false); assert.equal(r.c3, true);
  assert.equal(r.v1, 40); assert.equal(r.v2, 48);
  assert.equal(r.c4, false, 'con recuento a mano no toca nada'); assert.equal(r.v4, 999);
});
await caso('Gastos Variables explica en claro qué le hace el almacén al resultado (sube / baja / falta el mes anterior)', async () => {
  const txt = await page.evaluate(async () => {
    const out = {};
    const poner = async (ex) => { DB.ge.existencias = ex; currentFolder = 'gestion'; navigate('economia'); await new Promise(r => setTimeout(r, 500)); GE.tab('variables'); GE.setGVPeriodo(2026, 9); await new Promise(r => setTimeout(r, 500)); return (document.getElementById('gv-existencias') || {}).innerText || ''; };
    out.sube = await poner({'2026-09': {v: 1500, manual: true}, '2026-10': {v: 2500, manual: true}});
    out.baja = await poner({'2026-09': {v: 2500, manual: true}, '2026-10': {v: 1800, manual: true}});
    out.falta = await poner({'2026-10': {v: 2500, manual: true}});
    return out;
  });
  assert.match(txt.sube, /ha subido/i); assert.match(txt.sube, /baja/i);
  assert.match(txt.baja, /ha bajado/i); assert.match(txt.baja, /sube/i);
  assert.match(txt.falta, /Falta el valor del mes anterior/i);
});
await caso('Sin errores de JavaScript', async () => { assert.deepEqual(errs, []); });
await browser.close();
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ la variación de existencias hace las cuentas bien y se explica sola');
process.exit(fallos ? 1 : 0);
