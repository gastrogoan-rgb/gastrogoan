// «ATRÁS» CON PANELES Y HOJAS (26/11): test/atras.mjs cubre las ventanas (#modal-overlay) y las pantallas, pero hay más cosas
// que se abren ENCIMA de una pantalla y que «atrás» debe cerrar en vez de sacar al hostelero de ella: el panel de chat, la
// ayuda, la campana de avisos, el menú «⋯» y la visita guiada. Y las hojas de Escandallo, que son entradas de historial.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const PUERTO = process.env.PUERTO || 8977;
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
page.on('dialog', d => d.dismiss().catch(() => {}));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.setViewport({width:1280, height:800});
await page.goto(`http://localhost:${PUERTO}/dist/index.html`, {waitUntil:'domcontentloaded'});
await page.evaluate(() => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'ATRAS002', tenantId: ggBizTenantId('ATRAS002')}));
  localStorage.setItem('gastrogoan_owner_login', '1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
});
await page.reload({waitUntil:'domcontentloaded'});
const w = ms => new Promise(r => setTimeout(r, ms));
await w(2200);
await page.evaluate(() => {
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate','app-splash'].forEach(id => document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  DB.ingredients = [{id:1, name:'Merluza', category:'Pescados', unit:'kg', supplier:'', price:14, packQty:1, packPrice:14, iva:10, allergens:[], area:'cocina'}];
  DB.recipes = [{id:11, name:'Merluza al horno', price:16.5, priceBase:15, ivaPct:10, category:'Pescados', consumiblesPct:5, comensales:1, area:'cocina', isBase:false, ingredients:[{type:'ingredient', ingredientId:1, qty:0.2, merma:0}]}];
  DB.recipeCategories = [{name:'Pescados', area:'cocina'}];
  saveDB(); currentFolder = 'cocina'; ownerUnlocked = true; navigate('dashboard');
});
await w(500);
const vista = () => page.evaluate(() => (document.querySelector('.view.active') || {}).id);
const atras = async () => { await page.evaluate(() => history.back()); await w(500); };
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }

async function conPanel(nombre, abrir, abierto){
  await caso(`«Atrás» con ${nombre} abierto lo CIERRA y no saca de la pantalla`, async () => {
    await page.evaluate(() => navigate('pedidos')); await w(300);
    await page.evaluate(abrir); await w(300);
    assert.ok(await page.evaluate(abierto), nombre + ' debería estar abierto antes de «atrás»');
    await atras();
    assert.ok(!(await page.evaluate(abierto)), nombre + ' debería haberse cerrado con «atrás»');
    assert.equal(await vista(), 'view-pedidos', 'no debía salir de la pantalla');
    await atras(); assert.equal(await vista(), 'view-dashboard', 'el segundo «atrás» sí vuelve a la pantalla anterior');
  });
}
await conPanel('el chat', () => toggleChatPanel(), () => document.getElementById('chat-panel').classList.contains('active'));
await conPanel('la ayuda', () => toggleHelpPanel(), () => document.getElementById('help-panel').classList.contains('active'));
await conPanel('la campana de avisos', () => toggleAvisosPanel(), () => !!document.getElementById('avisos-panel') && document.getElementById('avisos-panel').classList.contains('active'));
await conPanel('un menú «⋯»', () => {
  const b = document.createElement('button'); b.id = '__mas'; b.setAttribute('data-acc', JSON.stringify([{icono:'ti-pencil', texto:'Editar', fn:'void 0'}]));
  document.querySelector('#view-pedidos').prepend(b); ggAbrirMenuAcciones(b, {});
}, () => !!document.querySelector('.mn-menu'));

await caso('Hoja de Escandallo: abrir un plato y «atrás» vuelve a la lista de Escandallo (no a la pantalla anterior)', async () => {
  await page.evaluate(() => { currentFolder = 'cocina'; navigate('escandallo'); }); await w(400);
  await page.evaluate(() => openRecipeModal(11)); await w(500);
  assert.ok(await page.evaluate(() => !!escandalloHoja), 'la hoja debía abrirse');
  await atras();
  assert.equal(await vista(), 'view-escandallo');
  assert.ok(!(await page.evaluate(() => !!escandalloHoja)), 'la hoja debía cerrarse');
  await atras(); assert.equal(await vista(), 'view-dashboard');
});
await caso('Ventana encima de ventana: «atrás» cierra lo de arriba y se queda en la pantalla', async () => {
  await page.evaluate(() => navigate('pedidos')); await w(300);
  await page.evaluate(() => openModal('<div class="modal-header"><h3>Uno</h3></div><p>uno</p>')); await w(200);
  await page.evaluate(() => { openModal('<div class="modal-header"><h3>Dos</h3></div><p>dos</p>'); }); await w(200);
  await atras();
  assert.ok(!(await page.evaluate(() => document.getElementById('modal-overlay').classList.contains('active'))));
  assert.equal(await vista(), 'view-pedidos');
  await atras(); assert.equal(await vista(), 'view-dashboard');
});
await caso('Ningún error de JavaScript', async () => { assert.deepEqual(errs, []); });
await browser.close();
console.log(fallos ? `\n❌ ${fallos} caso(s) fallaron` : '\n✅ todos los casos pasaron'); process.exit(fallos ? 1 : 0);
