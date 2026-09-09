// Stock en modo empleado (9/09): un empleado sin permiso de editar se
// había quedado sin poder tocar NADA en Stock (ni siquiera contar lo que
// hay de verdad), y además veía el "Valor del stock" — dato económico que
// no le corresponde.
//   - La cantidad ACTUAL es tarea del día a día de cualquiera: ahora se
//     puede editar sin permiso de edición.
//   - El MÍNIMO sigue siendo decisión de gestión: sigue bloqueado.
//   - "Valor del stock" desaparece de la vista de un empleado sin edición.
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
}, 'STOCKEMP1');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));
const IDS = await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  const raso = {id: genId(), name:'Cocinero Raso', rol:'Cocinero', area:'cocina', active:true, color:'#DF7039', pin:'H2:x', pinChanged:true};
  DB.employees = [raso];
  const ingId = genId();
  DB.ingredients.push({id: ingId, name:'ZzTestIngrediente99', category:'Verduras', area:'cocina', unit:'kg', price:1, packQty:1, packPrice:1, supplier:'P', activo:true});
  DB.stock[ingId] = {qty:5, min:2};
  saveDB();
  return {rasoId: raso.id, ingId};
});

let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}
async function entrarComoEmpleadoRaso(){
  await page.evaluate((id)=>{
    localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'employee', employeeId:id, area:'cocina', ts:Date.now()}));
    lockEditMode();
    document.body.classList.remove('owner-session');
    areaUnlocked.cocina = true;
    resumeEmployeeSession();
    currentFolder = 'cocina';
    navigate('stock');
    document.getElementById('stock-search').value = 'ZzTestIngrediente99';
    renderStock();
  }, IDS.rasoId);
  await new Promise(r=>setTimeout(r,300));
}

await caso('Un empleado sin permiso de editar SÍ puede modificar la cantidad actual del stock', async () => {
  await entrarComoEmpleadoRaso();
  const r = await page.evaluate((ingId)=>{
    const inputs = [...document.querySelectorAll('.stock-row input[type=number]')];
    // El segundo input de cada fila es "Actual" (el primero es "Mín").
    const actualInput = inputs[1];
    const disabled = actualInput.disabled;
    actualInput.value = '9';
    actualInput.dispatchEvent(new Event('change'));
    const s = getStockEntry(ingId);
    return {disabled, qtyGuardada: s.qty};
  }, IDS.ingId);
  assert.ok(!r.disabled, 'el campo de cantidad actual no debe estar deshabilitado: ' + JSON.stringify(r));
  assert.equal(r.qtyGuardada, 9, 'debe guardar el cambio de verdad: ' + JSON.stringify(r));
});

await caso('Pero el MÍNIMO sigue bloqueado para un empleado sin permiso de editar', async () => {
  const r = await page.evaluate((ingId)=>{
    const inputs = [...document.querySelectorAll('.stock-row input[type=number]')];
    const minInput = inputs[0];
    const disabled = minInput.disabled;
    minInput.value = '50';
    minInput.dispatchEvent(new Event('change'));
    const s = getStockEntry(ingId);
    return {disabled, minGuardado: s.min};
  }, IDS.ingId);
  assert.ok(r.disabled, 'el campo de mínimo debe seguir deshabilitado: ' + JSON.stringify(r));
  assert.equal(r.minGuardado, 2, 'el mínimo no debe cambiar sin permiso de editar: ' + JSON.stringify(r));
});

await caso('"Valor del stock" no se ve en la vista de un empleado sin permiso de editar', async () => {
  const visible = await page.evaluate(()=>{
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Valor del stock'));
    return btn && btn.getBoundingClientRect().width > 0;
  });
  assert.ok(!visible, '"Valor del stock" no debe verse sin permiso de editar');
});

await caso('El dueño sigue viendo y pudiendo tocar todo, incluido "Valor del stock"', async () => {
  const r = await page.evaluate(()=>{
    localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
    applyOwnerSessionEditRights();
    document.body.classList.add('owner-session');
    areaUnlocked.cocina = areaUnlocked.sala = areaUnlocked.gestion = true;
    currentFolder = 'cocina';
    navigate('stock');
    document.getElementById('stock-search').value = 'ZzTestIngrediente99';
    renderStock();
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Valor del stock'));
    const inputs = [...document.querySelectorAll('.stock-row input[type=number]')];
    return {btnVisible: btn && btn.getBoundingClientRect().width > 0, minDisabled: inputs[0].disabled, qtyDisabled: inputs[1].disabled};
  });
  assert.ok(r.btnVisible, 'el dueño debe seguir viendo "Valor del stock"');
  assert.ok(!r.minDisabled && !r.qtyDisabled, 'el dueño debe poder tocar mínimo y actual: ' + JSON.stringify(r));
});

await caso('Ningún error de JavaScript en todo el recorrido', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(68));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
