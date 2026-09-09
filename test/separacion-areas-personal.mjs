// Cocina y sala no se mezclan (9/09): el dueño encontró dos huecos donde
// sí se mezclaban.
//   1. El clima del equipo ("Clima del equipo esta semana") promediaba TODOS
//      los check-ins de la semana, de las dos áreas juntas.
//   2. Los desplegables de "Horario fijo" y "Asignar turnos por periodo"
//      listaban TODOS los empleados del negocio, cocina y sala mezclados.
// El propio dueño descartó un tercer cambio que se había hecho de más:
// impedir un PIN repetido entre empleados. Lo pidió sin más — "que puedan
// repetir PIN, es elección de cada uno" — así que aquí se comprueba
// justamente que SÍ se puede repetir, sin ningún aviso ni bloqueo.
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

await caso('Dos empleados de la MISMA área pueden poner el mismo PIN sin ningún aviso ni bloqueo', async () => {
  // Elena (sala) ya tiene un PIN propio; ahora Paco, un segundo cocinero,
  // pone ese MISMO PIN a propósito (por la UI real, no llamando funciones).
  await page.evaluate((id)=>{
    const e = DB.employees.find(x=>x.id===id);
    e.pin = hashPin('9999', 'SEPAREA1');
    e.pinChanged = true;
    saveDB();
  }, IDS.camareroId);
  const pacoId = await page.evaluate(()=>{
    const e = {id: genId(), name:'Paco', rol:'Cocinero', area:'cocina', active:true, pin: hashPin('1234', 'SEPAREA1'), pinChanged:false};
    DB.employees.push(e);
    saveDB();
    return e.id;
  });
  const r = await page.evaluate((id)=>{
    openNewPinModal(id, 'entrada');
    document.getElementById('new-pin-1').value = '9999';
    document.getElementById('new-pin-2').value = '9999';
    confirmNewPin(id, 'entrada');
    const e = DB.employees.find(x=>x.id===id);
    return {pinChanged: e.pinChanged, coincideConElena: e.pin === hashPin('9999', 'SEPAREA1')};
  }, pacoId);
  assert.ok(r.pinChanged && r.coincideConElena, 'debe guardar el PIN repetido sin problema: ' + JSON.stringify(r));
});

await caso('Desde la tarjeta de Personal, el icono de Distribución del Trabajo lleva directo a la página de ESE empleado', async () => {
  const r = await page.evaluate((id)=>{
    currentFolder = 'cocina';
    navigate('horarios');
    setHorariosTab('personal');
    const box = document.getElementById('horarios-tab-content');
    const btn = [...box.querySelectorAll('.actions-cell button')].find(b => b.title && b.title.includes('Distribución'));
    btn.click();
    return {
      vistaActiva: document.getElementById('view-distribucion').classList.contains('active'),
      empleadoAbierto: distCurrentEmployeeId === id,
    };
  }, IDS.cocineroId);
  assert.ok(r.vistaActiva, 'debe navegar a la vista de Distribución del Trabajo');
  assert.ok(r.empleadoAbierto, 'debe abrir directamente la página de ESE empleado, sin pasar por la lista');
});

await caso('La página del empleado en Distribución ya no tiene el botón "Equipo" (solo se llega a un empleado en concreto)', async () => {
  const tieneEquipo = await page.evaluate(()=> [...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Equipo'));
  assert.ok(!tieneEquipo, 'no debe quedar ningún botón "Equipo" en la página de detalle');
});

await caso('"Rango/platos a su cargo" y "Tareas de esta semana" quedan uno al lado del otro, no apilados', async () => {
  const r = await page.evaluate(()=>{
    const kpis = [...document.querySelectorAll('.kpi')];
    const tops = kpis.map(k => k.getBoundingClientRect().top);
    return {n: kpis.length, mismaFila: tops.length===2 && Math.abs(tops[0]-tops[1]) < 2};
  });
  assert.equal(r.n, 2, 'deben ser las 2 tarjetas KPI esperadas: ' + JSON.stringify(r));
  assert.ok(r.mismaFila, 'deben estar en la misma fila, no una debajo de la otra: ' + JSON.stringify(r));
});

await caso('Ningún error de JavaScript en todo el recorrido', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(68));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
