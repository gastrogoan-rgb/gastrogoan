// Fichas técnicas (30/10): una sola pantalla donde la ficha se crea, se lee y se edita —un documento para cocinar—, con el
// paso a paso numerado y señalizado (tiempo, temperatura y «ojo»), la producción que escala los ingredientes, tarjetas en
// la lista y un impreso a dos columnas.
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
  }, 'FICHAS001');
  await page.reload({waitUntil:'domcontentloaded'});
  await esperar(2200);
  await page.evaluate(()=>{
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, name:'Bar de Pruebas'});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    const ing = (id, name, unit, price, allergens) => ({id, name, category:'Pescados', unit, supplier:'', price, packQty:1, packPrice:price, iva:10, allergens: allergens || [], area:'cocina'});
    DB.ingredients = [ing(1,'Merluza','kg',14,['Pescado']), ing(2,'Patata','kg',1), ing(3,'Aceite','L',6)];
    DB.stock = {}; DB.cartas = [];
    DB.recipeCategories = [{name:'Pescados', area:'cocina'}, {name:'Entrantes', area:'cocina'}];
    const L = (id, qty) => ({type:'ingredient', ingredientId:id, qty, merma:0});
    DB.recipes = [
      {id:11, name:'Merluza con patata', price:19.8, priceBase:18, ivaPct:10, category:'Pescados', consumiblesPct:5, comensales:4, area:'cocina', isBase:false, ingredients:[L(1,0.8), L(2,0.8), L(3,0.1)]},
      {id:12, name:'Patata panadera', price:0, isBase:true, baseYield:2, baseUnit:'kg', category:'Entrantes', area:'cocina', ingredients:[L(2,2)]},
      {id:13, name:'Ensalada', price:8.8, priceBase:8, ivaPct:10, category:'Entrantes', comensales:1, area:'cocina', isBase:false, ingredients:[L(2,0.1)]},
    ];
    DB.fichas = [
      {id:1, name:'Merluza con patata', recipeId:11, comensales:4, baseComensales:4, produccion:8, tiempo:45, temp:'CALIENTE', ingredients:[],
       pasos:['Limpiar la merluza y cortar en lomos.', 'Cocer la patata en agua con sal.', 'Freír los lomos y montar.'],
       pasosDet:[{min:15}, {min:8, temp:'100 °C', aviso:'Que no se deshagan'}, {}], allergens:['Gluten'], presentation:'Lomos sobre la patata.', photo:'', area:'cocina'},
      {id:2, name:'Receta suelta de la abuela', recipeId:'', comensales:2, baseComensales:2, produccion:2, tiempo:'', temp:'AMBIENTE', ingredients:['200 g harina','2 huevos'], pasos:['Mezclar todo.'], allergens:[], presentation:'', photo:'', area:'cocina'},
    ];
    saveDB(); currentFolder = 'cocina'; fichaHoja = false; fichasFolder = null; fichasTab = 'platos'; navigate('fichas');
  });
  await esperar(500);
  return page;
}

for(const ancho of [1280, 360]){
  const page = await abrir(ancho);
  const q = (fn, ...a) => page.evaluate(fn, ...a);

  await caso(`La lista: carpetas con icono de trazo y platos en tarjetas con pasos, tiempo y alérgenos (${ancho}px)`, async () => {
    const car = await q(() => [...document.querySelectorAll('.ml-carpeta .ml-carpeta-nom')].map(n => n.textContent.trim()));
    assert.deepEqual(car, ['Pescados', 'Entrantes']);
    assert.ok(await q(() => !!document.querySelector('.ml-carpeta .ml-ico svg')));
    await q(() => openFichaFolder('Pescados')); await esperar(250);
    const t0 = await q(() => document.querySelector('.es-plato').innerText.replace(/\s+/g,' '));
    assert.ok(/Merluza con patata/.test(t0) && /PASOS/i.test(t0) && /45 min/.test(t0), t0);
    assert.ok(!(await q(() => !!document.querySelector('#fichas-list table'))), 'ya no son filas');
    await q(() => document.querySelector('.es-plato [data-acc]').click()); await esperar(150);
    assert.deepEqual(await q(() => [...document.querySelectorAll('.mn-item')].map(i => i.textContent.trim())), ['Abrir', 'Imprimir', 'Duplicar', 'Eliminar']);
    await page.keyboard.press('Escape');
  });

  await caso(`Pulsar una ficha la abre en la misma pantalla: documento con ingredientes y paso a paso (${ancho}px)`, async () => {
    await q(() => document.querySelector('.es-plato').click()); await esperar(400);
    const r = await q(() => ({modal: document.getElementById('modal-overlay').classList.contains('active'), pasos: document.querySelectorAll('.fi-paso').length,
      nums: [...document.querySelectorAll('.fi-paso-n')].map(n => n.textContent), ings: [...document.querySelectorAll('.fi-ings li')].map(l => l.innerText.replace(/\s+/g,' ').trim()),
      titulo: document.getElementById('fi-ing-tit').innerText.replace(/\s+/g,' '), nombre: document.getElementById('ficha-name').value}));
    assert.ok(!r.modal, 'ya no es un modal'); assert.equal(r.pasos, 3); assert.deepEqual(r.nums, ['1','2','3']);
    // producción 8 raciones sobre una base de 4 → ×2
    assert.deepEqual(r.ings, ['1,6 kg Merluza', '1,6 kg Patata', '0,2 L Aceite']); assert.ok(/para 8 raciones/i.test(r.titulo), r.titulo);
    assert.equal(r.nombre, 'Merluza con patata');
    const det = await q(() => [...document.querySelectorAll('.fi-paso')].map(p => ({min: p.querySelector('input[type=number]').value, temp: p.querySelector('.fi-det input[type=text]').value, ojo: p.querySelector('.fi-det-ojo input').value})));
    assert.deepEqual(det[1], {min:'8', temp:'100 °C', ojo:'Que no se deshagan'});
  });

  await caso(`Cambiar la producción reescala los ingredientes al momento, sin repintar la ficha (${ancho}px)`, async () => {
    await q(() => { const p = document.getElementById('ficha-produccion'); p.value = '4'; p.dispatchEvent(new Event('change', {bubbles:true})); }); await esperar(200);
    assert.deepEqual(await q(() => [...document.querySelectorAll('.fi-ings li')].map(l => l.innerText.replace(/\s+/g,' ').trim())), ['0,8 kg Merluza', '0,8 kg Patata', '0,1 L Aceite']);
    assert.equal(await q(() => DB.fichas.find(f => f.id === 1).produccion), 4, 'la escala se guarda sola');
    assert.ok(await q(() => document.getElementById('fi-sucio').hidden), 'cambiar la escala no es «cambios sin guardar»');
  });

  await caso(`Editar: añadir, mover y quitar pasos con su tiempo, temperatura y «ojo», y guardar (${ancho}px)`, async () => {
    await q(() => addFichaStep()); await esperar(250);
    assert.equal(await q(() => document.querySelectorAll('.fi-paso').length), 4);
    await q(() => { const ps = document.querySelectorAll('.fi-paso'); const u = ps[3]; const tx = u.querySelector('textarea'); tx.value = 'Servir enseguida.'; tx.dispatchEvent(new Event('input', {bubbles:true}));
      const m = u.querySelector('input[type=number]'); m.value = '2'; m.dispatchEvent(new Event('input', {bubbles:true}));
      const o = u.querySelector('.fi-det-ojo input'); o.value = 'Que no se enfríe'; o.dispatchEvent(new Event('input', {bubbles:true})); });
    assert.ok(await q(() => !document.getElementById('fi-sucio').hidden), 'aparece «cambios sin guardar»');
    await q(() => moveFichaStep(3, -1)); await esperar(250);
    assert.deepEqual(await q(() => [...document.querySelectorAll('.fi-paso textarea')].map(t => t.value.slice(0,12))), ['Limpiar la m', 'Cocer la pat', 'Servir enseg', 'Freír los lo']);
    await q(() => removeFichaStep(0)); await esperar(250);
    await q(() => saveFicha()); await esperar(500);
    const f = await q(() => DB.fichas.find(x => x.id === 1));
    assert.equal(f.pasos.length, 3); assert.equal(f.pasos[0], 'Cocer la patata en agua con sal.');
    assert.deepEqual(f.pasosDet, [{min:8, temp:'100 °C', aviso:'Que no se deshagan'}, {min:2, aviso:'Que no se enfríe'}, {}], 'los detalles viajan con su paso: ' + JSON.stringify(f.pasosDet));
    assert.ok(await q(() => document.getElementById('fi-sucio').hidden), 'guardada: sin cambios pendientes');
    assert.ok(await q(() => !!document.getElementById('ficha-name')), 'se queda en la ficha');
  });

  await caso(`Salir con cambios pregunta; descartar no toca lo guardado (${ancho}px)`, async () => {
    await q(() => { const n = document.getElementById('ficha-tiempo'); n.value = '99'; n.dispatchEvent(new Event('input', {bubbles:true})); backToFichaList(); }); await esperar(400);
    assert.ok(await q(() => document.getElementById('modal-overlay').classList.contains('active')), 'pregunta antes de salir');
    await q(() => ggRespondeSalida('descartar')); await esperar(400);
    assert.ok(await q(() => !!document.querySelector('.es-plato')), 'vuelve a la lista');
    assert.equal(await q(() => DB.fichas.find(f => f.id === 1).tiempo), 45);
  });

  await caso(`Ficha suelta (sin escandallo): ingredientes en texto, editables, y una ficha nueva se crea en la misma pantalla (${ancho}px)`, async () => {
    await q(() => { backToFichaFolders(); }); await esperar(250);
    await q(() => document.querySelector('.es-plato').click()); await esperar(400);
    assert.deepEqual(await q(() => [...document.querySelectorAll('.fi-ing-fila input')].map(i => i.value)), ['200 g harina', '2 huevos']);
    await q(() => { backToFichaList(); openFichaModal(); }); await esperar(400);
    assert.ok(await q(() => !!document.getElementById('ficha-name') && !document.getElementById('modal-overlay').classList.contains('active')));
    await q(() => saveFicha()); await esperar(300);
    assert.equal(await q(() => DB.fichas.length), 2, 'sin nombre no se crea');
    await q(() => { const n = document.getElementById('ficha-name'); n.value = 'Salsa brava'; updateFichaStep(0, 'Sofreír la cebolla.'); });
    await q(() => saveFicha()); await esperar(400);
    const r = await q(() => ({n: DB.fichas.length, f: DB.fichas.find(x => x.name === 'Salsa brava'), id: fichaModalState.id}));
    assert.equal(r.n, 3); assert.deepEqual(r.f.pasos, ['Sofreír la cebolla.']); assert.equal(r.id, r.f.id, 'la ficha ya apunta a la creada');
    await q(() => saveFicha()); await esperar(300);
    assert.equal(await q(() => DB.fichas.length), 3, 'guardar otra vez actualiza, no duplica');
  });

  await caso(`Sin permiso de editar la ficha se lee como un documento: pasos numerados, sin campos (${ancho}px)`, async () => {
    await q(() => { backToFichaList(); window.__eu = editUnlocked; editUnlocked = false; openFichaModal(1); }); await esperar(400);
    const r = await q(() => ({campos: document.querySelectorAll('#fichas-list textarea, .fi-paso-det input').length, leer: [...document.querySelectorAll('.fi-paso-leer')].map(p => p.textContent.slice(0,10)),
      ojo: !!document.querySelector('.fi-ojo'), chips: document.querySelectorAll('.fi-paso-chips .fi-chip').length, guardar: [...document.querySelectorAll('#fichas-list .es-barra button')].some(b => /Guardar/.test(b.textContent) && getComputedStyle(b).display !== 'none')}));
    assert.equal(r.campos, 0); assert.deepEqual(r.leer, ['Cocer la p', 'Servir ens', 'Freír los ']);
    assert.ok(r.ojo && r.chips >= 2, JSON.stringify(r)); assert.ok(!r.guardar, 'sin botón de guardar');
    await q(() => { editUnlocked = window.__eu; backToFichaList(); });
  });

  await caso(`El impreso: dos columnas, casillas, pasos numerados con sus «ojo» y alérgenos a la vista (${ancho}px)`, async () => {
    const html = await q(() => { window.__h = ''; const o = window.open; window.open = () => ({document:{write:h => { window.__h += h; }, close(){}}, print(){}}); printFicha(1); window.open = o; return window.__h; });
    assert.ok(html.includes('class="fp-cols"') && html.includes('fp-chk') && html.includes('fp-n-paso'), 'estructura del impreso');
    assert.ok(/OJO[\s\S]*Que no se deshagan/.test(html) && /8 MIN/.test(html) && /100 °C/.test(html), 'tiempos, temperatura y ojo impresos');
    assert.ok(/fp-alergenos[\s\S]*Pescado[\s\S]*Gluten/.test(html), 'alérgenos (los del escandallo y los manuales)');
    assert.ok(!/class="ti /.test(html), 'sin iconos de fuente: la ventana de impresión no los carga');
  });

  await caso(`Nada se desborda y los campos se pueden tocar (${ancho}px)`, async () => {
    await q(() => { backToFichaList(); openFichaModal(1); }); await esperar(400);
    const r = await q(() => ({pagina: document.documentElement.scrollWidth > innerWidth + 1,
      toque: [...document.querySelectorAll('#fichas-list button, #fichas-list select, #fichas-list input:not([type=file])')].filter(b => { const x = b.getBoundingClientRect(); return x.width && (x.height < 34 || x.width < 34); }).map(b => b.outerHTML.slice(0,80))}));
    assert.ok(!r.pagina && r.toque.length === 0, JSON.stringify(r));
    await q(() => backToFichaList());
  });

  await caso(`Ningún error de JavaScript (${ancho}px)`, async () => { assert.deepEqual(page.erroresJs, [], page.erroresJs.join(' | ')); });
  await page.close();
}

console.log('\n' + '═'.repeat(70));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
