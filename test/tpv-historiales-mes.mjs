// 18/11 (dueño): anulaciones y arqueos «se quedan de por vida»: ahora se abren en el MES EN CURSO, con selector de periodo.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.setViewport({width:390, height:760});
await page.setRequestInterception(true);
page.on('request', r => /firebase|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(code => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
}, 'TPVHIST0001');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const esp = ms => new Promise(r => setTimeout(r, ms));
await page.evaluate(() => {
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate','app-splash'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  const hoy = new Date(), iso = d => d.toISOString().slice(0, 10);
  const antes = new Date(hoy.getFullYear(), hoy.getMonth() - 3, 10);
  DB.cashClosures = []; DB.voidLog = [];
  [hoy, antes].forEach((d, i) => { DB.cashClosures.push({id:900 + i, fecha:iso(d), createdAt:d.toISOString(), hasta:d.toISOString(), total:100 + i, diferencia:0, responsableNombre:'Resp' + i}); DB.voidLog.push({fecha:iso(d), hora:'13:00', mesa:'Mesa ' + i, plato:'Plato' + i, qty:1, responsable:'R' + i, motivo:'m'}); });
  currentFolder = 'sala'; navigate('tpv');
});
await esp(600);
await caso('Arqueos: se abre en el mes en curso y no enseña los de hace 3 meses', async () => {
  const r = await page.evaluate(async () => { openCashClosureHistory(); await new Promise(r => setTimeout(r, 300)); return {filas: document.querySelectorAll('.modal tbody tr').length, selector: !!document.querySelector('.modal .pe-sel'), texto: document.querySelector('.modal').innerText}; });
  assert.equal(r.filas, 1, JSON.stringify(r)); assert.ok(r.selector, 'selector de periodo'); assert.ok(/Resp0/.test(r.texto) && !/Resp1/.test(r.texto), r.texto.slice(0, 200));
});
await caso('Arqueos: «todo el año» o el mes anterior los muestra', async () => {
  const r = await page.evaluate(async () => { tpvHistCbCash(new Date().getFullYear(), null); await new Promise(r => setTimeout(r, 300)); return document.querySelectorAll('.modal tbody tr').length; });
  assert.ok(r >= 1);
});
await caso('Anulaciones: mismo criterio (mes en curso + selector)', async () => {
  const r = await page.evaluate(async () => { closeModal(); openVoidLogModal(); await new Promise(r => setTimeout(r, 300)); return {filas: document.querySelectorAll('.modal tbody tr').length, selector: !!document.querySelector('.modal .pe-sel'), texto: document.querySelector('.modal').innerText}; });
  assert.equal(r.filas, 1, JSON.stringify(r)); assert.ok(r.selector); assert.ok(/Plato0/.test(r.texto) && !/Plato1/.test(r.texto), r.texto.slice(0, 200));
});
await caso('Sin errores de JavaScript', async () => assert.deepEqual(errs, []));
await browser.close(); process.exit(fallos ? 1 : 0);
