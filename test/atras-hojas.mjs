// «Atrás» dentro de Escandallo (y Fichas): la hoja de un plato es una página del historial. El «atrás» del navegador
// cierra la hoja y deja la lista; el «adelante» la reabre; y el «Volver» de la propia hoja también queda en el historial.
// Usa index.html (código de desarrollo): dist/ solo se regenera con build.sh.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

let fallos = 0;
async function caso(nombre, fn){
  try{ const d = await fn(); console.log('✅ ' + nombre + (d ? '  → ' + d : '')); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}
const w = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox'], protocolTimeout:90000});
const page = await browser.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
page.on('dialog', d => d.dismiss().catch(() => {}));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.setViewport({width:1280, height:800});
await page.goto('http://localhost:8950/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(() => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'ATRASH01', tenantId: ggBizTenantId('ATRASH01')}));
  localStorage.setItem('gastrogoan_owner_login', '1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
});
await page.reload({waitUntil:'domcontentloaded'});
await w(2200);
await page.evaluate(() => {
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate','app-splash'].forEach(id => document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  DB.recipes.push({id: 9001, name:'Plato Atrás Prueba', area:'cocina', isBase:false, priceBase:10, ivaPct:10, ingredients:[], steps:'', consumiblesPct:5, baseYield:1, baseUnit:'L', category:''});
  currentFolder = 'cocina'; navigate('escandallo');
});
await w(600);

// Estado visible: ¿hay una hoja abierta? (la barra de la hoja solo existe dentro de una hoja)
const hojaAbierta = () => page.evaluate(() => !!document.querySelector('#escandallo-list .es-barra'));
const estaActiva = () => page.evaluate(() => document.getElementById('view-escandallo')?.classList.contains('active'));
const atras = async () => { await page.evaluate(() => history.back()); await w(700); };
const adelante = async () => { await page.evaluate(() => history.forward()); await w(700); };

await caso('la lista de Escandallo está abierta y sin hoja', async () => {
  assert.equal(await estaActiva(), true, 'no está la pantalla de Escandallo');
  assert.equal(await hojaAbierta(), false, 'ya había una hoja al entrar');
});

await caso('abrir un plato: aparece la hoja', async () => {
  await page.evaluate(() => openRecipeModal(9001));
  await w(500);
  assert.equal(await hojaAbierta(), true, 'la hoja no se ve');
});

await caso('«atrás» del navegador cierra la hoja y deja la lista (no sale de Escandallo)', async () => {
  await atras();
  assert.equal(await estaActiva(), true, 'se ha salido de Escandallo');
  assert.equal(await hojaAbierta(), false, 'la hoja sigue abierta tras «atrás»');
});

await caso('«adelante» reabre la hoja del mismo plato', async () => {
  await adelante();
  assert.equal(await hojaAbierta(), true, 'la hoja no vuelve con «adelante»');
  const nombre = await page.evaluate(() => escandalloHoja && escandalloHoja.id);
  assert.equal(nombre, 9001, 'se reabrió otra receta: ' + nombre);
  return 'receta 9001';
});

await caso('«Volver» de la propia hoja queda en el historial: «atrás» la reabre', async () => {
  await page.evaluate(() => backToEscandalloRecipes());
  await w(500);
  assert.equal(await hojaAbierta(), false, 'Volver no cerró la hoja');
  await atras();
  assert.equal(await hojaAbierta(), true, '«atrás» tras Volver no devuelve la hoja');
});

// Fichas técnicas: la misma regla (la hoja es una página del historial).
const fichaAbierta = () => page.evaluate(() => fichaHoja === true && !!fichaModalState && fichaModalState.id === 7001);
await caso('Fichas: abrir una ficha guardada crea una página del historial', async () => {
  await page.evaluate(() => {
    DB.fichas = (DB.fichas || []).filter(f => f.id !== 7001);
    DB.fichas.push({id: 7001, name:'Ficha Atrás Prueba', recipeId: 9001, comensales:2, baseComensales:2, produccion:2, tiempo:'', temp:'CALIENTE', ingredients:['1 kg — Patata'], pasos:['Paso uno'], allergens:[], presentation:'', bebidaTipo:'', bebida:{}});
    currentFolder = 'cocina'; navigate('fichas');
  });
  await w(500);
  await page.evaluate(() => openFichaModal(7001));
  await w(500);
  assert.equal(await fichaAbierta(), true, 'la ficha no se abre');
});
await caso('Fichas: «atrás» vuelve a la lista de fichas (sigue en Fichas)', async () => {
  await atras();
  assert.equal(await page.evaluate(() => !!document.getElementById('view-fichas')?.classList.contains('active')), true, 'se ha salido de Fichas');
  assert.equal(await fichaAbierta(), false, 'la ficha sigue abierta tras «atrás»');
});
await caso('Fichas: «adelante» reabre la ficha', async () => {
  await adelante();
  assert.equal(await fichaAbierta(), true, 'la ficha no vuelve con «adelante»');
});
await caso('Fichas: «Volver» de la ficha queda en el historial (atrás la reabre)', async () => {
  await page.evaluate(() => backToFichaList());
  await w(500);
  assert.equal(await fichaAbierta(), false, 'Volver no cerró la ficha');
  await atras();
  assert.equal(await fichaAbierta(), true, '«atrás» tras Volver no devuelve la ficha');
});

await caso('ninguna excepción de página en el recorrido', async () => {
  assert.deepEqual(errs, [], 'errores: ' + errs.join(' | '));
});

await browser.close();
console.log(fallos ? `\n❌ ${fallos} fallo(s)` : '\n✅ todos los casos de «atrás» en Escandallo y Fichas pasaron');
process.exit(fallos ? 1 : 0);
