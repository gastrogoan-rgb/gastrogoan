// 18/11 (dueño): «zonas con tarifa propia» y «códigos promocionales» eran solo texto sin respuesta. Ahora cada campo enseña cómo lo entiende la app,
// marca las líneas que NO entiende y guarda al salir del campo.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.setViewport({width:390, height:800});
await page.setRequestInterception(true);
page.on('request', r => /firebase|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(code => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
}, 'MNZONAS0001');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const esp = ms => new Promise(r => setTimeout(r, ms));
await page.evaluate(() => {
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate','app-splash'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  navigate('minegocio'); renderMiNegocio();
});
await esp(600);
await caso('Zonas: la vista previa explica lo entendido y marca la línea mala', async () => {
  const r = await page.evaluate(async () => {
    const ta = document.getElementById('mn-zonas'); mnAbrirDe(ta);
    ta.value = 'Centro | 08001,08002 | 2 | 12 | 25\nesto no vale'; ta.dispatchEvent(new Event('input', {bubbles:true}));
    return document.getElementById('mn-zonas-prev').innerText;
  });
  assert.ok(/Centro/.test(r) && /08001, 08002/.test(r) && /no entendida/.test(r), r);
});
await caso('Zonas: al salir del campo se guarda en el negocio', async () => {
  const r = await page.evaluate(async () => {
    const ta = document.getElementById('mn-zonas'); ta.dispatchEvent(new Event('change', {bubbles:true})); await new Promise(r => setTimeout(r, 400));
    return (DB.business.pedidos.zonas || []).map(z => z.nombre + ':' + z.cps.join('/'));
  });
  assert.deepEqual(r, ['Centro:08001/08002']);
});
await caso('Códigos: la vista previa enseña el descuento y se guarda', async () => {
  const r = await page.evaluate(async () => {
    const ta = document.getElementById('mn-codigos'); mnAbrirDe(ta);
    ta.value = 'BIENVENIDA | 10% | 15 | 2026-12-31 | 100'; ta.dispatchEvent(new Event('input', {bubbles:true}));
    const prev = document.getElementById('mn-codigos-prev').innerText;
    ta.dispatchEvent(new Event('change', {bubbles:true})); await new Promise(r => setTimeout(r, 400));
    return {prev, cods: (DB.business.pedidos.codigos || []).map(c => c.codigo + ':' + c.pct)};
  });
  assert.ok(/BIENVENIDA/.test(r.prev) && /10/.test(r.prev), r.prev); assert.deepEqual(r.cods, ['BIENVENIDA:10']);
});
await caso('Sin errores de JavaScript', async () => assert.deepEqual(errs, []));
await browser.close(); process.exit(fallos ? 1 : 0);
