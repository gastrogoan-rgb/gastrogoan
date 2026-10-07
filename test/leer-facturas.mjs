// Leer facturas de proveedor con foto o PDF (7/10). La llamada a la IA se
// intercepta con una respuesta escrita a mano: lo que se prueba es lo que
// hace la APP con ella — casar líneas, cazar descuadres, guardar el gasto
// con nº de factura, mover el precio dejando historial y entrar el stock
// solo si se pide. Levanta su propio servidor (8962) para no chocar con
// las pruebas que usan el 8950.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUERTO = Number(process.env.LF_PUERTO) || 8962;
const servidor = spawn('python3', ['-m', 'http.server', String(PUERTO), '--directory', raiz], {stdio: 'ignore'});
await new Promise(r => setTimeout(r, 800));
// Si el puerto ya lo tenía otro servidor (otra copia del repositorio), las
// pruebas mirarían un código que no es este: mejor decirlo claro.
const servido = await fetch(`http://localhost:${PUERTO}/js/operations.js`).then(r => r.text()).catch(() => '');
if(!servido.includes('function leerFacturaAbrir')){
  console.log(`❌ El puerto ${PUERTO} lo sirve otro directorio. Ciérralo o usa LF_PUERTO=<otro>.`);
  servidor.kill(); process.exit(1);
}

const scratch = path.join(raiz, 'test', '.scratch-leer-facturas');
fs.mkdirSync(scratch, {recursive: true});
const fotoPath = path.join(scratch, 'factura.jpg');
fs.writeFileSync(fotoPath, Buffer.from('/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=', 'base64'));

// Factura que cuadra: 5 kg de tomate a 2,40 (sube desde 2,00/kg),
// 2.000 g de queso a 0,012 €/g = 24 € (el negocio compra en kg → 12 €/kg),
// y una línea que no es un producto (bolsas).
const FACTURA_OK = {
  proveedor: 'Hortalizas Pepe SL', nif: 'b12345678', numFactura: 'FV-2026/0815', fecha: '2026-10-05',
  lineas: [
    {descripcion: 'TOMATE PERA', cantidad: 5, unidad: 'kg', precioUnitario: 2.4, descuento: 0, ivaPct: 4, total: 12},
    {descripcion: 'Queso manchego curado', cantidad: 2000, unidad: 'g', precioUnitario: 0.012, descuento: 0, ivaPct: 10, total: 24},
    {descripcion: 'Bolsas kraft', cantidad: 1, unidad: 'ud', precioUnitario: 5, descuento: 0, ivaPct: 21, total: 5},
  ],
  base: 41, ivas: [{pct: 4, base: 12, cuota: 0.48}, {pct: 10, base: 24, cuota: 2.4}, {pct: 21, base: 5, cuota: 1.05}], total: 44.93,
};
// La misma, pero con una línea mal (3 × 2,40 ≠ 9) y un total que no cuadra.
const FACTURA_MAL = JSON.parse(JSON.stringify(FACTURA_OK));
FACTURA_MAL.numFactura = 'FV-2026/0816';
FACTURA_MAL.lineas[0] = {descripcion: 'TOMATE PERA', cantidad: 3, unidad: 'kg', precioUnitario: 2.4, descuento: 0, ivaPct: 4, total: 9};
FACTURA_MAL.total = 50;

let respuesta = FACTURA_OK, llamadas = [];
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
    llamadas.push(JSON.parse(req.postData() || '{}'));
    req.respond({status: 200, contentType: 'application/json', headers: {'access-control-allow-origin': '*'},
      body: JSON.stringify({candidates: [{content: {parts: [{text: '```json\n' + JSON.stringify(respuesta) + '\n```'}]}, finishReason: 'STOP'}]})});
    return;
  }
  if(/firebase|gstatic|googleapis|github/.test(u)){ req.abort(); return; }
  req.continue();
});

await page.goto(`http://localhost:${PUERTO}/index.html`, {waitUntil: 'domcontentloaded'});
await page.evaluate(() => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code: 'LEERFAC1', tenantId: ggBizTenantId('LEERFAC1')}));
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
  // Solo estos dos (más el catálogo de siembra, el queso tendría gemelo).
  DB.ingredients = [];
  DB.ingredients.push(
    {id: 990001, name: 'Tomate pera', unit: 'kg', price: 2, category: 'Verduras', area: 'cocina'},
    {id: 990002, name: 'Queso manchego', unit: 'kg', price: 12, category: 'Lácteos', area: 'cocina'},
  );
  DB.stock[990001] = {qty: 1, min: 0};
  DB.stock[990002] = {qty: 0, min: 0};
  DB.preciosHistorial = [];
  currentFolder = 'gestion'; navigate('economia'); GE.tab('variables');
});
await new Promise(r => setTimeout(r, 300));

let ok = 0, fallos = 0;
async function caso(nombre, fn){
  try{ const d = await fn(); ok++; console.log('✅ ' + nombre + (d ? '  → ' + d : '')); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ' + (e.message || e)); }
}
const espera = ms => new Promise(r => setTimeout(r, ms));
async function leer(){
  await page.evaluate(() => leerFacturaAbrir());
  await espera(150);
  const input = await page.$('#lf-input');
  await input.uploadFile(fotoPath);
  try{ await page.waitForSelector('#lf-guardar', {timeout: 8000}); }
  catch(e){ throw new Error('no llega a la revisión: ' + await page.evaluate(() => (document.getElementById('lf-cuerpo') || {}).textContent || 'sin modal')); }
}

await caso('El botón «Leer factura con foto» está donde se registran las compras', async () => {
  const visible = await page.evaluate(() => { const b = document.getElementById('lf-abrir'); return !!b && b.offsetParent !== null && b.textContent.trim(); });
  assert.ok(visible, 'no se ve el botón en Gastos Variables');
  return visible;
});

await caso('Sin clave de IA: explica cómo ponerla y ofrece activarla (no falla en silencio)', async () => {
  await page.evaluate(() => { try{ idrBorrarConfig(); }catch(e){} leerFacturaAbrir(); });
  await espera(150);
  const r = await page.evaluate(() => ({texto: document.getElementById('lf-sin-clave')?.textContent || '', boton: !!document.getElementById('lf-activar'), input: !!document.getElementById('lf-input')}));
  assert.ok(r.texto.includes('clave'), 'no explica que falta la clave');
  assert.ok(r.boton, 'no hay botón para activar el asistente');
  assert.ok(!r.input, 'deja subir la foto sin clave');
  await page.evaluate(() => closeModal());
});

await page.evaluate(() => idrGuardarConfig('google', 'clave-de-prueba', 'gemini-test'));

await caso('Empleado: se le dice que es cosa del propietario', async () => {
  const r = await page.evaluate(() => {
    document.body.classList.remove('owner-session');
    const antes = document.querySelectorAll('.toast').length;
    let msg = '';
    const orig = window.showToast; window.showToast = m => { msg = m; };
    leerFacturaAbrir();
    window.showToast = orig;
    document.body.classList.add('owner-session');
    return {msg, modal: !!document.getElementById('lf-input')};
  });
  assert.ok(r.msg.includes('propietario'), 'no avisa: ' + r.msg);
  assert.ok(!r.modal, 'abre el lector igualmente');
});

await caso('Envía la foto al modelo y casa cada línea con su producto (y convierte g → kg)', async () => {
  respuesta = FACTURA_OK; llamadas = [];
  await leer();
  const cuerpo = llamadas[0];
  const parte = cuerpo?.contents?.at(-1)?.parts?.[0];
  assert.ok(parte?.inlineData?.data && /image\//.test(parte.inlineData.mimeType), 'la foto no viaja en la llamada');
  assert.equal(cuerpo.generationConfig.temperature, 0, 'para leer cifras la temperatura debe ser 0');
  const e = await page.evaluate(() => lfEstado.lineas.map(l => ({id: l.ingredientId, qty: l.qtyIng, p: l.precioIng, como: l.como})));
  assert.equal(e[0].id, 990001, 'TOMATE PERA no se casó con Tomate pera');
  assert.equal(e[1].id, 990002, 'el queso no se casó');
  assert.equal(e[1].qty, 2, '2000 g deberían entrar como 2 kg');
  assert.equal(e[1].p, 12, 'el precio por kg del queso debería ser 12');
  assert.equal(e[2].id, null, 'las bolsas no son un producto y se casaron con algo');
  const subida = await page.evaluate(() => document.querySelector('.lf-linea[data-idx="0"] .lf-subida')?.textContent.trim());
  assert.ok(subida && subida.includes('20'), 'no marca la subida del tomate (+20 %): ' + subida);
  const cuadra = await page.evaluate(() => document.querySelectorAll('.lf-descuadre').length);
  assert.equal(cuadra, 0, 'marca descuadres en una factura que cuadra');
  return `tomate ${e[0].p} €/kg, queso ${e[1].qty} kg`;
});

await caso('Guardar: gasto con nº de factura, NIF y foto; precio nuevo con historial; sin stock si no se marca', async () => {
  await page.evaluate(() => lfGuardar());
  await espera(400);
  const r = await page.evaluate(() => {
    const gv = DB.ge.variables.filter(v => v.numFactura === 'FV-2026/0815');
    return {
      n: gv.length, total: gv.reduce((s, v) => s + v.importe, 0), ivas: gv.map(v => v.iva).sort((a, b) => a - b),
      nif: gv[0]?.nifProveedor, prov: gv[0]?.proveedor, foto: gv[0] && !!facturaAdjunta(gv[0].facturaId), mes: gv[0]?.mes, año: gv[0]?.año,
      tomate: getIngredient(990001).price, queso: getIngredient(990002).price,
      hist: DB.preciosHistorial.filter(h => h.ingredientId === 990001).map(h => [h.antes, h.despues, h.proveedor]),
      stockTomate: DB.stock[990001].qty, nifRecordado: DB.ge.config.nifProveedores?.['HORTALIZAS PEPE SL'],
      casado: Object.values(DB.ge.config.casamientosFactura || {}).length,
      abierto: !!document.getElementById('lf-guardar'),
    };
  });
  assert.equal(r.n, 3, 'debería haber un gasto por tipo de IVA');
  assert.equal(Math.round(r.total * 100) / 100, 41);
  assert.deepEqual(r.ivas, [4, 10, 21]);
  assert.equal(r.nif, 'B12345678');
  assert.equal(r.prov, 'HORTALIZAS PEPE SL');
  assert.ok(r.foto, 'la foto no quedó adjunta al gasto');
  assert.equal(r.mes, 9); assert.equal(r.año, 2026);
  assert.equal(r.tomate, 2.4, 'el precio del tomate no se actualizó');
  assert.equal(r.queso, 12, 'el queso no cambió de precio y no debía tocarse');
  assert.deepEqual(r.hist, [[2, 2.4, 'HORTALIZAS PEPE SL']], 'el historial de precios no recoge la subida');
  assert.equal(r.stockTomate, 1, 'entró stock sin marcarlo');
  assert.equal(r.nifRecordado, 'B12345678', 'no recuerda el NIF del proveedor');
  assert.equal(r.casado, 2, 'no recuerda los casamientos');
  assert.ok(!r.abierto, 'la revisión no se cerró');
});

await caso('Detecta el descuadre: línea que no cuadra y total que no cuadra', async () => {
  respuesta = FACTURA_MAL;
  await leer();
  const r = await page.evaluate(() => ({
    lineaMala: !!document.querySelector('.lf-linea[data-idx="0"] .lf-err-linea'),
    otrasBien: !document.querySelector('.lf-linea[data-idx="1"] .lf-err-linea'),
    globales: [...document.querySelectorAll('.lf-descuadre')].map(x => x.textContent.trim()),
    recordado: document.querySelector('.lf-linea[data-idx="0"] .lf-como')?.textContent.trim(),
  }));
  assert.ok(r.lineaMala, 'no marca la línea 3 × 2,40 = 9');
  assert.ok(r.otrasBien, 'marca una línea que sí cuadra');
  assert.ok(r.globales.some(x => x.includes('total')), 'no avisa de que el total no cuadra: ' + r.globales.join(' | '));
  assert.ok(r.recordado && r.recordado.includes('última factura'), 'no usa el casamiento recordado de la factura anterior');
  return r.globales.length + ' avisos globales';
});

await caso('Corregir a mano y entrar stock: suma lo que entra en la unidad del producto', async () => {
  await page.evaluate(() => { lfCambiarLinea(0, 'total', '7.2'); });
  await espera(100);
  const lineaOk = await page.evaluate(() => !document.querySelector('.lf-linea[data-idx="0"] .lf-err-linea'));
  assert.ok(lineaOk, 'tras corregir el importe la línea sigue marcada');
  await page.evaluate(() => { const c = document.getElementById('lf-stock'); c.checked = true; c.dispatchEvent(new Event('change')); lfGuardar(); });
  await espera(200);
  // Hay descuadre (el total): pide confirmación antes de guardar.
  await page.evaluate(() => acceptConfirmModal());
  await espera(400);
  const r = await page.evaluate(() => ({
    tomate: DB.stock[990001].qty, queso: DB.stock[990002].qty,
    gv: DB.ge.variables.filter(v => v.numFactura === 'FV-2026/0816').length,
    log: (DB.stockLog || DB.stockAdjustments || []).length,
  }));
  assert.equal(r.gv, 3, 'el descuadre aceptado no guardó el gasto');
  assert.equal(r.tomate, 4, 'el tomate debería pasar de 1 a 4 kg');
  assert.equal(r.queso, 2, 'el queso debería entrar como 2 kg');
  return `stock tomate ${r.tomate} kg, queso ${r.queso} kg`;
});

await caso('Cancelar no deja la foto huérfana', async () => {
  respuesta = FACTURA_OK;
  const antes = await page.evaluate(() => Object.keys(DB).filter(k => k.startsWith('adj_')).length);
  await leer();
  await page.evaluate(() => lfCancelar());
  const despues = await page.evaluate(() => Object.keys(DB).filter(k => k.startsWith('adj_')).length);
  assert.equal(despues, antes);
});

await caso('Sin errores de JavaScript', async () => { assert.deepEqual(errs, []); });

await browser.close();
servidor.kill();
fs.rmSync(scratch, {recursive: true, force: true});
// todo.sh busca «casos pasaron»: solo se escribe si han pasado TODOS.
console.log(fallos ? `\n${fallos} de ${ok + fallos} casos FALLARON` : `\nLos ${ok} casos pasaron`);
process.exit(fallos ? 1 : 0);
