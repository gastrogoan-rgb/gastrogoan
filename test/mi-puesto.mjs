// Mi puesto (31/10): Distribución del Trabajo como el mundo de cada empleado — su día, su semana, lo que lleva a cargo, su manual —
// y, sobre todo, que un empleado SOLO ve su propio panel y no puede llegar ni escribir en el de un compañero.
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
  }, 'MIPUESTO01');
  await page.reload({waitUntil:'domcontentloaded'});
  await esperar(2200);
  await page.evaluate(()=>{
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, name:'Bar de Pruebas'});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    const hoy = todayStr();
    const ayer = dateStr(new Date(Date.now() - 86400000));
    DB.employees = [
      {id:1, name:'Ana Pérez', rol:'Cocinera', color:'#2E86C1', area:'cocina', active:true, fechaAlta:'2025-01-10', pin:hashPin('1111', 'MIPUESTO01'), pinChanged:true},
      {id:2, name:'Luis Gómez', rol:'Ayudante', color:'#E74C3C', area:'cocina', active:true, fechaAlta:'2025-03-01', pin:hashPin('2222', 'MIPUESTO01'), pinChanged:true}
    ];
    DB.ingredients = []; DB.stock = {};
    DB.recipes = [{id:900, name:'Croquetas de jamón', area:'cocina', ingredients:[], steps:[]}];
    DB.fichas = [{id:910, recipeId:900, area:'cocina', pasos:[]}];
    DB.workDistribution = {
      1: {platos:['Croquetas de jamón'], produccion:{}, doneDates:{}, tareasUnicas:{}},
      2: {platos:[], produccion:{}, doneDates:{}, tareasUnicas:{}}
    };
    const idxHoy = (new Date().getDay() + 6) % 7;
    DB.workDistribution[1].produccion[idxHoy] = [{id:'t1', text:'Preparar la bechamel', bySelf:false}, {id:'t2', text:'Rebozar y freír', bySelf:false}];
    DB.workDistribution[1].tareasUnicas[hoy] = [{id:'t3', text:'Pedir harina', bySelf:false}];
    DB.workDistribution[2].tareasUnicas[hoy] = [{id:'t9', text:'TAREA DE LUIS', bySelf:false}];
    DB.turnos = [{id:1, employeeId:1, fecha:hoy, tipo:'M', entrada:'08:00', salida:'16:00'}, {id:2, employeeId:1, fecha:dateStr(new Date(Date.now() + 86400000)), tipo:'T', entrada:'16:00', salida:'23:00'}];
    DB.fichajes = []; DB.promos = []; DB.limpieza = {tareas:[], checksMes:{}}; DB.turnoSwapRequests = []; DB.vacationRequests = [];
    applyOwnerSessionEditRights(); document.body.classList.add('owner-session'); areaUnlocked.cocina = areaUnlocked.sala = areaUnlocked.gestion = true;
    saveDB(); currentFolder = 'cocina'; distCurrentEmployeeId = null; navigate('distribucion');
  });
  await esperar(500);
  return page;
}
// Cambia la sesión del aparato a la de un empleado, como hace «Acceso Empleados».
const comoEmpleado = (page, id) => page.evaluate((id) => {
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'employee', employeeId:id, area:'cocina', ts:Date.now()}));
  document.body.classList.remove('owner-session', 'edit-unlocked'); editUnlocked = false;
}, id);

for(const ancho of [1280, 360]){
  const page = await abrir(ancho);
  const q = (fn, ...a) => page.evaluate(fn, ...a);

  await caso(`El propietario ve el equipo con el avance de hoy, lo atrasado y el estado del manual (${ancho}px)`, async () => {
    const r = await q(() => ({tarjetas: [...document.querySelectorAll('.pr-grid .pr-card')].map(c => ({n: c.querySelector('.pr-nom').textContent.trim(), hoy: c.querySelector('.dp-hoy-mini-t b').textContent.trim(), chips: [...c.querySelectorAll('.pr-chip')].map(x => x.textContent.trim().toLowerCase())})),
      celdas: [...document.querySelectorAll('.dp-resumen .st-cel-v')].map(x => x.textContent.trim())}));
    assert.equal(r.tarjetas.length, 2, JSON.stringify(r));
    const ana = r.tarjetas.find(x => /Ana/.test(x.n));
    assert.equal(ana.hoy, '0 / 3', JSON.stringify(ana));
    assert.ok(ana.chips.some(c => /sin manual|no manual/.test(c)), JSON.stringify(ana.chips));
    assert.equal(r.celdas[0], '0 / 4', 'tareas de hoy de todo el equipo (3 de Ana + 1 de Luis)');
  });

  await caso(`El panel de Ana: hoy con su turno, la semana de siete días y la lista del día (${ancho}px)`, async () => {
    await q(() => openDistEmployee(1)); await esperar(250);
    const r = await q(() => ({turno: document.querySelector('.dp-hoy .dp-horas')?.textContent.trim(), dias: document.querySelectorAll('.dp-tira .dp-dia').length,
      sel: document.querySelectorAll('.dp-tira .dp-dia.is-sel').length, hoy: document.querySelectorAll('.dp-tira .dp-dia.is-hoy').length,
      tareas: [...document.querySelectorAll('#dp-dia-panel .dp-txt')].map(x => x.textContent.trim()), prog: document.querySelector('.dp-prog-t').textContent.replace(/\s+/g, ' ').trim(),
      tiles: [...document.querySelectorAll('.dp-tile')].map(x => x.querySelector('.dp-tile-txt small').textContent.trim())}));
    assert.equal(r.turno, '08:00–16:00'); assert.equal(r.dias, 7); assert.equal(r.sel, 1); assert.equal(r.hoy, 1);
    assert.deepEqual(r.tareas.sort(), ['Pedir harina', 'Preparar la bechamel', 'Rebozar y freír']);
    assert.ok(/0.*3/.test(r.prog), r.prog); assert.equal(r.tiles.length, 2, JSON.stringify(r.tiles)); assert.ok(/1 plato/.test(r.tiles[0]), 'el botón de «a su cargo» resume lo que hay: ' + r.tiles[0]);
  });

  await caso(`Marcar una tarea sube el avance de hoy, y lo marcado en la lista cuenta en la tira de la semana (${ancho}px)`, async () => {
    await q(() => document.querySelector('#dp-dia-panel .dp-check input').click()); await esperar(200);
    const r = await q(() => ({prog: document.querySelector('.dp-prog-t').textContent.replace(/\s+/g, ' ').trim(), cuenta: document.querySelector('.dp-dia-cuenta').textContent.trim(),
      tira: document.querySelector('.dp-dia.is-sel .dp-dia-c').textContent.trim(), hechas: document.querySelectorAll('#dp-dia-panel .dp-tarea.is-hecha').length}));
    assert.equal(r.cuenta, '1 / 3'); assert.equal(r.tira, '1/3'); assert.equal(r.hechas, 1); assert.ok(/1.*3/.test(r.prog), r.prog);
  });

  await caso(`Elegir otro día de la tira cambia la lista; «Hoy» vuelve (${ancho}px)`, async () => {
    const r = await q(() => { const otro = [...document.querySelectorAll('.dp-tira .dp-dia')].find(b => !b.classList.contains('is-hoy')); otro.click();
      const vacio = !!document.querySelector('#dp-dia-panel .dp-vacio'); const sel = document.querySelector('.dp-dia.is-sel').classList.contains('is-hoy'); distHoy();
      return {vacio, selEraHoy: sel, vuelve: document.querySelector('.dp-dia.is-sel').classList.contains('is-hoy')}; });
    assert.ok(r.vacio && !r.selEraHoy && r.vuelve, JSON.stringify(r));
  });

  await caso(`El propietario añade una tarea que se repite cada día de la semana, y otra solo para hoy (${ancho}px)`, async () => {
    const r = await q(() => {
      const idx = (new Date().getDay() + 6) % 7;
      const inp = document.getElementById('dist-tarea-' + idx);
      inp.value = 'Limpiar la freidora';
      document.querySelector('input[name="dp-rep"][value="semanal"]').checked = true;
      addDistTarea(idx);
      const inp2 = document.getElementById('dist-tarea-' + idx);
      inp2.value = 'Descongelar jamón';
      document.querySelector('input[name="dp-rep"][value="dia"]').checked = true;
      addDistTarea(idx);
      const d = getDistEmpData(1);
      return {prod: d.produccion[idx].map(x => x.text), unicas: d.tareasUnicas[todayStr()].map(x => x.text), bySelf: d.produccion[idx].find(x => x.text === 'Limpiar la freidora').bySelf};
    });
    assert.ok(r.prod.includes('Limpiar la freidora') && !r.prod.includes('Descongelar jamón'), JSON.stringify(r));
    assert.ok(r.unicas.includes('Descongelar jamón') && !r.bySelf, JSON.stringify(r));
  });

  await caso(`Editar una tarea abre una ventana pequeña y guarda el texto nuevo (${ancho}px)`, async () => {
    const idx = await q(() => (new Date().getDay() + 6) % 7);
    await q((i) => dpEditarTarea('prod', todayStr(), 't1', i), idx); await esperar(250);
    const abre = await q(() => ({campo: document.getElementById('dp-edit-txt').value, nuevo: document.getElementById('modal-box').classList.contains('ds-nuevo')}));
    assert.equal(abre.campo, 'Preparar la bechamel'); assert.ok(abre.nuevo);
    await q(() => { document.getElementById('dp-edit-txt').value = 'Preparar la bechamel espesa'; dpGuardarTarea('prod', todayStr(), 't1', (new Date().getDay() + 6) % 7); });
    await esperar(200);
    assert.ok(await q(() => getDistEmpData(1).produccion[(new Date().getDay() + 6) % 7].some(x => x.text === 'Preparar la bechamel espesa')));
  });

  await caso(`«A su cargo» es un botón: abre la lista entera y cada plato se lee ahí mismo, sin ir a la ficha (${ancho}px)`, async () => {
    await q(() => {
      DB.ingredients = [{id:1, name:'Harina', unit:'kg', allergens:['Gluten'], area:'cocina'}, {id:2, name:'Jamón', unit:'kg', allergens:[], area:'cocina'}];
      DB.recipes = [{id:900, name:'Croquetas de jamón', area:'cocina', comensales:4, ingredients:[{type:'ing', ingredientId:1, qty:0.2}, {type:'ing', ingredientId:2, qty:0.15}], steps:[]},
        {id:901, name:'Bechamel', isBase:true, area:'cocina', comensales:10, ingredients:[{type:'ing', ingredientId:1, qty:0.5}], steps:[]}];
      DB.fichas = [{id:910, recipeId:900, area:'cocina', pasos:['Hacer la bechamel', 'Rebozar y freír'], pasosDet:[{min:20}, {temp:'180 °C', aviso:'Aceite muy caliente'}]}];
      getDistEmpData(1).platos = ['Croquetas de jamón']; getDistEmpData(1).platos.push('Plato borrado'); renderDistDetail();
    });
    const antes = await q(() => ({vista: document.querySelector('.view.active').id, lista: document.querySelectorAll('.dp-col-lado .dp-cargo').length}));
    assert.equal(antes.lista, 0, 'ya no hay una lista larga en la columna');
    await q(() => document.querySelector('.dp-tile').click()); await esperar(250);
    const r = await q(() => ({chips: [...document.querySelectorAll('#dp-cargo-modal .dp-chip')].map(c => c.textContent.trim()), roto: document.querySelectorAll('#dp-cargo-modal .dp-chip.is-roto').length,
      sel: document.querySelector('#dp-cargo-modal .dp-chip.is-sel')?.textContent.trim(), ings: [...document.querySelectorAll('#dp-cargo-modal .dp-ings li')].map(l => l.textContent.replace(/\s+/g, ' ').trim()),
      pasos: document.querySelectorAll('#dp-cargo-modal .dp-pasos li').length, aviso: document.querySelector('#dp-cargo-modal .fi-ojo')?.textContent.includes('Aceite muy caliente'), alerg: document.querySelector('#dp-cargo-modal .dp-det-alerg')?.textContent.trim(),
      nuevo: document.getElementById('modal-box').classList.contains('ds-nuevo'), vista: document.querySelector('.view.active').id}));
    assert.ok(r.chips.length === 2 && r.roto === 1, JSON.stringify(r)); assert.ok(/Croquetas/.test(r.sel), r.sel);
    assert.equal(r.ings.length, 2, JSON.stringify(r.ings)); assert.equal(r.pasos, 2); assert.ok(r.aviso); assert.ok(/Gluten/.test(r.alerg), r.alerg);
    assert.ok(r.nuevo && r.vista === 'view-distribucion', 'sigue en la misma pantalla: ' + r.vista);
    // Pulsar el plato borrado avisa de que ya no existe, sin salir de la ventana
    await q(() => [...document.querySelectorAll('#dp-cargo-modal .dp-chip')].find(c => /borrado/.test(c.textContent)).click()); await esperar(150);
    assert.ok(/Ya no existe/.test(await q(() => document.querySelector('#dp-cargo-modal .dp-detalle').textContent)));
    await q(() => closeModal());
  });

  await caso(`Las elaboraciones también se asignan, se leen en la misma ventana y se quitan (${ancho}px)`, async () => {
    await q(() => openDistCargo(1)); await esperar(250);
    const opc = await q(() => [...document.querySelectorAll('#dist-plato-sel optgroup')].map(g => g.label + ':' + g.querySelectorAll('option').length));
    assert.ok(opc.some(o => /Elaboraciones:1/.test(o)), JSON.stringify(opc));
    await q(() => { document.getElementById('dist-plato-sel').value = 'elab:Bechamel'; addDistPlato(); }); await esperar(300);
    const r = await q(() => ({elabs: getDistEmpData(1).elabs, sel: document.querySelector('#dp-cargo-modal .dp-chip.is-sel')?.textContent.trim(), grupos: document.querySelectorAll('#dp-cargo-modal .dp-grupo').length,
      ing: document.querySelector('#dp-cargo-modal .dp-ings li')?.textContent.replace(/\s+/g, ' ').trim(), tile: document.querySelector('.dp-tile-txt small').textContent.trim()}));
    assert.deepEqual(r.elabs, ['Bechamel']); assert.ok(/Bechamel/.test(r.sel)); assert.equal(r.grupos, 2); assert.ok(/Harina/.test(r.ing), r.ing); assert.ok(/1 elaboración/.test(r.tile), r.tile);
    await q(() => closeModal());
    await q(() => { getDistEmpData(1).platos = ['Croquetas de jamón']; getDistEmpData(1).elabs = []; renderDistDetail(); });
  });

  await caso(`Cada tarea dice quién la puso: el jefe, o el propio empleado (${ancho}px)`, async () => {
    const r = await q(() => { const idx = (new Date().getDay() + 6) % 7; getDistEmpData(1).tareasUnicas[todayStr()].push({id:'t77', text:'La que me puse yo', bySelf:true}); renderDistDetail();
      const fila = txt => [...document.querySelectorAll('#dp-dia-panel .dp-tarea')].find(f => f.textContent.includes(txt));
      return {mia: fila('La que me puse yo').querySelector('.dp-origen')?.className, miaFila: fila('La que me puse yo').classList.contains('es-mia'), jefe: fila('Pedir harina').querySelector('.dp-origen')?.className, jefeTxt: fila('Pedir harina').querySelector('.dp-origen')?.textContent.trim(), miaTxt: fila('La que me puse yo').querySelector('.dp-origen')?.textContent.trim()}; });
    assert.ok(/mia/.test(r.mia) && r.miaFila && /jefe/.test(r.jefe), JSON.stringify(r)); assert.ok(/el jefe/i.test(r.jefeTxt) && /Ana/.test(r.miaTxt), 'el propietario ve «por el jefe» y «por Ana»: ' + JSON.stringify(r));
    await q(() => { getDistEmpData(1).tareasUnicas[todayStr()] = getDistEmpData(1).tareasUnicas[todayStr()].filter(x => x.id !== 't77'); });
  });

  await caso(`Marcar una tarea es directo; desmarcarla pregunta antes (${ancho}px)`, async () => {
    // Marcar: sin preguntas.
    await q(() => { const c = [...document.querySelectorAll('#dp-dia-panel .dp-tarea')].find(f => f.textContent.includes('Pedir harina')).querySelector('input'); c.click(); });
    await esperar(200);
    assert.equal(await q(() => !!getDistEmpData(1).doneDates[todayStr()]?.t3), true);
    // Desmarcar: sale la pregunta; si se dice que no, sigue hecha.
    await q(() => { const c = [...document.querySelectorAll('#dp-dia-panel .dp-tarea')].find(f => f.textContent.includes('Pedir harina')).querySelector('input'); c.click(); });
    await esperar(250);
    const pregunta = await q(() => ({abierta: !!document.getElementById('modal-box') && /desmarcar|untick/i.test(document.getElementById('modal-box').textContent), aun: !!getDistEmpData(1).doneDates[todayStr()]?.t3}));
    assert.ok(pregunta.abierta && pregunta.aun, JSON.stringify(pregunta));
    await q(() => { const b = [...document.querySelectorAll('#modal-box button')].find(x => /cancel|no/i.test(x.textContent) && !/^s[ií]/i.test(x.textContent.trim())); if(b) b.click(); }); await esperar(250);
    assert.equal(await q(() => !!getDistEmpData(1).doneDates[todayStr()]?.t3), true, 'al decir que no, sigue hecha');
    assert.equal(await q(() => document.querySelector('#dp-dia-panel .dp-tarea:has(input:checked)') !== null), true, 'y la casilla vuelve a verse marcada');
    await q(() => { const c = [...document.querySelectorAll('#dp-dia-panel .dp-tarea')].find(f => f.textContent.includes('Pedir harina')).querySelector('input'); c.click(); });
    await esperar(250);
    await q(() => { const b = [...document.querySelectorAll('#modal-box button')].find(x => /^(s[ií]|aceptar|confirm|ok|yes)/i.test(x.textContent.trim()) || /btn-primary|is-on/.test(x.className)); if(b) b.click(); }); await esperar(250);
    assert.equal(await q(() => !!getDistEmpData(1).doneDates[todayStr()]?.t3), false, 'al confirmar, queda pendiente');
  });

  await caso(`Las cuentas de tareas se ven en verde si está todo hecho y en rojo si queda algo atrasado (${ancho}px)`, async () => {
    const r = await q(() => { const d = getDistEmpData(1); const hoy = todayStr(); const idx = (new Date().getDay() + 6) % 7;
      const ids = [...(d.produccion[idx]||[]).map(x => x.id), ...(d.tareasUnicas[hoy]||[]).map(x => x.id)];
      d.doneDates[hoy] = Object.fromEntries(ids.map(i => [i, true])); renderDistDetail();
      const verde = {cuenta: document.querySelector('.dp-dia-cuenta').className, tira: document.querySelector('.dp-dia.is-sel .dp-dia-c').className, prog: document.querySelector('.dp-prog-t').className};
      const ayer = addDaysStr(hoy, -1); const iAyer = (new Date(ayer + 'T12:00:00').getDay() + 6) % 7;
      d.tareasUnicas[ayer] = [{id:'ayer1', text:'Se quedó sin hacer', bySelf:false}]; renderDistDetail();
      const rojo = document.querySelector('.dp-tira .dp-dia-c.mal') ? true : false;
      d.tareasUnicas[ayer] = []; d.doneDates[hoy] = {}; renderDistDetail();
      return {verde, rojo}; });
    assert.ok(/ok/.test(r.verde.cuenta) && /ok/.test(r.verde.tira) && /ok/.test(r.verde.prog), JSON.stringify(r.verde)); // Un lunes «ayer» (domingo) cae en la semana anterior, que la tira no enseña: ahí no hay día pasado que pintar.
    if(new Date().getDay() !== 1) assert.ok(r.rojo, 'el día pasado con algo sin hacer, en rojo');
  });

  await caso(`El propietario escribe el manual (plantilla, frase propia, orden) y cada cambio sube la versión (${ancho}px)`, async () => {
    await q(() => openDistManualEditor(1)); await esperar(250);
    assert.ok(await q(() => document.getElementById('modal-box').classList.contains('ds-nuevo')));
    await q(() => dpManualAplicarPlantilla(1)); await esperar(250);
    const t1 = await q(() => ({n: getDistEmpData(1).manual.items.length, v: getDistEmpData(1).manual.version, tipos: [...new Set(getDistEmpData(1).manual.items.map(i => i.tipo))].sort()}));
    assert.ok(t1.n >= 6 && t1.tipos.length >= 3 && t1.v === 1, JSON.stringify(t1));
    await q(() => { document.getElementById('dpm-t-obligacion').value = 'Fichar al entrar y al salir'; document.getElementById('dpm-x-obligacion').value = 'Desde la tablet de la entrada.'; dpManualGuardar('obligacion'); });
    await esperar(200);
    const t2 = await q(() => ({n: getDistEmpData(1).manual.items.length, v: getDistEmpData(1).manual.version, ult: getDistEmpData(1).manual.items.at(-1)}));
    assert.equal(t2.n, t1.n + 1); assert.equal(t2.v, 2); assert.equal(t2.ult.titulo, 'Fichar al entrar y al salir');
    // Mover dentro de su apartado
    const antes = await q(() => getDistEmpData(1).manual.items.filter(i => i.tipo === 'obligacion').map(i => i.titulo));
    await q(() => { const it = getDistEmpData(1).manual.items.filter(i => i.tipo === 'obligacion').at(-1); dpManualMover(String(it.id), -1); });
    const despues = await q(() => getDistEmpData(1).manual.items.filter(i => i.tipo === 'obligacion').map(i => i.titulo));
    assert.equal(despues.at(-2), antes.at(-1)); assert.equal(despues.at(-1), antes.at(-2));
    await q(() => closeModal());
  });

  await caso(`El manual aparece «sin leer» al propietario hasta que el empleado lo confirma (${ancho}px)`, async () => {
    await q(() => { dpManualEdit = null; renderDistDetail(); });
    const r = await q(() => document.querySelectorAll('.dp-tile')[1].querySelector('small').textContent.trim().toLowerCase());
    assert.ok(/por leer|sin leer|unread|per llegir/.test(r), r);
  });

  await caso(`Ventanas de Mi puesto con el diseño nuevo y sin desbordes (${ancho}px)`, async () => {
    for(const fn of ['openDistManual(1)', 'openDistManualEditor(1)']){
      await q(f => { closeModal(); eval(f); }, fn); await esperar(250);
      const r = await q(() => ({nuevo: document.getElementById('modal-box').classList.contains('ds-nuevo'), desborda: document.getElementById('modal-box').scrollWidth > document.getElementById('modal-box').clientWidth + 1}));
      assert.ok(r.nuevo, fn + ' sin ds-nuevo'); assert.ok(!r.desborda, fn + ' desborda');
    }
    await q(() => closeModal());
  });

  await caso(`Ningún error de JavaScript (${ancho}px)`, async () => assert.deepEqual(page.erroresJs, []));
  await page.close();
}

// ── El empleado y SOLO su panel ───────────────────────────────────────────────
{
  const page = await abrir(1280);
  const q = (fn, ...a) => page.evaluate(fn, ...a);
  // El propietario escribe el manual de Ana, deja a Luis abierto y luego entra Ana en el mismo aparato.
  await q(() => { openDistEmployee(1); dpManualAplicarPlantilla(1); closeModal(); openDistEmployee(2); });
  await comoEmpleado(page, 1);

  await caso('Un empleado entra y ve SU panel directo, aunque el aparato se hubiera quedado con el de un compañero', async () => {
    const r = await q(() => { navigate('folder'); navigate('distribucion'); return {actual: distCurrentEmployeeId, nombre: document.querySelector('.dp-nombre')?.textContent.trim(), back: !!document.querySelector('[onclick="backToDistList()"]'),
      texto: document.getElementById('distribucion-content').textContent}; });
    assert.equal(r.actual, 1); assert.equal(r.nombre, 'Ana Pérez'); assert.ok(!r.back, 'no hay equipo al que volver');
    assert.ok(!/TAREA DE LUIS|Luis/.test(r.texto), 'nada de Luis en pantalla');
  });

  await caso('No puede abrir el panel de un compañero: ni directo, ni con el PIN, ni forzando el id', async () => {
    const r = await q(() => {
      openDistEmployee(2);
      const pidePin = !!document.getElementById('dist-pin-input');
      openDistEmployeeAuthed(2);
      const trasAuthed = distCurrentEmployeeId;
      distCurrentEmployeeId = 2; renderDistribucion();
      return {pidePin, trasAuthed, final: distCurrentEmployeeId, texto: document.getElementById('distribucion-content').textContent};
    });
    assert.ok(!r.pidePin, 'ni siquiera ofrece teclear su PIN'); assert.equal(r.trasAuthed, 1);
    assert.equal(r.final, 1); assert.ok(!/TAREA DE LUIS/.test(r.texto));
  });

  await caso('No puede escribir en el trabajo de un compañero llamando a las funciones a mano', async () => {
    const r = await q(() => {
      distCurrentEmployeeId = 2;   // lo que haría alguien desde la consola
      const antes = JSON.stringify(DB.workDistribution[2]);
      const idx = (new Date().getDay() + 6) % 7;
      const campo = document.createElement('input'); campo.id = 'dist-tarea-' + idx; campo.value = 'COLADA'; document.body.appendChild(campo);
      addDistTarea(idx); toggleDistTareaDone(todayStr(), 't9', true); addDistPlato(); addDistRango();
      updateDistTareaUnica(todayStr(), 't9', 'CAMBIADA'); dpManualGuardar('obligacion'); dpManualAplicarPlantilla(2);
      campo.remove();
      return {igual: JSON.stringify(DB.workDistribution[2]) === antes};
    });
    assert.ok(r.igual, 'el trabajo de Luis no se ha tocado');
  });

  await caso('Tampoco puede imprimir el equipo entero ni el manual de otro', async () => {
    const r = await q(() => {
      const abiertas = []; const orig = window.printReportWindow;
      window.printReportWindow = (titulo, cuerpo) => abiertas.push(cuerpo);
      printDistribucion(); printDistribucion(2); printManualEmpleado(2); openDistManual(2);
      window.printReportWindow = orig;
      return {impresos: abiertas.length, conLuis: abiertas.some(c => /Luis/.test(c)), modal: !!document.getElementById('modal-box') && /Luis/.test(document.getElementById('modal-box').textContent)};
    });
    assert.ok(!r.conLuis && !r.modal, JSON.stringify(r));
  });

  await caso('Su panel es suyo: marca sus tareas, se apunta las suyas (sin tocar las del jefe) y no ve los mandos de repartir', async () => {
    await q(() => { distCurrentEmployeeId = 1; renderDistribucion(); });
    const r = await q(() => {
      const idx = (new Date().getDay() + 6) % 7;
      const inp = document.getElementById('dist-tarea-' + idx); inp.value = 'Mi nota: revisar la cámara';
      const rep = document.querySelector('input[name="dp-rep"][value="dia"]'); const repSel = rep ? rep.checked : null;
      addDistTarea(idx);
      const mia = getDistEmpData(1).tareasUnicas[todayStr()].find(x => x.text === 'Mi nota: revisar la cámara');
      const filas = [...document.querySelectorAll('#dp-dia-panel .dp-tarea')];
      const conMenu = filas.filter(f => f.querySelector('.mn-btn')).map(f => f.querySelector('.dp-txt').textContent.trim());
      const vis = e => !!e && e.getBoundingClientRect().width > 0;
      return {repSel, bySelf: !!(mia && mia.bySelf), conMenu, asignar: vis(document.querySelector('.dp-asignar')), escribir: [...document.querySelectorAll('.dp-man-bt .btn')].some(b => /Escribir|Editar/.test(b.textContent) && vis(b)),
        fichar: [...document.querySelectorAll('.dp-hoy-der .btn')].some(b => /fichaje/i.test(b.textContent))};
    });
    assert.ok(r.repSel, 'por defecto, «solo este día»'); assert.ok(r.bySelf, JSON.stringify(r));
    assert.deepEqual(r.conMenu, ['Mi nota: revisar la cámara'], 'solo puede tocar la que él mismo añadió');
    assert.ok(!r.asignar && !r.escribir && r.fichar, JSON.stringify(r));
  });

  await caso('Lee su manual y confirma que lo ha leído; si el jefe lo cambia, vuelve a pedirlo', async () => {
    await q(() => { openDistManual(1); }); await esperar(250);
    const antes = await q(() => ({boton: [...document.querySelectorAll('#modal-box .btn')].some(b => /He leído|I have read|He llegit/.test(b.textContent)), secciones: document.querySelectorAll('#modal-box .dp-man-sec').length}));
    assert.ok(antes.boton && antes.secciones >= 3, JSON.stringify(antes));
    await q(() => dpManualConfirmar(1)); await esperar(200);
    const leido = await q(() => ({v: getDistEmpData(1).manualLeido?.version, man: getDistEmpData(1).manual.version, chip: document.querySelectorAll('.dp-tile')[1].querySelector('small').textContent.toLowerCase()}));
    assert.equal(leido.v, leido.man); assert.ok(/^(leído|read|llegit)/.test(leido.chip), leido.chip);
    await q(() => { document.body.classList.add('owner-session'); localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()})); getDistEmpData(1).manual.items.push({id:777, tipo:'norma', titulo:'Norma nueva', texto:''}); dpManualTocar(getDistEmpData(1)); });
    await comoEmpleado(page, 1);
    await q(() => renderDistDetail());
    const cambiado = await q(() => document.querySelectorAll('.dp-tile')[1].querySelector('small').textContent.toLowerCase());
    assert.ok(/cambiado|changed|canviat/.test(cambiado), cambiado);
  });

  await caso('Un empleado no puede confirmar el manual de otro ni editar el suyo', async () => {
    const r = await q(() => {
      const v0 = JSON.stringify(getDistEmpData(2).manualLeido || null);
      dpManualConfirmar(2);
      const n0 = getDistEmpData(1).manual.items.length;
      dpManualGuardar('obligacion'); dpManualBorrar(777); dpManualAplicarPlantilla(1);
      return {ajeno: JSON.stringify(getDistEmpData(2).manualLeido || null) === v0, propio: getDistEmpData(1).manual.items.length === n0};
    });
    assert.ok(r.ajeno && r.propio, JSON.stringify(r));
  });
  await page.close();
}

// Cinco anchos de móvil: nada se sale de la pantalla.
for(const ancho of [320, 360, 390, 412, 430]){
  const page = await abrir(ancho);
  await caso(`Sin desbordes en Mi puesto a ${ancho}px`, async () => {
    const r = await page.evaluate(() => {
      openDistEmployee(1);
      const malos = [];
      document.querySelectorAll('.dp-hoy, .dp-tira, .dp-dia, .dp-dia-panel, .dp-card, .dp-tarea, .dp-cargo, .dp-anadir').forEach(e => { if(e.scrollWidth > e.clientWidth + 1) malos.push(e.className); });
      return {malos, pagina: document.documentElement.scrollWidth - window.innerWidth};
    });
    assert.deepEqual(r.malos, []); assert.ok(r.pagina <= 0, 'la página se mueve de lado: ' + r.pagina);
  });
  await page.close();
}

await browser.close();
if(fallos){ console.log(`\n❌ ${fallos} casos fallaron`); process.exit(1); }
console.log('\n✅ Mi puesto: todos los casos pasaron');
