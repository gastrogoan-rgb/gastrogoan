// Pedido en grupo en la mesa (27/11): la APP del negocio, con la nube de mentira de qr-mesa.mjs. Puerto propio (8964).
// Dinero con cuentas hechas A MANO, verificación del hueco, ataques y degradación:
//   · 10,00 € entre 3 = 3,34 + 3,33 + 3,33 (suma EXACTA); con descuento del 10 % la suma sigue siendo el total;
//   · lo que no tiene dueño (el camarero) no se reparte;
//   · sin `reglasGrupo` (negocio con reglas viejas) o con la casilla apagada, el nodo de la mesa NO lleva `grupo` y todo es un pedido normal;
//   · un uid que no es el dueño del hueco NO pide «como» ese hueco; un expulsado, tampoco; el precio lo pone la carta;
//   · «mi parte»: se aplica como mucho lo que ese comensal debe, la propina va aparte, el sobrante a «Pagos sin pedido» y NUNCA cierra la mesa;
//   · un pago con un hueco falso no se aplica a nadie; un segundo pago sin deuda va entero a «Pagos sin pedido».
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUERTO = 8964;
const web = spawn('python3', ['-m', 'http.server', String(PUERTO)], {cwd: RAIZ, stdio: 'ignore'});
await new Promise(r => setTimeout(r, 1200));
const browser = await puppeteer.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'], headless: true});
const res = [];
async function caso(nombre, fn){
  try { const d = await fn(); console.log('✅ ' + nombre + (d ? '  → ' + d : '')); res.push(true); }
  catch(e){ console.log('❌ ' + nombre + '\n     ⤷ ' + (e.message || e)); res.push(false); }
}
const bloquear = page => page.on('request', r => /firebase|firebaseio|gstatic|googleapis|workers\.dev|github|qrserver/.test(r.url()) ? r.abort() : r.continue());

const app = await browser.newPage();
const errs = []; app.on('pageerror', e => errs.push(e.message));
await app.setRequestInterception(true); bloquear(app);
await app.goto(`http://localhost:${PUERTO}/index.html`, {waitUntil: 'domcontentloaded'});
await app.evaluate(() => {
  const code = 'GRUPO001';
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_login', '1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type: 'owner', ts: Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
});
await app.reload({waitUntil: 'domcontentloaded'});
await new Promise(r => setTimeout(r, 2200));
await app.evaluate(() => {
  ['netlify-gate', 'license-gate', 'extconn-gate', 'firebase-gate', 'revoked-gate'].forEach(id => document.getElementById(id)?.remove());
  Object.assign(DB.business, {name: 'Casa Grupo', netlifySetupDone: true, extConnPromptSeen: true, tourSeen: true, categoryIconHintSeen: true, publicId: 'pubgrupo01'});
  DB.business.ownFirebase = {apiKey: 'fake', databaseURL: 'https://fake-default-rtdb.firebaseio.com'};
  DB.tables = [{id: 1, name: 'Mesa 1', plazas: 4}];
  DB.cartas = [{id: 1, nombre: 'Carta', secciones: [{id: 10, nombre: 'Principales', platos: [
    {id: 100, nombre: 'Pizza', precio: 10}, {id: 101, nombre: 'Ensalada', precio: 9}, {id: 102, nombre: 'Agua', precio: 2}]}]}];
  DB.activeCartaIds = [1];
  DB.tpvOrders = []; DB.sales = []; DB.pedidosMesaQr = [];
  DB.business.qrMesa = {activo: true, cobroLocal: true, cobroTarjeta: true, grupo: true, grupoMinPago: 5};
  window.__nube = {}; window.__borrado = []; window.__miembros = {};
  const oyentes = [];
  const ref = ruta => ({
    on: (ev, cb) => { if(/\/requests$/.test(ruta)) oyentes.push(cb); },
    set: v => { __nube[ruta] = JSON.parse(JSON.stringify(v)); return Promise.resolve(); },
    remove: () => { __borrado.push(ruta); delete __nube[ruta]; return Promise.resolve(); },
    once: () => { const m = ruta.match(/mesaGrupo\/[^/]+\/miembros\/(m\d+)$/); return Promise.resolve({val: () => (m ? (__miembros[m[1]] || null) : null)}); },
    child: () => ref(ruta + '/x'),
  });
  const fakeApp = {database: () => ({ref})};
  if(typeof firebase === 'undefined') window.firebase = {};
  espejoEnNubePropia = true;
  getPublicMirrorApp = () => Promise.resolve(fakeApp);
  comprobarSaturacionPublica = () => Promise.resolve();
  window.__empujar = req => new Promise(resolve => {
    const snap = {val: () => JSON.parse(JSON.stringify(req)), ref: {child: () => ({transaction: () => Promise.resolve({committed: true})}), remove: () => { resolve(); return Promise.resolve(); }}};
    oyentes.forEach(cb => cb(snap));
    setTimeout(() => resolve('TIEMPO'), 4000);
  });
  window.__pagos = {};
  window.fetch = async url => {
    const m = String(url).match(/gastrogoan\/pagos\/pubgrupo01\/([^.]+)\.json$/);
    return new Response(m ? JSON.stringify(__pagos[decodeURIComponent(m[1])] || null) : 'null');
  };
  pagoOnlineActivo = true;
  publicRequestsListenerAttached = false;
  initPublicRequestsListener();
  DB.tables.forEach(asegurarTokenMesa);
  window.__T = DB.tables[0].qrToken;
});
await new Promise(r => setTimeout(r, 300));
const TOKEN = await app.evaluate(() => __T);
const euros = x => Math.round(x * 100) / 100;

await caso('Reparto al céntimo: 10,00 € entre 3 = 3,34 + 3,33 + 3,33; con 10 % de descuento la suma es EXACTAMENTE el total', async () => {
  const r = await app.evaluate(() => {
    const o = {items: [{price: 10, qty: 1, comensal: 'm0', reparto: ['m2', 'm0', 'm1']}], descuentoPct: 0};
    const a = grupoCuenta(o);
    const o2 = {items: [{price: 10, qty: 1, comensal: 'm0', reparto: ['m0', 'm1', 'm2']}, {price: 7.25, qty: 2, comensal: 'm1'}, {price: 3, qty: 1}], descuentoPct: 10};
    const b = grupoCuenta(o2);
    return {a: ['m0', 'm1', 'm2'].map(s => a.slots[s].suyo), b: b.slots, bResto: b.resto};
  });
  assert.deepEqual(r.a, [3.34, 3.33, 3.33], 'el céntimo que sobra va al primer hueco por orden');
  const total = euros(r.b.m0.suyo + r.b.m1.suyo + r.b.m2.suyo + r.bResto);
  assert.equal(total, euros((10 + 14.5 + 3) * 0.9), 'con descuento la suma de las partes no es el total de la mesa: ' + total);
  assert.equal(r.bResto > 0, true, 'lo del camarero (sin dueño) desaparece del reparto');
  return '334/333/333 · con descuento ' + total;
});

await caso('Degradación: sin las reglas comprobadas (reglasGrupo ≠ true) el nodo de la mesa NO lleva `grupo` y la casilla apagada tampoco', async () => {
  const r = await app.evaluate(async () => {
    const t = DB.tables[0];
    reglasGrupo = null;
    const sin = cuentaPublicaMesa(t);
    reglasGrupo = false;
    const viejas = cuentaPublicaMesa(t);
    reglasGrupo = true; DB.business.qrMesa.grupo = false;
    const apagado = cuentaPublicaMesa(t);
    DB.business.qrMesa.grupo = true;
    espejoEnNubePropia = false;
    const plataforma = cuentaPublicaMesa(t);
    espejoEnNubePropia = true;
    const con = cuentaPublicaMesa(t);
    return {sin: sin.grupo, viejas: viejas.grupo, apagado: apagado.grupo, plataforma: plataforma.grupo, con: con.grupo, max: con.grupoMax, min: con.grupoMin};
  });
  assert.deepEqual([r.sin, r.viejas, r.apagado, r.plataforma], [undefined, undefined, undefined, undefined]);
  assert.equal(r.con, true); assert.equal(r.max, 12); assert.equal(r.min, 5);
  return 'solo con reglas OK + nube propia + casilla';
});

// Dos comensales con su hueco (el dueño del hueco es el uid que lo reclamó).
const pedido = (slot, uid, items) => ({type: 'pedido_mesa', mesaToken: TOKEN, slot, uid, items, createdAt: new Date().toISOString()});
await caso('Un pedido de un hueco verificado sale con su dueño; el precio manipulado lo corrige la carta; uno con el uid ajeno NO es de ese hueco', async () => {
  await app.evaluate(() => { __miembros.m0 = {uid: 'uidAna', n: 'Ana', ts: Date.now()}; __miembros.m1 = {uid: 'uidBruno', n: 'Bruno', ts: Date.now()}; });
  await app.evaluate(r => __empujar(r), pedido('m0', 'uidAna', [{platoId: 100, name: 'Pizza', price: 0.01, qty: 1, reparto: ['m1']}, {platoId: 102, name: 'Agua', price: 2, qty: 1}]));
  await app.evaluate(r => __empujar(r), pedido('m1', 'uidDeOtro', [{platoId: 101, name: 'Ensalada', price: 9, qty: 1}]));   // Mallory dice ser Bruno
  const r = await app.evaluate(() => (DB.pedidosMesaQr || []).map(p => ({est: p.estado, grupo: !!p.grupo, com: p.comensal, n: p.comensalNombre, lineas: p.items.map(l => ({p: l.price, c: l.comensal, r: l.reparto}))})));
  assert.equal(r.length, 2);
  const ana = r.find(x => x.com === 'm0'), mal = r.find(x => !x.grupo);
  assert.ok(ana && ana.n === 'Ana', JSON.stringify(r));
  assert.equal(ana.lineas[0].p, 10, 'el precio de 0,01 € ha entrado');
  assert.deepEqual(ana.lineas[0].r.sort(), ['m0', 'm1'], 'el plato compartido lleva al que lo pide y a su invitado');
  assert.ok(mal && mal.lineas[0].c === undefined, 'el uid ajeno ha conseguido el hueco de Bruno');
  assert.equal(ana.est, 'pendiente', 'el PRIMER pedido de un comensal lo revisa siempre el camarero');
  return 'Ana verificada · el suplantador, sin hueco';
});

await caso('Aceptado: la mesa entra en modo grupo y cada comensal debe lo suyo (Pizza compartida a 5 + 5; Agua de Ana)', async () => {
  const r = await app.evaluate(() => {
    pedidosMesaQrPendientes(1).forEach(p => { if(p.grupo) aceptarPedidoMesaQr(p.id, true); });
    const o = getOpenOrderForTable(1);
    const c = grupoCuenta(o);
    const pub = cuentaPublicaMesa(DB.tables[0]);
    return {grupo: o.grupo, ana: c.slots.m0, bruno: c.slots.m1, pub: pub.comensales, tbl: DB.tables[0].grupo};
  });
  assert.equal(r.grupo, true);
  assert.deepEqual([r.ana.suyo, r.ana.debe], [7, 7]);
  assert.deepEqual([r.bruno.suyo, r.bruno.debe], [5, 5]);
  assert.deepEqual(r.pub.m0, {debe: 7, pagado: 0, enCurso: 0}, 'los móviles leen lo que calcula la app');
  assert.ok(r.tbl && r.tbl.comensales.m0.n === 'Ana');
});

// «Pagar mi parte» de Bruno con propina
const pago = (slot, uid, ref, importe, propina) => ({type: 'pago_mesa', mesaToken: TOKEN, slot, uid, clientRef: ref, importe, propina, createdAt: new Date().toISOString()});
const confirmar = (ref, amount) => app.evaluate(async ([ref, amount]) => { __pagos[ref] = {amount, createdAt: new Date().toISOString()}; await comprobarPagosTarjeta(); }, [ref, amount]);
await caso('«Mi parte»: Bruno paga 5 € + 0,50 € de propina: se aplica su deuda, la propina va aparte y la mesa NO se cierra sola ni con todo pagado', async () => {
  await app.evaluate(r => __empujar(r), pago('m1', 'uidBruno', 'REFbruno0001', 5.5, 0.5));
  assert.equal(await app.evaluate(() => getOpenOrderForTable(1).pagosMesaQrPendientes[0].slot), 'm1');
  await confirmar('REFbruno0001', 5.5);
  await app.evaluate(r => __empujar(r), pago('m0', 'uidAna', 'REFana00001', 7, 0));
  await confirmar('REFana00001', 7);
  const r = await app.evaluate(() => { const o = getOpenOrderForTable(1); return {o: !!o, c: o && grupoCuenta(o).slots, pend: o && cuentaMesaQr(o).pendiente, prop: o && o.propinaPagadaOnline, pagos: o && o.pagosMesaQr.map(p => [p.slot, p.importe]), ventas: DB.sales.length}; });
  assert.ok(r.o, 'la mesa se cerró sola al cubrir lo pedido (Ana y Bruno han pagado, pero el grupo manda al camarero)');
  assert.deepEqual(r.pagos, [['m1', 5], ['m0', 7]]);
  assert.equal(r.prop, 0.5);
  assert.equal(r.pend, 0);
  assert.equal(r.c.m1.debe, 0); assert.equal(r.ventas, 0);
  return 'pendiente 0 y la mesa sigue abierta';
});

await caso('Paga de más, paga dos veces o con un hueco falso: nada se aplica de más; todo va a «Pagos sin pedido»', async () => {
  const r0 = await app.evaluate(() => (DB.unmatchedOnlinePayments || []).length);
  await app.evaluate(r => __empujar(r), pago('m1', 'uidBruno', 'REFbruno0002', 5, 0));
  await confirmar('REFbruno0002', 5);                           // ya no debe nada
  await app.evaluate(r => __empujar(r), pago('m0', 'uidDeOtro', 'REFfalso0001', 7, 0));
  await confirmar('REFfalso0001', 7);                           // uid que no es el dueño de m0
  const r = await app.evaluate(() => { const o = getOpenOrderForTable(1); return {pagado: cuentaMesaQr(o).pagado, sin: (DB.unmatchedOnlinePayments || []).map(u => [u.orderRef, u.amount])}; });
  assert.equal(r.pagado, 12.5, 'lo pagado cambió: ' + r.pagado);   // 12 de la cuenta + 0,5 de propina
  const nuevos = r.sin.slice(r0);
  assert.deepEqual(nuevos, [['REFbruno0002', 5], ['REFfalso0001', 7]]);
});

await caso('Pagar de menos: se aplica lo cobrado, la deuda queda; y un pago nunca pasa de lo que ese comensal debe', async () => {
  const r = await app.evaluate(async () => {
    const o = getOpenOrderForTable(1);
    o.items.push({platoId: 101, name: 'Ensalada', price: 9, qty: 1, comensal: 'm1', estado: 'cocina', marchada: 1});
    return grupoCuenta(o).slots.m1.debe;
  });
  assert.equal(r, 9);
  await app.evaluate(r => __empujar(r), pago('m1', 'uidBruno', 'REFbruno0003', 20, 0));
  await confirmar('REFbruno0003', 20);   // paga 20 debiendo 9
  const x = await app.evaluate(() => { const o = getOpenOrderForTable(1); return {debe: grupoCuenta(o).slots.m1.debe, sin: DB.unmatchedOnlinePayments.slice(-1)[0]}; });
  assert.equal(x.debe, 0);
  assert.equal(x.sin.amount, 11, 'el sobrante de 11 € tiene que ir a «Pagos sin pedido»');
});

await caso('Un hueco expulsado ya no pide ni paga «como» nadie; el camarero cierra la mesa cuando todo está cobrado', async () => {
  const r = await app.evaluate(async () => {
    grupoExpulsar(1, 'm1');
    const antes = DB.pedidosMesaQr.length;
    return {exp: DB.tables[0].grupo.expulsados.m1, pub: cuentaPublicaMesa(DB.tables[0]).expulsados};
  });
  assert.equal(r.exp, 'uidBruno'); assert.deepEqual(r.pub, {m1: 'uidBruno'});
  await app.evaluate(r => __empujar(r), pedido('m1', 'uidBruno', [{platoId: 102, name: 'Agua', price: 2, qty: 1}]));
  const p = await app.evaluate(() => DB.pedidosMesaQr.slice(-1)[0]);
  assert.ok(!p.grupo, 'el expulsado ha seguido pidiendo en su hueco');
  const cierre = await app.evaluate(() => {
    const o = getOpenOrderForTable(1);
    const panel = grupoPanelHtml(o);
    grupoCerrarMesa(o.id);
    return {panel: panel.includes('gr-cerrar') && panel.includes('Ana') && panel.includes('Bruno'), ventas: DB.sales.length, abierta: !!getOpenOrderForTable(1)};
  });
  assert.ok(cierre.panel, 'el panel del camarero no enseña a los comensales ni el botón de cerrar');
  assert.equal(cierre.ventas, 1, 'cerrar la mesa no la ha cobrado como una venta');
});

await caso('Mi Negocio: la casilla «Pedido en grupo» existe, el aviso de reglas sale en ámbar y guardar la tarjeta del QR NO borra el grupo', async () => {
  const r = await app.evaluate(() => {
    getCloudConfig = () => ({apiKey: 'x', databaseURL: 'https://x'}); getTenantId = () => 'T'; getPublicClientLink = () => 'https://r.test/?neg=p';
    reglasGrupo = false;
    const html = renderTableQrCard();
    saveDB = () => {}; syncPublicMirror = () => {}; renderMiNegocio = () => {};
    const antes = JSON.stringify(DB.business.qrMesa);
    saveQrMesaConfig();   // lo que pasa al tocar cualquier otra casilla de la tarjeta
    return {tiene: html.includes('id="mn-grupo-activo"'), aviso: /paso más en tu Firebase|one more step|pas més/.test(html) && html.includes('abrirAsistenteReglas'), grupo: DB.business.qrMesa.grupo, min: DB.business.qrMesa.grupoMinPago};
  });
  assert.ok(r.tiene, 'no hay casilla'); assert.ok(r.aviso, 'no avisa de las reglas ni ofrece el asistente');
  assert.equal(r.grupo, true); assert.equal(r.min, 5);
  const apagada = await app.evaluate(() => { const g = grupoMesaConfig(); DB.business.qrMesa = {activo: true, cobroLocal: true}; const x = grupoMesaConfig().activo; return x; });
  assert.equal(apagada, false, 'un negocio sin la opción la tiene encendida: tiene que venir APAGADA por defecto');
});

await caso('Sin errores de JavaScript', async () => { assert.deepEqual(errs.filter(e => !/Failed to fetch|NetworkError|firebase is not defined/i.test(e)), []); });

await browser.close(); web.kill();
const fallos = res.filter(x => !x).length;
console.log('\n' + '═'.repeat(64)); console.log(fallos ? `❌ ${fallos} fallaron` : `✅ los ${res.length} casos del grupo (app) pasaron`);
process.exit(fallos ? 1 : 0);
