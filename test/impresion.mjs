// Impresión de tickets y comandas sin Bluetooth (7/10).
//
// Hasta ahora la única impresión directa era Web Bluetooth, que no existe en
// Safari (iPhone, iPad) ni en Firefox. En un iPad el botón de la térmica ni
// salía, y las impresoras de red, USB o AirPrint no tenían forma de recibir
// un ticket con formato de rollo. Aquí se comprueba:
//   - que sin Bluetooth se ofrece "Navegador" y se AVISA claro (no una nota gris),
//   - que el documento de impresión lleva @page 80 mm (y 58 mm) y los datos escapados,
//   - que comandas y tickets van por ahí,
//   - que si el Bluetooth falla, se cae al navegador avisando.
//
//   bash build.sh && node test/impresion.mjs   (levanta su propio servidor en 8961)
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';

const PUERTO = 8961;
const servidor = spawn('python3', ['-m', 'http.server', String(PUERTO)], {stdio:'ignore'});
await new Promise(r => setTimeout(r, 900));

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const erroresJs = [];
let ok = 0, mal = 0;
async function caso(nombre, fn){
  try{ const d = await fn(); ok++; console.log(`✅ ${nombre}${d ? '  → ' + d : ''}`); }
  catch(e){ mal++; console.log(`❌ ${nombre}\n     ⤷ ${e.message}`); }
}

// conBluetooth: false = Safari/Firefox (sin navigator.bluetooth);
// 'falla' = existe pero el emparejamiento no llega a nada.
async function abrir(conBluetooth){
  const page = await browser.newPage();
  await page.setViewport({width:1280, height:900});
  page.on('pageerror', e => erroresJs.push(e.message));
  await page.evaluateOnNewDocument(modo => {
    // Se borra del prototipo: en Chromium vive ahí, no en el objeto.
    try{ delete Navigator.prototype.bluetooth; }catch(e){}
    if(modo === 'falla'){
      Object.defineProperty(Navigator.prototype, 'bluetooth', {configurable:true, get(){
        return {requestDevice: () => Promise.reject(Object.assign(new Error('nada'), {name:'NotFoundError'}))};
      }});
    }
  }, conBluetooth);
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|githubusercontent/.test(r.url()) ? r.abort() : r.continue());
  await page.goto(`http://localhost:${PUERTO}/dist/index.html`, {waitUntil:'domcontentloaded'});
  await page.evaluate(code => {
    localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
    localStorage.setItem('gastrogoan_owner_login','1');
    localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  }, 'IMPRIM01');
  await page.reload({waitUntil:'domcontentloaded'});
  await new Promise(r => setTimeout(r, 2000));
  await page.evaluate(() => {
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id => document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    // Se recoge cada documento que se manda a imprimir, sin imprimir de verdad.
    window.__impresos = [];
    const original = printViaBrowser;
    window.printViaBrowser = function(c, a, ti, o){
      window.__impresos.push(buildRollPrintHtml(c, a, ti, o));
      return original(c, a, ti, o);
    };
    window.__toasts = [];
    const toastOriginal = showToast;
    window.showToast = function(m){ window.__toasts.push(String(m)); return toastOriginal.apply(this, arguments); };
  });
  return page;
}

const sinBt = await abrir(false);

await caso('Sin Bluetooth, el modo es Navegador y la opción Bluetooth sale desactivada', async () => {
  const r = await sinBt.evaluate(() => {
    const html = renderPrintModeConfig('ticket', {ancho:true});
    const d = document.createElement('div'); d.innerHTML = html;
    const sel = d.querySelector('#print-mode-ticket');
    return {soporte: thermalPrintingSupported(), modo: getPrintMode('ticket'),
      valor: sel && sel.value, btDesactivado: !!d.querySelector('option[value="bluetooth"][disabled]'),
      aviso: !!d.querySelector('#print-no-bt-warning.manual-warning'),
      texto: d.querySelector('#print-no-bt-warning')?.textContent || ''};
  });
  assert.equal(r.soporte, false);
  assert.equal(r.modo, 'browser');
  assert.equal(r.valor, 'browser');
  assert.ok(r.btDesactivado, 'la opción Bluetooth debería estar desactivada');
  assert.ok(r.aviso, 'falta el aviso destacado');
  assert.match(r.texto, /AirPrint/, 'el aviso debe decir qué hacer en iPad');
  return 'aviso destacado con AirPrint';
});

await caso('Aunque alguien guardara "bluetooth", sin soporte se imprime por navegador', async () => {
  const n = await sinBt.evaluate(async () => {
    localStorage.setItem('gg_print_mode_ticket', 'bluetooth');
    window.__impresos = [];
    await printToThermalPrinter('PRUEBA', 'ticket');
    return window.__impresos.length;
  });
  assert.equal(n, 1);
});

await caso('El ticket de una venta sale con @page 80 mm y los datos escapados', async () => {
  const r = await sinBt.evaluate(async () => {
    const venta = {id: 7001, date: '2026-10-07', createdAt: '2026-10-07T13:00:00', total: 12, tipo:'mesa',
      clienteNombre: '<img src=x onerror=alert(1)>', metodoPago:'Tarjeta',
      items: [{name:'Bravas <script>alert(2)</script> & alioli', qty:1, price:12, ivaPct:10, recipeId:null}]};
    DB.sales.push(venta);
    window.__impresos = [];
    localStorage.removeItem('gg_print_width_ticket');
    await printToThermalPrinter(buildTicketText(venta), 'ticket');
    const html = window.__impresos[0] || '';
    const marco = document.getElementById('gg-print-frame');
    return {html, marco: !!marco, enMarco: marco ? marco.contentDocument.documentElement.outerHTML : ''};
  });
  assert.match(r.html, /@page\{size:80mm auto;margin:0\}/);
  assert.ok(!r.html.includes('<script>alert(2)'), 'un nombre de plato con <script> no puede salir tal cual');
  assert.ok(!r.html.includes('<img src=x'), 'el nombre del cliente no puede salir tal cual');
  assert.ok(r.html.includes('&lt;script&gt;alert(2)&lt;/script&gt; &amp; alioli'), 'el plato debe salir escapado');
  assert.ok(r.marco, 'se imprime en un iframe dentro de la app, no en una ventana nueva');
  assert.match(r.enMarco, /80mm/);
  return 'iframe con rollo de 80 mm';
});

await caso('Con rollo de 58 mm elegido, la página es de 58 mm', async () => {
  const html = await sinBt.evaluate(async () => {
    setTicketPaperWidth('58');
    window.__impresos = [];
    await printToThermalPrinter('X', 'ticket');
    setTicketPaperWidth('80');
    return window.__impresos[0] || '';
  });
  assert.match(html, /@page\{size:58mm auto;margin:0\}/);
});

await caso('La comanda sale por el navegador en rollo, con alérgenos destacados y escapados', async () => {
  const html = await sinBt.evaluate(() => {
    window.__impresos = [];
    printComandaTicket('COCINA', 'Mesa 4', [{qty:2, name:'Tortilla <b>x</b>', notas:'sin "sal"'}], 58, 'Gluten <i>', 123);
    return window.__impresos[0] || '';
  });
  assert.match(html, /@page\{size:58mm auto/);
  assert.ok(html.includes('Tortilla &lt;b&gt;x&lt;/b&gt;'));
  assert.ok(html.includes('Gluten &lt;i&gt;'));
});

await caso('Cajón con impresión de navegador: se dice que no se puede abrir', async () => {
  const r = await sinBt.evaluate(async () => {
    window.__toasts = [];
    const abierto = await openCashDrawer({silent:false});
    return {abierto, toast: window.__toasts.join(' | '), esperado: t('print.drawerBrowser')};
  });
  assert.equal(r.abierto, false);
  assert.ok(r.toast.includes(r.esperado));
});
await sinBt.close();

const btFalla = await abrir('falla');
await caso('Con Bluetooth que falla, cae al navegador avisando', async () => {
  const r = await btFalla.evaluate(async () => {
    localStorage.removeItem('gg_print_mode_ticket');
    window.__impresos = []; window.__toasts = [];
    const modo = getPrintMode('ticket');
    await printToThermalPrinter('TICKET', 'ticket');
    return {modo, impresos: window.__impresos.length, toasts: window.__toasts.join(' | '), esperado: t('print.fallbackBrowser')};
  });
  assert.equal(r.modo, 'bluetooth');
  assert.equal(r.impresos, 1);
  assert.ok(r.toasts.includes(r.esperado), 'falta el aviso de la caída: ' + r.toasts);
});
await caso('Con Bluetooth disponible se puede elegir Navegador en este aparato', async () => {
  const r = await btFalla.evaluate(async () => {
    setPrintMode('ticket', 'browser');
    window.__impresos = []; window.__toasts = [];
    await printToThermalPrinter('TICKET', 'ticket');
    const modo = getPrintMode('ticket');
    localStorage.removeItem('gg_print_mode_ticket');
    return {modo, impresos: window.__impresos.length, toasts: window.__toasts.length};
  });
  assert.equal(r.modo, 'browser');
  assert.equal(r.impresos, 1);
  assert.equal(r.toasts, 0, 'eligiendo navegador no hay nada que avisar');
});
await btFalla.close();

await caso('Ningún error de JavaScript', async () => {
  assert.deepEqual(erroresJs, []);
});

await browser.close();
servidor.kill();
// todo.sh busca "todos los casos de impresión pasaron": con un fallo no
// puede salir esa frase (un "7 de 9 casos pasaron" la daría por buena).
console.log(mal ? `\n❌ ${mal} de ${ok + mal} casos fallaron` : `\n✅ ${ok} — todos los casos de impresión pasaron`);
process.exit(mal ? 1 : 0);
