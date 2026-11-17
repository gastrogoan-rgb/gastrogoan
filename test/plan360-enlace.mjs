// Plan 360º · tareas con «Se hace en…» (17/11).
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
let ok = 0, mal = 0;
const caso = async (n, f) => { try{ await f(); console.log('✅ ' + n); ok++; }catch(e){ console.log('❌ ' + n + '\n     ⤷ ' + e.message); mal++; } };
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'], headless:true});
const page = await browser.newPage();
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(() => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'P360ENL1', tenantId: ggBizTenantId('P360ENL1')}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r => setTimeout(r, 2000));
const r = await page.evaluate(() => {
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  const a = plan360TaskRow(5, {id:'t1', title:'Revisar el escandallo del arroz', description:'x', status:'pendiente', enlace:'escandallo'}, 0);
  const b = plan360TaskRow(5, {id:'t2', title:'Sin enlace', description:'x', status:'pendiente'}, 1);
  const c = plan360TaskRow(5, {id:'t3', title:'Enlace inventado', description:'x', status:'pendiente', enlace:'alert(1)'}, 2);
  return {a, b, c, claves: Object.keys(PLAN360_ENLACES), sinArea: Object.keys(PLAN360_ENLACES).filter(k => !PLAN360_AREA_DE_ENLACE[k])};
});
await caso('Una tarea con enlace pinta el botón «Ir a Escandallo» que navega a esa pantalla', async () => {
  assert.ok(/onclick="navigate\('escandallo'\)"/.test(r.a) && /Ir a Escandallo/.test(r.a));
});
await caso('Sin enlace no hay botón; un enlace que no está en la lista se ignora (nunca llega a un onclick)', async () => {
  assert.ok(!/Ir a /.test(r.b)); assert.ok(!/alert\(1\)/.test(r.c));
});
await caso('Todas las pantallas del enlace existen como vista de la app', async () => {
  const faltan = await page.evaluate(ks => ks.filter(k => !document.getElementById('view-' + k)), r.claves);
  assert.deepEqual(faltan, []);
});
await caso('Cada tarea con enlace dice su área (Cocina/Sala/Gestión); sin enlace, ninguna', async () => {
  assert.ok(/p360-tarea-area[^>]*>Cocina</.test(r.a)); assert.ok(!/p360-tarea-area/.test(r.b)); assert.deepEqual(r.sinArea, []);
});
await browser.close();
console.log(mal ? '\n❌ ' + mal + ' caso(s) fallaron' : '\n✅ Plan 360 · tareas con enlace: ' + ok + ' casos en orden');
process.exit(mal ? 1 : 0);
