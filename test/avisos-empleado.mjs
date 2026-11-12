// AVISOS AL EMPLEADO + MESAS A CARGO (12/11, pedido del dueño):
//  · la campana avisa al empleado de la respuesta a sus vacaciones y cambios de turno, y de los mensajes directos (dueño ↔ empleado);
//  · el rango de un camarero ya no es texto libre: se elige entre las mesas del plano (zona entera o mesas sueltas);
//  · «Mis mesas» del TPV incluye las asignadas; ver y ayudar en la mesa de un compañero NO se bloquea (solo se avisa de quién es).
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const w = ms => new Promise(r => setTimeout(r, ms));
const page = await browser.newPage(); await page.setViewport({width:1280,height:900});
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|raw.githubusercontent/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'}); await w(1800);
const d = await page.evaluate(async () => (await fetch('/dist/ggburger.json')).json());
d.vacationRequests = []; d.turnoSwapRequests = []; d.reservations = []; d.tpvOrders = []; d.purchaseOrders = []; d.clients = []; d.chatMessages = []; d.workDistribution = {};
d.employees = [{id: 101, name: 'María', area: 'sala', active: true, role: 'Camarero'}, {id: 102, name: 'Pedro', area: 'sala', active: true, role: 'Camarero'}];
d.tables = [1,2,3].map(i => ({id: 200 + i, name: 'Mesa ' + i, zona: 'Salón', plazas: 4})).concat([4,5].map(i => ({id: 200 + i, name: 'Mesa ' + i, zona: 'Terraza', plazas: 2})));
await page.evaluate(async d => {
  localStorage.clear();
  localStorage.setItem('gastrogoan_owner_login','1'); localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
  if(d.license) localStorage.setItem('gastrogoan_license_v1', JSON.stringify(d.license));
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts: Date.now()}));
  await idbSet('gastrogoan_data_v1', d);
}, d);
await page.goto('about:blank'); await page.goto('http://localhost:8950/dist/index.html#home', {waitUntil:'domcontentloaded'}); await w(4500);
const filas = () => page.evaluate(() => { avisosRenderPanel(); return [...document.querySelectorAll('#avisos-cuerpo .av-fila')].map(f => f.innerText.replace(/\s+/g, ' ').trim()); });
const abrir = async () => { if(!(await page.evaluate(() => avisosPanelAbierto()))) await page.evaluate(() => toggleAvisosPanel()); await w(150); };
const comoEmpleado = id => page.evaluate(id => { window.isOwnerSession = () => false; window.getAccessSession = () => ({type: 'employee', area: 'sala', employeeId: id, ts: Date.now()}); window.loggedInEmployeeId = () => id; }, id);
const comoDueno = () => page.evaluate(() => { window.isOwnerSession = () => true; window.getAccessSession = () => ({type: 'owner', ts: Date.now()}); window.loggedInEmployeeId = () => null; });
const ahora = () => new Date().toISOString();

await caso('María ve la respuesta a sus vacaciones: aprobadas y rechazadas; las de hace 20 días no; «Visto» la quita', async () => {
  await comoEmpleado(101);
  await page.evaluate(() => { DB.vacationRequests.push({id: 1, employeeId: 101, fromDate: '2026-12-01', toDate: '2026-12-05', status: 'approved', decidedAt: new Date().toISOString()}, {id: 2, employeeId: 101, fromDate: '2027-01-10', toDate: '2027-01-12', status: 'rejected', decidedAt: new Date().toISOString()}, {id: 3, employeeId: 101, fromDate: '2026-10-01', toDate: '2026-10-02', status: 'approved', decidedAt: new Date(Date.now() - 20 * 86400000).toISOString()}, {id: 4, employeeId: 102, fromDate: '2026-12-01', toDate: '2026-12-05', status: 'approved', decidedAt: new Date().toISOString()}); });
  await abrir(); const f = await filas();
  assert.ok(f.some(x => /2026-12-01.*aprobadas/.test(x)), JSON.stringify(f)); assert.ok(f.some(x => /2027-01-10.*rechazadas/.test(x)));
  assert.ok(!f.some(x => /2026-10-01/.test(x)), 'sale una decisión de hace 20 días'); assert.equal(f.filter(x => /vacaciones/i.test(x)).length, 2, 'salen las vacaciones de otro compañero');
  await page.evaluate(() => [...document.querySelectorAll('#avisos-cuerpo .av-fila')].find(r => /2026-12-01/.test(r.innerText)).querySelector('button:last-child').click()); await w(300);
  assert.ok(!(await filas()).some(x => /2026-12-01/.test(x)), 'Visto no la quita');
});
await caso('Aprobar desde la campana del dueño deja la fecha de decisión (de ahí sale el aviso al empleado)', async () => {
  await comoDueno();
  await page.evaluate(() => { DB.vacationRequests.push({id: 5, employeeId: 101, fromDate: '2026-12-20', toDate: '2026-12-22', status: 'pending', createdAt: new Date().toISOString()}); ownerRespondVacationRequest(5, true); });
  const r = await page.evaluate(() => DB.vacationRequests.find(x => x.id === 5)); assert.equal(r.status, 'approved'); assert.ok(r.decidedAt, 'sin decidedAt');
  await comoEmpleado(101); await abrir(); assert.ok((await filas()).some(x => /2026-12-20.*aprobadas/.test(x)));
});
await caso('Cambio de turno decidido: le sale al que lo pidió', async () => {
  await page.evaluate(() => { DB.turnoSwapRequests.push({id: 9, fromEmployeeId: 101, fromTurnoId: 1, toEmployeeId: 102, status: 'rejected', decidedAt: new Date().toISOString()}); });
  await abrir(); assert.ok((await filas()).some(x => /cambio de turno.*rechazado/i.test(x)));
});
await caso('Mensajes directos: al dueño le sale quién le ha escrito; al abrirlo, desaparece', async () => {
  await comoDueno();
  await page.evaluate(() => { DB.chatMessages.push({id: 31, channel: 'dm:101', authorId: 101, authorName: 'María', text: 'Jefe, ¿puedo salir antes?', ts: new Date().toISOString()}); saveDB(); });
  await w(700); await abrir(); const f = await filas(); assert.ok(f.some(x => /María.*te ha escrito/.test(x)), JSON.stringify(f));
  await page.evaluate(() => [...document.querySelectorAll('#avisos-cuerpo .av-fila')].find(r => /te ha escrito/.test(r.innerText)).querySelector('button').click()); await w(500);
  assert.ok(await page.evaluate(() => !!document.getElementById('dm-chat-messages')), 'no abre el chat');
  await page.evaluate(() => closeModal()); await w(300); await abrir(); await page.evaluate(() => avisosRenderPanel());
  assert.ok(!(await filas()).some(x => /te ha escrito/.test(x)), 'el aviso no se quita al leerlo');
});
await caso('Y al empleado le sale «El jefe te ha escrito»', async () => {
  await page.evaluate(() => { DB.chatMessages.push({id: 32, channel: 'dm:101', authorId: 'owner', authorName: 'Jefe', text: 'Sí, a las 23:00', ts: new Date(Date.now() + 1000).toISOString()}); });
  await comoEmpleado(101); await abrir(); assert.ok((await filas()).some(x => /El jefe te ha escrito/.test(x)));
});
await caso('Mesas a cargo: el selector muestra las zonas y sus mesas; la zona entera y mesas sueltas', async () => {
  await comoDueno();
  await page.evaluate(() => { currentFolder = 'sala'; navigate('distribucion'); }); await w(500);
  await page.evaluate(() => { distCurrentEmployeeId = 101; openDistCargo(101); }); await w(500);
  const ui = await page.evaluate(() => ({zonas: document.querySelectorAll('#dp-cargo-modal .dp-mesas-zona').length, mesas: document.querySelectorAll('#dp-cargo-modal .dp-mesas-zona .dp-chip').length, input: !!document.getElementById('dist-rango-input')}));
  assert.equal(ui.zonas, 2); assert.equal(ui.mesas, 5); assert.equal(ui.input, false, 'sigue el campo de texto libre');
  await page.evaluate(() => [...document.querySelectorAll('#dp-cargo-modal .dp-mesas-zona')][0].querySelector('.es-tit button').click()); await w(400);
  assert.deepEqual(await page.evaluate(() => DB.workDistribution[101].mesas.map(Number).sort()), [201, 202, 203]);
  await page.evaluate(() => [...document.querySelectorAll('#dp-cargo-modal .dp-chip')].find(c => /Mesa 4/.test(c.textContent)).click()); await w(400);
  assert.deepEqual(await page.evaluate(() => distRangoLabels(DB.workDistribution[101])), ['Salón (toda)', 'Terraza: Mesa 4']);
  await page.evaluate(() => [...document.querySelectorAll('#dp-cargo-modal .dp-chip')].find(c => /Mesa 1/.test(c.textContent)).click()); await w(400);
  assert.deepEqual(await page.evaluate(() => distRangoLabels(DB.workDistribution[101])), ['Salón: Mesa 2, Mesa 3', 'Terraza: Mesa 4']);
  await page.evaluate(() => closeModal());
});
await caso('Dar una mesa que ya lleva otro avisa «también Pedro» y se puede repartir igualmente', async () => {
  await page.evaluate(() => { DB.workDistribution[102] = {platos: [], produccion: {}, doneDates: {}, tareasUnicas: {}, rangos: [], elabs: [], mesas: [202]}; openDistCargo(101); }); await w(400);
  const txt = await page.evaluate(() => [...document.querySelectorAll('#dp-cargo-modal .dp-chip')].find(c => /Mesa 2/.test(c.textContent)).textContent);
  assert.match(txt, /también Pedro/); await page.evaluate(() => closeModal());
});
await caso('TPV: «Mis mesas» de María = las asignadas (aunque estén libres) + las que lleva; arranca en «Mis mesas»', async () => {
  await comoEmpleado(101);
  await page.evaluate(() => { currentFolder = 'sala'; DB.tpvOrders.push({id: 5001, tableId: 205, tipo: 'mesa', pax: 2, status: 'abierta', items: [], tandas: [], camareroId: 102, createdAt: new Date().toISOString(), date: todayStr()}); tpvFiltroInicialAplicado = false; tpvMesaFiltro = 'todas'; navigate('tpv'); }); await w(900);
  const r = await page.evaluate(() => ({filtro: tpvMesaFiltro, mias: DB.tables.filter(tb => tpvEsMiaLaMesa(tb, tpvEstadoMesa(tb))).map(tb => tb.id).sort(), visibles: document.querySelectorAll('#tpv-mesas-section .tp-mesa').length}));
  assert.equal(r.filtro, 'mias'); assert.deepEqual(r.mias, [202, 203, 204]); assert.equal(r.visibles, 3, 'enseña ' + r.visibles);
  await page.evaluate(() => setTpvMesaFiltro('todas')); await w(300);
  assert.equal(await page.evaluate(() => document.querySelectorAll('#tpv-mesas-section .tp-mesa').length), 5, '«Todas» no enseña todas las mesas');
});
await caso('Ver y ayudar en la mesa de un compañero NO se bloquea; solo avisa de quién es', async () => {
  await page.evaluate(() => { window.__avisos = []; const orig = showToast; window.showToast = function(m){ window.__avisos.push(String(m)); return orig.apply(this, arguments); }; openTableOrder(205); }); await w(500);
  assert.ok(await page.evaluate(() => !!document.getElementById('table-order-modal-marker')), 'la mesa de un compañero no se abre');
  const aviso = await page.evaluate(() => window.__avisos.join(' | '));
  assert.match(aviso, /Pedro/, 'no avisa de quién lleva la mesa: ' + aviso);
});
await caso('Sin errores de página', async () => { assert.deepEqual(errs, []); });
await browser.close();
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ todos los casos pasaron');
process.exit(fallos ? 1 : 0);
