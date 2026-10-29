// Norma (30/10): editar y borrar van dentro de un botón de tres puntos que despliega un menú. Comprueba el componente
// (abrir, cerrar, teclado, que no se salga de la pantalla, permisos) y que cada sitio donde se aplicó funciona.
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
  }, 'MENUAC001');
  await page.reload({waitUntil:'domcontentloaded'});
  await esperar(2200);
  await page.evaluate(()=>{
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, name:'Bar de Pruebas'});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    const pl = (id,n,pr,extra={}) => Object.assign({id,nombre:n,precio:pr,precioBase:pr/1.1,ivaPct:10,disponible:true,modificadores:[]}, extra);
    DB.providers = [{id:1, nombre:'Verduras Ca la Rosa', area:'cocina'}, {id:2, nombre:'Bebidas Pirineu', area:'cocina'}];
    DB.ingredients = [{id:101, name:'Ajo', category:'Verduras', unit:'g', supplier:'Verduras Ca la Rosa', price:0.0009, packQty:1000, packPrice:0.9, iva:4, allergens:[], area:'cocina'}];
    DB.cartas = [{id:1,nombre:'CARTA PRINCIPAL',area:'cocina',horario:defaultItemHorario(),secciones:[{id:11,nombre:'Entrantes',platos:[pl(111,'Ensaladilla',7.5,{modificadores:[{id:1,nombre:'Sin cebolla',precio:0}]})]}]}];
    DB.menus = [{id:5,nombre:'Menú del día',area:'cocina',precio:14.5,precioBase:13.18,ivaPct:10,horario:defaultItemHorario(),grupos:[{id:51,nombre:'Primeros',opciones:[pl(511,'Sopa',0)]}]}];
    DB.idr = DB.idr || {}; DB.idr.creaciones = []; DB.idr.carpetas = [];
    DB.stock = {}; DB.recipes = []; DB.purchaseOrders = [];
    saveDB(); currentFolder = 'cocina'; navigate('proveedores');
  });
  await esperar(500);
  return page;
}

const menuAbierto = page => page.evaluate(() => { const m = document.querySelector('.mn-menu'); return m ? [...m.querySelectorAll('.mn-item')].map(i => i.textContent.trim()) : null; });

for(const ancho of [1280, 360]){
  const page = await abrir(ancho);
  const q = (fn, ...a) => page.evaluate(fn, ...a);
  const kebab = sel => q(s => document.querySelector(s).click(), sel);

  await caso(`Proveedores: los tres puntos abren Editar y Eliminar; un toque fuera los cierra (${ancho}px)`, async () => {
    await kebab('.pv-card [data-acc]'); await esperar(150);
    assert.deepEqual(await menuAbierto(page), ['Editar Proveedor', 'Eliminar']);
    assert.equal(await q(() => document.querySelector('.pv-card [data-acc]').getAttribute('aria-expanded')), 'true');
    await q(() => document.querySelector('.view-title').click()); await esperar(150);
    assert.equal(await menuAbierto(page), null, 'cerrado al tocar fuera');
    assert.equal(await q(() => document.querySelector('.pv-card [data-acc]').getAttribute('aria-expanded')), 'false');
  });

  await caso(`El mismo botón abre y cierra; Escape cierra y devuelve el foco (${ancho}px)`, async () => {
    await kebab('.pv-card [data-acc]'); await esperar(100);
    await kebab('.pv-card [data-acc]'); await esperar(100);
    assert.equal(await menuAbierto(page), null, 'segundo toque en el botón: cierra');
    await kebab('.pv-card [data-acc]'); await esperar(100);
    await page.keyboard.press('Escape'); await esperar(100);
    assert.equal(await menuAbierto(page), null);
    assert.ok(await q(() => document.activeElement === document.querySelector('.pv-card [data-acc]')), 'el foco vuelve al botón');
  });

  await caso(`Teclado: se entra en el menú, las flechas se mueven y Enter ejecuta (${ancho}px)`, async () => {
    await kebab('.pv-card [data-acc]'); await esperar(100);
    assert.equal(await q(() => document.activeElement.textContent.trim()), 'Editar Proveedor', 'el foco entra en la primera acción');
    await page.keyboard.press('ArrowDown');
    assert.equal(await q(() => document.activeElement.textContent.trim()), 'Eliminar');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter'); await esperar(400);
    assert.equal(await menuAbierto(page), null, 'ejecutar la acción cierra el menú');
    assert.ok(await q(() => !!document.getElementById('prov-nombre')), 'Editar abre el formulario del proveedor');
    await q(() => closeModal());
  });

  await caso(`Eliminar desde el menú pasa por su confirmación de siempre (${ancho}px)`, async () => {
    await kebab('.pv-card:nth-child(2) [data-acc]'); await esperar(100);
    await q(() => [...document.querySelectorAll('.mn-item')].find(i => /Eliminar/.test(i.textContent)).click()); await esperar(400);
    assert.ok(await q(() => document.getElementById('modal-overlay').classList.contains('active')), 'pide confirmación');
    assert.equal(await q(() => DB.providers.length), 2, 'todavía no se ha borrado');
    await q(() => [...document.querySelectorAll('#modal-box button')].find(b => /Confirmar|Aceptar|Sí/i.test(b.textContent)).click()); await esperar(400);
    assert.equal(await q(() => DB.providers.length), 1);
  });

  await caso(`El menú no se sale de la pantalla, ni en el último de la lista (${ancho}px)`, async () => {
    await q(() => { for(let i = 0; i < 12; i++) DB.providers.push({id:900 + i, nombre:'Proveedor ' + i, area:'cocina'}); renderProveedores(); });
    await esperar(200);
    const n = await q(() => document.querySelectorAll('.pv-card [data-acc]').length);
    for(const idx of [1, n]){
      await q(i => document.querySelector(`.pv-card:nth-child(${i}) [data-acc]`).scrollIntoView({block:'end'}), idx);
      await esperar(100);
      await q(i => document.querySelector(`.pv-card:nth-child(${i}) [data-acc]`).click(), idx); await esperar(150);
      const r = await q(() => { const m = document.querySelector('.mn-menu').getBoundingClientRect(); return {l: m.left, t: m.top, r: m.right, b: m.bottom, w: innerWidth, h: innerHeight}; });
      assert.ok(r.l >= 0 && r.t >= 0 && r.r <= r.w && r.b <= r.h, 'dentro de la pantalla: ' + JSON.stringify(r));
      await page.keyboard.press('Escape'); await esperar(100);
    }
    await q(() => { DB.providers = DB.providers.filter(p => p.id < 900); renderProveedores(); });
  });

  await caso(`Cada acción del menú es táctil: 44 px de alto (${ancho}px)`, async () => {
    await kebab('.pv-card [data-acc]'); await esperar(100);
    const h = await q(() => [...document.querySelectorAll('.mn-item')].map(i => Math.round(i.getBoundingClientRect().height)));
    assert.ok(h.every(x => x >= 44), 'alturas: ' + h);
    await page.keyboard.press('Escape');
  });

  await caso(`Sin permiso de editar, el botón de tres puntos desaparece (${ancho}px)`, async () => {
    await q(() => { document.body.classList.remove('edit-unlocked'); }); await esperar(100);
    const visible = await q(() => [...document.querySelectorAll('.pv-card [data-acc]')].some(b => getComputedStyle(b).display !== 'none'));
    await q(() => { document.body.classList.add('edit-unlocked'); });
    // «edit-unlocked» es lo que decide qué es owner-only: lo quita cualquier sesión sin permiso.
    assert.equal(visible, false, 'un empleado sin permiso no ve ni el botón');
  });

  await caso(`Mega Lista: los tres puntos de un ingrediente editan y eliminan (${ancho}px)`, async () => {
    await q(() => { navigate('megalista'); openMegalistaFolder('Verduras'); }); await esperar(400);
    if(ancho < 600) await q(() => document.querySelector('.ml-fila .ml-nom').click());
    await esperar(150);
    await kebab('.ml-fila [data-acc]'); await esperar(150);
    assert.deepEqual(await menuAbierto(page), ['Editar', 'Eliminar']);
    await q(() => [...document.querySelectorAll('.mn-item')].find(i => /Editar/.test(i.textContent)).click()); await esperar(400);
    assert.ok(await q(() => !!document.getElementById('ing-name')), 'Editar abre la ficha del ingrediente');
    await q(() => closeModal());
  });

  await caso(`Carpetas (Mega Lista y demás): sus tres puntos verticales renombran y borran (${ancho}px)`, async () => {
    await q(() => { backToMegalistaFolders(); }); await esperar(300);
    await kebab('.ml-carpeta [data-acc]'); await esperar(150);
    assert.deepEqual(await menuAbierto(page), ['Renombrar categoría', 'Eliminar categoría']);
    await page.keyboard.press('Escape');
  });

  await caso(`Oferta: cartas, menús, secciones, grupos, platos y opciones usan el menú (${ancho}px)`, async () => {
    await q(() => { navigate('carta'); setOfertaTab('carta'); renderCarta(); }); await esperar(400);
    await kebab('#view-carta .oc-item [data-acc]'); await esperar(150);
    assert.deepEqual(await menuAbierto(page), ['Editar', 'Eliminar'], 'tarjeta de carta');
    await q(() => [...document.querySelectorAll('.mn-item')].find(i => /Editar/.test(i.textContent)).click()); await esperar(500);
    assert.ok(await q(() => !!cartaEdit), 'Editar abre la carta');
    await kebab('.oc-sec [data-acc]'); await esperar(150);
    assert.deepEqual(await menuAbierto(page), ['Renombrar sección', 'Eliminar'], 'sección');
    await page.keyboard.press('Escape');
    if(ancho < 600) await q(() => document.querySelector('.oc-plato .pl-chev').click());
    await esperar(150);
    await kebab('.oc-plato [data-acc]'); await esperar(150);
    assert.deepEqual(await menuAbierto(page), ['Editar', 'Eliminar'], 'plato');
    await page.keyboard.press('Escape');
    // Las filas de extras dentro del modal
    await q(() => openPlatoModsModal(11, 111)); await esperar(400);
    await kebab('#modal-box [data-acc]'); await esperar(150);
    assert.deepEqual(await menuAbierto(page), ['Editar', 'Eliminar'], 'extra del plato, dentro de un modal');
    const encima = await q(() => { const m = document.querySelector('.mn-menu'); return parseInt(getComputedStyle(m).zIndex) > parseInt(getComputedStyle(document.getElementById('modal-overlay')).zIndex); });
    assert.ok(encima, 'el menú queda por encima del modal');
    await q(() => [...document.querySelectorAll('.mn-item')].find(i => /Editar/.test(i.textContent)).click()); await esperar(400);
    assert.ok(await q(() => !!document.querySelector('#modal-box input')), 'Editar ofrece el campo del extra');
    await q(() => closeModal());
    await q(() => { cartaEdit = null; cartaBase = ''; renderCarta(); setOfertaTab('menus'); renderMenu && 0; }); await esperar(300);
    await kebab('#view-carta .oc-item [data-acc]'); await esperar(150);
    assert.deepEqual(await menuAbierto(page), ['Editar', 'Eliminar'], 'tarjeta de menú');
    await page.keyboard.press('Escape');
  });

  await caso(`I+D: carpetas y trabajos tienen su menú (${ancho}px)`, async () => {
    await q(() => { navigate('idr'); const a = idrNuevaCreacion('plato'); a.titulo = 'Bacalao'; const f = {id: 77, nombre: 'Otoño'}; DB.idr.carpetas.push(f); idrCarpetaActiva = 77; saveDB(); navIdr('inicio'); }); await esperar(500);
    const menus = await q(() => [...document.querySelectorAll('#view-idr [data-acc]')].map(b => JSON.parse(b.dataset.acc).map(a => a.fn.split('(')[0]).join('+')));
    assert.ok(menus.includes('idrRenombrarCarpeta+idrBorrarCarpeta'), 'carpeta: ' + menus);
    await q(() => { idrCarpetaActiva = null; renderIdr(); }); await esperar(300);
    const t = await q(() => [...document.querySelectorAll('.idr-trabajo [data-acc]')].map(b => JSON.parse(b.dataset.acc).map(a => a.fn.split('(')[0]).join('+')));
    assert.deepEqual(t, ['idrBorrarCreacion']);
  });

  await caso(`Ningún error de JavaScript (${ancho}px)`, async () => { assert.deepEqual(page.erroresJs, [], page.erroresJs.join(' | ')); });
  await page.close();
}

console.log('\n' + '═'.repeat(70));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
