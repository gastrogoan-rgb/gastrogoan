// Escandallo (30/10): carpetas con nombres enteros, platos en tarjetas, y la HOJA única donde un plato se crea, se ve y
// se edita (antes: un modal estrecho para crear y otra ficha para ver). Los números se recalculan al teclear.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox'], protocolTimeout:30000});
let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}
const esperar = ms => new Promise(r => setTimeout(r, ms));

async function abrir(ancho){
  const page = await browser.newPage();
  await page.setViewport({width:ancho, height: ancho < 600 ? 800 : 900});
  page.erroresJs = [];
  page.on('pageerror', e => page.erroresJs.push(e.message));
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
  await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
  await page.evaluate(code => {
    localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
    localStorage.setItem('gastrogoan_owner_login','1');
    localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted','1');
    localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
  }, 'ESCAND001');
  await page.reload({waitUntil:'domcontentloaded'});
  await esperar(2200);
  await page.evaluate(()=>{
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, name:'Bar de Pruebas'});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    const ing = (id, name, unit, price) => ({id, name, category:'Pescados', unit, supplier:'', price, packQty:1, packPrice:price, iva:10, allergens: name === 'Merluza' ? ['Pescado'] : [], area:'cocina'});
    DB.ingredients = [ing(1,'Merluza','kg',14), ing(2,'Patata','kg',1), ing(3,'Aceite','L',6), ing(4,'Tomate','kg',2.4)];
    DB.stock = {}; DB.cartas = []; DB.fichas = []; DB.elaboraciones = [];
    DB.recipeCategories = [{name:'Hamburguesas', area:'cocina'}, {name:'Pescados', area:'cocina'}, {name:'Entrantes', area:'cocina'}];
    const L = (id, qty, merma) => ({type:'ingredient', ingredientId:id, qty, merma: merma || 0});
    DB.recipes = [
      {id:11, name:'Merluza con patata', price:19.8, priceBase:18, ivaPct:10, category:'Pescados', consumiblesPct:5, comensales:1, area:'cocina', isBase:false, ingredients:[L(1,0.22,30), L(2,0.2,10), L(3,0.03)]},
      {id:12, name:'Merluza al horno', price:16.5, priceBase:15, ivaPct:10, category:'Pescados', consumiblesPct:5, comensales:1, area:'cocina', isBase:false, ingredients:[L(1,0.2)]},
      {id:13, name:'Hamburguesa', price:12, priceBase:10.91, ivaPct:10, category:'Hamburguesas', consumiblesPct:5, comensales:1, area:'cocina', isBase:false, ingredients:[]},
      {id:14, name:'Sofrito', price:0, isBase:true, baseYield:2, baseUnit:'L', category:'Entrantes', consumiblesPct:3, area:'cocina', ingredients:[L(4,1.5), L(3,0.2)]},
    ];
    DB.cartas = [{id:1, nombre:'CARTA', area:'cocina', horario:defaultItemHorario(), secciones:[{id:1, nombre:'Pescados', platos:[{id:1, nombre:'Merluza', recipeId:11, precio:19.8}]}]}];
    saveDB(); currentFolder = 'cocina'; escandalloHoja = null; escandalloFolder = null; escandalloTab = 'platos'; navigate('escandallo');
  });
  await esperar(500);
  return page;
}

for(const ancho of [1280, 360]){
  const page = await abrir(ancho);
  const q = (fn, ...a) => page.evaluate(fn, ...a);

  await caso(`Carpetas: tarjetas con icono de trazo y nombres enteros, sin partir palabras (${ancho}px)`, async () => {
    const r = await q(() => [...document.querySelectorAll('.ml-carpeta')].map(c => {
      const nom = c.querySelector('.ml-carpeta-nom');
      const rango = document.createRange(); rango.selectNodeContents(nom);
      return {nom: nom.textContent.trim(), svg: !!c.querySelector('.ml-ico svg'), lineas: new Set([...rango.getClientRects()].map(x => Math.round(x.top))).size};
    }));
    assert.deepEqual(r.map(x => x.nom), ['Hamburguesas', 'Pescados']);   // «Entrantes» solo tiene una elaboración: sale en la otra pestaña
    assert.ok(r.every(x => x.svg), JSON.stringify(r));
    assert.ok(r.every(x => x.lineas === 1), 'cada nombre en una sola línea: ' + JSON.stringify(r));
  });

  await caso(`Dentro de una categoría, los platos son tarjetas en cuadrícula, no una línea cada uno (${ancho}px)`, async () => {
    await q(() => openEscandalloFolder('Pescados')); await esperar(300);
    const r = await q(() => ({tarjetas: [...document.querySelectorAll('.es-plato')].map(c => { const b = c.getBoundingClientRect(); return {x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width)}; }), tabla: !!document.querySelector('#escandallo-list table')}));
    assert.equal(r.tarjetas.length, 2); assert.ok(!r.tabla, 'ya no es una tabla');
    if(ancho > 760) assert.ok(r.tarjetas[0].y === r.tarjetas[1].y && r.tarjetas[0].w < 420, 'caben dos en la misma fila: ' + JSON.stringify(r.tarjetas));
    const txt = await q(() => document.querySelector('.es-plato').innerText.replace(/\s+/g,' '));
    assert.ok(/Merluza con patata/.test(txt) && /FC/.test(txt) && /19,80/.test(txt), txt);
  });

  await caso(`El menú de la tarjeta ofrece Editar, Duplicar y Eliminar (${ancho}px)`, async () => {
    await q(() => document.querySelector('.es-plato [data-acc]').click()); await esperar(150);
    assert.deepEqual(await q(() => [...document.querySelectorAll('.mn-item')].map(i => i.textContent.trim())), ['Editar', 'Duplicar', 'Eliminar']);
    await page.keyboard.press('Escape');
  });

  await caso(`Pulsar un plato abre su hoja: todo se ve y se edita en la misma pantalla (${ancho}px)`, async () => {
    await q(() => document.querySelector('.es-plato').click()); await esperar(400);
    const r = await q(() => ({campos: ['recipe-name','recipe-category','recipe-price-base','recipe-iva','recipe-consumibles','recipe-add-ingredient-search'].map(id => !!document.getElementById(id)),
      modal: document.getElementById('modal-overlay').classList.contains('active'), lineas: document.querySelectorAll('.es-linea').length,
      nombre: document.getElementById('recipe-name').value, coste: document.getElementById('es-k-coste').textContent, fc: document.getElementById('es-k-fc').textContent}));
    assert.ok(r.campos.every(Boolean), 'faltan campos: ' + r.campos); assert.ok(!r.modal, 'ya no es un modal');
    assert.equal(r.lineas, 3); assert.equal(r.nombre, 'Merluza con patata');
    // 0,22/0,7·14 + 0,2/0,9·1 + 0,03·6 = 4,4 + 0,2222 + 0,18 = 4,8022 ; +5 % consumibles = 5,0423
    assert.ok(/5,04/.test(r.coste), r.coste); assert.ok(/28,0/.test(r.fc), r.fc);
  });

  await caso(`Al teclear se recalcula todo al momento y aparece «cambios sin guardar» (${ancho}px)`, async () => {
    assert.ok(await q(() => document.getElementById('es-sucio').hidden), 'recién abierta no hay cambios');
    await q(() => { const i = document.querySelector('.es-linea .es-l-qty input'); i.value = '0.4'; i.dispatchEvent(new Event('input', {bubbles:true})); });
    const r = await q(() => ({coste: document.getElementById('es-k-coste').textContent, sucio: !document.getElementById('es-sucio').hidden, linea: document.getElementById('es-lc-0').textContent}));
    assert.ok(/8,0/.test(r.coste) || /8,\d\d/.test(r.coste), 'el coste sube: ' + r.coste); assert.ok(r.sucio);
    await q(() => { const p = document.getElementById('recipe-price-base'); p.value = '20'; p.dispatchEvent(new Event('input', {bubbles:true})); });
    assert.ok(/22,00/.test(await q(() => document.getElementById('es-k-pvp').textContent)), 'PVP = 20 + 10 % de IVA');
    assert.ok(/22,00/.test(await q(() => document.getElementById('recipe-price-final-display').textContent)));
  });

  await caso(`Salir con cambios pregunta; descartar deja el plato como estaba (${ancho}px)`, async () => {
    await q(() => backToEscandalloRecipes()); await esperar(400);
    assert.ok(await q(() => document.getElementById('modal-overlay').classList.contains('active')), 'pregunta antes de salir');
    await q(() => ggRespondeSalida('descartar')); await esperar(400);
    assert.ok(await q(() => !!document.querySelector('.es-plato')), 'vuelve a la lista');
    assert.equal(await q(() => DB.recipes.find(r => r.id === 11).ingredients[0].qty), 0.22, 'nada se guardó');
  });

  await caso(`Guardar escribe el plato y se queda en la hoja (${ancho}px)`, async () => {
    await q(() => openEscandalloRecipe(11)); await esperar(300);
    await q(() => { const i = document.querySelector('.es-linea .es-l-qty input'); i.value = '0.25'; i.dispatchEvent(new Event('input', {bubbles:true})); const n = document.getElementById('recipe-name'); n.value = 'Merluza con patata y limón'; n.dispatchEvent(new Event('input', {bubbles:true})); });
    await q(() => saveRecipe()); await esperar(500);
    const r = await q(() => ({r: DB.recipes.find(x => x.id === 11), enHoja: !!document.getElementById('recipe-name'), sucio: !document.getElementById('es-sucio').hidden}));
    assert.equal(r.r.name, 'Merluza con patata y limón'); assert.equal(r.r.ingredients[0].qty, 0.25);
    assert.ok(r.enHoja && !r.sucio, 'sigue en la hoja y sin cambios pendientes');
    assert.equal(await q(() => DB.recipes.filter(x => x.name.startsWith('Merluza con patata')).length), 1, 'no se duplicó');
  });

  await caso(`Plato nuevo: se crea en la MISMA hoja; pide nombre e IVA; al guardar pasa a existir (${ancho}px)`, async () => {
    await q(() => { backToEscandalloRecipes(); }); await esperar(300);
    await q(() => document.querySelector('#escandallo-new-btns .btn').click()); await esperar(400);
    assert.ok(await q(() => !!document.getElementById('recipe-name') && !document.getElementById('modal-overlay').classList.contains('active')), 'hoja vacía, sin modal');
    assert.equal(await q(() => document.getElementById('recipe-category').value), 'Pescados', 'nace en la carpeta desde la que se abre');
    await q(() => saveRecipe()); await esperar(300);
    assert.equal(await q(() => DB.recipes.length), 4, 'sin nombre no se crea nada');
    await q(() => { const n = document.getElementById('recipe-name'); n.value = 'Bacalao confitado'; const p = document.getElementById('recipe-price-base'); p.value = '15'; });
    await q(() => saveRecipe()); await esperar(300);
    assert.equal(await q(() => DB.recipes.length), 4, 'sin IVA elegido tampoco');
    // Añadir un ingrediente buscándolo, como se hace de verdad.
    await q(() => { const iv = document.getElementById('recipe-iva'); iv.value = '10'; iv.dispatchEvent(new Event('change', {bubbles:true})); const b = document.getElementById('recipe-add-ingredient-search'); b.value = 'Pat'; filterRecipeIngredientResults(null); });
    assert.ok(await q(() => document.getElementById('recipe-add-ingredient-results').innerText.includes('Patata')), 'el buscador enseña la patata');
    await q(() => { selectRecipeIngredientResult(null, 'ingredient', 2); document.getElementById('recipe-add-qty').value = '0.5'; addRecipeLine(null); });
    assert.equal(await q(() => document.querySelectorAll('.es-linea').length), 1);
    assert.ok(/0,5/.test(await q(() => document.getElementById('es-lc-0').textContent)) , 'coste de la línea');
    await q(() => saveRecipe()); await esperar(500);
    const r = await q(() => ({n: DB.recipes.length, p: DB.recipes.find(x => x.name === 'Bacalao confitado'), id: escandalloHoja && escandalloHoja.id}));
    assert.equal(r.n, 5); assert.ok(r.p && r.p.ivaPct === 10 && r.p.ingredients.length === 1 && r.p.category === 'Pescados');
    assert.equal(r.id, r.p.id, 'la hoja ya apunta al plato creado');
    await q(() => saveRecipe()); await esperar(300);
    assert.equal(await q(() => DB.recipes.length), 5, 'guardar otra vez actualiza, no crea otro');
  });

  await caso(`Elaboración base: rendimiento y coste por unidad en la misma hoja (${ancho}px)`, async () => {
    await q(() => { backToEscandalloRecipes(); setEscandalloTab('elaboraciones'); }); await esperar(300);
    await q(() => openEscandalloRecipe(14)); await esperar(400);
    const r = await q(() => ({rinde: document.getElementById('recipe-base-yield').value, unidad: document.getElementById('recipe-base-unit').value, ud: document.getElementById('es-k-ud').textContent, precio: !!document.getElementById('recipe-price-base')}));
    // (1,5·2,4 + 0,2·6) = 4,8 → +3 % = 4,944 → ÷ 2 L
    assert.equal(r.rinde, '2'); assert.ok(/2,47/.test(r.ud), r.ud); assert.ok(!r.precio, 'una elaboración no tiene precio de venta');
    await q(() => { const y = document.getElementById('recipe-base-yield'); y.value = '4'; y.dispatchEvent(new Event('input', {bubbles:true})); });
    assert.ok(/1,24/.test(await q(() => document.getElementById('es-k-ud').textContent)), 'el coste por litro sigue al rendimiento');
    await q(() => { escandalloHoja && (document.getElementById('recipe-base-yield').value = '2'); esRecalcular(); });
  });

  await caso(`Una categoría nueva desde la hoja no pierde lo que ya estaba escrito (${ancho}px)`, async () => {
    await q(() => { escandalloHojaBase = esHojaFoto(); const n = document.getElementById('recipe-name'); n.value = 'Sofrito de la casa'; const c = document.getElementById('recipe-category'); c.value = '__new__'; onRecipeCategoryChange(14); }); await esperar(300);
    await q(() => { document.getElementById('new-recipe-category-name').value = 'Fondos'; confirmNewRecipeCategory(14); }); await esperar(400);
    const r = await q(() => ({n: document.getElementById('recipe-name').value, c: document.getElementById('recipe-category').value, lineas: document.querySelectorAll('.es-linea').length, sucio: !document.getElementById('es-sucio').hidden}));
    assert.deepEqual(r, {n:'Sofrito de la casa', c:'Fondos', lineas:2, sucio:true});
    await q(() => ggRespondeSalida && backToEscandalloRecipes()); await esperar(300);
    await q(() => ggRespondeSalida('descartar')); await esperar(300);
  });

  await caso(`Duplicar y eliminar desde el menú de la tarjeta (${ancho}px)`, async () => {
    await q(() => { escandalloHoja = null; setEscandalloTab('platos'); openEscandalloFolder('Pescados'); }); await esperar(300);
    await q(() => duplicateRecipe(12)); await esperar(500);
    const r = await q(() => ({nombre: document.getElementById('recipe-name').value, n: DB.recipes.length}));
    assert.ok(/Merluza al horno/.test(r.nombre) && r.n === 6, JSON.stringify(r) + ' → la copia se abre en su hoja');
    await q(() => { escandalloHojaBase = esHojaFoto(); backToEscandalloRecipes(); }); await esperar(300);
    // Eliminar uno que está en una carta avisa antes.
    await q(() => { deleteRecipe(11); }); await esperar(400);
    assert.ok(/carta|menú/i.test(await q(() => document.getElementById('modal-box').innerText)), 'avisa de que está en una carta');
    await q(() => closeModal());
    await q(() => { deleteRecipe(13); }); await esperar(400);
    await q(() => [...document.querySelectorAll('#modal-box button')].find(b => /Confirmar|Aceptar|Sí/i.test(b.textContent)).click()); await esperar(400);
    assert.equal(await q(() => DB.recipes.some(r => r.id === 13)), false);
  });

  if(ancho < 600) await caso(`Móvil: cada ingrediente se ve plegado (nombre, cantidad, coste) y el resto cuelga de un toque (${ancho}px)`, async () => {
    await q(() => { escandalloHoja = null; setEscandalloTab('platos'); openEscandalloRecipe(11); }); await esperar(400);
    const vis = sel => q(s => { const e = document.querySelector('.es-linea ' + s); return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0; }, sel);
    assert.ok(await vis('.es-l-nom') && await vis('.es-l-qty') && await vis('.es-l-coste') && await vis('.pl-chev'));
    assert.ok(!(await vis('.es-l-merma')) && !(await vis('.es-l-acc')), 'plegada: sin merma ni menú');
    await q(() => document.querySelector('.es-linea .es-l-nom').click()); await esperar(200);
    assert.ok(await vis('.es-l-merma') && await vis('.es-l-acc'), 'al tocar se despliega');
    await q(() => { backToEscandalloRecipes(); }); await esperar(300);
  });
  else await caso(`PC: todas las columnas de la hoja a la vista (${ancho}px)`, async () => {
    await q(() => { escandalloHoja = null; openEscandalloRecipe(11); }); await esperar(400);
    assert.ok(await q(() => [...document.querySelectorAll('.es-linea')[0].children].filter(c => !c.classList.contains('pl-chev')).every(c => c.getBoundingClientRect().height > 0)), 'merma, % y menú visibles');
    await q(() => { backToEscandalloRecipes(); }); await esperar(300);
  });

  await caso(`Nada se desborda y los controles se pueden tocar (${ancho}px)`, async () => {
    await q(() => { escandalloHoja = null; openEscandalloRecipe(11); }); await esperar(400);
    const r = await q(() => ({pagina: document.documentElement.scrollWidth > innerWidth + 1,
      toque: [...document.querySelectorAll('#escandallo-list button, #escandallo-list select, #escandallo-list input[type=text]')].filter(b => { const x = b.getBoundingClientRect(); return x.width && (x.height < 34 || x.width < 34); }).map(b => b.outerHTML.slice(0,70))}));
    assert.ok(!r.pagina && r.toque.length === 0, JSON.stringify(r));
    await q(() => { backToEscandalloRecipes(); });
  });

  await caso(`Ningún error de JavaScript (${ancho}px)`, async () => { assert.deepEqual(page.erroresJs, [], page.erroresJs.join(' | ')); });
  await page.close();
}

console.log('\n' + '═'.repeat(70));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
