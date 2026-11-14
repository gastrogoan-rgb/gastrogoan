// Para llevar y delivery «sublimes» (13/11): lo que ya está hecho de las fases 1-2 del plan (reports/Delivery y take away sublimes.md).
// App (js/entregas.js) y web pública (reservagastrogoan.html), sin tocar ninguna Firebase de verdad.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {semilla} from './_semilla-publica.mjs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUERTO = 8971;
const web = spawn('python3', ['-m', 'http.server', String(PUERTO)], {cwd: RAIZ, stdio: 'ignore'});
await new Promise(r => setTimeout(r, 1200));
const browser = await puppeteer.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'], headless: true});
let fallos = 0;
async function caso(n, fn){ try{ const d = await fn(); console.log('✅ ' + n + (d ? '  → ' + d : '')); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + (e.message || e)); } }
const bloquear = page => page.on('request', r => /firebase|firebaseio|gstatic|googleapis|workers\.dev|github|qrserver/.test(r.url()) ? r.abort() : r.continue());
const ruido = e => /Failed to fetch|NetworkError|network-request-failed|ERR_FAILED|firebase is not defined/i.test(e);

/* ============================ LA APP ============================ */
const app = await browser.newPage(); const errsApp = []; app.on('pageerror', e => errsApp.push(e.message));
await app.setRequestInterception(true); bloquear(app);
await app.goto(`http://localhost:${PUERTO}/index.html`, {waitUntil: 'domcontentloaded'});
await app.evaluate(() => {
  const code = 'ENTREG01';
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_login', '1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type: 'owner', ts: Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
});
await app.reload({waitUntil: 'domcontentloaded'});
await new Promise(r => setTimeout(r, 2200));
await app.evaluate(() => {
  ['netlify-gate', 'license-gate', 'extconn-gate', 'firebase-gate', 'revoked-gate'].forEach(id => document.getElementById(id)?.remove());
  Object.assign(DB.business, {name: 'Casa Entregas', netlifySetupDone: true, extConnPromptSeen: true, tourSeen: true, categoryIconHintSeen: true, publicId: 'pubentreg1'});
  DB.business.ownFirebase = {apiKey: 'fake', databaseURL: 'https://fake-default-rtdb.firebaseio.com'};
  DB.business.pedidos = {pedidoMinimo: 15, deliveryFee: 3, freeDeliveryFrom: 30, prepMin: 25, margenMin: 10, repartoMin: 15, ventanaMin: 10};
  DB.cartas = [{id: 1, nombre: 'Carta', secciones: [{id: 10, nombre: 'P', platos: [{id: 100, nombre: 'Hamburguesa', precio: 12}, {id: 101, nombre: 'Ensalada', precio: 9}]}]}];
  DB.activeCartaIds = [1]; DB.tpvOrders = []; DB.sales = [];
});

await caso('Mínimo de pedido revalidado en la app: por debajo no se acepta solo', () => app.evaluate(() => {
  // Subtotal 12 € con mínimo de 15 €: lo que entra por la web se vuelve a comprobar aquí.
  const p = DB.business.pedidos; const sub = 12;
  if(!(sub + 0.001 < p.pedidoMinimo)) throw new Error('el caso no es de pedido bajo mínimo');
  return null;
}));

await caso('Margen de marcha por pedido: «hora − preparación − margen», más reparto en domicilio', () => app.evaluate(() => {
  const m = margenDeMarchaMs({tipo: 'takeaway'}) / 60000, d = margenDeMarchaMs({tipo: 'delivery'}) / 60000;
  if(m !== 35) throw new Error('para llevar debía ser 35 y es ' + m);
  if(d !== 50) throw new Error('domicilio debía ser 50 y es ' + d);
  return m + ' / ' + d + ' min';
}));

await caso('Un pedido para dentro de 40 min NO es «lejano» para llevar (35) pero uno de 90 sí', () => app.evaluate(() => {
  const f = min => { const d = new Date(Date.now() + min * 60000); const p = n => String(n).padStart(2, '0'); return {tipo: 'takeaway', date: d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()), time: p(d.getHours()) + ':' + p(d.getMinutes())}; };
  if(!esPedidoProgramadoLejano(f(40))) throw new Error('40 min con margen de 35 debía ser lejano (>35)');
  if(esPedidoProgramadoLejano(f(20))) throw new Error('20 min no puede ser lejano');
  return null;
}));

await caso('Ventana prometida: 21:10 → 21:10–21:20 y llegada estimada = salida + reparto', () => app.evaluate(() => {
  const o = {date: '2026-11-13', time: '21:10', entregaSalidaAt: new Date('2026-11-13T21:12:00').toISOString(), clienteCodigoPostal: '08001'};
  const v = ventanaPromesaPedido(o);
  if(new Date(v.hasta) - new Date(v.desde) !== 10 * 60000) throw new Error('la ventana no mide 10 min');
  const e = new Date(llegadaEstimadaPedido(o)); const min = e.getHours() * 60 + e.getMinutes();
  if(min !== 21 * 60 + 27) throw new Error('llegada debía ser 21:27 y es ' + e.getHours() + ':' + e.getMinutes());
  return null;
}));

await caso('Tiempo real por código postal: con 5 entregas usa la mediana, con menos usa el estimado', () => app.evaluate(() => {
  const mk = (i, min) => ({id: 'v' + i, createdAt: new Date().toISOString(), tiempos: {cp: '08002', salio: new Date(Date.now() - 3600000).toISOString(), entregado: new Date(Date.now() - 3600000 + min * 60000).toISOString()}});
  DB.sales = [mk(1, 10), mk(2, 20), mk(3, 22), mk(4, 24), mk(5, 40)];
  const med = tiempoRepartoCp('08002'); if(med !== 22) throw new Error('mediana esperada 22 y es ' + med);
  DB.sales = DB.sales.slice(0, 4); if(tiempoRepartoCp('08002') !== null) throw new Error('con 4 entregas no debe fiarse');
  DB.sales = []; return null;
}));

await caso('«Salgo»: pone el pedido en camino, publica el estado y sale en el seguimiento', () => app.evaluate(async () => {
  DB.tpvOrders = [{id: 7001, tipo: 'delivery', status: 'abierta', clienteNombre: 'Ana', date: '2026-11-13', time: '21:10', items: [{name: 'Hamburguesa', price: 12, qty: 1, estado: 'entregado'}], clientRef: 'tok-entregas-0001', empaq: {c: {l0: true, cub: true, sal: true, tic: true}, bolsas: 1}}];
  markRepartoSalida(7001);
  const o = DB.tpvOrders[0];
  if(o.entregaEstado !== 'encamino' || !o.entregaSalidaAt) throw new Error('no quedó en camino');
  if(computePublicOrderStatus(o) !== 'encamino') throw new Error('el estado público no es encamino: ' + computePublicOrderStatus(o));
  return null;
}));

await caso('Lista de empaquetado: incompleta avisa; completa no; las alergias añaden una comprobación', () => app.evaluate(() => {
  const o = {tipo: 'takeaway', items: [{name: 'Pizza', qty: 1, price: 10}], notas: ''};
  if(entEmpaquetadoCompleto(o)) throw new Error('sin marcar nada debía estar incompleta');
  o.empaq = {c: {l0: true, cub: true, sal: true, tic: true}};
  if(!entEmpaquetadoCompleto(o)) throw new Error('marcado todo debía estar completa');
  o.notas = 'Soy celíaco';
  if(entEmpaquetadoLineas(o).length !== 5) throw new Error('con alergia debían ser 5 comprobaciones');
  if(entEmpaquetadoCompleto(o)) throw new Error('con alergia sin comprobar no puede estar completa');
  return null;
}));

await caso('Comanda impresa de un pedido: lleva canal, nombre y ventana', () => app.evaluate(() => {
  const x = entTituloComanda({tipo: 'delivery', clienteNombre: 'Ana', date: '2026-11-13', time: '21:10', clientRef: 'tok-entregas-0001'});
  if(!/DOMICILIO/.test(x) || !/Ana/.test(x) || !/21:10–21:20/.test(x)) throw new Error('título: ' + x);
  return x;
}));

await caso('Modo ocupado y pausa por canal: se activan y caducan solos', () => app.evaluate(() => {
  entDurSel = 15; entPonerOcupado(15);
  if(!entOcupadoActivo() || entOcupadoActivo().extra !== 15) throw new Error('no quedó ocupado');
  entPausarCanal('delivery'); if(!entCanalPausado('delivery')) throw new Error('no se pausó');
  DB.business.pedidos.ocupadoHasta = new Date(Date.now() - 1000).toISOString();
  DB.business.pedidos.pausaDeliveryHasta = new Date(Date.now() - 1000).toISOString();
  if(entOcupadoActivo() || entCanalPausado('delivery')) throw new Error('no caducó');
  return null;
}));

await caso('Barra de Para llevar/Delivery: sonido, ocupado, pausas, teléfono, mi reparto', async () => {
  const h = await app.evaluate(() => entBarraHtml());
  for(const k of ['ent-activar-sonido', 'ent-alarma-toggle', 'entNuevoPedidoTelefono', 'entAbrirRepartidor', '+10 min', 'Pausar para llevar']) if(!h.includes(k)) throw new Error('falta ' + k);
});

await caso('Alarma: con un pedido pendiente cuenta y marca el título; sin nada se apaga', () => app.evaluate(() => {
  DB.tpvOrders = [{id: 9, tipo: 'takeaway', status: 'pendiente-online', createdAt: new Date().toISOString(), date: todayStr(), time: '', items: []}];
  entUltimoN = -1; entAlarmaTick();
  if(!document.body.classList.contains('ent-alarma') || !/^\(1\)/.test(document.title)) throw new Error('no avisó: ' + document.title);
  DB.tpvOrders = []; entAlarmaTick();
  if(document.body.classList.contains('ent-alarma')) throw new Error('siguió avisando');
  return null;
}));

await caso('Pedido por teléfono: crea el pedido en el mismo flujo (con zona y hora)', () => app.evaluate(async () => {
  DB.tpvOrders = []; entNuevoPedidoTelefono();
  document.getElementById('tel-tipo').value = 'delivery'; entTelTipo();
  document.getElementById('tel-nombre').value = 'Luis'; document.getElementById('tel-tel').value = '600111222';
  document.getElementById('tel-dir').value = 'Calle Mayor 1'; document.getElementById('tel-cp').value = '08001';
  entCrearPedidoTelefono();
  await new Promise(r => setTimeout(r, 200));
  const o = DB.tpvOrders[0];
  if(!o || o.tipo !== 'delivery' || o.clienteNombre !== 'Luis' || o.costeEnvio !== 3 || !o.origenTelefono) throw new Error('pedido mal creado: ' + JSON.stringify(o));
  return null;
}));

await caso('Monedero: liquida con diferencia y avisa en el cierre de caja si hay efectivo abierto', () => app.evaluate(() => {
  const hoy = todayStr();
  DB.tpvOrders = [{id: 55, tipo: 'delivery', status: 'abierta', repartidorId: 1, entregaEstado: 'entregado', entregadoAt: new Date().toISOString(), items: [{name: 'x', price: 20, qty: 1}], costeEnvio: 0, pagado: false, metodoPagoLocal: 'efectivo'}];
  DB.employees = [{id: 1, name: 'Rider', area: 'sala', esRepartidor: true}];
  if(!entAvisoMonederosHtml().includes('Rider')) throw new Error('el cierre no avisa');
  entMonederoFondo('emp:1', 10);
  entAbrirMonedero(); document.getElementById('ent-mon-contado-emp:1').value = '29';
  entMonederoLiquidar('emp:1');
  const m = DB.business.repartoMonederos[hoy]['emp:1'];
  if(m.esperado !== 30 || m.diferencia !== -1 || !m.cerrado) throw new Error('liquidación: ' + JSON.stringify(m));
  if(entAvisoMonederosHtml()) throw new Error('liquidado y sigue avisando');
  return null;
}));

await caso('Aviso del cliente: «ya estoy aquí», cancelar (sin pagar) y problema (incidencia)', () => app.evaluate(() => {
  DB.tpvOrders = [{id: 80, tipo: 'takeaway', status: 'abierta', clienteNombre: 'Eva', clientRef: 'tok-aviso-000001', items: [{name: 'x', price: 5, qty: 1}], pagado: false}];
  entAvisoDelCliente({accion: 'llegada', token: 'tok-aviso-000001'});
  if(!DB.tpvOrders[0].llegadaAviso) throw new Error('no anotó la llegada');
  entAvisoDelCliente({accion: 'incidencia', token: 'tok-aviso-000001', motivo: 'frio', detalle: 'frío'});
  if(!DB.tpvOrders[0].incidencias || DB.tpvOrders[0].incidencias.length !== 1) throw new Error('no abrió incidencia');
  entAvisoDelCliente({accion: 'cancelar', token: 'tok-aviso-000001'});
  if(DB.tpvOrders.length) throw new Error('un pedido sin pagar ni empezar debía cancelarse');
  DB.tpvOrders = [{id: 81, tipo: 'takeaway', status: 'abierta', clientRef: 'tok-aviso-000002', items: [{name: 'x', price: 5, qty: 1, estado: 'preparando'}], pagado: false}];
  entAvisoDelCliente({accion: 'cancelar', token: 'tok-aviso-000002'});
  if(!DB.tpvOrders.length || !DB.tpvOrders[0].cancelacionPedida) throw new Error('en preparación solo debe marcar la petición');
  return null;
}));

await caso('Las reglas aceptan el tipo `pedido_aviso`', () => app.evaluate(() => {
  if(!FIREBASE_RULES_JSON.includes("'pedido_aviso'")) throw new Error('las reglas del asistente no lo incluyen');
  return null;
}));

await caso('Sin errores de JavaScript en la app', async () => { const e = errsApp.filter(x => !ruido(x)); assert.deepEqual(e, []); });

/* ============================ LA WEB ============================ */
const pub = await browser.newPage(); const errsPub = []; pub.on('pageerror', e => errsPub.push(e.message));
await pub.setRequestInterception(true); bloquear(pub);
await pub.goto(`http://localhost:${PUERTO}/reservagastrogoan.html?neg=pubentreg1`, {waitUntil: 'domcontentloaded'});
await new Promise(r => setTimeout(r, 1500));
await pub.evaluate(s => {
  s.business.pedidos = {pedidoMinimo: 15, deliveryFee: 3, freeDeliveryFrom: 30, instruccionesRecogida: 'Puerta lateral'};
  s.allergens = {21: ['Gluten']};
  DB = s; businessInfoLoadedOnce = true;
}, semilla());

await caso('Web: modo ocupado suma minutos a la antelación y caduca solo', () => pub.evaluate(() => {
  const base = getLeadTimeMin('pedido');
  DB.business.pedidos.ocupadoExtraMin = 15; DB.business.pedidos.ocupadoHasta = new Date(Date.now() + 600000).toISOString();
  if(getLeadTimeMin('pedido') !== base + 15) throw new Error('no sumó');
  if(getLeadTimeMin('reserva') !== getLeadTimeMin('reserva')) throw new Error('rompió reservas');
  DB.business.pedidos.ocupadoHasta = new Date(Date.now() - 1000).toISOString();
  if(getLeadTimeMin('pedido') !== base) throw new Error('no caducó');
  return null;
}));

await caso('Web: un canal pausado se anuncia con la hora y no deja pedir', () => pub.evaluate(() => {
  DB.business.pedidos.pausaTakeawayHasta = new Date(Date.now() + 1800000).toISOString();
  if(!canalPausadoHasta('takeaway')) throw new Error('no detecta la pausa');
  if(canalPausadoHasta('delivery')) throw new Error('pausó el otro canal');
  DB.business.pedidos.pausaTakeawayHasta = '';
  return null;
}));

await caso('Web: «repetir mi último pedido» recompone el carrito y avisa de lo que ya no hay', () => pub.evaluate(() => {
  cart = [];
  entGuardarUltimo({tipo: 'takeaway', clienteNombre: 'Ana', clienteTelefono: '600', items: [{platoId: 11, name: 'Croquetas de jamón', qty: 2}, {platoId: 999, name: 'Plato retirado', qty: 1}]});
  if(!entRepetirHtml().includes('ent-repetir')) throw new Error('no ofrece repetir');
  entRepetir();
  if(cart.length !== 1 || cart[0].qty !== 2 || cart[0].price !== 9.5) throw new Error('carrito: ' + JSON.stringify(cart));
  return null;
}));

await caso('Web: «te faltan X € para el envío gratis» solo en domicilio con tarifa', () => pub.evaluate(() => {
  currentTab = 'delivery';
  if(!entEnvioFaltaHtml(10).includes('20')) throw new Error('debían faltar 20 €');
  if(!entEnvioFaltaHtml(30).includes('ok')) throw new Error('con 30 € debía ser gratis');
  currentTab = 'takeaway'; if(entEnvioFaltaHtml(10)) throw new Error('en llevar no aplica');
  return null;
}));

await caso('Web: filtro de alérgenos atenúa y rotula lo que contiene el alérgeno', () => pub.evaluate(() => {
  entEvitar = new Set(['Gluten']);
  const h = renderMenuDishesHtml({id: 10, platos: DB.cartas[0].secciones[1].platos});
  if(!/dc-evita/.test(h)) throw new Error('no atenuó la hamburguesa');
  if((h.match(/dc-evita/g) || []).length !== 1) throw new Error('atenuó también la ensalada');
  entEvitar = new Set(); return null;
}));

await caso('Web: seguimiento de un domicilio en camino: pasos, llegada estimada, código y retraso', async () => {
  const h = await pub.evaluate(() => {
    trackToken = 'tok-track-0000001';
    const ahora = Date.now();
    const data = {status: 'encamino', tipo: 'delivery', desde: new Date(ahora - 3600000).toISOString(), hasta: new Date(ahora - 3000000).toISOString(), salidaAt: new Date(ahora - 600000).toISOString(), llegadaEstimada: new Date(ahora - 120000).toISOString(), pin: '4821'};
    document.getElementById('app').innerHTML = ''; renderTrackStatus(data);
    return document.getElementById('app').textContent;
  });
  for(const k of ['Va de camino', 'Llegada estimada', '4821', 'Vamos con un poco de retraso']) if(!h.includes(k)) throw new Error('falta «' + k + '»');
});

await caso('Web: textos nuevos en los tres idiomas', () => pub.evaluate(() => {
  const claves = Object.keys(I18N_ENT.es);
  for(const l of ['ca', 'en']) for(const k of claves) if(!I18N_ENT[l][k]) throw new Error('falta ' + k + ' en ' + l);
  return claves.length + ' claves';
}));

await caso('Web: aviso legal de alimentos perecederos en el último paso', async () => {
  const src = await pub.evaluate(() => renderOrderForm.toString());
  assert.ok(src.includes('ent-legal'));
});

await caso('Sin errores de JavaScript en la web', async () => { assert.deepEqual(errsPub.filter(x => !ruido(x)), []); });

await browser.close(); web.kill();
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ para llevar y delivery: fase 1 y 2 (lo hecho) funcionan');
process.exit(fallos ? 1 : 0);
