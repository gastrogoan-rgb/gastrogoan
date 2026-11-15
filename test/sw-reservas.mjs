// La web de reservas y pedidos debe abrir SIN red tras la primera visita (14/11).
// Motivo: los bloqueos de LaLiga a IP de Cloudflare dejaban sin web al cliente en pleno servicio de un sábado.
// Se sirve deploy/reservas/public en la RAÍZ (como en producción) y en 127.0.0.2 (en localhost el service worker se desactiva a propósito).
import puppeteer from 'puppeteer-core';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const srv = spawn('python3', ['-m', 'http.server', '8953', '--bind', '127.0.0.2'], {cwd: 'deploy/reservas/public', stdio: 'ignore'});
await new Promise(r => setTimeout(r, 1500));
const browser = await puppeteer.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'], headless: 'new'});
let fallos = 0;
const caso = async (n, f) => { try{ await f(); console.log('✅', n); }catch(e){ fallos++; console.log('❌', n, '\n   ⤷', String(e.message).split('\n')[0]); } };
const page = await browser.newPage();
await page.setRequestInterception(true);
page.on('request', r => /firebase|gstatic|googleapis|stripe|workers\.dev/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://127.0.0.2:8953/?neg=prueba', {waitUntil: 'domcontentloaded'});
await new Promise(r => setTimeout(r, 4000));
await caso('El service worker de la web de reservas se instala y queda activo', async () => {
  const sw = await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return r ? !!r.active : false; });
  assert.equal(sw, true);
});
const html = await page.evaluate(() => document.documentElement.outerHTML.length);
await page.setOfflineMode(true);
await caso('Sin red, la web se recarga desde la copia guardada (con la misma dirección)', async () => {
  await page.reload({waitUntil: 'domcontentloaded', timeout: 15000});
  await new Promise(r => setTimeout(r, 1500));
  const t = await page.evaluate(() => ({app: !!document.getElementById('app'), len: document.documentElement.outerHTML.length, js: typeof renderApp === 'function'}));
  assert.equal(t.app, true); assert.equal(t.js, true); assert.ok(t.len > html * 0.5, 'documento vacío: ' + t.len);
});
await caso('Sin red, otra dirección de la misma web (otro negocio, otro enlace) también abre', async () => {
  await page.goto('http://127.0.0.2:8953/?neg=otro&mesa=abc', {waitUntil: 'domcontentloaded', timeout: 15000});
  const t = await page.evaluate(() => typeof renderApp === 'function' && !!document.getElementById('app'));
  assert.equal(t, true);
});
await browser.close(); srv.kill();
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ la web de reservas abre sin red tras la primera visita');
process.exit(fallos ? 1 : 0);
