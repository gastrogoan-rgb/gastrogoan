// Cambios de precio (30/10): las bajadas también cuentan, y cada subida dice qué le hace a cada plato y a qué precio de
// venta habría que ponerlo para mantener el food cost objetivo (se propone, nunca se aplica solo).
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox'], protocolTimeout:30000});
let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}
const esperar = ms => new Promise(r => setTimeout(r, ms));

const page = await browser.newPage();
await page.setViewport({width:1280, height:900});
const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(code => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
}, 'CAMPRE001');
await page.reload({waitUntil:'domcontentloaded'});
await esperar(2200);
await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, name:'Bar de Pruebas'});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  DB.ge.config.foodCostObj = 30; if(DB.ge.config.distPct) delete DB.ge.config.distPct.mp;
  DB.ingredients = [
    {id:1, name:'Merluza', unit:'kg', price:14, packQty:1, packPrice:14, iva:10, supplier:'P', category:'Pescados', allergens:[], area:'cocina'},
    {id:2, name:'Aceite', unit:'L', price:5, packQty:1, packPrice:5, iva:10, supplier:'P', category:'Aceites', allergens:[], area:'cocina'},
    {id:3, name:'Patata', unit:'kg', price:1, packQty:1, packPrice:1, iva:4, supplier:'P', category:'Verduras', allergens:[], area:'cocina'},
  ];
  const L = (id, qty) => ({type:'ingredient', ingredientId:id, qty, merma:0});
  DB.recipes = [
    // coste con merluza a 10: 0,3 × 10 = 3 → 3/10 = 30 % (justo en objetivo); con 14: 4,2 → 42 %
    {id:11, name:'Merluza a la plancha', price:11, priceBase:10, ivaPct:10, category:'Pescados', consumiblesPct:0, area:'cocina', isBase:false, ingredients:[L(1,0.3)]},
    // un plato con mucho margen: sigue dentro del objetivo aunque suba
    {id:12, name:'Ensalada con merluza', price:20, priceBase:18.18, ivaPct:10, consumiblesPct:0, area:'cocina', isBase:false, ingredients:[L(1,0.1), L(3,0.2)]},
    // la merluza llega por una elaboración base (caldo): también cuenta
    {id:13, name:'Caldo de pescado', price:0, isBase:true, baseYield:1, baseUnit:'L', consumiblesPct:0, area:'cocina', ingredients:[L(1,0.5)]},
    {id:14, name:'Sopa de pescado', price:8.8, priceBase:8, ivaPct:10, consumiblesPct:0, area:'cocina', isBase:false, ingredients:[{type:'base', baseRecipeId:13, qty:0.4, merma:0}]},
  ];
  DB.cartas = [{id:1, nombre:'CARTA', area:'cocina', horario:defaultItemHorario(), secciones:[{id:1, nombre:'Pescados', platos:[{id:1, nombre:'Merluza a la plancha', recipeId:11, precio:11, precioBase:10, ivaPct:10}]}]}];
  DB.purchaseOrders = [];
  const hoy = new Date().toISOString().slice(0,10);
  DB.preciosHistorial = [
    {id:1, fecha:hoy, createdAt:new Date().toISOString(), ingredientId:1, nombre:'Merluza', unidad:'kg', proveedor:'P', antes:10, despues:14, pct:40, origen:'albaran', area:'cocina'},
    {id:2, fecha:hoy, createdAt:new Date().toISOString(), ingredientId:2, nombre:'Aceite', unidad:'L', proveedor:'P', antes:6, despues:5, pct:-16.7, origen:'albaran', area:'cocina'},
  ];
  saveDB(); currentFolder = 'cocina'; navigate('dashboard');
});
await esperar(500);
const q = (fn, ...a) => page.evaluate(fn, ...a);

await caso('Las bajadas se detectan aparte de las subidas, con su ahorro (en negativo)', async () => {
  const r = await q(() => ({sube: subidasDePrecio(14).map(x => x.nombre), baja: bajadasDePrecio(14).map(x => ({n: x.nombre, pct: x.pct}))}));
  assert.deepEqual(r.sube, ['Merluza']); assert.deepEqual(r.baja, [{n:'Aceite', pct:-16.7}]);
});

await caso('El Panel avisa de las bajadas con su propio acceso (sin darlas por urgentes)', async () => {
  const r = await q(() => { navigate('dashboard'); return document.getElementById('dashboard-attention').innerText.replace(/\s+/g, ' '); });
  assert.ok(/Bajadas de precio/i.test(r), r);
});

await caso('Cada subida dice qué le hace a cada plato, también por una elaboración base', async () => {
  const r = await q(() => platosAfectadosPorPrecio(subidasDePrecio(14)[0]).map(p => ({n: p.nombre, ahora: Math.round(p.fcAhora), antes: Math.round(p.fcAntes), sug: p.sugerido})));
  const por = Object.fromEntries(r.map(x => [x.n, x]));
  assert.deepEqual(Object.keys(por).sort(), ['Ensalada con merluza', 'Merluza a la plancha', 'Sopa de pescado'], 'los tres usan merluza, uno de ellos a través del caldo');
  assert.equal(por['Merluza a la plancha'].antes, 30); assert.equal(por['Merluza a la plancha'].ahora, 42);
});

await caso('El precio sugerido recupera el objetivo (coste ÷ objetivo, con IVA, a 10 céntimos) y solo se propone si hace falta', async () => {
  const r = await q(() => { const p = platosAfectadosPorPrecio(subidasDePrecio(14)[0]); return Object.fromEntries(p.map(x => [x.nombre, x.sugerido])); });
  // coste 4,2 / 0,30 = 14 € sin IVA → 15,40 con IVA
  assert.equal(r['Merluza a la plancha'], 15.4);
  assert.equal(r['Ensalada con merluza'], null, 'con mucho margen no hace falta tocar nada');
  // Sopa: 0,4 × (0,5 × 14) = 2,8 → 2,8/8 = 35 % > 30 → 2,8/0,3 = 9,33 × 1,1 = 10,27 → 10,3
  assert.equal(r['Sopa de pescado'], 10.3);
});

await caso('La ventana enseña las dos pestañas y, en cada plato, su food cost y la sugerencia con el botón Aplicar', async () => {
  await q(() => abrirCambiosPrecio('suben')); await esperar(400);
  const r = await q(() => ({tabs: [...document.querySelectorAll('.cp-tabs .btn')].map(b => b.textContent.replace(/\s+/g, ' ').trim()), platos: document.querySelectorAll('.cp-plato').length,
    botones: [...document.querySelectorAll('.cp-plato .btn')].map(b => b.textContent.trim()), txt: document.querySelector('.cp-card').innerText.replace(/\s+/g, ' ')}));
  assert.deepEqual(r.tabs, ['Suben 1', 'Bajan 1']); assert.equal(r.platos, 3); assert.deepEqual(r.botones, ['Aplicar', 'Aplicar']);
  assert.ok(/Food cost 30,0% → 42,0%/.test(r.txt) && /11,00 € → 15,40 €/.test(r.txt) && /Sigue dentro del objetivo/.test(r.txt), r.txt);
  await q(() => abrirCambiosPrecio('bajan')); await esperar(300);
  const b = await q(() => document.querySelector('.cp-card').innerText.replace(/\s+/g, ' '));
  assert.ok(/Aceite/.test(b) && /−16,7 %/.test(b), b);
  await q(() => closeModal());
});

await caso('Aplicar cambia el precio del plato y de su carta, tras confirmar', async () => {
  await q(() => { aplicarPvpSugerido(11, 15.4); }); await esperar(400);
  assert.ok(/11,00 € a 15,40 €/.test(await q(() => document.getElementById('modal-box').innerText.replace(/\s+/g, ' '))), 'pide confirmación con el cambio');
  assert.equal(await q(() => getRecipe(11).price), 11, 'todavía no se ha tocado');
  await q(() => [...document.querySelectorAll('#modal-box button')].find(b => /Confirmar|Aceptar|Sí/i.test(b.textContent)).click()); await esperar(500);
  const r = await q(() => ({r: getRecipe(11), carta: DB.cartas[0].secciones[0].platos[0]}));
  assert.equal(r.r.price, 15.4); assert.equal(r.r.priceBase, 14); assert.equal(r.carta.precio, 15.4, 'la carta (y con ella el TPV) cambia a la vez');
  // y el food cost del plato vuelve al objetivo
  assert.equal(Math.round(await q(() => recipeFoodCostPct(getRecipe(11)))), 30);
});

await caso('Ningún error de JavaScript', async () => { assert.deepEqual(errs, [], errs.join(' | ')); });

console.log('\n' + '═'.repeat(70));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
