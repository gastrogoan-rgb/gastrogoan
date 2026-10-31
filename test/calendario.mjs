// Calendario de Horarios (31/10): Día con línea de horas y personal por hora, Semana (tabla en PC, tarjetas en móvil) y Mes con el
// selector de periodo; y las ventanas de turno, horario fijo y asignación por periodo con el diseño nuevo.
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
  }, 'CALEND001');
  await page.reload({waitUntil:'domcontentloaded'});
  await esperar(2200);
  await page.evaluate(()=>{
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, name:'Bar de Pruebas'});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    const hoy = todayStr();
    DB.employees = [
      {id:1, name:'Marta Ruiz Casanovas', rol:'Jefa de cocina', color:'#2E86C1', area:'cocina', active:true},
      {id:2, name:'Hamid', rol:'Cocinero', color:'#E74C3C', area:'cocina', active:true},
      {id:3, name:'Lucía Fernández', rol:'Ayudante', color:'#27AE60', area:'cocina', active:true},
      {id:4, name:'Pau', rol:'Friegue', color:'#8E44AD', area:'cocina', active:true},
      {id:5, name:'Camarero', rol:'', color:'#8E44AD', area:'sala', active:true}
    ];
    DB.turnos = [
      {id:1, employeeId:1, fecha:hoy, tipo:'M', entrada:'08:00', salida:'16:00', notas:'Abre la cocina'},
      {id:2, employeeId:2, fecha:hoy, tipo:'P', entrada:'12:00', salida:'16:00', entrada2:'19:00', salida2:'23:30'},
      {id:3, employeeId:3, fecha:hoy, tipo:'V'},
      {id:5, employeeId:5, fecha:hoy, tipo:'M', entrada:'09:00', salida:'17:00'},
      {id:4, employeeId:1, fecha:addDaysStr(hoy, 1), tipo:'T', entrada:'16:00', salida:'00:00'}
    ];
    DB.horariosFijos = []; DB.fichajes = []; DB.personalLog = [];
    applyOwnerSessionEditRights(); document.body.classList.add('owner-session'); areaUnlocked.cocina = areaUnlocked.sala = areaUnlocked.gestion = true;
    horariosDate = hoy; horariosWeekOffset = 0; horariosMonthOffset = 0; horariosCalView = 'dia';
    saveDB(); currentFolder = 'cocina'; navigate('horarios'); setHorariosTab('calendario');
  });
  await esperar(500);
  return page;
}

for(const ancho of [1280, 360]){
  const page = await abrir(ancho);
  const q = (fn, ...a) => page.evaluate(fn, ...a);

  await caso(`Día: el resumen cuenta quién trabaja, las horas, los descansos y los que no tienen turno (${ancho}px)`, async () => {
    const r = await q(() => [...document.querySelectorAll('.cal-resumen .st-cel-v')].map(x => x.textContent.trim()));
    assert.deepEqual(r, ['2', '16.5h', '1', '1'], 'Marta 8 h + Hamid 4 h y 4,5 h; Lucía de vacaciones; Pau sin turno: ' + JSON.stringify(r));
  });

  await caso(`Día: la línea de horas pinta cada tramo (el turno partido, en dos) y el personal por hora (${ancho}px)`, async () => {
    const r = await q(() => ({segs: document.querySelectorAll('.cal-seg').length, ejes: document.querySelectorAll('.cal-eje span').length, barras: document.querySelectorAll('.cal-cob-b').length, max: document.querySelector('.cal-cob-b.is-max') ? parseInt(document.querySelector('.cal-cob-b.is-max').title.split('·')[1], 10) : 0,
      filas: document.querySelectorAll('.cal-fila').length, notas: document.querySelector('.cal-nota')?.textContent.trim()}));
    assert.equal(r.segs, 3, 'Marta (1) + Hamid partido (2): ' + JSON.stringify(r));
    assert.ok(r.ejes >= 6 && r.barras >= 8, JSON.stringify(r)); assert.equal(r.max, 2, 'a las 12-16 coinciden Marta y Hamid');
    assert.equal(r.filas, 4); assert.ok(/Abre la cocina/.test(r.notas));
  });

  await caso(`Día: los días se cambian con las flechas y con el selector de fecha (${ancho}px)`, async () => {
    const r = await q(() => { calDiaMas(1); const manana = document.getElementById('horarios-filter-date').value; const filas = document.querySelectorAll('.cal-fila:not(.is-vacia)').length;
      calDiaFecha(todayStr()); return {manana, filas, vuelve: document.getElementById('horarios-filter-date').value === todayStr()}; });
    assert.equal(r.filas, 1, 'mañana solo trabaja Marta'); assert.ok(r.vuelve);
  });

  await caso(`Día: editar y eliminar un turno están en el ⋯ de su fila (${ancho}px)`, async () => {
    const r = await q(() => { const f = [...document.querySelectorAll('.cal-fila')].find(x => /Marta/.test(x.textContent)); const b = f.querySelector('.mn-btn'); return {acc: JSON.parse(b.dataset.acc).map(a => a.texto), sueltos: f.querySelectorAll('.ti-edit, .ti-trash').length}; });
    assert.equal(r.acc.length, 2, JSON.stringify(r)); assert.equal(r.sueltos, 0);
    await q(() => openTurnoModal(1)); await esperar(250);
    const m = await q(() => ({nuevo: document.getElementById('modal-box').classList.contains('ds-nuevo'), campos: ['turno-employee','turno-fecha','turno-tipo','turno-entrada','turno-salida','turno-notas'].filter(i => !document.getElementById(i)),
      desborda: document.getElementById('modal-box').scrollWidth > document.getElementById('modal-box').clientWidth + 1}));
    assert.ok(m.nuevo && !m.desborda); assert.deepEqual(m.campos, []);
    await q(() => closeModal());
  });

  await caso(`Semana: ${ancho > 760 ? 'tabla con totales y personal por día' : 'una tarjeta por empleado con sus siete días'} (${ancho}px)`, async () => {
    await q(() => setHorariosCalView('semana')); await esperar(200);
    const r = await q(() => { const vis = e => !!e && e.getBoundingClientRect().width > 0;
      return {tabla: vis(document.querySelector('.cal-sem-tabla')), tarjetas: vis(document.querySelector('.cal-sem-tarjetas')), turnos: document.querySelectorAll('.cal-turno').length,
        pie: [...document.querySelectorAll('.cal-sem tfoot td')].map(x => x.textContent.trim()), imprimir: !!document.querySelector('.cal-nav-der .btn')}; });
    if(ancho > 760){ assert.ok(r.tabla && !r.tarjetas, JSON.stringify(r)); assert.ok(r.pie.length === 9, JSON.stringify(r.pie)); }
    else { assert.ok(!r.tabla && r.tarjetas, JSON.stringify(r)); }
    assert.ok(r.turnos >= 4 && r.imprimir, JSON.stringify(r));
  });

  await caso(`Semana: pulsar un turno lo abre para editarlo y un día de la cabecera lleva a esa fecha (${ancho}px)`, async () => {
    const abre = await q((ancho) => { const b = [...document.querySelectorAll(ancho > 760 ? '.cal-sem-tabla button.cal-turno' : '.cal-sem-tarjetas button.cal-turno')][0]; b.click(); return !!document.getElementById('turno-tipo'); }, ancho);
    assert.ok(abre); await q(() => closeModal());
    if(ancho > 760){
      const va = await q(() => { document.querySelectorAll('.cal-sem-dia')[2].click(); return {vista: horariosCalView, fecha: horariosDate}; });
      assert.equal(va.vista, 'dia');
    }
  });

  await caso(`Mes: el selector de periodo cuenta los turnos de cada mes y un día lleva al Día (${ancho}px)`, async () => {
    await q(() => setHorariosCalView('mes')); await esperar(200);
    const r = await q(() => ({selector: !!document.querySelector('.pe-sel'), dias: document.querySelectorAll('.cal-mes-dia').length, hoy: document.querySelectorAll('.cal-mes-dia.is-hoy').length,
      conGente: document.querySelectorAll('.cal-mes-dia.tiene').length, celdas: [...document.querySelectorAll('.cal-resumen .st-cel-v')].map(x => x.textContent.trim())}));
    assert.ok(r.selector && r.hoy === 1 && r.conGente >= 1 && r.dias >= 28, JSON.stringify(r));
    const nav = await q(() => { horariosMesCb(new Date().getFullYear(), (new Date().getMonth() + 1) % 12 + (new Date().getMonth() === 11 ? 0 : 0)); return horariosMonthOffset; });
    assert.ok(nav !== 0, 'el selector cambia de mes'); await q(() => { horariosMonthOffset = 0; renderHorariosMes(); });
    await q(() => document.querySelector('.cal-mes-dia.is-hoy').click());
    assert.equal(await q(() => horariosCalView), 'dia');
  });

  await caso(`Horario fijo y asignar por periodo: ventanas con el diseño nuevo, sin desbordes (${ancho}px)`, async () => {
    for(const fn of ['openHorarioFijoModal(1)', 'openBulkTurnoModal(1)', 'openEmployeeScheduleChooser(1)']){
      await q(f => { closeModal(); eval(f); }, fn); await esperar(300);
      const r = await q(() => ({nuevo: document.getElementById('modal-box').classList.contains('ds-nuevo'), desborda: document.getElementById('modal-box').scrollWidth > document.getElementById('modal-box').clientWidth + 1}));
      assert.ok(r.nuevo, fn + ' sin ds-nuevo'); assert.ok(!r.desborda, fn + ' desborda');
    }
    const fijo = await q(() => { closeModal(); openHorarioFijoModal(1); return document.querySelectorAll('.cal-fijo-dia').length; });
    assert.equal(fijo, 7);
    await q(() => closeModal());
  });

  await caso(`Ningún error de JavaScript (${ancho}px)`, async () => assert.deepEqual(page.erroresJs, []));
  await page.close();
}

for(const ancho of [320, 360, 390, 412, 430]){
  const page = await abrir(ancho);
  await caso(`Sin desbordes en el Calendario a ${ancho}px (Día, Semana y Mes)`, async () => {
    const malos = [];
    for(const v of ['dia', 'semana', 'mes']){
      const r = await page.evaluate((v) => { setHorariosCalView(v); const m = [];
        document.querySelectorAll('.cal-fila, .cal-linea, .cal-nav, .cal-resumen, .st-cel, .cal-sem-card, .cal-mes-dia, .cal-mes').forEach(e => { if(e.getBoundingClientRect().width > 0 && e.scrollWidth > e.clientWidth + 1) m.push(e.className); });
        return {m, pagina: document.documentElement.scrollWidth - window.innerWidth}; }, v);
      if(r.m.length) malos.push(v + ': ' + r.m.join(',')); if(r.pagina > 0) malos.push(v + ' se mueve de lado ' + r.pagina);
    }
    assert.deepEqual(malos, []);
  });
  await page.close();
}

await browser.close();
if(fallos){ console.log(`\n❌ ${fallos} casos fallaron`); process.exit(1); }
console.log('\n✅ Calendario: todos los casos pasaron');
