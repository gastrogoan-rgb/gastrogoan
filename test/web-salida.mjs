// Web pública de pedidos: si el cliente tiene el carrito o sus datos a medias y cierra o recarga la página, el navegador avisa. No avisa con el carrito vacío ni al saltar a pagar a Stripe.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const page = await browser.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|workers\.dev/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/reservagastrogoan.html?neg=pubsalida1', {waitUntil: 'domcontentloaded'});
await new Promise(r => setTimeout(r, 1200));
await page.evaluate(() => { window.__ggForzarAvisoSalida = true; });
const sale = () => page.evaluate(() => { const e = new Event('beforeunload', {cancelable: true}); window.dispatchEvent(e); return e.defaultPrevented; });
await caso('Carrito vacío y sin datos: se puede salir sin aviso', async () => { await page.evaluate(() => { cart = []; yendoAPagar = false; }); assert.equal(await sale(), false); });
await caso('Con platos en el carrito: el navegador avisa antes de cerrar o recargar', async () => { await page.evaluate(() => { cart = [{key: 'a', recipeId: 1, sectionId: 1, name: 'Plato', price: 5, qty: 1}]; }); assert.equal(await sale(), true); });
await caso('Al saltar a la página de pago (Stripe) NO avisa', async () => { await page.evaluate(() => { yendoAPagar = true; }); assert.equal(await sale(), false); });
await caso('Sin errores de JavaScript', async () => { assert.deepEqual(errs.filter(e => !/firebase|network|Failed to fetch/i.test(e)), []); });
await browser.close();
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ la web de pedidos avisa al salir con algo a medias');
process.exit(fallos ? 1 : 0);
