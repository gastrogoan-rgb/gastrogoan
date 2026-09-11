// Hallazgos de la auditoría de código general (11/09, revisión a fondo
// pedida por el dueño), fuera de Gestión Económica/I+D (ya auditados):
// - Renombrar sección/grupo/plato/opción sin permiso de edición fallaba en
//   silencio (el propio nombre, visible y clicable, no avisaba de nada).
// - nextValidDeliveryDate usaba toISOString() con una medianoche LOCAL,
//   devolviendo el día ANTERIOR al de entrega válido en España (UTC+1/+2).
// - dataMaintenanceCutoff tenía el mismo defecto para la fecha por defecto
//   de "archivar datos antiguos".
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';

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
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
}, 'AUDIT1109');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));
await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
});

let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}

await caso('nextValidDeliveryDate: para un proveedor que reparte los martes, un pedido de miércoles corrige al martes SIGUIENTE, no al lunes', async () => {
  const r = await page.evaluate(()=>{
    // 2026-09-09 es miércoles. El próximo martes es 2026-09-15.
    return nextValidDeliveryDate('2026-09-09', ['Martes']);
  });
  assert.equal(r, '2026-09-15', `debía caer en el martes siguiente (2026-09-15), salió ${r} — si sale 2026-09-14 (lunes) es el bug de toISOString`);
});

await caso('nextValidDeliveryDate: si la fecha elegida YA es un día válido, no se mueve', async () => {
  const r = await page.evaluate(()=> nextValidDeliveryDate('2026-09-15', ['Martes']));
  assert.equal(r, '2026-09-15', 'un martes con reparto los martes no debe cambiar de fecha: ' + r);
});

await caso('dataMaintenanceCutoff devuelve un día calendario real de hace un año (nunca desfasado)', async () => {
  const r = await page.evaluate(()=>{
    const hoy = new Date();
    const esperado = new Date(hoy); esperado.setFullYear(hoy.getFullYear()-1);
    const esperadoStr = `${esperado.getFullYear()}-${String(esperado.getMonth()+1).padStart(2,'0')}-${String(esperado.getDate()).padStart(2,'0')}`;
    return {real: dataMaintenanceCutoff(), esperado: esperadoStr};
  });
  assert.equal(r.real, r.esperado, 'debe ser exactamente hace un año en fecha local, no un día antes: ' + JSON.stringify(r));
});

await caso('Renombrar una sección de Carta sin permiso de edición avisa con un toast, no falla en silencio', async () => {
  const r = await page.evaluate(()=>{
    editUnlocked = false;
    const origIsOwner = window.isOwnerSession;
    window.isOwnerSession = () => false;
    let toastMsg = null;
    const origToast = window.showToast;
    window.showToast = (msg) => { toastMsg = msg; };
    cartaEdit = {id: 1, secciones: [{id: 1, nombre: 'Entrantes', platos: []}]};
    renameCartaSeccion(1);
    window.isOwnerSession = origIsOwner;
    window.showToast = origToast;
    return {toastMsg, nombreSigueIgual: cartaEdit.secciones[0].nombre === 'Entrantes'};
  });
  assert.ok(r.toastMsg, 'debe avisar con un toast al no tener permiso: ' + JSON.stringify(r));
  assert.ok(r.nombreSigueIgual, 'y no debe haber cambiado nada: ' + JSON.stringify(r));
});

await caso('Renombrar un plato de Carta sin permiso de edición avisa con un toast (antes fallaba en silencio, el nombre es clicable para todos)', async () => {
  const r = await page.evaluate(()=>{
    editUnlocked = false;
    const origIsOwner = window.isOwnerSession;
    window.isOwnerSession = () => false;
    let toastMsg = null;
    const origToast = window.showToast;
    window.showToast = (msg) => { toastMsg = msg; };
    cartaEdit = {id: 1, secciones: [{id: 1, nombre: 'Entrantes', platos: [{id: 1, nombre: 'Ensaladilla', precio: 8}]}]};
    renameCartaPlato(1, 1);
    window.isOwnerSession = origIsOwner;
    window.showToast = origToast;
    return toastMsg;
  });
  assert.ok(r, 'debe avisar con un toast al no tener permiso: ' + r);
});

await caso('El botón de renombrar sección de Carta y grupo de Menú son ahora owner-only en el código fuente', async () => {
  const src = fs.readFileSync(new URL('../js/menu.js', import.meta.url), 'utf8');
  assert.ok(/owner-only btn btn-sm btn-icon" title="\$\{t\('title\.renameSection'\)\}" onclick="renameCartaSeccion/.test(src), 'el botón de renombrar sección de Carta debe ser owner-only');
  assert.ok(/owner-only btn btn-sm btn-icon" title="\$\{t\('title\.renameGroup'\)\}" onclick="renameMenuGrupo/.test(src), 'el botón de renombrar grupo de Menú debe ser owner-only');
});

await caso('Ningún error de JavaScript en todo el recorrido', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(68));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
