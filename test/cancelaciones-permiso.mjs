// Cancelar es SIEMPRE cosa del propietario o de un empleado con permiso de
// editar (12/09). Da igual qué se cancele: una reserva, un pedido online —
// pendiente o ya aceptado—, una venta ya cobrada, un sitio en la lista de
// espera o un pedido a proveedor. Antes cada una iba por su lado: unas
// pedían el PIN del negocio (que cualquiera del equipo puede acabar
// sabiendo), otras solo un "¿seguro?", y los botones se veían siempre.
//
// Se comprueba de las dos formas que importan: que el botón NO se ve, y que
// llamar a la función a mano tampoco cuela (un empleado con la consola
// abierta, o un botón que se nos escape en el futuro).
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
await page.setViewport({width:1280, height:900});
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
}, 'CANCELPERM');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));

// Semilla común: una reserva confirmada, un pedido online pendiente, otro ya
// aceptado, una venta cobrada y alguien en la lista de espera.
await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, name:'Bar de Pruebas'});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  const linea = {platoId:null, recipeId:null, name:'Plato', price:12, qty:1, tanda:'', notas:'', estado:'cocina', bebida:false, modificadores:[]};
  DB.reservations = [{id: 501, clientName:'Ana', date: todayStr(), time:'21:00', people:2, status:'confirmada', tableId:null}];
  DB.tpvOrders = [
    {id: 601, tipo:'takeaway', status:'pendiente_aceptar', clienteNombre:'María',
      clienteTelefono:'600123456', clienteEmail:'maria@correo.com', items:[linea], createdAt:new Date().toISOString()},
    {id: 602, tipo:'delivery', status:'abierta', clienteNombre:'Luis',
      clienteTelefono:'600999888', items:[linea], createdAt:new Date().toISOString()},
  ];
  DB.sales = [{id: 701, date: todayStr(), createdAt:new Date().toISOString(), total:24, subtotal:24,
    tipo:'mesa', metodoPago:'Efectivo', items:[{name:'Plato', qty:2, price:12, ivaPct:10, recipeId:null}]}];
  DB.waitlist = [{id: 801, name:'Pere', people:2, status:'esperando', createdAt:new Date().toISOString()}];
  saveDB();
});

let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}

// Pasa a modo empleado SIN permiso de editar, que es el que tiene que quedar
// fuera. No se toca la sesión guardada: basta con el estado que gobierna
// .owner-only, que es exactamente lo que mira la app para enseñar o no.
const comoEmpleadoSinEdicion = () => page.evaluate(()=>{
  editUnlocked = false;
  document.body.classList.remove('edit-unlocked', 'owner-session');
});
// Vuelve a la sesión de propietario (que es la que abrió esta página): para
// el dueño, requestBusinessPinAction pide confirmación en vez del PIN.
const comoConEdicion = () => page.evaluate(()=>{
  editUnlocked = true;
  document.body.classList.add('edit-unlocked', 'owner-session');
});

await caso('Sin permiso de editar, ninguna cancelación llega a ejecutarse', async () => {
  await comoEmpleadoSinEdicion();
  const r = await page.evaluate(async ()=>{
    // Se llaman TODAS a mano, que es el caso peor (un empleado con la
    // consola abierta, o un botón mal puesto en el futuro).
    rejectOnlineOrder(601);
    cancelAcceptedOnlineOrder(602);
    cancelReservation(501);
    rejectOnlineReservation(501);
    requestCancelSale(701);
    cancelWaitlistEntry(801);
    await new Promise(r=>setTimeout(r,300));
    return {
      reserva: (DB.reservations.find(x=>x.id===501)||{}).status,
      pedidoPendiente: DB.tpvOrders.some(o=>o.id===601),
      pedidoAceptado: DB.tpvOrders.some(o=>o.id===602),
      venta: (DB.sales.find(s=>s.id===701)||{}).status || 'activa',
      espera: (DB.waitlist.find(w=>w.id===801)||{}).status,
      // Y no se queda ningún diálogo pidiendo confirmación o PIN.
      modal: document.getElementById('modal-overlay').classList.contains('active'),
    };
  });
  assert.equal(r.reserva, 'confirmada', 'la reserva no se cancela: ' + JSON.stringify(r));
  assert.ok(r.pedidoPendiente, 'el pedido pendiente sigue ahí: ' + JSON.stringify(r));
  assert.ok(r.pedidoAceptado, 'el pedido aceptado sigue ahí: ' + JSON.stringify(r));
  assert.equal(r.venta, 'activa', 'la venta no se anula: ' + JSON.stringify(r));
  assert.equal(r.espera, 'esperando', 'la lista de espera no se toca: ' + JSON.stringify(r));
  assert.ok(!r.modal, 'no se abre ningún diálogo de confirmación ni de PIN: ' + JSON.stringify(r));
});

await caso('Y se explica por qué, en vez de no hacer nada en silencio', async () => {
  await comoEmpleadoSinEdicion();
  const aviso = await page.evaluate(async ()=>{
    const toast = document.getElementById('toast');
    toast.textContent = '';
    cancelReservation(501);
    await new Promise(r=>setTimeout(r,300));
    return toast.textContent;
  });
  assert.ok(/permiso de editar/i.test(aviso), 'el aviso debe decir qué hace falta: ' + JSON.stringify(aviso));
});

await caso('Todo botón de cancelar lleva .owner-only y desaparece sin permiso', async () => {
  const r = await page.evaluate(async ()=>{
    DB.reservations = [{id: 511, clientName:'Ana', date: todayStr(), time:'21:00', people:2, status:'confirmada', tableId:null}];
    DB.tpvOrders = [{id: 611, tipo:'takeaway', status:'abierta', clienteNombre:'María', clienteTelefono:'600123456',
      items:[{platoId:null, recipeId:null, name:'Plato', price:12, qty:1, tanda:'', notas:'', estado:'cocina', bebida:false, modificadores:[]}],
      createdAt:new Date().toISOString()}];
    saveDB();
    const SEL = '[onclick*="cancelReservation"], [onclick*="rejectOnlineReservation"], [onclick*="rejectOnlineOrder"],'
      + ' [onclick*="cancelAcceptedOnlineOrder"], [onclick*="requestCancelSale"], [onclick*="cancelWaitlistEntry"], [onclick*="deleteOrder"]';
    const recoger = () => [...document.querySelectorAll(SEL)].map(e => ({
      quien: (e.getAttribute('onclick')||'').split('(')[0],
      ownerOnly: e.classList.contains('owner-only'),
      oculto: getComputedStyle(e).display === 'none',
    }));
    currentFolder = 'sala';
    editUnlocked = true; document.body.classList.add('edit-unlocked');
    navigate('reservas'); await new Promise(r=>setTimeout(r,600));
    const reservas = recoger();
    navigate('tpv'); await new Promise(r=>setTimeout(r,700));
    const tpv = recoger();
    // Y ahora, el mismo DOM sin permiso de editar.
    editUnlocked = false; document.body.classList.remove('edit-unlocked','owner-session');
    await new Promise(r=>setTimeout(r,200));
    const tpvSinPermiso = recoger();
    return {reservas, tpv, tpvSinPermiso};
  });
  const todos = [...r.reservas, ...r.tpv];
  assert.ok(todos.length > 0, 'tiene que haber botones de cancelar que auditar: ' + JSON.stringify(r));
  const sinClase = todos.filter(b => !b.ownerOnly).map(b => b.quien);
  assert.deepEqual([...new Set(sinClase)], [], 'a estos les falta .owner-only: ' + JSON.stringify(sinClase));
  // Y la clase tiene que hacer su trabajo de verdad, no solo estar puesta.
  const visiblesSinPermiso = r.tpvSinPermiso.filter(b => !b.oculto).map(b => b.quien);
  assert.deepEqual([...new Set(visiblesSinPermiso)], [], 'siguen viéndose sin permiso: ' + JSON.stringify(visiblesSinPermiso));
});

await caso('Con permiso de editar, cancelar una reserva sigue funcionando', async () => {
  await comoConEdicion();
  const estado = await page.evaluate(async ()=>{
    DB.reservations = [{id: 501, clientName:'Ana', date: todayStr(), time:'21:00', people:2, status:'confirmada', tableId:null}];
    saveDB();
    cancelReservation(501);
    await new Promise(r=>setTimeout(r,300));
    acceptConfirmModal();
    await new Promise(r=>setTimeout(r,400));
    const st = (DB.reservations.find(x=>x.id===501)||{}).status;
    closeModal();
    return st;
  });
  assert.equal(estado, 'cancelada', 'con permiso sí se cancela');
});

await caso('Cancelar un pedido ofrece el mensaje para el cliente, aunque el contacto esté en su ficha', async () => {
  await comoConEdicion();
  const r = await page.evaluate(async ()=>{
    // El pedido NO lleva teléfono encima: lo tiene su ficha de cliente. Es
    // el caso que dejaba al hostelero sin ningún mensaje que enviar.
    DB.clients = [{id: 55, name:'Rosa', phone:'611222333', email:'rosa@correo.com'}];
    DB.tpvOrders.push({id: 603, tipo:'takeaway', status:'abierta', clienteNombre:'Rosa', clientId: 55,
      items:[{platoId:null, recipeId:null, name:'Plato', price:10, qty:1, tanda:'', notas:'', estado:'cocina', bebida:false, modificadores:[]}],
      createdAt:new Date().toISOString()});
    saveDB();
    cancelAcceptedOnlineOrder(603);
    await new Promise(r=>setTimeout(r,400));
    acceptConfirmModal();
    await new Promise(r=>setTimeout(r,700));
    const box = document.getElementById('modal-box');
    const wa = [...box.querySelectorAll('button')].find(b => b.textContent.includes('WhatsApp'));
    const email = [...box.querySelectorAll('button')].find(b => b.textContent.includes('Email'));
    const texto = (document.getElementById('order-notify-text')||{}).value || '';
    const abierto = !!document.getElementById('order-notify-text');
    closeModal();
    return {abierto, waOk: !!(wa && !wa.disabled), emailOk: !!(email && !email.disabled), texto};
  });
  assert.ok(r.abierto, 'debe abrirse el aviso al cliente: ' + JSON.stringify(r));
  assert.ok(r.waOk, 'el teléfono sale de la ficha del cliente: ' + JSON.stringify(r));
  assert.ok(r.emailOk, 'y el email también: ' + JSON.stringify(r));
  assert.ok(/Rosa/.test(r.texto), 'el mensaje lleva su nombre: ' + JSON.stringify(r.texto));
});

await caso('Una mesa abierta se distingue de una libre de un vistazo', async () => {
  const r = await page.evaluate(async ()=>{
    DB.tables = [{id:1, name:'Mesa 1', pax:4, zona:'Salón', area:'sala'}, {id:2, name:'Mesa 2', pax:2, zona:'Salón', area:'sala'}];
    DB.tpvOrders = [{id: 901, tableId: 1, tipo:'mesa', pax:2, status:'abierta', createdAt:new Date().toISOString(),
      items:[{platoId:null, recipeId:null, name:'Plato', price:12, qty:1, tanda:'', notas:'', estado:'cocina', bebida:false, modificadores:[]}]}];
    saveDB();
    currentFolder = 'sala'; navigate('tpv');
    await new Promise(r=>setTimeout(r,700));
    const ocup = document.querySelector('.mesa-card.mesa-occupied');
    const libre = document.querySelector('.mesa-card.mesa-free');
    if(!ocup || !libre) return {falta:true};
    const co = getComputedStyle(ocup), cl = getComputedStyle(libre);
    return {
      ocupada: parseFloat(co.borderLeftWidth), colorOcupada: co.borderLeftColor,
      libre: parseFloat(cl.borderLeftWidth),
      // El canto de arriba sigue siendo el color de la fase del servicio.
      cantoArriba: parseFloat(co.borderTopWidth),
    };
  });
  assert.ok(!r.falta, 'hacen falta una mesa abierta y otra libre: ' + JSON.stringify(r));
  assert.ok(r.ocupada >= 2, 'la mesa abierta lleva borde marcado: ' + JSON.stringify(r));
  assert.ok(r.ocupada > r.libre, 'y más marcado que una libre: ' + JSON.stringify(r));
  assert.equal(r.cantoArriba, 4, 'el canto de arriba sigue dando la fase del servicio: ' + JSON.stringify(r));
});

await caso('Ningún error de JavaScript en todo el recorrido', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(70));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
