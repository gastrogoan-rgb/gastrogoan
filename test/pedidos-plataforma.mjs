// Plan 360º · pedidos de plataformas externas (Glovo, Uber Eats…) que llegan por el buzón (17/11).
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { normalizar } from '../worker/pedidos-externos-worker.js';
let ok = 0, mal = 0;
const caso = async (n, f) => { try{ await f(); console.log('✅ ' + n); ok++; }catch(e){ console.log('❌ ' + n + '\n     ⤷ ' + e.message); mal++; } };
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'], headless:true});
const page = await browser.newPage();
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(() => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'PLATAF1', tenantId: ggBizTenantId('PLATAF1')}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r => setTimeout(r, 2000));
const r = await page.evaluate(() => {
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  DB.tpvOrders = [];
  const req = {type:'pedido', plataforma:'glovo', ref:'G-1001', tipo:'domicilio', clienteNombre:'Marta', clienteTelefono:'600111222', clienteDireccion:'C/ Mayor 5', hora:'21:30', total:24.5, comision:5.1,
    items:[{nombre:'Hamburguesa', cantidad:2, precio:9.5, notas:'sin cebolla'}, {nombre:'Patatas', cantidad:1, precio:5.5}]};
  const a = recibirPedidoPlataforma(req);
  const b = recibirPedidoPlataforma(JSON.parse(JSON.stringify(req)));              // reintento de la plataforma: mismo pedido
  const o = DB.tpvOrders[0];
  const c = recibirPedidoPlataforma({type:'pedido', plataforma:'ubereats', ref:'U-7', tipo:'recoger', items:[{nombre:'Pizza', cantidad:1, precio:11}]});
  const sinLineas = recibirPedidoPlataforma({type:'pedido', plataforma:'glovo', ref:'X', items:[]});
  const raro = recibirPedidoPlataforma({type:'pedido', plataforma:'<img>GLOVO!!', ref:'R', items:[{nombre:'<b>x</b>', cantidad:-5, precio:'abc'}]});
  return {a, b, c, sinLineas, raro, n: DB.tpvOrders.length, o: {tipo:o.tipo, status:o.status, plat:o.plataforma, ref:o.plataformaRef, items:o.items.map(l => [l.name, l.qty, l.price]), com:o.comisionPlataforma, tot:o.totalPlataforma, pagado:o.pagado, metodo:o.metodoPagoLocal, hora:o.time}, o2tipo: DB.tpvOrders[1].tipo, rarosPlat: DB.tpvOrders[2] && DB.tpvOrders[2].plataforma, rarosItem: DB.tpvOrders[2] && DB.tpvOrders[2].items[0], chip: plataformaChip(o), chipVacio: plataformaChip({})};
});
await caso('Un pedido de Glovo del buzón crea el pedido por ACEPTAR (nunca entra solo en cocina), con su canal y su referencia', async () => {
  assert.equal(r.a, true); assert.equal(r.o.status, 'pendiente-online'); assert.equal(r.o.plat, 'glovo'); assert.equal(r.o.ref, 'G-1001'); assert.equal(r.o.tipo, 'delivery'); assert.equal(r.o.hora, '21:30');
});
await caso('Las líneas llegan tal cual la plataforma las da (nombre, cantidad y precio), sin pasar por la carta del negocio', async () => {
  assert.deepEqual(r.o.items, [['Hamburguesa', 2, 9.5], ['Patatas', 1, 5.5]]);
});
await caso('La plataforma cobra: el pedido va como pagado, con su comisión y su total', async () => { assert.equal(r.o.pagado, true); assert.equal(r.o.metodo, 'plataforma'); assert.equal(r.o.com, 5.1); assert.equal(r.o.tot, 24.5); });
await caso('Si la plataforma reintenta el aviso (hasta 3 veces) no se duplica el pedido', async () => { assert.equal(r.b, false); assert.equal(r.n, 3); });
await caso('«recoger» pasa a para llevar; sin líneas no se crea nada', async () => { assert.equal(r.o2tipo, 'takeaway'); assert.equal(r.sinLineas, false); });
await caso('Datos raros no rompen nada: canal saneado, cantidad mínima 1, precio no numérico = 0', async () => { assert.equal(r.rarosPlat, 'imgglovo'); assert.equal(r.rarosItem.qty, 1); assert.equal(r.rarosItem.price, 0); });
await caso('La ficha lleva la etiqueta GLOVO; un pedido propio no lleva ninguna', async () => { assert.ok(/GLOVO/.test(r.chip)); assert.equal(r.chipVacio, ''); });
// Puente (Worker): normalizar deja solo campos conocidos y con tope
const n = normalizar({publicId:'x', plataforma:'Glovo!', ref:'  A1 ', tipo:'Recoger', total:'12,5', items:[{name:'Pan', qty:'3', price:'1,5'}, {nombre:''}], malo:'<script>', clienteNombre:'x'.repeat(500)});
await caso('El puente normaliza: canal en minúsculas, coma decimal, tipo, sin campos desconocidos y con tope de longitud', async () => {
  assert.equal(n.plataforma, 'glovo'); assert.equal(n.ref, 'A1'); assert.equal(n.tipo, 'recoger'); assert.equal(n.total, 12.5);
  assert.deepEqual(n.items, [{nombre:'Pan', cantidad:3, precio:1.5, notas:''}]); assert.ok(!('malo' in n)); assert.equal(n.clienteNombre.length, 80); assert.equal(n.type, 'pedido'); assert.ok(n.createdAt > 0);
});
await browser.close();
console.log(mal ? '\n❌ ' + mal + ' caso(s) fallaron' : '\n✅ Pedidos de plataformas: ' + ok + ' casos en orden');
process.exit(mal ? 1 : 0);
