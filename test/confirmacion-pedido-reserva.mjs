// Página de confirmación unificada: al hacer un pedido o una reserva, la
// web pública entra DIRECTAMENTE en la vista de seguimiento/gestión en vivo
// (sendRequest ya no muestra una pantalla de éxito de un solo uso con un
// botón para ir a verla) — con número de referencia, matices de texto para
// Take Away/Delivery, contacto del negocio y el aviso de guardar el enlace.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
const erroresJs = [];
page.on('pageerror', e => erroresJs.push(e.message));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/reservagastrogoan.html', {waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,500));

let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}

await page.evaluate(() => {
  window.DB = DB = {};
  DB.business = { name:'Test', phone:'611222333', email:'hola@test.com', tiposServicio:{mesa:true, takeaway:true, delivery:true} };
  DB.reservasResumen = {}; DB.mesasOcupadas = {}; DB.tables = [];
  window.db = db = { ref: () => ({ on: () => {}, once: () => Promise.resolve({val:()=>null}) }) };
});

await caso('Un pedido de Take Away muestra número de referencia, "listo para recoger" y el contacto del negocio', async () => {
  const r = await page.evaluate(() => {
    trackToken = 'r_test_takeaway'; trackListenerAttached = false;
    renderOrderTrackingView();
    renderTrackStatus({status:'listo', tipo:'takeaway', updatedAt: new Date().toISOString()});
    return {
      numero: document.getElementById('app').textContent.includes(shortCode('r_test_takeaway')),
      texto: document.getElementById('app').textContent.includes('Listo para recoger'),
      telefono: document.body.innerHTML.includes('611222333'),
      email: document.body.innerHTML.includes('hola@test.com'),
      guardaEnlace: document.getElementById('app').textContent.includes('Guarda este enlace'),
      shareBtn: !!document.querySelector('button[onclick*="shareTrackUrl"]'),
    };
  });
  assert.ok(r.numero, 'no se ve el número de referencia del pedido');
  assert.ok(r.texto, 'un pedido para llevar "listo" debe decir "Listo para recoger", no un texto genérico');
  assert.ok(r.telefono && r.email, 'falta el contacto del negocio (teléfono/email) para anular o cambiar el pedido');
  assert.ok(r.guardaEnlace && r.shareBtn, 'falta el aviso de guardar el enlace con su botón de compartir');
});

await caso('Un pedido de Delivery usa el texto de reparto, no el de recoger', async () => {
  const texto = await page.evaluate(() => {
    trackToken = 'r_test_delivery'; trackListenerAttached = false;
    renderOrderTrackingView();
    renderTrackStatus({status:'listo', tipo:'delivery', updatedAt: new Date().toISOString()});
    return document.getElementById('app').textContent;
  });
  assert.ok(texto.includes('en reparto'), 'un pedido a domicilio "listo" debe decir que está en reparto');
  assert.ok(!texto.includes('Listo para recoger'), 'no debe mostrar el texto de recoger en un pedido a domicilio');
});

await caso('Una reserva confirmada muestra su código y conserva los botones de editar/cancelar', async () => {
  const r = await page.evaluate(() => {
    resToken = 'res_test_789'; resListenerAttached = false;
    renderReservationManageView();
    renderReservationStatus({status:'confirmada', date:'2026-09-20', time:'21:00', people:4});
    return {
      codigo: document.getElementById('app').textContent.includes(shortCode('res_test_789')),
      editar: !!document.getElementById('res-edit-btn'),
      cancelar: !!document.getElementById('res-cancel-btn'),
      guardaEnlace: document.getElementById('app').textContent.includes('Guarda este enlace'),
    };
  });
  assert.ok(r.codigo, 'no se ve el código de referencia de la reserva');
  assert.ok(r.editar && r.cancelar, 'faltan los botones de editar/cancelar la reserva');
  assert.ok(r.guardaEnlace, 'falta el aviso de guardar el enlace en la vista de gestión de reserva');
});

await caso('El código de referencia es el mismo cada vez para el mismo token (no aleatorio)', async () => {
  const {a, b} = await page.evaluate(() => ({a: shortCode('mismo_token'), b: shortCode('mismo_token')}));
  assert.equal(a, b, 'shortCode debe ser determinista: el mismo token siempre da el mismo código');
});

await caso('Ningún error de JavaScript en todo el recorrido', () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(64));
console.log(fallos ? `❌ ${fallos} fallaron` : `✅ casos pasaron`);
await browser.close();
process.exit(fallos ? 1 : 0);
