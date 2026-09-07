// Avisar al cliente (WhatsApp/email) al cancelar o editar una reserva desde
// la app del negocio — no hay backend ni API de pago: son enlaces nativos
// (wa.me / mailto) con el texto ya escrito, que abre lo que el empleado ya
// tenga instalado. El email automático (si está configurado) sigue
// mandándose aparte; esto es la red de seguridad para cuando no lo está.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox'],headless:true});
const page = await browser.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto('http://localhost:8950/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(() => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'AVISOTEST', tenantId: ggBizTenantId('AVISOTEST')}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2000));
await page.evaluate(() => {
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  editUnlocked = true;
  document.body.classList.add('owner-session');
});

let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}

await caso('Cancelar una reserva con teléfono ofrece avisar por WhatsApp', async () => {
  const r = await page.evaluate(async () => {
    DB.reservations = [{id: 9001, clientId:null, clientName:'Ana Test', clientPhone:'611222333', clientEmail:'', date:'2026-09-20', time:'21:00', people:4, status:'confirmada'}];
    saveDB();
    cancelReservation(9001); // abre confirmModal, pendiente
    await new Promise(r=>setTimeout(r,150));
    acceptConfirmModal(); // simula pulsar "Confirmar"
    await new Promise(r=>setTimeout(r,150));
    return {
      modalAbierto: document.getElementById('modal-overlay').classList.contains('active'),
      texto: document.getElementById('modal-box').textContent,
      whatsappHabilitado: !document.querySelector('button[onclick*="sendReservationNotifyWhatsapp"]')?.disabled,
      emailDeshabilitado: !!document.querySelector('button[onclick*="sendReservationNotifyEmail"]')?.disabled,
      estadoReserva: DB.reservations.find(x=>x.id===9001).status,
    };
  });
  assert.equal(r.estadoReserva, 'cancelada', 'la reserva no quedó cancelada');
  assert.ok(r.modalAbierto, 'no se abrió el modal de aviso al cliente tras cancelar');
  assert.ok(r.texto.includes('Ana Test') || r.texto.toLowerCase().includes('cancelad'), 'el modal no menciona la cancelación ni al cliente');
  assert.ok(r.whatsappHabilitado, 'el botón de WhatsApp debía estar activo (hay teléfono)');
  assert.ok(r.emailDeshabilitado, 'el botón de email debía estar desactivado (no hay email guardado)');
});

await caso('Cancelar una reserva SIN teléfono ni email no abre ningún modal (no hay nada que ofrecer)', async () => {
  const r = await page.evaluate(async () => {
    closeModal();
    DB.reservations = [{id: 9002, clientId:null, clientName:'Sin Contacto', clientPhone:'', clientEmail:'', date:'2026-09-20', time:'21:00', people:2, status:'confirmada'}];
    saveDB();
    cancelReservation(9002);
    await new Promise(r=>setTimeout(r,150));
    acceptConfirmModal();
    await new Promise(r=>setTimeout(r,150));
    return document.getElementById('modal-overlay').classList.contains('active');
  });
  assert.equal(r, false, 'no debería aparecer ningún modal de aviso si no hay ni teléfono ni email');
});

await caso('Pulsar WhatsApp abre wa.me con el texto y cierra el modal', async () => {
  const r = await page.evaluate(async () => {
    DB.reservations = [{id: 9003, clientId:null, clientName:'Carlos Test', clientPhone:'622333444', clientEmail:'', date:'2026-09-21', time:'14:00', people:2, status:'confirmada'}];
    saveDB();
    window._openedUrls = [];
    window.open = (url) => { window._openedUrls.push(url); return null; };
    cancelReservation(9003);
    await new Promise(r=>setTimeout(r,150));
    acceptConfirmModal();
    await new Promise(r=>setTimeout(r,150));
    sendReservationNotifyWhatsapp(9003);
    return {
      urls: window._openedUrls,
      modalCerrado: !document.getElementById('modal-overlay').classList.contains('active'),
    };
  });
  assert.ok(r.urls.length === 1 && r.urls[0].startsWith('https://wa.me/622333444?text='), 'no abrió wa.me con el teléfono correcto: ' + JSON.stringify(r.urls));
  assert.ok(decodeURIComponent(r.urls[0]).toLowerCase().includes('carlos test'), 'el texto del WhatsApp no menciona al cliente');
  assert.ok(r.modalCerrado, 'el modal debía cerrarse tras mandar el aviso');
});

await caso('Editar la fecha/hora de una reserva existente ofrece avisar (editada), no tocar solo la mesa no', async () => {
  const r = await page.evaluate(async () => {
    DB.tables = [];
    DB.reservations = [{id: 9004, clientId:null, clientName:'Marta Test', clientPhone:'633444555', clientEmail:'', date:'2026-09-22', time:'20:00', people:3, status:'confirmada', notes:''}];
    saveDB();
    closeModal();
    finalizeSaveReservation({id:9004, clientId:null, clientName:'Marta Test', date:'2026-09-23', time:'21:30', people:3, tableId:null, notes:'', status:'confirmada'});
    await new Promise(r=>setTimeout(r,150));
    const conCambio = document.getElementById('modal-overlay').classList.contains('active');
    closeModal();
    finalizeSaveReservation({id:9004, clientId:null, clientName:'Marta Test', date:'2026-09-23', time:'21:30', people:3, tableId:null, notes:'nota nueva', status:'confirmada'});
    await new Promise(r=>setTimeout(r,150));
    const sinCambioDeFecha = document.getElementById('modal-overlay').classList.contains('active');
    return {conCambio, sinCambioDeFecha};
  });
  assert.ok(r.conCambio, 'cambiar la fecha/hora de una reserva debe ofrecer avisar al cliente');
  assert.equal(r.sinCambioDeFecha, false, 'tocar solo las notas (sin cambiar fecha/hora) no debe abrir el aviso de nuevo');
});

await caso('Ningún error de JavaScript en todo el recorrido', () => {
  assert.deepEqual(errs, [], 'errores: ' + errs.join(' | '));
});

console.log('\n' + '═'.repeat(64));
console.log(fallos ? `❌ ${fallos} fallaron` : `✅ casos pasaron`);
await browser.close();
process.exit(fallos ? 1 : 0);
