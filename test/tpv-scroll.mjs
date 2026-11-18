// 18/11 (dueño): «cada vez que le doy a marchar plato la pantalla sube hasta arriba». Repintar la comanda sustituía el modal y los
// scrolls volvían a 0. Ahora se conservan al repintar la MISMA mesa.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.setViewport({width:360, height:640});
await page.setRequestInterception(true);
page.on('request', r => /firebase|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(code => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
}, 'TPVSCROLL01');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
await caso('Marchar un plato NO devuelve el scroll de la comanda arriba', async () => {
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms));
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate','app-splash'].forEach(id=>document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    DB.tables.push({id:1, name:'Mesa 1', zona:'Salón', plazas:4});
    const items = [];
    for(let i = 0; i < 14; i++) items.push({lineId:genId(), platoId:genId(), recipeId:null, name:'Plato número ' + i, price:5, qty:1, tanda: i < 7 ? 'Entrantes' : 'Principales', estado:null, marchada:0, bebida:false, notas:''});
    DB.tpvOrders.push({id:88, tableId:1, tipo:'mesa', status:'abierta', pax:2, items, tandas:['Entrantes','Principales'], createdAt:new Date().toISOString()});
    saveDB(); navigate('tpv'); openTableOrder(1, 88); setTpvOrderMobilePane('comanda', 88); await esp(500);
    const cols = () => [...document.querySelectorAll('.modal-body, .tp-or-cuerpo, .tp-or-col')];
    cols().forEach(el => { el.scrollTop = 300; });
    const antes = Math.max(...cols().map(e => e.scrollTop));
    marcharComanda(88, 'Entrantes', false); await esp(500);
    const despues = Math.max(...cols().map(e => e.scrollTop));
    return {antes, despues};
  });
  assert.ok(r.antes > 0, 'no había scroll que conservar (fixture): ' + JSON.stringify(r));
  assert.ok(r.despues >= r.antes - 2, 'el scroll volvió arriba: ' + JSON.stringify(r));
});
await caso('Sin errores de JavaScript', async () => assert.deepEqual(errs, []));
await browser.close(); process.exit(fallos ? 1 : 0);
