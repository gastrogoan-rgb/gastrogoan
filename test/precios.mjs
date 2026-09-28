// Subidas de precio de proveedores (29/09). Antes el precio de un producto
// era un número que se sobrescribía: una subida no dejaba rastro, el gasto
// de un pedido se apuntaba con el precio de la Mega Lista y no con el del
// albarán, y nada avisaba. Aquí se fija el circuito entero.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'], headless:true});
const res = [];
async function caso(nombre, fn){
  try{ const d = await fn(); console.log(`✅ ${nombre}${d ? '  → ' + d : ''}`); res.push(true); }
  catch(e){ console.log(`❌ ${nombre}\n     ⤷ ${e.message}`); res.push(false); }
}
const page = await browser.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.setRequestInterception(true);
page.on('request', r => /firebase|gstatic|github|googleapis/.test(r.url()) ? r.abort() : r.continue());
await page.setViewport({width: 1100, height: 900});
await page.goto('http://localhost:8950/index.html', {waitUntil: 'domcontentloaded'});
await page.evaluate(() => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code: 'PRECIO01', tenantId: ggBizTenantId('PRECIO01')}));
  localStorage.setItem('gastrogoan_owner_login', '1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type: 'owner', ts: Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
});
await page.reload({waitUntil: 'domcontentloaded'});
await new Promise(r => setTimeout(r, 2200));
const ids = await page.evaluate(() => {
  ['netlify-gate', 'license-gate', 'extconn-gate', 'firebase-gate', 'revoked-gate'].forEach(id => document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone: true, extConnPromptSeen: true, tourSeen: true, categoryIconHintSeen: true});
  DB.business.ownFirebase = {apiKey: 'fake', databaseURL: 'https://fake-default-rtdb.firebaseio.com'};
  const aceite = {id: genId(), name: 'Aceite de oliva', category: 'Aceites', unit: 'l', supplier: 'Moncayo', price: 5.2, packQty: 5, packPrice: 26, iva: 10, area: 'cocina'};
  const harina = {id: genId(), name: 'Harina', category: 'Secos', unit: 'kg', supplier: 'Moncayo', price: 0.9, packQty: 1, packPrice: 0.9, iva: 4, area: 'cocina'};
  DB.ingredients.push(aceite, harina);
  // Consumo de los últimos 90 días: 120 l de aceite recibidos (40 l/mes).
  DB.purchaseOrders = DB.purchaseOrders || [];
  DB.purchaseOrders.push({id: genId(), supplier: 'Moncayo', date: addDaysStr(todayStr(), -30), estado: 'RECIBIDO', area: 'cocina', gvCreated: true,
    items: [{ingredientId: aceite.id, cantidad: 120, cantidadRecibida: 120, recibidoCheck: true}]});
  // Un plato que usa el aceite.
  DB.recipes.push({id: genId(), name: 'Croquetas de jamón', area: 'cocina', price: 9, ingredients: [{ingredientId: aceite.id, qty: 0.05, merma: 0}]});
  DB.preciosHistorial = [];
  return {aceite: aceite.id, harina: harina.id};
});

await caso('Un cambio de precio en la Mega Lista queda en el historial', async () => {
  const r = await page.evaluate((id) => {
    const ing = getIngredient(id);
    registrarCambioPrecio(ing, 5.93, 'megalista', ing.supplier);
    ing.price = 5.93;
    return DB.preciosHistorial[0];
  }, ids.aceite);
  assert.equal(r.antes, 5.2); assert.equal(r.despues, 5.93); assert.equal(r.pct, 14); assert.equal(r.origen, 'megalista');
  return '5,20 → 5,93 · +14 %';
});

await caso('Un producto nuevo (sin precio anterior) no ensucia el historial', async () => {
  const n = await page.evaluate(() => {
    const nuevo = {id: genId(), name: 'Sal', unit: 'kg', price: 0};
    registrarCambioPrecio(nuevo, 0.5, 'megalista');
    return DB.preciosHistorial.length;
  });
  assert.equal(n, 1);
  return 'sigue habiendo 1 entrada';
});

await caso('Al recibir, el precio del albarán actualiza el producto, el historial y el gasto real', async () => {
  const r = await page.evaluate((idH) => {
    const o = {id: genId(), supplier: 'Moncayo', date: todayStr(), estado: 'ENVIADO', area: 'cocina',
      items: [{ingredientId: idH, cantidad: 10, cantidadRecibida: null}]};
    DB.purchaseOrders.push(o);
    navigate('pedidos'); openPedido(o.id);
    const campo = document.querySelector('input[onchange^="updatePedidoLinePrecio"]');
    if(!campo) return {sinCampo: true};
    updatePedidoLinePrecio(0, '1.08');
    toggleRecepcionCheck(0, true);
    const gastosAntes = (DB.ge.variables || []).length;
    changePedidoEstado('RECIBIDO');
    const gasto = (DB.ge.variables || []).slice(gastosAntes).reduce((s, v) => s + (parseFloat(v.importe) || 0), 0);
    const h = DB.preciosHistorial[DB.preciosHistorial.length - 1];
    return {precio: getIngredient(idH).price, origen: h.origen, pct: h.pct, compra: o.items[0].precioCompra, gasto};
  }, ids.harina);
  assert.ok(!r.sinCampo, 'la recepción no enseña el campo de precio del albarán');
  assert.equal(r.precio, 1.08, 'la Mega Lista no se ha actualizado');
  assert.equal(r.origen, 'albaran');
  assert.equal(r.pct, 20);
  assert.equal(r.compra, 1.08);
  assert.ok(Math.abs(r.gasto - 10.8) < 0.01, 'el gasto debería ser 10 kg × 1,08 = 10,80 € y es ' + r.gasto);
  return 'harina 0,90 → 1,08 (+20 %) · gasto 10,80 €';
});

await caso('La subida sale en el aviso con su impacto al mes y los platos afectados', async () => {
  const r = await page.evaluate((idA) => {
    const lista = subidasDePrecio(14);
    const aceite = lista.find(x => x.ingredientId === idA);
    navigate('dashboard');
    const chip = document.getElementById('dashboard-attention').textContent.includes(t('dash.att.priceRises'));
    openSubidasPrecioModal();
    const modal = document.getElementById('modal-box').textContent;
    closeModal();
    return {n: lista.length, impacto: aceite && aceite.impactoMes, platos: aceite && aceite.platos, chip, modal: modal.includes('Aceite de oliva')};
  }, ids.aceite);
  assert.equal(r.n, 2);
  assert.ok(Math.abs(r.impacto - 29.2) < 0.01, 'impacto esperado 40 l × 0,73 € = 29,20 €/mes, sale ' + r.impacto);
  assert.deepEqual(r.platos, ['Croquetas de jamón']);
  assert.ok(r.chip && r.modal);
  return '+29,20 €/mes · Croquetas de jamón';
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
