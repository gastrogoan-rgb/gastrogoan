// I+D de Sala (31/10): el asistente de barra y sala, con LO SUYO — su ADN, sus ingredientes, su carta, sus creaciones y sus carpetas —,
// y sin que nada de Cocina entre en Sala ni al revés. Se finge el proveedor de IA (como test/idr.mjs): con respuestas fijas se
// comprueba todo lo determinista, que es lo que importa.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox'], protocolTimeout:60000});
let fallos = 0;
async function caso(nombre, fn){
  try{ const d = await fn(); console.log('✅ ' + nombre + (d ? '  → ' + d : '')); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}
const esperar = ms => new Promise(r => setTimeout(r, ms));

const page = await browser.newPage();
await page.setViewport({width:1280, height:900});
const errores = []; page.on('pageerror', e => errores.push(e.message));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(code => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
}, 'IDRSALA001');
await page.reload({waitUntil:'domcontentloaded'}); await esperar(2200);
await page.evaluate(() => {
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, name:'Bar de Pruebas'});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  applyOwnerSessionEditRights(); document.body.classList.add('owner-session'); areaUnlocked.cocina = areaUnlocked.sala = areaUnlocked.gestion = true;
  DB.ingredients = [
    {id:1, name:'ZZCOC Tomate', unit:'kg', price:2, category:'Verduras', allergens:[], area:'cocina'},
    {id:2, name:'Ginebra', unit:'L', price:18, category:'Destilados', allergens:[], area:'sala'},
    {id:3, name:'Zumo de limón', unit:'L', price:4, category:'Zumos', allergens:[], area:'sala'},
    {id:4, name:'Albariño', unit:'L', price:8, category:'Vinos', allergens:['Sulfitos'], area:'sala'},
  ];
  DB.stock = {};
  DB.recipes = [{id:900, name:'ZZCOC Croquetas', area:'cocina', comensales:1, ingredients:[{type:'ing', ingredientId:1, qty:0.1}], steps:''}];
  DB.fichas = [];
  DB.cartas = [{id:700, nombre:'Carta cocina', area:'cocina', secciones:[{id:710, nombre:'Entrantes', platos:[{id:711, nombre:'ZZCOC Croquetas', precio:9, recipeId:900}]}]}];
  DB.menus = []; DB.elaboraciones = []; DB.purchaseOrders = [];
  DB.idr = {adn:{cocina:'Catalana de mercado', nivel:'Bistró', publico:'Barrio'}, creaciones:[], carpetas:[]};
  window.__llamadas = [];
  window.idrHayIA = () => true;
  window.llmChat = async (sistema, mensajes) => {
    const ultimo = (mensajes[mensajes.length - 1] || {}).content || '';
    window.__llamadas.push({sistema, ultimo});
    let j;
    if(/Propón el maridaje/.test(ultimo)) j = {maridajes:[
      {plato:'ZZCOC Croquetas', opciones:[{bebida:'Albariño', tipo:'vino', motivo:'Acidez que corta la fritura.'}, {bebida:'Gin Sour de la casa', tipo:'cóctel', motivo:'Cítrico y burbuja de la clara.'}, {bebida:'Spritz de la casa', tipo:'cóctel', motivo:'Burbuja y amargor contra lo graso.'}], sinAlcohol:'Tónica de pomelo con romero'},
      {plato:'Plato que no se pidió', opciones:[{bebida:'Algo', tipo:'vino', motivo:'x'}], sinAlcohol:''}], nota:'Todo ligero.'};
    else if(/Escribe la receta de UNA COPA/.test(ultimo)) j = {nombre:'Gin Sour de la casa', descripcion:'Cítrico y sedoso', comensales:1, pasos:['Agitar con hielo', 'Servir en copa fría'], ingredientes:[{nombre:'Ginebra', cantidad:50, unidad:'ml'}, {nombre:'Zumo de limón', cantidad:25, unidad:'ml'}, {nombre:'Clara de huevo', cantidad:20, unidad:'ml'}], elaboraciones:[]};
    else if(/preparación de barra/.test(ultimo)) j = {nombre:'Jarabe de romero', descripcion:'Para sours', pasos:['Infusionar'], ingredientes:[{nombre:'Zumo de limón', cantidad:100, unidad:'ml'}]};
    else j = {respuesta:'Te propongo dos caminos: un sour clásico y uno largo.', listo:true, falta:[]};
    return {ok:true, texto: JSON.stringify(j)};
  };
  window.encargoHecho = () => { const c = idrCreacion(idrCreacionActiva); if(c){ Object.assign(idrEncargo(c), {pvp:9, foodCost:25, hecho:true}); saveDB(); } };
  saveDB();
});
const q = (fn, ...a) => page.evaluate(fn, ...a);

await caso('I+D está en la carpeta de Sala, y un camarero sin permiso de edición no lo ve', async () => {
  const r = await q(() => ({sala: FOLDERS.sala.modules.some(m => m.id === 'idr'), cocina: FOLDERS.cocina.modules.some(m => m.id === 'idr'), oculto: HIDDEN_MODULES_WHEN_LOCKED.sala.includes('idr')}));
  assert.ok(r.sala && r.cocina && r.oculto, JSON.stringify(r));
});

await caso('El ADN es de cada área: el de Cocina no vale para Sala, y Sala pide sus propios campos', async () => {
  const r = await q(() => {
    currentFolder = 'sala';
    const sala0 = idrAdnRelleno();
    const faltaSala = idrAdnQueFalta();
    currentFolder = 'cocina'; const cocina = idrAdnRelleno();
    currentFolder = 'sala'; navigate('idr'); idrEmpezar('plato');
    const modal = !!document.getElementById('adn-concepto') && !document.getElementById('adn-cocina');
    closeModal();
    Object.assign(idrAdn(), {concepto:'Coctelería de autor', nivel:'Copa de diario', publico:'Parejas'});
    return {sala0, faltaSala, cocina, modal, salaDespues: idrAdnRelleno(), adnCocina: JSON.stringify(DB.idr.adn), adnSala: JSON.stringify(DB.idr.adnSala)};
  });
  assert.ok(!r.sala0 && r.cocina && r.modal && r.salaDespues, JSON.stringify(r));
  assert.ok(/Tipo de local/.test(r.faltaSala[0]), 'pide «tipo de local», no «cocina y tradición»: ' + r.faltaSala);
  assert.ok(/Catalana/.test(r.adnCocina) && !/Coctelería/.test(r.adnCocina), 'el ADN de Cocina no se ha tocado: ' + r.adnCocina);
  assert.ok(/Coctelería/.test(r.adnSala));
});

await caso('La pantalla de Sala ofrece cóctel, preparación, maridaje y carta de bebidas — sin menús —; la de Cocina, lo suyo y sin maridajes', async () => {
  const r = await q(() => {
    currentFolder = 'sala'; navIdr('inicio');
    const tipos = html => [...html.matchAll(/idrEmpezar\('(\w+)'\)/g)].map(m => m[1]);
    const sala = tipos(document.getElementById('view-idr').innerHTML);
    const salaTxt = document.getElementById('view-idr').innerText;
    currentFolder = 'cocina'; navIdr('inicio');
    const cocina = tipos(document.getElementById('view-idr').innerHTML);
    const cocinaMar = (() => { const n = idrCreaciones().length; idrEmpezar('maridaje'); return idrCreaciones().length - n; })();
    currentFolder = 'sala'; navIdr('inicio');
    const salaMenu = (() => { const n = idrCreaciones().length; idrEmpezar('menu'); return idrCreaciones().length - n; })();
    return {sala, salaTxt, cocina, cocinaMar, salaMenu};
  });
  assert.deepEqual(r.sala, ['plato', 'base', 'maridaje', 'carta']); assert.deepEqual(r.cocina, ['base', 'plato', 'menu', 'carta']);
  assert.equal(r.cocinaMar, 0, 'en Cocina no se puede empezar un maridaje'); assert.equal(r.salaMenu, 0, 'en Sala no hay menús de platos');
  assert.ok(/Cóctel o bebida/.test(r.salaTxt) && /Maridajes/.test(r.salaTxt));
});

await caso('El asistente de Sala solo ve lo de Sala (su reglamento, sus ingredientes) y el de Cocina solo lo de Cocina', async () => {
  const r = await q(() => {
    currentFolder = 'sala'; const sala = idrSistema();
    currentFolder = 'cocina'; const cocina = idrSistema();
    return {sala, cocina};
  });
  assert.ok(/barra y una sala/.test(r.sala) && !/cocina profesional/.test(r.sala), 'reglas de barra');
  assert.ok(/Ginebra/.test(r.sala) && /Albariño/.test(r.sala) && !/ZZCOC/.test(r.sala), 'en Sala: sus botellas y NADA de la cocina');
  assert.ok(/Coctelería de autor/.test(r.sala) && !/Catalana de mercado/.test(r.sala), 'su ADN, no el de la cocina');
  assert.ok(/cocina profesional/.test(r.cocina) && /ZZCOC Tomate/.test(r.cocina) && !/Ginebra/.test(r.cocina) && !/Coctelería/.test(r.cocina), 'en Cocina: lo suyo y nada de la barra');
  assert.ok(/PROPORCIONES CLÁSICAS DE BARRA/.test(r.sala) && !/PROPORCIONES CLÁSICAS DE BARRA/.test(r.cocina));
});

await caso('Un cóctel se crea para Sala: receta de Sala, con las botellas de Sala y el coste puesto por la app', async () => {
  const r = await q(async () => {
    currentFolder = 'sala'; navIdr('inicio'); idrEmpezar('plato');
    const c = idrCreacion(idrCreacionActiva);
    window.encargoHecho(); renderIdr();
    document.getElementById('idr-libre').value = 'Un sour de ginebra'; idrGuardarLibre('Un sour de ginebra');
    await idrEnviarInterno();
    await idrCrearPlatoReal(c.id);
    const cr = idrCreacion(c.id);
    const rec = getRecipe(cr.recipeId);
    return {area: c.area, rec: rec && {name: rec.name, area: rec.area, lineas: rec.ingredients.map(l => l.ingredientId), coste: recipeCost(rec)}, faltan: cr.faltan, pedido: window.__llamadas.some(l => /diseñado la bebida/.test(l.ultimo)) ? 'diseñado la bebida' : window.__llamadas.map(l => l.ultimo.slice(0, 50)).join(' | ')};
  });
  assert.equal(r.area, 'sala'); assert.ok(r.rec && r.rec.area === 'sala', JSON.stringify(r));
  assert.deepEqual(r.rec.lineas.sort(), [2, 3], 'ginebra y limón, de Sala; la clara no existe y queda pendiente');
  assert.ok(Math.abs(r.rec.coste - (0.05 * 18 + 0.025 * 4) * 1.05) < 0.02, 'coste puesto por la app con SUS precios: ' + r.rec.coste);
  assert.ok((r.faltan||[]).some(f => /Clara/.test(f)), JSON.stringify(r.faltan));
  assert.ok(/diseñado la bebida/.test(r.pedido), "se pide con el texto de bebida, no el de plato: " + r.pedido);
});

await caso('Lo creado en Sala no aparece en Cocina (ni las carpetas), y al revés', async () => {
  const r = await q(() => {
    currentFolder = 'sala'; navIdr('inicio'); idrCarpetasTodas().push({id:555, nombre:'Cartas de verano', area:'sala'});
    const c0 = idrCreaciones().length;
    idrEmpezar('base'); const base = idrCreacion(idrCreacionActiva); base.carpetaId = 555;
    currentFolder = 'cocina'; navIdr('inicio');
    const cocina = {txt: document.getElementById('view-idr').innerText, carpetas: idrCarpetas().map(f => f.nombre), nCreac: idrCreaciones().filter(x => (x.area||'cocina') === 'cocina').length};
    idrEmpezar('plato'); const platoCoc = idrCreacion(idrCreacionActiva);
    currentFolder = 'sala'; navIdr('inicio');
    const sala = {txt: document.getElementById('view-idr').innerText, carpetas: idrCarpetas().map(f => f.nombre)};
    return {cocina, sala, areaPlatoCoc: platoCoc.area, abiertaAlCambiar: idrCreacionActiva};
  });
  assert.ok(!/Gin Sour/.test(r.cocina.txt) && !/Jarabe|Preparación/.test(r.cocina.txt.replace(/Preparación de barra/g, '')) , 'Cocina no ve las creaciones de Sala: ' + r.cocina.txt.slice(0, 200));
  assert.deepEqual(r.cocina.carpetas, [], 'ni la carpeta de Sala'); assert.ok(r.sala.carpetas.includes('Cartas de verano'));
  assert.equal(r.areaPlatoCoc, 'cocina'); assert.ok(/sour de ginebra/i.test(r.sala.txt) && !/Catalana/.test(r.sala.txt), r.sala.txt.slice(0, 300));
});

await caso('Maridajes: se marcan platos de la carta de la cocina, el asistente propone y SOLO se guardan los pedidos', async () => {
  const r = await q(async () => {
    currentFolder = 'sala'; navIdr('inicio'); idrEmpezar('maridaje');
    const c = idrCreacion(idrCreacionActiva);
    const vistaAntes = document.getElementById('view-idr').innerText;
    const cocinaAntes = JSON.stringify({r: DB.recipes.filter(x => x.area === 'cocina'), c: DB.cartas, i: DB.ingredients.filter(x => x.area === 'cocina')});
    idrMaridajeToggle(c.id, 'ZZCOC Croquetas', true);
    await idrProponerMaridajes(c.id);
    const cv = idrCreacion(c.id);
    const html = document.getElementById('view-idr').innerText;
    return {area: c.area, encargo: c.encargo, vistaAntes: /Croquetas/.test(vistaAntes), pedido: window.__llamadas.at(-1).ultimo, sistema: window.__llamadas.at(-1).sistema, maridajes: cv.maridajes, nota: cv.notaGeneral,
      html, cocinaIgual: cocinaAntes === JSON.stringify({r: DB.recipes.filter(x => x.area === 'cocina'), c: DB.cartas, i: DB.ingredients.filter(x => x.area === 'cocina')}), chips: [...document.querySelectorAll('.idr-mar-op .pr-chip')].map(x => x.textContent.trim().toLowerCase())};
  });
  assert.equal(r.area, 'sala'); assert.ok(r.encargo.hecho); assert.ok(r.vistaAntes, 'se ve la carta de la cocina para elegir');
  assert.ok(/ZZCOC Croquetas \(lleva: ZZCOC Tomate\)/.test(r.pedido), 'el plato viaja con sus ingredientes: ' + r.pedido.slice(0, 200));
  assert.equal(r.maridajes.length, 1, 'el plato que no se pidió no se guarda'); assert.equal(r.maridajes[0].opciones.length, 3);
  assert.ok(r.cocinaIgual, 'Cocina queda EXACTAMENTE igual: el maridaje solo lee');
  assert.ok(r.chips.some(c => /la tienes|you stock/.test(c)), 'el Albariño ya lo tiene: ' + r.chips); assert.ok(r.chips.some(c => /en tu carta|on your menu/.test(c)), 'el Gin Sour que acabamos de crear ya está en su carta: ' + r.chips); assert.ok(r.chips.some(c => /no la tienes|not in stock/.test(c)), 'el spritz de la casa no: ' + r.chips);
  assert.ok(/Tónica de pomelo/.test(r.html) && /Todo ligero/.test(r.html));
});

await caso('Desde un maridaje se puede crear la bebida que falta: nace en Sala con la idea ya escrita', async () => {
  const r = await q(() => {
    const c = idrCreaciones().find(x => x.tipo === 'maridaje');
    const n0 = idrCreaciones().length;
    idrMaridajeCrearBebida(c.id, 0, 2);
    const nueva = idrCreacion(idrCreacionActiva);
    return {mas: idrCreaciones().length - n0, tipo: nueva.tipo, area: nueva.area, titulo: nueva.titulo, borrador: nueva.borrador};
  });
  assert.equal(r.mas, 1); assert.equal(r.tipo, 'plato'); assert.equal(r.area, 'sala'); assert.equal(r.titulo, 'Spritz de la casa'); assert.ok(/Croquetas/.test(r.borrador) && /amargor/.test(r.borrador));
});

await caso('Una carta de bebidas se guarda como carta de Sala', async () => {
  const r = await q(() => {
    currentFolder = 'sala';
    const c = idrNuevaCreacion('carta');
    idrGuardarConjunto(c, [{id:1, nombre:'Aperitivos', platos:[]}], [], 'Equilibrada');
    const carta = DB.cartas.find(x => x.id === c.cartaId);
    return {area: carta.area, esBebida: isBebidaCarta(carta)};
  });
  assert.equal(r.area, 'sala'); assert.ok(r.esBebida);
});

await caso('Las pantallas de Sala se ven bien en móvil y sin errores', async () => {
  for(const ancho of [360, 412]){
    await page.setViewport({width: ancho, height: 800}); await esperar(150);
    const r = await q(() => { currentFolder = 'sala'; navIdr('inicio'); const m = document.getElementById('view-idr'); const c = idrCreaciones().find(x => x.tipo === 'maridaje'); const a = m.scrollWidth - m.clientWidth;
      navIdr('creacion', c.id); const b = document.getElementById('view-idr'); return {inicio: a, mar: b.scrollWidth - b.clientWidth, pagina: document.documentElement.scrollWidth - window.innerWidth}; });
    assert.ok(r.inicio <= 1 && r.mar <= 1 && r.pagina <= 0, ancho + ': ' + JSON.stringify(r));
  }
  assert.deepEqual(errores, []);
});

await browser.close();
if(fallos){ console.log(`\n❌ ${fallos} casos fallaron`); process.exit(1); }
console.log('\n✅ I+D de Sala: todos los casos pasaron');
