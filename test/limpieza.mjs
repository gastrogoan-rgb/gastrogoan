// Plan de Limpieza (31/10): estado de hoy arriba, protocolos con su cumplimiento, calendario de tareas, registros APPCC con tarjetas por
// equipo, alérgenos con filtro y mantenimiento en tarjetas; y que un empleado sin edición siga pudiendo apuntar temperaturas pero no borrar.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox'], protocolTimeout:30000});
let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}
const esperar = ms => new Promise(r => setTimeout(r, ms));
const TABS = ['protocolo', 'manos', 'mes', 'temperaturas', 'alergenos', 'plagas', 'mantenimiento'];

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
  }, 'LIMPIEZA01');
  await page.reload({waitUntil:'domcontentloaded'});
  await esperar(2200);
  await page.evaluate(()=>{
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, name:'Bar de Pruebas'});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    const hoy = todayStr(), ayer = addDaysStr(hoy, -1), dia = new Date().getDate();
    DB.employees = [{id:1, name:'Ana Pérez', rol:'Cocinera', color:'#2E86C1', area:'cocina', active:true}];
    DB.ingredients = [{id:1, name:'Harina', unit:'kg', allergens:['Gluten'], area:'cocina'}, {id:2, name:'Leche', unit:'L', allergens:['Lácteos'], area:'cocina'}, {id:3, name:'Tomate', unit:'kg', allergens:[], area:'cocina'}];
    DB.recipes = [{id:10, name:'Pan', area:'cocina', ingredients:[{type:'ing', ingredientId:1, qty:1}]}, {id:11, name:'Natillas', area:'cocina', ingredients:[{type:'ing', ingredientId:2, qty:1}]}, {id:12, name:'Gazpacho', area:'cocina', ingredients:[{type:'ing', ingredientId:3, qty:1}]}];
    DB.fichas = [];
    DB.limpieza = {
      tareas: [{id:1, area:'Campana extractora', producto:'Desengrasante', tipo:'mensual', diaMes:dia, fecha:null, responsableId:1, zona:'cocina'},
               {id:2, area:'Suelo de cámara', producto:'', tipo:'mensual', diaMes:dia, fecha:null, responsableId:null, zona:'cocina'},
               {id:3, area:'Filtros del horno', producto:'', tipo:'puntual', diaMes:null, fecha:hoy, responsableId:null, zona:'cocina'}],
      checksMes: {}, aperturaLog: [], cierreLog: [{id:5, fecha:hoy, hora:'23:10', responsableNombre:'Ana Pérez', area:'cocina'}],
      temperaturas: [{id:1, fecha:hoy, hora:'09:00', equipo:'Cámara 1', tipo:'nevera', temp:'3.2', estado:'OK', responsable:'Ana', zona:'cocina'},
                     {id:2, fecha:hoy, hora:'09:05', equipo:'Congelador', tipo:'congelador', temp:'-10', estado:'NOK', responsable:'Ana', zona:'cocina'},
                     {id:3, fecha:ayer, hora:'18:00', equipo:'Barra', tipo:'nevera', temp:'4', estado:'OK', responsable:'Ana', zona:'cocina'}],
      plagas: [{id:1, fecha:ayer, area:'Almacén', hallazgos:'Nada', accion:'—', proxima:addDaysStr(hoy, 3), responsable:'Ana', zona:'cocina'}],
      mantenimiento: [{id:1, nombre:'Campana', ultimo:'2026-01-01', proximo:addDaysStr(hoy, -5), responsable:'Empresa', estado:'Urgente', notas:'', zona:'cocina'},
                      {id:2, nombre:'Horno', ultimo:'', proximo:addDaysStr(hoy, 4), responsable:'', estado:'OK', notas:'', zona:'cocina'},
                      {id:3, nombre:'Extintores', ultimo:'', proximo:addDaysStr(hoy, 200), responsable:'', estado:'OK', notas:'', zona:'cocina'}],
      manosPasos: {}, aperturaPasos: {}, cierrePasos: {}
    };
    applyOwnerSessionEditRights(); document.body.classList.add('owner-session'); areaUnlocked.cocina = areaUnlocked.sala = areaUnlocked.gestion = true;
    limpiezaTab = 'protocolo'; limpiezaCalMode = 'dia'; limpiezaCalDate = new Date();
    saveDB(); currentFolder = 'cocina'; navigate('limpieza');
  });
  await esperar(500);
  return page;
}

for(const ancho of [1280, 360]){
  const page = await abrir(ancho);
  const q = (fn, ...a) => page.evaluate(fn, ...a);

  await caso(`El estado de hoy cuenta apertura, cierre, tareas, temperaturas fuera de rango y mantenimiento (${ancho}px)`, async () => {
    const r = await q(() => [...document.querySelectorAll('.lp-resumen .st-cel')].map(c => ({et: c.querySelector('.st-cel-et').textContent.trim(), v: c.querySelector('.st-cel-v').textContent.trim(), s: c.querySelector('.st-cel-s')?.textContent.trim() || '', ok: c.classList.contains('is-ok'), mal: c.classList.contains('is-bajo')})));
    assert.equal(r.length, 5, JSON.stringify(r));
    assert.equal(r[0].v, '—'); assert.ok(!r[0].ok, 'la apertura de hoy aún no se ha registrado');
    assert.ok(r[1].ok, 'el cierre sí: ' + JSON.stringify(r[1]));
    assert.equal(r[2].v, '0/3', JSON.stringify(r[2]));
    assert.equal(r[3].v, '2'); assert.ok(r[3].mal && /1/.test(r[3].s), 'una lectura fuera de rango: ' + JSON.stringify(r[3]));
    assert.equal(r[4].v, '2'); assert.ok(r[4].mal, 'campana vencida y horno a punto: ' + JSON.stringify(r[4]));
  });

  await caso(`Registrar la apertura de hoy cambia el estado de arriba al momento (${ancho}px)`, async () => {
    await q(() => registerProtocoloCompliance('apertura')); await esperar(250);
    const r = await q(() => ({celda: document.querySelector('.lp-resumen .st-cel').classList.contains('is-ok'), ok: document.querySelectorAll('.lp-cumple-ok').length, puntos: document.querySelectorAll('.lp-dia.ok').length}));
    assert.ok(r.celda && r.ok === 2 && r.puntos >= 2, JSON.stringify(r));
  });

  await caso(`Los pasos del protocolo se editan en su sitio y subir, bajar y quitar están en el ⋯ (${ancho}px)`, async () => {
    const r = await q(() => { const p = document.querySelector('.lp-paso'); const acc = JSON.parse(p.querySelector('.mn-btn').dataset.acc).map(a => a.texto);
      const i = p.querySelector('.lp-paso-txt'); i.value = 'Paso cambiado'; i.dispatchEvent(new Event('change', {bubbles:true}));
      return {acc, guardado: limpiezaProtocoloPasos('apertura')[0], botonesSueltos: document.querySelectorAll('.lp-paso .btn-icon').length}; });
    assert.equal(r.guardado, 'Paso cambiado'); assert.equal(r.botonesSueltos, 0); assert.ok(r.acc.length >= 1, JSON.stringify(r.acc));
    const n = await q(() => { const antes = limpiezaProtocoloPasos('apertura').length; addProtocoloPaso('apertura'); return [antes, limpiezaProtocoloPasos('apertura').length]; });
    assert.equal(n[1], n[0] + 1);
  });

  await caso(`Lavado de manos: pasos largos en cajas de texto, con «cuándo» y los 20 segundos (${ancho}px)`, async () => {
    await q(() => setLimpiezaTab('manos')); await esperar(200);
    const r = await q(() => ({cajas: document.querySelectorAll('.lp-paso textarea').length, listas: document.querySelectorAll('.lp-lista-puntos li').length, grande: document.querySelector('.lp-grande')?.textContent.trim()}));
    assert.ok(r.cajas >= 3 && r.listas === 6 && /20/.test(r.grande), JSON.stringify(r));
  });

  await caso(`Tareas de limpieza: día, semana y mes; marcar una hecha sube el contador de arriba (${ancho}px)`, async () => {
    await q(() => setLimpiezaTab('mes')); await esperar(200);
    const dia = await q(() => ({filas: document.querySelectorAll('.lp-tarea').length, cuenta: document.querySelector('.dp-dia-cuenta').textContent.trim()}));
    assert.equal(dia.filas, 3); assert.equal(dia.cuenta, '0 / 3');
    await q(() => document.querySelector('.lp-tarea .dp-check input').click()); await esperar(250);
    const r = await q(() => ({cuenta: document.querySelector('.dp-dia-cuenta').textContent.trim(), resumen: document.querySelectorAll('.lp-resumen .st-cel-v')[2].textContent.trim(), hechaPor: !!document.querySelector('.lp-hecha-por')}));
    assert.equal(r.cuenta, '1 / 3'); assert.equal(r.resumen, '1/3'); assert.ok(r.hechaPor);
    await q(() => setLimpiezaCalMode('semana')); await esperar(200);
    assert.equal(await q(() => document.querySelectorAll('.lp-semana-dia').length), 7);
    await q(() => setLimpiezaCalMode('mes')); await esperar(200);
    const mes = await q(() => ({selector: !!document.querySelector('.pe-sel'), dias: document.querySelectorAll('.cal-mes-dia').length, hoy: document.querySelectorAll('.cal-mes-dia.is-hoy').length}));
    assert.ok(mes.selector && mes.dias >= 28 && mes.hoy === 1, JSON.stringify(mes));
    await q(() => document.querySelector('.cal-mes-dia.is-hoy').click());
    assert.equal(await q(() => limpiezaCalMode), 'dia');
  });

  await caso(`La ventana de tarea mantiene sus campos y el diseño nuevo (${ancho}px)`, async () => {
    await q(() => openLimpiezaTareaMesModal(1)); await esperar(250);
    const r = await q(() => ({nuevo: document.getElementById('modal-box').classList.contains('ds-nuevo'), falta: ['new-limpieza-area','new-limpieza-producto','new-limpieza-tipo','new-limpieza-fecha','new-limpieza-diames','new-limpieza-responsable'].filter(i => !document.getElementById(i)),
      desborda: document.getElementById('modal-box').scrollWidth > document.getElementById('modal-box').clientWidth + 1}));
    assert.ok(r.nuevo && !r.desborda); assert.deepEqual(r.falta, []);
    await q(() => closeModal());
  });

  await caso(`Temperaturas: una tarjeta por equipo con su última lectura; pulsarla prepara el formulario (${ancho}px)`, async () => {
    await q(() => setLimpiezaTab('temperaturas')); await esperar(200);
    const r = await q(() => ({tarjetas: [...document.querySelectorAll('.lp-equipo')].map(c => ({n: c.querySelector('.lp-equipo-nom').textContent.trim(), nok: c.classList.contains('is-nok'), pend: !!c.querySelector('.lp-equipo-pend')}))}));
    assert.equal(r.tarjetas.length, 3, JSON.stringify(r));
    assert.ok(r.tarjetas.find(x => x.n === 'Congelador').nok); assert.ok(r.tarjetas.find(x => x.n === 'Barra').pend, 'Barra no se ha mirado hoy');
    await q(() => [...document.querySelectorAll('.lp-equipo')].find(c => /Barra/.test(c.textContent)).click());
    const f = await q(() => ({equipo: document.getElementById('lp-temperaturas-equipo').value, tipo: document.getElementById('lp-temperaturas-tipo').value}));
    assert.equal(f.equipo, 'Barra'); assert.equal(f.tipo, 'nevera');
  });

  await caso(`Anotar una lectura la calcula sola, actualiza la tarjeta y las cifras de arriba (${ancho}px)`, async () => {
    await q(() => { document.getElementById('lp-temperaturas-temp').value = '9'; document.getElementById('lp-temperaturas-hora').value = '10:00'; });
    await q(() => addLimpiezaLogEntry('temperaturas')); await esperar(300);
    const r = await q(() => ({ult: DB.limpieza.temperaturas.at(-1), nok: [...document.querySelectorAll('.lp-equipo.is-nok')].map(c => c.querySelector('.lp-equipo-nom').textContent.trim()), arriba: document.querySelectorAll('.lp-resumen .st-cel-v')[3].textContent.trim(), filas: document.querySelectorAll('.lp-tabla tbody tr').length}));
    assert.equal(r.ult.estado, 'NOK', '9 °C en una nevera está fuera de rango'); assert.ok(r.nok.includes('Barra') && r.nok.includes('Congelador'), JSON.stringify(r.nok));
    assert.equal(r.arriba, '3'); assert.equal(r.filas, 4);
  });

  await caso(`Plagas: el registro es una tabla de tarjetas con el aviso de revisión próxima (${ancho}px)`, async () => {
    await q(() => setLimpiezaTab('plagas')); await esperar(200);
    const r = await q(() => ({filas: document.querySelectorAll('.lp-tabla tbody tr').length, soon: !!document.querySelector('.lp-tabla .badge-amber'), acc: !!document.querySelector('.lp-tabla .mn-btn')}));
    assert.ok(r.filas === 1 && r.soon && r.acc, JSON.stringify(r));
  });

  await caso(`Alérgenos: buscar un plato y ver qué platos NO llevan un alérgeno (${ancho}px)`, async () => {
    await q(() => setLimpiezaTab('alergenos')); await esperar(200);
    assert.deepEqual(await q(() => [...document.querySelectorAll('.lp-card tbody tr td:first-child')].map(x => x.textContent.trim())), ['Natillas', 'Pan']);
    await q(() => lpAlergFiltro('sin', 'Gluten')); await esperar(150);
    assert.deepEqual(await q(() => [...document.querySelectorAll('.lp-card tbody tr td:first-child')].map(x => x.textContent.trim())), ['Natillas'], 'sin gluten: solo las natillas');
    await q(() => { lpAlergFiltro('sin', ''); lpAlergFiltro('q', 'pan'); }); await esperar(150);
    assert.deepEqual(await q(() => [...document.querySelectorAll('.lp-card tbody tr td:first-child')].map(x => x.textContent.trim())), ['Pan']);
    assert.ok(await q(() => !!document.querySelector('.lp-barra button[onclick="printAlergenos()"]')));
    await q(() => lpAlergFiltro('q', ''));
  });

  await caso(`Mantenimiento: una tarjeta por equipo, con vencido y próximo a vencer, editable en su sitio (${ancho}px)`, async () => {
    await q(() => setLimpiezaTab('mantenimiento')); await esperar(200);
    const r = await q(() => ({n: document.querySelectorAll('.lp-eq').length, vencido: document.querySelectorAll('.lp-eq.is-vencido').length, chips: [...document.querySelectorAll('.lp-eq .pr-chip')].map(c => c.textContent.trim().toLowerCase())}));
    assert.equal(r.n, 3); assert.equal(r.vencido, 1); assert.equal(r.chips.length, 2, JSON.stringify(r.chips));
    await q(() => { const i = document.getElementById('mt-r-2'); i.value = 'Técnico Paco'; i.dispatchEvent(new Event('change', {bubbles:true})); });
    assert.equal(await q(() => DB.limpieza.mantenimiento.find(e => e.id === 2).responsable), 'Técnico Paco');
    await q(() => addMantenimientoEquipo()); await esperar(250);
    assert.ok(await q(() => document.getElementById('modal-box').classList.contains('ds-nuevo')));
    await q(() => { document.getElementById('new-mantenimiento-equipo').value = 'Freidora'; confirmAddMantenimientoEquipo(); }); await esperar(250);
    assert.equal(await q(() => document.querySelectorAll('.lp-eq').length), 4);
  });

  await caso(`Un empleado sin edición anota temperaturas, pero no borra registros ni toca los pasos (${ancho}px)`, async () => {
    await q(() => { localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'employee', employeeId:1, area:'cocina', ts:Date.now()})); document.body.classList.remove('owner-session', 'edit-unlocked'); editUnlocked = false; setLimpiezaTab('temperaturas'); });
    await esperar(200);
    const r = await q(() => { const vis = e => !!e && e.getBoundingClientRect().width > 0;
      return {form: vis(document.querySelector('.lp-form-campos')), borrar: vis(document.querySelector('.lp-tabla .mn-btn')), anadirMant: vis(document.querySelector('.lp-barra .btn'))}; });
    assert.ok(r.form && !r.borrar, JSON.stringify(r));
    await q(() => setLimpiezaTab('protocolo')); await esperar(200);
    const p = await q(() => { const vis = e => !!e && e.getBoundingClientRect().width > 0; return {readonly: document.querySelector('.lp-paso-txt').readOnly, menu: vis(document.querySelector('.lp-paso .mn-btn')), anadir: vis(document.querySelector('.lp-anadir'))}; });
    assert.ok(p.readonly && !p.menu && !p.anadir, JSON.stringify(p));
  });

  await caso(`Ningún error de JavaScript (${ancho}px)`, async () => assert.deepEqual(page.erroresJs, []));
  await page.close();
}

for(const ancho of [320, 360, 390, 412, 430]){
  const page = await abrir(ancho);
  await caso(`Sin desbordes en Limpieza a ${ancho}px (las siete pestañas)`, async () => {
    const malos = [];
    for(const tab of TABS){
      const r = await page.evaluate((tab) => { setLimpiezaTab(tab); const m = [];
        document.querySelectorAll('.lp-card, .lp-paso, .lp-tarea, .lp-equipo, .lp-eq, .lp-resumen, .st-cel, .lp-form, .cal-mes-dia, .lp-semana-dia, .lp-tabla').forEach(e => { if(e.getBoundingClientRect().width > 0 && e.scrollWidth > e.clientWidth + 1) m.push(e.className); });
        return {m, pagina: document.documentElement.scrollWidth - window.innerWidth}; }, tab);
      if(r.m.length) malos.push(tab + ': ' + [...new Set(r.m)].join(',')); if(r.pagina > 0) malos.push(tab + ' se mueve de lado ' + r.pagina);
    }
    assert.deepEqual(malos, []);
  });
  await page.close();
}

await browser.close();
if(fallos){ console.log(`\n❌ ${fallos} casos fallaron`); process.exit(1); }
console.log('\n✅ Limpieza: todos los casos pasaron');
