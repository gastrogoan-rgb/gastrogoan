// Mega Lista (30/10): carpetas con icono de trazo, lista con «Compra (sin IVA)» y el IVA justo al lado, «por revisar»,
// IVA en línea y por carpeta, formulario con precio sin IVA + IVA y cálculo en vivo, selector de iconos.
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
  }, 'MEGALI001');
  await page.reload({waitUntil:'domcontentloaded'});
  await esperar(2200);
  await page.evaluate(()=>{
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, name:'Bar de Pruebas'});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    DB.providers = [{id:1, nombre:'Verduras Ca la Rosa', area:'cocina'}, {id:2, nombre:'Pescados Martínez', area:'cocina'}];
    // Un negocio con datos: unas verduras con precio, otras sin nada.
    DB.ingredients = [
      {id:101, name:'Ajo', category:'Verduras', unit:'g', supplier:'Verduras Ca la Rosa', price:0.0009, packQty:1000, packPrice:0.9, iva:4, allergens:[], area:'cocina'},
      {id:102, name:'Tomate', category:'Verduras', unit:'g', supplier:'Verduras Ca la Rosa', price:0.002, packQty:1000, packPrice:2, allergens:[], area:'cocina'},
      {id:103, name:'Apio', category:'Verduras', unit:'g', supplier:'', price:0, packQty:1, packPrice:0, allergens:['Apio'], area:'cocina'},
      {id:104, name:'Gamba', category:'Pescados y Marisco', unit:'g', supplier:'Pescados Martínez', price:0.038, packQty:1000, packPrice:38, iva:10, allergens:['Crustáceos'], area:'cocina'},
      {id:105, name:'Pan rallado', category:'', unit:'kg', supplier:'Verduras Ca la Rosa', price:2, packQty:1, packPrice:2, iva:10, allergens:['Gluten'], area:'cocina'},
    ];
    DB.stock = {}; DB.recipes = []; DB.purchaseOrders = []; DB.preciosHistorial = [];
    DB.categoryIcons = {recipe:{}, ingredient:{'Verduras':'🥬'}};
    saveDB(); currentFolder = 'cocina'; navigate('megalista');
  });
  await esperar(500);
  return page;
}

for(const ancho of [1280, 360]){
  const page = await abrir(ancho);
  const q = (fn, ...a) => page.evaluate(fn, ...a);

  await caso(`Las carpetas llevan icono de trazo (no emoji), su recuento y lo que falta por revisar (${ancho}px)`, async () => {
    const r = await q(() => [...document.querySelectorAll('.ml-carpeta')].map(c => ({
      nom: c.querySelector('.ml-carpeta-nom').textContent.trim(), svg: !!c.querySelector('.ml-ico svg'),
      meta: c.querySelector('.ml-carpeta-meta').textContent.trim(), pend: c.querySelector('.ml-carpeta-pend')?.textContent.trim() || '' })));
    assert.deepEqual(r.map(x => x.nom), ['Pescados y Marisco', 'Verduras', 'Sin categoría'], 'orden alfabético y "Sin categoría" al final');
    assert.ok(r[0].svg && r[1].svg, 'las carpetas de verdad llevan icono de trazo: ' + JSON.stringify(r));
    assert.ok(/3 /.test(r[1].meta) && /por revisar: 2/.test(r[1].pend), JSON.stringify(r[1]));
    assert.equal(r[2].pend, '', 'Pan rallado tiene todo');
  });

  await caso(`«Por revisar» cuenta lo que falta y filtra al pulsarlo (${ancho}px)`, async () => {
    const chips = await q(() => [...document.querySelectorAll('#megalista-resumen .btn')].map(b => b.textContent.replace(/\s+/g,' ').trim()));
    assert.deepEqual(chips, ['Sin precio 1', 'Sin IVA 2', 'Sin proveedor 1']);
    await q(() => setMegalistaRevisar('iva')); await esperar(200);
    const filas = await q(() => [...document.querySelectorAll('.ml-fila .ml-nom b')].map(b => b.textContent));
    assert.deepEqual(filas.sort(), ['Apio', 'Tomate']);
    await q(() => setMegalistaRevisar('iva')); await esperar(200);
    assert.ok(await q(() => !!document.querySelector('.ml-carpeta')), 'al soltar el filtro vuelven las carpetas');
  });

  await caso(`En la lista el precio va sin IVA y el IVA justo a su lado (${ancho}px)`, async () => {
    await q(() => openMegalistaFolder('Verduras')); await esperar(250);
    const r = await q(() => {
      const fila = document.querySelector('.ml-fila');
      const celdas = [...fila.children].map(c => c.className.replace('ml-c ', '').split(' ')[0]);
      return {celdas, cab: [...document.querySelectorAll('.ml-cab .ml-th')].map(b => b.textContent.trim()),
        compra: fila.querySelector('.ml-compra').textContent.replace(/\s+/g,' ').trim(), iva: fila.querySelector('.ml-iva-sel').value};
    });
    assert.ok(r.celdas.indexOf('ml-iva') === r.celdas.indexOf('ml-compra') + 1, 'el IVA debe ir justo después de la compra: ' + r.celdas);
    if(ancho > 760) assert.ok(/Compra \(sin IVA\)/i.test(r.cab.join('|')) && r.cab.indexOf(r.cab.find(x => /^IVA/.test(x))) === r.cab.findIndex(x => /Compra/.test(x)) + 1, 'cabeceras: ' + r.cab);
    assert.ok(/1000 g × 0,90 €/.test(r.compra) && /0,0009 €\/g/.test(r.compra), r.compra);
    assert.equal(r.iva, '4');
  });

  await caso(`El IVA se cambia en la propia fila, sin repintar, y los contadores se ponen al día (${ancho}px)`, async () => {
    const antes = await q(() => document.querySelector('#megalista-resumen').innerText.replace(/\s+/g,' '));
    assert.ok(/Sin IVA 2/.test(antes), antes);
    await q(() => { const s = [...document.querySelectorAll('.ml-fila')].find(f => f.querySelector('b').textContent === 'Tomate').querySelector('select'); s.value = '4'; s.dispatchEvent(new Event('change', {bubbles:true})); });
    await esperar(200);
    const r = await q(() => ({iva: DB.ingredients.find(i => i.id === 102).iva, rojo: [...document.querySelectorAll('.ml-fila')].find(f => f.querySelector('b').textContent === 'Tomate').querySelector('select').classList.contains('is-falta'),
      resumen: document.querySelector('#megalista-resumen').innerText.replace(/\s+/g,' ')}));
    assert.equal(r.iva, 4); assert.ok(!r.rojo, 'ya no es rojo'); assert.ok(/Sin IVA 1/.test(r.resumen), r.resumen);
  });

  await caso(`IVA de toda la carpeta: avisa de cuántos cambia y los pone todos (${ancho}px)`, async () => {
    await q(() => { document.getElementById('ml-iva-lote').value = '10'; aplicarIvaCarpeta(); }); await esperar(400);
    const msg = await q(() => document.getElementById('modal-box').innerText.replace(/\s+/g,' '));
    assert.ok(/3 ingredientes pasarán a IVA 10%/.test(msg) && /2 de ellos tenían otro tipo/.test(msg), msg);
    await q(() => [...document.querySelectorAll('#modal-box button')].find(b => /Confirmar|Aceptar|Sí/i.test(b.textContent)).click()); await esperar(400);
    assert.deepEqual(await q(() => [101,102,103].map(id => DB.ingredients.find(i => i.id === id).iva)), [10,10,10]);
    assert.deepEqual(await q(() => DB.ingredients.filter(i => i.category !== 'Verduras').map(i => i.iva)), [10, 10], 'las demás carpetas no se tocan');
  });

  if(ancho < 600) await caso(`En móvil cada ingrediente se ve plegado (nombre y precio) y el resto cuelga de un toque (${ancho}px)`, async () => {
    await q(() => { megalistaRevisar = ''; backToMegalistaFolders(); openMegalistaFolder('Verduras'); }); await esperar(300);
    const vis = sel => q(s => { const e = document.querySelector('.ml-fila ' + s); return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0; }, sel);
    assert.ok(await vis('.ml-nom') && await vis('.ml-compra') && await vis('.pl-chev'), 'plegada: se ve el nombre, el precio y la flecha');
    assert.ok(!(await vis('.ml-prov')) && !(await vis('.ml-iva')) && !(await vis('.ml-acc')), 'plegada: proveedor, IVA y botones están escondidos');
    await q(() => document.querySelector('.ml-fila .ml-nom').click()); await esperar(200);
    assert.ok(await vis('.ml-prov') && await vis('.ml-iva') && await vis('.ml-acc'), 'al tocar la fila se despliega');
    assert.equal(await q(() => document.querySelector('.ml-fila .pl-chev').getAttribute('aria-expanded')), 'true');
    await q(() => renderMegalista()); await esperar(200);
    assert.ok(await vis('.ml-prov'), 'repintar la lista no la vuelve a plegar');
    // Un toque en el desplegable del IVA es del IVA: no pliega la fila.
    await q(() => document.querySelector('.ml-fila .ml-iva-sel').click()); await esperar(150);
    assert.ok(await vis('.ml-prov'), 'tocar el IVA no cierra la fila');
    await q(() => document.querySelector('.ml-fila .pl-chev').click()); await esperar(200);
    assert.ok(!(await vis('.ml-prov')), 'la flecha la cierra');
    await q(() => backToMegalistaFolders());
  });
  else await caso(`En PC no hay nada plegado: todo está a la vista (${ancho}px)`, async () => {
    await q(() => { backToMegalistaFolders(); openMegalistaFolder('Verduras'); }); await esperar(300);
    assert.ok(await q(() => [...document.querySelectorAll('.ml-fila .pl-extra')].every(e => e.getBoundingClientRect().height > 0 || e.classList.contains('is-vacio'))), 'proveedor, IVA y botones visibles');
    assert.ok(await q(() => getComputedStyle(document.querySelector('.pl-chev')).display === 'none'), 'sin flecha en PC');
    await q(() => backToMegalistaFolders());
  });

  await caso(`Buscar y filtrar por proveedor dan una lista plana con su recuento; sin resultados lo dice (${ancho}px)`, async () => {
    await q(() => { backToMegalistaFolders(); const b = document.getElementById('megalista-search'); b.value = 'gamba'; renderMegalista(); }); await esperar(250);
    assert.deepEqual(await q(() => [...document.querySelectorAll('.ml-fila .ml-nom b')].map(b => b.textContent)), ['Gamba']);
    await q(() => { document.getElementById('megalista-search').value = 'zzz'; renderMegalista(); }); await esperar(200);
    assert.ok(await q(() => !!document.querySelector('#megalista-content .empty')));
    await q(() => { document.getElementById('megalista-search').value = ''; document.getElementById('megalista-filter-prov').value = 'Pescados Martínez'; renderMegalista(); }); await esperar(250);
    assert.equal(await q(() => document.querySelectorAll('.ml-fila').length), 1);
    await q(() => { document.getElementById('megalista-filter-prov').value = ''; renderMegalista(); });
  });

  await caso(`Ordenar por compra (cabecera en PC, desplegable en móvil) (${ancho}px)`, async () => {
    await q(() => { megalistaSortKey = 'name'; megalistaSortDir = 1; document.getElementById('megalista-search').value = 'a'; renderMegalista(); }); await esperar(200);
    if(ancho > 760) await q(() => setMegalistaSort('price'));
    else {
      assert.ok(await q(() => getComputedStyle(document.getElementById('megalista-orden')).display !== 'none'), 'en móvil el orden se elige con el desplegable');
      await q(() => { const s = document.getElementById('megalista-orden'); s.value = 'price'; s.dispatchEvent(new Event('change')); });
    }
    await esperar(250);
    const precios = await q(() => [...document.querySelectorAll('.ml-fila .ml-nom b')].map(b => { const i = DB.ingredients.find(x => x.name === b.textContent); return i.packPrice; }));
    assert.deepEqual(precios, [...precios].sort((a,b) => a-b), 'de menor a mayor: ' + precios);
    await q(() => { document.getElementById('megalista-search').value = ''; megalistaSortKey = 'name'; renderMegalista(); });
  });

  await caso(`Formulario: precio sin IVA, IVA a su lado y el cálculo en vivo (${ancho}px)`, async () => {
    await q(() => openIngredientModal(104)); await esperar(400);
    const r = await q(() => {
      const precio = document.getElementById('ing-pack-price'), iva = document.getElementById('ing-iva');
      const lab = document.querySelector('label[for="ing-pack-price"]').textContent;
      const mismaFila = precio.closest('.field-row') === iva.closest('.field-row');
      const orden = [...precio.closest('.field-row').querySelectorAll('input,select')].map(e => e.id);
      return {lab, mismaFila, orden, iva: iva.value, calculo: document.getElementById('ing-calculo').innerText.replace(/\s+/g,' ')};
    });
    assert.ok(/sin IVA/i.test(r.lab), r.lab);
    assert.ok(r.mismaFila && r.orden.join() === 'ing-pack-price,ing-iva', 'precio e IVA en la misma fila y en ese orden: ' + r.orden);
    assert.equal(r.iva, '10'); assert.ok(/0,038 €\/g/.test(r.calculo) && /Con IVA 41,80 €/.test(r.calculo), r.calculo);
    await q(() => { const i = document.getElementById('ing-iva'); i.value = '21'; i.dispatchEvent(new Event('change')); });
    assert.ok(/Con IVA 45,98 €/.test(await q(() => document.getElementById('ing-calculo').innerText.replace(/\s+/g,' '))), 'el cálculo sigue al IVA');
    await q(() => closeModal());
  });

  await caso(`Guardar: el IVA elegido se guarda; sin elegir no se inventa ninguno; al editar se conserva (${ancho}px)`, async () => {
    await q(() => { openIngredientModal(); }); await esperar(300);
    await q(() => { document.getElementById('ing-name').value = 'Limón'; document.getElementById('ing-pack-qty').value = '1000'; document.getElementById('ing-pack-price').value = '2.4'; const i = document.getElementById('ing-iva'); i.value = '4'; });
    await q(async () => { await saveIngredient(); }); await esperar(300);
    let l = await q(() => DB.ingredients.find(i => i.name === 'Limón'));
    assert.equal(l.iva, 4); assert.ok(Math.abs(l.price - 0.0024) < 1e-9);
    await q(() => { openIngredientModal(); }); await esperar(300);
    await q(() => { document.getElementById('ing-name').value = 'Lima'; document.getElementById('ing-pack-qty').value = '500'; document.getElementById('ing-pack-price').value = '3'; });
    await q(async () => { await saveIngredient(); }); await esperar(300);
    l = await q(() => DB.ingredients.find(i => i.name === 'Lima'));
    assert.ok(l.iva == null, 'sin elegir, queda sin IVA (y la lista lo marca): ' + l.iva);
    await q(() => { openIngredientModal(104); }); await esperar(300);
    await q(async () => { await saveIngredient(104); }); await esperar(300);
    assert.equal(await q(() => DB.ingredients.find(i => i.id === 104).iva), 10, 'editar sin tocar el IVA lo conserva');
  });

  await caso(`Nueva categoría desde el formulario no pierde el IVA ya elegido (${ancho}px)`, async () => {
    await q(() => { openIngredientModal(); }); await esperar(300);
    await q(() => { document.getElementById('ing-name').value = 'Trufa'; const i = document.getElementById('ing-iva'); i.value = '21'; const c = document.getElementById('ing-category'); c.value = '__new__'; onIngredientCategoryChange(null); });
    await esperar(300);
    await q(() => { document.getElementById('new-ingredient-category-name').value = 'Setas'; confirmNewIngredientCategory(null); }); await esperar(400);
    const r = await q(() => ({iva: document.getElementById('ing-iva').value, cat: document.getElementById('ing-category').value, nombre: document.getElementById('ing-name').value}));
    assert.deepEqual(r, {iva:'21', cat:'Setas', nombre:'Trufa'});
    await q(() => closeModal());
  });

  await caso(`Alérgenos como casillas-botón: se marcan y se guardan (${ancho}px)`, async () => {
    await q(() => { openIngredientModal(105); }); await esperar(300);
    await q(() => { [...document.querySelectorAll('.ml-alc input')].find(c => c.value === 'Soja').click(); });
    await q(async () => { await saveIngredient(105); }); await esperar(300);
    assert.deepEqual(await q(() => DB.ingredients.find(i => i.id === 105).allergens.sort()), ['Gluten', 'Soja']);
  });

  await caso(`Elegir el icono de una carpeta con el catálogo de trazo; también en Stock sale bien (${ancho}px)`, async () => {
    await q(() => { navigate('megalista'); backToMegalistaFolders(); openCategoryIconModal('Verduras','Verduras','renderMegalista','ingredient'); }); await esperar(400);
    assert.ok(await q(() => document.querySelectorAll('#modal-box .ico-btn').length > 100), 'el selector enseña el catálogo');
    await q(() => document.querySelector('#modal-box .ico-btn[title="Pizza"]').click()); await esperar(300);
    assert.equal(await q(() => DB.categoryIcons.ingredient['Verduras']), 'ic:pizza');
    assert.ok(await q(() => !!document.querySelector('.ml-carpeta .ml-ico svg')));
    assert.ok((await q(() => getCategoryIcon('Verduras', 'ingredient'))).startsWith('<svg'), 'las demás pantallas reciben el dibujo, no el texto "ic:pizza"');
    await q(() => { currentFolder = 'cocina'; navigate('stock'); }); await esperar(500);
    assert.ok(!(await q(() => document.getElementById('content').innerText)).includes('ic:pizza'), 'Stock no debe enseñar el código del icono');
    await q(() => navigate('megalista'));
  });

  await caso(`Sin permiso de editar, el IVA se ve pero no se toca (${ancho}px)`, async () => {
    await q(() => { window.__io = isOwnerSession; window.__eu = editUnlocked; isOwnerSession = () => false; editUnlocked = false; openMegalistaFolder('Verduras'); }); await esperar(300);
    assert.ok(await q(() => [...document.querySelectorAll('.ml-iva-sel')].every(s => s.disabled)));
    assert.ok(!(await q(() => !!document.getElementById('ml-iva-lote'))), 'ni el IVA por carpeta');
    await q(() => { isOwnerSession = window.__io; editUnlocked = window.__eu; backToMegalistaFolders(); });
  });

  await caso(`Nada se desborda ni se corta (${ancho}px)`, async () => {
    await q(() => openMegalistaFolder('Verduras')); await esperar(300);
    const r = await q(() => ({pagina: document.documentElement.scrollWidth > innerWidth + 1,
      filas: [...document.querySelectorAll('.ml-fila')].filter(f => f.scrollWidth > f.clientWidth + 1).length,
      toque: [...document.querySelectorAll('#megalista-content button, #megalista-content select')].filter(b => { const x = b.getBoundingClientRect(); return x.width && (x.height < 34 || x.width < 34); }).map(b => b.outerHTML.slice(0,60))}));
    assert.ok(!r.pagina && r.filas === 0 && r.toque.length === 0, JSON.stringify(r));
    await q(() => backToMegalistaFolders());
  });

  await caso(`Ningún error de JavaScript (${ancho}px)`, async () => { assert.deepEqual(page.erroresJs, [], page.erroresJs.join(' | ')); });
  await page.close();
}

console.log('\n' + '═'.repeat(70));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
