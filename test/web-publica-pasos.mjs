// WEB PÚBLICA 2.0 (6/11): reservas y pedidos por pasos, cabecera que se adapta al logo, menús y carta navegables.
// Lo que fija: que un logo oscuro/claro SIEMPRE se vea, que cada paso valide lo suyo y no deje avanzar, que un fallo en
// un paso anterior devuelva al cliente a él, que Menús y Carta sean dos vistas, que no haya scroll lateral en ningún
// ancho y paso, y que los textos nuevos estén en es/ca/en (y que el aviso del email no prometa lo que no se hace).
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {semilla, LOGO_OSCURO, LOGO_CLARO} from './_semilla-publica.mjs';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/reservagastrogoan.html', {waitUntil:'domcontentloaded'});
await new Promise(r => setTimeout(r, 600));
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const w = ms => new Promise(r => setTimeout(r, ms));
const arrancar = (opts = {}, lang = 'es') => page.evaluate((s, lang) => {
  localStorage.setItem('gastrogoan_lang', lang);
  window.DB = DB = s; window.db = db = {ref: () => ({on(){}, off(){}, once: () => Promise.resolve({val: () => null}), set: () => Promise.resolve(), transaction: () => Promise.resolve({committed:true, snapshot:{val: () => 0}})})};
  businessInfoLoadedOnce = true; setLang(lang); renderHeader(); currentTab = null; renderApp();
}, semilla(opts), lang);
const abrirTab = async tab => { await page.evaluate(tab => { currentTab = tab; renderApp(); }, tab); await w(250); };
const clic = sel => page.evaluate(sel => { const e = document.querySelector(sel); if(!e) throw new Error('no existe ' + sel); e.click(); }, sel);
const paso = () => page.evaluate(() => wzState.step);

await arrancar();

await caso('Cabecera: un logo OSCURO deja la franja clara y el nombre legible (antes: tinta sobre tinta)', async () => {
  await arrancar({logo: LOGO_OSCURO}); await w(400);
  const r = await page.evaluate(() => { const h = document.querySelector('header'); const cs = getComputedStyle(h), n = getComputedStyle(document.getElementById('biz-name')); return {oscuro: h.classList.contains('hd-oscuro'), bg: cs.backgroundColor, fg: n.color}; });
  assert.ok(!r.oscuro, 'con un logo negro la franja no puede ser negra: ' + JSON.stringify(r));
  assert.notEqual(r.bg, r.fg, 'el nombre del negocio no puede tener el color del fondo: ' + JSON.stringify(r));
});
await caso('Cabecera: un logo CLARO pasa a franja de tinta con el nombre en blanco', async () => {
  await arrancar({logo: LOGO_CLARO}); await w(400);
  const r = await page.evaluate(() => { const h = document.querySelector('header'); return {oscuro: h.classList.contains('hd-oscuro'), fg: getComputedStyle(document.getElementById('biz-name')).color, bg: getComputedStyle(h).backgroundColor}; });
  assert.ok(r.oscuro && r.fg !== r.bg, JSON.stringify(r));
});
await caso('Cabecera: si el navegador no deja medir el logo (otro dominio) → franja de tinta con placa blanca', async () => {
  await arrancar(); await w(300);
  const placa = await page.evaluate(() => { const c = document.createElement('canvas'); const img = new Image(); img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>'; const orig = CanvasRenderingContext2D.prototype.getImageData; CanvasRenderingContext2D.prototype.getImageData = () => { throw new Error('tainted'); }; ggTonoLogo(img); CanvasRenderingContext2D.prototype.getImageData = orig; const h = document.querySelector('header'); return h.classList.contains('hd-oscuro') && h.classList.contains('hd-placa'); });
  assert.ok(placa, 'sin poder medir debe ir con placa');
});

await caso('RESERVA: tres pasos; no deja pasar sin día y hora, ni sin datos, y el resumen lleva todo', async () => {
  await arrancar(); await abrirTab('reserva');
  assert.equal(await paso(), 1);
  await clic('#wz-next'); await w(150);
  assert.equal(await paso(), 1, 'sin día ni hora no debe avanzar');
  await page.evaluate(() => { const d = addDaysStr(todayStr(), 1); calGoToDay(d); calPickSlot(d, '21:00'); }); await w(200);
  await clic('#wz-next'); await w(300);
  assert.equal(await paso(), 2);
  await clic('#wz-next'); await w(150);
  assert.equal(await paso(), 2, 'sin nombre/teléfono/email no debe avanzar');
  await page.type('#r-name', 'Laura Gómez'); await page.type('#r-phone', '123'); await page.type('#r-email', 'laura@ejemplo.com');
  await clic('#wz-next'); await w(150);
  assert.equal(await paso(), 2, 'un teléfono de 3 cifras no vale');
  await page.$eval('#r-phone', e => e.value = ''); await page.type('#r-phone', '611 22 33 44');
  await clic('#wz-next'); await w(300);
  assert.equal(await paso(), 3);
  const r = await page.evaluate(() => ({txt: document.getElementById('wz-resumen').innerText, sub: getComputedStyle(document.getElementById('r-submit')).display, next: getComputedStyle(document.getElementById('wz-next')).display}));
  assert.match(r.txt, /Laura Gómez/); assert.match(r.txt, /21:00/); assert.match(r.txt, /611 22 33 44/); assert.match(r.txt, /laura@ejemplo\.com/);
  assert.notEqual(r.sub, 'none', 'en el último paso se ve el botón de enviar'); assert.equal(r.next, 'none');
});
await caso('Un error de un paso anterior devuelve al cliente a ese paso (markFieldInvalid)', async () => {
  const antes = await paso(); assert.equal(antes, 3);
  await page.evaluate(() => { clearFieldInvalid(['r-name']); markFieldInvalid('r-name'); });
  assert.equal(await paso(), 2, 'el campo vive en el paso 2');
  await clic('[data-wz-li="3"] button'); await w(200);
  assert.equal(await paso(), 3, 'se puede volver al último paso ya alcanzado');
});
await caso('RESERVA: el selector de personas cambia y acota (1-50) y el aviso del email ya no promete un correo', async () => {
  await arrancar(); await abrirTab('reserva');
  await clic('.pp button:last-child'); await clic('.pp button:last-child');
  assert.equal(await page.$eval('#r-people', e => e.value), '4');
  await page.$eval('#r-people', e => e.value = '1'); await clic('.pp button:first-child');
  assert.equal(await page.$eval('#r-people', e => e.value), '1', 'no baja de 1');
  const hint = await page.evaluate(() => t('email.reserva.hint'));
  assert.ok(!/mandaremos|send the confirmation|enviarem/i.test(hint), 'la app no envía correos al cliente: no puede prometerlos → ' + hint);
});

await caso('Cabecera: dirección, horario, teléfono Y email se ven; teléfono y email son enlaces; la barra de servicios queda centrada en PC', async () => {
  await arrancar(); await page.setViewport({width: 1280, height: 900}); await abrirTab('reserva');
  const r = await page.evaluate(() => ({
    info: document.getElementById('biz-info').innerText.toLowerCase(),
    tel: document.querySelector('#biz-info a.hi-phone')?.getAttribute('href'), mail: document.querySelector('#biz-info a.hi-mail')?.getAttribute('href'),
    tabs: (() => { const t = document.querySelector('.tabs').getBoundingClientRect(); return {izq: Math.round(t.left), der: Math.round(innerWidth - t.right)}; })()}));
  assert.ok(r.info.includes('hola@casapaco.es') && r.info.includes('611222333') && r.info.includes('calle mayor'), r.info);
  assert.equal(r.tel, 'tel:611222333'); assert.equal(r.mail, 'mailto:hola@casapaco.es');
  assert.ok(Math.abs(r.tabs.izq - r.tabs.der) <= 2, 'la barra de servicios debe quedar centrada: ' + JSON.stringify(r.tabs));
});
await caso('PEDIDO: «Continuar» dice lo que falta (vacío, mínimo) y lleva el total; no deja pasar con el carrito vacío', async () => {
  await arrancar(); await abrirTab('takeaway');
  const vacio = await page.evaluate(() => { const n = document.getElementById('wz-next'); return {dis: n.disabled, txt: n.textContent}; });
  assert.ok(vacio.dis && /Añade algo/.test(vacio.txt), JSON.stringify(vacio));
  await page.evaluate(() => { menuSetModo('carta'); });
  await clic('.cs-tile'); await w(250);
  await clic('.dish .qc-add'); await w(150);   // Agua 2,00 € (mínimo 12)
  const min = await page.evaluate(() => { const n = document.getElementById('wz-next'); return {dis: n.disabled, txt: n.textContent}; });
  assert.ok(min.dis && /Faltan/.test(min.txt), 'bajo el mínimo debe avisar: ' + JSON.stringify(min));
  for(let i = 0; i < 5; i++){ await clic('.dish .qty-ctl button:last-child'); await w(80); }
  const ok = await page.evaluate(() => { const n = document.getElementById('wz-next'); return {dis: n.disabled, txt: n.textContent}; });
  assert.ok(!ok.dis && /12,00/.test(ok.txt), JSON.stringify(ok));
});
await caso('MENÚS y CARTA son dos vistas: los menús en tarjetas, la carta en carpetas con entrar/salir y buscador', async () => {
  await arrancar(); await abrirTab('takeaway');
  const m = await page.evaluate(() => ({tarjetas: document.querySelectorAll('.mn-card').length, carpetas: document.querySelectorAll('.cs-tile').length, seg: document.querySelectorAll('.seg button').length}));
  assert.equal(m.tarjetas, 2); assert.equal(m.carpetas, 0); assert.equal(m.seg, 2);
  await page.evaluate(() => menuSetModo('carta')); await w(150);
  const c = await page.evaluate(() => ({tarjetas: document.querySelectorAll('.mn-card').length, carpetas: document.querySelectorAll('.cs-tile').length, buscador: !!document.getElementById('menu-search'), cuenta: [...document.querySelectorAll('.cs-n')].map(e => e.textContent)}));
  assert.equal(c.tarjetas, 0); assert.equal(c.carpetas, 5); assert.ok(c.buscador); assert.ok(c.cuenta.some(x => /3 platos/.test(x)), JSON.stringify(c.cuenta));
  await clic('.cs-tile'); await w(200);
  assert.ok(await page.evaluate(() => !!document.querySelector('.fd-head') && document.querySelectorAll('.dish').length > 0), 'dentro de la carpeta hay cabecera y platos');
  await clic('.fd-head .menu-back-btn'); await w(150);
  assert.equal(await page.evaluate(() => document.querySelectorAll('.cs-tile').length), 5, 'volver deja la carta como estaba');
  await page.type('#menu-search', 'tarta'); await w(200);
  const b = await page.evaluate(() => [...document.querySelectorAll('.dish .name')].map(e => e.textContent.trim()));
  assert.deepEqual(b, ['Tarta de queso']);
  await page.$eval('#menu-search', e => { e.value = ''; e.dispatchEvent(new Event('input')); });
  await page.type('#menu-search', 'zzzz'); await w(200);
  assert.ok(await page.evaluate(() => /Ningún plato coincide/.test(document.getElementById('menu-results').innerText)));
});
await caso('Un menú se abre entero en su hoja, con su total, y se añade al pedido con la opción elegida', async () => {
  await arrancar(); await abrirTab('takeaway');
  await clic('.mn-card'); await w(250);
  const h = await page.evaluate(() => ({hoja: document.getElementById('modal-overlay').classList.contains('is-sheet'), pasos: document.querySelectorAll('.sh-g').length, btn: document.getElementById('mn-add').textContent}));
  assert.ok(h.hoja && h.pasos === 3 && /14,90/.test(h.btn), JSON.stringify(h));
  await page.evaluate(() => document.querySelector('input[name="menu-grupo-2"][value="104"]').click()); await w(100);
  assert.match(await page.$eval('#mn-add', e => e.textContent), /17,90/, 'el suplemento del entrecot se suma al botón');
  await clic('#mn-add'); await w(250);
  const c = await page.evaluate(() => ({lineas: cart.length, precio: cart[0].price, nombre: cart[0].modificadores.map(m => m.nombre).join('|'), cerrada: !document.getElementById('modal-overlay').classList.contains('active')}));
  assert.equal(c.lineas, 1); assert.equal(c.precio, 17.9); assert.match(c.nombre, /Entrecot/); assert.ok(c.cerrada);
});
await caso('PEDIDO delivery: pide dirección y código postal, rechaza un CP fuera de zona y resume la entrega', async () => {
  await arrancar(); await abrirTab('delivery');
  await page.evaluate(() => { menuSetModo('menus'); }); await clic('.mn-card'); await w(200); await clic('#mn-add'); await w(200);
  await clic('#wz-next'); await w(300);
  assert.equal(await paso(), 2);
  await clic('#wz-next'); await w(150);
  assert.equal(await paso(), 2, 'sin dirección ni CP no avanza');
  await page.type('#o-name', 'Laura Gómez'); await page.type('#o-phone', '611 22 33 44'); await page.type('#o-address', 'Calle Alcalá 100'); await page.type('#o-cp', '99999');
  await page.evaluate(() => { document.getElementById('o-time').value = '21:00'; });
  await clic('#wz-next'); await w(200);
  assert.equal(await paso(), 2, 'un CP fuera de zona no deja avanzar');
  await page.$eval('#o-cp', e => e.value = ''); await page.type('#o-cp', '28001');
  await clic('#wz-next'); await w(300);
  assert.equal(await paso(), 3);
  const r = await page.evaluate(() => document.getElementById('wz-resumen').innerText + ' | ' + document.getElementById('cart-summary').innerText);
  assert.match(r, /Calle Alcalá 100/); assert.match(r, /28001/); assert.match(r, /Menú del día/); assert.match(r, /Coste de envío|Envío/i);
});
await caso('PEDIDO: la hora se elige con un toque entre los huecos reales del día («Cuanto antes» primero) y respeta el horario', async () => {
  await arrancar(); await abrirTab('takeaway');
  await page.evaluate(() => { const d = addDaysStr(todayStr(), 1); document.getElementById('o-date').value = d; updateOrderSlots(); });
  const r = await page.evaluate(() => { const bs = [...document.querySelectorAll('#o-slots button')].map(b => b.textContent.replace(/\s+/g, ' ').trim()); return {n: bs.length, primero: bs[0], todas: bs}; });
  assert.ok(r.n >= 2 && /Cuanto antes 13:00/.test(r.primero), 'mañana abre a las 13:00: ' + JSON.stringify(r));
  assert.ok(r.todas.every(x => /(1[3-5]|20|21|22|23):\d\d|13:00/.test(x)), 'solo horas dentro del horario: ' + JSON.stringify(r.todas));
  await page.evaluate(() => document.querySelectorAll('#o-slots button')[2].click());
  assert.equal(await page.$eval('#o-time', e => e.value), '13:30', 'tocar un hueco rellena la hora');
  assert.equal(await page.$eval('#o-slots button.on', e => e.textContent.trim()), '13:30');
});
await caso('Efectos: el paso lleva su etiqueta «Paso N de 3» y la dirección de la transición; el indicador de pestañas se desliza sobre el MISMO elemento', async () => {
  await page.setViewport({width: 390, height: 860});
  await arrancar(); await abrirTab('reserva');
  const a = await page.evaluate(() => { window.__tabs = document.querySelector('.tabs'); return {eye: document.querySelector('.wz-step:not([hidden]) .wz-eye').innerText.trim().toLowerCase(), i: getComputedStyle(__tabs).getPropertyValue('--i').trim()}; });
  assert.match(a.eye, /paso 1 de 3/); assert.equal(a.i, '0');
  await page.evaluate(() => setTab('delivery')); await w(300);
  const b = await page.evaluate(() => ({mismo: document.querySelector('.tabs') === window.__tabs, i: getComputedStyle(window.__tabs).getPropertyValue('--i').trim()}));
  assert.ok(b.mismo, 'las pestañas no se recrean al cambiar (si no, el indicador no puede deslizarse)'); assert.equal(b.i, '2');
  await page.evaluate(() => { menuSetModo('menus'); document.querySelector('.mn-card').click(); }); await w(200);
  await page.evaluate(() => document.getElementById('mn-add').click()); await w(200);
  await page.evaluate(() => document.getElementById('wz-next').click()); await w(200);
  assert.equal(await page.evaluate(() => document.querySelector('.wz-step:not([hidden])').dataset.dir), 'fw', 'ir adelante entra por la derecha');
  await page.evaluate(() => document.getElementById('wz-back').click()); await w(200);
  assert.equal(await page.evaluate(() => document.querySelector('.wz-step:not([hidden])').dataset.dir), 'bk', 'volver entra por la izquierda');
  await page.setViewport({width: 1280, height: 900});
});
await caso('Efectos: con «reducir movimiento» no se anima nada (cabecera, pasos, resumen, carrito)', async () => {
  await page.emulateMediaFeatures([{name: 'prefers-reduced-motion', value: 'reduce'}]);
  await arrancar(); await abrirTab('reserva'); await w(150);
  const r = await page.evaluate(() => [document.querySelector('header h1'), document.querySelector('.wz-step:not([hidden])'), document.querySelector('.wz-step:not([hidden]) .wz-h'), document.querySelector('.wz-eye'), document.querySelector('.tabs')].map(e => getComputedStyle(e).animationName));
  await page.emulateMediaFeatures([{name: 'prefers-reduced-motion', value: 'no-preference'}]);
  assert.ok(r.every(x => x === 'none'), 'animaciones con movimiento reducido: ' + JSON.stringify(r));
});
await caso('Textos: cada clave wz.* existe en es, ca y en, y los tres idiomas pintan los pasos', async () => {
  const r = await page.evaluate(() => { const ks = Object.keys(I18N.es).filter(k => k.startsWith('wz.')); return {n: ks.length, faltan: ['ca', 'en'].map(l => ks.filter(k => !I18N[l][k])).flat()}; });
  assert.ok(r.n > 60 && !r.faltan.length, JSON.stringify(r));
  for(const lang of ['es', 'ca', 'en']){
    await arrancar({}, lang); await abrirTab('reserva');
    const txt = await page.evaluate(() => document.querySelector('.wz-prog').innerText + ' ' + document.querySelector('.wz-h').innerText);
    assert.ok(txt.length > 20 && !/wz\./.test(txt), lang + ': ' + txt);
  }
});
await caso('Sin scroll lateral ni letra por debajo de 11 px en 5 móviles, tablet y PC, en cada paso de reserva y pedido (es/ca/en)', async () => {
  const malos = [];
  for(const lang of ['es', 'ca', 'en']){
    for(const ancho of [320, 360, 390, 412, 430, 768, 1100]){
      await page.setViewport({width: ancho, height: 860});
      for(const tab of ['reserva', 'takeaway', 'delivery']){
        await arrancar({}, lang); await abrirTab(tab);
        for(let st = 1; st <= 3; st++){
          await page.evaluate(st => { wzState.reached = 3; wzState.step = st; wzAplicar(); }, st);
          await w(40);
          const r = await page.evaluate(() => {
            const over = document.documentElement.scrollWidth - document.documentElement.clientWidth;
            const chicos = [...document.querySelectorAll('.wz-step:not([hidden]) *, .wz-nav *, .wz-prog *')].filter(e => e.childNodes.length && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 10.5).length;
            return {over, chicos};
          });
          if(r.over > 1 || r.chicos) malos.push(`${lang} ${ancho} ${tab} paso ${st}: ${JSON.stringify(r)}`);
        }
      }
    }
  }
  await page.setViewport({width: 1280, height: 900});
  assert.deepEqual(malos.slice(0, 6), []);
});
await caso('Objetivos táctiles: Continuar, Atrás, selector y botones de plato miden 44 px o más', async () => {
  await page.setViewport({width: 390, height: 860});
  await arrancar(); await abrirTab('takeaway'); await page.evaluate(() => menuSetModo('carta')); await clic('.cs-tile'); await w(200);
  const r = await page.evaluate(() => [...document.querySelectorAll('#wz-next, .seg button, .qc-add, .menu-back-btn, .wz-prog button')].filter(e => e.offsetParent).map(e => ({c: e.className || e.id, h: Math.round(e.getBoundingClientRect().height)})).filter(x => x.h < 44));
  await page.setViewport({width: 1280, height: 900});
  assert.deepEqual(r, []);
});
await caso('Ningún error de JavaScript', async () => { assert.deepEqual(errs, []); });
await browser.close();
console.log(fallos ? `\n❌ ${fallos} caso(s) fallaron` : '\n✅ todos los casos pasaron'); process.exit(fallos ? 1 : 0);
