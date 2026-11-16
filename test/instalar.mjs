// ANCLAR A LA PANTALLA DE INICIO (16/11, pedido del dueño): en el móvil, al entrar a la app (ya identificado) y a la web de reservas (desde la pantalla de
// entrada) se ofrece instalarla. Nunca en un ordenador. «Ahora no» lo calla; a la tercera no vuelve. Se prueba desde 127.0.0.2 (localhost se salta a propósito).
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const w = ms => new Promise(r => setTimeout(r, ms));
// Semilla mínima de un restaurante (sin ningún dato de contacto): lo justo para que la web pública pinte su pantalla de entrada.
const semilla = () => {
  const plato = (id, nombre, precio) => ({id, nombre, precio, disponible:true, modificadores:[]});
  const dia = {abierto:true, modo:'turnos', turnos:[{ini:'13:00', fin:'16:00'}, {ini:'20:00', fin:'23:30'}]};
  return {
    business: {name:'Casa Paco', phone:'611222333', address:'Calle Mayor 12, Madrid', schedule:'Lun-Dom 13:00-16:00 · 20:00-23:30', tiposServicio:{mesa:true, takeaway:true, delivery:true}, horario:[dia, dia, dia, dia, dia, dia, dia],
      pedidos:{deliveryFee:2.5, freeDeliveryFrom:30, pedidoMinimo:12, cpList:['28001'], tiempoBasePrep:20, aceptaEfectivo:true, aceptaTarjetaLocal:true}},
    cartas: [{id:1, nombre:'Carta', area:'cocina', secciones:[{id:1, nombre:'Entrantes', platos:[plato(11,'Croquetas',9.5), plato(12,'Ensaladilla',8)]}]}],
    activeCartaIds:[1], menus:[], activeMenuIds:[], reservasResumen:{}, mesasOcupadas:{}, pedidosResumen:{}, cocinaCargaActiva:0,
    tables:[{id:1, name:'Mesa 1', seats:2, zone:'Sala'}], promos:[], allergens:{},
  };
};
const BASE = 'http://127.0.0.2:8950';
const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
const UA_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';

async function nueva(movil, ua){
  const page = await browser.newPage();
  if(movil){ await page.setViewport({width:390, height:800, isMobile:true, hasTouch:true, deviceScaleFactor:2}); }
  else await page.setViewport({width:1280, height:800});
  if(ua) await page.setUserAgent(ua);
  page.errs = []; page.on('pageerror', e => page.errs.push(e.message));
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|raw.githubusercontent/.test(r.url()) ? r.abort() : r.continue());
  return page;
}
async function entrarApp(page){
  await page.goto(BASE + '/dist/index.html', {waitUntil:'domcontentloaded'}); await w(1800);
  const d = await page.evaluate(async () => (await fetch('/dist/ggburger.json')).json());
  await page.evaluate(async d => {
    localStorage.clear();
    localStorage.setItem('gastrogoan_owner_login','1'); localStorage.setItem('gastrogoan_owner_pass_prompted','1');
    localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
    if(d.license) localStorage.setItem('gastrogoan_license_v1', JSON.stringify(d.license));
    localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts: Date.now()}));
    await idbSet('gastrogoan_data_v1', d);
  }, d);
  await page.goto('about:blank'); await page.goto(BASE + '/dist/index.html#home', {waitUntil:'domcontentloaded'});
}
const tarjeta = p => p.evaluate(() => { const e = document.getElementById('gg-instalar'); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; });

await caso('App en móvil Android: al llegar a Inicio sale la tarjeta con los pasos del menú y «Ahora no»', async () => {
  const p = await nueva(true, UA_ANDROID); await entrarApp(p); await w(9500);
  const t = await tarjeta(p);
  assert.ok(t, 'no salió la tarjeta');
  assert.match(t, /Ten GastroGoan a un toque/); assert.match(t, /Ahora no/);
  // Chrome avisa de que se puede instalar (botón «Instalar»); si no lo avisa, se explican los pasos del menú. Las dos vías valen.
  assert.ok(/Instalar/.test(t) || /tres puntos/.test(t), t);
  const caja = await p.evaluate(() => { const r = document.getElementById('gg-instalar').getBoundingClientRect(); return {l:r.left, r:r.right, b:r.bottom, w:innerWidth, h:innerHeight}; });
  assert.ok(caja.l >= 0 && caja.r <= caja.w && caja.b <= caja.h, 'la tarjeta se sale de la pantalla: ' + JSON.stringify(caja));
  const botones = await p.evaluate(() => [...document.querySelectorAll('#gg-instalar button')].map(b => Math.round(b.getBoundingClientRect().height)));
  assert.ok(botones.every(h => h >= 44), 'botones de menos de 44 px: ' + botones);
  assert.deepEqual(p.errs, []); await p.close();
});

await caso('«Ahora no» la quita, la apunta (7 días) y al recargar no vuelve a salir', async () => {
  const p = await nueva(true, UA_ANDROID); await entrarApp(p); await w(9500);
  await p.evaluate(() => [...document.querySelectorAll('#gg-instalar button')].find(b => /Ahora no/.test(b.innerText)).click());
  assert.equal(await tarjeta(p), null);
  const m = await p.evaluate(() => JSON.parse(localStorage.getItem('gastrogoan_instalar')));
  assert.equal(m.veces, 1); assert.ok(m.hasta > Date.now() + 6 * 86400000);
  await p.goto('about:blank'); await p.goto(BASE + '/dist/index.html#home', {waitUntil:'domcontentloaded'}); await w(9500);
  assert.equal(await tarjeta(p), null, 'volvió a salir antes de los 7 días');
  await p.close();
});

await caso('iPhone: explica Compartir → Añadir a pantalla de inicio', async () => {
  const p = await nueva(true, UA_IOS); await entrarApp(p); await w(9500);
  const t = await tarjeta(p);
  assert.ok(t && /Compartir/.test(t) && /pantalla de inicio/.test(t), String(t));
  await p.close();
});

await caso('En un ordenador (sin pantalla táctil) NUNCA sale', async () => {
  const p = await nueva(false); await entrarApp(p); await w(9500);
  assert.equal(await tarjeta(p), null); await p.close();
});

await caso('«Entendido» tras leer los pasos: no vuelve nunca', async () => {
  const p = await nueva(true, UA_IOS); await entrarApp(p); await w(9500);
  await p.evaluate(() => [...document.querySelectorAll('#gg-instalar button')].find(b => /Entendido/.test(b.innerText)).click());
  const m = await p.evaluate(() => JSON.parse(localStorage.getItem('gastrogoan_instalar')));
  assert.equal(m.nunca, true); await p.close();
});

await caso('Web de reservas en móvil: desde la pantalla de entrada ofrece anclar el restaurante, con manifiesto con su nombre', async () => {
  const p = await nueva(true, UA_ANDROID);
  await p.goto(BASE + '/reservagastrogoan.html', {waitUntil:'domcontentloaded'}); await w(600);
  await p.evaluate(s => {
    localStorage.setItem('gastrogoan_lang', 'es');
    window.DB = DB = s; window.db = db = {ref: () => ({on(){}, off(){}, once: () => Promise.resolve({val: () => null}), set: () => Promise.resolve(), transaction: () => Promise.resolve({committed:true, snapshot:{val: () => 0}})})};
    businessInfoLoadedOnce = true; setLang('es'); renderHeader(); currentTab = null; renderApp();
  }, semilla());
  await p.evaluate(() => window.dispatchEvent(new Event('load')));   // el aviso se prepara al terminar de cargar
  await w(9500);
  const t = await tarjeta(p);
  assert.ok(t && /Ten este restaurante a un toque/.test(t), String(t));
  const man = await p.evaluate(async () => { const l = document.querySelector('link[rel="manifest"]'); return l ? await (await fetch(l.href)).json() : null; });
  assert.ok(man && man.name && man.display === 'standalone' && !/#/.test(man.start_url), JSON.stringify(man));
  await p.evaluate(() => ggCerrarInstalar(false));
  assert.equal(await tarjeta(p), null);
  const m = await p.evaluate(() => JSON.parse(localStorage.getItem('gastrogoan_instalar_reservas')));
  assert.equal(m.veces, 1); assert.ok(m.hasta > Date.now() + 13 * 86400000);
  await p.close();
});

await caso('Web de reservas en un ordenador: nunca', async () => {
  const p = await nueva(false);
  await p.goto(BASE + '/reservagastrogoan.html', {waitUntil:'domcontentloaded'}); await w(600);
  await p.evaluate(s => {
    window.DB = DB = s; window.db = db = {ref: () => ({on(){}, off(){}, once: () => Promise.resolve({val: () => null}), set: () => Promise.resolve(), transaction: () => Promise.resolve({committed:true, snapshot:{val: () => 0}})})};
    window.dispatchEvent(new Event('load'));   // en un ordenador el aviso se descarta antes de pintar nada: no hace falta ni arrancar la pantalla
  }, semilla());
  await w(9500);
  assert.equal(await tarjeta(p), null); await p.close();
});

await browser.close();
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ todos los casos pasaron');
process.exit(fallos ? 1 : 0);
