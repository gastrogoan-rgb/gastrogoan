// 18/11 (dueño): «cada vez que le doy a marchar plato la pantalla sube arriba; revísalo en toda la app». Toda función render…() conserva el scroll de
// #content si seguimos en la misma pantalla; navegar sigue subiendo arriba.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.setViewport({width:390, height:700});
await page.setRequestInterception(true);
page.on('request', r => /firebase|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(code => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
}, 'SCROLLGLOB01');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2600));
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const esp = ms => new Promise(r => setTimeout(r, ms));
await page.evaluate(() => {
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate','app-splash'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  for(let i = 0; i < 80; i++) DB.clients.push({id:5000 + i, name:'Cliente número ' + i, phone:'61234' + String(1000 + i), visits:[], createdAt:new Date().toISOString()});
  saveDB(); currentFolder = 'sala'; navigate('clientes');
});
await esp(900);
await caso('Repintar la misma pantalla conserva el scroll', async () => {
  const r = await page.evaluate(async () => {
    const c = document.getElementById('content'); c.scrollTop = 600; const antes = c.scrollTop;
    renderClientes(); await new Promise(r => setTimeout(r, 200));
    return {antes, despues: c.scrollTop, max: c.scrollHeight - c.clientHeight};
  });
  assert.ok(r.antes >= 300, 'no había scroll que conservar: ' + JSON.stringify(r));
  assert.ok(r.despues >= r.antes - 3, 'el scroll subió: ' + JSON.stringify(r));
});
await caso('Navegar a otra pantalla SÍ sube arriba', async () => {
  const r = await page.evaluate(async () => { const c = document.getElementById('content'); c.scrollTop = 600; navigate('dashboard'); await new Promise(r => setTimeout(r, 400)); return c.scrollTop; });
  assert.ok(r < 50, 'debería estar arriba: ' + r);
});
await caso('Sin errores de JavaScript', async () => assert.deepEqual(errs, []));
await browser.close(); process.exit(fallos ? 1 : 0);
