// Stock (30/10): resumen, carpetas con lo que está bajo mínimo, filas con − / + que guardan UNA vez, mínimo y menú ⋯
// plegados en móvil, merma y historial por producto, y el reparto de permisos (empleado sin edición).
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
  }, 'STOCKDS01');
  await page.reload({waitUntil:'domcontentloaded'});
  await esperar(2200);
  await page.evaluate(()=>{
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, name:'Bar de Pruebas'});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    DB.ingredients = [
      {id:101, name:'Hamburguesa de ternera', category:'Carnes', unit:'ud', price:1.2, area:'cocina'},
      {id:102, name:'Tomate', category:'Verduras', unit:'g', price:0.002, area:'cocina'},
      {id:103, name:'Aceite de oliva virgen extra', category:'Verduras', unit:'L', price:6, area:'cocina'},
      {id:104, name:'Sal', category:'Verduras', unit:'kg', price:0.5, area:'cocina'},
      {id:105, name:'Pan de hamburguesa', category:'', unit:'ud', price:0.4, area:'cocina'}
    ];
    DB.stock = {101:{qty:2, min:10}, 102:{qty:5000, min:3000}, 103:{qty:1, min:4}, 104:{qty:3, min:0}, 105:{qty:30, min:20}};
    DB.stockLog = [];
    DB.recipes = [{id:900, name:'Fondo oscuro', isBase:true, unit:'L', category:'Salsas', ingredients:[], steps:[], area:'cocina'}];
    DB.elaboraciones = [
      {id:501, recipeId:900, name:'Fondo oscuro', unit:'L', qty:1, min:5, area:'cocina'},
      {id:502, name:'Sofrito de la casa', unit:'kg', qty:4, min:2, category:'Salsas', area:'cocina'}
    ];
    DB.mermas = []; DB.purchaseOrders = []; DB.categoryIcons = {recipe:{}, ingredient:{}};
    saveDB(); currentFolder = 'cocina'; navigate('stock');
  });
  await esperar(500);
  return page;
}

for(const ancho of [1280, 360]){
  const page = await abrir(ancho);
  const q = (fn, ...a) => page.evaluate(fn, ...a);

  await caso(`El resumen cuenta productos y elaboraciones, lo que está bajo mínimo y el valor del stock (${ancho}px)`, async () => {
    const r = await q(() => [...document.querySelectorAll('#stock-kpis .st-cel')].map(c => ({et: c.querySelector('.st-cel-et').textContent.trim(), v: c.querySelector('.st-cel-v').textContent.trim(), s: c.querySelector('.st-cel-s')?.textContent.trim() || ''})));
    assert.equal(r.length, 4, JSON.stringify(r));
    assert.equal(r[0].v, '5'); assert.equal(r[1].v, '2');
    assert.equal(r[2].v, '3', 'hamburguesa, aceite y fondo oscuro: ' + JSON.stringify(r[2]));
    assert.ok(/2 .*1 /.test(r[2].s), r[2].s);
    assert.ok(/€/.test(r[3].v), r[3].v);
  });

  await caso(`Las pestañas llevan el número de alertas y las carpetas dicen cuántos productos están bajo mínimo (${ancho}px)`, async () => {
    const r = await q(() => ({
      ing: document.getElementById('stock-n-ing').textContent, elab: document.getElementById('stock-n-elab').textContent,
      carpetas: [...document.querySelectorAll('#stock-ing-groups .ml-carpeta')].map(c => c.querySelector('.ml-carpeta-nom').textContent.trim() + '|' + (c.querySelector('.st-carp-baja')?.textContent.trim() || ''))
    }));
    assert.equal(r.ing, '2'); assert.equal(r.elab, '1');
    assert.ok(r.carpetas.some(c => /^Carnes\|1/.test(c)) && r.carpetas.some(c => /^Verduras\|1/.test(c)), JSON.stringify(r.carpetas));
  });

  await caso(`Dentro de una carpeta lo que pide atención va arriba, y el nombre nunca se parte a media palabra (${ancho}px)`, async () => {
    await q(() => openStockFolder('Verduras')); await esperar(200);
    const r = await q(() => [...document.querySelectorAll('.st-fila')].map(f => {
      const b = f.querySelector('.st-nom b'); const rg = document.createRange(); rg.selectNodeContents(b);
      return {nom: b.textContent, bajo: f.classList.contains('is-bajo'), renglones: rg.getClientRects().length, desborda: b.scrollWidth > b.clientWidth + 1};
    }));
    assert.deepEqual(r.map(x => x.nom), ['Aceite de oliva virgen extra', 'Sal', 'Tomate']);
    assert.ok(r[0].bajo && !r[1].bajo, JSON.stringify(r));
    assert.ok(r.every(x => !x.desborda), JSON.stringify(r));
    assert.ok(r[1].renglones === 1, 'una sola palabra no necesita más de un renglón: ' + JSON.stringify(r));
  });

  await caso(`Pulsar − / + varias veces guarda UNA sola vez y deja un único apunte en el Historial (${ancho}px)`, async () => {
    await q(() => { DB.stockLog = []; });
    // El − / + es de la fila de Tomate (g, de 100 en 100).
    for(let i = 0; i < 3; i++){ await q(() => document.querySelector('[data-st="ing-102"] .st-qty button:nth-of-type(2)').click()); await esperar(80); }
    const antes = await q(() => ({visible: document.querySelector('[data-st="ing-102"] .st-qty input').value, guardado: getStockEntry(102).qty, log: DB.stockLog.length}));
    assert.equal(antes.visible, '5300'); assert.equal(antes.guardado, 5000, 'aún sin guardar'); assert.equal(antes.log, 0);
    await esperar(1000);
    const despues = await q(() => ({guardado: getStockEntry(102).qty, log: DB.stockLog.length, ultimo: DB.stockLog[DB.stockLog.length-1]}));
    assert.equal(despues.guardado, 5300); assert.equal(despues.log, 1, 'un solo apunte, no tres');
    assert.equal(despues.ultimo.before, 5000); assert.equal(despues.ultimo.after, 5300);
  });

  await caso(`Escribir la cantidad a mano guarda al momento (${ancho}px)`, async () => {
    const r = await q(() => { const i = document.querySelector('[data-st="ing-102"] .st-qty input'); i.value = '4200'; i.dispatchEvent(new Event('change', {bubbles:true})); return getStockEntry(102).qty; });
    assert.equal(r, 4200);
  });

  await caso(`El mínimo y el menú ⋯ ${ancho < 600 ? 'se pliegan en móvil y se abren con un toque' : 'están a la vista en PC'} (${ancho}px)`, async () => {
    await q(() => backToStockFolders());
    await q(() => openStockFolder('Carnes')); await esperar(200);
    const visible = sel => q(s => { const e = document.querySelector(s); return !!e && e.getBoundingClientRect().width > 0; }, sel);
    if(ancho < 600){
      assert.ok(!(await visible('.st-fila .st-min')), 'el mínimo cuelga de un toque');
      assert.ok(await visible('.st-fila .st-qty'), 'la cantidad siempre a la vista');
      await q(() => document.querySelector('.st-fila .st-nom').click()); await esperar(150);
      assert.ok(await visible('.st-fila .st-min') && await visible('.st-fila .st-acc .mn-btn'), 'abierta: mínimo y ⋯');
    } else {
      assert.ok(await visible('.st-fila .st-min') && await visible('.st-fila .st-acc .mn-btn'));
    }
  });

  await caso(`El ⋯ de un producto anota su merma ya elegido y enseña SU historial (${ancho}px)`, async () => {
    await q(() => document.querySelector('.st-fila .st-acc .mn-btn').click()); await esperar(150);
    const items = await q(() => [...document.querySelectorAll('.mn-menu .mn-item')].map(b => b.textContent.trim()));
    assert.ok(items.length >= 3, JSON.stringify(items));
    await q(() => document.querySelector('.mn-menu .mn-item').click()); await esperar(300);
    const r = await q(() => ({sel: document.getElementById('merma-prod').value, abre: !!document.getElementById('merma-qty')}));
    assert.equal(r.sel, 'ing:101'); assert.ok(r.abre);
    await q(() => closeModal());
    await q(() => { DB.stockLog.push({id:1, fecha:'2026-10-30', hora:'10:00', type:'ing', refId:101, name:'Hamburguesa de ternera', before:5, after:2, delta:-3, area:'cocina', source:'manual'}, {id:2, fecha:'2026-10-30', hora:'10:01', type:'ing', refId:102, name:'Tomate', before:1, after:2, delta:1, area:'cocina', source:'manual'}); openStockLogModal('ing', 101); });
    await esperar(250);
    const filas = await q(() => [...document.querySelectorAll('#modal-box tbody tr')].map(tr => tr.textContent));
    assert.equal(filas.length, 1, JSON.stringify(filas)); assert.ok(/Hamburguesa/.test(filas[0]));
    await q(() => closeModal());
  });

  await caso(`«Solo alertas» filtra (desde el chip o desde la cifra) y sin alertas lo dice (${ancho}px)`, async () => {
    await q(() => { backToStockFolders(); });
    await q(() => document.querySelector('#stock-kpis .st-cel-btn').click()); await esperar(200);
    const r = await q(() => ({chk: document.getElementById('stock-only-alerts').checked, off: document.getElementById('stock-chip-alertas').classList.contains('is-off'),
      filas: [...document.querySelectorAll('#stock-ing-groups .st-fila .st-nom b')].map(b => b.textContent)}));
    assert.ok(r.chk && r.off); assert.deepEqual(r.filas.sort(), ['Aceite de oliva virgen extra', 'Hamburguesa de ternera']);
    await q(() => { DB.stock[101].qty = 50; DB.stock[103].qty = 50; renderStock(); }); await esperar(150);
    const vacio = await q(() => document.querySelector('#stock-ing-groups .es-vacio')?.textContent.trim());
    assert.ok(/Nada por debajo del mínimo/.test(vacio || ''), vacio);
    await q(() => { DB.stock[101].qty = 2; DB.stock[103].qty = 1; document.getElementById('stock-only-alerts').checked = false; renderStock(); });
  });

  await caso(`«Pedir lo que falta» solo sale con alertas y lleva a Pedidos (${ancho}px)`, async () => {
    const v = await q(() => document.getElementById('stock-pedir').style.display !== 'none');
    assert.ok(v);
    await q(() => document.getElementById('stock-pedir').click()); await esperar(300);
    const vista = await q(() => ({activa: document.querySelector('.view.active')?.id, tab: pedidosTab}));
    assert.equal(vista.activa, 'view-pedidos'); assert.equal(vista.tab, 'crear');
    await q(() => navigate('stock')); await esperar(200);
  });

  await caso(`Elaboraciones: las de escandallo llevan su etiqueta y las manuales se editan y borran desde el ⋯ (${ancho}px)`, async () => {
    await q(() => stockTab('elab'));
    await q(() => { document.getElementById('stock-search').value = 'o'; renderStock(); }); await esperar(200);
    const filas = await q(() => [...document.querySelectorAll('#stock-elab-groups .st-fila')].map(f => ({nom: f.querySelector('.st-nom b').textContent, esc: !!f.querySelector('.st-tag:not(.bajo):not(.cam)'), bajo: f.classList.contains('is-bajo'),
      acc: JSON.parse(f.querySelector('.mn-btn').dataset.acc).map(a => a.texto)})));
    const fondo = filas.find(f => f.nom === 'Fondo oscuro'), sofrito = filas.find(f => f.nom === 'Sofrito de la casa');
    assert.ok(fondo && fondo.bajo && fondo.esc, JSON.stringify(fondo));
    assert.ok(sofrito && !sofrito.bajo, JSON.stringify(sofrito));
    assert.ok(sofrito.acc.includes('Eliminar') && sofrito.acc.includes('Editar'), JSON.stringify(sofrito.acc));
    assert.ok(!fondo.acc.includes('Eliminar'), 'una de escandallo no se borra desde aquí: ' + JSON.stringify(fondo.acc));
    await q(() => { document.getElementById('stock-search').value = ''; stockTab('ing'); renderStock(); });
  });

  await caso(`Las ventanas de Stock abren con el diseño nuevo y sin errores (${ancho}px)`, async () => {
    for(const fn of ['openMermaModal()', 'openMermasInformeModal()', 'openStockValueModal()', 'openStockLogModal()', 'openElaboracionModal(502)']){
      await q(f => { closeModal(); eval(f); }, fn); await esperar(250);
      const r = await q(() => ({nuevo: document.getElementById('modal-box').classList.contains('ds-nuevo'), desborda: document.getElementById('modal-box').scrollWidth > document.getElementById('modal-box').clientWidth + 1}));
      assert.ok(r.nuevo, fn + ' sin ds-nuevo'); assert.ok(!r.desborda, fn + ' desborda');
    }
    await q(() => closeModal());
  });

  await caso(`Un empleado sin edición cuenta existencias, pero no ve el valor, ni mermas, ni historial, ni toca el mínimo (${ancho}px)`, async () => {
    await q(() => {
      localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'employee', employeeId:1, area:'cocina', ts:Date.now()}));
      document.body.classList.remove('owner-session', 'edit-unlocked'); editUnlocked = false;
      document.querySelectorAll('.owner-strict').forEach(e => e.classList.add('x'));
      openStockFolder('Verduras');
    });
    const r = await q(() => {
      const vis = e => !!e && e.getBoundingClientRect().width > 0;
      const valor = [...document.querySelectorAll('#stock-kpis .st-cel-btn')].find(b => /Valor del stock/.test(b.textContent));
      const cab = document.querySelector('#stock-menu .mn-btn');
      const min = document.querySelector('.st-fila .st-min input');
      return {valor: vis(valor), menuCab: vis(cab), minDeshab: min && min.disabled, steppers: vis(document.querySelector('.st-qty .btn'))};
    });
    assert.ok(!r.valor && !r.menuCab, JSON.stringify(r));
    assert.ok(r.minDeshab, JSON.stringify(r)); assert.ok(r.steppers, JSON.stringify(r));
  });

  await caso(`Ningún error de JavaScript (${ancho}px)`, async () => assert.deepEqual(page.erroresJs, []));
  await page.close();
}

// Cinco anchos de móvil: nada se sale de la pantalla y ninguna fila se desborda.
for(const ancho of [320, 360, 390, 412, 430]){
  const page = await abrir(ancho);
  await caso(`Sin desbordes con el stock lleno en ${ancho}px`, async () => {
    const r = await page.evaluate(() => {
      const malos = [];
      openStockFolder('Verduras');
      document.querySelectorAll('.st-fila, .st-resumen, .st-barra, .st-cel, .ml-carpeta').forEach(e => { if(e.scrollWidth > e.clientWidth + 1) malos.push(e.className); });
      return {malos, pagina: document.documentElement.scrollWidth - window.innerWidth};
    });
    assert.deepEqual(r.malos, []); assert.ok(r.pagina <= 0, 'la página se mueve de lado: ' + r.pagina);
  });
  await page.close();
}

await browser.close();
if(fallos){ console.log(`\n❌ ${fallos} casos fallaron`); process.exit(1); }
console.log('\n✅ Stock: todos los casos pasaron');
