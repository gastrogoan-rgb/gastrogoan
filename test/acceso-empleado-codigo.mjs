// ACCESO DE EMPLEADOS: el código de negocio se recuerda y SE VE (12/11, pedido del dueño: «una vez lo has puesto, después no sale nada para seleccionarlo»).
// Antes solo había un <datalist> del navegador pegado al campo (casi invisible en móvil). Ahora salen botones con el nombre del negocio (un toque lo elige).
// ⚠️ El campo NO se rellena solo (decisión del 9/09: el empleado elige); lo vigila también codigo-negocio-recordado.mjs.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const w = ms => new Promise(r => setTimeout(r, ms));
async function abrir(ancho, recientes, nombres){
  const page = await browser.newPage(); await page.setViewport({width:ancho,height:800,isMobile:ancho<500,hasTouch:ancho<1000});
  page.errs = []; page.on('pageerror', e => page.errs.push(e.message));
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|raw.githubusercontent/.test(r.url()) ? r.abort() : r.continue());
  await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'}); await w(1200);
  await page.evaluate((rec, nom) => { localStorage.clear(); localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10)); if(rec) localStorage.setItem('gastrogoan_recent_emp_codes', JSON.stringify(rec)); if(nom) localStorage.setItem('gastrogoan_recent_emp_names', JSON.stringify(nom)); }, recientes, nombres);
  await page.goto('about:blank'); await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'}); await w(4200);
  await page.evaluate(() => setAccessScreenMode('employee')); await w(1300);   // deja acabar la animación de entrada de la tarjeta (escala) antes de medir
  return page;
}
const estado = p => p.evaluate(() => ({codigo: document.getElementById('acc-emp-code').value, chips: [...document.querySelectorAll('#acc-biz-chips .acc-biz-chip')].map(b => b.innerText.replace(/\s+/g, ' ').trim()), sel: [...document.querySelectorAll('#acc-biz-chips .is-sel')].map(b => b.dataset.code)}));

let p = await abrir(1280, ['CASAPAC1', 'BARLUIS2'], {CASAPAC1: 'Casa Paco', BARLUIS2: 'Bar Luis'});
await caso('Los negocios recordados salen como botones con su NOMBRE y el campo NO se rellena solo ni marca ninguno', async () => {
  const e = await estado(p);
  assert.equal(e.codigo, ''); assert.deepEqual(e.sel, []);
  assert.ok(e.chips[0].includes('Casa Paco') && e.chips[0].includes('CASAPAC1'), JSON.stringify(e.chips)); assert.ok(e.chips[1].includes('Bar Luis'));
  assert.ok(/Otro negocio/.test(e.chips[2]), JSON.stringify(e.chips));
});
await caso('Tocar un negocio rellena el código, marca el botón y pasa al campo que falta', async () => {
  await p.evaluate(() => document.querySelector('#acc-biz-chips [data-code="BARLUIS2"]').click()); await w(150);
  const e = await estado(p); assert.equal(e.codigo, 'BARLUIS2'); assert.deepEqual(e.sel, ['BARLUIS2']);
  assert.equal(await p.evaluate(() => document.activeElement.id), 'acc-emp-name', 'el foco debe ir al nombre (vacío)');
});
await caso('«Otro negocio» vacía el código y deja escribir uno nuevo', async () => {
  await p.evaluate(() => document.querySelector('#acc-biz-chips [data-code="CASAPAC1"]').click()); await w(100);
  await p.evaluate(() => document.querySelector('#acc-biz-chips .acc-biz-otro').click()); await w(150);
  const e = await estado(p); assert.equal(e.codigo, ''); assert.deepEqual(e.sel, []); assert.equal(await p.evaluate(() => document.activeElement.id), 'acc-emp-code');
});
await caso('Escribir a mano un código recordado también lo marca', async () => {
  await p.evaluate(() => { const i = document.getElementById('acc-emp-code'); i.value = 'casapac1'; i.dispatchEvent(new Event('input', {bubbles: true})); }); await w(100);
  assert.deepEqual((await estado(p)).sel, ['CASAPAC1']);
});
await caso('Recordar un negocio guarda su nombre y lo pone el primero, sin duplicar', async () => {
  await p.evaluate(() => { rememberBusinessCode('BARLUIS2', 'Bar Luis Nuevo'); rememberBusinessCode('NUEVO123', 'La Tasca'); });
  const r = await p.evaluate(() => ({lista: getRecentBusinessCodes(), nombres: getRecentBusinessNames()}));
  assert.deepEqual(r.lista, ['NUEVO123', 'BARLUIS2', 'CASAPAC1']); assert.equal(r.nombres.BARLUIS2, 'Bar Luis Nuevo'); assert.equal(r.nombres.NUEVO123, 'La Tasca');
});
await caso('Sin errores de página', async () => { assert.deepEqual(p.errs, []); });
await p.close();

p = await abrir(1280, null, null);
await caso('Un aparato sin historial: el campo vacío y sin botones (no se inventa nada)', async () => {
  const e = await estado(p); assert.equal(e.codigo, ''); assert.deepEqual(e.chips, []);
});
await p.close();

p = await abrir(360, ['CASAPAC1', 'BARLUIS2', 'LATASCA3'], {CASAPAC1: 'Restaurante Casa Paco y Hermanos de la Costa', BARLUIS2: 'Bar Luis', LATASCA3: 'La Tasca'});
await caso('En móvil (360 px) los botones caben, no desbordan y miden 44 px o más', async () => {
  const r = await p.evaluate(() => { const bs = [...document.querySelectorAll('#acc-biz-chips .acc-biz-chip')].map(b => b.getBoundingClientRect()); return {minAlto: Math.min(...bs.map(b => b.height)), fuera: bs.filter(b => b.right > innerWidth + 1 || b.left < -1).length, scrollX: document.documentElement.scrollWidth > innerWidth}; });
  assert.ok(r.minAlto >= 44, 'botón de ' + r.minAlto + ' px'); assert.equal(r.fuera, 0); assert.equal(r.scrollX, false);
});
await p.close();
await browser.close();
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ todos los casos pasaron');
process.exit(fallos ? 1 : 0);
