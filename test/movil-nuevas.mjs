/* LAS PANTALLAS NUEVAS, EN UN MÓVIL (7/10)
 * ────────────────────────────────────────
 * test/movil.mjs recorre las vistas y los modales de siempre, pero las
 * ventanas que se hicieron en octubre no las abría nadie: leer factura con
 * foto, el cuadre de la factura dentro del pedido, la visión global de
 * varios negocios, «Pregúntale a tus números», las tarjetas nuevas de Mi
 * Negocio (IA, impresora, QR de mesa), el paso de IA del alta y la web
 * pública en modo mesa. Son justo las que se usan con el móvil en la mano
 * (una factura se fotografía en el almacén, una mesa paga desde su móvil).
 *
 * Mismas reglas y mismo detector que movil.mjs, en los cinco anchos:
 * nada se arrastra en horizontal, nada cortado, ninguna palabra partida
 * (N palabras ≤ N renglones, medido con Range), nada por debajo de 11 px y
 * botones de al menos 36 px (decisión del dueño del 28/09, la misma que
 * movil.mjs). Con datos de verdad: seis líneas de factura con alguna en rojo
 * o ámbar, las seis marcas del cuadre, tres negocios, una respuesta larga.
 *
 * Red de Firebase bloqueada y la IA contestada a mano. Servidor propio
 * (8994) comprobando que sirve ESTE directorio.
 */
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUERTO = Number(process.env.MN_PUERTO) || 8994;
const servidor = spawn('python3', ['-m', 'http.server', String(PUERTO), '--directory', raiz], {stdio: 'ignore'});
await new Promise(r => setTimeout(r, 900));
const servido = await fetch(`http://localhost:${PUERTO}/js/operations.js`).then(r => r.text()).catch(() => '');
if(!servido.includes('function pfAbrir')){
  console.log(`❌ El puerto ${PUERTO} lo sirve otro directorio. Ciérralo o usa MN_PUERTO=<otro>.`);
  servidor.kill(); process.exit(1);
}

const scratch = path.join(raiz, 'test', '.scratch-movil-nuevas');
fs.mkdirSync(scratch, {recursive: true});
const fotoPath = path.join(scratch, 'factura.jpg');
fs.writeFileSync(fotoPath, Buffer.from('/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=', 'base64'));

const ANCHOS = [[320, 568], [360, 800], [390, 844], [412, 915], [430, 932]];

// Factura de seis líneas: el tomate sube (ámbar), una línea no cuadra y el
// total tampoco (rojo), unas bolsas sin producto y una descripción larga.
const FACTURA = {
  proveedor: 'Distribuciones Hortofrutícolas del Mediterráneo SL', nif: 'b12345678', numFactura: 'FV-2026/0815', fecha: '2026-10-05',
  lineas: [
    {descripcion: 'TOMATE PERA', cantidad: 5, unidad: 'kg', precioUnitario: 2.4, descuento: 0, ivaPct: 4, total: 12},
    {descripcion: 'Queso manchego curado D.O. pieza entera', cantidad: 2000, unidad: 'g', precioUnitario: 0.0105, descuento: 0, ivaPct: 10, total: 21},
    {descripcion: 'Aceite oliva virgen extra garrafa', cantidad: 4, unidad: 'L', precioUnitario: 5, descuento: 0, ivaPct: 10, total: 25},
    {descripcion: 'Harina de trigo', cantidad: 10, unidad: 'kg', precioUnitario: 1, descuento: 0, ivaPct: 4, total: 10},
    {descripcion: 'Bolsas kraft', cantidad: 1, unidad: 'ud', precioUnitario: 5, descuento: 0, ivaPct: 21, total: 5},
    {descripcion: 'Pimentón de la Vera ahumado', cantidad: 0.5, unidad: 'kg', precioUnitario: 14, descuento: 10, ivaPct: 10, total: 6.3},
  ],
  base: 79.3, ivas: [{pct: 4, base: 22, cuota: 0.88}, {pct: 10, base: 52.3, cuota: 5.23}, {pct: 21, base: 5, cuota: 1.05}], total: 99,
};
const RESPUESTA_LARGA = 'Este mes llevas 12.345,67 € netos, un 8,4 % más que septiembre a la misma altura.\n\n' +
  '- El food cost está en el 31,2 %, por encima de tu objetivo del 28 %: el Tataki de solomillo pesa más de lo que debería desde que Carnes Prat subió el solomillo un 20 %.\n' +
  '- El martes es tu día más flojo (media de 412 €).\n- Las mermas suben a 3,1 % de las ventas.\n\nRevisa el precio del tataki o el gramaje de la ración.';

let respuestaIA = '';
const browser = await puppeteer.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'], headless: true});
const preparar = async page => {
  await page.setRequestInterception(true);
  page.on('request', req => {
    const u = req.url();
    if(u.includes('generativelanguage.googleapis.com')){
      if(req.method() === 'OPTIONS') return req.respond({status: 204, headers: {'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST', 'access-control-allow-headers': 'content-type'}});
      return req.respond({status: 200, contentType: 'application/json', headers: {'access-control-allow-origin': '*'},
        body: JSON.stringify({candidates: [{content: {parts: [{text: respuestaIA}]}, finishReason: 'STOP'}]})});
    }
    if(/firebase|gstatic|googleapis|github|workers\.dev|qrserver|anthropic/.test(u)) return req.abort();
    req.continue();
  });
};
const espera = ms => new Promise(r => setTimeout(r, ms));

// El detector: el mismo criterio que movil.mjs, sobre la raíz que se le dé.
const MIRAR = (sel, W) => {
  const raiz = typeof sel === 'string' ? document.querySelector(sel) : null;
  if(!raiz || !raiz.getClientRects().length) return {noEsta: true};
  const out = {arrastra: document.documentElement.scrollWidth > W + 1, cortado: [], partido: [], letra: [], toque: []};
  const texto = el => (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);
  const quien = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '');
  const dentroDeScroll = el => {
    for(let p = el.parentElement; p && p !== document.body; p = p.parentElement){
      const o = getComputedStyle(p).overflowX;
      if(o === 'auto' || o === 'scroll') return true;
    }
    return false;
  };
  const lineasDe = el => {
    const n = el.firstChild;
    if(!n || n.nodeType !== 3) return 1;
    const r = document.createRange(); r.selectNodeContents(el);
    return Math.max(1, new Set([...r.getClientRects()].filter(x => x.width > 0 && x.height > 0).map(x => Math.round(x.top))).size);
  };
  [raiz, ...raiz.querySelectorAll('*')].forEach(el => {
    if(!el.getClientRects().length) return;
    const r = el.getBoundingClientRect();
    if(r.width === 0 || r.height === 0) return;
    const cs = getComputedStyle(el);
    if(cs.visibility === 'hidden') return;
    if((r.right > W + 1.5 || r.left < -1.5) && !dentroDeScroll(el)) out.cortado.push(`${quien(el)} «${texto(el)}»`);
    const hoja = el.children.length === 0 && (el.textContent || '').trim().length > 0;
    if(hoja && !['OPTION', 'SCRIPT', 'STYLE'].includes(el.tagName)){
      const palabras = (el.textContent || '').trim().split(/\s+/).length;
      const l = lineasDe(el);
      if(l > palabras) out.partido.push(`«${texto(el)}» ${palabras}pal→${l}líneas ${Math.round(r.width)}px [${quien(el)}]`);
      const fs = parseFloat(cs.fontSize);
      if(fs && fs < 11) out.letra.push(`«${texto(el)}» ${fs}px [${quien(el)}]`);
    }
    const esBoton = el.tagName === 'BUTTON' || (el.tagName === 'A' && String(el.className).includes('btn'));
    if(esBoton && (r.height < 36 || r.width < 36)) out.toque.push(`«${texto(el)}» ${Math.round(r.width)}×${Math.round(r.height)} [${quien(el)}]`);
  });
  const u = a => [...new Set(a)];
  return {arrastra: out.arrastra, cortado: u(out.cortado), partido: u(out.partido), letra: u(out.letra), toque: u(out.toque)};
};

let ok = 0, fallos = 0;
// Mide una raíz en los cinco anchos. `pintar` vuelve a dibujar tras cambiar
// el ancho (lo que se pinta con medidas de JS no se recalcula solo).
async function medir(page, nombre, sel, pintar){
  const problemas = [];
  for(const [w, h] of ANCHOS){
    await page.setViewport({width: w, height: h});
    await espera(250);
    if(pintar){ await pintar(); await espera(350); }
    const r = await page.evaluate(MIRAR, sel, w);
    if(r.noEsta){ problemas.push(`${w}px: no se ve ${sel}`); continue; }
    if(r.arrastra) problemas.push(`${w}px: la página se arrastra en horizontal`);
    for(const k of ['cortado', 'partido', 'letra', 'toque']) r[k].slice(0, 4).forEach(x => problemas.push(`${w}px ${k}: ${x}`));
  }
  if(problemas.length){ fallos++; console.log(`❌ ${nombre}\n   ` + problemas.slice(0, 14).join('\n   ') + (problemas.length > 14 ? `\n   … y ${problemas.length - 14} más` : '')); }
  else { ok++; console.log(`✅ ${nombre}  → 320 · 360 · 390 · 412 · 430`); }
}

/* ─────────────────────────── LA APP ─────────────────────────── */
const page = await browser.newPage();
await page.setViewport({width: 360, height: 800});
const errs = []; page.on('pageerror', e => errs.push(e.message));
page.on('dialog', d => d.accept());
await preparar(page);
await page.goto(`http://localhost:${PUERTO}/index.html`, {waitUntil: 'domcontentloaded'});
await page.evaluate(() => {
  localStorage.clear();
  const user = ggOwnerUser('casapaco');
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code: 'MOVNUE01', tenantId: ggBizTenantId('MOVNUE01')}));
  localStorage.setItem('gastrogoan_owner_login', JSON.stringify({user, authKey: 'ak', pinHash: hashPin('1234', user)}));
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type: 'owner', ts: Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0, 10));
});
await page.reload({waitUntil: 'domcontentloaded'});
await espera(2400);
await page.evaluate(() => {
  ['netlify-gate', 'license-gate', 'extconn-gate', 'firebase-gate', 'revoked-gate'].forEach(id => document.getElementById(id)?.remove());
  Object.assign(DB.business, {name: 'Casa Paco Centro', netlifySetupDone: true, extConnPromptSeen: true, tourSeen: true, categoryIconHintSeen: true, publicId: 'pubmovil01'});
  DB.business.ownFirebase = {apiKey: 'fake', databaseURL: 'https://fake-default-rtdb.firebaseio.com'};
  DB.ingredients = [
    {id: 990001, name: 'Tomate pera', unit: 'kg', price: 2, iva: 4, category: 'Verduras', area: 'cocina'},
    {id: 990002, name: 'Queso manchego', unit: 'kg', price: 12, iva: 10, category: 'Lácteos', area: 'cocina'},
    {id: 990003, name: 'Aceite oliva', unit: 'L', price: 5, iva: 10, category: 'Aceites', area: 'cocina'},
    {id: 990004, name: 'Sal fina', unit: 'kg', price: 1, iva: 10, category: 'Especias', area: 'cocina'},
    {id: 990005, name: 'Harina trigo', unit: 'kg', price: 1, iva: 4, category: 'Harinas', area: 'cocina'},
    {id: 990006, name: 'Pimentón de la Vera', unit: 'kg', price: 11, iva: 10, category: 'Especias', area: 'cocina'},
  ];
  DB.ingredients.forEach(i => { DB.stock[i.id] = {qty: 0, min: 0}; });
  DB.preciosHistorial = []; DB.ge.variables = []; DB.purchaseOrders = [];
  DB.tables = Array.from({length: 8}, (_, i) => ({id: i + 1, name: 'Mesa ' + (i + 1), plazas: 4}));
  DB.business.qrMesa = {activo: true};
  idrGuardarConfig('google', 'clave-de-prueba', 'gemini-test');
  currentFolder = 'gestion'; navigate('economia'); GE.tab('variables');
});
await espera(300);

// 1. Leer factura con foto: la revisión.
respuestaIA = JSON.stringify(FACTURA);
await page.evaluate(() => leerFacturaAbrir());
await espera(200);
await (await page.$('#lf-input')).uploadFile(fotoPath);
await page.waitForSelector('#lf-guardar', {timeout: 8000}).catch(() => {});
const lfMarcas = await page.evaluate(() => ({lineas: document.querySelectorAll('.lf-linea').length, err: document.querySelectorAll('.lf-err-linea, .lf-descuadre').length, sube: document.querySelectorAll('.lf-subida').length}));
if(lfMarcas.lineas < 6 || !lfMarcas.err || !lfMarcas.sube){ fallos++; console.log('❌ La revisión de la factura no tiene 6 líneas con rojo y ámbar: ' + JSON.stringify(lfMarcas)); }
await medir(page, 'Leer factura con foto: revisión con 6 líneas, descuadres y subida', '#modal-box');
await page.evaluate(() => lfCancelar());
await espera(200);

// 2. Factura dentro del pedido: el cuadre con las seis marcas.
respuestaIA = JSON.stringify(Object.assign({}, FACTURA, {numFactura: 'FP-2026/0101', total: 87.46,
  lineas: FACTURA.lineas.filter(l => !/Pimentón/.test(l.descripcion)).map(l => /Aceite/.test(l.descripcion) ? Object.assign({}, l, {total: 20}) : l)}));
await page.evaluate(() => {
  const o = {id: genId(), supplier: 'Distribuciones Hortofrutícolas del Mediterráneo SL', date: todayStr(), estado: 'ENVIADO', area: 'cocina', enviadoEn: todayStr(),
    items: [[990001, 5], [990002, 2], [990003, 3], [990004, 1], [990005, 10]].map(([ingredientId, cantidad]) => ({ingredientId, cantidad, cantidadRecibida: null}))};
  DB.purchaseOrders.push(o);
  currentFolder = 'cocina'; navigate('pedidos'); openPedido(o.id);
  o.items.forEach((_, i) => toggleRecepcionCheck(i, true));
  changePedidoEstado('RECIBIDO');
  openPedido(o.id);
  document.getElementById('pf-adjuntar').click();
});
await espera(200);
await (await page.$('#pf-input')).uploadFile(fotoPath);
await espera(1500);
const pfMarcas = await page.evaluate(() => (document.getElementById('modal-box').innerText.match(/\n/g) || []).length);
if(pfMarcas < 10){ fallos++; console.log('❌ No llega al cuadre de la factura del pedido'); }
await medir(page, 'Factura dentro del pedido: cuadre con sube, baja, cantidad, falta, igual y sobra', '#modal-box');
await page.evaluate(() => { try{ pfCancelar(); }catch(e){} closeModal(); });
await espera(200);

// 3. Visión global con tres negocios.
await page.evaluate(async () => {
  const me = ggOwnerId('casapaco');
  saveBusinessSlots([
    {id: 'default', name: 'Casa Paco Centro', code: 'MOVNUE01', ownerId: me},
    {id: 'b2', name: 'Casa Paco Playa de la Malvarrosa', code: 'AAAAAAA2', ownerId: me},
    {id: 'b3', name: 'Casa Paco Puerto', code: 'AAAAAAA3', ownerId: me},
  ]);
  localStorage.setItem('gastrogoan_active_slot', 'default');
  const hoy = todayStr();
  const venta = (id, bruto) => ({id, date: hoy, time: '13:00', total: bruto, status: 'cobrada', tipo: 'mesa',
    items: [{name: 'Menú', price: bruto, qty: 1, ivaPct: 10}], payments: [{method: 'efectivo', amount: bruto}]});
  DB.sales = [venta(1, 1234.56)];
  const neg = (nombre, ventas, extra) => Object.assign(JSON.parse(JSON.stringify(defaultData())), {
    business: Object.assign({}, defaultData().business, {name: nombre}), sales: ventas}, extra || {});
  const escribir = (slot, data) => new Promise((ok, ko) => {
    const req = indexedDB.open(slotIdbName(slot), 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => { const db = req.result; const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(data, DB_KEY); tx.oncomplete = () => { db.close(); ok(); }; tx.onerror = () => ko(tx.error); };
    req.onerror = () => ko(req.error);
  });
  await escribir('b2', neg('Casa Paco Playa de la Malvarrosa', [venta(1, 22000.5), venta(2, 110)], {
    ingredients: [{id: 1, name: 'Harina', unit: 'kg'}], stock: {1: {qty: 1, min: 5}},
    reservations: [{id: 1, date: hoy, time: '21:00', people: 4, status: 'confirmada'}]}));
  await escribir('b3', neg('Casa Paco Puerto', [venta(1, 55)]));
  openVisionGlobal();
});
await espera(900);
await medir(page, 'Visión global de mis negocios con 3 negocios', '#modal-box');
await page.evaluate(() => closeModal());

// 4. Pregúntale a tus números, con pregunta y respuesta larga.
respuestaIA = RESPUESTA_LARGA;
await page.evaluate(async () => {
  abrirPreguntaNumeros();
  await new Promise(r => setTimeout(r, 100));
  iaNumEnviar('¿Cómo va el mes comparado con el anterior y qué debería vigilar?');
  for(let i = 0; i < 40 && iaNumPensando; i++) await new Promise(r => setTimeout(r, 100));
});
await espera(300);
await medir(page, 'Pregúntale a tus números: pregunta y respuesta larga', '#modal-box');
await page.evaluate(() => closeModal());

// 5. Tarjetas nuevas de Mi Negocio y el paso de IA del alta.
const irMiNegocio = () => page.evaluate(() => { currentFolder = 'gestion'; navigate('minegocio'); });
await irMiNegocio(); await espera(400);
await medir(page, 'Mi Negocio: tarjeta Asistente de IA', '#mn-ia', irMiNegocio);
await medir(page, 'Mi Negocio: tarjeta QR de mesa (activado, 8 mesas)', '#mn-card-qr-mesa', irMiNegocio);
await page.evaluate(() => { const c = document.getElementById('print-mode-ticket')?.closest('.card'); if(c) c.id = 'mn-prueba-impresora'; });
await medir(page, 'Mi Negocio: tarjeta Impresora de tickets', '#mn-prueba-impresora', async () => {
  await irMiNegocio();
  await page.evaluate(() => { const c = document.getElementById('print-mode-ticket')?.closest('.card'); if(c) c.id = 'mn-prueba-impresora'; });
});
await page.evaluate(() => {
  idrBorrarConfig();
  DB.business.extConnPromptSeen = false;
  showExternalConnectionsPrompt();
  for(let i = 0; i < 5 && !document.getElementById('iag-ahora-no'); i++) skipExternalConnectionsPromptStep();
});
await espera(300);
await medir(page, 'Alta: paso opcional de la clave de IA', '#extconn-gate');

/* ─────────────────────── LA WEB PÚBLICA EN MODO MESA ─────────────────────── */
const pub = await browser.newPage();
await pub.setViewport({width: 360, height: 800});
const errsPub = []; pub.on('pageerror', e => errsPub.push(e.message));
await preparar(pub);
await pub.goto(`http://localhost:${PUERTO}/reservagastrogoan.html?neg=pubmovil01&mesa=Xtokendeprueba000001`, {waitUntil: 'domcontentloaded'});
await espera(1500);
const CUENTA = {mesa: 'Mesa 12 terraza', abierta: true, total: 87.5, pagado: 20, pendiente: 67.5, enCurso: 0, descuentoPct: 0,
  lineas: [{n: 'Hamburguesa de ternera con queso de cabra', q: 2, p: 14.5}, {n: 'Ensalada', q: 1, p: 9}, {n: 'Croquetas caseras de jamón ibérico', q: 3, p: 8.5}, {n: 'Agua', q: 4, p: 2.5}]};
const pintarPublica = (fase) => pub.evaluate(({cuenta, fase}) => {
  db = {ref: ruta => ({
    on: (ev, cb) => { if(/\/mesaQr\//.test(ruta)) cb({val: () => cuenta}); },
    push: () => Promise.resolve(),
  })};
  publicId = 'pubmovil01';
  qrMesaListener = false; qrMesaCuenta = undefined;
  DB = {business: {name: 'Casa Paco Centro', tiposServicio: {mesa: true, takeaway: true, delivery: true}, qrMesa: {activo: true}},
    cartas: [{id: 1, nombre: 'Carta', secciones: [
      {id: 10, nombre: 'Hamburguesas', platos: [
        {id: 100, nombre: 'Hamburguesa de ternera con queso de cabra', precio: 14.5, disponible: true, descripcion: 'Pan brioche, cebolla caramelizada y patatas'},
        {id: 101, nombre: 'Ensalada', precio: 9, disponible: true}]},
      {id: 11, nombre: 'Para compartir', platos: [{id: 102, nombre: 'Croquetas caseras de jamón ibérico', precio: 8.5, disponible: true}]}]}],
    activeCartaIds: [1], menus: [], activeMenuIds: [], reservasResumen: {}, mesasOcupadas: {}, pedidosResumen: {}, cocinaCargaActiva: 0,
    tables: [{id: 12, name: 'Mesa 12 terraza', plazas: 4}], promos: [], allergens: {100: ['Gluten', 'Lácteos', 'Huevo'], 102: ['Gluten']}};
  pagoOnlineActivo = true;
  currentTab = 'mesa';
  renderApp();
  if(fase === 'carta' || fase === 'carrito'){ menuOpenSection = '1:10'; renderTabContent(); }
  if(fase === 'carrito'){
    cart = [{key: 'a', recipeId: 100, sectionId: 10, name: 'Hamburguesa de ternera con queso de cabra', price: 14.5, qty: 2},
      {key: 'b', recipeId: 102, sectionId: 11, name: 'Croquetas caseras de jamón ibérico', price: 8.5, qty: 1}];
    renderCartSummary();
  }
}, {cuenta: CUENTA, fase});
await medir(pub, 'Web de la mesa: carta con alérgenos', 'body', () => pintarPublica('carta'));
await medir(pub, 'Web de la mesa: carrito', 'body', () => pintarPublica('carrito'));
await medir(pub, 'Web de la mesa: cuenta y pago parcial', 'body', async () => {
  await pintarPublica('cuenta');
  await pub.evaluate(() => { document.getElementById('mesaqr-cuenta')?.scrollIntoView(); const i = document.getElementById('mq-importe'); if(i) i.value = '25'; });
});
const hayPago = await pub.evaluate(() => !!document.getElementById('mq-importe') && !!document.getElementById('mq-pagar-todo'));
if(!hayPago){ fallos++; console.log('❌ La web de la mesa no enseña el pago parcial (mq-importe / mq-pagar-todo)'); }

const ruido = e => /Failed to fetch|NetworkError|network-request-failed|ERR_FAILED|firebase is not defined/i.test(e);
const reales = [...errs, ...errsPub].filter(e => !ruido(e));
if(reales.length){ fallos++; console.log('❌ Errores de JavaScript:\n   ' + reales.slice(0, 5).join('\n   ')); }
else { ok++; console.log('✅ Sin errores de JavaScript'); }

await browser.close();
servidor.kill();
fs.rmSync(scratch, {recursive: true, force: true});
// todo.sh busca la frase exacta: solo se escribe si han pasado TODOS.
console.log(fallos ? `\n${fallos} de ${ok + fallos} casos de móvil nuevas FALLARON` : `\nLos ${ok}: todos los casos de móvil nuevas pasaron`);
process.exit(fallos ? 1 : 0);
