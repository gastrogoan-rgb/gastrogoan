// "Cambiar de mesa" pasa a ser lo primero del modal de comanda (9/09):
// antes quedaba a la derecha del título, entre otros iconos, y costaba
// encontrarlo. Ahora es el primer control, a la izquierda del todo, con
// su texto visible (no solo un icono).
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
const erroresJs = [];
page.on('pageerror', e => erroresJs.push(e.message));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(code => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
}, 'SALACABECERA1');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));

let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}

await caso('"Cambiar de mesa" es el PRIMER elemento de la cabecera del modal, antes del título', async () => {
  const r = await page.evaluate(()=>{
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    DB.tables.push({id:1, name:'Mesa 9', zona:'Salón', plazas:4});
    const orderId = genId();
    DB.tpvOrders.push({id: orderId, tableId:1, status:'abierta', pax:4, tipo:'mesa', items:[]});
    saveDB();
    navigate('tpv');
    openTableOrder(1, orderId);
    const header = document.querySelector('.modal-header');
    const hijos = [...header.children];
    const idxCambiar = hijos.findIndex(el => el.textContent.includes('Cambiar de mesa'));
    const idxTitulo = hijos.findIndex(el => el.tagName === 'H3');
    return {idxCambiar, idxTitulo, textoBoton: hijos[idxCambiar]?.textContent.trim()};
  });
  assert.ok(r.idxCambiar !== -1, 'debe existir el botón "Cambiar de mesa": ' + JSON.stringify(r));
  assert.ok(r.idxCambiar < r.idxTitulo, 'debe ir ANTES que el título de la mesa: ' + JSON.stringify(r));
  assert.ok(r.textoBoton.includes('Cambiar de mesa'), 'debe llevar el texto visible, no solo el icono: ' + JSON.stringify(r));
});

await caso('Ningún error de JavaScript en todo el recorrido', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(68));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
