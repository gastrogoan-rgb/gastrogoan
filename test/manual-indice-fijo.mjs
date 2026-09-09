// Manual de uso (9/09): hay dos listas de capítulos, la fila de arriba
// (.mn-indice) y la columna lateral (.manual-nav). El dueño pidió que SOLO
// la de arriba quede fija al hacer scroll; la lateral debe seguir
// desplazándose con el texto, como siempre.
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
}, 'MANUALFIJO1');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));
await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  navigate('manual');
});
await new Promise(r=>setTimeout(r,300));

let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}

await caso('Al hacer scroll, el índice de arriba se queda fijo y la lista lateral se desplaza con el texto', async () => {
  const r = await page.evaluate(()=>{
    document.getElementById('content').scrollTop = 600;
    const antes = {indice: document.querySelector('.mn-indice').getBoundingClientRect().top, nav: document.querySelector('.manual-nav').getBoundingClientRect().top};
    document.getElementById('content').scrollTop = 900;
    const despues = {indice: document.querySelector('.mn-indice').getBoundingClientRect().top, nav: document.querySelector('.manual-nav').getBoundingClientRect().top};
    return {antes, despues};
  });
  // Una vez "pegado" arriba (tras el primer scroll), seguir bajando no debe
  // moverlo más — es justo lo que hace sticky y lo que NO hacía antes.
  assert.equal(r.antes.indice, r.despues.indice, 'el índice de arriba, ya pegado, no debe moverse con más scroll: ' + JSON.stringify(r));
  assert.ok(r.despues.nav < r.antes.nav - 100, 'la lista lateral SÍ debe desplazarse hacia arriba con el scroll: ' + JSON.stringify(r));
});

await caso('El índice de arriba lleva position:sticky; la lista lateral no', async () => {
  const r = await page.evaluate(()=>({
    indice: getComputedStyle(document.querySelector('.mn-indice')).position,
    nav: getComputedStyle(document.querySelector('.manual-nav')).position,
  }));
  assert.equal(r.indice, 'sticky', 'el índice de arriba debe ser sticky: ' + JSON.stringify(r));
  assert.notEqual(r.nav, 'sticky', 'la lista lateral no debe ser sticky: ' + JSON.stringify(r));
});

await caso('Ningún error de JavaScript en todo el recorrido', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(68));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
