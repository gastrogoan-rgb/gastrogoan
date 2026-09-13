/* Las tiras de pestañas en móvil (13/09 — reescrita).
 *
 * El 11/09 estas filas se arrastraban en horizontal y se les puso una sombra
 * para avisar de que había más pestañas fuera de la pantalla. Funcionaba,
 * pero tapaba el síntoma: al entrar en Cuenta de Resultados, la fila
 * quedaba con "os fijos" cortado a media palabra, y para llegar a CAPEX
 * había que adivinar que aquello se movía.
 *
 * Ahora, en móvil, las pestañas ENVUELVEN en varias filas: ocupan un poco
 * más de alto y se ven todas de un vistazo. Esta prueba fija eso —y de paso
 * conserva el aviso de scroll, que sigue vivo para cualquier tira que sí
 * desborde (una fila con muchas pestañas en una pantalla muy estrecha, o
 * las tiras que no envuelven).
 */
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

await caso('En móvil se ven las SIETE pestañas de Gestión Económica, sin arrastrar', async () => {
  const r = await page.evaluate(async ()=>{
    currentFolder='gestion'; navigate('economia');
    await new Promise(r=>setTimeout(r,600));
    const fila = document.querySelector('#view-economia .ge-tab-row');
    const tabs = [...fila.querySelectorAll('.ge-tab')];
    const anchoVentana = window.innerWidth;
    return {
      pestanas: tabs.length,
      arrastra: fila.scrollWidth > fila.clientWidth + 1,
      // Ninguna puede quedarse cortada por el borde de la pantalla.
      cortadas: tabs.filter(t => { const x = t.getBoundingClientRect(); return x.right > anchoVentana + 1 || x.left < -1; }).map(t => t.innerText.trim()),
      // Y al envolver tienen que quedar en más de una fila.
      filas: new Set(tabs.map(t => Math.round(t.getBoundingClientRect().top))).size,
    };
  });
  assert.equal(r.pestanas, 7, 'las siete pestañas de GE: ' + JSON.stringify(r));
  assert.equal(r.arrastra, false, 'en móvil no se arrastra, se envuelve: ' + JSON.stringify(r));
  assert.deepEqual(r.cortadas, [], 'ninguna pestaña cortada por el borde: ' + JSON.stringify(r));
  assert.ok(r.filas > 1, 'y ocupan varias filas, que es lo que permite verlas todas: ' + JSON.stringify(r));
});

await caso('Lo mismo en el índice de Mi Negocio', async () => {
  const r = await page.evaluate(async ()=>{
    navigate('minegocio');
    await new Promise(r=>setTimeout(r,700));
    const tira = document.querySelector('#view-minegocio .mn-indice');
    if(!tira) return {sinTira:true};
    const chips = [...tira.querySelectorAll('.mn-indice-chip')];
    const W = window.innerWidth;
    return {chips: chips.length, arrastra: tira.scrollWidth > tira.clientWidth + 1,
      cortados: chips.filter(c => { const x = c.getBoundingClientRect(); return x.right > W + 1 || x.left < -1; }).map(c=>c.innerText.trim())};
  });
  assert.ok(!r.sinTira, 'el índice tiene que existir');
  assert.ok(r.chips > 4, 'con sus apartados: ' + JSON.stringify(r));
  assert.equal(r.arrastra, false, 'envuelve en vez de arrastrarse: ' + JSON.stringify(r));
  assert.deepEqual(r.cortados, [], 'y ninguno se corta: ' + JSON.stringify(r));
});

await caso('El aviso de scroll sigue existiendo para las tiras que sí desbordan', async () => {
  const r = await page.evaluate(async ()=>{
    // Se fuerza una tira estrecha que SÍ desborda, para comprobar que el
    // mecanismo (updateTabRowFade) no se ha perdido por el camino.
    const fila = document.createElement('div');
    fila.className = 'ge-tab-row';
    fila.style.cssText = 'width:120px;flex-wrap:nowrap;overflow-x:auto';
    fila.innerHTML = '<button class="ge-tab">Una</button><button class="ge-tab">Dos</button><button class="ge-tab">Tres</button><button class="ge-tab">Cuatro</button>';
    document.body.appendChild(fila);
    updateTabRowFade(fila);
    const r = {desborda: fila.scrollWidth > fila.clientWidth + 1, avisa: fila.classList.contains('has-scroll-right')};
    fila.remove();
    return r;
  });
  assert.ok(r.desborda, 'la tira de prueba tiene que desbordar: ' + JSON.stringify(r));
  assert.ok(r.avisa, 'y el aviso tiene que ponerse solo: ' + JSON.stringify(r));
});

await caso('Ningún error de JavaScript en todo el recorrido', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(68));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
