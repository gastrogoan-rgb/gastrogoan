// Cocina y sala no se mezclan (9/09): el dueño encontró tres huecos donde
// sí se mezclaban.
//   1. El clima del equipo ("Clima del equipo esta semana") promediaba TODOS
//      los check-ins de la semana, de las dos áreas juntas.
//   2. Los desplegables de "Horario fijo" y "Asignar turnos por periodo"
//      listaban TODOS los empleados del negocio, cocina y sala mezclados.
//   3. Cambiar el PIN de un empleado lo rechazaba si chocaba con el PIN de
//      OTRO empleado aunque fuera de la otra área — sin sentido, porque el
//      acceso siempre se identifica por nombre+PIN, nunca solo por PIN.
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
}, 'SEPAREA1');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));
const IDS = await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  // hashPin/pinMatchesHash sin sal explícita caen a DB.license.code (no a
  // getLicense(), que lee localStorage) — hace falta rellenarlo a mano
  // aquí, la app real lo hace sola al entrar por el camino largo.
  DB.license = {code: 'SEPAREA1', tenantId: ggBizTenantId('SEPAREA1')};
  const cocinero = {id: genId(), name:'Manolo', rol:'Cocinero', area:'cocina', active:true, pin:hashPin('1234', 'SEPAREA1'), pinChanged:false};
  const camarero = {id: genId(), name:'Elena', rol:'Camarera', area:'sala', active:true, pin:hashPin('1234', 'SEPAREA1'), pinChanged:false};
  DB.employees = [cocinero, camarero];
  const wk = currentWeekKey();
  DB.moodCheckins = [
    {id: genId(), employeeId: cocinero.id, weekKey: wk, value: 5, ts: new Date().toISOString()},
    {id: genId(), employeeId: camarero.id, weekKey: wk, value: 1, ts: new Date().toISOString()},
  ];
  saveDB();
  return {cocineroId: cocinero.id, camareroId: camarero.id};
});

let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}

await caso('El clima de cocina solo cuenta el check-in de cocina (5), no la media con sala', async () => {
  const texto = await page.evaluate(()=>{
    currentFolder = 'cocina';
    navigate('horarios');
    setHorariosTab('personal');
    return document.getElementById('horarios-tab-content').innerText;
  });
  assert.ok(texto.includes('Media de 1 respuesta(s): 5.0/5'), 'debe ser la media de cocina sola (1 respuesta, 5.0/5), no mezclada con sala: ' + texto.slice(0,300));
});

await caso('El clima de sala solo cuenta el check-in de sala (1), no el de cocina', async () => {
  const texto = await page.evaluate(()=>{
    currentFolder = 'sala';
    navigate('horarios');
    setHorariosTab('personal');
    return document.getElementById('horarios-tab-content').innerText;
  });
  assert.ok(texto.includes('Media de 1 respuesta(s): 1.0/5'), 'debe ser la media de sala sola (1 respuesta, 1.0/5), no mezclada con cocina: ' + texto.slice(0,300));
});

await caso('El desplegable de "Horario fijo" en Cocina solo lista empleados de cocina', async () => {
  const nombres = await page.evaluate((id)=>{
    currentFolder = 'cocina';
    openHorarioFijoModal(id);
    return [...document.querySelectorAll('#hf-employee option')].map(o=>o.textContent);
  }, IDS.cocineroId);
  assert.deepEqual(nombres, ['Manolo'], 'no debe aparecer Elena (sala) en el horario fijo de cocina: ' + JSON.stringify(nombres));
  await page.evaluate(()=> closeModal());
});

await caso('El desplegable de "Asignar turnos por periodo" en Sala solo lista empleados de sala', async () => {
  const nombres = await page.evaluate((id)=>{
    currentFolder = 'sala';
    openBulkTurnoModal(id);
    return [...document.querySelectorAll('#bulk-employee option')].map(o=>o.textContent);
  }, IDS.camareroId);
  assert.deepEqual(nombres, ['Elena'], 'no debe aparecer Manolo (cocina) en la asignación por periodo de sala: ' + JSON.stringify(nombres));
  await page.evaluate(()=> closeModal());
});

await caso('Cambiar el PIN de un empleado de cocina al mismo PIN que uno de sala YA NO lo bloquea', async () => {
  // Elena (sala) ya tiene un PIN propio puesto; Manolo (cocina) intenta el mismo.
  await page.evaluate((id)=>{
    const e = DB.employees.find(x=>x.id===id);
    e.pin = hashPin('9999', 'SEPAREA1');
    e.pinChanged = true;
    saveDB();
  }, IDS.camareroId);
  const colisiona = await page.evaluate((id)=> employeePinCollides('9999', id), IDS.cocineroId);
  assert.ok(!colisiona, 'un PIN usado en sala no debe bloquear a alguien de cocina, son áreas separadas');
});

await caso('Pero SÍ sigue bloqueado si el choque es dentro de la MISMA área', async () => {
  const otroCocinero = await page.evaluate(()=>{
    const e = {id: genId(), name:'Paco', rol:'Cocinero', area:'cocina', active:true, pin: hashPin('7777', 'SEPAREA1'), pinChanged:true};
    DB.employees.push(e);
    saveDB();
    return e.id;
  });
  const colisiona = await page.evaluate((id)=> employeePinCollides('7777', id), IDS.cocineroId);
  assert.ok(colisiona, 'entre dos de la MISMA área el choque de PIN sigue bloqueado');
});

await caso('Ningún error de JavaScript en todo el recorrido', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(68));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
