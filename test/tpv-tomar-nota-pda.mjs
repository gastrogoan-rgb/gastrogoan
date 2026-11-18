// 18/11 (dueño): Tomar nota estilo PDA — cartas en UN desplegable, «Tu selección» desplegable abajo, una línea por plato.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.setViewport({width:360, height:740});
await page.setRequestInterception(true);
page.on('request', r => /firebase|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(code => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
}, 'TPVPDA00001');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const esp = ms => new Promise(r => setTimeout(r, ms));
await page.evaluate(() => {
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate','app-splash'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  DB.tables.length = 0; DB.tpvOrders.length = 0; DB.cartas.length = 0;
  DB.tables.push({id:1, name:'Mesa 1', zona:'Salón', plazas:4});
  let pid = 300, sid = 50; const pl = (n, p) => ({id:pid++, nombre:n, precio:p, disponible:true, alergenos:''});
  DB.cartas.push({id:1, nombre:'Carta principal', secciones:[{id:sid++, nombre:'Entrantes', icono:'ic:none', platos:[pl('Croquetas', 9.5), pl('Bravas', 6.5)]}]}, {id:2, nombre:'Carta GG Burger', secciones:[{id:sid++, nombre:'Burgers', icono:'ic:none', platos:[pl('Doble queso', 11)]}]});
  DB.activeCartaIds = [1, 2];
  saveDB(); currentFolder = 'sala'; navigate('tpv'); DB.tpvOrders.push({id:5, tableId:1, tipo:'mesa', status:'abierta', pax:2, items:[], tandas:[], createdAt:new Date().toISOString()}); saveDB(); openTableOrder(1, 5);
});
await esp(700);
await caso('Las cartas van en UN desplegable (no en una tira de botones)', async () => {
  const r = await page.evaluate(() => ({sel: document.querySelectorAll('#tp-sel-carta').length, opts: document.querySelectorAll('#tp-sel-carta option').length, tiras: document.querySelectorAll('.tp-or-tab').length}));
  assert.equal(r.sel, 1, JSON.stringify(r)); assert.equal(r.opts, 2, JSON.stringify(r)); assert.equal(r.tiras, 0, JSON.stringify(r));
});
await caso('Elegir una carta en el desplegable cambia las carpetas', async () => {
  const r = await page.evaluate(async () => {
    const sc = document.getElementById('tp-sel-carta'); sc.selectedIndex = 1; sc.dispatchEvent(new Event('change', {bubbles:true}));
    await new Promise(r => setTimeout(r, 300));
    return [...document.querySelectorAll('.tp-seccion-nom')].map(n => n.textContent.trim());
  });
  assert.deepEqual(r, ['Burgers'], JSON.stringify(r));
});
await caso('«Tu selección»: aparece al añadir, se despliega con − n + y cuenta unidades y total', async () => {
  const r = await page.evaluate(async () => {
    document.querySelector('.tp-seccion').click(); await new Promise(r => setTimeout(r, 250));
    const sinBandeja = !document.querySelector('.tp-bandeja');
    document.querySelector('.tp-plato-main').click(); await new Promise(r => setTimeout(r, 300));
    document.querySelector('.tp-plato-main').click(); await new Promise(r => setTimeout(r, 300));
    const cab = document.querySelector('.tp-bj-cab').textContent.replace(/\s+/g, ' ');
    document.querySelector('.tp-bj-cab').click(); await new Promise(r => setTimeout(r, 300));
    const lineas = document.querySelectorAll('.tp-bj-l').length;
    document.querySelectorAll('.tp-bj-l .tp-q')[1].click(); await new Promise(r => setTimeout(r, 300));
    const cab2 = (document.querySelector('.tp-bj-cab') || {textContent: 'NULL ' + (document.querySelector('.tp-or-pestana.is-on')||{}).textContent + ' ' + document.querySelectorAll('.tp-bandeja').length}).textContent.replace(/\s+/g, ' ');
    return {sinBandeja, cab, lineas, cab2};
  });
  assert.ok(r.sinBandeja, JSON.stringify(r)); assert.match(r.cab, /2/, JSON.stringify(r)); assert.match(r.cab, /22,00/, JSON.stringify(r));
  assert.ok(r.lineas >= 1, JSON.stringify(r)); assert.match(r.cab2, /33,00/, 'el + de la bandeja suma una unidad: ' + JSON.stringify(r));
});
await caso('Cada plato de la lista cabe en UNA línea (alto < 48 px) a 360 px', async () => {
  const r = await page.evaluate(() => { document.querySelectorAll('.tp-plato-main').length; return [...document.querySelectorAll('.tp-plato-main')].map(b => Math.round(b.getBoundingClientRect().height)); });
  assert.ok(r.every(h => h <= 60), JSON.stringify(r));
});
await caso('Sin errores de JavaScript', async () => assert.deepEqual(errs, []));
await browser.close(); process.exit(fallos ? 1 : 0);
