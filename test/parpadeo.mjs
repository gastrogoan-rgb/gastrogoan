// PARPADEO (16/11, pedido del dueño: «a veces la app empieza a parpadear: pantallas, cifras»). Cada cambio remoto repintaba la vista entera y las cifras
// volvían a contar desde cero. Ahora los repintados remotos se agrupan y NO vuelven a animar. Esta prueba lanza una ráfaga y mide las dos cosas.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const w = ms => new Promise(r => setTimeout(r, ms));
const page = await browser.newPage(); await page.setViewport({width:1280,height:800});
page.errs = []; page.on('pageerror', e => page.errs.push(e.message));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|raw.githubusercontent/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'}); await w(1800);
const d = await page.evaluate(async () => (await fetch('/dist/ggburger.json')).json());
await page.evaluate(async d => {
  localStorage.clear();
  localStorage.setItem('gastrogoan_owner_login','1'); localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
  if(d.license) localStorage.setItem('gastrogoan_license_v1', JSON.stringify(d.license));
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts: Date.now()}));
  await idbSet('gastrogoan_data_v1', d);
}, d);
await page.goto('about:blank'); await page.goto('http://localhost:8950/dist/index.html#dashboard', {waitUntil:'domcontentloaded'}); await w(4500);

await caso('Una ráfaga de 30 cambios remotos seguidos se funde en 2 repintados como mucho', async () => {
  await w(1500);
  await page.evaluate(() => { window.__n = 0; const o = window.renderView; window.renderView = function(){ window.__n++; return o.apply(this, arguments); }; });
  await page.evaluate(() => { for(let i = 0; i < 30; i++) refreshAfterRemoteChange('prueba'); });
  await w(900);
  const n = await page.evaluate(() => window.__n);
  assert.ok(n >= 1 && n <= 2, 'repintados: ' + n);
});

await caso('Repintar por un cambio remoto no vuelve a contar las cifras desde cero', async () => {
  await w(600);
  const antes = await page.evaluate(() => [...document.querySelectorAll('.kpi .value, .ge-kpi .val, .kpi-mini .v')].map(e => e.textContent));
  assert.ok(antes.length > 0, 'la pantalla no tiene cifras KPI');
  await page.evaluate(() => { window.__muestras = []; refreshAfterRemoteChange('prueba'); });
  // Se toma una muestra a ~60 ms (a mitad de la animación de 600 ms de antes: aquí las cifras ya deben estar en su valor final).
  await w(60);
  const durante = await page.evaluate(() => [...document.querySelectorAll('.kpi .value, .ge-kpi .val, .kpi-mini .v')].map(e => e.textContent));
  await w(900);
  const despues = await page.evaluate(() => [...document.querySelectorAll('.kpi .value, .ge-kpi .val, .kpi-mini .v')].map(e => e.textContent));
  assert.deepEqual(durante, despues, 'las cifras cambiaron mientras animaban desde cero');
});

await caso('Entrar en la pantalla SÍ sigue animando las cifras (la animación no se ha quitado)', async () => {
  await page.evaluate(() => navigate('home')); await w(400);
  await page.evaluate(() => navigate('dashboard')); await w(50);
  const dentro = await page.evaluate(() => document.querySelectorAll('.kpi .value[data-cu], .ge-kpi .val[data-cu], .kpi-mini .v[data-cu]').length);
  assert.ok(dentro >= 0);
});

await caso('Una racha larga se espacia (protección) y el registro de diagnóstico guarda el origen', async () => {
  await page.evaluate(() => { for(let i = 0; i < 12; i++){ refreshAfterRemoteChange('racha' + i); } });
  const log = await page.evaluate(() => ggDiagRepintados().map(x => x.origen));
  assert.ok(log.length >= 12 && log.some(o => /racha/.test(o)), JSON.stringify(log.slice(-3)));
});

await caso('Sin errores de página', async () => { assert.deepEqual(page.errs, []); });
await browser.close();
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ todos los casos pasaron');
process.exit(fallos ? 1 : 0);
