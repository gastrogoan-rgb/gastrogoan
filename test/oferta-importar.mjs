// Oferta: importar del Escandallo (7/11, pedido del dueño): primero las CARPETAS y, al abrir una, sus platos
// (antes salían todos de golpe). Lo marcado sobrevive a cambiar de carpeta y el buscador cruza todo.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
await page.setViewport({width:1280, height:900});
const erroresJs = []; page.on('pageerror', e => erroresJs.push(e.message));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(code => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
}, 'IMPORTESC1');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const esperar = ms => new Promise(r => setTimeout(r, ms));
await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, name:'Bar de Pruebas'});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  editUnlocked = true;
  DB.recipeCategories = [{name:'Entrantes', area:'cocina'}, {name:'Carnes', area:'cocina'}];
  const R = (id, name, category, price) => ({id, name, category, price, priceBase:price/1.1, ivaPct:10, area:'cocina', isBase:false, ingredients:[]});
  DB.recipes = [R(1,'Croquetas','Entrantes',9), R(2,'Ensalada','Entrantes',8), R(3,'Solomillo','Carnes',22), R(4,'Hamburguesa','Carnes',14), R(5,'Pan con tomate','',4)];
  DB.cartas = [{id:1, nombre:'CARTA', area:'cocina', activa:true, secciones:[{id:11, nombre:'Principales', platos:[]}]}];
  saveDB(); currentFolder='cocina'; ofertaTab='carta'; navigate('carta');
  cartaEdit = JSON.parse(JSON.stringify(DB.cartas[0]));
  importFromEscandallo(11);
});
await esperar(400);
const q = fn => page.evaluate(fn);
await caso('Al abrir salen las CARPETAS, no los platos', async () => {
  const r = await q(() => ({carpetas: [...document.querySelectorAll('.ie-carpeta .ie-txt b')].map(b => b.textContent), filas: document.querySelectorAll('.ie-fila').length}));
  assert.deepEqual(r.carpetas, ['Entrantes', 'Carnes', 'Sin categoría']); assert.equal(r.filas, 0, 'ningún plato todavía');
});
await caso('Abrir una carpeta enseña solo sus platos, con su «volver»', async () => {
  await q(() => document.querySelectorAll('.ie-carpeta')[0].click()); await esperar(200);
  const r = await q(() => ({platos: [...document.querySelectorAll('.ie-fila .ie-nom')].map(n => n.textContent.trim()), volver: !!document.querySelector('.ie-ruta button')}));
  assert.deepEqual(r.platos, ['Croquetas', 'Ensalada']); assert.ok(r.volver);
});
await caso('Lo marcado se recuerda al cambiar de carpeta y se ve en la carpeta (contador) y en el botón', async () => {
  await q(() => document.querySelector('.ie-fila input').click()); await esperar(150);
  await q(() => importEscVolver()); await esperar(150);
  const r = await q(() => ({marca: document.querySelectorAll('.ie-carpeta')[0].querySelector('.ie-marca').textContent, btn: document.getElementById('import-esc-ok').textContent.trim()}));
  assert.equal(r.marca, '1'); assert.match(r.btn, /\(1\)/);
  await q(() => document.querySelectorAll('.ie-carpeta')[1].click()); await esperar(150);
  await q(() => document.querySelector('.ie-todos input').click()); await esperar(150);
  assert.match(await q(() => document.getElementById('import-esc-ok').textContent.trim()), /\(3\)/, 'una de Entrantes + las dos de Carnes');
});
await caso('El buscador cruza todas las carpetas y dice de cuál es cada plato', async () => {
  await q(() => { const i = document.getElementById('import-esc-search'); i.value = 'pan'; renderImportEscList(); }); await esperar(150);
  const r = await q(() => [...document.querySelectorAll('.ie-fila .ie-nom')].map(n => n.textContent.trim()));
  assert.equal(r.length, 1); assert.match(r[0], /Pan con tomate/);
  await q(() => { const i = document.getElementById('import-esc-search'); i.value = 'o'; renderImportEscList(); }); await esperar(150);
  assert.ok((await q(() => document.querySelectorAll('.ie-fila').length)) >= 3);
});
await caso('Importar mete en la sección exactamente lo marcado', async () => {
  await q(() => { document.getElementById('import-esc-search').value = ''; confirmImportEsc(11); }); await esperar(300);
  const nombres = await q(() => cartaEdit.secciones[0].platos.map(p => p.nombre).sort());
  assert.deepEqual(nombres, ['Croquetas', 'Hamburguesa', 'Solomillo']);
});
await caso('Lo que ya está en la carta no se puede volver a marcar', async () => {
  await q(() => importFromEscandallo(11)); await esperar(300);
  await q(() => document.querySelectorAll('.ie-carpeta')[0].click()); await esperar(150);
  const r = await q(() => [...document.querySelectorAll('.ie-fila')].map(f => ({n: f.querySelector('.ie-nom').textContent.trim().slice(0,9), dis: f.querySelector('input').disabled})));
  assert.equal(r[0].dis, true); assert.equal(r[1].dis, false, JSON.stringify(r));
});
await caso('Las opciones de un menú salen agrupadas por carpeta', async () => {
  const r = await q(() => { closeModal(); menuEdit = {id:9, nombre:'M', grupos:[{id:91, nombre:'Primeros', opciones:[]}]}; addMenuOpcion(91);
    return [...document.querySelectorAll('#new-menu-opcion-recipe optgroup')].map(g => g.label + ':' + g.children.length); });
  assert.deepEqual(r, ['Entrantes:2', 'Carnes:2', 'Sin categoría:1']);
});
await caso('Ningún error de JavaScript', async () => { assert.deepEqual(erroresJs, []); });
console.log('\n' + '═'.repeat(70)); console.log(fallos ? `❌ ${fallos} casos fallaron` : '✅ casos pasaron');
await browser.close(); process.exit(fallos ? 1 : 0);
