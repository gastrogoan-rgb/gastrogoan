// Editar un modificador/extra ya creado (9/09): antes solo se podía añadir
// o borrar, así que corregir un nombre mal escrito o un precio que cambió
// obligaba a borrarlo y crearlo de nuevo. Ahora tiene su propio botón de
// editar, tanto en los extras de un plato de Carta como en los de una
// opción de Menú.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
const erroresJs = [];
page.on('pageerror', e => erroresJs.push(e.message));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(code => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
}, 'EDITMODS1');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));
await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
});

let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}

await caso('Editar el extra de un plato de Carta cambia su nombre y precio de verdad (por la UI real)', async () => {
  const r = await page.evaluate(()=>{
    cartaEdit = {id: genId(), nombre:'Carta test', secciones:[
      {id: genId(), nombre:'Principales', platos:[
        {id: genId(), recipeId:null, nombre:'Pizza', precio:10, disponible:true, modificadores:[{id: genId(), nombre:'Extra queso', precio:1}]}
      ]}
    ]};
    const secId = cartaEdit.secciones[0].id;
    const platoId = cartaEdit.secciones[0].platos[0].id;
    const modId = cartaEdit.secciones[0].platos[0].modificadores[0].id;
    openPlatoModsModal(secId, platoId);
    startEditPlatoMod(secId, platoId, modId);
    document.getElementById('new-mod-nombre').value = 'Extra queso doble';
    document.getElementById('new-mod-precio').value = '2.5';
    saveEditPlatoMod(secId, platoId);
    const mod = cartaEdit.secciones[0].platos[0].modificadores[0];
    return {nombre: mod.nombre, precio: mod.precio, sameId: mod.id === modId};
  });
  assert.equal(r.nombre, 'Extra queso doble', 'debe cambiar el nombre: ' + JSON.stringify(r));
  assert.equal(r.precio, 2.5, 'debe cambiar el precio: ' + JSON.stringify(r));
  assert.ok(r.sameId, 'debe seguir siendo el MISMO modificador (mismo id), no uno nuevo: ' + JSON.stringify(r));
});

await caso('El botón de editar (lápiz) se ve junto a cada extra existente', async () => {
  const tieneLapiz = await page.evaluate(()=> !!document.querySelector('.modal-box, #modal-box')?.querySelector('.ti-pencil') || !!document.querySelector('#modal-overlay .ti-pencil'));
  assert.ok(tieneLapiz, 'debe verse el icono de editar en el modal de extras');
  await page.evaluate(()=> closeModal());
});

await caso('Editar el extra de una opción de Menú cambia su nombre y precio de verdad', async () => {
  const r = await page.evaluate(()=>{
    menuEdit = {id: genId(), nombre:'Menú test', precio:15, grupos:[
      {id: genId(), nombre:'Primeros', opciones:[
        {id: genId(), recipeId:null, nombre:'Sopa', suplemento:0, modificadores:[{id: genId(), nombre:'Sin sal', precio:0}]}
      ]}
    ]};
    const grupoId = menuEdit.grupos[0].id;
    const opcionId = menuEdit.grupos[0].opciones[0].id;
    const modId = menuEdit.grupos[0].opciones[0].modificadores[0].id;
    openMenuOpcionModsModal(grupoId, opcionId);
    startEditMenuOpcionMod(grupoId, opcionId, modId);
    document.getElementById('new-menu-mod-nombre').value = 'Extra picante';
    document.getElementById('new-menu-mod-precio').value = '0.8';
    saveEditMenuOpcionMod(grupoId, opcionId);
    const mod = menuEdit.grupos[0].opciones[0].modificadores[0];
    return {nombre: mod.nombre, precio: mod.precio, sameId: mod.id === modId};
  });
  assert.equal(r.nombre, 'Extra picante', 'debe cambiar el nombre: ' + JSON.stringify(r));
  assert.equal(r.precio, 0.8, 'debe cambiar el precio: ' + JSON.stringify(r));
  assert.ok(r.sameId, 'debe seguir siendo el MISMO modificador: ' + JSON.stringify(r));
});

await caso('Cancelar una edición no toca el modificador original', async () => {
  const r = await page.evaluate(()=>{
    cartaEdit = {id: genId(), nombre:'Carta test 2', secciones:[
      {id: genId(), nombre:'Principales', platos:[
        {id: genId(), recipeId:null, nombre:'Ensalada', precio:8, disponible:true, modificadores:[{id: genId(), nombre:'Sin cebolla', precio:0}]}
      ]}
    ]};
    const secId = cartaEdit.secciones[0].id;
    const platoId = cartaEdit.secciones[0].platos[0].id;
    const modId = cartaEdit.secciones[0].platos[0].modificadores[0].id;
    openPlatoModsModal(secId, platoId);
    startEditPlatoMod(secId, platoId, modId);
    document.getElementById('new-mod-nombre').value = 'Cambio que no debe guardarse';
    cancelEditPlatoMod(secId, platoId);
    const mod = cartaEdit.secciones[0].platos[0].modificadores[0];
    closeModal();
    return mod.nombre;
  });
  assert.equal(r, 'Sin cebolla', 'cancelar no debe modificar el nombre original: ' + r);
});

await caso('Ningún error de JavaScript en todo el recorrido', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(68));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
