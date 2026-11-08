// GESTIÓN ECONÓMICA (8/11): al hacer un cambio dentro de una pestaña NO se vuelve arriba del todo (antes tab() subía siempre al principio).
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.setViewport({width:1280, height:700});
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(() => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'SCROLL01', tenantId: ggBizTenantId('SCROLL01')}));
  localStorage.setItem('gastrogoan_owner_login', '1'); localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted', '1'); localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
});
await page.reload({waitUntil:'domcontentloaded'});
const w = ms => new Promise(r => setTimeout(r, ms));
await w(2200);
await page.evaluate(() => {
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate','app-splash'].forEach(id => document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, formaJuridica:'sociedad'});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  currentFolder = 'gestion'; ownerUnlocked = true; navigate('economia');
});
await w(800);
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }

await caso('Repintar la MISMA pestaña (lo que hace guardar, duplicar, cambiar periodo…) conserva el sitio donde estabas, en todas las pestañas', async () => {
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms)), out = {};
    for(const tab of ['ventas', 'fijos', 'variables', 'cdr', 'pe', 'capex', 'tesoreria', 'bc']){
      GE.tab(tab); await esp(250);
      const c = document.querySelector('.content'); document.getElementById('view-economia').style.minHeight = '3500px';
      c.scrollTop = 320; const puesto = c.scrollTop;
      GE.tab(tab); await esp(250);
      out[tab] = [puesto, c.scrollTop];
    }
    return out;
  });
  for(const [tab, [antes, despues]] of Object.entries(r)){ assert.ok(antes > 100, tab + ': no se pudo desplazar ' + antes); assert.ok(Math.abs(despues - antes) < 5, `${tab}: pasó de ${antes} a ${despues}`); }
});
await caso('Cambiar DE pestaña sí empieza arriba', async () => {
  const r = await page.evaluate(async () => {
    GE.tab('ventas'); await new Promise(r => setTimeout(r, 200));
    const c = document.querySelector('.content'); c.scrollTop = 300; GE.tab('fijos'); await new Promise(r => setTimeout(r, 250));
    return c.scrollTop;
  });
  assert.ok(r < 5, 'al cambiar de pestaña debería empezar arriba: ' + r);
});
await caso('Entrar en Gestión Económica desde otra pantalla empieza arriba', async () => {
  const r = await page.evaluate(async () => {
    navigate('dashboard'); await new Promise(r => setTimeout(r, 400));
    const c = document.querySelector('.content'); c.scrollTop = 500; navigate('economia'); await new Promise(r => setTimeout(r, 500));
    return c.scrollTop;
  });
  assert.ok(r < 5, 'empieza en ' + r);
});
await caso('Cambiar un reparto de Tesorería o el periodo no te lleva arriba', async () => {
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms)); GE.tab('tesoreria'); await esp(300);
    document.getElementById('view-economia').style.minHeight = '3500px';
    const c = document.querySelector('.content'); c.scrollTop = 400; const antes = c.scrollTop;
    const el = document.getElementById('te-pct-per'); el.value = '31'; el.dispatchEvent(new Event('change', {bubbles: true})); await esp(300);
    const trasPct = c.scrollTop;
    gePeriodoTes(new Date().getFullYear(), (new Date().getMonth() + 11) % 12); await esp(300);
    return {antes, trasPct, trasPeriodo: c.scrollTop};
  });
  assert.ok(r.antes > 100); assert.ok(Math.abs(r.trasPct - r.antes) < 5, JSON.stringify(r)); assert.ok(Math.abs(r.trasPeriodo - r.antes) < 5, JSON.stringify(r));
});
await caso('Ningún error de JavaScript', async () => { assert.deepEqual(errs, []); });
await browser.close();
console.log(fallos ? `\n❌ ${fallos} caso(s) fallaron` : '\n✅ todos los casos pasaron'); process.exit(fallos ? 1 : 0);
