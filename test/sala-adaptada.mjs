// Sala adaptada a Sala (1/11): Sala nació como copia de Cocina y hablaba de platos, raciones, ingredientes y «food cost»
// donde una barra habla de bebidas, copas, productos y coste de bebida. Esta prueba abre cada pantalla de los módulos
// compartidos en Sala, en los tres idiomas, y falla si aparece vocabulario de cocina; y comprueba lo que no es solo texto:
// que las categorías propias no se cuelen de un área a la otra y que los motivos de merma sean los de cada área.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox'], protocolTimeout:90000});
let fallos = 0;
async function caso(nombre, fn){
  try{ const d = await fn(); console.log('✅ ' + nombre + (d ? '  → ' + d : '')); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}
const esperar = ms => new Promise(r => setTimeout(r, ms));

// Vocabulario de cocina que NO debe verse en Sala (por idioma). «Ingrediente» sí vale en un cóctel y no está.
const P = (palabras) => new RegExp('(?<![\\p{L}])(' + palabras + ')(?![\\p{L}])', 'iu');
const PROHIBIDO = {
  es: P('plato|platos|ración|raciones|elaboración|elaboraciones|food cost|cocinado'),
  ca: P('plat|plats|ració|racions|elaboració|elaboracions|food cost|cuinat'),
  en: P('dish|dishes|portion|portions|food cost|cooked'),
};

async function abrir(lang){
  const page = await browser.newPage();
  await page.setViewport({width:1280, height:900});
  const errores = []; page.on('pageerror', e => errores.push(e.message));
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
  await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
  await page.evaluate((code, lang) => {
    localStorage.setItem(LANG_LS, lang);
    localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
    localStorage.setItem('gastrogoan_owner_login','1');
    localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted','1');
    localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
  }, 'SALAADAP01', lang);
  await page.reload({waitUntil:'domcontentloaded'}); await esperar(2200);
  await page.evaluate(() => {
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, name:'Bar de Pruebas'});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    applyOwnerSessionEditRights(); document.body.classList.add('owner-session'); areaUnlocked.cocina = areaUnlocked.sala = areaUnlocked.gestion = true;
    DB.providers = [{id:1, nombre:'Distribuciones Sur', area:'sala', tipo:'Destilados'}, {id:2, nombre:'Carnes Paco', area:'cocina', tipo:'Carnes'}];
    DB.ingredients = [
      {id:1, name:'Ginebra', unit:'L', price:18, category:'Destilados', allergens:[], area:'sala'},
      {id:2, name:'Vino blanco', unit:'L', price:5, category:'Vinos Blancos', allergens:['Sulfitos'], area:'sala'},
      {id:3, name:'Solomillo', unit:'kg', price:30, category:'Carnes', allergens:[], area:'cocina'},
      {id:4, name:'Merluza', unit:'kg', price:12, category:'Pescados y Marisco', allergens:['Pescado'], area:'cocina'},
    ];
    DB.ingredientCategories = ['Destilados', 'Vinos Blancos', 'Pescados y Marisco', 'Mi categoría vacía'];
    DB.stock = {1:{qty:1,min:4}, 2:{qty:5,min:2}, 3:{qty:1,min:3}, 4:{qty:9,min:2}};
    DB.recipes = [{id:10, name:'Gin Sour', category:'Cócteles', area:'sala', price:9, comensales:1, ingredients:[{type:'ing', ingredientId:1, qty:0.05}], steps:'Agitar'}, {id:11, name:'Jarabe simple', isBase:true, area:'sala', baseYield:1, baseUnit:'L', comensales:1, ingredients:[], steps:''}];
    DB.fichas = [{id:20, recipeId:10, area:'sala', pasos:['Agitar']}];
    DB.elaboraciones = [{id:30, recipeId:11, name:'Jarabe simple', unit:'L', qty:1, min:2, area:'sala'}];
    DB.cartas = [{id:40, nombre:'Carta de bebidas', area:'sala', secciones:[{id:41, nombre:'Cócteles', platos:[{id:42, nombre:'Gin Sour', precio:9, recipeId:10}]}]}];
    currentFolder = 'sala';
  });
  return {page, errores};
}

for(const lang of ['es','ca','en']){
  const {page, errores} = await abrir(lang);
  const texto = (vista, pre, extra) => page.evaluate(async (vista, pre) => {
    currentFolder = 'sala'; navigate(vista); if(pre) eval(pre); await new Promise(r => setTimeout(r, 200));
    return document.querySelector('.view.active').innerText;
  }, vista, pre);
  const limpio = (txt, lang) => (txt.split('\n').filter(l => PROHIBIDO[lang].test(l)).slice(0, 3).join(' ⏎ '));

  const vistas = [
    ['Oferta (carta)', 'carta', "setOfertaTab('carta')"], ['Oferta (menús)', 'carta', "setOfertaTab('menus')"],
    ['Mega Lista', 'megalista', ''],
    ['Escandallo · bebidas', 'escandallo', "escandalloTab='platos'; escandalloFolder=null; renderEscandallo()"],
    ['Escandallo · preparaciones', 'escandallo', "escandalloTab='elaboraciones'; escandalloFolder=null; renderEscandallo()"],
    ['Escandallo · hoja de una bebida', 'escandallo', "openRecipeModal(10)"], ['Escandallo · hoja nueva', 'escandallo', "openRecipeModal(null)"],
    ['Fichas · bebidas', 'fichas', "fichasTab='platos'; fichasFolder=null; renderFichas()"], ['Fichas · preparaciones', 'fichas', "fichasTab='elaboraciones'; fichasFolder=null; renderFichas()"],
    ['Stock · productos', 'stock', "stockTab('ing'); stockFolder=null; renderStock()"], ['Stock · preparaciones', 'stock', "stockTab('elab'); renderStock()"],
    ['Limpieza · alérgenos', 'limpieza', "setLimpiezaTab('alergenos')"], ['Limpieza · higiene de manos', 'limpieza', "setLimpiezaTab('manos')"],
    ['Limpieza · temperaturas', 'limpieza', "setLimpiezaTab('temperaturas')"],
  ];
  for(const [nombre, vista, pre] of vistas){
    await caso(`[${lang}] Sala sin vocabulario de cocina: ${nombre}`, async () => {
      const txt = await texto(vista, pre);
      const malo = limpio(txt, lang);
      assert.equal(malo, '', 'queda vocabulario de cocina: ' + malo);
    });
  }
  await caso(`[${lang}] ventanas de Sala sin vocabulario de cocina (producto, merma)`, async () => {
    const t = await page.evaluate(async () => {
      currentFolder = 'sala'; const out = [];
      navigate('megalista'); openIngredientModal(1); await new Promise(r => setTimeout(r, 200)); out.push(document.getElementById('modal-box').innerText); closeModal();
      navigate('stock'); openMermaModal(); await new Promise(r => setTimeout(r, 200)); out.push(document.getElementById('modal-box').innerText); closeModal();
      return out.join('\n');
    });
    assert.equal(limpio(t, lang), '', limpio(t, lang));
  });
  if(lang !== 'es'){ assert.deepEqual(errores, [], errores.join(' | ')); await page.close(); continue; }

  // Lo que no es solo texto (basta una pasada, en castellano).
  await caso('Tipos de proveedor y categorías de producto: cada área ve solo las suyas', async () => {
    const r = await page.evaluate(() => {
      currentFolder = 'sala'; const sala = providerTiposDisponibles();
      currentFolder = 'cocina'; const cocina = providerTiposDisponibles();
      return {sala, cocina};
    });
    assert.ok(r.sala.includes('Destilados') && r.sala.includes('Vinos Blancos'), 'Sala no ve las suyas: ' + r.sala);
    assert.ok(!r.sala.includes('Pescados y Marisco'), 'Sala ve «Pescados y Marisco»');
    assert.ok(r.cocina.includes('Pescados y Marisco'), 'Cocina no ve las suyas');
    assert.ok(!r.cocina.includes('Vinos Blancos') && !r.cocina.includes('Destilados'), 'Cocina ve categorías de la barra: ' + r.cocina);
    assert.ok(r.sala.includes('Mi categoría vacía') && r.cocina.includes('Mi categoría vacía'), 'una categoría que nadie usa aún debe verse en las dos');
  });
  await caso('El desplegable de categoría del producto en Sala no trae categorías de cocina', async () => {
    const opciones = await page.evaluate(async () => {
      currentFolder = 'sala'; navigate('megalista'); openIngredientModal(1); await new Promise(r => setTimeout(r, 200));
      const o = [...document.querySelectorAll('#ing-category option')].map(x => x.value); closeModal(); return o;
    });
    assert.ok(opciones.includes('Vinos Blancos'), 'falta una propia de Sala: ' + opciones);
    assert.ok(!opciones.includes('Pescados y Marisco') && !opciones.includes('Carnes'), 'se cuela cocina: ' + opciones);
  });
  await caso('Motivos de merma: Sala ofrece rotura e invitación y no sobreproducción; Cocina al revés', async () => {
    const r = await page.evaluate(() => { currentFolder = 'sala'; const s = mermaMotivos(); currentFolder = 'cocina'; const c = mermaMotivos(); return {s, c}; });
    assert.ok(r.s.includes('rotura') && r.s.includes('invitacion') && !r.s.includes('sobreproduccion'), 'Sala: ' + r.s);
    assert.ok(r.c.includes('sobreproduccion') && !r.c.includes('rotura') && !r.c.includes('invitacion'), 'Cocina: ' + r.c);
    for(const l of ['es','ca','en']) for(const m of [...r.s, ...r.c]){
      const ok = await page.evaluate((l, m) => I18N[l]['merma.r.' + m] !== undefined, l, m);
      assert.ok(ok, `falta la traducción merma.r.${m} en ${l}`);
    }
  });
  await caso('Una merma por rotura se anota y descuenta del stock de la barra', async () => {
    const r = await page.evaluate(async () => {
      currentFolder = 'sala'; navigate('stock'); openMermaModal(); await new Promise(r => setTimeout(r, 200));
      const antes = getStockEntry(1).qty;
      document.getElementById('merma-prod').value = 'ing:1';
      mermaActualizar();
      document.getElementById('merma-qty').value = '0.5';
      document.querySelector('input[name="merma-motivo"][value="rotura"]').checked = true; mermaActualizar();
      guardarMerma();
      return {antes, despues: getStockEntry(1).qty, ultima: DB.mermas[DB.mermas.length-1]};
    });
    assert.ok(Math.abs(r.antes - r.despues - 0.5) < 1e-9, `stock ${r.antes} → ${r.despues}`);
    assert.equal(r.ultima.motivo, 'rotura');
  });
  await caso('Stock en Sala: «1 producto» en singular y «preparaciones», sin «elaboraciones»', async () => {
    const t = await page.evaluate(async () => { currentFolder = 'sala'; navigate('stock'); await new Promise(r => setTimeout(r, 250)); return document.querySelector('.view.active').innerText; });
    assert.ok(!/1 productos/i.test(t), '«1 productos»: ' + t.slice(0, 300));
    assert.ok(/preparaci/i.test(t) && !/elaboraci/i.test(t), 'palabra equivocada: ' + t.slice(0, 300));
  });
  await caso('Cocina conserva su vocabulario (no se tocó nada al adaptar Sala)', async () => {
    const t = await page.evaluate(async () => {
      currentFolder = 'cocina'; navigate('escandallo'); escandalloTab='platos'; renderEscandallo(); await new Promise(r => setTimeout(r, 200));
      const a = document.querySelector('.view.active').innerText;
      navigate('stock'); await new Promise(r => setTimeout(r, 200)); const b = document.querySelector('.view.active').innerText;
      navigate('megalista'); await new Promise(r => setTimeout(r, 200)); const c = document.querySelector('.view.active').innerText;
      return a + '\n' + b + '\n' + c;
    });
    assert.ok(/Platos/.test(t) && /Elaboraciones/.test(t) && /Ingredientes/.test(t) && /Nuevo Ingrediente/.test(t), 'Cocina perdió su vocabulario');
    assert.ok(!/Preparaciones|Nuevo Producto/.test(t), 'Cocina usa palabras de Sala');
  });
  await caso('Al volver de Sala a Cocina los textos fijos vuelven a los de Cocina', async () => {
    const r = await page.evaluate(async () => {
      currentFolder = 'sala'; navigate('megalista'); await new Promise(r => setTimeout(r, 150)); const s = document.querySelector('#view-megalista .view-subtitle').textContent;
      currentFolder = 'cocina'; navigate('megalista'); await new Promise(r => setTimeout(r, 150)); const c = document.querySelector('#view-megalista .view-subtitle').textContent;
      return {s, c};
    });
    assert.ok(/productos/i.test(r.s) && /ingredientes/i.test(r.c), JSON.stringify(r));
  });
  await caso('Sin errores de JavaScript', async () => { assert.deepEqual(errores, [], errores.join(' | ')); });
  await page.close();
}
await browser.close();
console.log(fallos ? `\n❌ ${fallos} fallo(s)` : '\n✅ Sala adaptada a Sala');
process.exit(fallos ? 1 : 0);
