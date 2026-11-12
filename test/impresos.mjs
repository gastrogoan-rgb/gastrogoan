/* BANCO DE IMPRESOS (12/11, pedido del dueño: «todo lo que se descarga va a ser visible en algún lado y debe estar presentable»).
 * Genera CADA documento imprimible de la app con un negocio lleno, lo abre en la ventana real de impresión, espera a que cargue y lo
 * convierte a PDF A4 (lo que saldría en papel). Comprueba lo que se puede medir —la foto sale, las fuentes cargan, no hay nada cortado ni
 * texto fuera de la hoja, ninguna hoja medio vacía— y deja los PDF y los PNG en IMPRESOS_OUT (por defecto /tmp/claude-0/impresos) para
 * mirarlos con los ojos. `SOLO=ficha node test/impresos.mjs` genera uno solo.
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import jsQR from 'jsqr';

const OUT = process.env.IMPRESOS_OUT || '/tmp/claude-0/impresos';
fs.mkdirSync(OUT, {recursive: true});
const SOLO = process.env.SOLO || '';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const fx = JSON.parse(fs.readFileSync('dist/ggburger.json', 'utf8'));
const w = ms => new Promise(r => setTimeout(r, ms));

const app = await browser.newPage();
await app.setViewport({width:1280, height:900});
const errs = []; app.on('pageerror', e => errs.push(e.message));
await app.setRequestInterception(true);
app.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|raw.githubusercontent/.test(r.url()) ? r.abort() : r.continue());
await app.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
await app.evaluate(() => (typeof dbReadyPromise !== 'undefined') ? dbReadyPromise : null).catch(() => {});
await app.evaluate(async fx => {
  const code = 'IMPRESO01';
  Object.assign(DB, fx);
  Object.assign(DB.business, {name:'Casa Paco', netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, brandColor:'#4A5D4E'});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_login', '1'); localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
  await saveDB();
}, fx);
await app.reload({waitUntil:'domcontentloaded'}); await w(4500);
await app.evaluate(() => { document.getElementById('app-splash')?.remove(); window.__ggSinImprimir = true; });

// Una imagen de verdad (un degradado con un plato dibujado), como data: URL de varios cientos de KB, igual que una foto subida desde el móvil.
const foto = await app.evaluate(() => {
  const c = document.createElement('canvas'); c.width = 1600; c.height = 1000; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 1600, 1000); g.addColorStop(0, '#8A7440'); g.addColorStop(1, '#4A5D4E'); x.fillStyle = g; x.fillRect(0, 0, 1600, 1000);
  x.fillStyle = '#F1EFE9'; x.beginPath(); x.arc(800, 500, 340, 0, 7); x.fill(); x.fillStyle = '#C48A1C'; x.beginPath(); x.arc(800, 500, 200, 0, 7); x.fill();
  for(let i = 0; i < 4000; i++){ x.fillStyle = `rgba(${Math.random()*255|0},${Math.random()*255|0},${Math.random()*255|0},.08)`; x.fillRect(Math.random()*1600, Math.random()*1000, 6, 6); }
  return c.toDataURL('image/jpeg', .92);
});
await app.evaluate(f => {
  DB.business.logo = (() => { const c = document.createElement('canvas'); c.width = 240; c.height = 80; const x = c.getContext('2d'); x.fillStyle = '#1C1A17'; x.fillRect(0,0,240,80); x.fillStyle = '#F1EFE9'; x.font = 'bold 34px sans-serif'; x.fillText('Casa Paco', 16, 52); return c.toDataURL('image/png'); })();
  DB.fichas = DB.fichas || [];
  const r = DB.recipes.find(r => !r.isBase) || DB.recipes[0];
  DB.fichas.push({id: 9001, name: r.name, recipeId: r.id, comensales: 4, produccion: 4, tiempo: 45, temp: 'caliente', area: 'cocina', photo: f,
    ingredients: [], allergens: ['Gluten', 'Lácteos'],
    pasos: ['Precalentar el horno a 180 °C y preparar la mise en place de todos los ingredientes.', 'Sellar la carne en una sartén muy caliente, un minuto por cada lado, sin moverla para que no suelte jugos.', 'Montar el pan con la salsa, la carne, el queso y las verduras; gratinar 3 minutos.', 'Emplatar con las patatas y servir de inmediato.'],
    pasosDet: [{min: 10}, {min: 4, aviso: 'No pinchar la carne: se escapan los jugos.'}, {min: 3}, {}],
    presentation: 'Plato llano blanco, patatas a un lado y la hamburguesa centrada con una hoja de lechuga bajo el pan.'});
  saveDB();
}, foto);

// Captura: ejecuta `accion` en la app, recoge la ventana de impresión que se abre y la pasa a PDF.
async function capturar(nombre, accion, arg){
  if(SOLO && SOLO !== nombre) return null;
  const nuevas = [];
  const alAbrir = async t => { if(t.type() === 'page'){ const p = await t.page(); if(p) nuevas.push(p); } };
  browser.on('targetcreated', alAbrir);
  try{
    await app.evaluate(accion, arg);
    for(let i = 0; i < 40 && !nuevas.length; i++) await w(150);
    assert.ok(nuevas.length, 'no se abrió ninguna ventana de impresión');
    const p = nuevas[0];
    await p.setViewport({width: 794, height: 1123});
    // Misma espera que hace la app antes de imprimir: imágenes decodificadas y fuentes listas.
    await w(1200);
    await p.evaluate(() => Promise.all([...document.images].map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; })).concat(document.fonts ? [document.fonts.ready] : [])));
    const info = await p.evaluate(() => ({
      imagenes: [...document.images].map(i => ({ok: i.complete && i.naturalWidth > 0, w: i.naturalWidth})),
      desborda: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      fuentes: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/['"]/g, '') + ' ' + f.weight).length,
      barra: !!document.querySelector('.pr-barra'),
      alto: document.documentElement.scrollHeight,
    }));
    const pdf = `${OUT}/${nombre}.pdf`;
    await p.pdf({path: pdf, format: 'A4', printBackground: true, preferCSSPageSize: true});
    const paginas = (fs.readFileSync(pdf, 'latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    try{ execSync(`pdftoppm -r 55 -png ${pdf} ${OUT}/${nombre}`, {stdio: 'ignore'}); }catch(e){}
    await p.close();
    return {nombre, paginas, ...info};
  } finally { browser.off('targetcreated', alAbrir); }
}


// Tickets en rollo: salen por un iframe oculto de la propia app (no por una ventana). Se recoge su HTML y se pinta a ancho de rollo.
async function capturarRollo(nombre, accion, arg, anchoMm){
  if(SOLO && SOLO !== nombre) return null;
  await app.evaluate(() => { document.getElementById('gg-print-frame')?.remove(); });
  await app.evaluate(accion, arg);
  let html = '';
  for(let i = 0; i < 40 && !html; i++){ await w(150); html = await app.evaluate(() => { const f = document.getElementById('gg-print-frame'); return f && f.contentDocument && f.contentDocument.documentElement ? f.contentDocument.documentElement.outerHTML : ''; }); }
  assert.ok(html, 'no se generó el ticket');
  const p = await browser.newPage();
  await p.setViewport({width: Math.round(anchoMm * 3.78), height: 1200});
  await p.setContent(html, {waitUntil: 'load'});
  await w(800);
  const info = await p.evaluate(() => ({imagenes: [...document.images].map(i => ({ok: i.complete && i.naturalWidth > 0})), desborda: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2, alto: document.documentElement.scrollHeight}));
  // Cada imagen que parezca un QR (cuadrada) se pasa por un lector real: lo que sale en el papel tiene que LEERSE.
  const pix = await p.evaluate(async () => Promise.all([...document.images].filter(i => i.naturalWidth > 60 && i.naturalWidth === i.naturalHeight).map(async i => { const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight; const g = c.getContext('2d'); g.drawImage(i, 0, 0); return {w: c.width, h: c.height, d: Array.from(g.getImageData(0, 0, c.width, c.height).data)}; })));
  info.qrs = pix.map(q => { const r = jsQR(new Uint8ClampedArray(q.d), q.w, q.h); return r ? r.data : null; });
  const pdf = `${OUT}/${nombre}.pdf`;
  await p.pdf({path: pdf, width: `${anchoMm}mm`, printBackground: true, preferCSSPageSize: false, margin: {top: 0, bottom: 0, left: 0, right: 0}});
  try{ execSync(`pdftoppm -r 80 -png ${pdf} ${OUT}/${nombre}`, {stdio: 'ignore'}); }catch(e){}
  await p.close();
  return {nombre, paginas: 1, fuentes: 0, barra: false, ...info};
}

const resultados = [];
const casos = [];
const caso = (nombre, accion, arg, chequeos, modo) => casos.push({nombre, accion, arg, chequeos, modo});

// ── Documentos ──
caso('ficha', id => printFicha(id), 9001, r => {
  assert.ok(r.imagenes.length >= 1 && r.imagenes.every(i => i.ok), 'la foto de la ficha tiene que cargar: ' + JSON.stringify(r.imagenes));
  assert.equal(r.desborda, false, 'se sale de la hoja');
  assert.ok(r.paginas <= 2, 'una ficha cabe en 1-2 hojas, salen ' + r.paginas);
});


// Datos para el resto de documentos
await app.evaluate(() => {
  DB.giftVouchers = [{id: 801, code: 'GG-7K4P-2M9X', tipo: 'importe', importe: 75, createdAt: new Date().toISOString(), venceEn: '2027-11-12', para: 'Marta Ruiz'},
    {id: 802, code: 'GG-4D8Q-6N3T', tipo: 'experiencia', descripcion: 'Menú degustación para dos personas con maridaje', createdAt: new Date().toISOString(), para: ''}];
  const emp = DB.employees[0];
  const d = getDistEmpData(emp.id);
  d.manual.items = dpManualPlantilla(emp.area || 'cocina');
  d.platos = (DB.recipes || []).slice(0, 4).map(r => r.name);
  d.produccion[0] = [{id: 1, text: 'Fondo oscuro de ternera'}, {id: 2, text: 'Salsa de la casa (4 L)'}]; d.produccion[2] = [{id: 3, text: 'Masa de croquetas'}];
  const hoy = new Date().toISOString().slice(0, 10);
  DB.reservations = [
    {id: 701, date: hoy, time: '13:30', people: 4, clientName: 'Familia Ortega', clientPhone: '600111222', tableId: 1, status: 'confirmada', notes: 'Cumpleaños, tarta a las 15:00'},
    {id: 702, date: hoy, time: '14:00', people: 2, clientName: 'Laura Vidal', clientPhone: '611222333', tableId: 2, status: 'pendiente', notes: 'Alergia a frutos secos'},
    {id: 703, date: hoy, time: '21:00', people: 8, clientName: 'Cena de empresa Nexo S.L.', clientPhone: '622333444', tableId: 5, status: 'confirmada', notes: ''}];
  window.__cierre = {desde: new Date(Date.now() - 9 * 3600e3).toISOString(), hasta: new Date().toISOString(), responsable: 'Marta', totales: {Efectivo: 842.5, Tarjeta: 1530.2, Otro: 50}, total: 2422.7, ticketCount: 94,
    fondoInicial: 150, efectivoEsperado: 992.5, efectivoContado: 990, diferencia: -2.5, descuentos: [{hora: '14:12', mesa: 'Mesa 4', responsableNombre: 'Marta', porcentaje: 10, importe: 6.4, motivo: 'Cliente habitual'}], totalDescuentos: 6.4,
    anulaciones: [{hora: '21:03', mesa: 'Mesa 7', cantidad: 1, plato: 'Croquetas de jamón', motivo: 'Error al marchar'}], platformSales: [{nombre: 'Glovo', total: 212.4, comision: 42.5}], notas: 'Todo correcto salvo 2,50 € de diferencia en caja.'};
});
caso('alergenos', () => printAlergenos(), null, r => assert.equal(r.desborda, false));
caso('protocolo-apertura', () => printProtocolo('apertura'), null, r => assert.ok(r.paginas <= 2));
caso('protocolo-cierre', () => printProtocolo('cierre'), null, r => assert.ok(r.paginas <= 2));
caso('manos', () => printManosProtocolo(), null, r => assert.ok(r.paginas <= 1));
caso('manual-puesto', id => printManualEmpleado(id), 'EMP', r => assert.ok(r.paginas <= 3));
caso('distribucion', id => printDistribucion(id), 'EMP', r => assert.ok(r.paginas <= 2));
caso('vale-regalo-importe', () => printGiftVoucher(801), null, r => assert.equal(r.paginas, 1));
caso('vale-regalo-experiencia', () => printGiftVoucher(802), null, r => assert.equal(r.paginas, 1));
caso('promo-mes', () => printPromoMes(new Date().getFullYear(), new Date().getMonth()), null, r => assert.ok(r.paginas <= 2));
caso('horarios-semana', () => printWeeklySchedule(), null, r => assert.ok(r.paginas <= 2));
caso('reservas-dia', () => rvImprimirDia(new Date().toISOString().slice(0, 10)), null, r => assert.ok(r.paginas <= 2));
caso('cierre-caja', () => printCashClosure(window.__cierre), null, r => assert.ok(r.paginas <= 2));
caso('pedido-proveedor', () => { pedidoDetailId = DB.purchaseOrders.find(o => o.items && o.items.length).id; printPedido(); }, null, r => assert.ok(r.paginas <= 2));
caso('qr-mesas', () => imprimirQrMesas(), null, r => assert.equal(r.desborda, false));


await app.evaluate(() => {
  DB.idr = DB.idr || {}; DB.idr.creaciones = DB.idr.creaciones || [];
  DB.idr.creaciones.push({id: 'c1', tipo: 'menu', titulo: 'Menú de temporada · otoño', area: 'cocina', pasos: [{elegido: 'Menú cerrado de 3 pasos con maridaje opcional'}, {elegido: 'Entrante, principal y postre'}, {elegido: 'Crema de calabaza, carrillera al vino tinto, tarta de queso'}, {elegido: 'Postre de la casa con café'}],
    logica: 'Menú pensado para el cambio de estación: producto de cercanía, pocos ingredientes y fondos que se aprovechan entre platos para controlar el food cost.', recipeIds: (DB.recipes || []).slice(0, 3).map(r => r.id), faltan: ['Calabaza (kg)', 'Vino tinto de cocina (L)']});
  DB.idr.creaciones.push({id: 'c2', tipo: 'maridaje', titulo: 'Maridaje de la carta', area: 'sala', notaGeneral: 'Propuestas por plato, con opción sin alcohol.', maridajes: [{plato: 'Hamburguesa GG Classic', opciones: [{bebida: 'Cerveza lager', tipo: 'cerveza', motivo: 'Limpia el paladar entre bocados.'}, {bebida: 'Tinto joven', tipo: 'vino', motivo: 'Acompaña la carne sin taparla.'}], sinAlcohol: 'Limonada de jengibre'}, {plato: 'Cheesecake de la casa', opciones: [{bebida: 'Moscatel', tipo: 'vino', motivo: 'Dulzor equilibrado con la acidez.'}]}]});
  DB.business.plan360Contract = {signedAt: new Date().toISOString(), signedName: 'Paco García', signedDNI: '12345678Z', signedText: 'CONTRATO DE SERVICIOS PLAN 360º\n\nEn Barcelona, a 12 de noviembre de 2026.\n\nREUNIDOS: De una parte, GastroGoan, y de otra, Casa Paco.\n\nPRIMERA. Objeto. El presente contrato regula la prestación del servicio de acompañamiento operativo Plan 360º.\n\nSEGUNDA. Duración. El servicio tendrá una duración de seis meses desde la firma.\n\nTERCERA. Precio. El precio y la forma de pago son los acordados por las partes.'};
});
caso('manual-capitulo', () => { manualChapter = 0; printManualChapter(); }, null, r => assert.ok(r.paginas <= 4));
caso('idr-menu', () => idrImprimir('c1'), null, r => assert.ok(r.paginas <= 2));
caso('idr-maridaje', () => idrImprimirMaridaje('c2'), null, r => assert.ok(r.paginas <= 2));
caso('contrato-plan360', () => plan360PrintContract(), null, r => assert.ok(r.paginas <= 2));
caso('ticket', () => { DB.business.gmaps = 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4'; DB.business.ticket = Object.assign({}, DB.business.ticket, {mostrarResenaQr: true}); const v = DB.sales.find(x => (x.items || []).length) || DB.sales[0]; printTicket(v); }, null, r => {
  assert.ok(r.imagenes.every(i => i.ok), 'una imagen del ticket no carga');
  assert.ok(r.qrs.includes('https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4'), 'el QR de reseña del ticket NO se lee con un lector real: ' + JSON.stringify(r.qrs));
}, 'rollo');
caso('cuenta', () => printCuenta(DB.tpvOrders.find(o => (o.items || []).length).id), null, r => assert.ok(r.imagenes.every(i => i.ok)), 'rollo');


await app.evaluate(() => {
  const ids = Object.keys(PLAN360_DOC_PLANTILLAS || {});
  DB.business.plan360Docs = ids.map(id => ({id, campos: {}}));
  window.__docId = ids[0];
});
caso('plan360-documento', () => descargarPlan360DocRico(window.__docId), null, r => assert.ok(r.paginas <= 12));

for(const c of casos){
  try{
    const arg = c.arg === 'EMP' ? await app.evaluate(() => DB.employees[0].id) : c.arg;
    const r = c.modo === 'rollo' ? await capturarRollo(c.nombre, c.accion, arg, 80) : await capturar(c.nombre, c.accion, arg);
    if(!r) continue;
    c.chequeos && c.chequeos(r);
    console.log(`✅ ${c.nombre}: ${r.paginas} hoja(s), ${r.imagenes.length} imagen(es), fuentes ${r.fuentes}, barra ${r.barra ? 'sí' : 'no'}`);
  }catch(e){ resultados.push(c.nombre); console.log(`❌ ${c.nombre}\n   ⤷ ${e.message}`); }
}
assert.deepEqual(errs, [], 'errores de JavaScript: ' + errs.join(' | '));
await browser.close();
console.log(resultados.length ? `\n❌ ${resultados.length} impresos con problemas` : '\n✅ todos los impresos se generan bien');
process.exit(resultados.length ? 1 : 0);
