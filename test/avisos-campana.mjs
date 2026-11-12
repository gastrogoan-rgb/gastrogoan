// AVISOS (campana de la cabecera, 12/11, pedido del dueño): todo lo que pide atención —vacaciones y cambios de turno por aprobar, reservas y
// pedidos de la web por confirmar, subidas de precio…— sale en una campana SIN entrar al Panel, con botones para resolverlo en el sitio.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
let fallos = 0; let base = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const w = ms => new Promise(r => setTimeout(r, ms));
async function arrancar(ancho){
  const page = await browser.newPage(); await page.setViewport({width:ancho,height:800});
  page.errs = []; page.on('pageerror', e => page.errs.push(e.message));
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|raw.githubusercontent/.test(r.url()) ? r.abort() : r.continue());
  await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'}); await w(1800);
  const d = await page.evaluate(async () => (await fetch('/dist/ggburger.json')).json());
  d.vacationRequests = []; d.turnoSwapRequests = []; d.reservations = []; d.tpvOrders = []; d.purchaseOrders = []; d.clients = [];
  d.preciosHistorial = []; d.unmatchedOnlinePayments = [];
  await page.evaluate(async d => {
    localStorage.clear();
    localStorage.setItem('gastrogoan_owner_login','1'); localStorage.setItem('gastrogoan_owner_pass_prompted','1');
    localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
    if(d.license) localStorage.setItem('gastrogoan_license_v1', JSON.stringify(d.license));
    localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts: Date.now()}));
    await idbSet('gastrogoan_data_v1', d);
  }, d);
  await page.goto('about:blank'); await page.goto('http://localhost:8950/dist/index.html#home', {waitUntil:'domcontentloaded'}); await w(4500);
  return page;
}
const badge = p => p.evaluate(() => { const b = document.getElementById('avisos-badge'); return b && getComputedStyle(b).display !== 'none' ? b.textContent : ''; });
const filas = p => p.evaluate(() => [...document.querySelectorAll('#avisos-cuerpo .av-fila')].map(f => f.innerText.replace(/\s+/g, ' ').trim()));
const abrir = async p => { if(!(await p.evaluate(() => avisosPanelAbierto()))) await p.evaluate(() => toggleAvisosPanel()); await w(200); };

const page = await arrancar(1280);
await caso('Sin nada pendiente: sin número y el panel dice «Todo al día»', async () => {
  await page.evaluate(() => { window.__avisosReal = avisosDeLaApp; window.avisosDeLaApp = () => []; avisosPintar(); });
  await w(300);
  assert.equal(await badge(page), '');
  await abrir(page);
  assert.match(await page.evaluate(() => document.getElementById('avisos-cuerpo').innerText), /Todo al día/);
  await page.evaluate(() => { window.avisosDeLaApp = window.__avisosReal; });
  // El negocio de prueba trae de serie 3 avisos reales (plagas, facturas vencidas, cierre de caja): de ahí se cuenta.
  await page.evaluate(() => avisosPintar()); await w(300);
  base = Number(await badge(page)) || 0; assert.equal(base, 3, 'la línea base cambió: ' + base);
});
await caso('Un empleado pide vacaciones: la campana se enciende y el aviso lo nombra, con Aceptar y Rechazar', async () => {
  await page.evaluate(() => { const e = DB.employees[0]; DB.vacationRequests.push({id: 777001, employeeId: e.id, fromDate: '2026-12-10', toDate: '2026-12-14', notes: '', status: 'pending', createdAt: new Date().toISOString()}); saveDB(); });
  await w(900);
  assert.equal(await badge(page), String(base + 1));
  const f = await filas(page); assert.equal(f.length, base + 1); assert.match(f[0], /2026-12-10/); assert.match(f[0], /Aceptar/); assert.match(f[0], /Rechazar/);
  assert.equal(await page.evaluate(() => document.getElementById('avisos-fab').classList.contains('avisos-con')), true);
});
await caso('Aceptar desde la campana aprueba las vacaciones y el aviso desaparece', async () => {
  await page.evaluate(() => [...document.querySelectorAll('#avisos-cuerpo .av-fila button')].find(b => b.textContent.trim() === 'Aceptar').click());
  await w(1000);
  assert.equal(await page.evaluate(() => DB.vacationRequests.find(r => r.id === 777001).status), 'approved');
  assert.equal(await badge(page), String(base)); assert.equal((await filas(page)).length, base);
});
await caso('Un cambio de turno por aprobar también sale', async () => {
  await page.evaluate(() => { const [a, b] = DB.employees; const tu = (DB.turnos || [])[0]; DB.turnoSwapRequests.push({id: 777002, fromEmployeeId: a.id, fromTurnoId: tu ? tu.id : 1, toEmployeeId: b.id, status: 'pending_owner', createdAt: new Date().toISOString()}); saveDB(); });
  await w(900); assert.equal(await badge(page), String(base + 1));
  assert.match((await filas(page))[0], /Aceptar/);
  await page.evaluate(() => { DB.turnoSwapRequests = []; saveDB(); }); await w(900);
});
await caso('Una reserva por confirmar sale con «Ver», que lleva a Reservas', async () => {
  await page.evaluate(() => { const hoy = todayStr(); DB.reservations.push({id: 777003, date: hoy, time: '21:00', name: 'Marta', pax: 2, status: 'pendiente', createdAt: new Date().toISOString()}); saveDB(); });
  await w(900); assert.equal(await badge(page), String(base + 1));
  const f = await filas(page); assert.ok(f.some(x => /Reservas por confirmar/.test(x)), JSON.stringify(f));
  await page.evaluate(() => [...document.querySelectorAll('#avisos-cuerpo .av-fila button')].find(b => b.textContent.trim() === 'Ver').click()); await w(700);
  assert.equal(await page.evaluate(() => !!document.querySelector('#view-reservas.active')), true, 'Ver no lleva a Reservas');
  assert.equal(await page.evaluate(() => avisosPanelAbierto()), false, 'el panel debe cerrarse al ir');
});
await caso('Una reserva que llega de OTRO aparato (por la nube) enciende la campana sin tocar nada', async () => {
  await page.evaluate(() => { lastSyncedSnapshot = lastSyncedSnapshot || {}; const l = DB.reservations.slice(); l.push({id: 777004, date: todayStr(), time: '22:00', name: 'Luis', pax: 4, status: 'pendiente', createdAt: new Date().toISOString()}); applyRemoteBlock('reservations', l); });
  await w(900); assert.equal(await badge(page), String(base + 1));   // (el número cuenta TIPOS de aviso: «reservas por confirmar» sigue siendo una fila, ahora con 2)
  await abrir(page); assert.ok((await filas(page)).some(x => /2.*Reservas por confirmar/.test(x)));
});
await caso('Lo informativo (cumpleaños) se puede marcar como «Visto» y no vuelve', async () => {
  await page.evaluate(() => { DB.reservations = []; const hoy = new Date(); DB.clients = [{id: 9001, name: 'Pepe', cumpleanos: '1990-' + String(hoy.getMonth()+1).padStart(2,'0') + '-' + String(hoy.getDate()).padStart(2,'0')}]; saveDB(); });
  await w(900);
  const antes = await filas(page); assert.ok(antes.some(f => /Cumpleaños/.test(f)), 'no sale el cumpleaños: ' + JSON.stringify(antes));
  await page.evaluate(() => [...document.querySelectorAll('#avisos-cuerpo .av-fila')].find(f => /Cumpleaños/.test(f.innerText)).querySelector('button:last-child').click()); await w(500);
  assert.ok(!(await filas(page)).some(f => /Cumpleaños/.test(f)));
  await page.evaluate(() => { saveDB(); }); await w(900); assert.ok(!(await filas(page)).some(f => /Cumpleaños/.test(f)), 'vuelve a salir tras repintar');
});
await caso('Un empleado NO ve las aprobaciones ni lo que es del dueño', async () => {
  await page.evaluate(() => { DB.vacationRequests.push({id: 777005, employeeId: DB.employees[0].id, fromDate: '2026-12-20', toDate: '2026-12-22', status: 'pending', createdAt: new Date().toISOString()}); DB.reservations.push({id: 777006, date: todayStr(), name: 'Eva', pax: 2, status: 'pendiente'}); window.isOwnerSession = () => false; window.getAccessSession = () => ({type: 'employee', area: 'sala', employeeId: 1, ts: Date.now()}); saveDB(); });
  await w(900); await abrir(page); await page.evaluate(() => avisosRenderPanel());
  const f = await filas(page); assert.ok(f.some(x => /Reservas por confirmar/.test(x)), 'el empleado sí debe ver las reservas: ' + JSON.stringify(f)); assert.ok(!f.some(x => /Aceptar/.test(x) || /Cumpleaños/.test(x)), 'el empleado ve cosas del dueño: ' + JSON.stringify(f));
});
await caso('Stock bajo de SALA sale aunque estés en Cocina, y «Ver» abre el stock de Sala', async () => {
  await page.evaluate(() => { window.isOwnerSession = () => true; DB.reservations = []; DB.vacationRequests = []; currentFolder = 'cocina';
    DB.ingredients.push({id: 888001, name: 'Lima prueba', area: 'sala', activo: true, unit: 'ud', price: 1}); DB.stock[888001] = {qty: 0, min: 5}; saveDB(); });
  await w(900); await abrir(page); await page.evaluate(() => avisosRenderPanel());
  const f = await filas(page); assert.ok(f.some(x => /Stock bajo mínimo · Sala/.test(x)), JSON.stringify(f));
  await page.evaluate(() => [...document.querySelectorAll('#avisos-cuerpo .av-fila')].find(r => /Stock bajo mínimo · Sala/.test(r.innerText)).querySelector('button').click()); await w(600);
  assert.equal(await page.evaluate(() => currentFolder), 'sala');
});
await caso('Un empleado de COCINA no ve avisos de Sala (reservas, TPV, stock de Sala) y uno de SALA sí', async () => {
  await page.evaluate(() => { window.isOwnerSession = () => false; DB.reservations.push({id: 777020, date: todayStr(), name: 'Eva', pax: 2, status: 'pendiente'}); window.getAccessSession = () => ({type: 'employee', area: 'cocina', employeeId: 1, ts: Date.now()}); saveDB(); });
  await w(900); await abrir(page); await page.evaluate(() => avisosRenderPanel());
  let f = await filas(page); assert.ok(!f.some(x => /Reservas por confirmar|· Sala/.test(x)), 'cocina ve cosas de sala: ' + JSON.stringify(f));
  await page.evaluate(() => { window.getAccessSession = () => ({type: 'employee', area: 'sala', employeeId: 1, ts: Date.now()}); avisosRenderPanel(); }); await w(200);
  f = await filas(page); assert.ok(f.some(x => /Reservas por confirmar/.test(x)) && f.some(x => /· Sala/.test(x)), 'sala no ve lo suyo: ' + JSON.stringify(f));
  assert.ok(!f.some(x => /Cierre de caja|Facturas|Aceptar/.test(x)), 'sala ve lo del dueño: ' + JSON.stringify(f));
});
await caso('A un empleado le llega la petición de cambio de turno de un compañero, con Aceptar y Rechazar', async () => {
  await page.evaluate(() => { const [a, b] = DB.employees; window.loggedInEmployeeId = () => b.id; DB.turnoSwapRequests.push({id: 777021, fromEmployeeId: a.id, fromTurnoId: (DB.turnos || [])[0] ? DB.turnos[0].id : 1, toEmployeeId: b.id, status: 'pending_peer', createdAt: new Date().toISOString()}); saveDB(); });
  await w(900); await abrir(page); await page.evaluate(() => avisosRenderPanel());
  const f = await filas(page); assert.ok(f.some(x => /Aceptar/.test(x) && /Rechazar/.test(x)), JSON.stringify(f));
});
await caso('Escape y pulsar fuera cierran el panel', async () => {
  await abrir(page); await page.keyboard.press('Escape'); await w(150); assert.equal(await page.evaluate(() => avisosPanelAbierto()), false);
  await abrir(page); await page.mouse.click(300, 400); await w(150); assert.equal(await page.evaluate(() => avisosPanelAbierto()), false);
});
await caso('Sin errores de página', async () => { assert.deepEqual(page.errs, []); });
await page.close();

const mov = await arrancar(360);
await caso('En móvil (360 px) el panel cabe entero, sin desbordar, con letra legible y botones de 36 px o más', async () => {
  await mov.evaluate(() => { DB.vacationRequests.push({id: 777010, employeeId: DB.employees[0].id, fromDate: '2026-12-10', toDate: '2026-12-14', status: 'pending', createdAt: new Date().toISOString()}); DB.reservations.push({id: 777011, date: todayStr(), name: 'Eva', pax: 2, status: 'pendiente'}); saveDB(); });
  await w(900); await abrir(mov);
  const r = await mov.evaluate(() => { const p = document.getElementById('avisos-panel').getBoundingClientRect(); const bs = [...document.querySelectorAll('#avisos-cuerpo button')].map(b => b.getBoundingClientRect()); return {izq: p.left, der: p.right, ancho: innerWidth, scrollX: document.documentElement.scrollWidth, minAlto: Math.min(...bs.map(b => b.height)), fuera: bs.filter(b => b.right > innerWidth + 1 || b.left < -1).length}; });
  assert.ok(r.izq >= 0 && r.der <= r.ancho, JSON.stringify(r)); assert.ok(r.scrollX <= r.ancho, 'scroll horizontal ' + JSON.stringify(r)); assert.equal(r.fuera, 0); assert.ok(r.minAlto >= 36, 'botón de ' + r.minAlto + ' px');
});
await mov.close();
await browser.close();
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ todos los casos pasaron');
process.exit(fallos ? 1 : 0);
