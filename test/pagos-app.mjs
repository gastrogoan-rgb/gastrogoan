// La parte de la app de los pagos con tarjeta y los pedidos online (30/09),
// pasando por el oyente del buzón DE VERDAD (initPublicRequestsListener) con
// una nube de mentira: los precios los pone la carta del negocio, un pago que
// no llega no confirma nada, y la confirmación del banco se recoge
// preguntando a la plataforma.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'], headless: true});
const res = [];
async function caso(nombre, fn){
  try { const d = await fn(); console.log('✅ ' + nombre + (d ? '  → ' + d : '')); res.push(true); }
  catch(e){ console.log('❌ ' + nombre + '\n     ⤷ ' + (e.message || e)); res.push(false); }
}
const page = await browser.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.setRequestInterception(true);
page.on('request', r => /firebase|gstatic|googleapis|workers\.dev|github/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/index.html', {waitUntil: 'domcontentloaded'});
await page.evaluate(() => {
  const code = 'PAGOS001';
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_login', '1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type: 'owner', ts: Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
});
await page.reload({waitUntil: 'domcontentloaded'});
await new Promise(r => setTimeout(r, 2200));

// Una nube de mentira con un buzón: lo que se «empuje» llega al oyente.
await page.evaluate(() => {
  ['netlify-gate', 'license-gate', 'extconn-gate', 'firebase-gate', 'revoked-gate'].forEach(id => document.getElementById(id)?.remove());
  Object.assign(DB.business, {name: 'Casa Tarjeta', netlifySetupDone: true, extConnPromptSeen: true, tourSeen: true, categoryIconHintSeen: true, publicId: 'pubtest01'});
  DB.business.ownFirebase = {apiKey: 'fake', databaseURL: 'https://fake-default-rtdb.firebaseio.com'};
  DB.business.pedidos = Object.assign(DB.business.pedidos || {}, {deliveryFee: 3, freeDeliveryFrom: 30});
  DB.business.pedidosOnlineActivos = true;
  DB.cartas = [{id: 1, nombre: 'Carta', secciones: [{id: 10, nombre: 'Principales', platos: [
    {id: 100, nombre: 'Hamburguesa', precio: 12, deliverySupplement: 1, modificadores: [{id: 1, nombre: 'Queso', precio: 1.5}]},
    {id: 101, nombre: 'Ensalada', precio: 9},
  ]}]}];
  DB.promos = [{id: 5, menuItemPlatoId: 101, discountPct: 20}];
  window.__buzon = [];
  const oyentes = [];
  const fakeApp = {database: () => ({ref: () => ({on: (ev, cb) => { oyentes.push(cb); }})})};
  if(typeof firebase === 'undefined') window.firebase = {};   // el SDK está bloqueado en la prueba
  espejoEnNubePropia = true;
  getPublicMirrorApp = () => Promise.resolve(fakeApp);
  comprobarSaturacionPublica = () => Promise.resolve();
  window.__empujar = req => new Promise(resolve => {
    const snap = {val: () => req, ref: {
      child: () => ({transaction: () => Promise.resolve({committed: true})}),
      remove: () => { resolve(); return Promise.resolve(); },
    }};
    if(!oyentes.length) resolve('SIN_OYENTE');
    oyentes.forEach(cb => cb(snap));
    setTimeout(() => resolve('TIEMPO'), 4000);
  });
  publicRequestsListenerAttached = false;
  initPublicRequestsListener();
});
await new Promise(r => setTimeout(r, 300));
assert.ok(await page.evaluate(() => publicRequestsListenerAttached), 'el oyente del buzón no se ha enganchado');

await caso('Un pedido con precios inventados entra con los de la carta (también en efectivo)', async () => {
  const r = await page.evaluate(async () => {
    await __empujar({type: 'pedido', tipo: 'delivery', clienteNombre: 'Pícaro', metodoPagoLocal: 'efectivo', clientRef: 'REFcash0001',
      costeEnvio: 0, propina: 0, createdAt: new Date().toISOString(),
      items: [{platoId: 100, name: 'Hamburguesa', price: 0.01, qty: 2, modificadores: [{id: 1, nombre: 'Queso', precio: 0}]},
              {platoId: 101, name: 'Ensalada', price: 7.2, qty: 1}]});
    const o = DB.tpvOrders.find(x => x.clientRef === 'REFcash0001');
    return {precios: o.items.map(i => i.price), envio: o.costeEnvio, corregidos: (o.preciosCorregidos || []).length, total: orderTotal(o)};
  });
  // Hamburguesa a domicilio: 12 + 1 de suplemento + 1,5 de queso = 14,50.
  // Ensalada con su 20 % de promo: 7,20 (se respeta, está en el margen).
  assert.deepEqual(r.precios, [14.5, 7.2]);
  assert.equal(r.envio, 0, 'con 36,20 € de subtotal el envío es gratis (desde 30 €)');
  assert.equal(r.corregidos, 1);
  return `total ${r.total} € · 1 precio corregido`;
});

await caso('Envío falseado a 0 € se cobra según la configuración del negocio', async () => {
  const r = await page.evaluate(async () => {
    await __empujar({type: 'pedido', tipo: 'delivery', clienteNombre: 'Otro', metodoPagoLocal: 'efectivo', clientRef: 'REFcash0002', costeEnvio: 0,
      items: [{platoId: 101, name: 'Ensalada', price: 9, qty: 1}], createdAt: new Date().toISOString()});
    return DB.tpvOrders.find(x => x.clientRef === 'REFcash0002').costeEnvio;
  });
  assert.equal(r, 3);
  return 'envío 3 €';
});

await caso('Pago con tarjeta: se espera, se pregunta a la plataforma y, si falta dinero, NO se da por pagado', async () => {
  const r = await page.evaluate(async () => {
    const pagos = {};
    window.fetch = async url => {
      const m = String(url).match(/gastrogoan\/pagos\/pubtest01\/([^.]+)\.json$/);
      if(!m) return new Response('null');
      return new Response(JSON.stringify(pagos[decodeURIComponent(m[1])] || null));
    };
    await __empujar({type: 'pedido', tipo: 'takeaway', clienteNombre: 'Tarjeta', clientRef: 'REFcard0001', propina: 0,
      items: [{platoId: 100, name: 'Hamburguesa', price: 0.01, qty: 1}], createdAt: new Date().toISOString()});
    const esperando = (DB.pagosTarjetaEsperados || []).some(p => p.id === 'REFcard0001');
    // El banco confirma lo que se firmó: 0,01 €.
    pagos.REFcard0001 = {amount: 0.01, createdAt: new Date().toISOString()};
    await comprobarPagosTarjeta();
    const o = DB.tpvOrders.find(x => x.clientRef === 'REFcard0001');
    const trasPagoCorto = {pagado: o.pagado, insuf: o.pagoInsuficiente, status: o.status, esperando: (DB.pagosTarjetaEsperados || []).some(p => p.id === 'REFcard0001')};
    // Otro pedido pagado bien.
    await __empujar({type: 'pedido', tipo: 'takeaway', clienteNombre: 'Honrado', clientRef: 'REFcard0002', propina: 1,
      items: [{platoId: 100, name: 'Hamburguesa', price: 12, qty: 1}], createdAt: new Date().toISOString()});
    pagos.REFcard0002 = {amount: 13, createdAt: new Date().toISOString()};
    await comprobarPagosTarjeta();
    const o2 = DB.tpvOrders.find(x => x.clientRef === 'REFcard0002');
    return {esperando, trasPagoCorto, bueno: {pagado: o2.pagado, status: o2.status}, descuadres: (DB.paymentAmountMismatches || []).filter(m => m.orderRef === 'REFcard0001').length};
  });
  assert.ok(r.esperando, 'el pedido con tarjeta no queda en espera de confirmación');
  assert.equal(r.trasPagoCorto.pagado, false, 'pagó 0,01 € por 12 € y se ha dado por pagado');
  assert.equal(r.trasPagoCorto.insuf, true);
  assert.equal(r.trasPagoCorto.status, 'pendiente-online', 'ha entrado en cocina sin haber pagado');
  assert.equal(r.trasPagoCorto.esperando, false, 'sigue preguntando por un pago ya recibido');
  assert.equal(r.descuadres, 1);
  assert.equal(r.bueno.pagado, true, 'un pago correcto no se da por pagado');
  return 'corto: pendiente y avisado · bueno: pagado';
});

await caso('La señal de una reserva la pone el negocio, y pagar menos no confirma', async () => {
  const r = await page.evaluate(async () => {
    Object.assign(DB.business, {requireDeposit: true, depositAmount: 10, depositType: 'perPerson', depositMinPeople: 0, pagoOnlineActivo: true});
    const hoy = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    await __empujar({type: 'reserva', clientName: 'Grupo', clientPhone: '600000000', date: hoy, time: '21:00', people: 4,
      depositRequired: true, depositAmount: '0.01', resToken: 'RESTOK000001', createdAt: new Date().toISOString()});
    const reserva = DB.reservations.find(x => x.publicToken === 'RESTOK000001');
    aplicarPagoConfirmado({orderRef: 'RESTOK000001', amount: 0.01, createdAt: new Date().toISOString()});
    const corta = {senal: reserva.depositAmount, confirmada: reserva.depositConfirmed};
    aplicarPagoConfirmado({orderRef: 'RESTOK000001', amount: 40, createdAt: new Date().toISOString()});
    // Y una que se salta la señal.
    await __empujar({type: 'reserva', clientName: 'Listo', clientPhone: '600000001', date: hoy, time: '21:00', people: 2,
      depositRequired: false, resToken: 'RESTOK000002', createdAt: new Date().toISOString()});
    const saltada = DB.reservations.find(x => x.publicToken === 'RESTOK000002');
    return {corta, buena: reserva.depositConfirmed, saltada: {status: saltada.status, marca: saltada.senalSaltada}};
  });
  assert.equal(r.corta.senal, '40.00', 'la señal es la que manda el navegador, no la del negocio');
  assert.equal(r.corta.confirmada, false, '0,01 € han confirmado una señal de 40 €');
  assert.equal(r.buena, true);
  assert.equal(r.saltada.status, 'pendiente', 'una reserva que se salta la señal se confirma sola');
  assert.equal(r.saltada.marca, true);
  return 'señal 40 € · 0,01 € no confirma · saltársela no confirma';
});

await caso('La comisión de Stripe se apunta sola como gasto, una vez, exacta o estimada', async () => {
  const r = await page.evaluate(() => {
    if(!DB.ge) DB.ge = {}; if(!Array.isArray(DB.ge.variables)) DB.ge.variables = [];
    const antes = DB.ge.variables.length;
    aplicarPagoConfirmado({orderRef: 'COMIS0000001', amount: 40, comision: 0.85, createdAt: new Date().toISOString()});
    aplicarPagoConfirmado({orderRef: 'COMIS0000001', amount: 40, comision: 0.85, createdAt: new Date().toISOString()});   // el aviso llega dos veces
    aplicarPagoConfirmado({orderRef: 'COMIS0000002', amount: 20, createdAt: new Date().toISOString()});                   // sin cifra exacta
    const nuevos = DB.ge.variables.slice(antes).filter(v => v.pagoOnlineRef);
    const cont = document.createElement('div'); cont.innerHTML = renderPagoOnlineCard();
    const info = cont.textContent.includes('7') && cont.querySelector('details') !== null;
    return {n: nuevos.length, exacta: nuevos[0] && [nuevos[0].categoria, nuevos[0].importe, nuevos[0].pagada, nuevos[0].iva], estimada: nuevos[1] && [nuevos[1].importe, nuevos[1].comisionEstimada], info};
  });
  assert.equal(r.n, 2, 'la comisión se apunta más de una vez por pago (o ninguna)');
  assert.deepEqual(r.exacta, ['COMISIONES VENTA', 0.85, true, 0]);
  assert.deepEqual(r.estimada, [0.55, true], 'sin cifra de Stripe no se estima 1,5 % + 0,25 €');
  assert.ok(r.info, 'la tarjeta de Stripe no explica cómo y cuándo se cobra');
  return 'exacta 0,85 € · estimada 0,55 € · sin duplicar · explicación en la tarjeta';
});

await caso('Un pedido pagado online no se vuelve a cobrar: se cierra y la venta queda apuntada', async () => {
  const r = await page.evaluate(() => {
    const ayer = new Date(Date.now() - 86400000).toISOString();
    const mk = (id, tipo) => ({id, tableId: null, tipo, status: 'aceptado', clienteNombre: 'Pagado', items: [{name: 'Hamburguesa', price: 12, qty: 2, estado: 'entregado'}],
      propina: 1, costeEnvio: 0, pagado: true, pagoImporte: 25, pagoFecha: ayer, clientRef: 'REFpaid' + id, origenOnline: true, createdAt: ayer});
    DB.tpvOrders.push(mk(990001, 'takeaway'), mk(990002, 'delivery'));
    const debe = Math.max(0, orderTotal(DB.tpvOrders.find(o => o.id === 990001)) + 1 - orderAmountPaidOnline(DB.tpvOrders.find(o => o.id === 990001)));
    const antes = DB.sales.length;
    cerrarPedidoPagadoOnline(990001);
    const v1 = DB.sales.find(s => s.id === 990001);
    markRepartoEntregado(990002);
    const v2 = DB.sales.find(s => s.id === 990002);
    return {debe, nuevas: DB.sales.length - antes, v1: v1 && {metodo: v1.metodoPago, total: v1.total, fecha: v1.date, efectivo: (v1.pagos||[]).some(p => p.metodoPago === 'Efectivo')},
      cerrado: DB.tpvOrders.find(o => o.id === 990001).status, v2: !!v2, fechaPago: ayer.slice(0, 10)};
  });
  assert.equal(r.debe, 0, 'un pedido pagado online sigue debiendo dinero en caja («Cobrar · 25 €»)');
  assert.equal(r.nuevas, 2, 'la venta no se apunta');
  assert.equal(r.v1.metodo, 'Online', 'la venta se apunta como otro método, no como pagada online');
  assert.equal(r.v1.efectivo, false, 'el arqueo esperaría en caja un dinero que no pasó por ella');
  assert.equal(r.v1.total, 25);
  assert.equal(r.v1.fecha, r.fechaPago, 'la venta no va al día en que se cobró');
  assert.equal(r.cerrado, 'pagada');
  assert.ok(r.v2, 'un pedido a domicilio pagado no se cierra al marcarlo entregado');
  return 'nada que cobrar · venta Online de 25 € el día del pago · a domicilio se cierra al entregar';
});

await caso('Un pedido pendiente para dentro de horas (o de días) sale en Pendientes, diciendo que espera el pago', async () => {
  const r = await page.evaluate(() => {
    const en = h => { const d = new Date(Date.now() + h * 3600000); return {date: d.toISOString().slice(0, 10), time: String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')}; };
    const f3 = en(3), f48 = en(48);
    DB.tpvOrders.push({id: 880001, tipo: 'takeaway', status: 'pendiente-online', origenOnline: true, metodoPagoLocal: null, pagado: false, clienteNombre: 'Tarde', items: [{name: 'X', price: 5, qty: 1}], date: f3.date, time: f3.time, createdAt: new Date().toISOString()});
    DB.tpvOrders.push({id: 880002, tipo: 'delivery', status: 'pendiente-online', origenOnline: true, metodoPagoLocal: 'efectivo', clienteNombre: 'Sabado', items: [{name: 'Y', price: 5, qty: 1}], date: f48.date, time: f48.time, createdAt: new Date().toISOString()});
    const ids = getPendingOnlineOrders().map(o => o.id);
    const html = renderTpvPendingOnline();
    return {tarde: ids.includes(880001), sabado: ids.includes(880002), esperaPago: html.includes(t('label.awaitingCardPayment'))};
  });
  assert.ok(r.tarde, 'un pedido pendiente para dentro de 3 horas no sale en Pendientes');
  assert.ok(r.sabado, 'un pedido pendiente para dentro de 2 días no sale en Pendientes');
  assert.ok(r.esperaPago, 'no dice que el pedido está esperando el pago con tarjeta');
  return 'de dentro de 3 h y de 2 días · «esperando el pago con tarjeta»';
});

await caso('La venta de un pedido pagado se apunta al llegar el pago, en el día de Madrid, y cerrar no la duplica', async () => {
  await page.emulateTimezone('Europe/Madrid');
  const r = await page.evaluate(() => {
    DB.tpvOrders.push({id: 770001, tipo: 'takeaway', status: 'aceptado', origenOnline: true, metodoPagoLocal: null, pagado: false, clienteNombre: 'Medianoche',
      clientRef: 'REFmidnight01', items: [{name: 'Hamburguesa', price: 12, qty: 1}], propina: 0, createdAt: new Date().toISOString()});
    // 00:30 del 1 de octubre en Madrid = 22:30 UTC del 30 de septiembre.
    aplicarPagoConfirmado({orderRef: 'REFmidnight01', amount: 12, comision: 0.43, createdAt: '2026-09-30T22:30:00.000Z'});
    const venta = DB.sales.find(x => x.id === 770001);
    const alPagar = venta ? {fecha: venta.date, metodo: venta.metodoPago, total: venta.total} : null;
    const antes = DB.sales.filter(x => x.id === 770001).length;
    cerrarPedidoPagadoOnline(770001);
    const despues = DB.sales.filter(x => x.id === 770001).length;
    return {alPagar, antes, despues, cerrado: DB.tpvOrders.find(o => o.id === 770001).status};
  });
  await page.emulateTimezone('UTC');
  assert.ok(r.alPagar, 'la venta no se apunta al llegar el pago');
  assert.equal(r.alPagar.fecha, '2026-10-01', 'un pago a las 00:30 de Madrid se apunta la víspera (fecha en UTC)');
  assert.equal(r.alPagar.metodo, 'Online');
  assert.deepEqual([r.antes, r.despues], [1, 1], 'al cerrar el pedido la venta se duplica');
  assert.equal(r.cerrado, 'pagada');
  return 'apuntada al pagar · 1 de octubre (no el 30) · cerrar no duplica';
});

await caso('Reservas: mesa de N a N+2 plazas; 3 p van a la de 5, no a la de 6; 15 p sin mesa, pendiente', async () => {
  const r = await page.evaluate(async () => {
    Object.assign(DB.business, {requireDeposit: false, reservaConfirmManualDesde: 0});
    DB.tables = [{id: 501, name: 'M6', plazas: 6, zona: 'Sala'}, {id: 502, name: 'M10', plazas: 10, zona: 'Sala'}, {id: 503, name: 'M5', plazas: 5, zona: 'Sala'}];
    const dia = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
    await __empujar({type: 'reserva', clientName: 'Tres', clientPhone: '611111111', date: dia, time: '21:00', people: 3, resToken: 'RESauto00003', createdAt: new Date().toISOString()});
    await __empujar({type: 'reserva', clientName: 'Quince', clientPhone: '622222222', date: dia, time: '21:00', people: 15, resToken: 'RESauto00015', createdAt: new Date().toISOString()});
    const a = DB.reservations.find(x => x.publicToken === 'RESauto00003'), b = DB.reservations.find(x => x.publicToken === 'RESauto00015');
    return {tres: a && [a.status, a.tableId], quince: b && [b.status, b.tableId], codigo: codigoCortoPublico('k8F3xQ9zLm2P')};
  });
  assert.deepEqual(r.tres, ['confirmada', 503], '3 personas: debe confirmarse sola en la de 5 (la de 6 sobra más de 2 sillas)');
  assert.equal(r.quince[0], 'pendiente', 'un grupo más grande que la mesa más grande se confirma solo');
  assert.equal(r.codigo, '1QGS8P', 'el número de la app no es el mismo que ve el cliente en su seguimiento');
  return '3 p → confirmada en la de 5 · 15 p → pendiente · Nº igual que el del cliente';
});

await caso('Los pagos que nunca llegan dejan de preguntarse a las 48 h', async () => {
  const r = await page.evaluate(async () => {
    window.fetch = async () => new Response('null');
    DB.pagosTarjetaEsperados = [{id: 'VIEJO000001', ref: 'VIEJO000001', desde: new Date(Date.now() - 49 * 3600000).toISOString()},
                                {id: 'NUEVO000001', ref: 'NUEVO000001', desde: new Date().toISOString()}];
    await comprobarPagosTarjeta();
    return DB.pagosTarjetaEsperados.map(p => p.id);
  });
  assert.deepEqual(r, ['NUEVO000001']);
  return 'el viejo fuera, el nuevo sigue';
});

await caso('Mi Negocio: la tarjeta de Stripe enseña cada estado y solo activa el cobro cuando Stripe deja cobrar', async () => {
  const r = await page.evaluate(async () => {
    const cont = document.createElement('div'); cont.innerHTML = renderPagoOnlineCard(); document.body.appendChild(cont);
    const estados = {};
    const probar = async (resp) => {
      window.fetch = async () => new Response(JSON.stringify(resp));
      await loadPagoOnlineStatus();
      return {texto: document.getElementById('pago-online-status').textContent, botones: [...document.querySelectorAll('#pago-online-acciones button, #pago-online-acciones a')].map(b => b.getAttribute('onclick') || b.getAttribute('href')), activo: pagoOnlineActivo};
    };
    estados.sin = await probar({conectado: false});
    estados.pendiente = await probar({conectado: true, activo: false, nombre: 'Bar <b>Pepe</b>', email: 'pepe@bar.es'});
    estados.activo = await probar({conectado: true, activo: true, nombre: 'Bar <b>Pepe</b>', email: 'pepe@bar.es'});
    const html = document.getElementById('pago-online-status').innerHTML;
    estados.desactivado = await probar({conectado: true, activo: false, desconectado: true});
    cont.remove();
    // «Conectar» no manda directo a Stripe: antes explica qué hace falta.
    let fueAStripe = false;
    window.fetch = async () => { fueAStripe = true; return new Response('{}'); };
    conectarStripe();
    const modal = document.getElementById('modal-box').innerHTML;
    const guia = {web: modal.includes('reservas.gastrogoan.com') && modal.includes('copiarWebParaStripe'), authenticator: modal.includes('Google Authenticator'), iban: modal.includes('IBAN'), sigue: modal.includes('conectarStripeAhora()'), fueAStripe};
    closeModal();
    return {estados, guia, escapado: html.includes('&lt;b&gt;Pepe&lt;/b&gt;')};
  });
  assert.ok(r.estados.sin.botones.includes('conectarStripe()') && !r.estados.sin.activo, 'sin conectar no ofrece «Conectar con Stripe»');
  assert.equal(r.estados.pendiente.activo, false, 'con el alta a medias ya se ofrece pagar con tarjeta');
  assert.ok(r.estados.pendiente.texto.includes('pepe@bar.es'), 'no se ve a nombre de quién está la cuenta');
  assert.equal(r.estados.activo.activo, true);
  assert.ok(r.estados.activo.botones.includes('desconectarStripe()'));
  assert.ok(r.escapado, 'el nombre de la cuenta de Stripe entra en el HTML sin escapar');
  assert.ok(r.estados.desactivado.botones.includes('conectarStripe()') && !r.estados.desactivado.activo);
  assert.ok(r.guia.authenticator && r.guia.iban && r.guia.sigue, 'no sale la guía de lo que va a pedir Stripe');
  assert.ok(r.guia.web, 'la guía no da la web del negocio lista para copiar (Stripe la exige)');
  assert.equal(r.guia.fueAStripe, false, 'manda a Stripe sin explicar antes qué hace falta');
  return 'sin conectar · alta a medias · activo · desactivado · guía antes de ir';
});

await caso('Ningún error de JavaScript', async () => {
  const reales = errs.filter(e => !/Failed to fetch|NetworkError|network-request-failed/i.test(e));
  assert.deepEqual(reales.slice(0, 5), []);
  return 'consola limpia';
});

console.log('\n' + '═'.repeat(64));
const fallos = res.filter(x => !x).length;
console.log(fallos ? `❌ ${fallos} de ${res.length} fallaron` : `✅ los ${res.length} casos pasaron`);
await browser.close();
process.exit(fallos ? 1 : 0);
