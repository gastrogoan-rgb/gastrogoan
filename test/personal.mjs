// Personal (31/10): resumen, avisos que esperan decisión, tarjetas con rótulo en cada icono, editar/eliminar dentro del ⋯,
// formulario con colores y permisos, ficha y selector de horario con el diseño nuevo, y un empleado solo ve lo suyo.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox', '--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4'], protocolTimeout:30000});
let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}
const esperar = ms => new Promise(r => setTimeout(r, ms));

async function abrir(ancho, area = 'cocina'){
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
  }, 'PERSONAL01');
  await page.reload({waitUntil:'domcontentloaded'});
  await esperar(2200);
  await page.evaluate((area)=>{
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, name:'Bar de Pruebas'});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    const hace = n => { const d = new Date(Date.now() - n*86400000); return d.toISOString().slice(0,10); };
    DB.employees = [
      {id:1, name:'Marta Ruiz Casanovas', rol:'Jefa de cocina', color:'#2E86C1', phone:'612345678', email:'marta@ejemplo.com', area:'cocina', active:true, fechaAlta:hace(900), canUnlockEdit:true, vacationDaysPerYear:22},
      {id:2, name:'Hamid', rol:'Cocinero', color:'#E74C3C', phone:'', email:'', area:'cocina', active:true, fechaAlta:hace(40)},
      {id:3, name:'Lucía Fernández', rol:'Ayudante', color:'#27AE60', phone:'655443322', email:'', area:'cocina', active:false, fechaAlta:hace(300)},
      {id:4, name:'Pau Vidal', rol:'Camarero', color:'#8E44AD', area:'sala', active:true, fechaAlta:hace(100)}
    ];
    DB.fichajes = [{id:1, employeeId:2, entrada: new Date(Date.now() - 3*3600000).toISOString(), salida:null}];
    DB.turnos = [{id:11, employeeId:1, fecha:hace(-3), tipo:'M'}, {id:12, employeeId:2, fecha:hace(-3), tipo:'T'}];
    DB.turnoSwapRequests = [{id:21, fromEmployeeId:2, fromTurnoId:12, toEmployeeId:1, status:'pending_owner', createdAt:new Date().toISOString()}];
    DB.vacationRequests = [{id:31, employeeId:1, fromDate:hace(-20), toDate:hace(-26), status:'pending', createdAt:new Date().toISOString()}];
    DB.moodCheckins = [{id:41, employeeId:1, weekKey: currentWeekKey(), value:4, ts:new Date().toISOString()}];
    DB.chatMessages = []; DB.sales = [];
    applyOwnerSessionEditRights(); document.body.classList.add('owner-session'); areaUnlocked.cocina = areaUnlocked.sala = areaUnlocked.gestion = true;
    saveDB(); currentFolder = area; navigate('horarios'); setHorariosTab('personal');
  }, area);
  await esperar(500);
  return page;
}

for(const ancho of [1280, 360]){
  const page = await abrir(ancho);
  const q = (fn, ...a) => page.evaluate(fn, ...a);

  await caso(`El resumen cuenta la plantilla, quién trabaja ahora, lo que espera respuesta y el clima (${ancho}px)`, async () => {
    const r = await q(() => [...document.querySelectorAll('.pr-resumen .st-cel')].map(c => ({et: c.querySelector('.st-cel-et').textContent.trim(), v: c.querySelector('.st-cel-v').textContent.trim()})));
    assert.equal(r.length, 4, JSON.stringify(r));
    assert.equal(r[0].v, '2', 'activos de cocina: Marta y Hamid (Lucía está de baja)');
    assert.equal(r[1].v, '1', 'Hamid tiene el fichaje abierto');
    assert.equal(r[2].v, '2', 'un cambio de turno y unas vacaciones');
    assert.ok(/4\.0/.test(r[3].v), r[3].v);
  });

  await caso(`«Requiere tu atención» saca cada petición con sus botones de aceptar y rechazar (${ancho}px)`, async () => {
    const r = await q(() => ({filas: document.querySelectorAll('#pr-atencion .pr-aviso').length, botones: [...document.querySelectorAll('#pr-atencion .pr-aviso-bt .btn')].map(b => b.textContent.trim())}));
    assert.equal(r.filas, 2); assert.equal(r.botones.length, 4, JSON.stringify(r));
  });

  await caso(`Cada empleado es una tarjeta con avatar, rol, antigüedad y su estado (${ancho}px)`, async () => {
    const r = await q(() => [...document.querySelectorAll('.pr-card')].map(c => ({nom: c.querySelector('.pr-nom').textContent.trim(), ini: c.querySelector('.pr-av').textContent.trim(), chip: c.querySelector('.pr-chip').textContent.trim().toLowerCase(), baja: c.classList.contains('is-baja')})));
    assert.equal(r.length, 3, JSON.stringify(r));
    const marta = r.find(x => /Marta/.test(x.nom)), hamid = r.find(x => x.nom === 'Hamid'), lucia = r.find(x => /Lucía/.test(x.nom));
    assert.equal(marta.ini, 'MC', 'primera letra del nombre y del último apellido'); assert.equal(hamid.ini, 'H');
    assert.ok(/desde|since|des de/.test(hamid.chip), 'Hamid está trabajando: ' + hamid.chip);
    assert.ok(lucia.baja && /baja|inactiv/.test(lucia.chip), JSON.stringify(lucia));
  });

  await caso(`Cada icono lleva su rótulo y editar/eliminar están dentro del ⋯ (${ancho}px)`, async () => {
    const r = await q(() => {
      const c = [...document.querySelectorAll('.pr-card')].find(x => /Marta/.test(x.textContent));
      const botones = [...c.querySelectorAll('.pr-acc > *')].map(b => ({tip: b.dataset.tip || '', aria: b.getAttribute('aria-label') || '', titulo: b.getAttribute('title') || ''}));
      const menu = JSON.parse(c.querySelector('.pr-acc .mn-btn').dataset.acc).map(a => a.texto);
      return {botones, menu, sueltos: c.querySelectorAll('.pr-acc .ti-edit, .pr-acc .ti-trash').length};
    });
    assert.ok(r.botones.length >= 5, JSON.stringify(r.botones));
    assert.ok(r.botones.every(b => b.tip && b.aria === b.tip && !b.titulo), 'todos con rótulo propio y sin title nativo duplicado: ' + JSON.stringify(r.botones));
    assert.equal(r.sueltos, 0, 'ni lápiz ni papelera sueltos'); assert.equal(r.menu.length, 2, JSON.stringify(r.menu));
  });

  if(ancho > 600) await caso(`Al pasar el ratón por un icono sale su rótulo (${ancho}px)`, async () => {
    const caja = await q(() => { const b = [...document.querySelectorAll('.pr-card')].find(x => /Marta/.test(x.textContent)).querySelector('.pr-acc > button'); b.scrollIntoView({block:'center'}); const r = b.getBoundingClientRect(); return {x: r.x + r.width/2, y: r.y + r.height/2}; });
    await page.mouse.move(caja.x, caja.y); await esperar(200);
    const tip = await q(() => { const b = [...document.querySelectorAll('.pr-card')].find(x => /Marta/.test(x.textContent)).querySelector('.pr-acc > button'); const cs = getComputedStyle(b, '::after'); return {texto: cs.content, visible: cs.display !== 'none'}; });
    assert.ok(/Mensajes|Messages|Missatges/.test(tip.texto) && tip.visible, JSON.stringify(tip));
    await page.mouse.move(5, 5);
  });

  await caso(`Pulsar una tarjeta abre la ficha del empleado y los iconos NO la abren (${ancho}px)`, async () => {
    await q(() => document.querySelector('.pr-card .pr-nom').click()); await esperar(250);
    const ficha = await q(() => ({abre: !!document.querySelector('#modal-box .pr-ficha'), nuevo: document.getElementById('modal-box').classList.contains('ds-nuevo'), celdas: document.querySelectorAll('#modal-box .st-cel').length}));
    assert.ok(ficha.abre && ficha.nuevo && ficha.celdas >= 2, JSON.stringify(ficha));
    await q(() => closeModal());
    await q(() => document.querySelector('.pr-card .pr-acc > button').click()); await esperar(250);
    const dm = await q(() => ({chat: !!document.getElementById('dm-chat-messages'), ficha: !!document.querySelector('#modal-box .pr-ficha')}));
    assert.ok(dm.chat && !dm.ficha, JSON.stringify(dm));
    await q(() => closeModal());
  });

  await caso(`El formulario de empleado tiene secciones, colores seleccionables y los permisos como opciones (${ancho}px)`, async () => {
    await q(() => openEmployeeModal(1)); await esperar(250);
    const r = await q(() => ({
      secciones: document.querySelectorAll('#modal-box .pr-sec').length, sw: document.querySelectorAll('#modal-box .pr-sw').length,
      sel: document.querySelectorAll('#modal-box .pr-sw.is-sel').length, ids: ['emp-name','emp-rol','emp-color','emp-phone','emp-email','emp-vacation-days','emp-active','emp-can-edit'].filter(i => !document.getElementById(i)),
      nuevo: document.getElementById('modal-box').classList.contains('ds-nuevo'),
      desborda: document.getElementById('modal-box').scrollWidth > document.getElementById('modal-box').clientWidth + 1}));
    assert.ok(r.secciones >= 4 && r.sw >= 20 && r.sel === 1, JSON.stringify(r)); assert.deepEqual(r.ids, []); assert.ok(r.nuevo && !r.desborda, JSON.stringify(r));
    // Elegir un color lo marca y lo guarda en el campo de siempre.
    const c = await q(() => { const b = document.querySelectorAll('#modal-box .pr-sw')[3]; b.click(); return {campo: document.getElementById('emp-color').value.toLowerCase(), esperado: b.dataset.c.toLowerCase(), sel: document.querySelectorAll('#modal-box .pr-sw.is-sel').length}; });
    assert.equal(c.campo, c.esperado); assert.equal(c.sel, 1);
    await q(() => { document.getElementById('emp-rol').value = 'Jefa de cocina y compras'; saveEmployee(1); }); await esperar(250);
    const g = await q(() => ({rol: DB.employees.find(e => e.id === 1).rol, color: DB.employees.find(e => e.id === 1).color.toLowerCase()}));
    assert.equal(g.rol, 'Jefa de cocina y compras'); assert.equal(g.color, c.esperado);
  });

  await caso(`El selector de horario son tres opciones con el diseño nuevo (${ancho}px)`, async () => {
    await q(() => openEmployeeScheduleChooser(1)); await esperar(250);
    const r = await q(() => ({n: document.querySelectorAll('#modal-box .pr-eleccion').length, nuevo: document.getElementById('modal-box').classList.contains('ds-nuevo')}));
    assert.equal(r.n, 3); assert.ok(r.nuevo);
    await q(() => closeModal());
  });

  await caso(`Ventanas de Personal sin desbordes ni errores (${ancho}px)`, async () => {
    for(const fn of ['openPersonalLogModal()', 'openEmployeeModal()', 'openEmployeeFicharModal(2)', 'openHorarioFijoModal(1)', 'openBulkTurnoModal(1)']){
      await q(f => { closeModal(); eval(f); }, fn); await esperar(250);
      const r = await q(() => ({nuevo: document.getElementById('modal-box').classList.contains('ds-nuevo'), desborda: document.getElementById('modal-box').scrollWidth > document.getElementById('modal-box').clientWidth + 1}));
      assert.ok(r.nuevo, fn + ' sin ds-nuevo'); assert.ok(!r.desborda, fn + ' desborda');
    }
    await q(() => closeModal());
  });

  await caso(`Buscar mantiene el cursor y filtra por nombre o rol (${ancho}px)`, async () => {
    await page.click('.pr-barra .search-input');
    await page.keyboard.type('coc', {delay: 40}); await esperar(150);
    const r = await q(() => ({foco: document.activeElement && document.activeElement.classList.contains('search-input'), val: document.activeElement.value, n: document.querySelectorAll('.pr-card').length}));
    assert.ok(r.foco && r.val === 'coc', JSON.stringify(r)); assert.equal(r.n, 2, 'Marta (jefa de cocina) y... Hamid (cocinero)');
    await q(() => setPersonalSearch(''));
  });

  await caso(`Ningún error de JavaScript (${ancho}px)`, async () => assert.deepEqual(page.erroresJs, []));
  await page.close();
}

// Un empleado entra y solo ve SU tarjeta: ni resumen, ni petición ajena, ni las acciones de gestión.
{
  const page = await abrir(1280);
  await caso('Un empleado solo ve su propia tarjeta, sin resumen ni acciones de gestión', async () => {
    const r = await page.evaluate(() => {
      localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'employee', employeeId:2, area:'cocina', ts:Date.now()}));
      document.body.classList.remove('owner-session', 'edit-unlocked'); editUnlocked = false;
      renderHorariosPersonal();
      const vis = e => !!e && e.getBoundingClientRect().width > 0;
      const c = [...document.querySelectorAll('.pr-card')];
      return {n: c.length, nombre: c[0] && c[0].querySelector('.pr-nom').textContent.trim(), resumen: !!document.querySelector('.pr-resumen'), atencion: vis(document.getElementById('pr-atencion')),
        menu: vis(c[0] && c[0].querySelector('.mn-btn')), horario: vis(c[0] && c[0].querySelector('[data-tip*="orario"], [data-tip*="chedule"]')), busca: !!document.querySelector('.pr-barra')};
    });
    assert.equal(r.n, 1, JSON.stringify(r)); assert.equal(r.nombre, 'Hamid');
    assert.ok(!r.resumen && !r.atencion && !r.menu && !r.busca, JSON.stringify(r));
  });
  await page.close();
}

// Cinco anchos de móvil: nada se sale de la pantalla.
for(const ancho of [320, 360, 390, 412, 430]){
  const page = await abrir(ancho);
  await caso(`Sin desbordes en Personal a ${ancho}px`, async () => {
    const r = await page.evaluate(() => {
      const malos = [];
      document.querySelectorAll('.pr-card, .pr-resumen, .st-cel, .pr-aviso, .pr-barra').forEach(e => { if(e.scrollWidth > e.clientWidth + 1) malos.push(e.className); });
      return {malos, pagina: document.documentElement.scrollWidth - window.innerWidth};
    });
    assert.deepEqual(r.malos, []); assert.ok(r.pagina <= 0, 'la página se mueve de lado: ' + r.pagina);
  });
  await page.close();
}

await browser.close();
if(fallos){ console.log(`\n❌ ${fallos} casos fallaron`); process.exit(1); }
console.log('\n✅ Personal: todos los casos pasaron');
