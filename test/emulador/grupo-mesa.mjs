/* Pedido en grupo en la mesa, de punta a punta contra el EMULADOR oficial con las reglas REALES (27/11): la tablet (app del negocio) y DOS
 * comensales + un ajeno, cada uno en su contexto de navegador (cada uno es un aparato con su propia sesión anónima de Firebase).
 *   · la sonda de reglas del grupo pasa con las reglas reales y la app publica `grupo:true` en el nodo de la mesa;
 *   · cada comensal reclama su hueco (uids distintos) y VE el borrador del otro por la nube;
 *   · el pedido de Ana llega a la tablet con su dueño verificado contra la nube; un ajeno que dice ser Bruno no consigue su hueco;
 *   · el pago de «mi parte» se aplica con el hueco de quien lo anunció, la mesa NO se cierra sola y el comensal lo ve por la nube;
 *   · al cerrar la mesa, la tablet limpia el grupo (nadie ve los fantasmas de la cuadrilla anterior).
 * Stripe: no hay Worker aquí; el pago se anuncia por el buzón real y la «confirmación del banco» se aplica llamando a aplicarPagoMesaQr. */
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const CODE = 'EMUGRP01', NS = 'demo-gastrogoan', DB_NEGOCIO = `http://127.0.0.1:9000/?ns=${NS}`;
const BASE = 'http://app.test:8951';
const browser = await puppeteer.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--host-resolver-rules=MAP app.test 127.0.0.1'], headless: true});
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const w = ms => new Promise(r => setTimeout(r, ms));
async function nueva(){
  const ctx = await (browser.createBrowserContext ? browser.createBrowserContext() : browser.createIncognitoBrowserContext());
  const p = await ctx.newPage(); await p.setViewport({width: 390, height: 900}); await p.setCacheEnabled(false);
  p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.setRequestInterception(true);
  p.on('request', req => {
    const m = req.url().match(/gstatic\.com\/firebasejs\/[\d.]+\/(firebase-[a-z-]+\.js)/);
    if(m) return req.continue({url: 'http://localhost:8951/__sdk/' + m[1]});
    let host = ''; try{ host = new URL(req.url()).hostname; }catch(e){}
    if(host !== '127.0.0.1' && host !== 'localhost' && host !== 'app.test' && /googleapis|raw.githubusercontent|qrserver|workers\.dev/.test(req.url())) return req.abort();
    req.continue();
  });
  await p.evaluateOnNewDocument(() => { try{ localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0, 10)); }catch(e){} });
  return p;
}
const app = await nueva();
await app.goto(BASE + '/index.html', {waitUntil: 'domcontentloaded'});
await app.evaluate(() => (typeof dbReadyPromise !== 'undefined') ? dbReadyPromise : null).catch(() => {});
await app.evaluate(async ([code, dburl]) => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
  localStorage.setItem('gastrogoan_owner_login', JSON.stringify({user: 'jefe', authKey: 'k'.repeat(20), pinHash: 'h'}));
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type: 'owner', ts: Date.now()}));
  Object.assign(DB.business, {name: 'Casa Paco', netlifySetupDone: true, extConnPromptSeen: true, tourSeen: true, categoryIconHintSeen: true});
  DB.business.ownFirebase = {apiKey: 'fake-api-key', databaseURL: dburl};
  DB.tables = [{id: 1, name: 'Mesa 1', zona: 'Salón', plazas: 4}];
  DB.cartas = [{id: 1, nombre: 'Carta', secciones: [{id: 10, nombre: 'Principales', platos: [{id: 100, nombre: 'Pizza', precio: 10}, {id: 101, nombre: 'Ensalada', precio: 9}]}]}];
  DB.activeCartaIds = [1];
  DB.business.qrMesa = {activo: true, cobroLocal: true, aceptaCamarero: false, grupo: true, grupoMinPago: 5};
  await saveDB();
}, [CODE, DB_NEGOCIO]);
await app.reload({waitUntil: 'domcontentloaded'}); await w(9000);
const publicId = await app.evaluate(() => getPublicId());
const TOKEN = await app.evaluate(() => { DB.tables.forEach(asegurarTokenMesa); saveDB(); return DB.tables[0].qrToken; });
const admin = async ruta => (await (await fetch(`http://127.0.0.1:9000/gastrogoan/public/${publicId}/${ruta}.json?ns=${NS}`, {headers: {Authorization: 'Bearer owner'}})).json());

await caso('Con las reglas reales la sonda del grupo pasa y la app publica `grupo:true` en la mesa', async () => {
  assert.equal(await app.evaluate(() => espejoEnNubePropia), true);
  assert.equal(await app.evaluate(() => comprobarReglasGrupo()), true, 'la sonda no pasa con las reglas reales: ' + JSON.stringify(await app.evaluate(() => reglasGrupoFallo)));
  await app.evaluate(() => syncPublicMirror()); await w(3500);
  const n = await admin('mesaQr/' + TOKEN);
  assert.equal(n && n.grupo, true, 'el nodo de la mesa no lleva grupo: ' + JSON.stringify(n));
  assert.equal(n.grupoMax, 12);
});

const ana = await nueva(), bruno = await nueva(), mal = await nueva();
const url = `${BASE}/reservagastrogoan.html?neg=${publicId}&mesa=${TOKEN}`;
for(const p of [ana, bruno, mal]){ await p.goto(url, {waitUntil: 'domcontentloaded'}); }
await w(9000);
const uid = p => p.evaluate(() => firebase.auth().currentUser && firebase.auth().currentUser.uid);

await caso('Cada comensal ve la tarjeta de grupo y reclama SU hueco con SU uid', async () => {
  for(const p of [ana, bruno]) assert.equal(await p.evaluate(() => !!document.getElementById('gr-nombre')), true, 'no sale el formulario de grupo');
  await ana.evaluate(() => { document.getElementById('gr-nombre').value = 'Ana'; grUnirme(); }); await w(2500);
  await bruno.evaluate(() => { document.getElementById('gr-nombre').value = 'Bruno'; grUnirme(); }); await w(2500);
  const m = (await admin('mesaGrupo/' + TOKEN + '/miembros')) || {};
  assert.deepEqual(Object.keys(m).sort(), ['m0', 'm1']);
  assert.equal(m.m0.uid, await uid(ana)); assert.equal(m.m1.uid, await uid(bruno));
  assert.notEqual(m.m0.uid, m.m1.uid);
});

await caso('El borrador de Ana llega a Bruno por la nube (sin precios en la nube)', async () => {
  await ana.evaluate(() => { const p = DB.cartas[0].secciones[0].platos[0]; changeCartQty(p.id, 10, 2, p.nombre, 10); });
  await w(3000);
  const b = await admin('mesaGrupo/' + TOKEN + '/carritos/m0');
  assert.ok(b && JSON.stringify(b).indexOf('price') < 0 && !/"p":"?10"?[,}]/.test(JSON.stringify(b).replace('"p":"100"', '')), 'el nodo lleva precio: ' + JSON.stringify(b));
  const t = await bruno.evaluate(() => document.getElementById('gr-card').innerText);
  assert.ok(/Ana/.test(t) && /Pizza/.test(t) && /2×/.test(t), 'Bruno no ve lo que elige Ana: ' + t.replace(/\n/g, ' | '));
});

await caso('El pedido de Ana entra en la tablet con su dueño VERIFICADO; el ajeno que dice ser Bruno no consigue su hueco', async () => {
  await ana.evaluate(() => { document.getElementById('o-privacy-consent').checked = true; submitMesaQrOrder(); });
  const malUid = await uid(mal);
  await mal.evaluate(([tok]) => pushSolicitud({type: 'pedido_mesa', mesaToken: tok, slot: 'm1', uid: firebase.auth().currentUser.uid, items: [{platoId: 101, name: 'Ensalada', price: 9, qty: 1}], createdAt: new Date().toISOString()}), [TOKEN]);
  await w(5000);
  const diag = JSON.stringify({nube: Object.values((await admin('requests')) || {}).map(x => Object.keys(x).join(',')), listener: await app.evaluate(() => publicRequestsListenerAttached), errs: app.errs.slice(0, 3), webErr: ana.errs.slice(0, 3)});
  const r = await app.evaluate(() => ({ped: (DB.pedidosMesaQr || []).map(p => ({com: p.comensal, n: p.comensalNombre, est: p.estado})), o: (getOpenOrderForTable(1) || {}).items}));
  const deAna = r.ped.find(p => p.com === 'm0');
  assert.ok(deAna && deAna.n === 'Ana', 'no llegó el pedido de Ana verificado: ' + JSON.stringify(r.ped) + diag);
  assert.equal(r.ped.filter(p => p.com === 'm1').length, 0, 'el ajeno ha pedido «como» Bruno');
  assert.equal(r.ped.length, 2, 'el pedido del ajeno debería llegar, pero SIN hueco: ' + JSON.stringify(r.ped));
  // El primer pedido de un comensal nuevo lo revisa el camarero aunque el negocio mande «directo a cocina»
  assert.equal(deAna.est, 'pendiente');
  await app.evaluate(() => { (DB.pedidosMesaQr || []).filter(p => p.grupo && p.estado === 'pendiente').forEach(p => aceptarPedidoMesaQr(p.id, true)); saveDB(); syncPublicMirror(); });
  await w(3500);
  const o = await app.evaluate(() => { const o = getOpenOrderForTable(1); return {grupo: o.grupo, c: grupoCuenta(o).slots}; });
  assert.equal(o.grupo, true); assert.equal(o.c.m0.debe, 20);
  const n = await admin('mesaQr/' + TOKEN);
  assert.deepEqual(n.comensales.m0, {debe: 20, pagado: 0, enCurso: 0}, 'lo que debe Ana lo publica la app: ' + JSON.stringify(n.comensales));
});

await caso('«Pagar mi parte»: Ana anuncia su pago por el buzón real; al confirmarlo el banco se aplica a SU hueco, Bruno y Ana lo ven, y la mesa sigue abierta', async () => {
  await ana.evaluate(() => { const ref = genClientRef(); window.__ref = ref; return pushSolicitud({type: 'pago_mesa', mesaToken: qrMesaToken, clientRef: ref, importe: 21, propina: 1, slot: grSlot, uid: grUid(), createdAt: new Date().toISOString()}); });
  await w(4000);
  const ref = await ana.evaluate(() => window.__ref);
  const pend = await app.evaluate(() => getOpenOrderForTable(1).pagosMesaQrPendientes);
  assert.equal(pend.length, 1); assert.equal(pend[0].slot, 'm0'); assert.equal(pend[0].propina, 1);
  await app.evaluate(r => { aplicarPagoMesaQr({orderRef: r, createdAt: new Date().toISOString()}, 21, () => {}); saveDB(); syncPublicMirror(); }, ref);
  await w(3500);
  const o = await app.evaluate(() => { const o = getOpenOrderForTable(1); return {abierta: !!o, pend: cuentaMesaQr(o).pendiente, propina: o.propinaPagadaOnline, ventas: DB.sales.length}; });
  assert.deepEqual(o, {abierta: true, pend: 0, propina: 1, ventas: 0});
  const t = await ana.evaluate(() => document.getElementById('gr-pago').innerText);
  assert.match(t, /pagada|Gracias/i, 'Ana no ve que su parte está pagada: ' + t);
});

await caso('Al cerrar la mesa la tablet limpia el grupo: ni miembros ni borradores de la cuadrilla anterior', async () => {
  await app.evaluate(() => grupoCerrarMesa(getOpenOrderForTable(1).id)); await w(500);
  await app.evaluate(() => { saveDB(); syncPublicMirror(); }); await w(6000);
  assert.equal(await app.evaluate(() => !!getOpenOrderForTable(1)), false, 'la mesa no se ha cerrado');
  const g = await admin('mesaGrupo/' + TOKEN);
  assert.equal(g, null, 'quedan datos del grupo anterior: ' + JSON.stringify(g));
  const n = await admin('mesaQr/' + TOKEN);
  assert.equal(n && n.grupo, true, 'tras limpiar, la mesa tiene que volver a ofrecer el grupo (la siguiente cuadrilla)');
});

for(const p of [app, ana, bruno, mal]) await caso('Sin errores de JavaScript', async () => { assert.deepEqual(p.errs.filter(e => !/network|offline/i.test(e)), []); });
await browser.close();
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ el pedido en grupo funciona de punta a punta con las reglas reales');
process.exit(fallos ? 1 : 0);
