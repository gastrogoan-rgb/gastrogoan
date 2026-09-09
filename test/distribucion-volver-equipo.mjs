// Distribución del Trabajo (9/09): en sesión de EMPLEADO se entra directo a
// SU ficha (no tiene equipo que mirar, y antes había que pasar por una lista
// de una sola tarjeta). En sesión de PROPIETARIO se sigue viendo primero el
// equipo entero, y desde la ficha de un compañero ahora hay un botón para
// volver a esa lista y mirar la de otro (antes no existía ninguno).
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
}, 'DISTVOLVER1');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));
await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  DB.employees.push({id:1, name:'Ana', rol:'Cocinera', area:'cocina', active:true, pin:'1234'});
  DB.employees.push({id:2, name:'Luis', rol:'Cocinero', area:'cocina', active:true, pin:'1234'});
  saveDB();
});

let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}

await caso('Propietario: al entrar ve la lista del equipo (dos tarjetas), no una ficha directa', async () => {
  const r = await page.evaluate(()=>{
    distCurrentEmployeeId = null;
    setAccessSession({type:'owner', ts:Date.now()});
    navigate('distribucion');
    const box = document.getElementById('distribucion-content');
    return {tarjetas: box.querySelectorAll('.grid .card').length, tieneAna: box.textContent.includes('Ana'), tieneLuis: box.textContent.includes('Luis')};
  });
  assert.equal(r.tarjetas, 2, 'debe ver las tarjetas de los dos empleados: ' + JSON.stringify(r));
  assert.ok(r.tieneAna && r.tieneLuis, 'ambos nombres deben verse en la lista: ' + JSON.stringify(r));
});

await caso('Propietario: al abrir la ficha de Ana, puede volver a la lista del equipo y abrir la de Luis', async () => {
  const r = await page.evaluate(()=>{
    openDistEmployeeAuthed(1);
    const box = document.getElementById('distribucion-content');
    const tieneBoton = !!box.querySelector('[onclick="backToDistList()"]');
    const veAna = box.textContent.includes('Ana');
    backToDistList();
    const box2 = document.getElementById('distribucion-content');
    const vuelveALista = box2.querySelectorAll('.grid .card').length === 2;
    openDistEmployeeAuthed(2);
    const box3 = document.getElementById('distribucion-content');
    const veLuis = box3.textContent.includes('Luis');
    return {tieneBoton, veAna, vuelveALista, veLuis};
  });
  assert.ok(r.tieneBoton, 'la ficha de un compañero debe llevar botón para volver al equipo: ' + JSON.stringify(r));
  assert.ok(r.veAna, 'debe abrir la ficha de Ana: ' + JSON.stringify(r));
  assert.ok(r.vuelveALista, 'volver debe llevar de nuevo a la lista del equipo: ' + JSON.stringify(r));
  assert.ok(r.veLuis, 'debe poder abrir después la ficha de Luis: ' + JSON.stringify(r));
});

await caso('Empleado: entra directo a SU PROPIA ficha, sin lista ni botón de volver', async () => {
  const r = await page.evaluate(()=>{
    distCurrentEmployeeId = null;
    setAccessSession({type:'employee', employeeId:1, area:'cocina'});
    navigate('distribucion');
    const box = document.getElementById('distribucion-content');
    const tarjetasLista = box.querySelectorAll('.grid.grid-3 .card').length;
    const veSuNombre = box.textContent.includes('Ana');
    const tieneBoton = !!box.querySelector('[onclick="backToDistList()"]');
    return {tarjetasLista, veSuNombre, tieneBoton};
  });
  assert.equal(r.tarjetasLista, 0, 'no debe pasar por ninguna lista, entra directo a la ficha: ' + JSON.stringify(r));
  assert.ok(r.veSuNombre, 'debe ver su propia ficha (Ana) directamente: ' + JSON.stringify(r));
  assert.ok(!r.tieneBoton, 'un empleado no tiene equipo al que volver, no debe llevar ese botón: ' + JSON.stringify(r));
});

await caso('Ningún error de JavaScript en todo el recorrido', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(68));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
