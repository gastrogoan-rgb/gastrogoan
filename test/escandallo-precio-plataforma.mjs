// Precio ajustado por plataforma de delivery en el Escandallo (11/09):
// hasta ahora la ficha del plato no tenía en cuenta que Glovo/Uber Eats se
// comen un % + IVA de cada venta — el mismo precio de sala vendido por esa
// plataforma perdía margen sin que la ficha lo avisara. Se añade, por cada
// plataforma configurada en Mi Negocio, un precio de referencia sugerido
// (mismo margen que en sala) editable y guardado en r.deliveryPrices.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
const erroresJs = [];
page.on('pageerror', e => erroresJs.push(e.message));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(code => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
}, 'ESCPLAT1');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));
await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  DB.business.deliveryPlatforms = [{id: 1, nombre:'Glovo', comisionPct:30, ivaPct:21, comisionSobreEnvio:true}];
  DB.recipes = [{id: genId(), name:'Hamburguesa', area:'cocina', isBase:false, price:10, priceBase:10/1.10, ivaPct:10, comensales:1, consumiblesPct:0, ingredients:[]}];
  saveDB();
});

let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}

await caso('platformAdjustedPrice: 10€ con Glovo (30%+21% IVA) sube a ~15,70€ para mantener el mismo margen', async () => {
  const r = await page.evaluate(()=>{
    const plat = DB.business.deliveryPlatforms[0];
    return platformAdjustedPrice(10, plat);
  });
  // factor = 0.30 * 1.21 = 0.363 → 10 / (1-0.363) = 15.698...
  assert.ok(Math.abs(r - 15.70) < 0.05, `esperado ~15,70€, salió ${r}`);
});

await caso('La ficha del plato muestra el precio sugerido de Glovo', async () => {
  const r = await page.evaluate(()=>{
    const recipe = DB.recipes[0];
    navigate('escandallo');
    openEscandalloFolder('__none__');
    openEscandalloRecipe(recipe.id);
    const box = document.querySelector('.card [class*=""]');
    return document.getElementById('view-escandallo').textContent;
  });
  assert.ok(r.includes('Glovo'), 'debe mostrar la plataforma configurada: ' + r.slice(0,200));
  assert.ok(/15[.,]7\d?/.test(r), 'debe mostrar el precio sugerido ~15,70€ en algún sitio: ' + r.slice(0,500));
});

await caso('Editar y guardar un precio de plataforma persiste en r.deliveryPrices', async () => {
  const r = await page.evaluate(()=>{
    const recipe = DB.recipes[0];
    openDeliveryPricesModal(recipe.id);
    document.getElementById('dp-price-1').value = '14.90';
    saveDeliveryPrices(recipe.id);
    return DB.recipes[0].deliveryPrices;
  });
  assert.equal(r['1'], 14.9, 'el precio editado debe guardarse: ' + JSON.stringify(r));
});

await caso('Tras guardar, la ficha muestra el precio guardado (no ya el sugerido)', async () => {
  const r = await page.evaluate(()=>{
    const recipe = DB.recipes[0];
    openEscandalloRecipe(recipe.id);
    return document.getElementById('view-escandallo').textContent;
  });
  assert.ok(/14[.,]90/.test(r), 'debe mostrar el precio guardado 14,90€: ' + r.slice(0,500));
});

await caso('Sin plataformas configuradas, no aparece la caja de precios por plataforma', async () => {
  const r = await page.evaluate(()=>{
    DB.business.deliveryPlatforms = [];
    openEscandalloRecipe(DB.recipes[0].id);
    return document.getElementById('view-escandallo').innerHTML.includes('platformPricesTitle') || document.getElementById('view-escandallo').textContent.includes('Glovo');
  });
  assert.equal(r, false, 'sin plataformas no debe verse ninguna referencia a ellas: ' + r);
});

await caso('Ningún error de JavaScript en todo el recorrido', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(68));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
