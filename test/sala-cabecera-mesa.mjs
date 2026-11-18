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

await caso('Cabecera de PDA (18/11): título centrado y, debajo, «Cambiar de mesa» y «Alérgenos» pequeños y en la MISMA fila', async () => {
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
    const modal = document.querySelector('.modal');
    const h3 = modal.querySelector('.modal-header h3');
    const fila = modal.querySelector('.tp-or-acciones-cab');
    const btns = [...fila.querySelectorAll('button')];
    const cambiar = btns.find(b => b.textContent.includes('Cambiar de mesa'));
    const alerg = btns.find(b => /lérgenos/.test(b.textContent));
    const rc = cambiar.getBoundingClientRect(), ra = alerg.getBoundingClientRect(), rh = h3.getBoundingClientRect(), rm = modal.getBoundingClientRect();
    return {mismaFila: Math.abs(rc.top - ra.top) < 4, debajoTitulo: rc.top >= rh.bottom - 2,
      centrado: Math.abs((rh.left + rh.width/2) - (rm.left + rm.width/2)) < 40,
      chipPropietario: /propietario/i.test(fila.textContent), alto: rc.height};
  });
  assert.ok(r.mismaFila, 'Cambiar de mesa y Alérgenos en la misma fila: ' + JSON.stringify(r));
  assert.ok(r.debajoTitulo, 'debajo del título: ' + JSON.stringify(r));
  assert.ok(r.centrado, 'título centrado: ' + JSON.stringify(r));
  assert.ok(!r.chipPropietario, 'sin chip «Propietario»: ' + JSON.stringify(r));
  assert.ok(r.alto <= 40, 'botones pequeños: ' + JSON.stringify(r));
});

await caso('Ningún error de JavaScript en todo el recorrido', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(68));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
