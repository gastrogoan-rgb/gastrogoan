// La app de gestión debe abrir y cargar sus datos SIN red una vez instalada (14/11).
// Motivo: bloqueos de LaLiga a Cloudflare. Un restaurante con la app ya abierta en su tablet tiene que seguir sirviendo en un partido.
// Se sirve dist/ en la raíz, como en producción, y en 127.0.0.2 (en localhost el service worker se desactiva a propósito).
import puppeteer from 'puppeteer-core';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const srv = spawn('python3', ['-m', 'http.server', '8954', '--bind', '127.0.0.2'], {cwd: 'dist', stdio: 'ignore'});
await new Promise(r => setTimeout(r, 1500));
const browser = await puppeteer.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'], headless: 'new'});
let fallos = 0;
const caso = async (n, f) => { try{ await f(); console.log('✅', n); }catch(e){ fallos++; console.log('❌', n, '\n   ⤷', String(e.message).split('\n')[0]); } };
const page = await browser.newPage();
await page.setRequestInterception(true);
page.on('request', r => /firebase|gstatic|googleapis|stripe|raw\.githubusercontent/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://127.0.0.2:8954/', {waitUntil: 'domcontentloaded'});
await new Promise(r => setTimeout(r, 6000));
await caso('El service worker de la app se instala y queda activo', async () => {
  assert.equal(await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return r ? !!r.active : false; }), true);
});
await page.setOfflineMode(true);
await caso('Sin red, la app se recarga desde la copia guardada y carga sus datos', async () => {
  await page.reload({waitUntil: 'domcontentloaded', timeout: 15000});
  await new Promise(r => setTimeout(r, 3500));
  const t = await page.evaluate(() => ({db: typeof DB !== 'undefined' && !!DB, ver: typeof GG_BUILD !== 'undefined' ? GG_BUILD : null}));
  assert.equal(t.db, true); assert.ok(t.ver, 'sin sello de versión');
});
await browser.close(); srv.kill();
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ la app abre sin red una vez instalada');
process.exit(fallos ? 1 : 0);
