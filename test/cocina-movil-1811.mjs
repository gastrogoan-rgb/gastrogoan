// Ajustes de móvil de Cocina (18/11, vídeo en un Android real). Cinco causas comunes, medidas en 320-430 y en tablet:
//  1) el «?» de ayuda es un botón pequeño EN LA MISMA LÍNEA que su título/rótulo (nunca una fila para él solo);
//  2) el texto escrito en un buscador con lupa NO cae encima de la lupa;
//  3) en la ficha técnica el lápiz y el «⋯» de cada paso van en la fila del número, no en una fila propia bajo el texto;
//  4) NINGÚN textarea enseña el tirador de redimensionar y todos crecen con lo escrito, sin salirse por la derecha;
//  5) un paso con texto largo, en mayúsculas y sin espacios, no desborda y se lee con letra normal.
// Servir con `python3 -m http.server 8950` (SHOTS=<carpeta> guarda capturas).
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const PUERTO = process.env.PUERTO || '8950';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox'], protocolTimeout:30000});
let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}
const esperar = ms => new Promise(r => setTimeout(r, ms));
const LARGO = 'CORTAR A LA MITAD CON EL CUCHILLO DE SIERRA Y RETIRAR LA CORTEZA SIN ROMPER LA MIGA ' + 'SUPERCALIFRAGILISTICOESPIALIDOSO'.repeat(3);

async function abrir(ancho){
  const page = await browser.newPage();
  await page.setViewport({width:ancho, height: ancho < 600 ? 800 : 1000});
  page.erroresJs = [];
  page.on('pageerror', e => page.erroresJs.push(e.message));
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
  await page.goto(`http://localhost:${PUERTO}/dist/index.html`, {waitUntil:'domcontentloaded'});
  await page.evaluate(code => {
    localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
    localStorage.setItem('gastrogoan_owner_login','1');
    localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted','1');
    localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
  }, 'COCINA1811');
  await page.reload({waitUntil:'domcontentloaded'});
  await esperar(2200);
  await page.evaluate(largo => {
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate','app-splash'].forEach(id => document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, name:'Bar de Pruebas'});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    DB.business.pedidos = Object.assign({}, DB.business.pedidos, {delivery:true});
    const ing = (id, name, unit, price) => ({id, name, category:'Pescados', unit, supplier:'', price, packQty:1, packPrice:price, iva:10, allergens:[], area:'cocina'});
    DB.ingredients = [ing(1,'Merluza','kg',14), ing(2,'Patata','kg',1), ing(3,'Aceite','L',6)];
    DB.stock = {}; DB.elaboraciones = [];
    DB.recipeCategories = [{name:'Pescados', area:'cocina'}];
    const L = (id, qty) => ({type:'ingredient', ingredientId:id, qty, merma:0});
    DB.recipes = [{id:11, name:'Merluza con patata', price:19.8, priceBase:18, ivaPct:10, category:'Pescados', consumiblesPct:5, comensales:4, area:'cocina', isBase:false, ingredients:[L(1,0.8), L(2,0.8)]}];
    DB.cartas = [{id:1, nombre:'CARTA', area:'cocina', horario:defaultItemHorario(), secciones:[{id:1, nombre:'Pescados', platos:[{id:1, nombre:'Merluza con patata', recipeId:11, precio:19.8}]}]}];
    DB.fichas = [{id:1, name:'Merluza con patata', recipeId:11, comensales:4, baseComensales:4, produccion:4, tiempo:45, temp:'CALIENTE', ingredients:[],
      pasos:[largo, 'Cocer la patata en agua con sal.', 'Freír los lomos y montar.'], pasosDet:[{min:15}, {min:8, aviso:'Que no se deshagan'}, {}],
      allergens:[], presentation:'Lomos sobre la patata.', photo:'', area:'cocina'}];
    saveDB(); currentFolder = 'cocina';
  }, LARGO);
  return page;
}
const caja = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); if(!e) return null; const r = e.getBoundingClientRect(); return {x:r.left, y:r.top, w:r.width, h:r.height, b:r.bottom, r:r.right}; }, sel);
async function mostrar(page, nombre, ancho){
  if(!process.env.SHOTS) return;
  await page.screenshot({path: `${process.env.SHOTS}/${nombre}-${ancho}.png`});
}

for(const ancho of [320, 360, 390, 412, 430, 768]){
  const page = await abrir(ancho);
  const q = (fn, ...a) => page.evaluate(fn, ...a);

  // ── 1) «?» junto a su rótulo ─────────────────────────────────────────────────────────────────────────────────────
  await q(() => { escandalloHoja = null; escandalloFolder = null; escandalloTab = 'platos'; navigate('escandallo'); openRecipeModal(11); });
  await esperar(600);
  await caso(`«?» de ayuda pequeño y en la misma línea que su título o rótulo (${ancho}px)`, async () => {
    const r = await q(() => [...document.querySelectorAll('.gg-ayuda:not([open]) > summary')].map(s => {
      const ant = s.parentElement.previousElementSibling, a = s.getBoundingClientRect(), b = ant ? ant.getBoundingClientRect() : null;
      const bloque = ant && ant.matches('.gg-lbl-ayuda') ? ant.querySelector('label').getBoundingClientRect() : b;
      return {w:a.width, h:a.height, ant: ant ? ant.className || ant.tagName : null, dy: bloque ? Math.abs((a.top + a.height / 2) - (bloque.top + bloque.height / 2)) : 999};
    }));
    if(ancho > 760) return;     // en tablet ancha la nota va a la vista (no hay «?»)
    assert.ok(r.length >= 2, 'esperaba el «?» de Ingredientes y el de Suplemento delivery: ' + JSON.stringify(r));
    r.forEach(x => { assert.ok(x.w <= 32 && x.h <= 32, 'el botón visible es pequeño: ' + JSON.stringify(x)); assert.ok(x.dy < 14, 'comparte línea con su rótulo: ' + JSON.stringify(x)); });
  });
  await caso(`El «?» conserva zona de toque de 44 px y abre su texto (${ancho}px)`, async () => {
    if(ancho > 760) return;
    const r = await q(() => { const s = document.querySelector('.gg-ayuda > summary'); const cs = getComputedStyle(s, '::after'); return {w: parseFloat(cs.width), h: parseFloat(cs.height)}; });
    assert.ok(r.w >= 44 && r.h >= 44, JSON.stringify(r));
    await q(() => document.querySelector('.gg-ayuda > summary').click()); await esperar(100);
    const abierto = await q(() => { const d = document.querySelector('.gg-ayuda[open]'); return d && d.innerText.length > 10 && d.getBoundingClientRect().right <= innerWidth; });
    assert.ok(abierto, 'abierto enseña el texto sin salirse');
    await q(() => document.querySelector('.gg-ayuda[open] > summary').click());
  });

  // ── 2) buscador con lupa ─────────────────────────────────────────────────────────────────────────────────────────
  await caso(`Escandallo › buscar ingredientes: el texto empieza después de la lupa (${ancho}px)`, async () => {
    const r = await q(() => {
      const i = document.getElementById('recipe-add-ingredient-search'), l = i.parentElement.querySelector('.ti-search');
      const ri = i.getBoundingClientRect(), rl = l.getBoundingClientRect();
      return {pl: parseFloat(getComputedStyle(i).paddingLeft), lupaFin: rl.right - ri.left};
    });
    assert.ok(r.pl >= r.lupaFin + 2, `padding ${r.pl} ≥ fin de la lupa ${r.lupaFin}`);
    await page.focus('#recipe-add-ingredient-search'); await page.keyboard.sendCharacter('Mer'); await esperar(150);
    await mostrar(page, 'escandallo-busca', ancho);
    await q(() => { const i = document.getElementById('recipe-add-ingredient-search'); i.value = ''; i.blur(); });
  });
  await caso(`Todos los buscadores con lupa de Cocina reservan sitio para el icono (${ancho}px)`, async () => {
    const mal = [];
    const revisar = async (nombre, fn) => { await q(fn); await esperar(400); const r = await q(() => [...document.querySelectorAll('.oc-buscar, .es-anadir-buscar, .gg-buscar')].filter(c => c.offsetParent).map(c => {
      const i = c.querySelector('input[type=text],input[type=search]'), l = c.querySelector('.ti-search');
      if(!i || !l) return null;
      return {pl: parseFloat(getComputedStyle(i).paddingLeft), fin: l.getBoundingClientRect().right - i.getBoundingClientRect().left};
    }).filter(Boolean)); r.forEach(x => { if(x.pl < x.fin + 2) mal.push(nombre + ' ' + JSON.stringify(x)); }); return r.length; };
    let vistos = 0;
    vistos += await revisar('oferta', () => { navigate('carta'); });
    vistos += await revisar('oferta-editar', () => { openCarta(1); });
    assert.ok(vistos >= 1, 'se vio algún buscador');
    assert.deepEqual(mal, []);
  });

  // ── 3 y 5) ficha técnica: mandos de cada paso y texto largo ──────────────────────────────────────────────────────
  await q(() => { fichaHoja = false; fichasFolder = null; fichasTab = 'platos'; navigate('fichas'); openFichaModal(1); });
  await esperar(600);
  await caso(`Ficha › el lápiz y el «⋯» de cada paso van en la fila del número, no en una fila propia (${ancho}px)`, async () => {
    const r = await q(() => [...document.querySelectorAll('.fi-paso')].map(p => {
      const n = p.querySelector('.fi-paso-n').getBoundingClientRect(), a = p.querySelector('.fi-paso-acc').getBoundingClientRect(), c = p.querySelector('.fi-paso-c').getBoundingClientRect();
      const lap = p.querySelector('.fi-lapiz').getBoundingClientRect();
      return {dy: Math.abs((a.top + a.height / 2) - (n.top + n.height / 2)), aBajoTexto: a.top >= c.bottom - 1, aDentro: a.right <= innerWidth + 0.5 && a.left >= 0, lapizW: lap.width, lapizH: lap.height};
    }));
    assert.equal(r.length, 3);
    r.forEach(x => {
      if(ancho > 760){ return; }
      assert.ok(x.dy < 6, 'mandos centrados con el número: ' + JSON.stringify(x));
      assert.ok(!x.aBajoTexto, 'no debajo del texto: ' + JSON.stringify(x));
      assert.ok(x.aDentro && x.lapizW >= 44 && x.lapizH >= 44, JSON.stringify(x));
    });
    await mostrar(page, 'ficha-pasos', ancho);
  });
  await caso(`Ficha › un paso largo en MAYÚSCULAS y sin espacios no desborda y la letra es legible (${ancho}px)`, async () => {
    const r = await q(() => { const p = document.querySelector('.fi-paso-leer'); const c = p.getBoundingClientRect(); const cs = getComputedStyle(p);
      return {fs: parseFloat(cs.fontSize), tt: cs.textTransform, sw: p.scrollWidth, cw: p.clientWidth, der: c.right, pagina: document.documentElement.scrollWidth, ancho: innerWidth, aDer: Math.max(...[...document.querySelectorAll('.fi-paso')].map(x => x.getBoundingClientRect().right))}; });
    assert.ok(r.fs >= 14 && r.fs <= 17, 'tamaño legible, no gigante: ' + r.fs);
    assert.equal(r.tt, 'none');
    assert.ok(r.sw <= r.cw + 1, 'el texto no desborda su caja: ' + JSON.stringify(r));
    assert.ok(r.der <= r.ancho && r.pagina <= r.ancho + 1, 'sin scroll horizontal: ' + JSON.stringify(r));
  });

  // ── 4) textarea: sin tirador y creciendo con lo escrito ─────────────────────────────────────────────────────────
  await caso(`Textarea de un paso en edición: sin tirador, crece al escribir y no se sale (${ancho}px)`, async () => {
    await q(() => document.querySelectorAll('.fi-paso')[1].querySelector('.fi-lapiz').click()); await esperar(300);
    const antes = await q(() => { const t = document.querySelector('.fi-paso textarea'); return {h: t.getBoundingClientRect().height, rz: getComputedStyle(t).resize}; });
    assert.equal(antes.rz, 'none');
    await page.focus('.fi-paso textarea');
    await page.keyboard.sendCharacter(' ' + 'una frase larga que obliga a varios renglones '.repeat(8)); await esperar(200);
    const des = await q(() => { const t = document.querySelector('.fi-paso textarea'); const r = t.getBoundingClientRect(); return {h: r.height, der: r.right, sh: t.scrollHeight, ch: t.clientHeight, ancho: innerWidth}; });
    assert.ok(des.h > antes.h + 30, `el alto crece: ${antes.h} → ${des.h}`);
    assert.ok(des.sh <= des.ch + 1, 'todo el texto a la vista, sin scroll interno: ' + JSON.stringify(des));
    assert.ok(des.der <= des.ancho, 'dentro de la pantalla: ' + JSON.stringify(des));
    await mostrar(page, 'ficha-edicion', ancho);
  });
  await caso(`Cualquier textarea que se pinte con texto previo se abre a su alto, sin tirador (${ancho}px)`, async () => {
    const r = await q(async () => {
      const cont = document.createElement('div'); cont.id = 'prueba-ta'; cont.style.cssText = 'position:relative;padding:8px;width:100%';
      cont.innerHTML = '<textarea id="ta-a" rows="2">' + ('línea de texto previo\n').repeat(9) + '</textarea><textarea id="ta-b" class="field-x" rows="2"></textarea>';
      document.getElementById('content').prepend(cont);
      await new Promise(r => setTimeout(r, 300));
      const a = document.getElementById('ta-a'), b = document.getElementById('ta-b');
      const res = {aH: a.getBoundingClientRect().height, aSh: a.scrollHeight, aCh: a.clientHeight, aRz: getComputedStyle(a).resize, bRz: getComputedStyle(b).resize, bH: b.getBoundingClientRect().height};
      cont.remove(); return res;
    });
    assert.equal(r.aRz, 'none'); assert.equal(r.bRz, 'none');
    assert.ok(r.aSh <= r.aCh + 1 && r.aH > 100, 'el texto previo cabe entero: ' + JSON.stringify(r));
    assert.ok(r.bH < 80, 'vacío se queda en sus renglones: ' + JSON.stringify(r));
  });
  await caso(`Mi Negocio, modales y notas: ningún textarea con tirador (${ancho}px)`, async () => {
    const malos = [];
    const barrer = async (nombre, fn) => { await q(fn); await esperar(500); const r = await q(() => [...document.querySelectorAll('textarea')].map(t => ({rz: getComputedStyle(t).resize, der: t.getBoundingClientRect().right, vis: !!t.offsetParent, w: innerWidth}))); r.forEach(x => { if(x.rz !== 'none') malos.push(nombre + ' resize=' + x.rz); if(x.vis && x.der > x.w + 1) malos.push(nombre + ' se sale por la derecha'); }); return r.length; };
    let total = 0;
    total += await barrer('minegocio', () => navigate('minegocio'));
    total += await barrer('limpieza', () => navigate('limpieza'));
    total += await barrer('distribucion', () => navigate('distribucion'));
    total += await barrer('ficha', () => { navigate('fichas'); openFichaModal(1); });
    total += await barrer('modal', () => { openModal('Prueba', '<div class="field"><label>Nota</label><textarea id="ta-modal" rows="3">' + 'texto largo '.repeat(80) + '</textarea></div>', '<button class="btn" onclick="closeModal()">Cerrar</button>'); });
    assert.ok(total >= 3, 'se vieron textareas: ' + total);
    assert.deepEqual(malos, []);
    const m = await q(() => { const t = document.getElementById('ta-modal'); return t && {sh: t.scrollHeight, ch: t.clientHeight}; });
    if(m) assert.ok(m.sh <= m.ch + 1, 'el textarea del modal muestra todo su texto: ' + JSON.stringify(m));
    await q(() => closeModal());
  });
  await caso(`Sin errores de JavaScript (${ancho}px)`, async () => { assert.deepEqual(page.erroresJs, []); });
  await page.close();
}

await browser.close();
console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo en orden');
process.exit(fallos ? 1 : 0);
