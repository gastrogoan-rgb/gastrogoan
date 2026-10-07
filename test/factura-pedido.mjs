// La factura dentro del pedido a proveedor (7/10). La IA se intercepta con
// una factura escrita a mano: lo que se prueba es lo que hace la APP con
// ella — guardarla en el pedido, cuadrarla línea a línea (igual, sube, baja,
// cantidad distinta, falta, sobra), mover precios con historial, no
// duplicar el gasto y NO reescribir lo recibido. Servidor propio (8982).
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUERTO = Number(process.env.PF_PUERTO) || 8982;
const servidor = spawn('python3', ['-m', 'http.server', String(PUERTO), '--directory', raiz], {stdio: 'ignore'});
await new Promise(r => setTimeout(r, 800));
// Si el puerto lo sirve otra copia del repositorio, se probaría otro código.
const servido = await fetch(`http://localhost:${PUERTO}/js/operations.js`).then(r => r.text()).catch(() => '');
if(!servido.includes('function pfAbrir')){
  console.log(`❌ El puerto ${PUERTO} lo sirve otro directorio. Ciérralo o usa PF_PUERTO=<otro>.`);
  servidor.kill(); process.exit(1);
}

const scratch = path.join(raiz, 'test', '.scratch-factura-pedido');
fs.mkdirSync(scratch, {recursive: true});
const fotoPath = path.join(scratch, 'factura.jpg');
fs.writeFileSync(fotoPath, Buffer.from('/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=', 'base64'));

// Pedido: tomate 5 kg (2,00), queso 2 kg (12,00), aceite 3 L (5,00),
// sal 1 kg (1,00), harina 10 kg (1,00). La factura:
//  - tomate 5 kg a 2,40   → SUBE 20 %
//  - queso 2000 g = 21 €  → 10,50 €/kg, BAJA 12,5 %
//  - aceite 4 L a 5,00    → CANTIDAD distinta (se recibieron 3)
//  - sal                  → FALTA en la factura
//  - harina 10 kg a 1,00  → IGUAL
//  - bolsas 1 ud          → SOBRA (no estaba en el pedido)
const lineas = [
  {descripcion: 'TOMATE PERA', cantidad: 5, unidad: 'kg', precioUnitario: 2.4, descuento: 0, ivaPct: 4, total: 12},
  {descripcion: 'Queso manchego curado', cantidad: 2000, unidad: 'g', precioUnitario: 0.0105, descuento: 0, ivaPct: 10, total: 21},
  {descripcion: 'Aceite oliva virgen', cantidad: 4, unidad: 'L', precioUnitario: 5, descuento: 0, ivaPct: 10, total: 20},
  {descripcion: 'Harina de trigo', cantidad: 10, unidad: 'kg', precioUnitario: 1, descuento: 0, ivaPct: 4, total: 10},
  {descripcion: 'Bolsas kraft', cantidad: 1, unidad: 'ud', precioUnitario: 5, descuento: 0, ivaPct: 21, total: 5},
];
const r2 = v => Math.round(v * 100) / 100;
const FACTURA = {proveedor: 'Hortalizas Pepe SL', nif: 'b12345678', numFactura: 'FP-2026/0101', fecha: '2026-10-05', lineas,
  base: 68, ivas: [{pct: 4, base: 22, cuota: 0.88}, {pct: 10, base: 41, cuota: 4.1}, {pct: 21, base: 5, cuota: 1.05}]};
FACTURA.total = r2(68 + 0.88 + 4.1 + 1.05);

let respuesta = FACTURA, llamadas = 0;
const browser = await puppeteer.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'], headless: true});
const page = await browser.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
page.on('dialog', d => d.accept());
await page.setRequestInterception(true);
page.on('request', req => {
  const u = req.url();
  if(u.includes('generativelanguage.googleapis.com')){
    if(req.method() === 'OPTIONS'){
      req.respond({status: 204, headers: {'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST', 'access-control-allow-headers': 'content-type'}});
      return;
    }
    llamadas++;
    req.respond({status: 200, contentType: 'application/json', headers: {'access-control-allow-origin': '*'},
      body: JSON.stringify({candidates: [{content: {parts: [{text: JSON.stringify(respuesta)}]}, finishReason: 'STOP'}]})});
    return;
  }
  if(/firebase|gstatic|googleapis|github/.test(u)){ req.abort(); return; }
  req.continue();
});

await page.goto(`http://localhost:${PUERTO}/index.html`, {waitUntil: 'domcontentloaded'});
await page.evaluate(() => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code: 'FACPED01', tenantId: ggBizTenantId('FACPED01')}));
  localStorage.setItem('gastrogoan_owner_login', '1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type: 'owner', ts: Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
});
await page.reload({waitUntil: 'domcontentloaded'});
await new Promise(r => setTimeout(r, 2400));
await page.evaluate(() => {
  ['netlify-gate', 'license-gate', 'extconn-gate', 'firebase-gate', 'revoked-gate'].forEach(id => document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone: true, extConnPromptSeen: true, tourSeen: true, categoryIconHintSeen: true});
  DB.business.ownFirebase = {apiKey: 'fake', databaseURL: 'https://fake-default-rtdb.firebaseio.com'};
  DB.ingredients = [
    {id: 990001, name: 'Tomate pera', unit: 'kg', price: 2, iva: 4, category: 'Verduras', area: 'cocina'},
    {id: 990002, name: 'Queso manchego', unit: 'kg', price: 12, iva: 10, category: 'Lácteos', area: 'cocina'},
    {id: 990003, name: 'Aceite oliva', unit: 'L', price: 5, iva: 10, category: 'Aceites', area: 'cocina'},
    {id: 990004, name: 'Sal fina', unit: 'kg', price: 1, iva: 10, category: 'Especias', area: 'cocina'},
    {id: 990005, name: 'Harina trigo', unit: 'kg', price: 1, iva: 4, category: 'Harinas', area: 'cocina'},
  ];
  [990001, 990002, 990003, 990004, 990005].forEach(id => { DB.stock[id] = {qty: 0, min: 0}; });
  DB.preciosHistorial = [];
  DB.ge.variables = [];
  DB.purchaseOrders = [];
});
await page.evaluate(() => idrGuardarConfig('google', 'clave-de-prueba', 'gemini-test'));

let ok = 0, fallos = 0;
async function caso(nombre, fn){
  try{ const d = await fn(); ok++; console.log('✅ ' + nombre + (d ? '  → ' + d : '')); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ' + (e.message || e)); }
}
const espera = ms => new Promise(r => setTimeout(r, ms));
// Crea un pedido y, si se pide, lo recibe con el flujo de verdad (ticks).
async function crearPedido(recibir){
  return page.evaluate((recibir) => {
    const o = {id: genId(), supplier: 'Hortalizas Pepe SL', date: todayStr(), estado: 'ENVIADO', area: 'cocina', enviadoEn: todayStr(),
      items: [[990001, 5], [990002, 2], [990003, 3], [990004, 1], [990005, 10]].map(([ingredientId, cantidad]) => ({ingredientId, cantidad, cantidadRecibida: null}))};
    DB.purchaseOrders.push(o);
    navigate('pedidos'); openPedido(o.id);
    if(recibir){
      o.items.forEach((_, i) => toggleRecepcionCheck(i, true));
      changePedidoEstado('RECIBIDO');
    }
    return o.id;
  }, recibir);
}
async function adjuntar(id){
  await page.evaluate(id => { openPedido(id); }, id);
  await espera(100);
  const boton = await page.$('#pf-adjuntar');
  if(!boton) throw new Error('no hay botón «Adjuntar factura» en el pedido');
  await boton.click();
  await espera(150);
  const input = await page.$('#pf-input');
  await input.uploadFile(fotoPath);
}

let idA;
await caso('Pedido recibido: tiene el botón «Adjuntar factura» y genera su gasto', async () => {
  idA = await crearPedido(true);
  const r = await page.evaluate(id => ({
    boton: !!document.getElementById('pf-adjuntar') && document.getElementById('pf-adjuntar').offsetParent !== null,
    gastos: DB.ge.variables.filter(v => v.pedidoId === id).length,
  }), idA);
  assert.ok(r.boton, 'no se ve el botón en un pedido recibido');
  assert.ok(r.gastos > 0, 'la recepción no generó gasto');
  return r.gastos + ' líneas de gasto de la recepción';
});

await caso('El cuadre marca igual, subida, bajada, cantidad distinta, falta y sobra', async () => {
  await adjuntar(idA);
  await page.waitForSelector('#pf-confirmar', {timeout: 8000});
  const r = await page.evaluate(() => {
    const fila = id => { const el = document.querySelector(`.pf-fila[data-ing="${id}"]`); return el ? [...el.classList].find(c => c.startsWith('pf-') && c !== 'pf-fila') : null; };
    return {
      tomate: fila(990001), queso: fila(990002), aceite: fila(990003), sal: fila(990004), harina: fila(990005),
      sobra: document.querySelectorAll('.pf-fila.pf-sobra').length,
      textoTomate: document.querySelector('.pf-fila[data-ing="990001"]')?.textContent.replace(/\s+/g, ' '),
      textoQueso: document.querySelector('.pf-fila[data-ing="990002"]')?.textContent.replace(/\s+/g, ' '),
      totales: document.getElementById('pf-totales')?.textContent.replace(/\s+/g, ' '),
      ajuste: !!document.getElementById('pf-ajuste'),
    };
  });
  assert.equal(r.tomate, 'pf-sube', 'el tomate debería subir');
  assert.equal(r.queso, 'pf-baja', 'el queso debería bajar');
  assert.equal(r.aceite, 'pf-cantidad', 'el aceite tiene otra cantidad');
  assert.equal(r.sal, 'pf-falta', 'la sal falta en la factura');
  assert.equal(r.harina, 'pf-igual', 'la harina cuadra');
  assert.equal(r.sobra, 1, 'las bolsas no estaban en el pedido');
  assert.ok(/20/.test(r.textoTomate), 'no dice el % de la subida: ' + r.textoTomate);
  assert.ok(/12,5|12\.5/.test(r.textoQueso), 'no dice el % de la bajada: ' + r.textoQueso);
  assert.ok(r.totales && r.totales.includes('74,03') && r.totales.includes('64,80'), 'no compara los totales: ' + r.totales);
  assert.ok(r.ajuste, 'no ofrece corregir el stock con un ajuste explícito');
  return 'igual · sube · baja · cantidad · falta · sobra';
});

await caso('Confirmar: sube y baja precios con historial, no duplica el gasto, no toca lo recibido', async () => {
  const antes = await page.evaluate(id => {
    const o = getPurchaseOrder(id);
    return {recibidas: o.items.map(l => l.cantidadRecibida), stock: Object.fromEntries([990001, 990002, 990003, 990004, 990005].map(i => [i, DB.stock[i].qty])),
      totalGastos: DB.ge.variables.length, delPedido: DB.ge.variables.filter(v => v.pedidoId === id).map(v => v.id)};
  }, idA);
  await page.evaluate(() => pfConfirmar());
  await espera(300);
  const r = await page.evaluate(id => {
    const o = getPurchaseOrder(id);
    const gv = DB.ge.variables.filter(v => v.pedidoId === id);
    return {
      recibidas: o.items.map(l => l.cantidadRecibida), estado: o.estado,
      stock: Object.fromEntries([990001, 990002, 990003, 990004, 990005].map(i => [i, DB.stock[i].qty])),
      tomate: getIngredient(990001).price, queso: getIngredient(990002).price, aceite: getIngredient(990003).price,
      hist: DB.preciosHistorial.map(h => [h.ingredientId, h.antes, h.despues, h.origen]),
      nGv: gv.length, totalGv: gv.reduce((s, v) => s + v.importe, 0), sinPedido: DB.ge.variables.filter(v => !v.pedidoId).length,
      todosNum: gv.every(v => v.numFactura === 'FP-2026/0101' && v.nifProveedor === 'B12345678' && v.facturaId),
      factura: o.factura && {num: o.factura.numFactura, foto: !!facturaAdjunta(o.factura.facturaId), difs: (o.factura.cuadre || []).filter(c => c.tipo !== 'igual').length},
      tarjeta: document.getElementById('pf-num')?.textContent, difsVisibles: document.querySelectorAll('#pf-difs .pf-dif').length,
      subidas: subidasDePrecio(30).map(x => x.ingredientId),
    };
  }, idA);
  assert.deepEqual(r.recibidas, antes.recibidas, 'se pisaron las cantidades recibidas');
  assert.deepEqual(r.stock, antes.stock, 'el stock cambió sin pedir el ajuste');
  assert.equal(r.estado, 'RECIBIDO');
  assert.equal(r.tomate, 2.4, 'la subida no se aplicó');
  assert.equal(r.queso, 10.5, 'la bajada no se aplicó');
  assert.equal(r.aceite, 5, 'el aceite no cambió de precio y se tocó');
  assert.deepEqual(r.hist, [[990001, 2, 2.4, 'albaran'], [990002, 12, 10.5, 'albaran']], 'el historial no recoge subida y bajada');
  assert.ok(r.subidas.includes(990001), 'la subida no sale en el aviso de subidas');
  assert.equal(r.sinPedido, 0, 'se creó un gasto suelto (duplicado)');
  assert.equal(Math.round(r.totalGv * 100) / 100, 68, 'el gasto del pedido no es el de la factura');
  assert.ok(r.todosNum, 'el gasto no cita nº, NIF y adjunto');
  assert.ok(r.factura && r.factura.num === 'FP-2026/0101' && r.factura.foto, 'la factura no quedó dentro del pedido');
  assert.equal(r.factura.difs, 5, 'no anotó las diferencias');
  assert.equal(r.tarjeta, 'FP-2026/0101', 'la factura no se ve desde el pedido');
  assert.equal(r.difsVisibles, 5, 'el pedido no enseña las diferencias');
  return `gasto ${r.nGv} líneas = 68 € · historial ${r.hist.length}`;
});

await caso('Ajuste de stock explícito: corrige el stock aparte sin tocar lo recibido', async () => {
  const idB = await crearPedido(true);
  await adjuntar(idB);
  await page.waitForSelector('#pf-ajuste', {timeout: 8000});
  const r = await page.evaluate(id => {
    const antes = DB.stock[990003].qty;
    const c = document.getElementById('pf-ajuste'); c.checked = true; c.dispatchEvent(new Event('change'));
    pfConfirmar();
    const o = getPurchaseOrder(id);
    return {antes, despues: DB.stock[990003].qty, recibida: o.items[2].cantidadRecibida, ajuste: o.factura.ajusteStock,
      gv: DB.ge.variables.filter(v => v.pedidoId === id).reduce((s, v) => s + v.importe, 0)};
  }, idB);
  assert.equal(r.despues - r.antes, 1, 'el aceite debería sumar 1 L (4 facturados − 3 recibidos)');
  assert.equal(r.recibida, 3, 'se pisó la cantidad recibida');
  assert.ok(Array.isArray(r.ajuste) && r.ajuste[0].delta === 1, 'no anota el ajuste');
  return `aceite +1 L, recibida sigue en ${r.recibida}`;
});

await caso('Pedido sin recibir: la factura se guarda y el gasto nace UNA vez, al recibir, con sus importes', async () => {
  const idC = await crearPedido(false);
  await adjuntar(idC);
  await page.waitForSelector('#pf-confirmar', {timeout: 8000});
  const r = await page.evaluate(id => {
    pfConfirmar();
    const antes = DB.ge.variables.filter(v => v.pedidoId === id).length;
    openPedido(id);
    getPurchaseOrder(id).items.forEach((_, i) => toggleRecepcionCheck(i, true));
    changePedidoEstado('RECIBIDO');
    const gv = DB.ge.variables.filter(v => v.pedidoId === id);
    return {antes, n: gv.length, total: gv.reduce((s, v) => s + v.importe, 0), num: gv.every(v => v.numFactura === 'FP-2026/0101')};
  }, idC);
  assert.equal(r.antes, 0, 'creó el gasto antes de recibir (se duplicaría)');
  assert.equal(Math.round(r.total * 100) / 100, 68, 'el gasto no salió de la factura: ' + r.total);
  assert.ok(r.num, 'el gasto no cita la factura');
  return `${r.n} líneas, 68 €`;
});

await caso('Sin clave de IA: se adjunta igual (nº, fecha, NIF) y explica cómo activarla', async () => {
  await page.evaluate(() => { try{ idrBorrarConfig(); }catch(e){} });
  const idD = await crearPedido(true);
  const llamadasAntes = llamadas;
  await page.evaluate(id => { openPedido(id); document.getElementById('pf-adjuntar').click(); }, idD);
  await espera(150);
  const aviso = await page.evaluate(() => ({texto: document.getElementById('pf-sin-clave')?.textContent || '', input: !!document.getElementById('pf-input')}));
  assert.ok(aviso.texto.includes('clave'), 'no explica cómo activar la lectura');
  assert.ok(aviso.input, 'sin clave no deja adjuntar');
  await (await page.$('#pf-input')).uploadFile(fotoPath);
  await page.waitForSelector('#pf-manual', {timeout: 5000});
  const r = await page.evaluate(id => {
    const n = document.getElementById('pf-f-num'); n.value = 'MAN-7'; n.dispatchEvent(new Event('change'));
    pfConfirmar();
    const o = getPurchaseOrder(id);
    const gv = DB.ge.variables.filter(v => v.pedidoId === id);
    return {leida: o.factura.leida, foto: !!facturaAdjunta(o.factura.facturaId), num: o.factura.numFactura, gvNum: gv.length && gv.every(v => v.numFactura === 'MAN-7'), sueltos: DB.ge.variables.filter(v => !v.pedidoId).length};
  }, idD);
  assert.equal(llamadas, llamadasAntes, 'llamó a la IA sin clave');
  assert.equal(r.leida, false);
  assert.ok(r.foto, 'el adjunto no quedó en el pedido');
  assert.equal(r.num, 'MAN-7');
  assert.ok(r.gvNum, 'el gasto del pedido no se enlazó con la factura');
  assert.equal(r.sueltos, 0, 'creó un gasto duplicado');
});

await caso('Impacto al mes: cuenta también las compras apuntadas por factura suelta', async () => {
  const r = await page.evaluate(() => {
    const antes = consumoMensualCompras(990004);
    DB.ge.variables.push({id: genId(), mes: 9, año: 2026, categoria: 'MATERIA PRIMA', proveedor: 'X', importe: 9, iva: 10, fecha: todayStr(), origen: 'factura-foto', compras: [{ingredientId: 990004, qty: 9}]});
    return {antes, despues: consumoMensualCompras(990004)};
  });
  assert.equal(Math.round((r.despues - r.antes) * 100) / 100, 3, '9 kg en 90 días deberían sumar 3 kg/mes');
});

await caso('Sin errores de JavaScript', async () => { assert.deepEqual(errs, []); });

await browser.close();
servidor.kill();
fs.rmSync(scratch, {recursive: true, force: true});
// todo.sh busca este texto: solo se escribe si han pasado TODOS.
console.log(fallos ? `\n${fallos} de ${ok + fallos} casos FALLARON` : `\nLos ${ok}: todos los casos de factura-pedido pasaron`);
process.exit(fallos ? 1 : 0);
