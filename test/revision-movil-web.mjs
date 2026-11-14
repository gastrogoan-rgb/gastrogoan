// REVISIÓN VISUAL DE MÓVIL de la web pública de reservas y pedidos (14/11). Fotogramas por scroll de cada paso y subpantalla.
// Uso: ANCHO=390 ALTO=844 OUT=/ruta [LANG=es|ca|en] node test/revision-movil-web.mjs      (servidor en :8950 sirviendo el repo)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import {semilla} from './_semilla-publica.mjs';

const ANCHO = parseInt(process.env.ANCHO || '390', 10), ALTO = parseInt(process.env.ALTO || '844', 10), LANG = process.env.LANG_WEB || 'es';
const OUT = process.env.OUT || '/tmp/claude-0/revweb'; fs.mkdirSync(OUT, {recursive: true});
const browser = await puppeteer.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'], headless: 'new'});
const page = await browser.newPage();
await page.setViewport({width: ANCHO, height: ALTO, isMobile: true, hasTouch: true, deviceScaleFactor: 2});
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|stripe|workers\.dev/.test(r.url()) ? r.abort() : r.continue());
page.on('dialog', d => d.dismiss().catch(() => {}));
await page.goto('http://localhost:8950/reservagastrogoan.html?neg=pubrevision', {waitUntil: 'domcontentloaded'});
await new Promise(r => setTimeout(r, 900));
const w = ms => new Promise(r => setTimeout(r, ms));
const arrancar = () => page.evaluate((s, lang) => {
  localStorage.setItem('gastrogoan_lang', lang);
  s.business.pedidos = Object.assign({}, s.business.pedidos, {instruccionesRecogida: 'Puerta lateral, junto al parking', ventanaMin: 10, repartoMin: 15});
  s.allergens = {21: ['Gluten', 'Lácteos'], 11: ['Gluten', 'Huevos']};
  window.DB = DB = s; window.db = db = {ref: () => ({on(){}, off(){}, once: () => Promise.resolve({val: () => null}), set: () => Promise.resolve(), push: () => Promise.resolve(), transaction: () => Promise.resolve({committed: true, snapshot: {val: () => 0}})})};
  businessInfoLoadedOnce = true; setLang(lang); renderHeader(); currentTab = null; renderApp();
}, semilla(), LANG);
await arrancar(); await w(900);

const scroller = `(() => { const el = document.scrollingElement; return el; })()`;
const alto = () => page.evaluate(() => document.documentElement.scrollHeight);
const irA = y => page.evaluate(y => window.scrollTo(0, y), y);
const indice = [];
async function foto(nombre, js, opts = {}){
  try{ if(js) await page.evaluate(js); }catch(e){ indice.push(`${nombre}: ERROR ${e.message.slice(0, 80)}`); return; }
  await w(opts.espera || 700);
  const total = await alto(), paso = Math.round(ALTO * 0.82), n = Math.min(opts.max || 6, Math.max(1, Math.ceil(total / paso)));
  for(let i = 0; i < n; i++){ await irA(i * paso); await w(180); await page.screenshot({path: `${OUT}/${nombre}-${ANCHO}-${String(i + 1).padStart(2, '0')}.png`}); }
  indice.push(`${nombre}: ${n} fotogramas (alto ${total}px)`); await irA(0);
}
const tab = t => `currentTab = '${t}'; renderApp();`;
await foto('01-entrada', 'currentTab = null; renderApp();');
await foto('02-reserva-paso1', tab('reserva'));
await foto('03-reserva-paso2', "wzIr(2)");
await foto('04-reserva-paso3', "wzIr(3)");
await foto('05-pedido-recoger-paso1-carpetas', tab('takeaway'));
await foto('06-pedido-carpeta-abierta', "menuModoActual && 0; openMenuFolder && openMenuFolder(Object.keys({}).length || (menuSeccionesVisibles(lastMenuCartas)[0] || {}).key)");
await foto('07-pedido-con-carrito', "changeCartQty(11, 1, 1, 'Croquetas de jamón', 9.5); changeCartQty(21, 2, 1, 'Hamburguesa Paco', 13.5); changeCartQty(21, 2, 1, 'Hamburguesa Paco', 13.5); renderCartSummary()");
await foto('08-pedido-bandeja-abierta', "trayToggle && trayToggle()");
await foto('09-pedido-info-plato', "dishInfo(21)");
await foto('10-pedido-menus', "closeInfoModal && closeInfoModal(); closeMenuFolder && closeMenuFolder(); menuSetModo('menus')");
await foto('11-pedido-hoja-menu', "abrirHoja && openMenuModal(1)");
await foto('12-pedido-paso2-recoger', "closeInfoModal && closeInfoModal(); wzIr(2)");
await foto('13-pedido-paso3-recoger', "wzIr(3)");
await foto('14-delivery-paso1', tab('delivery'));
await foto('15-delivery-paso2', "changeCartQty(21, 2, 1, 'Hamburguesa Paco', 13.5); changeCartQty(21, 2, 1, 'Hamburguesa Paco', 13.5); wzIr(2)");
await foto('16-delivery-paso3', "wzIr(3)");
const ahora = Date.now(), iso = ms => new Date(ahora + ms).toISOString();
const seg = (n, d) => foto(n, `trackToken = 'tok-revision-0001'; document.getElementById('app').innerHTML = ''; renderTrackStatus(${JSON.stringify(d)})`);
await seg('20-seguimiento-aceptado-delivery', {status: 'aceptado', tipo: 'delivery', desde: iso(1800000), hasta: iso(2400000)});
await seg('21-seguimiento-preparando-retraso', {status: 'preparando', tipo: 'takeaway', desde: iso(-1200000), hasta: iso(-600000)});
await seg('22-seguimiento-encamino-pin', {status: 'encamino', tipo: 'delivery', desde: iso(-100000), hasta: iso(500000), salidaAt: iso(-60000), llegadaEstimada: iso(840000), pin: '4821'});
await seg('23-seguimiento-listo-recoger', {status: 'listo', tipo: 'takeaway', desde: iso(-100000), hasta: iso(500000)});
await seg('24-seguimiento-rechazado', {status: 'rechazado', tipo: 'takeaway'});
await seg('25-seguimiento-no-encontrado', null);
await foto('30-gestionar-reserva', "resToken = 'tok-res-0000001'; renderReservationStatus({status: 'confirmada', date: todayStr(), time: '21:00', people: 4, updatedAt: new Date().toISOString()})");
await foto('31-encuesta-nps', "renderNpsSurvey()");
await foto('32-pedidos-pausados', "DB.business.pedidosOnlineActivos = false; currentTab = 'takeaway'; renderApp();");
await foto('33-canal-en-pausa', "DB.business.pedidosOnlineActivos = true; DB.business.pedidos.pausaDeliveryHasta = new Date(Date.now() + 1800000).toISOString(); currentTab = 'delivery'; renderApp();");
await foto('34-error-enlace', "showError('error.enlace')");
await foto('35-tablero-listos', "listosDatos = {'tok-aaaaaaaaaaaa1': {status: 'preparando', tipo: 'takeaway', updatedAt: new Date().toISOString()}, 'tok-bbbbbbbbbbbb2': {status: 'listo', tipo: 'takeaway', updatedAt: new Date().toISOString(), listoAt: new Date(Date.now() - 900000).toISOString()}}; pintarListos();");
fs.writeFileSync(`${OUT}/INDICE-${ANCHO}.txt`, indice.join('\n') + '\n'); console.log(indice.join('\n'));
await browser.close();
