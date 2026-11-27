// Pedido en grupo en la mesa (27/11): la WEB PÚBLICA del comensal, con una nube de mentira compartida en memoria. Puerto propio (8965).
// Cinco anchos de móvil (320, 360, 390, 412, 430) y los tres idiomas. Fija:
//   · degradación: sin `grupo` publicado por la app (negocio sin las reglas, sin la casilla, sin nube propia) NO existe ninguna tarjeta de grupo;
//   · unirse escribe SOLO el hueco propio (uid de la sesión) y el borrador NO lleva precios;
//   · se ven los borradores de los demás (con nombres de plato de la carta) y quién debe qué, leído de lo que publica la app;
//   · compartir un plato: va en el borrador y en el pedido (`reparto`), y obliga a pagar al final;
//   · el pedido lleva `slot` y `uid`; «pagar mi parte» usa el importe que publica la app (el móvil no lo calcula) + propina con tope;
//   · expulsado: sin unirse ni pagar; a los 3 minutos sin tocar se desconecta (goOffline) y un toque reconecta; respaldo REST;
//   · ni desbordes, ni letra < 11 px, ni botones < 44 px, ni iconos de la fuente de la app, en ningún ancho ni idioma.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUERTO = 8965;
const web = spawn('python3', ['-m', 'http.server', String(PUERTO)], {cwd: RAIZ, stdio: 'ignore'});
await new Promise(r => setTimeout(r, 1200));
const browser = await puppeteer.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'], headless: true});
const res = [];
async function caso(nombre, fn){
  try { const d = await fn(); console.log('✅ ' + nombre + (d ? '  → ' + d : '')); res.push(true); }
  catch(e){ console.log('❌ ' + nombre + '\n     ⤷ ' + (e.message || e)); res.push(false); }
}
const TOKEN = 'TokenGrupoWeb12345678';
const pub = await browser.newPage();
const errs = []; pub.on('pageerror', e => errs.push(e.message));
await pub.setRequestInterception(true);
pub.on('request', r => /firebase|firebaseio|gstatic|googleapis|workers\.dev|github|qrserver/.test(r.url()) ? r.abort() : r.continue());
await pub.setViewport({width: 390, height: 800});
await pub.goto(`http://localhost:${PUERTO}/reservagastrogoan.html?neg=pubgrupoweb&mesa=${TOKEN}`, {waitUntil: 'domcontentloaded'});
await new Promise(r => setTimeout(r, 1500));

/* La nube de mentira: un árbol en memoria con oyentes. Hace de nube compartida entre «este móvil» y los demás (que se inyectan a mano). */
async function montar({grupo = true, cuenta = {}, tarjeta = true, lang = 'es'} = {}){
  await pub.evaluate(({grupo, cuenta, tarjeta, lang}) => {
    window.__arbol = {}; window.__esc = []; window.__push = []; window.__off = 0; window.__on = 0; window.__pagos = [];
    const oyentes = {};
    const lee = ruta => ruta.split('/').filter(Boolean).reduce((o, k) => (o && typeof o === 'object') ? o[k] : undefined, __arbol);
    const pon = (ruta, v) => {
      const p = ruta.split('/').filter(Boolean); let o = __arbol;
      p.slice(0, -1).forEach(k => { if(!o[k] || typeof o[k] !== 'object') o[k] = {}; o = o[k]; });
      if(v === null || v === undefined) delete o[p[p.length - 1]]; else o[p[p.length - 1]] = JSON.parse(JSON.stringify(v));
    };
    const avisa = () => Object.keys(oyentes).forEach(r => (oyentes[r] || []).forEach(cb => cb({val: () => { const v = lee(r); return v === undefined ? null : JSON.parse(JSON.stringify(v)); }})));
    window.__avisa = avisa; window.__pon = (r, v) => { pon(r, v); avisa(); };
    window.__oyentes = oyentes;
    window.db = db = {
      goOffline: () => { __off++; }, goOnline: () => { __on++; }, app: {options: {databaseURL: 'https://fake-default-rtdb.firebaseio.com'}},
      ref: ruta => ({
        on: (ev, cb) => { (oyentes[ruta] = oyentes[ruta] || []).push(cb); if(ruta === '.info/connected') cb({val: () => true}); else setTimeout(() => cb({val: () => { const v = lee(ruta); return v === undefined ? null : JSON.parse(JSON.stringify(v)); }}), 0); },
        set: v => { __esc.push([ruta, JSON.parse(JSON.stringify(v === undefined ? null : v))]); pon(ruta, v); setTimeout(avisa, 0); return Promise.resolve(); },
        push: v => { __push.push(JSON.parse(JSON.stringify(v))); return Promise.resolve(); },
      }),
    };
    window.firebase = {auth: () => ({currentUser: {uid: 'uidYo', getIdToken: () => Promise.resolve('tok')}})};
    publicId = 'pubgrupoweb';
    if(lang) setLang(lang);
    const base = Object.assign({mesa: 'Mesa 1', updatedAt: new Date().toISOString(), abierta: false, total: 0, pagado: 0, pendiente: 0}, grupo ? {grupo: true, grupoMax: 12, grupoMin: 5} : {}, cuenta);
    __pon('gastrogoan/public/pubgrupoweb/mesaQr/' + 'TokenGrupoWeb12345678', base);
    clearInterval(grRestTimer); clearTimeout(grTimerConexion); grRestOn = false; grOffline = false; grFirmaMiembros = ''; grFirmas = {};
    qrMesaListener = false; qrMesaCuenta = undefined; grListenerOn = false; grEventosOn = false; grSlot = null; grData = null; grAvisoSesion = ''; grSubSig = '';
    try{ localStorage.clear(); }catch(e){}
    DB = {business: {name: 'Casa Grupo', tiposServicio: {mesa: true}, qrMesa: {activo: true, cobroLocal: true, cobroTarjeta: tarjeta}},
      cartas: [{id: 1, nombre: 'Carta', secciones: [{id: 10, nombre: 'Principales', platos: [
        {id: 100, nombre: 'Pizza Margarita', precio: 10, disponible: true}, {id: 101, nombre: 'Ensalada de la casa', precio: 9, disponible: true}]}]}],
      activeCartaIds: [1], menus: [], activeMenuIds: [], reservasResumen: {}, mesasOcupadas: {}, pedidosResumen: {}, cocinaCargaActiva: 0,
      tables: [{id: 1, name: 'Mesa 1', plazas: 4}], promos: [], allergens: {}};
    pagoOnlineActivo = tarjeta;
    window.payWithCard = (req, amount, desc) => { __pagos.push({req: JSON.parse(JSON.stringify(req)), amount, desc}); };
    cart = []; currentTab = 'mesa'; submittingRequest = false;
    renderApp();
  }, {grupo, cuenta, tarjeta, lang});
  await new Promise(r => setTimeout(r, 400));
  await pub.evaluate(() => { grConectado = true; if(typeof qrMesaCuenta !== 'undefined' && qrMesaCuenta && !document.getElementById('gr-card') && currentTab === 'mesa') renderMesaQrForm(); });
  if(grupo) await pub.waitForFunction(() => document.getElementById('gr-card') && document.getElementById('gr-card').innerText.length > 10, {timeout: 4000}).catch(() => {});
}
const nodoMesa = 'gastrogoan/public/pubgrupoweb/mesaQr/TokenGrupoWeb12345678';
const nodoGrupo = 'gastrogoan/public/pubgrupoweb/mesaGrupo/TokenGrupoWeb12345678';

await caso('Degradación: si la app no publica `grupo` NO hay tarjeta de grupo y el pedido de siempre funciona', async () => {
  await montar({grupo: false});
  const r = await pub.evaluate(() => ({card: !!document.getElementById('gr-card'), form: !!document.getElementById('o-submit'), esc: __esc.length}));
  assert.equal(r.card, false, 'sale la tarjeta de grupo en un negocio sin grupo');
  assert.equal(r.form, true);
  await pub.evaluate(() => { cart = [{key: 'a', recipeId: 100, sectionId: 10, name: 'Pizza Margarita', price: 10, qty: 1}]; renderCartSummary(); });
  await new Promise(r => setTimeout(r, 900));
  assert.equal(await pub.evaluate(() => __esc.filter(e => /mesaGrupo/.test(e[0])).length), 0, 'escribe borradores donde no hay grupo');
});

await caso('Unirse: pide nombre, escribe SOLO su hueco con su uid; el borrador no lleva precios', async () => {
  await montar();
  assert.equal(await pub.evaluate(() => !!document.getElementById('gr-card') && !!document.getElementById('gr-nombre')), true, 'no sale la tarjeta con el campo de nombre');
  await pub.evaluate(() => { document.getElementById('gr-nombre').value = 'Ana'; grUnirme(); });
  await new Promise(r => setTimeout(r, 600));
  const r = await pub.evaluate(() => ({esc: __esc.filter(e => /miembros/.test(e[0])), slot: grSlot, ls: localStorage.getItem(grClaveLS())}));
  assert.equal(r.slot, 'm0');
  assert.deepEqual(r.esc[0][0], nodoGrupo + '/miembros/m0');
  assert.equal(r.esc[0][1].uid, 'uidYo'); assert.equal(r.esc[0][1].n, 'Ana');
  assert.ok(r.ls && JSON.parse(r.ls).slot === 'm0', 'no recuerda su hueco para reanudar');
  await pub.evaluate(() => { cart = [{key: 'a', recipeId: 100, sectionId: 10, name: 'Pizza Margarita', price: 10, qty: 2}]; renderCartSummary(); });
  await new Promise(r => setTimeout(r, 1100));
  const bor = await pub.evaluate(() => __esc.filter(e => /carritos/.test(e[0])).slice(-1)[0]);
  assert.deepEqual(bor[1], {l0: {p: '100', q: 2}}, 'el borrador lleva algo más que plato y cantidad: ' + JSON.stringify(bor));
  assert.ok(!/price|precio|10/.test(JSON.stringify(bor[1]).replace('"p":"100"', '')), 'hay un precio en el nodo compartido');
});

await caso('Se ven los borradores de los demás (por nombre de plato), sin precios, y quién debe qué lo que publica la app', async () => {
  await pub.evaluate(g => {
    __pon(g + '/miembros/m1', {uid: 'uidBruno', n: 'Bruno', ts: Date.now()});
    __pon(g + '/carritos/m1', {l0: {p: '101', q: 1}});
  }, nodoGrupo);
  await new Promise(r => setTimeout(r, 300));
  const t = await pub.evaluate(() => document.getElementById('gr-card').innerText);
  assert.ok(/Bruno/.test(t) && /Ensalada de la casa/.test(t), 'no se ve el borrador de Bruno: ' + t);
  assert.ok(!/€/.test(t), 'el borrador de otro enseña un precio');
  await pub.evaluate(m => __pon(m, {mesa: 'Mesa 1', updatedAt: new Date().toISOString(), abierta: true, grupo: true, grupoMax: 12, grupoMin: 5, lineas: [{n: 'Pizza', q: 1, p: 10}], total: 10, pagado: 0, pendiente: 10, comensales: {m0: {debe: 7, pagado: 0, enCurso: 0}, m1: {debe: 3, pagado: 6, enCurso: 0}}}), nodoMesa);
  await new Promise(r => setTimeout(r, 300));
  const t2 = await pub.evaluate(() => document.getElementById('gr-card').innerText);
  assert.ok(/Debe/i.test(t2), 'no se ve quién debe: ' + t2);
});

await caso('Compartir un plato: va al borrador (`r`) y al pedido (`reparto`); con un plato compartido el botón ya no es «pagar y enviar»', async () => {
  await pub.evaluate(() => { document.querySelector('.gr-comp summary') && 0; grToggleReparto('a', 'm1'); });
  await new Promise(r => setTimeout(r, 1000));
  const r = await pub.evaluate(() => ({r: __esc.filter(e => /carritos\/m0/.test(e[0])).slice(-1)[0][1], pagaTarjeta: qrMesaPagaConTarjeta(), nota: !document.getElementById('gr-nota-comp').hidden}));
  assert.equal(r.r.l0.r, 'm1');
  assert.equal(r.pagaTarjeta, false, 'con un plato compartido se podría pagar al pedir');
  assert.equal(r.nota, true);
  await pub.evaluate(() => { document.getElementById('o-privacy-consent').checked = true; submitMesaQrOrder(); });
  await new Promise(r => setTimeout(r, 400));
  const p = await pub.evaluate(() => __push[__push.length - 1]);
  assert.equal(p.slot, 'm0'); assert.equal(p.uid, 'uidYo'); assert.equal(p.type, 'pedido_mesa');
  assert.deepEqual(p.items[0].reparto, ['m1']);
});

await caso('Pagar mi parte: el importe es el que publica la app (+ propina con tope del 50 %); no hay forma de cambiarlo desde la pantalla', async () => {
  await pub.evaluate(() => { grElegirPropina('10'); });
  const b = await pub.evaluate(() => document.getElementById('gr-pagar').innerText);
  assert.match(b, /7,70/, 'el botón no suma 7 + 10 %: ' + b);
  await pub.evaluate(() => { grPagarParte(); });
  const p = await pub.evaluate(() => __pagos[0]);
  assert.equal(p.amount, 7.7);
  assert.equal(p.req.type, 'pago_mesa'); assert.equal(p.req.slot, 'm0'); assert.equal(p.req.uid, 'uidYo'); assert.equal(p.req.propina, 0.7); assert.equal(p.req.importe, 7.7);
  const tope = await pub.evaluate(() => { grTip = 'x'; grTipX = '99'; return grTipImporte(7); });
  assert.equal(tope, 3.5, 'una propina de 99 € sobre 7 € no tiene tope');
  // Con la parte por debajo del mínimo no hay botón de pago.
  await pub.evaluate(m => __pon(m + '/comensales/m0/debe', 3), nodoMesa);
  await new Promise(r => setTimeout(r, 300));
  assert.equal(await pub.evaluate(() => !!document.getElementById('gr-pagar')), false, 'deja pagar 3 € con mínimo de 5');
});

await caso('Expulsado: la tarjeta lo dice y no deja unirse ni pagar', async () => {
  await pub.evaluate(m => __pon(m + '/expulsados', {m0: 'uidYo'}), nodoMesa);
  await new Promise(r => setTimeout(r, 400));
  const r = await pub.evaluate(() => ({t: document.getElementById('gr-card').innerText, unir: !!document.getElementById('gr-unirme'), pagar: !!document.getElementById('gr-pagar'), slot: grSlot}));
  assert.equal(r.slot, null); assert.equal(r.unir, false, 'el expulsado puede volver a unirse con otro hueco'); assert.equal(r.pagar, false);
  assert.match(r.t, /camarero|waiter|cambrer/i);
});

await caso('Conexión: a los 3 min sin tocar se desconecta; un toque reconecta; si el socket no llega se pasa a consultar por REST', async () => {
  await montar();
  const r = await pub.evaluate(async () => {
    grEnganchar();
    grUltimoToque = Date.now() - 4 * 60 * 1000; grVigilar();
    const off1 = __off, dormido = grOffline;
    grToque();
    const on1 = __on;
    // REST: la consulta lee los dos nodos con el token de la sesión
    const url = []; window.fetch = async u => { url.push(String(u)); return new Response(JSON.stringify({miembros: {m3: {uid: 'x', n: 'Carla', ts: Date.now()}}})); };
    grPasarARest(); await new Promise(r => setTimeout(r, 200));
    const rest = {on: grRestOn, urls: url.slice(0, 2), nombre: Object.keys((grData && grData.miembros) || {})};
    clearInterval(grRestTimer);
    return {off1, dormido, on1, rest};
  });
  assert.equal(r.off1, 1); assert.equal(r.dormido, true); assert.equal(r.on1, 1);
  assert.ok(r.rest.on && r.rest.urls.every(u => /\.json\?auth=tok/.test(u)), JSON.stringify(r.rest));
  assert.deepEqual(r.rest.nombre, ['m3']);
});

for(const lang of ['es', 'ca', 'en']){
  for(const ancho of [320, 360, 390, 412, 430]){
    await caso(`Móvil ${ancho} px en ${lang}: sin desbordes, letra ≥ 11 px, botones ≥ 44 px, sin iconos de la fuente, sin claves sin traducir`, async () => {
      await pub.setViewport({width: ancho, height: 800, isMobile: false});
      await montar({lang, cuenta: {abierta: true, lineas: [{n: 'Pizza', q: 1, p: 10}], total: 10, pagado: 0, pendiente: 10, comensales: {m0: {debe: 7, pagado: 0, enCurso: 0}, m1: {debe: 3, pagado: 6, enCurso: 0}}}});
      await pub.evaluate(g => {
        document.getElementById('gr-nombre').value = 'Maria de los Angeles Fernandez'; grUnirme();
      });
      await pub.waitForFunction(() => grSlot === 'm0', {timeout: 3000});
      await new Promise(r => setTimeout(r, 300));
      await pub.evaluate(g => {
        __pon(g + '/miembros/m1', {uid: 'uidB', n: 'Bartolomé Montserrat', ts: Date.now()});
        __pon(g + '/miembros/m2', {uid: 'uidC', n: 'Carlota', ts: Date.now()});
        __pon(g + '/carritos/m1', {l0: {p: '101', q: 3, r: 'm0,m2'}, l1: {p: '100', q: 1}});
        cart = [{key: 'a', recipeId: 100, sectionId: 10, name: 'Pizza Margarita', price: 10, qty: 1}, {key: 'b', recipeId: 101, sectionId: 10, name: 'Ensalada de la casa', price: 9, qty: 2}];
        grCompAbierto = true; renderCartSummary();
      }, nodoGrupo);
      await new Promise(r => setTimeout(r, 400));
      const m = await pub.evaluate(() => {
        if(!document.getElementById('gr-card')) return {sinCard: (document.getElementById('app') || document.body).innerText.slice(0, 300), slot: grSlot, rest: grRestOn, cuenta: JSON.stringify(qrMesaCuenta).slice(0, 200)};
        const card = document.getElementById('gr-card'), out = {txt: card.innerText, pequena: [], bajos: [], fuera: 0};
        const vw = document.documentElement.clientWidth;
        out.scroll = document.documentElement.scrollWidth - vw;
        const cr = card.getBoundingClientRect();
        card.querySelectorAll('*').forEach(el => {
          const cs = getComputedStyle(el); if(cs.display === 'none') return;
          const hayTexto = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
          if(hayTexto && parseFloat(cs.fontSize) < 11) out.pequena.push(el.className + ':' + cs.fontSize);
          const r = el.getBoundingClientRect(); if(r.width && (r.right > vw + 1 || r.left < -1)) out.fuera++;
          if(el.matches('button, summary') && r.height < 43.5) out.bajos.push((el.textContent || '').trim().slice(0, 20) + ':' + Math.round(r.height));
        });
        out.iconos = document.querySelectorAll('#gr-card [class*="ti ti-"], #gr-card i.ti').length;
        out.pago = (document.getElementById('gr-pagar') || {}).innerText || '';
        return out;
      });
      assert.ok(!m.sinCard, 'sin tarjeta: ' + JSON.stringify(m));
      assert.ok(m.scroll <= 1, 'scroll horizontal de ' + m.scroll + ' px');
      assert.equal(m.fuera, 0, m.fuera + ' elementos salen del ancho');
      assert.deepEqual(m.pequena, [], 'letra < 11 px');
      assert.deepEqual(m.bajos, [], 'botones de menos de 44 px');
      assert.equal(m.iconos, 0);
      assert.ok(!/\bgr\.[a-z]/i.test(m.txt), 'claves sin traducir: ' + m.txt.match(/\bgr\.[a-zA-Z.]+/));
      assert.ok(m.pago, 'no hay botón de pagar mi parte: ' + m.txt.replace(/\n/g, ' | '));
    });
  }
}

await caso('Los textos nuevos existen en es, ca y en, sin emoji, y la web no pide el icono de la app', async () => {
  const src = fs.readFileSync(path.join(RAIZ, 'reservagastrogoan.html'), 'utf8');
  const bloque = src.slice(src.indexOf('const I18N_GR = {'), src.indexOf('Object.keys(I18N_GR)'));
  const claves = l => [...new Set([...bloque.slice(bloque.indexOf(`  ${l}:{`), l === 'en' ? bloque.length : bloque.indexOf(`  ${l === 'es' ? 'ca' : 'en'}:{`)).matchAll(/'(gr\.[a-zA-Z.]+)':/g)].map(m => m[1]))];
  const es = claves('es'), ca = claves('ca'), en = claves('en');
  assert.ok(es.length > 40);
  assert.deepEqual(ca.sort(), es.slice().sort(), 'el catalán no tiene las mismas claves'); assert.deepEqual(en.sort(), es.slice().sort(), 'el inglés no tiene las mismas claves');
  assert.ok(!/\p{Extended_Pictographic}/u.test(bloque), 'hay un emoji en los textos del grupo');
  assert.ok(!/class="ti ti-/.test(src), 'la web usa la fuente de iconos de la app');
  const usadas = [...src.matchAll(/t\('(gr\.[a-zA-Z.]+)'\)/g)].map(m => m[1]);
  usadas.forEach(k => assert.ok(es.includes(k), 'se usa ' + k + ' y no está traducida'));
});

await caso('Sin errores de JavaScript', async () => { assert.deepEqual(errs.filter(e => !/Failed to fetch|NetworkError|firebase is not defined/i.test(e)), []); });
await browser.close(); web.kill();
const fallos = res.filter(x => !x).length;
console.log('\n' + '═'.repeat(64)); console.log(fallos ? `❌ ${fallos} fallaron` : `✅ los ${res.length} casos de la web de grupo pasaron`);
process.exit(fallos ? 1 : 0);
