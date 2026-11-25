// Filtro anti-bots de la web de reservas (auditoría 25/11): campo trampa invisible + tiempo mínimo de relleno, SIN dañar a clientes reales ni a
// la accesibilidad. Turnstile se descartó (ver el comentario de wzFiltroBot en reservagastrogoan.html). Falla sin el filtro: el formulario con la
// trampa rellena se enviaba igual y el rápido no esperaba nada.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {semilla} from './_semilla-publica.mjs';

const browser = await puppeteer.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox']});
const page = await browser.newPage(); await page.setViewport({width: 420, height: 900});
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/reservagastrogoan.html', {waitUntil: 'domcontentloaded'});
await new Promise(r => setTimeout(r, 600));
let fallos = 0;
async function caso(n, fn){ try{ const d = await fn(); console.log('✅ ' + n + (d ? '  → ' + d : '')); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const w = ms => new Promise(r => setTimeout(r, ms));
await page.evaluate(s => {
  localStorage.setItem('gastrogoan_lang', 'es');
  window.DB = DB = s; window.db = db = {ref: () => ({on(){}, off(){}, once: () => Promise.resolve({val: () => null}), set: () => Promise.resolve(), push: () => { window.__push = (window.__push || 0) + 1; return Promise.resolve(); }, transaction: () => Promise.resolve({committed: true, snapshot: {val: () => 0}})})};
  businessInfoLoadedOnce = true; setLang('es'); renderHeader(); currentTab = null; renderApp();
}, semilla());
const abrir = async tab => { await page.evaluate(t => { currentTab = t; renderApp(); }, tab); await w(300); };
const alerta = () => page.evaluate(() => { const a = document.getElementById('inline-alert'); return a ? a.textContent : ''; });
const limpiar = () => page.evaluate(() => { document.getElementById('inline-alert')?.remove(); submittingRequest = false; wzEsperando = false; });

await caso('Hay un campo trampa en el formulario de reserva y en el de pedido, FUERA del teclado, de los lectores de pantalla y de la vista (pero no display:none)', async () => {
  for(const tab of ['reserva', 'takeaway', 'delivery']){
    await abrir(tab);
    const m = await page.evaluate(() => {
      const i = document.querySelector('.gg-miel input'); if(!i) return null;
      const w = i.closest('.gg-miel'), r = w.getBoundingClientRect(), cs = getComputedStyle(w);
      return {tab: i.tabIndex, oculto: w.getAttribute('aria-hidden'), izq: parseFloat(cs.left), pos: cs.position, disp: cs.display, vis: cs.visibility, ac: i.autocomplete, nombre: i.name, tieneEtiqueta: !!document.querySelector('label[for="' + i.id + '"]') && !!i.id};
    });
    assert.ok(m, 'falta el campo trampa en ' + tab);
    assert.equal(m.tab, -1, 'el teclado puede llegar al campo trampa'); assert.equal(m.oculto, 'true', 'un lector de pantalla lo leería');
    assert.ok(m.pos === 'absolute' && m.izq <= -5000, 'el campo trampa podría estar a la vista: ' + JSON.stringify(m)); assert.notEqual(m.disp, 'none'); assert.notEqual(m.vis, 'hidden');
    assert.equal(m.ac, 'off'); assert.ok(!/(name|email|phone|tel|address|url|web)/i.test(m.nombre), 'un autorrelleno podría rellenarlo: ' + m.nombre);
  }
});
await caso('Recorriendo la página con Tab NUNCA se llega al campo trampa', async () => {
  await abrir('reserva');
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  for(let i = 0; i < 60; i++){
    await page.keyboard.press('Tab');
    const en = await page.evaluate(() => !!(document.activeElement && document.activeElement.closest('.gg-miel')));
    assert.equal(en, false, 'el foco entró en el campo trampa tras ' + (i + 1) + ' tabulaciones');
  }
});
await caso('Con la trampa rellena NO se envía nada y se avisa (reserva y pedido)', async () => {
  for(const [tab, fn] of [['reserva', 'submitReserva'], ['takeaway', 'submitOrder']]){
    await abrir(tab); await limpiar();
    await page.evaluate(() => { window.__push = 0; document.querySelector('.gg-miel input').value = 'http://spam.example'; wzDesde = 0; });
    if(tab === 'takeaway') await page.evaluate(() => { cart = [{id: 11, name: 'Croquetas', price: 9.5, qty: 1}]; });
    await page.evaluate(fn => window[fn](), fn);
    await w(200);
    assert.match(await alerta(), /No hemos podido enviar/, 'no avisa en ' + tab);
    assert.equal(await page.evaluate(() => window.__push || 0), 0, 'se envió algo a la nube con la trampa rellena');
  }
});
await caso('Un cliente que va MUY rápido no es rechazado: se le hace esperar el resto del tiempo mínimo y entonces se procesa', async () => {
  await abrir('reserva'); await limpiar();
  await page.evaluate(() => { document.querySelector('.gg-miel input').value = ''; wzDesde = Date.now(); window.submitReserva(); });
  await w(600);
  assert.equal(await alerta(), '', 'se procesó antes del tiempo mínimo (un script lo haría al instante)');
  await w(3000);
  assert.ok(/Rellena|campos|obligatorios|completa/i.test(await alerta()) || (await alerta()) !== '', 'tras la espera no se procesó el envío (el cliente real se quedaría colgado)');
});
await caso('Un cliente normal (ya pasó el tiempo) se procesa al instante, sin esperas', async () => {
  await abrir('reserva'); await limpiar();
  await page.evaluate(() => { wzDesde = Date.now() - 20000; submitReserva(); });
  await w(150);
  assert.notEqual(await alerta(), '', 'el envío de un cliente normal se retrasó');
});
await caso('El filtro está en el código y el texto está en es/ca/en; el formulario no pierde el foco ni se desplaza por la trampa', async () => {
  const src = fs.readFileSync('reservagastrogoan.html', 'utf8');
  assert.ok(/function submitReserva\(\)\{[\s\S]{0,200}wzFiltroBot\(submitReserva\)/.test(src), 'submitReserva no pasa por el filtro');
  assert.ok(/async function submitOrder\(\)\{[\s\S]{0,900}wzFiltroBot\(submitOrder\)/.test(src), 'submitOrder no pasa por el filtro');
  assert.equal((src.match(/'wz\.err\.bot':/g) || []).length, 3, 'falta el texto en algún idioma');
  const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(sobra <= 0, 'la trampa crea scroll lateral: ' + sobra);
});
await caso('Sin errores de JavaScript', async () => { assert.deepEqual(errs, []); });
await browser.close();
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ la web de reservas filtra bots baratos sin molestar a nadie');
process.exit(fallos ? 1 : 0);
