// Aviso visual de scroll en las tiras de pestañas horizontales (11/09,
// hallazgo de la auditoría visual): en móvil, la fila de pestañas de
// Gestión Económica/Limpieza/Reservas/Promoción y el índice de Mi Negocio
// se cortaban en seco sin ningún indicador de que había más pestañas fuera
// de la pantalla — el usuario podía no enterarse de que existían "CAPEX" o
// "Punto de Equilibrio". Ahora una sombra hacia dentro en el borde avisa.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
await page.setViewport({width:390, height:844});
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
}, 'TABSFADE1');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));
await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
});

let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}

await caso('En móvil, la fila de pestañas de Gestión Económica avisa con sombra de que hay más a la derecha', async () => {
  const r = await page.evaluate(()=>{
    navigate('economia');
    const row = document.getElementById('ge-tabs-row');
    return {scrollable: row.scrollWidth > row.clientWidth, hasFade: row.classList.contains('has-scroll-right')};
  });
  assert.ok(r.scrollable, 'en móvil (390px) la fila de 7 pestañas de GE debe desbordar: ' + JSON.stringify(r));
  assert.ok(r.hasFade, 'debe llevar la clase has-scroll-right para mostrar el aviso: ' + JSON.stringify(r));
});

await caso('Al hacer scroll hasta el final, el aviso de la derecha desaparece', async () => {
  const r = await page.evaluate(()=>{
    const row = document.getElementById('ge-tabs-row');
    row.scrollLeft = row.scrollWidth;
    row.dispatchEvent(new Event('scroll', {bubbles:false}));
    return {hasRight: row.classList.contains('has-scroll-right'), hasLeft: row.classList.contains('has-scroll-left')};
  });
  assert.equal(r.hasRight, false, 'al llegar al final no debe seguir avisando de que hay más a la derecha: ' + JSON.stringify(r));
  assert.ok(r.hasLeft, 'pero sí debe avisar de que hay contenido a la izquierda (se puede volver): ' + JSON.stringify(r));
});

await caso('En Mi Negocio, el índice de apartados también avisa en móvil', async () => {
  const r = await page.evaluate(()=>{
    navigate('minegocio');
    const nav = document.querySelector('.mn-indice');
    return nav ? {scrollable: nav.scrollWidth > nav.clientWidth, hasFade: nav.classList.contains('has-scroll-right')} : null;
  });
  assert.ok(r, 'el índice de Mi Negocio debe existir (24 apartados, de sobra para que aparezca)');
  assert.ok(r.scrollable, 'en móvil debe desbordar: ' + JSON.stringify(r));
  assert.ok(r.hasFade, 'debe avisar con la sombra: ' + JSON.stringify(r));
});

await caso('En escritorio, el índice de Mi Negocio NO desborda (envuelve en varias líneas) y no lleva el aviso', async () => {
  await page.setViewport({width:1440, height:900});
  const r = await page.evaluate(()=>{
    navigate('minegocio');
    const nav = document.querySelector('.mn-indice');
    return nav ? {scrollable: nav.scrollWidth > nav.clientWidth + 1, hasFade: nav.classList.contains('has-scroll-right')} : null;
  });
  assert.equal(r.hasFade, false, 'en escritorio, donde envuelve en vez de desbordar, no debe verse el aviso: ' + JSON.stringify(r));
});

await caso('Ningún error de JavaScript en todo el recorrido', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(68));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
