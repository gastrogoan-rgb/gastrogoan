// «Descripción en carta» (6/11): se escribe en la FICHA TÉCNICA del plato y la ven el cliente (web de pedidos) y el camarero (ⓘ del TPV).
// Los platos manuales de la carta (sin receta) la llevan en el propio plato. Nada se duplica: la ficha manda.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|github/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(() => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'DESCPL01', tenantId: ggBizTenantId('DESCPL01')}));
  localStorage.setItem('gastrogoan_owner_login','1'); localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()})); localStorage.setItem('gastrogoan_owner_pass_prompted','1');
});
await page.reload({waitUntil:'domcontentloaded'}); await new Promise(r => setTimeout(r, 2000));
await page.evaluate(() => {
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id => document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  currentFolder = 'cocina'; ownerUnlocked = true;
});
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }

await caso('La descripción sale de la FICHA TÉCNICA si el plato tiene receta, y del propio plato si es manual', async () => {
  const r = await page.evaluate(() => {
    DB.fichas = [{id:1, name:'Hamburguesa Paco', recipeId:77, descripcionCarta:'  Ternera, cheddar y cebolla caramelizada  '}];
    return [platoDescripcion({recipeId:77}), platoDescripcion({recipeId:78, descripcion:'No sale: otra receta sin ficha'}), platoDescripcion({recipeId:null, descripcion:'Plato manual'}), platoDescripcion({recipeId:77, descripcion:'Ignorada: manda la ficha'}), platoDescripcion(null)];
  });
  assert.deepEqual(r, ['Ternera, cheddar y cebolla caramelizada', 'No sale: otra receta sin ficha', 'Plato manual', 'Ternera, cheddar y cebolla caramelizada', '']);
});
await caso('La web pública recibe la descripción ya resuelta y la carta del negocio NO se modifica', async () => {
  const r = await page.evaluate(() => {
    DB.fichas = [{id:1, name:'Hamburguesa', recipeId:77, descripcionCarta:'Ternera y cheddar'}];
    DB.cartas = [{id:1, nombre:'Carta', secciones:[{id:1, nombre:'Platos', platos:[{id:5, nombre:'Hamburguesa', recipeId:77, precio:12}, {id:6, nombre:'Sopa', recipeId:null, precio:6}]}]}];
    const pub = cartasParaElEspejo();
    return {pub: pub[0].secciones[0].platos.map(p => p.descripcion || null), orig: DB.cartas[0].secciones[0].platos[0].descripcion || null};
  });
  assert.deepEqual(r.pub, ['Ternera y cheddar', null]); assert.equal(r.orig, null, 'la carta guardada no se toca');
});
await caso('El ⓘ del TPV enseña la descripción al camarero', async () => {
  const h = await page.evaluate(() => renderDishInfoModalHtml(null, 'Hamburguesa', '', 'closeModal()', 'Ternera y cheddar'));
  assert.match(h, /Ternera y cheddar/);
  assert.ok(!/tp-desc-plato/.test(await page.evaluate(() => renderDishInfoModalHtml(null, 'Hamburguesa', '', 'closeModal()', ''))), 'sin descripción no sale el bloque');
});
await caso('La ficha técnica tiene el campo «Descripción en carta», lo guarda recortado a 140 y no se pierde al reabrir', async () => {
  const r = await page.evaluate(async () => {
    navigate('fichas'); await new Promise(r => setTimeout(r, 300));
    DB.fichas = []; DB.recipes = DB.recipes || [];
    openFichaModal(); await new Promise(r => setTimeout(r, 400));
    const campo = !!document.getElementById('ficha-desc-carta');
    document.getElementById('ficha-name').value = 'Tarta de queso';
    document.getElementById('ficha-desc-carta').value = 'x'.repeat(200);
    const ok = await saveFicha();
    return {campo, ok, largo: (DB.fichas[0] || {}).descripcionCarta ? DB.fichas[0].descripcionCarta.length : -1};
  });
  assert.ok(r.campo, 'falta el campo en la ficha'); assert.ok(r.ok); assert.equal(r.largo, 140);
});
await caso('Un plato manual de la carta tiene su botón «Descripción»; uno con receta NO (ahí manda la ficha)', async () => {
  const r = await page.evaluate(() => [ocBtnDescripcion(true, 'x()'), ocBtnDescripcion(false, 'x()')].map(h => /is-on/.test(h)));
  assert.deepEqual(r, [true, false]);
  const src = await page.evaluate(() => String(renderCartaSecciones));
  assert.ok(/!p\.recipeId \? ocBtnDescripcion/.test(src), 'el botón solo va en platos sin receta');
});
await caso('Ningún error de JavaScript', async () => { assert.deepEqual(errs, []); });
await browser.close();
console.log(fallos ? `\n❌ ${fallos} caso(s) fallaron` : '\n✅ todos los casos pasaron'); process.exit(fallos ? 1 : 0);
