// Reservas con el diseño nuevo (1/11): cifras del día, cada reserva con su acción principal, menú ⋯, Semana y Mes con el
// diseño de Promoción, búsqueda, hoja del día para imprimir, solicitudes y recordatorios en filas compactas, y el WhatsApp
// con prefijo de país (los recordatorios abrían «wa.me/612345678», que no abre ningún chat).
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox'], protocolTimeout:90000});
let fallos = 0;
async function caso(nombre, fn){
  try{ const d = await fn(); console.log('✅ ' + nombre + (d ? '  → ' + d : '')); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}
const esperar = ms => new Promise(r => setTimeout(r, ms));
const page = await browser.newPage();
await page.setViewport({width:1280, height:900});
const errores = []; page.on('pageerror', e => errores.push(e.message));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(code => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
}, 'RESERVAS0001');
await page.reload({waitUntil:'domcontentloaded'}); await esperar(2200);
async function sembrar(){
  await page.evaluate(() => {
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, name:'Bar Marina', aforo:'40'});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    applyOwnerSessionEditRights(); document.body.classList.add('owner-session'); areaUnlocked.cocina = areaUnlocked.sala = areaUnlocked.gestion = true;
    const hoy = todayStr(); const d = n => { const x = new Date(); x.setDate(x.getDate() + n); return dateStr(x); };
    DB.tables = [{id:1, name:'Mesa 1', plazas:4}, {id:2, name:'Mesa 2', plazas:6}];
    DB.clients = [{id:1, name:'María López', phone:'612345678', allergies:'Celíaca'}, {id:2, name:'Juan Pérez', phone:'912345678'}];
    DB.reservations = [
      {id:1, clientId:1, date:hoy, time:'13:30', people:4, status:'confirmada', tableId:1, notes:'Cumpleaños, tarta a las 15 h'},
      {id:2, clientId:2, date:hoy, time:'14:00', people:2, status:'completada', llegada:true, tableId:2},
      {id:3, clientName:'Ana Web', clientPhone:'655555555', date:hoy, time:'21:00', people:6, status:'pendiente', createdAt:new Date(Date.now() - 3600000).toISOString(), depositRequired:true, depositAmount:30, publicToken:'tok-abcdef-123456789'},
      {id:4, clientName:'Pedro Baja', date:hoy, time:'21:30', people:3, status:'cancelada'},
      {id:5, clientId:1, date:d(1), time:'20:00', people:5, status:'confirmada'},
      {id:6, clientId:2, date:d(3), time:'14:00', people:8, status:'confirmada'},
    ];
    document.getElementById('reservas-search-input').value = '';
    window.confirmModal = async () => true;
    currentFolder = 'sala';
  });
}
await sembrar();
const ir = async (tab, fecha) => { await page.evaluate((tab, fecha) => { currentFolder = 'sala'; reservasTab = tab; reservasFiltro = ''; reservasDate = fecha || todayStr(); navigate('reservas'); renderReservas(); }, tab, fecha); await esperar(300); };
const q = (fn, ...a) => page.evaluate(fn, ...a);

await caso('Pestañas con el diseño nuevo y buscador; sin la fila de pestañas vieja', async () => {
  await ir('dia');
  const r = await q(() => ({tabs: document.querySelectorAll('#reservas-tabs-row .btn-fino').length, on: document.getElementById('reservas-tab-dia').classList.contains('is-on'), vieja: !!document.querySelector('#view-reservas .ge-tab'), buscador: !!document.querySelector('#reservas-search-input.search-input')}));
  assert.deepEqual(r, {tabs: 3, on: true, vieja: false, buscador: true});
});

await caso('Día: cuatro cifras que cuadran (ocupan sitio solo pendientes, confirmadas y llegadas)', async () => {
  const r = await q(() => [...document.querySelectorAll('#reservas-tab-content .st-cel')].map(c => [c.querySelector('.st-cel-et').textContent.trim().toLowerCase(), c.querySelector('.st-cel-v').textContent.trim(), (c.querySelector('.st-cel-s') || {}).textContent]));
  assert.equal(r.length, 4);
  assert.deepEqual(r.map(x => x[1]), ['3', '12', '1 / 3', '1']);
  assert.ok(/sin mesa/i.test(r[0][2]), 'avisa de la reserva sin mesa: ' + r[0][2]);
});

await caso('Cada reserva lleva su acción principal a la vista y el resto en el menú ⋯', async () => {
  const r = await q(() => [...document.querySelectorAll('#reservas-tab-content .rv-fila')].map(f => ({
    hora: f.querySelector('.rv-hora').textContent, principal: [...f.querySelectorAll('.rv-acc > .btn:not(.mn-btn)')].map(b => b.innerText.trim()).join('|'),
    menu: f.querySelector('[aria-haspopup="menu"]') ? JSON.parse(f.querySelector('[aria-haspopup="menu"]').dataset.acc).map(a => a.texto) : [], tel: !!f.querySelector('a[href^="https://wa.me/"]'), href: (f.querySelector('a[href^="https://wa.me/"]') || {}).href || '' })));
  assert.equal(r.length, 4);
  assert.match(r[0].principal, /llegado/i); assert.equal(r[0].hora, '13:30'); assert.ok(r[0].menu.length >= 3, r[0].menu.join(','));
  assert.equal(r[0].href, 'https://wa.me/34612345678'); assert.ok(!r[1].tel, 'un fijo no abre WhatsApp');
  assert.match(r[2].principal, /confirmar/i); assert.equal(r[3].principal, '');
  assert.ok(await q(() => !document.querySelector('#reservas-tab-content .btn-icon')), 'quedan botones sueltos de editar/cancelar');
});

await caso('Filtros con su cuenta: por confirmar, confirmadas, han llegado, canceladas', async () => {
  const r = await q(() => {
    const cuenta = k => { const b = [...document.querySelectorAll('#reservas-tab-content .cl-chips .btn')].find(x => x.innerText.toLowerCase().startsWith(k)); return b ? parseInt(b.querySelector('b').textContent) : null; };
    const base = {todas: cuenta('todas'), conf: cuenta('por confirmar'), cfm: cuenta('confirmadas'), lleg: cuenta('han llegado'), baja: cuenta('canceladas')};
    setReservasFiltro('baja'); const soloBaja = [...document.querySelectorAll('.rv-fila')].map(f => f.querySelector('.rv-nombre b').textContent);
    setReservasFiltro('');
    return {base, soloBaja};
  });
  assert.deepEqual(r.base, {todas: 4, conf: 1, cfm: 1, lleg: 1, baja: 1}); assert.deepEqual(r.soloBaja, ['Pedro Baja']);
});

await caso('Confirmar una pendiente y marcar la llegada (pregunta la mesa) funcionan desde la fila', async () => {
  const r = await q(async () => {
    await setReservationStatus(3, 'confirmada');                                    // sin mesa: no confirma, abre la reserva para asignarla
    const sinMesa = {estado: DB.reservations.find(x => x.id === 3).status, abre: /reserva/i.test(document.getElementById('modal-box').innerText)};
    closeModal(); DB.reservations.find(x => x.id === 3).tableId = 1;
    await setReservationStatus(3, 'confirmada');
    const conf = DB.reservations.find(x => x.id === 3).status;
    toggleReservaLlegada(1); await new Promise(r => setTimeout(r, 150));
    const pregunta = !!document.getElementById('reserva-arrival-table-sel');
    document.getElementById('reserva-arrival-table-sel').value = '2'; confirmReservaArrival(1); await new Promise(r => setTimeout(r, 150));
    const a = DB.reservations.find(x => x.id === 1);
    const marcada = document.querySelector('.rv-fila.es-llegada .rv-hora') ? [...document.querySelectorAll('.rv-fila.es-llegada .rv-hora')].map(x => x.textContent) : [];
    const llegada = !!a.llegada, mesa = a.tableId;
    toggleReservaLlegada(1);
    return {sinMesa, conf, pregunta, llegada, mesa, marcada, despues: !!DB.reservations.find(x => x.id === 1).llegada};
  });
  assert.deepEqual(r.sinMesa, {estado: 'pendiente', abre: true}); assert.equal(r.conf, 'confirmada'); assert.ok(r.pregunta, 'no pregunta en qué mesa se sienta'); assert.ok(r.llegada); assert.equal(r.mesa, 2); assert.ok(r.marcada.includes('13:30'), 'la fila no se marca'); assert.ok(!r.despues, 'desmarcar no funciona');
  await sembrar();
});

await caso('No presentado y deshacer: suma y resta el aviso al cliente', async () => {
  const r = await q(async () => {
    await markReservationNoShow(1);
    const c = DB.clients.find(x => x.id === 1); const tras = {estado: DB.reservations.find(x => x.id === 1).status, noShows: c.noShows};
    undoReservationNoShow(1);
    return {tras, deshecho: {estado: DB.reservations.find(x => x.id === 1).status, noShows: c.noShows}};
  });
  assert.deepEqual(r.tras, {estado: 'no_show', noShows: 1}); assert.deepEqual(r.deshecho, {estado: 'confirmada', noShows: 0});
});

await caso('Solicitudes de la web y recordatorios de mañana: filas compactas con sus botones', async () => {
  await sembrar(); await ir('dia');
  const r = await q(() => ({
    solic: document.querySelectorAll('#reservas-pending-online .rv-solic').length, botones: [...document.querySelectorAll('#reservas-pending-online .rv-acc .btn')].map(b => b.innerText.trim()),
    chips: document.querySelector('#reservas-pending-online .pm-ets').innerText.replace(/\s+/g, ' '),
    recordatorios: document.querySelectorAll('#reservas-reminders-due .rv-solic').length,
    altura: document.getElementById('reservas-pending-online').getBoundingClientRect().height,
  }));
  assert.equal(r.solic, 1); assert.equal(r.recordatorios, 1); assert.ok(r.altura < 200, 'la solicitud ocupa demasiado: ' + r.altura);
  assert.ok(r.botones.some(b => /señal/i.test(b)) && r.botones.some(b => /confirmar/i.test(b)) && r.botones.some(b => /rechazar/i.test(b)), r.botones.join('|'));
  assert.match(r.chips, /655555555/);
});

await caso('Semana: siete días con sus reservas, hoy marcado, cifras y alta desde el día', async () => {
  await ir('semana');
  const r = await q(() => ({dias: document.querySelectorAll('.pm-sem-dia').length, hoy: document.querySelectorAll('.pm-sem-dia.is-hoy').length, chips: document.querySelectorAll('.rv-chip').length, cifras: [...document.querySelectorAll('#reservas-tab-content .st-cel-v')].map(x => x.textContent.trim()), mas: document.querySelectorAll('.pm-mas').length}));
  assert.equal(r.dias, 7); assert.equal(r.hoy, 1); assert.ok(r.chips >= 3); assert.equal(r.mas, 7);
  await q(() => document.querySelector('.rv-chip').click()); await esperar(250);
  assert.ok(await q(() => !!document.getElementById('modal-box').innerText.length && /reserva/i.test(document.getElementById('modal-box').innerText)), 'el chip no abre la reserva');
  await q(() => closeModal());
});

await caso('Mes: cuadrícula, selector de periodo con datos, resumen y salto al día', async () => {
  await ir('mes');
  const r = await q(() => ({dias: document.querySelectorAll('.pm-mes-dia').length, sel: !!document.querySelector('.pe-sel'), cifras: document.querySelectorAll('#reservas-tab-content .st-cel').length, tiene: document.querySelectorAll('.pm-mes-dia.tiene').length}));
  assert.ok(r.dias >= 28 && r.sel && r.cifras === 3 && r.tiene >= 1, JSON.stringify(r));
  await q(() => reservasMesCb(2027, 0)); await esperar(150);
  assert.ok(/2027/.test(await q(() => document.querySelector('.pe-actual').innerText)));
  await q(() => { reservasMes = null; renderReservasMes(); document.querySelector('.pm-mes-dia.tiene').click(); }); await esperar(250);
  assert.ok(await q(() => document.getElementById('reservas-tab-dia').classList.contains('is-on')), 'pulsar un día no lleva a Día');
});

await caso('Buscar por nombre, teléfono o código; los resultados abren la reserva; vaciar vuelve al día', async () => {
  await ir('dia');
  const r = await q(() => {
    const s = document.getElementById('reservas-search-input'); const filas = () => document.querySelectorAll('#reservas-search-results .cl-ev').length;
    s.value = 'lópez'; renderReservasSearch(); const nombre = filas();
    s.value = '655555'; renderReservasSearch(); const tel = filas();
    s.value = codigoCortoPublico('tok-abcdef-123456789'); renderReservasSearch(); const codigo = filas();
    const ocultas = document.getElementById('reservas-tab-content').style.display === 'none';
    s.value = 'zzzz'; renderReservasSearch(); const vacio = !!document.querySelector('#reservas-search-results .es-vacio');
    s.value = ''; renderReservasSearch(); const vuelve = document.getElementById('reservas-tab-content').style.display !== 'none';
    return {nombre, tel, codigo, ocultas, vacio, vuelve};
  });
  assert.deepEqual(r, {nombre: 2, tel: 1, codigo: 1, ocultas: true, vacio: true, vuelve: true});
});

await caso('Imprimir el día: hoja con las reservas que ocupan sitio, mesa, teléfono y casilla de llegada', async () => {
  await ir('dia');
  const html = await q(() => { let h = ''; const o = window.open; window.open = () => ({document: {write: x => { h += x; }, close(){}}, focus(){}, print(){}}); rvImprimirDia(todayStr()); window.open = o; return h; });
  assert.ok(/María López/.test(html) && /Mesa 1/.test(html) && /612345678/.test(html) && /☐/.test(html), 'falta contenido en la hoja');
  assert.ok(!/Pedro Baja/.test(html), 'la cancelada no debe salir en la hoja de sala');
});

await caso('El recordatorio y el aviso por WhatsApp llevan prefijo de país; un fijo no abre nada', async () => {
  const r = await q(() => {
    const abiertas = []; const o = window.open; window.open = u => { abiertas.push(u); return null; };
    openReservationReminderModal(1); sendReservationReminderWhatsapp(1);
    const fijo = (() => { openReservationReminderModal(6); const n = abiertas.length; sendReservationReminderWhatsapp(6); return abiertas.length === n; })();
    window.open = o; closeModal();
    return {url: abiertas[0], fijo};
  });
  assert.ok(/^https:\/\/wa\.me\/34612345678\?text=/.test(r.url), r.url); assert.ok(r.fijo, 'un teléfono fijo abrió WhatsApp');
});

await caso('Tres idiomas: día, semana, mes y búsqueda sin claves sueltas', async () => {
  const pg = await browser.newPage();
  await pg.setViewport({width:1280, height:900});
  await pg.setRequestInterception(true);
  pg.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
  const textos = {};
  for(const lang of ['es', 'ca', 'en']){
    await pg.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
    await pg.evaluate((code, lang) => {
      localStorage.setItem(LANG_LS, lang);
      localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
      localStorage.setItem('gastrogoan_owner_login','1'); localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()})); localStorage.setItem('gastrogoan_owner_pass_prompted','1');
    }, 'RESERVAS0001', lang);
    await pg.reload({waitUntil:'domcontentloaded'}); await esperar(2000);
    textos[lang] = await pg.evaluate(async () => {
      ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
      Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, name:'Bar Marina', aforo:'40'});
      DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
      applyOwnerSessionEditRights(); areaUnlocked.cocina = areaUnlocked.sala = areaUnlocked.gestion = true;
      const hoy = todayStr(); const manana = dateStr(new Date(Date.now() + 86400000));
      DB.clients = [{id:1, name:'María López', phone:'612345678'}];
      DB.reservations = [{id:1, clientId:1, date:hoy, time:'13:30', people:4, status:'confirmada', notes:'Nota'}, {id:2, clientName:'Web', clientPhone:'655555555', date:hoy, time:'21:00', people:2, status:'pendiente', createdAt: new Date().toISOString()}, {id:3, clientId:1, date:manana, time:'20:00', people:2, status:'confirmada'}];
      currentFolder = 'sala'; const out = [];
      for(const tab of ['dia', 'semana', 'mes']){ reservasTab = tab; navigate('reservas'); renderReservas(); await new Promise(r => setTimeout(r, 150)); out.push(document.getElementById('view-reservas').innerText); }
      reservasTab = 'dia'; document.getElementById('reservas-search-input').value = 'lópez'; renderReservas(); await new Promise(r => setTimeout(r, 100)); out.push(document.getElementById('view-reservas').innerText);
      document.getElementById('reservas-search-input').value = '';
      return out.join('\n');
    });
  }
  await pg.close();
  for(const lang of ['es', 'ca', 'en']) assert.ok(!/undefined|\bnull\b|\[object|NaN/.test(textos[lang]), `${lang}: ` + textos[lang].match(/.{20}(undefined|\bnull\b|\[object|NaN).{20}/)?.[0]);
  assert.ok(/Han llegado/i.test(textos.es) && /Han arribat/i.test(textos.ca) && /Arrived/i.test(textos.en), 'no cambia de idioma');
});

await caso('Sin desbordes de ancho en cinco anchos de móvil (día, semana, mes, búsqueda)', async () => {
  const malos = [];
  for(const w of [320, 360, 390, 412, 430]){
    await page.setViewport({width:w, height:800}); await esperar(150);
    for(const tab of ['dia', 'semana', 'mes']){
      await ir(tab);
      const o = await q(() => ({sw: document.documentElement.scrollWidth, iw: window.innerWidth}));
      if(o.sw > o.iw + 1) malos.push(`${tab}@${w}: ${o.sw}>${o.iw}`);
    }
    await q(() => { reservasTab = 'dia'; const s = document.getElementById('reservas-search-input'); s.value = 'a'; renderReservas(); }); await esperar(150);
    const o = await q(() => ({sw: document.documentElement.scrollWidth, iw: window.innerWidth})); if(o.sw > o.iw + 1) malos.push(`busqueda@${w}`);
    await q(() => { document.getElementById('reservas-search-input').value = ''; renderReservas(); });
  }
  await page.setViewport({width:1280, height:900});
  assert.deepEqual(malos, [], malos.join(' · '));
});

await caso('Sin errores de JavaScript', async () => { assert.deepEqual(errores, [], errores.join(' | ')); });
await browser.close();
console.log(fallos ? `\n❌ ${fallos} fallo(s)` : '\n✅ todos los casos de Reservas pasaron');
process.exit(fallos ? 1 : 0);
