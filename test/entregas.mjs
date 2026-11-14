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


await caso('Zonas con tarifa propia: el envío y el mínimo salen de la zona del código postal, y lo vacío usa el general', () => app.evaluate(() => {
  DB.business.pedidos = {pedidoMinimo: 15, deliveryFee: 3, freeDeliveryFrom: 30, zonas: entZonasDeTexto('Centro | 08001, 08002 | 2 | 12 | 25\nLejos | 08999 | 5 | | ')};
  if(DB.business.pedidos.zonas.length !== 2) throw new Error('no leyó las zonas');
  const a = condicionesDeEnvio(DB.business.pedidos, '08001'), b = condicionesDeEnvio(DB.business.pedidos, '08999'), c = condicionesDeEnvio(DB.business.pedidos, '99999');
  if(a.fee !== 2 || a.minimo !== 12 || a.gratis !== 25) throw new Error('centro: ' + JSON.stringify(a));
  if(b.fee !== 5 || b.minimo !== 15 || b.gratis !== 30) throw new Error('lejos (vacío = general): ' + JSON.stringify(b));
  if(c.fee !== 3) throw new Error('sin zona usa el general');
  if(costeEnvioPedidoPublico('delivery', 10, 0, '08001') !== 2 || costeEnvioPedidoPublico('delivery', 26, 0, '08001') !== 0) throw new Error('coste por zona / gratis desde');
  if(entZonasATexto(DB.business.pedidos.zonas).indexOf('Centro | 08001,08002 | 2 | 12 | 25') !== 0) throw new Error('ida y vuelta a texto');
  return null;
}));

await caso('Códigos promocionales: la app los valida (caducidad, mínimo, usos) y los cuenta; los de compensación no se editan a mano', () => app.evaluate(() => {
  const hoy = todayStr();
  DB.business.pedidos = {codigos: entCodigosDeTexto('BIENVENIDA | 10% | 15 | 2099-01-01 | 2\nCINCO | 5€ | | | \nVIEJO | 10% | | 2000-01-01 |\nmal | xx', [])};
  if(DB.business.pedidos.codigos.length !== 3) throw new Error('debían salir 3 códigos válidos: ' + DB.business.pedidos.codigos.length);
  if(entAplicarCodigo('bienvenida', 10)) throw new Error('bajo el mínimo no debe aplicarse');
  const a = entAplicarCodigo('bienvenida', 20); if(!a || a.pct !== 10) throw new Error('10 %: ' + JSON.stringify(a));
  entAplicarCodigo('BIENVENIDA', 20); if(entAplicarCodigo('BIENVENIDA', 20)) throw new Error('agotado tras 2 usos');
  if(entAplicarCodigo('VIEJO', 20)) throw new Error('caducado');
  const c = entAplicarCodigo('CINCO', 50); if(!c || c.pct !== 10) throw new Error('5 € de 50 € = 10 %: ' + JSON.stringify(c));
  DB.business.pedidos.codigos.push({codigo: 'LOAB12', pct: 10, usosMax: 1, usados: 0, compensacion: true});
  if(entCodigosATexto(DB.business.pedidos.codigos).includes('LOAB12')) throw new Error('la compensación no se edita');
  if(!entCodigosDeTexto('', DB.business.pedidos.codigos).some(x => x.codigo === 'LOAB12')) throw new Error('la compensación se debe conservar al guardar');
  return null;
}));

await caso('Autopausa: al llegar a N pedidos en curso se pausan los dos canales y no se repite', () => app.evaluate(() => {
  DB.business.pedidos = {autopausaN: 2};
  DB.tpvOrders = [1, 2].map(i => ({id: 700 + i, tipo: 'takeaway', status: 'abierta', items: [{name: 'x', price: 1, qty: 1}]}));
  entAutopausaTick();
  if(!entCanalPausado('takeaway') || !entCanalPausado('delivery')) throw new Error('no pausó');
  const hasta = DB.business.pedidos.pausaTakeawayHasta; entAutopausaTick();
  if(DB.business.pedidos.pausaTakeawayHasta !== hasta) throw new Error('se volvió a pausar');
  DB.business.pedidos.pausaTakeawayHasta = ''; DB.business.pedidos.pausaDeliveryHasta = ''; DB.tpvOrders = [];
  return null;
}));

await caso('Compensación por retraso: solo si llegó tarde y el negocio la tiene activada', () => app.evaluate(() => {
  DB.business.pedidos = {ventanaMin: 10, compensarRetrasoPct: 0};
  const o = {date: todayStr(), time: '12:00', entregadoAt: new Date(new Date(todayStr() + 'T12:30').getTime()).toISOString(), clienteNombre: 'Eva'};
  let abierto = false; window.confirmModal = () => { abierto = true; return Promise.resolve(false); };
  entOfrecerCompensacion(o); if(abierto) throw new Error('desactivada: no debe preguntar');
  DB.business.pedidos.compensarRetrasoPct = 10; entOfrecerCompensacion(o); if(!abierto) throw new Error('20 min tarde con la compensación activa: debía preguntar');
  abierto = false; o.entregadoAt = new Date(new Date(todayStr() + 'T12:12').getTime()).toISOString(); entOfrecerCompensacion(o);
  if(abierto) throw new Error('2 min tarde no merece compensación');
  return null;
}));

await caso('Orden de cocina: con los minutos de las fichas, el plato más largo empieza antes y todo acaba a la hora prometida', () => app.evaluate(() => {
  DB.recipes = [{id: 1, nombre: 'Carrillera'}, {id: 2, nombre: 'Ensalada'}]; DB.fichas = [{recipeId: 1, pasosDet: [{min: 40}, {min: 5}]}, {recipeId: 2, pasosDet: [{min: 5}]}];
  const o = {date: '2026-11-14', time: '21:00', items: [{name: 'Carrillera', recipeId: 1, qty: 1, price: 1}, {name: 'Ensalada', recipeId: 2, qty: 1, price: 1}]};
  const r = entOrdenCocina(o); if(!r || r.length !== 2) throw new Error('no calculó');
  if(r[0].min !== 45 || r[1].min !== 5) throw new Error('orden por duración: ' + JSON.stringify(r.map(x => x.min)));
  if(r[1].empezar - r[0].empezar !== 40 * 60000) throw new Error('la ensalada debe empezar 40 min después de la carrillera');
  return null;
}));

await caso('Kit de captación: un enlace por canal con `?origen=` y la barra enseña Captación', () => app.evaluate(() => {
  DB.business.publicId = 'pubentreg1';
  const u = entEnlaceOrigen('google'); if(!/origen=google$/.test(u)) throw new Error('enlace: ' + u);
  if(!entBarraHtml().includes('entAbrirKit')) throw new Error('falta el botón');
  entAbrirKit(); if(!document.body.textContent.includes('origen')) throw new Error('el kit no se abrió'); closeModal();
  return null;
}));

await caso('Reloj desajustado: desde 3 min de diferencia con el servidor se avisa', () => app.evaluate(() => {
  document.body.insertAdjacentHTML('beforeend', '<div id="ent-aviso-reloj" hidden></div>');
  entRelojOffsetMs = 5 * 60000; entPintarAvisoReloj(); const b = document.getElementById('ent-aviso-reloj');
  if(b.hidden || !/5 min/.test(b.textContent)) throw new Error('no avisó: ' + b.textContent);
  entRelojOffsetMs = 30000; entPintarAvisoReloj(); if(!b.hidden) throw new Error('30 s no debe avisar'); b.remove();
  return null;
}));

await caso('Rider: «Ruta completa» por hora prometida y «Siguiente parada»', () => app.evaluate(async () => {
  const mk = (id, hora, dir) => ({id, tipo: 'delivery', status: 'abierta', clienteNombre: 'C' + id, clienteDireccion: dir, date: todayStr(), time: hora, items: [{name: 'x', price: 1, qty: 1, estado: 'entregado'}], repartidorId: null});
  const hm = min => { const d = new Date(Date.now() + min * 60000), p = n => String(n).padStart(2, '0'); return p(d.getHours()) + ':' + p(d.getMinutes()); };
  DB.tpvOrders = [mk(1, hm(20), 'Calle B 2'), mk(2, hm(10), 'Calle A 1'), mk(3, hm(30), 'Calle C 3')];
  entAbrirRepartidor(); await new Promise(r => setTimeout(r, 100));
  const t = document.getElementById('ent-rep-body').innerHTML;
  if(!t.includes('Ruta completa (3')) throw new Error('falta la ruta completa');
  if(t.indexOf('Calle%20A%201') > t.indexOf('Calle%20B%202') && t.indexOf('Calle%20B%202') > 0) throw new Error('la ruta no va por hora prometida');
  if(t.indexOf('Siguiente parada') < 0 || t.indexOf('C2') > t.indexOf('C1')) throw new Error('la siguiente parada debe ser la más temprana');
  const url = buildRouteMapsUrl([DB.tpvOrders[1], DB.tpvOrders[0], DB.tpvOrders[2]], {respetarOrden: true});
  if(url.includes('optimize:true')) throw new Error('no debe reordenar');
  closeModal(); return null;
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


await caso('Web: zonas de envío y código promocional con el mismo cálculo que la app', () => pub.evaluate(() => {
  const p = DB.business.pedidos = {deliveryFee: 3, freeDeliveryFrom: 30, pedidoMinimo: 15, zonas: [{nombre: 'Centro', cps: ['28001'], fee: 2, minimo: 12, gratis: 25}], codigos: [{codigo: 'HOLA10', pct: 10, minimo: 15, hasta: '2099-01-01', usosMax: 0, usados: 0}, {codigo: 'VIEJO', pct: 10, hasta: '2000-01-01'}]};
  document.body.insertAdjacentHTML('beforeend', '<input id="o-cp" value="28001">');
  if(getDeliveryFee(p, 10, true) !== 2 || getDeliveryFee(p, 26, true) !== 0) throw new Error('envío por zona');
  if(minimoPedidoWeb(p, true) !== 12) throw new Error('mínimo de la zona');
  document.getElementById('o-cp').value = '';
  if(minimoPedidoWeb(p, true) !== 12) throw new Error('sin CP debe usar el más bajo (12)');
  codigoPromoEscrito = 'hola10';
  const d = descuentoDeCodigo(20, 3); if(d.importe !== 2.3) throw new Error('10 % de 23 = 2,30: ' + d.importe);
  codigoPromoEscrito = 'VIEJO'; if(!codigoPromoValido(20).error) throw new Error('caducado debe fallar');
  codigoPromoEscrito = 'hola10'; if(!codigoPromoValido(10).error) throw new Error('bajo mínimo debe fallar');
  codigoPromoEscrito = ''; document.getElementById('o-cp').remove();
  return null;
}));

await caso('Web: tablero de listos (?listos=1) solo con números, preparando vs listos, y «lleva N min»', () => pub.evaluate(() => {
  const ahora = Date.now(), iso = ms => new Date(ahora + ms).toISOString();
  listosDatos = {'tok-aaaaaaaaaaaa1': {status: 'preparando', tipo: 'takeaway', updatedAt: iso(-60000)}, 'tok-bbbbbbbbbbbb2': {status: 'listo', tipo: 'takeaway', updatedAt: iso(-900000), listoAt: iso(-900000)}, 'tok-cccccccccccc3': {status: 'listo', tipo: 'delivery', updatedAt: iso(-1000)}, 'tok-dddddddddddd4': {status: 'entregado', tipo: 'takeaway', updatedAt: iso(-1000)}};
  pintarListos();
  const t = document.getElementById('app').textContent;
  if(!/En preparación/.test(t) || !/Listos para recoger/.test(t)) throw new Error('faltan columnas');
  if(!t.includes(shortCode('tok-aaaaaaaaaaaa1')) || !t.includes(shortCode('tok-bbbbbbbbbbbb2'))) throw new Error('faltan números');
  if(t.includes(shortCode('tok-cccccccccccc3')) || t.includes(shortCode('tok-dddddddddddd4'))) throw new Error('un domicilio o un entregado no van en el tablero');
  if(!/lleva 15 min/.test(t)) throw new Error('falta «lleva 15 min»');
  return null;
}));

await caso('Web: compartir la cesta por enlace y cargarla en otro móvil', async () => {
  const url = await pub.evaluate(async () => {
    cart = [{key: '11', recipeId: 11, sectionId: 1, name: 'Croquetas de jamón', price: 9.5, qty: 2, modificadores: []}];
    let u = ''; Object.defineProperty(navigator, 'share', {value: undefined, configurable: true}); Object.defineProperty(navigator, 'clipboard', {value: {writeText: x => { u = x; return Promise.resolve(); }}, configurable: true});
    entCestaCompartir(); await new Promise(r => setTimeout(r, 80)); return u;
  });
  assert.ok(/cesta=11x2/.test(url), 'enlace: ' + url);
  const n = await pub.evaluate(() => { cart = []; history.replaceState(null, '', '?neg=pubentreg1&cesta=11x2'); entCestaCargar(); const r = JSON.stringify(cart.map(l => l.qty)); history.replaceState(null, '', '?neg=pubentreg1'); cart = []; return r; });
  assert.equal(n, '[2]');
});

await browser.close(); web.kill();
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ para llevar y delivery: fase 1 y 2 (lo hecho) funcionan');
process.exit(fallos ? 1 : 0);
