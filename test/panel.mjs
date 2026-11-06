// Panel de Control (2/11): gráfico de curva con área (Ventas / Gastos / Resultado), puntos que se tocan, hora punta y sin desbordes.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
async function abrir(w, h){
  const page = await browser.newPage();
  await page.setViewport({width:w, height:h, isMobile:w < 500, hasTouch:w < 1000});
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|nominatim|zippopotam/.test(r.url()) ? r.abort() : r.continue());
  await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
  await page.evaluate(() => {
    localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'PANEL001', tenantId: ggBizTenantId('PANEL001')}));
    localStorage.setItem('gastrogoan_owner_login', '1'); localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted', '1'); localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
  });
  await page.reload({waitUntil:'domcontentloaded'}); await new Promise(r => setTimeout(r, 2000));
  await page.evaluate(async () => {
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id => document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    DB.sales.length = 0; let k = 1; const now = Date.now();
    for(let d = 0; d < 330; d++){ for(let j = 0; j < 3; j++){ const dt = new Date(now - d * 864e5); dt.setHours(13 + j * 3, 5); const tot = 20 + (d % 9) * 7 + j * 5; DB.sales.push({id:k++, date:dt.toISOString().slice(0,10), createdAt:dt.toISOString(), total:tot, items:[{name:'Plato', price:tot, qty:1}], pagos:[{amount:tot, metodoPago:'Efectivo'}]}); } }
    currentFolder = 'gestion'; ownerUnlocked = true; navigate('dashboard'); await new Promise(r => setTimeout(r, 1300));
  });
  return {page, errs};
}
await caso('El año es UNA tarjeta con pestañas y una curva de 12 puntos; la última es el mes en curso (parcial)', async () => {
  const {page, errs} = await abrir(1280, 900);
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms));
    const out = {viejas: document.querySelectorAll('#dashboard-trend-ventas,#dashboard-trend-gastos,#dashboard-trend-resultado').length, puntos: document.querySelectorAll('#dt-anual .dt-punto').length, parcial: document.querySelectorAll('#dt-anual .dt-punto.parcial').length, tabs: document.querySelectorAll('.dt-tabs .btn').length, tags: document.querySelectorAll('#dt-anual .dt-tag').length};
    out.titular1 = document.querySelector('.dt-titular b').textContent;
    document.querySelectorAll('.dt-tabs .btn')[1].click(); await esp(200); out.titular2 = document.querySelector('.dt-titular b').textContent;
    document.querySelectorAll('.dt-tabs .btn')[2].click(); await esp(200); out.sel = document.querySelectorAll('.dt-tabs .is-on').length;
    document.querySelectorAll('.dt-tabs .btn')[0].click(); await esp(200);
    document.querySelectorAll('#dt-anual .dt-punto')[3].click(); await esp(100); out.alTocar = document.querySelector('.dt-titular').textContent.replace(/\s+/g, ' ').trim();
    out.hora = !!document.querySelector('.dt-pico b') && document.querySelectorAll('#dt-horas .dt-punto').length === 24;
    return out;
  });
  assert.equal(r.viejas, 0); assert.equal(r.puntos, 12); assert.equal(r.parcial, 1); assert.equal(r.tabs, 3); assert.ok(r.tags >= 2, JSON.stringify(r));
  assert.notEqual(r.titular1, r.titular2, 'cada pestaña cambia la cifra: ' + JSON.stringify(r)); assert.equal(r.sel, 1);
  assert.match(r.alTocar, /€.*\d{4}/, 'tocar un punto pone su mes y su cifra: ' + r.alTocar); assert.ok(r.hora, JSON.stringify(r));
  assert.deepEqual(errs, []); await page.close();
});
await caso('Sin desbordes ni letra pequeña en 5 anchos, y los puntos se pueden tocar con el dedo (≥ 44 px de alto)', async () => {
  for(const [w, h] of [[1280,900],[430,932],[390,844],[360,740],[320,700]]){
    const {page} = await abrir(w, h);
    const r = await page.evaluate(() => {
      const mal = [];
      if(document.documentElement.scrollWidth - document.documentElement.clientWidth > 1) mal.push('la página se desplaza de lado');
      document.querySelectorAll('#view-dashboard .dt-wrap *').forEach(e => { const q = e.getBoundingClientRect(); if(q.width && q.right > innerWidth + 1 && !e.closest('svg')) mal.push('sale de la pantalla: ' + e.className); });
      const p = document.querySelector('#dt-anual .dt-punto'); if(p.getBoundingClientRect().height < 44) mal.push('punto de ' + p.getBoundingClientRect().height + ' px');
      document.querySelectorAll('#dt-anual .dt-ejes span:not(.oculto),#dt-anual .dt-tag').forEach(e => { if(parseFloat(getComputedStyle(e).fontSize) < 11) mal.push('letra de ' + getComputedStyle(e).fontSize); });
      const ejes = [...document.querySelectorAll('#dt-anual .dt-ejes span')]; ejes.forEach(e => { if(e.scrollWidth > e.clientWidth + 1) mal.push('mes cortado: ' + e.textContent); });
      return mal;
    });
    assert.deepEqual(r, [], `${w}px: ` + r.join(' | ')); await page.close();
  }
});
console.log(fallos ? `\n❌ ${fallos} caso(s) fallaron` : '\n✅ todos los casos pasaron'); if(fallos) process.exitCode = 1;
await browser.close();
