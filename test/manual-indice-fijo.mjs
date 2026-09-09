// Manual de uso: antes había DOS listas de capítulos (la fila de arriba y
// una columna lateral, .manual-nav) — repetir lo mismo dos veces no
// aportaba nada. El dueño pidió (9/09) quitar la columna lateral y dejar
// solo la fila de arriba, fija al hacer scroll para no perderla al leer un
// capítulo largo.
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

await caso('Ya no existe la columna lateral (.manual-nav): solo queda el índice de arriba', async () => {
  const r = await page.evaluate(()=>({
    tieneNavLateral: !!document.querySelector('.manual-nav'),
    tieneIndiceArriba: !!document.querySelector('.mn-indice'),
    opciones: document.querySelectorAll('.mn-indice-chip').length,
  }));
  assert.ok(!r.tieneNavLateral, 'la columna lateral debe haber desaparecido: ' + JSON.stringify(r));
  assert.ok(r.tieneIndiceArriba, 'debe seguir habiendo un índice arriba: ' + JSON.stringify(r));
  assert.ok(r.opciones > 5, 'el índice de arriba debe listar los capítulos (ahora es la única navegación): ' + JSON.stringify(r));
});

await caso('El índice de arriba se queda fijo (sticky) al hacer scroll', async () => {
  const r = await page.evaluate(()=>{
    document.getElementById('content').scrollTop = 600;
    const antes = document.querySelector('.mn-indice').getBoundingClientRect().top;
    document.getElementById('content').scrollTop = 900;
    const despues = document.querySelector('.mn-indice').getBoundingClientRect().top;
    return {antes, despues, position: getComputedStyle(document.querySelector('.mn-indice')).position};
  });
  assert.equal(r.position, 'sticky', 'debe llevar position:sticky: ' + JSON.stringify(r));
  assert.equal(r.antes, r.despues, 'una vez pegado arriba, seguir bajando no debe moverlo más: ' + JSON.stringify(r));
});

await caso('El índice de arriba se mantiene aunque el resultado de una búsqueda tenga pocos capítulos', async () => {
  const r = await page.evaluate(()=>{
    setManualSearch('reservas');
    const opciones = document.querySelectorAll('.mn-indice-chip').length;
    setManualSearch('');
    return opciones;
  });
  assert.ok(r >= 1, 'con pocos resultados el índice no debe desaparecer, es la única navegación: ' + JSON.stringify(r));
});

await caso('Ningún error de JavaScript en todo el recorrido', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(68));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
