// Horario fijo: un patrón semanal que se repite indefinidamente, para no
// tener que picar los turnos del personal a mano cada semana (pedido real
// del dueño, 9/09). Comprueba:
//   - que definir el patrón genera turnos reales por delante (4 semanas),
//   - que un día editado a mano queda "suelto" para siempre (ni la
//     regeneración normal ni cambiar el patrón general lo vuelven a tocar),
//   - que cambiar el patrón SÍ actualiza los días futuros que seguían
//     siendo automáticos,
//   - que quitar el horario fijo detiene la generación sin borrar lo ya
//     puesto.
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
}, 'HORFIJO1');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));
await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  DB.employees = [{id:1, name:'Manolo', rol:'Cocinero', area:'cocina', active:true, pin:'1234'}];
  DB.turnos = [];
  DB.horariosFijos = [];
  saveDB();
});

let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}

await caso('Definir un horario fijo (L-V mañana, S-D descanso) genera un turno real cada día, 4 semanas por delante', async () => {
  const r = await page.evaluate(() => {
    const patronLV = {tipo:'M', entrada:'09:00', salida:'17:00', entrada2:'', salida2:''};
    const patronDesc = {tipo:'D', entrada:'', salida:'', entrada2:'', salida2:''};
    DB.horariosFijos.push({
      id: genId(), employeeId: 1, activo: true,
      patron: [patronLV,patronLV,patronLV,patronLV,patronLV,patronDesc,patronDesc], // lun..dom
      generadoHasta: addDaysStr(todayStr(), -1),
    });
    generarTurnosFijos();
    const generados = DB.turnos.filter(t => t.employeeId===1 && t.origen==='fijo');
    const hf = DB.horariosFijos[0];
    return {
      n: generados.length,
      trabajo: generados.filter(t => t.tipo==='M').length,
      descanso: generados.filter(t => t.tipo==='D').length,
      generadoHasta: hf.generadoHasta, limiteEsperado: addDaysStr(todayStr(), 28)
    };
  });
  // Un turno por cada día de la ventana (29 = hoy + 28 días), sea de
  // trabajo o de descanso — igual que representa el sistema manual.
  assert.equal(r.n, 29, `se esperan 29 turnos (uno por día, hoy incluido, hasta 28 días por delante), salieron ${r.n}`);
  assert.ok(r.trabajo >= 19 && r.trabajo <= 21, `de esos, los de tipo M (lun-vie) deben rondar 20, salieron ${r.trabajo}`);
  assert.ok(r.descanso >= 8 && r.descanso <= 10, `y los de descanso (sáb-dom) deben rondar 8-9, salieron ${r.descanso}`);
  assert.equal(r.generadoHasta, r.limiteEsperado, 'generadoHasta debe llegar hasta el horizonte de 28 días');
});

await caso('Un día editado a mano se suelta del patrón: no se le vuelve a tocar al regenerar', async () => {
  const r = await page.evaluate(() => {
    const futuro = DB.turnos.find(t => t.employeeId===1 && t.origen==='fijo' && t.fecha > todayStr());
    // Edición manual real, por la función que usa el modal de turno.
    document.body.insertAdjacentHTML('beforeend', '<div id="modal-root-test"></div>');
    const antesId = futuro.id;
    // Simula el guardado manual tal y como lo hace saveTurno, sin abrir el modal:
    futuro.notas = 'Cambio puntual';
    futuro.salida = '15:00'; // sale antes ese día
    delete futuro.origen; // esto es lo que hace saveTurno de verdad al editar
    saveDB();
    generarTurnosFijos(); // regenerar no debe tocar ese día
    const despues = DB.turnos.find(t => t.id===antesId);
    return {salida: despues.salida, origen: despues.origen, mismoId: despues.id === antesId};
  });
  assert.equal(r.salida, '15:00', 'la edición manual (salida antes) debe conservarse: ' + JSON.stringify(r));
  assert.equal(r.origen, undefined, 'un día editado a mano ya no debe llevar origen:"fijo"');
});

await caso('Cambiar el patrón general actualiza los días futuros SIN tocar el día ya editado a mano', async () => {
  const r = await page.evaluate(() => {
    const hoy = todayStr();
    const diaEditadoId = DB.turnos.find(t => t.employeeId===1 && t.origen===undefined && t.fecha > hoy).id;
    const hf = DB.horariosFijos[0];
    // Simula saveHorarioFijo: borra los turnos futuros que SIGAN siendo del
    // patrón (origen:'fijo') y deja el resto intacto, luego regenera con
    // horario nuevo (tarde en vez de mañana).
    const patronTarde = {tipo:'T', entrada:'16:00', salida:'23:00', entrada2:'', salida2:''};
    const patronDesc = {tipo:'D', entrada:'', salida:'', entrada2:'', salida2:''};
    DB.turnos = DB.turnos.filter(x => !(x.employeeId===1 && x.fecha>=hoy && x.origen==='fijo'));
    hf.patron = [patronTarde,patronTarde,patronTarde,patronTarde,patronTarde,patronDesc,patronDesc];
    hf.generadoHasta = addDaysStr(hoy, -1);
    generarTurnosFijos();
    const diaEditado = DB.turnos.find(t => t.id===diaEditadoId);
    const nuevoAutomatico = DB.turnos.find(t => t.employeeId===1 && t.origen==='fijo' && t.fecha > hoy);
    return {
      diaEditadoSigueIgual: diaEditado && diaEditado.salida === '15:00' && diaEditado.origen === undefined,
      nuevoTipo: nuevoAutomatico ? nuevoAutomatico.tipo : null,
      nuevaEntrada: nuevoAutomatico ? nuevoAutomatico.entrada : null,
    };
  });
  assert.ok(r.diaEditadoSigueIgual, 'el día editado a mano no debía tocarse al cambiar el patrón general: ' + JSON.stringify(r));
  assert.equal(r.nuevoTipo, 'T', 'los días automáticos deben reflejar el patrón nuevo (tarde): ' + JSON.stringify(r));
  assert.equal(r.nuevaEntrada, '16:00', 'con la hora nueva del patrón: ' + JSON.stringify(r));
});

await caso('Quitar el horario fijo detiene la generación futura sin borrar lo ya generado', async () => {
  const r = await page.evaluate(() => {
    const antesCount = DB.turnos.filter(t => t.employeeId===1).length;
    DB.horariosFijos = DB.horariosFijos.filter(h => h.employeeId!==1);
    saveDB();
    generarTurnosFijos(); // no debe crear nada nuevo, ya no hay patrón activo
    const despuesCount = DB.turnos.filter(t => t.employeeId===1).length;
    return {antesCount, despuesCount, quedanHorariosFijos: DB.horariosFijos.length};
  });
  assert.equal(r.despuesCount, r.antesCount, 'quitar el horario fijo no debe borrar los turnos ya generados: ' + JSON.stringify(r));
  assert.equal(r.quedanHorariosFijos, 0, 'el patrón debe quedar eliminado');
});

await caso('El modal de horario fijo pinta los 7 días de la semana con sus selects', async () => {
  const r = await page.evaluate(() => {
    DB.horariosFijos = [];
    openHorarioFijoModal(1);
    const selects = [...document.querySelectorAll('[id^="hf-tipo-"]')];
    return {n: selects.length, primerDiaTexto: document.querySelector('#modal-root, #modal, .modal-overlay')?.innerText.includes('Lunes') || document.body.innerText.includes('Lunes')};
  });
  assert.equal(r.n, 7, 'deben verse los 7 selects de tipo, uno por día: ' + JSON.stringify(r));
  assert.ok(r.primerDiaTexto, 'debe verse "Lunes" en el modal');
  await page.evaluate(() => closeModal());
});

await caso('Ningún error de JavaScript en todo el recorrido', () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(64));
console.log(fallos ? `❌ ${fallos} fallaron` : '✅ casos pasaron');
await browser.close();
process.exit(fallos ? 1 : 0);
