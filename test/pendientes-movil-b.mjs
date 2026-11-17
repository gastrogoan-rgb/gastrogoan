// PENDIENTES DEL VÍDEO MÓVIL · AGENTE B (16/11): lo que se cerró en Global, Gestión, Panel, Nube, Manual y las pantallas sin repasar.
// Cada caso nació de un fallo medido a 360 px con datos llenos (dist/ggburger.json). Necesita `bash build.sh` y un servidor en :8950
// (o GG_URL). Se comprobó que cada caso FALLA sin su arreglo.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const BASE = process.env.GG_URL || 'http://localhost:8950';
const w = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox']});
let mal = 0;
async function caso(nombre, fn){
  try{ const d = await fn(); console.log(`✅ ${nombre}${d ? '  → ' + d : ''}`); }
  catch(e){ mal++; console.log(`❌ ${nombre}\n     ⤷ ${e.message}`); }
}
async function abrir(W = 360, H = 800){
  const page = await browser.newPage(); await page.setViewport({width: W, height: H, isMobile: true, hasTouch: true, deviceScaleFactor: 1});
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|raw.githubusercontent/.test(r.url()) ? r.abort() : r.continue());
  await page.goto(BASE + '/dist/index.html', {waitUntil: 'domcontentloaded'}); await w(2500);
  const datos = await page.evaluate(async () => (await fetch('/dist/ggburger.json')).json());
  await page.evaluate(async d => { localStorage.setItem('gastrogoan_owner_login', '1'); localStorage.setItem('gastrogoan_access_session', JSON.stringify({type: 'owner', ts: Date.now()})); localStorage.setItem('gastrogoan_owner_pass_prompted', '1'); localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0, 10)); if(d.license) localStorage.setItem('gastrogoan_license_v1', JSON.stringify(d.license)); await idbSet('gastrogoan_data_v1', d); }, datos);
  await page.reload({waitUntil: 'domcontentloaded'}); await page.waitForFunction(() => typeof DB !== 'undefined' && DB && DB.sales, {timeout: 60000}); await w(1200);
  await page.evaluate(() => { ['netlify-gate', 'license-gate', 'extconn-gate', 'firebase-gate', 'revoked-gate', 'app-splash'].forEach(x => document.getElementById(x)?.remove()); try{hideAccessSelectScreen();}catch(e){} try{hideBusinessSelectScreen();}catch(e){} try{closeModal();}catch(e){} editUnlocked = true; document.body.classList.add('edit-unlocked', 'owner-session'); });
  return page;
}

await caso('Punto 1 · fmtMoney: la cifra y el «€» van unidos por un espacio duro (no se parten en dos líneas)', async () => {
  const page = await abrir();
  const r = await page.evaluate(() => [fmtMoney(12345.6), fmtMoney(0)]);
  assert.equal(r[0], '12.345,60 €'); assert.equal(r[1], '0,00 €');
  await page.close();
});

await caso('Punto 2 · una sola carga: con versión nueva, la recarga sale ANTES de que el primer documento termine de cargar (CPU ×4)', async () => {
  const dist = fs.readFileSync('dist/index.html', 'utf8');
  const iEarly = dist.indexOf('gastrogoan_auto_actualizacion'), iBuild = dist.indexOf("const GG_BUILD");
  assert.ok(iEarly > 0 && iEarly < iBuild, 'el guion temprano debe ir antes de los 4 MB de JS');
  // Contexto limpio: el localStorage se comparte entre páginas del mismo contexto y un caso anterior deja una sesión viva
  // (y «versión comprobada hace poco»), con lo que el guion temprano, a propósito, no pregunta nada.
  const ctx = await (browser.createBrowserContext || browser.createIncognitoBrowserContext).call(browser);
  const page = await ctx.newPage(); await page.setViewport({width: 360, height: 800, isMobile: true, hasTouch: true});
  const cdp = await page.createCDPSession(); await cdp.send('Emulation.setCPUThrottlingRate', {rate: 4});
  await page.setRequestInterception(true);
  const navs = []; let dcl = 0;
  page.on('request', r => {
    const u = r.url();
    if(/firebase|firebaseio|gstatic|googleapis|qrserver|raw.githubusercontent/.test(u)) return r.abort();
    if(/version\.json/.test(u)) return r.respond({status: 200, contentType: 'application/json', body: JSON.stringify({build: '99/99/2099 00:00'})});
    if(r.isNavigationRequest() && r.frame() === page.mainFrame()) navs.push(dcl);
    r.continue();
  });
  page.on('domcontentloaded', () => { dcl++; });
  await page.goto(BASE + '/dist/index.html', {waitUntil: 'domcontentloaded'}).catch(() => {});
  await w(6000);
  assert.ok(navs.length >= 2, 'tenía que haber una recarga (navegaciones: ' + navs.length + ')');
  assert.equal(navs[1], 0, 'la recarga llegó cuando el primer documento ya había terminado de cargar (DCL=' + navs[1] + '): dos pantallas de carga completas');
  assert.ok(navs.length <= 3, 'bucle de recargas: ' + navs.length);
  await page.close(); await ctx.close();
});

await caso('Punto 2 · entrada de pantalla sin fundido desde transparente en móvil (nada en blanco mientras entra)', async () => {
  const page = await abrir();
  const r = await page.evaluate(() => { currentFolder = 'sala'; navigate('folder'); const v = document.querySelector('.view.active'); const c = v.querySelector('.folder-card,.module-card,.card'); return {v: getComputedStyle(v).animationName, c: c ? getComputedStyle(c).animationName : 'sin-tarjeta'}; });
  assert.equal(r.v, 'none'); assert.equal(r.c, 'none', 'la tarjeta entra con animación (invisible hasta arrancar)');
  await page.close();
});

await caso('Punto 3 · Cuenta de Resultados: «¿Cómo se calcula?» ya no ocupa una fila entera (botón de 44 px junto al año)', async () => {
  const page = await abrir();
  const r = await page.evaluate(async () => { currentFolder = 'gestion'; navigate('economia'); GE.tab('cdr'); await new Promise(r => setTimeout(r, 900));
    const c = document.getElementById('cdr-como').getBoundingClientRect(), a = document.getElementById('cdr-year').getBoundingClientRect(); return {w: c.width, h: c.height, dy: Math.abs((c.top + c.height / 2) - (a.top + a.height / 2))}; });
  assert.ok(r.w <= 48 && r.h >= 44, 'botón ' + r.w + '×' + r.h); assert.ok(r.dy < 22, 'no comparte fila con el año (dy=' + r.dy + ')');
  await page.close();
});

await caso('Punto 3 · Panel: la variación del año no se parte y el globo de la cifra máxima va encima del punto', async () => {
  const page = await abrir();
  const r = await page.evaluate(async () => { currentFolder = 'gestion'; navigate('dashboard'); await new Promise(r => setTimeout(r, 1500));
    const dv = document.querySelector('.dt-delta .dt-dv'); return {h: dv ? dv.getBoundingClientRect().height : 0, abajo: document.querySelectorAll('#dt-anual .dt-tag.abajo').length, tags: document.querySelectorAll('#dt-anual .dt-tag').length}; });
  assert.ok(r.h > 0 && r.h < 24, 'la variación ocupa ' + r.h + ' px de alto (partida en renglones)'); assert.ok(r.tags >= 2 && r.abajo === 0, 'globos volcados debajo de la línea: ' + r.abajo);
  await page.close();
});

await caso('Punto 4 · ventana «Nube»: el código de licencia sale oculto y «Mostrar» lo descubre', async () => {
  const page = await abrir();
  const r = await page.evaluate(async () => {
    DB.business.ownFirebase = {apiKey: 'fake', databaseURL: 'https://fake-default-rtdb.firebaseio.com'};
    const code = getLicense().code; openCloudWizard(); await new Promise(r => setTimeout(r, 400));
    const caja = document.getElementById('modal-box'); const oculto = caja.innerText.includes(code), html = caja.innerHTML.includes(code);
    const cod = caja.querySelector('.nb-lic-cod'), btn = caja.querySelector('.nb-lic-ver'); const antes = cod.textContent; btn.click(); const despues = cod.textContent; btn.click();
    return {code, oculto, html, antes, despues, vuelve: cod.textContent, alto: btn.getBoundingClientRect().height};
  });
  assert.ok(!r.oculto && !r.html, 'el código completo aparece en la ventana'); assert.ok(/^•+..$/.test(r.antes) && r.antes.endsWith(r.code.slice(-2)), r.antes);
  assert.equal(r.despues, r.code); assert.equal(r.vuelve, r.antes); assert.ok(r.alto >= 44, 'botón de ' + r.alto + ' px');
  await page.close();
});

await caso('Punto 5 · Manual: los avisos largos van plegados en móvil con «Ver más» y se abren al tocarlo', async () => {
  const page = await abrir();
  const r = await page.evaluate(async () => {
    const ch = MANUAL_CHAPTERS.find(c => /manual-(warning|tip)/.test(gl(c.content || {}) || JSON.stringify(c.content)));
    openManualAt(ch.id); await new Promise(r => setTimeout(r, 700));
    const av = [...document.querySelectorAll('.mnl-cuerpo .mnl-av-largo')]; if(!av.length) return {n: 0};
    const a = av[0], b = a.querySelector('.mnl-av-mas'); const plegado = a.getBoundingClientRect().height, boton = b.getBoundingClientRect().height;
    b.click(); const abierto = a.getBoundingClientRect().height; return {n: av.length, plegado, abierto, boton, cls: a.classList.contains('is-plegado')};
  });
  assert.ok(r.n > 0, 'ningún aviso largo encontrado'); assert.ok(r.plegado < r.abierto, `plegado ${r.plegado} / abierto ${r.abierto}`); assert.ok(r.boton >= 40 && !r.cls);
  await page.close();
});

await caso('Punto 6 · Oferta: «Nueva Carta» comparte fila con «Carta | Menús» (sin espacio muerto)', async () => {
  const page = await abrir();
  const r = await page.evaluate(async () => { navigate('carta'); await new Promise(r => setTimeout(r, 700)); return Math.abs(document.getElementById('of-nueva-carta').getBoundingClientRect().top - document.getElementById('oferta-tab-carta').getBoundingClientRect().top); });
  assert.ok(r < 8, 'dy=' + r); await page.close();
});

await caso('Punto 6 · Mi Negocio: en el acordeón la flecha no cae a una segunda línea ni el icono se queda solo', async () => {
  const page = await abrir();
  const r = await page.evaluate(async () => { currentFolder = 'gestion'; navigate('minegocio'); await new Promise(r => setTimeout(r, 900));
    return [...document.querySelectorAll('#view-minegocio .mn-grid > .card.mn-acc > h3')].filter(h => h.getClientRects().length).map(h => ({t: h.textContent.trim().replace(/\s+/g, ' ').slice(0, 30), h: Math.round(h.getBoundingClientRect().height), fw: getComputedStyle(h).flexWrap})); });
  assert.ok(r.length > 8); const malos = r.filter(x => x.fw !== 'nowrap' || x.h > 96); assert.equal(malos.length, 0, JSON.stringify(malos));
  const una = r.filter(x => !/VeriFactu|Pedidos para llevar|Pago online/.test(x.t) && x.h > 52); assert.equal(una.length, 0, JSON.stringify(una));
  await page.close();
});

await caso('Punto 6 · Novedades: grupos de clientes y temas van de dos en dos en móvil', async () => {
  const page = await abrir();
  const r = await page.evaluate(async () => { currentFolder = 'sala'; navigate('promocion'); setPromoTab('novedades'); await new Promise(r => setTimeout(r, 900));
    const s = [...document.querySelectorAll('.nv-seg')].slice(0, 2).map(b => Math.round(b.getBoundingClientRect().top)), t = [...document.querySelectorAll('.nv-tema')].slice(0, 2).map(b => Math.round(b.getBoundingClientRect().top)); return {s, t}; });
  assert.equal(r.s[0], r.s[1], 'grupos en una columna'); assert.equal(r.t[0], r.t[1], 'temas en una columna');
  await page.close();
});

await caso('Punto 7 · panel del coach: no pinta el relleno «(Contenido pendiente de definir)» pero no borra el dato', async () => {
  const src = fs.readFileSync('admin-panel/plan360.html', 'utf8');
  assert.ok(/function plan360TareaReal\(tk\)/.test(src)); assert.ok(/function taskRow\(tk, i\)\{\n  if\(tk && tk\.title && !plan360TareaReal\(tk\)\) return '';/.test(src), 'taskRow debe saltarse el relleno');
  const usos = (src.match(/plan360TareasReales\(d\)|plan360TareaReal\)/g) || []).length; assert.ok(usos >= 6, 'recuentos sin filtrar: ' + usos);
  assert.ok(/d\.tasks = d\.tasks\.filter\(tk => tk\.title\);/.test(src), 'guardar no debe quitar tareas (la fusión va por posición)');
});

await browser.close();
if(mal){ console.log(`\n❌ ${mal} caso(s) fallaron`); process.exit(1); }
console.log('\n✅ Pendientes del vídeo móvil (agente B): todo en orden');
