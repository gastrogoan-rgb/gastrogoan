// Avisar al cliente al cancelar/rechazar un pedido para llevar/domicilio
// (9/09). Antes el texto de confirmación decía "se avisará al cliente por
// email" — mentira: no hay ningún email automático (el comentario del propio
// código ya lo decía), así que el cliente se quedaba sin enterarse de nada.
// Ahora, si dejó teléfono o email, se ofrece un aviso manual con un clic —
// mismo patrón que ya existe al cancelar/editar una reserva.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

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
}, 'AVISOPED1');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));

function seedOrder(){
  return page.evaluate(()=>{
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, name:'Bar de Pruebas'});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    const id = genId();
    DB.tpvOrders.push({
      id, type:'togo', status:'abierta', area:'cocina',
      clienteNombre:'María', clienteTelefono:'600123456', clienteEmail:'maria@correo.com',
      items:[], cerrada:false, createdAt: new Date().toISOString(),
    });
    saveDB();
    return id;
  });
}

let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}

await caso('El texto de "Cancelar pedido" ya no promete un email automático que no existe', async () => {
  const texto = await page.evaluate(()=> t('msg.confirmCancelOrder'));
  assert.ok(!/avisará al cliente por email/i.test(texto), 'no debe prometer un aviso automático por email: ' + texto);
});

await caso('Al cancelar un pedido con teléfono y email, se abre el aviso manual con los dos botones activos', async () => {
  const id = await seedOrder();
  await page.evaluate((id)=>{
    navigate('tpv');
    cancelAcceptedOnlineOrder(id);
  }, id);
  await new Promise(r=>setTimeout(r,150));
  // Sesión de propietario: requestBusinessPinAction usa confirmModal (sin
  // pedir PIN), no el modal de PIN del negocio.
  await page.evaluate(()=> acceptConfirmModal());
  await new Promise(r=>setTimeout(r,200));
  const r = await page.evaluate(()=>{
    const modal = document.getElementById('modal-box');
    const wa = [...modal.querySelectorAll('button')].find(b => b.textContent.includes('WhatsApp'));
    const email = [...modal.querySelectorAll('button')].find(b => b.textContent.includes('Email'));
    return {
      abierto: modal.innerText.includes('Avisar al cliente'),
      waHabilitado: wa && !wa.disabled,
      emailHabilitado: email && !email.disabled,
      textoIncluyeNombre: document.getElementById('order-notify-text')?.value.includes('María'),
    };
  });
  assert.ok(r.abierto, 'debe abrirse el modal de aviso al cliente tras cancelar');
  assert.ok(r.waHabilitado, 'el botón de WhatsApp debe estar activo (hay teléfono)');
  assert.ok(r.emailHabilitado, 'el botón de Email debe estar activo (hay email)');
  assert.ok(r.textoIncluyeNombre, 'el mensaje debe llevar el nombre del cliente');
  await page.evaluate(()=> closeModal());
});

await caso('Un pedido sin teléfono ni email no abre ningún aviso al cancelarlo', async () => {
  const id = await page.evaluate(()=>{
    const id = genId();
    DB.tpvOrders.push({id, type:'togo', status:'abierta', area:'cocina', clienteNombre:'Sin Datos', items:[], cerrada:false, createdAt: new Date().toISOString()});
    saveDB();
    return id;
  });
  await page.evaluate((id)=>{ navigate('tpv'); cancelAcceptedOnlineOrder(id); }, id);
  await new Promise(r=>setTimeout(r,150));
  await page.evaluate(()=> acceptConfirmModal());
  await new Promise(r=>setTimeout(r,200));
  const abierto = await page.evaluate(()=> document.getElementById('modal-overlay').classList.contains('active'));
  assert.ok(!abierto, 'sin teléfono ni email no hay nada que ofrecer, no debe quedar ningún modal abierto');
});

await caso('Ningún error de JavaScript en todo el recorrido', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(68));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
