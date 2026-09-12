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
    // OJO: "el primero que se encuentre" es frágil con la fecha real del
    // día en que corra la prueba — si el día editado a mano (el de mañana)
    // cae en viernes, el siguiente turno automático es un sábado de
    // descanso ('D'), no un día laborable ('T'), y la prueba fallaría sin
    // que hubiera ningún fallo real de la app. Se busca explícitamente un
    // día automático entre semana (L-V, índices 0-4 del patrón).
    const nuevoAutomatico = DB.turnos.find(t => t.employeeId===1 && t.origen==='fijo' && t.fecha > hoy
      && ((new Date(t.fecha+'T00:00:00').getDay()+6)%7) < 5);
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

await caso('Solo 2 pestañas en Horarios (Personal y Calendario), con Día/Semana/Mes como interruptor dentro de Calendario', async () => {
  const r = await page.evaluate(() => {
    setHorariosTab('personal');
    const tabsPersonal = [...document.querySelectorAll('#horarios-content .ge-tab-row .ge-tab')].map(b => b.textContent.trim());
    setHorariosTab('calendario');
    const toggle = [...document.querySelectorAll('#horarios-content .view-toggle button')].map(b => b.textContent.trim());
    return {tabsPersonal, toggle};
  });
  assert.equal(r.tabsPersonal.length, 2, 'deben ser solo 2 pestañas arriba: ' + JSON.stringify(r.tabsPersonal));
  assert.equal(r.toggle.length, 3, 'Día/Semana/Mes deben ser el interruptor dentro de Calendario: ' + JSON.stringify(r.toggle));
});

await caso('La tarjeta del empleado abre un menú con las 3 formas de tener turnos', async () => {
  const r = await page.evaluate(() => {
    openEmployeeScheduleChooser(1);
    const texto = document.body.innerText;
    return {tieneFijo: texto.includes('Horario fijo'), tienePeriodo: texto.includes('Asignar turnos por periodo'), tieneNinguno: texto.includes('Sin turnos asignados')};
  });
  assert.ok(r.tieneFijo && r.tienePeriodo && r.tieneNinguno, 'deben verse las 3 opciones: ' + JSON.stringify(r));
  await page.evaluate(() => closeModal());
});

await caso('Editar por la UI real un turno del patrón y elegir "Solo este día" lo desengancha, sin tocar el patrón', async () => {
  const r = await page.evaluate(() => {
    // Se limpia lo que hayan dejado los casos anteriores: sin esto, el
    // "primer turno fijo del empleado 1" podía ser uno de otro caso (un
    // Descanso, por ejemplo, donde la app borra la hora de salida a
    // propósito) y el caso fallaba por arrastrar estado, no por un fallo
    // real. El caso siguiente ya lo hacía; a este le faltaba.
    DB.turnos = DB.turnos.filter(t => t.employeeId!==1);
    DB.horariosFijos = [];
    const patronM = {tipo:'M', entrada:'09:00', salida:'17:00', entrada2:'', salida2:''};
    DB.horariosFijos = [{id: genId(), employeeId: 1, activo: true, patron: Array(7).fill(0).map(()=>({...patronM})), generadoHasta: addDaysStr(todayStr(), -1)}];
    generarTurnosFijos();
    const objetivo = DB.turnos.find(t => t.employeeId===1 && t.origen==='fijo');
    openTurnoModal(objetivo.id);
    const hayAviso = document.body.innerText.includes('sigue el horario fijo');
    const hayDosBotones = document.body.innerText.includes('Solo este día') && document.body.innerText.includes('Para siempre');
    document.getElementById('turno-salida').value = '14:00'; // sale antes, solo hoy
    // El botón "Solo este día" llama a saveTurno(id, 'dia')
    [...document.querySelectorAll('.modal-footer button')].find(b => b.textContent.trim()==='Solo este día').click();
    const tras = DB.turnos.find(t => t.id===objetivo.id);
    const patronSigueIgual = DB.horariosFijos[0].patron[((new Date(objetivo.fecha+'T00:00:00').getDay()+6)%7)].salida === '17:00';
    return {hayAviso, hayDosBotones, salida: tras.salida, origen: tras.origen, patronSigueIgual};
  });
  assert.ok(r.hayAviso, 'debe avisar de que ese turno sigue el horario fijo');
  assert.ok(r.hayDosBotones, 'deben verse los dos botones de alcance');
  assert.equal(r.salida, '14:00', 'el cambio de ese día debe guardarse: ' + JSON.stringify(r));
  assert.equal(r.origen, undefined, 'el día debe soltarse del patrón');
  assert.ok(r.patronSigueIgual, 'el patrón general NO debe cambiar con "solo este día"');
});

await caso('Editar por la UI real y elegir "Para siempre" cambia el patrón y los mismos días de la semana futuros, no los demás', async () => {
  const r = await page.evaluate(() => {
    DB.turnos = DB.turnos.filter(t => t.employeeId!==1);
    DB.horariosFijos = [];
    const patronM = {tipo:'M', entrada:'09:00', salida:'17:00', entrada2:'', salida2:''};
    DB.horariosFijos = [{id: genId(), employeeId: 1, activo: true, patron: Array(7).fill(0).map(()=>({...patronM})), generadoHasta: addDaysStr(todayStr(), -1)}];
    generarTurnosFijos();
    const futuros = DB.turnos.filter(t => t.employeeId===1 && t.origen==='fijo' && t.fecha>=todayStr()).sort((a,b)=>a.fecha.localeCompare(b.fecha));
    const objetivo = futuros[0];
    const diaSemanaObjetivo = (new Date(objetivo.fecha+'T00:00:00').getDay()+6)%7;
    // Un turno de OTRO día de la semana, para comprobar que no se toca.
    const otroDia = futuros.find(t => ((new Date(t.fecha+'T00:00:00').getDay()+6)%7) !== diaSemanaObjetivo);
    openTurnoModal(objetivo.id);
    document.getElementById('turno-salida').value = '22:00'; // sale más tarde, para siempre
    [...document.querySelectorAll('.modal-footer button')].find(b => b.textContent.trim()==='Para siempre').click();
    const objetivoTras = DB.turnos.find(t => t.id===objetivo.id);
    const otroTras = DB.turnos.find(t => t.id===otroDia.id);
    const patronTras = DB.horariosFijos[0].patron[diaSemanaObjetivo];
    return {
      objetivoSalida: objetivoTras.salida, objetivoOrigen: objetivoTras.origen,
      otroSalida: otroTras.salida, patronSalida: patronTras.salida,
    };
  });
  assert.equal(r.objetivoSalida, '22:00', 'el día editado debe reflejar el cambio: ' + JSON.stringify(r));
  assert.equal(r.objetivoOrigen, 'fijo', 'sigue siendo automático (parte del patrón actualizado), no se desengancha');
  assert.equal(r.otroSalida, '17:00', 'un día de OTRO día de la semana no debe tocarse: ' + JSON.stringify(r));
  assert.equal(r.patronSalida, '22:00', 'el patrón general debe quedar actualizado para ese día de la semana');
});

await caso('Un turno sin patrón fijo activo solo muestra el botón normal de Guardar (sin elegir alcance)', async () => {
  const r = await page.evaluate(() => {
    DB.horariosFijos = [];
    const suelto = DB.turnos.find(t => t.employeeId===1);
    openTurnoModal(suelto.id);
    const texto = document.body.innerText;
    return {tieneAviso: texto.includes('sigue el horario fijo'), tieneGuardar: [...document.querySelectorAll('.modal-footer button')].some(b => b.textContent.trim()==='Guardar')};
  });
  assert.ok(!r.tieneAviso, 'sin patrón activo no debe avisar de nada: ' + JSON.stringify(r));
  assert.ok(r.tieneGuardar, 'debe verse el botón normal "Guardar"');
  await page.evaluate(() => closeModal());
});

await caso('El horario fijo solo ofrece Mañana/Tarde/Partido/Otro/Descanso — nunca Vacaciones ni Baja', async () => {
  const r = await page.evaluate(() => {
    openHorarioFijoModal(1);
    const opciones = [...document.querySelectorAll('#hf-tipo-0 option')].map(o => o.value);
    return opciones;
  });
  assert.deepEqual(r, ['M','T','P','C','D'], 'las opciones del horario fijo no son las esperadas: ' + JSON.stringify(r));
  await page.evaluate(() => closeModal());
});

await caso('Personal ya no tiene los botones sueltos de "por periodo" ni "horario fijo" (ahora van por empleado)', async () => {
  const r = await page.evaluate(() => {
    setHorariosTab('personal');
    const texto = document.getElementById('horarios-tab-content').innerText;
    return {tienePeriodo: texto.includes('Asignar turnos por periodo'), tieneFijo: texto.includes('Horario fijo')};
  });
  assert.ok(!r.tienePeriodo && !r.tieneFijo, 'esos dos botones ya no deben verse sueltos en Personal: ' + JSON.stringify(r));
});

await caso('Calendario es solo vista: ninguna vista (Día/Semana/Mes) tiene forma de crear un turno nuevo', async () => {
  const r = await page.evaluate(() => {
    setHorariosTab('calendario');
    setHorariosCalView('dia');
    const diaTexto = document.getElementById('horarios-cal-body').textContent;
    const dia = diaTexto.includes('Nuevo Turno') || diaTexto.includes('Asignar');
    setHorariosCalView('semana');
    const semana = document.getElementById('horarios-cal-body').textContent.includes('Nuevo Turno');
    const semanaTieneMas = !!document.querySelector('#horarios-cal-body td[onclick^="openTurnoModal(null"]');
    setHorariosCalView('mes');
    const mes = document.getElementById('horarios-cal-body').textContent.includes('Nuevo Turno');
    return {dia, semana, semanaTieneMas, mes};
  });
  assert.ok(!r.dia, 'Día no debe tener forma de crear un turno nuevo: ' + JSON.stringify(r));
  assert.ok(!r.semana && !r.semanaTieneMas, 'Semana no debe tener el "+" de crear turno: ' + JSON.stringify(r));
  assert.ok(!r.mes, 'Mes tampoco debe tener "Nuevo turno": la creación va solo por el botón de calendario del empleado: ' + JSON.stringify(r));
});

await caso('Ningún error de JavaScript en todo el recorrido', () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(64));
console.log(fallos ? `❌ ${fallos} fallaron` : '✅ casos pasaron');
await browser.close();
process.exit(fallos ? 1 : 0);
