// «ATRÁS» EN TODA LA APP (8/11): cada pantalla —y cada página dentro de una pantalla— es una entrada del historial. El «atrás» del
// navegador o del móvil reabre la anterior (con su pestaña y su scroll) en vez de cambiar solo la dirección.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
page.on('dialog', d => d.dismiss().catch(() => {}));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.setViewport({width:1280, height:800});
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(() => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'ATRAS001', tenantId: ggBizTenantId('ATRAS001')}));
  localStorage.setItem('gastrogoan_owner_login', '1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r => setTimeout(r, 2200));
await page.evaluate(() => {
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate','app-splash'].forEach(id => document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  DB.purchaseOrders.push({id: 777, supplier: 'Proveedor Z', date: todayStr(), estado: 'BORRADOR', items: [{name: 'Aceite', qty: 2, unit: 'L', price: 5}]});
  currentFolder = 'gestion'; ownerUnlocked = true; navigate('dashboard');
});
const w = ms => new Promise(r => setTimeout(r, ms));
await w(500);
const vista = () => page.evaluate(() => (document.querySelector('.view.active') || {}).id);
const atras = async () => { await page.evaluate(() => history.back()); await w(500); };
const adelante = async () => { await page.evaluate(() => history.forward()); await w(500); };
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }

await caso('Pantalla → otra pantalla → «atrás» vuelve a la primera (y «adelante» a la segunda)', async () => {
  await page.evaluate(() => navigate('pedidos')); await w(300);
  assert.equal(await vista(), 'view-pedidos');
  await atras(); assert.equal(await vista(), 'view-dashboard');
  await adelante(); assert.equal(await vista(), 'view-pedidos');
  await atras();
});
await caso('Una cadena de cuatro pantallas se deshace de una en una', async () => {
  await page.evaluate(() => { navigate('clientes'); }); await w(200);
  await page.evaluate(() => { navigate('reservas'); }); await w(200);
  await page.evaluate(() => { navigate('horarios'); }); await w(200);
  const orden = [];
  for(let i = 0; i < 3; i++){ await atras(); orden.push(await vista()); }
  assert.deepEqual(orden, ['view-reservas', 'view-clientes', 'view-dashboard']);
});
await caso('Dentro de Pedidos: abrir un pedido y «atrás» vuelve a la lista, no a la pantalla anterior de la app', async () => {
  await page.evaluate(() => navigate('pedidos')); await w(300);
  await page.evaluate(() => openPedido(777)); await w(300);
  assert.equal(await page.evaluate(() => pedidoDetailId), 777);
  await atras();
  assert.equal(await vista(), 'view-pedidos'); assert.equal(await page.evaluate(() => pedidoDetailId), null);
  await atras(); assert.equal(await vista(), 'view-dashboard');
});
await caso('Clientes: de la lista al historial de vales y «atrás» a la lista', async () => {
  await page.evaluate(() => navigate('clientes')); await w(300);
  await page.evaluate(() => clIr('vales')); await w(300);
  assert.equal(await page.evaluate(() => clientesPantalla), 'vales');
  await atras(); assert.equal(await page.evaluate(() => clientesPantalla), 'lista'); assert.equal(await vista(), 'view-clientes');
  await atras(); assert.equal(await vista(), 'view-dashboard');
});
await caso('Manual: portada → grupo → tema, y «atrás» sube un nivel cada vez', async () => {
  await page.evaluate(() => { manualDirecto = false; navigate('manual'); }); await w(300);
  await page.evaluate(() => manualAbrirArea('sala')); await w(200);
  await page.evaluate(() => goManualChapter(MANUAL_CHAPTERS.findIndex(c => c.id === 'tpv'))); await w(200);
  const est = () => page.evaluate(() => [manualArea, manualChapter >= 0]);
  assert.deepEqual(await est(), ['sala', true]);
  await atras(); assert.deepEqual(await est(), ['sala', false]);
  await atras(); assert.deepEqual(await est(), [null, false]);
  await atras(); assert.equal(await vista(), 'view-dashboard');
});
await caso('Vuelve con la pestaña donde estabas (Gestión Económica › Cuenta de Resultados) y por el scroll donde iba', async () => {
  await page.evaluate(() => navigate('economia')); await w(500);
  await page.evaluate(() => GE.tab('cdr')); await w(300);
  await page.evaluate(() => { const c = document.querySelector('.content'); c.style.minHeight = '3000px'; document.querySelector('#view-economia').style.minHeight = '3000px'; c.scrollTop = 240; window.__sc = c.scrollTop; }); await w(200);
  await page.evaluate(() => navigate('stock')); await w(300);
  await atras(); await w(700);
  const r = await page.evaluate(() => ({v: document.querySelector('.view.active').id, tab: (document.querySelector('#view-economia .ge-tab-panel.active') || {}).id, y: document.querySelector('.content').scrollTop, guardado: window.__sc}));
  assert.equal(r.v, 'view-economia'); assert.equal(r.tab, 'ge-cdr'); assert.ok(r.guardado > 50 && Math.abs(r.y - r.guardado) < 5, 'scroll ' + JSON.stringify(r));
  await atras();
});
await caso('Dentro de una carpeta: Cocina → Stock → «atrás» vuelve a la carpeta Cocina, no a Inicio', async () => {
  await page.evaluate(() => { navigate('home'); }); await w(200);
  await page.evaluate(() => { openFolder('cocina'); }); await w(300);
  await page.evaluate(() => { navigate('stock'); }); await w(300);
  await atras();
  const r = await page.evaluate(() => ({v: document.querySelector('.view.active').id, f: currentFolder}));
  assert.deepEqual(r, {v: 'view-folder', f: 'cocina'});
});
await caso('Ningún error de JavaScript', async () => { assert.deepEqual(errs, []); });
await browser.close();
console.log(fallos ? `\n❌ ${fallos} caso(s) fallaron` : '\n✅ todos los casos pasaron'); process.exit(fallos ? 1 : 0);
