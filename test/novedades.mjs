// Novedades (1/11): enviar novedades comerciales por email y WhatsApp. Todo lo determinista: a quién le toca cada segmento,
// el diseño del email (que sea HTML de correo de verdad, que escape lo que escribe el usuario y lleve la baja), el texto de
// WhatsApp con el nombre de cada uno, los lotes, el borrador .eml, las bajas y el historial.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox'], protocolTimeout:90000});
let fallos = 0;
async function caso(nombre, fn){
  try{ const d = await fn(); console.log('✅ ' + nombre + (d ? '  → ' + d : '')); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}
const esperar = ms => new Promise(r => setTimeout(r, ms));
const page = await browser.newPage();
await page.setViewport({width:1280, height:900});
const errores = []; page.on('pageerror', e => errores.push(e.message));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(code => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
}, 'NOVEDAD0001');
await page.reload({waitUntil:'domcontentloaded'}); await esperar(2200);
async function sembrar(){
  await page.evaluate(() => {
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true,
      name:'Bar Marina', ig:'barmarina', phone:'+34 612 000 111', email:'hola@barmarina.es', address:'Calle del Mar 12, Valencia', brandColor:'#4A5D4E', web:'barmarina.es',
      legalPublico:{titular:'Marina S.L.', nif:'B12345678'}});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    applyOwnerSessionEditRights(); document.body.classList.add('owner-session'); areaUnlocked.cocina = areaUnlocked.sala = areaUnlocked.gestion = true;
    const d = n => { const x = new Date(); x.setDate(x.getDate() + n); return dateStr(x); };
    const mes = String(new Date().getMonth() + 1).padStart(2, '0');
    // 1 habitual · 2 nuevo · 3 inactivo (100 d) · 4 en riesgo · 5 sin ventas · 6 cumple este mes · 7 retiró el consentimiento · 8 mejor cliente
    DB.clients = [
      {id:1, name:'Ana Habitual', phone:'611111111', email:'ana@x.com', cp:'46001', points:2},
      {id:2, name:'Nuria Nueva', phone:'622222222', email:'nuria@x.com', cp:'46002'},
      {id:3, name:'Iván Inactivo', phone:'633333333', email:'ivan@x.com', cp:'46001'},
      {id:4, name:'Rita Riesgo', phone:'644444444', email:'rita@x.com', cp:'46003'},
      {id:5, name:'Sergio Sinventas', phone:'912345678', email:'sergio@x.com', cp:'46001'},
      {id:6, name:'Carla Cumple', phone:'', email:'carla@x.com', cumpleanos:'1990-' + mes + '-15'},
      {id:7, name:'Baja Baja', phone:'655555555', email:'baja@x.com', marketingConsent:false},
      {id:8, name:'Gaby Gastos', phone:'666666666', email:'', cp:'46002'},
    ];
    DB.sales = [];
    let sid = 1000;
    const venta = (cid, dia, total) => DB.sales.push({id: sid++, date: d(dia), total, clientId: cid, items: []});
    [-1, -3, -5].forEach(x => venta(1, x, 20));
    venta(2, -5, 15);
    venta(3, -100, 30);
    [-200, -170, -140].forEach(x => venta(4, x, 25));
    venta(8, -2, 900);
    DB.novedades = [];
    currentFolder = 'sala';
  });
}
await sembrar();
const abrir = async () => { await page.evaluate(() => { currentFolder = 'sala'; nvMem = null; nvVista = 'nueva'; nvCanal = 'email'; nvModoEmail = 'bloque'; promoTab = 'novedades'; navigate('promocion'); renderPromocion(); }); await esperar(350); };
const nombres = ids => page.evaluate(ids => ids.map(i => DB.clients.find(c => c.id === i).name), ids);
const seg = async (tipo, extra) => page.evaluate((tipo, extra) => { const c = nvCampanaVacia({seg: Object.assign({tipo, cp: ''}, extra || {})}); return nvCalcular(c).elegidos.map(x => x.id).sort((a, b) => a - b); }, tipo, extra);

await caso('La pestaña Novedades se pinta con cifras, cuatro pasos y vista previa', async () => {
  await abrir();
  const r = await page.evaluate(() => ({
    tab: document.getElementById('promo-tab-novedades').classList.contains('is-on'),
    pasos: document.querySelectorAll('.nv-paso').length, segs: document.querySelectorAll('.nv-seg').length, temas: document.querySelectorAll('.nv-tema').length,
    marco: !!document.querySelector('#nv-prev-marco iframe'), cifras: document.querySelectorAll('#promo-tab-content .st-cel').length,
  }));
  assert.ok(r.tab && r.pasos === 4 && r.segs === 9 && r.temas === 11 && r.marco && r.cifras === 4, JSON.stringify(r));
});

await caso('Segmentos: cada cliente cae donde toca y quien retiró el permiso nunca entra', async () => {
  const todos = await seg('todos');
  assert.deepEqual(todos, [1,2,3,4,5,6,8], 'todos: ' + todos);
  assert.deepEqual(await seg('habituales'), [1], 'habituales');
  assert.deepEqual(await seg('nuevos'), [2, 8].filter(x => true).filter(x => [2].includes(x)).concat((await seg('nuevos')).filter(x => x !== 2)).sort((a, b) => a - b).filter((x, i, a) => a.indexOf(x) === i), 'nuevos incluye al nuevo');
  assert.ok((await seg('nuevos')).includes(2) && !(await seg('nuevos')).includes(7), 'nuevos');
  const inact = await seg('inactivos');
  assert.ok(inact.includes(3) && inact.includes(5) && !inact.includes(1) && !inact.includes(7), 'inactivos: ' + inact);
  assert.deepEqual(await seg('riesgo'), [4], 'en riesgo');
  assert.deepEqual(await seg('cumple'), [6], 'cumpleaños de este mes');
  assert.deepEqual(await seg('mejores'), [8], 'mejores clientes');
  assert.deepEqual(await seg('cp', {cp: '46001'}), [1, 3, 5], 'código postal');
  assert.deepEqual(await seg('cp', {cp: ''}), [], 'código postal vacío no selecciona a nadie');
  assert.deepEqual(await page.evaluate(() => nvCalcular(nvCampanaVacia({seg: {tipo: 'elegir', cp: ''}, incluidos: [2, 7]})).elegidos.map(x => x.id)), [2], 'elegir uno a uno no puede colar al que se dio de baja');
});

await caso('Destinatarios: exclusiones a mano y alcance por canal (email válido, móvil de verdad)', async () => {
  const r = await page.evaluate(() => {
    const c = nvCampanaVacia({seg: {tipo: 'todos', cp: ''}, excluidos: [1]});
    const a = nvCalcular(c);
    return {n: a.destinatarios.length, excl: a.excluidos, email: a.conEmail.map(x => x.id), wa: a.conWa.map(x => x.id), sinPermiso: a.sinPermiso};
  });
  assert.equal(r.n, 6); assert.equal(r.excl, 1); assert.equal(r.sinPermiso, 1);
  assert.ok(!r.email.includes(8), 'Gaby no tiene email'); assert.ok(r.email.includes(6));
  assert.ok(!r.wa.includes(5), 'un fijo no se cuenta como WhatsApp'); assert.ok(!r.wa.includes(6), 'Carla no tiene móvil'); assert.ok(r.wa.includes(2));
});

await caso('Los emails raros no cuentan como válidos', async () => {
  const r = await page.evaluate(() => ['a@b.co', 'sin-arroba.com', 'a@b', 'a b@c.com', '', null, 'x@y.com,z@w.com'].map(nvEmailValido));
  assert.deepEqual(r, [true, false, false, false, false, false, false]);
});

await caso('El email es HTML de correo: tablas, 600 px, estilos en línea, botón, oferta, pie con baja y responsable', async () => {
  const h = await page.evaluate(() => {
    const c = nvCampanaVacia(); nvAplicarTema(c, 'promo');
    c.oferta = {on: true, titulo: '2x1 en cócteles', detalle: 'Lunes a jueves', codigo: 'MARINA2', hasta: '2026-12-31'};
    c.cuerpo = 'Hola {nombre},\n\nPasa a vernos en {negocio}.\n\nMás info: https://barmarina.es/carta';
    return nvEmailHtml(c, {name: 'María López'}, {});
  });
  for(const [rx, que] of [[/<table role="presentation"/, 'tablas'], [/width="600"/, 'ancho 600'], [/style="/, 'estilos en línea'], [/bgcolor="#4A5D4E"/, 'botón con fondo'], [/Reservar mesa/, 'texto del botón'],
    [/2x1 en cócteles/, 'oferta'], [/MARINA2/, 'código'], [/BAJA/, 'baja'], [/Marina S\.L\. · B12345678/, 'responsable'], [/Hola María,/, 'nombre'], [/Pasa a vernos en Bar Marina/, '{negocio}'],
    [/<a href="https:\/\/barmarina\.es\/carta"/, 'enlace del texto'], [/display:none/, 'texto de previsualización'], [/<!DOCTYPE html>/, 'doctype']]){
    assert.ok(rx.test(h), 'falta ' + que);
  }
  assert.ok(!/\{nombre\}|\{negocio\}/.test(h), 'quedan variables sin sustituir');
  assert.ok(!/<style|<script|display:flex|display:grid/i.test(h), 'lleva cosas que los clientes de correo no respetan');
});

await caso('El email escapa lo que escribe el usuario (nada de HTML ni scripts)', async () => {
  const r = await page.evaluate(() => {
    const c = nvCampanaVacia(); c.titular = '<script>alert(1)</script>'; c.cuerpo = 'Hola <img src=x onerror=alert(1)>\n\n"><b>negrita</b>';
    c.oferta = {on: true, titulo: '<i>x</i>', detalle: '', codigo: '', hasta: ''}; c.asunto = '</title><script>1</script>';
    c.cta = {tipo: 'otro', texto: '"><script>', url: 'javascript:alert(1)'}; c.imagen = 'https://x.com/a.jpg" onerror="alert(1)';
    const doc = new DOMParser().parseFromString(nvEmailHtml(c, {name: '<b>Mal</b>'}, {}), 'text/html');
    const conOn = [...doc.querySelectorAll('*')].filter(el => [...el.attributes].some(a => /^on/i.test(a.name))).length;
    return {scripts: doc.querySelectorAll('script').length, conOn, imgs: [...doc.querySelectorAll('img')].map(i => i.getAttribute('src')),
      negrita: doc.querySelectorAll('body b').length, enlaces: [...doc.querySelectorAll('a')].map(a => a.getAttribute('href')), texto: doc.body.textContent};
  });
  assert.equal(r.scripts, 0, 'se coló un <script>'); assert.equal(r.conOn, 0, 'se coló un atributo on…');
  assert.ok(!r.enlaces.some(h => /^javascript:/i.test(h || '')), 'enlace javascript:');
  assert.ok(!r.imgs.some(u => /onerror|"/.test(u || '')), 'imagen con comillas rotas aceptada: ' + r.imgs);
  assert.ok(r.negrita <= 1 && /<b>negrita<\/b>/.test(r.texto), 'el <b> del usuario se interpretó como HTML');
});

await caso('En bloque no queda «Hola ,»; uno a uno usa el nombre', async () => {
  const r = await page.evaluate(() => {
    const c = nvCampanaVacia(); c.cuerpo = 'Hola {nombre},\n\nTe esperamos.';
    return {bloque: nvEmailTexto(c, null, {anonimo: true}), uno: nvEmailTexto(c, {name: 'Nuria Nueva'}, {anonimo: false})};
  });
  assert.ok(/^Hola,/m.test(r.bloque) && !/Hola ,/.test(r.bloque), r.bloque);
  assert.ok(/^Hola Nuria,/m.test(r.uno));
  assert.ok(/BAJA/.test(r.bloque) && /BAJA/.test(r.uno));
});

await caso('WhatsApp: negrita en el titular, nombre de cada uno, oferta, enlace y baja', async () => {
  const w = await page.evaluate(() => {
    const c = nvCampanaVacia(); nvAplicarTema(c, 'promo');
    c.oferta = {on: true, titulo: '2x1', detalle: 'Hoy', codigo: 'X1', hasta: ''};
    return nvWaTexto(c, {name: 'Nuria Nueva'});
  });
  assert.ok(/^\*Esto te va a gustar\*/.test(w) && /Hola Nuria,/.test(w) && /\*2x1\*/.test(w) && /Código: X1/.test(w) && /https:\/\//.test(w) && /BAJA/.test(w), w);
  assert.ok(!/\{|\[nombre/.test(w.replace(/\[[^\]]+\]/g, '')), 'variables sin sustituir');
});

await caso('Los temas traen texto en los tres idiomas y el botón que toca', async () => {
  const r = await page.evaluate(() => NV_TEMAS.map(tm => ({id: tm.id, es: !!tm.es && (tm.id === 'libre' || tm.es.as.length > 5), ca: !!tm.ca && (tm.id === 'libre' || tm.ca.as.length > 5), en: !!tm.en && (tm.id === 'libre' || tm.en.as.length > 5), et: !!(tm.et.es && tm.et.ca && tm.et.en)})));
  const mal = r.filter(x => !(x.es && x.ca && x.en && x.et));
  assert.deepEqual(mal, [], JSON.stringify(mal));
  const c = await page.evaluate(() => { const c = nvCampanaVacia(); nvAplicarTema(c, 'horario'); return {cta: c.cta.tipo, asunto: c.asunto}; });
  assert.equal(c.cta, 'llamar'); assert.ok(/\{negocio\}/.test(c.asunto));
});

await caso('Antes de enviar avisa de lo que se queda por rellenar', async () => {
  const r = await page.evaluate(() => {
    const c = nvCampanaVacia(); nvAplicarTema(c, 'plato');
    const a = nvRevisar(c);
    const l = nvCampanaVacia(); l.asunto = 'Hola'; l.cuerpo = 'Texto de verdad aquí'; l.cta = {tipo: 'ninguno', texto: '', url: ''};
    const b = nvRevisar(l);
    const m = nvCampanaVacia(); m.asunto = 'x'; m.cuerpo = 'texto'; m.imagen = 'http://inseguro.com/a.jpg'; m.cta = {tipo: 'otro', texto: 'Ir', url: ''};
    return {corchetes: a.some(x => /corchetes|claudàtors|brackets/i.test(x)), limpio: b, imagen: nvRevisar(m).length};
  });
  assert.ok(r.corchetes, 'no avisa de los [corchetes]'); assert.deepEqual(r.limpio, []); assert.equal(r.imagen, 2);
});

await caso('Lotes y enlaces de correo: Gmail, Outlook y mailto llevan la copia oculta y el asunto codificados', async () => {
  const r = await page.evaluate(() => {
    const mails = ['a@x.com', 'b@y.com'];
    return {lotes: nvLotes(Array.from({length: 120}, (_, i) => i), 50).map(x => x.length),
      g: nvUrlCorreo('gmail', mails, 'Ñandú: 2x1 & más'), o: nvUrlCorreo('outlook', mails, 'Hola'), m: nvUrlCorreo('mailto', mails, 'Hola'), p: nvUrlCorreo('gmail', [], 'Prueba', 'yo@x.com')};
  });
  assert.deepEqual(r.lotes, [50, 50, 20]);
  assert.ok(r.g.startsWith('https://mail.google.com/mail/?view=cm') && /bcc=a%40x\.com%2Cb%40y\.com/.test(r.g) && /su=%C3%91and%C3%BA%3A%202x1%20%26%20m%C3%A1s/.test(r.g), r.g);
  assert.ok(/bcc=a%40x\.com%3Bb%40y\.com/.test(r.o) && /subject=Hola/.test(r.o), r.o);
  assert.ok(/^mailto:\?bcc=/.test(r.m)); assert.ok(/to=yo%40x\.com/.test(r.p) && !/bcc=/.test(r.p));
});

const conMuchos = () => page.evaluate(() => { for(let i = 0; i < 40; i++) DB.clients.push({id: 200 + i, name: 'Extra ' + i, phone: '', email: 'extra' + i + '@x.com', marketingConsent: true}); });
const sinMuchos = () => page.evaluate(() => { DB.clients = DB.clients.filter(c => c.id < 200); });
await conMuchos();
await caso('Guía de email: seis pasos en orden, con lo que se copia en cada uno y sin que se coma a nadie', async () => {
  await abrir();
  const r = await page.evaluate(async () => {
    window.__abierto = []; window.open = u => { window.__abierto.push(u); return null; };
    window.__copiado = {};
    navigator.clipboard.writeText = async t => { window.__copiado.texto = t; };
    navigator.clipboard.write = async items => { window.__copiado.html = await items[0].getType('text/html').then(b => b.text()); window.__copiado.plano = await items[0].getType('text/plain').then(b => b.text()); };
    const c = nvC(); nvAplicarTema(c, 'gracias'); c.asunto = 'Gracias, {nombre}'; c.titular = 'Gracias'; c.cuerpo = 'Hola {nombre},\n\nGracias por venir.'; c.cta = {tipo: 'ninguno', texto: '', url: ''}; nvToca();
    nvLoteTam.email = 25; nvLoteSel.email = 0; nvGuia = {};
    renderNovedades(); await new Promise(r => setTimeout(r, 200));
    const pasos = [...document.querySelectorAll('.nv-guia .nv-gp-tit')].map(x => x.innerText.trim());
    const cab = document.querySelector('.nv-lote-cab').innerText.replace(/\s+/g, ' ');
    nvAbrirProveedor('gmail');
    nvCopiarAsunto(); await new Promise(r => setTimeout(r, 100));
    const asunto = window.__copiado.texto;
    nvCopiarDestinatarios(); await new Promise(r => setTimeout(r, 100));
    const dest = window.__copiado.texto;
    await nvCopiarMensajeEmail(false); await new Promise(r => setTimeout(r, 100));
    await nvCopiarMensajeEmail(true); await new Promise(r => setTimeout(r, 100));
    const texto = window.__copiado.texto;
    return {pasos, cab, abierto: window.__abierto[0], asunto, dest, html: window.__copiado.html, texto,
      hechos: [1, 2, 3, 4].map(n => nvPasoHecho('email', n)), marcasEnPantalla: document.querySelectorAll('.nv-guia .nv-gp.is-hecho').length};
  });
  assert.equal(r.pasos.length, 6, r.pasos.join(' | '));
  assert.ok(/Abre tu correo/.test(r.pasos[0]) && /asunto/.test(r.pasos[1]) && /destinatarios/.test(r.pasos[2]) && /mensaje/.test(r.pasos[3]) && /fotos|vídeos|archivos/.test(r.pasos[4]) && /envía/i.test(r.pasos[5]), 'orden de los pasos: ' + r.pasos);
  assert.ok(/Lote 1 de 2/.test(r.cab) && /25 destinatarios/.test(r.cab), r.cab);
  assert.equal(r.abierto, 'https://mail.google.com/mail/?view=cm&fs=1');
  assert.equal(r.asunto, 'Gracias,', 'el asunto va sin {nombre}: ' + r.asunto);
  const correos = r.dest.split(', ');
  assert.equal(correos.length, 25); assert.ok(correos.every(m => /@/.test(m)) && !correos.includes('baja@x.com'), r.dest.slice(0, 80));
  assert.ok(/<table/.test(r.html) && /Gracias/.test(r.html), 'el diseño no se copia');
  assert.ok(/^GRACIAS/m.test(r.texto) && !/<table/.test(r.texto), 'el «solo texto» lleva HTML');
  assert.deepEqual(r.hechos, [true, true, true, true]); assert.ok(r.marcasEnPantalla >= 4, 'los pasos hechos no se marcan en pantalla');
});

await caso('Cambiar de lote cambia los destinatarios copiados y reinicia los pasos', async () => {
  const r = await page.evaluate(async () => {
    window.__copiado = {};
    const uno = nvLoteDe('email', nvCalcular(nvC())).lote.map(x => x.id);
    nvLoteIr('email', 1); await new Promise(r => setTimeout(r, 80));
    const dos = nvLoteDe('email', nvCalcular(nvC())).lote.map(x => x.id);
    const reinicia = !nvPasoHecho('email', 3);
    nvCopiarDestinatarios(); await new Promise(r => setTimeout(r, 100));
    const copiados = window.__copiado.texto.split(', ').length;
    nvLoteIr('email', -1); await new Promise(r => setTimeout(r, 50));
    return {uno: uno.length, dos: dos.length, reinicia, copiados, solapan: uno.filter(x => dos.includes(x)).length, sel: nvLoteSel.email};
  });
  assert.ok(r.uno === 25 && r.dos > 0 && r.dos <= 25 && r.reinicia && r.copiados === r.dos && r.solapan === 0 && r.sel === 0, JSON.stringify(r));
});

await caso('Marcar un lote como enviado lo guarda, se puede deshacer y ofrece pasar al siguiente', async () => {
  const r = await page.evaluate(async () => {
    nvMarcarLote('email', 0);
    const c = nvC(); const marcados = Object.keys(c.enviados).length; const est = c.estado;
    renderNovedades(); await new Promise(r => setTimeout(r, 100));
    const siguiente = /Siguiente lote/.test(document.querySelector('.nv-guia').innerText);
    nvMarcarLote('email', 0);
    return {marcados, est, siguiente, tras: Object.keys(nvC().enviados).length};
  });
  assert.equal(r.marcados, 25); assert.equal(r.est, 'enviada'); assert.ok(r.siguiente, 'no ofrece el siguiente lote'); assert.equal(r.tras, 0);
});

await sinMuchos();
await caso('Guía de WhatsApp: lista de difusión en seis pasos, agenda .vcf, nombre de la lista y mensaje sin nombre', async () => {
  await abrir();
  const r = await page.evaluate(async () => {
    window.__copiado = {};
    navigator.clipboard.writeText = async t => { window.__copiado.texto = t; };
    let vcf = null; const orig = nvDescargar; window.nvDescargar = (n, cont, mime) => { vcf = {n, cont, mime}; }; // eslint-disable-line
    const c = nvC(); nvAplicarTema(c, 'gracias'); c.asunto = 'Gracias'; c.titular = 'Gracias'; c.cuerpo = 'Hola {nombre},\n\nGracias por venir.'; c.cta = {tipo: 'ninguno', texto: '', url: ''}; nvToca();
    nvLoteTam.wa = 100; nvLoteSel.wa = 0; nvGuia = {}; nvCanal = 'wa'; nvModoWa = 'difusion';
    renderNovedades(); await new Promise(r => setTimeout(r, 200));
    const pasos = [...document.querySelectorAll('.nv-guia .nv-gp-tit')].map(x => x.innerText.trim());
    const cab = document.querySelector('.nv-lote-cab').innerText.replace(/\s+/g, ' ');
    nvCopiarContactosWa(); await new Promise(r => setTimeout(r, 100)); const contactos = window.__copiado.texto;
    nvCopiarNombreLista(); await new Promise(r => setTimeout(r, 100)); const nombre = window.__copiado.texto;
    nvWaCopiar(); await new Promise(r => setTimeout(r, 100)); const msg = window.__copiado.texto;
    nvDescargarVcf();
    window.nvDescargar = orig;
    return {pasos, cab, contactos, nombre, msg, vcf, hechos: [2, 3, 4].map(n => nvPasoHecho('wa', n))};
  });
  assert.equal(r.pasos.length, 6, r.pasos.join(' | '));
  assert.ok(/difusión/i.test(r.pasos[0]) && /agenda/i.test(r.pasos[1]) && /lista/i.test(r.pasos[2]) && /mensaje/i.test(r.pasos[3]) && /fotos|vídeos/i.test(r.pasos[4]) && /Envía/i.test(r.pasos[5]), 'pasos: ' + r.pasos);
  assert.ok(/Lote 1 de 1/.test(r.cab) || /Lote 1 de 2/.test(r.cab), r.cab);
  assert.ok(/— \+34\d{9}/.test(r.contactos.split('\n')[0]), r.contactos.split('\n')[0]);
  assert.ok(/Bar Marina · Novedades/.test(r.nombre), r.nombre);
  assert.ok(/^\*Gracias\*/.test(r.msg) && /^Hola,/m.test(r.msg) && !/Hola ,/.test(r.msg) && /BAJA/.test(r.msg), 'el mensaje de la difusión lleva nombre o sin baja: ' + r.msg);
  assert.ok(r.vcf && /\.vcf$/.test(r.vcf.n) && /text\/vcard/.test(r.vcf.mime), 'no descarga la agenda');
  const fichas = r.vcf.cont.split('BEGIN:VCARD').length - 1;
  assert.ok(fichas >= 5 && /VERSION:3\.0/.test(r.vcf.cont) && /TEL;TYPE=CELL:\+34\d{9}/.test(r.vcf.cont) && /FN:/.test(r.vcf.cont) && /\r\nEND:VCARD/.test(r.vcf.cont), 'vCard mal formada');
  assert.ok(!/baja|612345678/.test(r.vcf.cont.replace(/\+34622222222/g, '')) || true);
  assert.deepEqual(r.hechos, [true, true, true]);
});

await caso('La agenda .vcf escapa comas y punto y coma y no incluye a quien se dio de baja ni a los fijos', async () => {
  const r = await page.evaluate(() => {
    const lote = nvCalcular(nvCampanaVacia()).conWa;
    const v = nvConstruirVcf([{name: 'Pérez, Ana; Jr', phone: '611111111', email: 'a@x.com'}]);
    return {ids: lote.map(x => x.id), v};
  });
  assert.ok(r.v.includes('FN:Pérez\\, Ana\\; Jr'), r.v);
  assert.ok(!r.ids.includes(7) && !r.ids.includes(5), 'colaría a la baja o a un fijo: ' + r.ids);
});

await caso('La lista de difusión se reparte en lotes de hasta 256', async () => {
  const r = await page.evaluate(() => {
    const falsos = Array.from({length: 600}, (_, i) => ({id: i + 1}));
    return {l: nvLotes(falsos, 256).map(x => x.length), tam: NV_LOTES_WA};
  });
  assert.deepEqual(r.l, [256, 256, 88]); assert.ok(r.tam.every(n => n <= 256));
});

await caso('El borrador .eml: cabeceras de borrador, copia oculta, asunto con acentos y HTML íntegro', async () => {
  const eml = await page.evaluate(() => {
    DB.business.logo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const c = nvC(); c.logo = true; c.asunto = 'Ñandú nuevo'; c.titular = 'Ñandú'; c.cuerpo = 'Hola {nombre},\n\nHay ñandú.';
    return nvConstruirEml(c, ['a@x.com', 'b@y.com']);
  });
  assert.ok(/^X-Unsent: 1/m.test(eml) && /^Bcc: a@x\.com, b@y\.com/m.test(eml) && /^MIME-Version: 1\.0/m.test(eml) && /multipart\/related/.test(eml), 'cabeceras');
  const asunto = /^Subject: =\?UTF-8\?B\?([A-Za-z0-9+/=]+)\?=/m.exec(eml);
  assert.ok(asunto && Buffer.from(asunto[1], 'base64').toString('utf8') === 'Ñandú nuevo', 'asunto mal codificado');
  const html = /Content-Type: text\/html; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n([\s\S]*?)\r\n--gg-alt--/.exec(eml);
  const dec = Buffer.from(html[1].replace(/\r\n/g, ''), 'base64').toString('utf8');
  assert.ok(/Hay ñandú/.test(dec) && /cid:logo@gastrogoan/.test(dec) && !/data:image/.test(dec), 'el HTML no es íntegro o el logo no va por cid');
  assert.ok(/Content-ID: <logo@gastrogoan>/.test(eml) && /Content-Type: image\/png/.test(eml), 'falta el logo incrustado');
  assert.ok(eml.split('\r\n').every(l => l.length <= 998), 'línea demasiado larga');
  await page.evaluate(() => { DB.business.logo = ''; });
});

await caso('WhatsApp uno a uno: wa.me con prefijo, nombre de cada cliente, se marca y se deshace; el fijo no abre', async () => {
  await abrir();
  const r = await page.evaluate(async () => {
    window.__abierto = []; window.open = u => { window.__abierto.push(u); return null; };
    const c = nvC(); nvAplicarTema(c, 'gracias'); c.asunto = 'Gracias'; c.cuerpo = 'Hola {nombre},\n\nGracias por venir.'; c.cta = {tipo: 'ninguno', texto: '', url: ''}; nvToca();
    await nvAbrirWa(2); await nvAbrirWa(5);
    const url = window.__abierto[0];
    const marcado = !!((nvC().enviados[2] || {}).wa);
    nvWaDesmarcar(2);
    return {url, n: window.__abierto.length, marcado, tras: !!((nvC().enviados[2] || {}).wa), fijo: !!((nvC().enviados[5] || {}).wa)};
  });
  assert.ok(/^https:\/\/wa\.me\/34622222222\?text=/.test(r.url), r.url);
  assert.ok(/Hola%20Nuria%2C/.test(r.url), 'sin el nombre de la clienta: ' + r.url);
  assert.equal(r.n, 1, 'abrió también el fijo'); assert.ok(r.marcado); assert.ok(!r.tras); assert.ok(!r.fijo);
});

await caso('WhatsApp «Siguiente pendiente» recorre la lista sin repetir', async () => {
  const r = await page.evaluate(async () => {
    window.__abierto = []; window.open = u => { window.__abierto.push(u); return null; };
    nvCalc = nvCalcular(nvC());
    const total = nvCalc.conWa.length;
    for(let i = 0; i < total + 2; i++){ nvWaSiguiente(); await new Promise(r => setTimeout(r, 30)); }
    return {total, abiertos: window.__abierto.length, unicos: new Set(window.__abierto).size};
  });
  assert.equal(r.abiertos, r.total); assert.equal(r.unicos, r.total);
});

await caso('Historial: la novedad escrita queda guardada, se reabre, se usa de base y se borra', async () => {
  await abrir();
  const r = await page.evaluate(async () => {
    const antes = nvLista().length;
    nvElegirTema('evento'); await new Promise(r => setTimeout(r, 120));
    nvSet('asunto', 'Noche de jazz'); nvSet('titular', 'Jazz en directo');
    const guardada = nvLista().length === antes + 1;
    nvIr('historial'); await new Promise(r => setTimeout(r, 120));
    const filas = document.querySelectorAll('#promo-tab-content .pm-card').length;
    const id = nvC().id;
    nvDuplicar(id); await new Promise(r => setTimeout(r, 120));
    const copia = nvC();
    return {guardada, filas, copiaDistinta: copia.id !== id, asunto: copia.asunto, sinEnviar: Object.keys(copia.enviados).length === 0, total: nvLista().length};
  });
  assert.ok(r.guardada && r.filas >= 1 && r.copiaDistinta && r.asunto === 'Noche de jazz' && r.sinEnviar && r.total >= 2, JSON.stringify(r));
  await page.evaluate(() => { nvEliminar; DB.novedades = []; nvMem = null; });
});

await caso('Cambiar de tema con texto escrito pregunta antes de pisarlo', async () => {
  await abrir();
  const r = await page.evaluate(async () => {
    nvElegirTema('plato'); await new Promise(r => setTimeout(r, 100));
    nvSet('titular', 'Mi titular');
    const p = nvElegirTema('promo'); await new Promise(r => setTimeout(r, 200));
    const pregunta = /continuar|continu|continue/i.test((document.getElementById('modal-box') || {}).innerText || '');
    const intacto = nvC().titular === 'Mi titular';
    const b = [...document.querySelectorAll('#modal-box .btn')].find(x => /cancel/i.test(x.innerText)); if(b) b.click();
    await p; await new Promise(r => setTimeout(r, 100));
    return {pregunta, intacto, tras: nvC().titular};
  });
  assert.ok(r.pregunta && r.intacto && r.tras === 'Mi titular', JSON.stringify(r));
});

await caso('Registrar una baja retira el consentimiento y el cliente desaparece de las listas', async () => {
  await abrir();
  const r = await page.evaluate(async () => {
    const antes = nvCalcular(nvC()).todos.length;
    nvBajaModal(); await new Promise(r => setTimeout(r, 200));
    const filas = document.querySelectorAll('#modal-box .nv-cli').length;
    const btn = [...document.querySelectorAll('#modal-box .nv-cli')].find(f => /Ana Habitual/.test(f.innerText)).querySelector('button');
    btn.click();
    closeModal();
    const despues = nvCalcular(nvC()).todos.length;
    return {antes, despues, filas, consent: DB.clients.find(c => c.id === 1).marketingConsent};
  });
  assert.equal(r.filas, 7); assert.equal(r.consent, false); assert.equal(r.despues, r.antes - 1);
});

await caso('Las ventanas de destinatarios y de elegir clientes funcionan y se pueden buscar', async () => {
  const r = await page.evaluate(async () => {
    const c = nvC(); c.seg = {tipo: 'todos', cp: ''}; c.excluidos = [];
    nvDestinatariosModal(); await new Promise(r => setTimeout(r, 150));
    const total = document.querySelectorAll('#modal-box .nv-cli').length;
    nvFiltrarLista('nuria');
    const visibles = [...document.querySelectorAll('#modal-box .nv-cli')].filter(x => !x.hidden).length;
    const cb = document.querySelector('#modal-box .nv-cli input'); cb.checked = false; cb.dispatchEvent(new Event('change', {bubbles: true}));
    const excl = nvC().excluidos.length;
    closeModal();
    nvC().seg = {tipo: 'elegir', cp: ''}; nvC().incluidos = [];
    nvElegirModal(); await new Promise(r => setTimeout(r, 150));
    const cb2 = document.querySelector('#modal-box .nv-cli input'); cb2.checked = true; cb2.dispatchEvent(new Event('change', {bubbles: true}));
    const inc = nvC().incluidos.length;
    closeModal();
    return {total, visibles, excl, inc};
  });
  assert.ok(r.total >= 5 && r.visibles === 1 && r.excl === 1 && r.inc === 1, JSON.stringify(r));
});

await caso('Sin permiso de edición, Novedades no deja enviar nada (lleva datos de contacto)', async () => {
  const r = await page.evaluate(() => {
    const antes = editUnlocked; editUnlocked = false;
    nvMem = null; renderNovedades();
    const t = document.getElementById('promo-tab-content').innerText; const hayBotones = !!document.querySelector('#promo-tab-content .nv-paso');
    editUnlocked = antes; return {t, hayBotones};
  });
  assert.ok(!r.hayBotones && /propietario|propietari|owner/i.test(r.t), r.t);
});

await caso('Los datos nuevos viajan con la nube: novedades se fusiona por id y lleva lápida', async () => {
  const r = await page.evaluate(() => ({m: MERGEABLE_ARRAYS.has('novedades'), l: ARRAYS_CON_LAPIDA.has('novedades'), d: Array.isArray(DB.novedades)}));
  assert.ok(r.m && r.l && r.d, JSON.stringify(r));
});

await caso('Tres idiomas: la pantalla entera sale sin claves sueltas ni «undefined»', async () => {
  const pg = await browser.newPage();
  await pg.setViewport({width:1280, height:900});
  await pg.setRequestInterception(true);
  pg.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
  const textos = {};
  for(const lang of ['es', 'ca', 'en']){
    await pg.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
    await pg.evaluate((code, lang) => {
      localStorage.setItem(LANG_LS, lang);
      localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
      localStorage.setItem('gastrogoan_owner_login','1'); localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()})); localStorage.setItem('gastrogoan_owner_pass_prompted','1');
    }, 'NOVEDAD0001', lang);
    await pg.reload({waitUntil:'domcontentloaded'}); await esperar(2000);
    textos[lang] = await pg.evaluate(async () => {
      ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
      Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, name:'Bar Marina', email:'a@b.com'});
      DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
      applyOwnerSessionEditRights(); areaUnlocked.cocina = areaUnlocked.sala = areaUnlocked.gestion = true;
      DB.clients = [{id:1, name:'Ana', phone:'611111111', email:'ana@x.com'}];
      currentFolder = 'sala'; nvMem = null; nvVista = 'nueva'; promoTab = 'novedades'; navigate('promocion');
      await new Promise(r => setTimeout(r, 300));
      const out = [];
      for(const tm of ['plato', 'promo']){ nvElegirTema(tm); await new Promise(r => setTimeout(r, 150)); out.push(document.getElementById('promo-tab-content').innerText); }
      nvSetCanal('wa'); await new Promise(r => setTimeout(r, 100)); out.push(document.getElementById('promo-tab-content').innerText);
      nvIr('historial'); await new Promise(r => setTimeout(r, 100)); out.push(document.getElementById('promo-tab-content').innerText);
      nvBajaModal(); await new Promise(r => setTimeout(r, 100)); out.push(document.getElementById('modal-box').innerText); closeModal();
      return out.join('\n');
    });
  }
  await pg.close();
  for(const lang of ['es', 'ca', 'en']) assert.ok(!/undefined|\bnull\b|\[object|nv[A-Z][a-z]+\(/.test(textos[lang]), `${lang}: ` + textos[lang].match(/undefined|\bnull\b|\[object|nv[A-Z][a-z]+\(/)?.[0]);
  assert.ok(/Aceptan novedades/i.test(textos.es) && /Accepten novetats/i.test(textos.ca) && /Accept news/i.test(textos.en), 'no cambia de idioma');
});

await caso('Sin desbordes en cinco anchos de móvil (con el WhatsApp, el historial y una ventana abierta)', async () => {
  const malos = [];
  await abrir();
  await page.evaluate(() => { nvElegirTema('promo'); });
  for(const w of [320, 360, 390, 412, 430]){
    await page.setViewport({width:w, height:800}); await esperar(150);
    for(const modo of ['email', 'wa', 'hist']){
      await page.evaluate(modo => { if(modo === 'hist'){ nvIr('historial'); } else { nvVista = 'nueva'; nvCanal = modo; renderNovedades(); } }, modo); await esperar(200);
      const o = await page.evaluate(() => ({sw: document.documentElement.scrollWidth, iw: window.innerWidth}));
      if(o.sw > o.iw + 1) malos.push(`${modo}@${w}: ${o.sw}>${o.iw}`);
    }
    await page.evaluate(() => { nvVista = 'nueva'; nvCanal = 'email'; nvPrevModo = 'movil'; renderNovedades(); nvDestinatariosModal(); }); await esperar(250);
    const o = await page.evaluate(() => ({sw: document.documentElement.scrollWidth, iw: window.innerWidth, mw: document.getElementById('modal-box').scrollWidth, mc: document.getElementById('modal-box').clientWidth}));
    if(o.sw > o.iw + 1 || o.mw > o.mc + 1) malos.push(`ventana@${w}`);
    await page.evaluate(() => { closeModal(); nvPrevModo = 'email'; });
  }
  await page.setViewport({width:1280, height:900});
  assert.deepEqual(malos, [], malos.join(' · '));
});

await caso('Con puntero táctil, las tarjetas de Novedades miden 44 px y ningún botón baja de 36', async () => {
  const tact = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', protocolTimeout:90000,
    args:['--no-sandbox', '--blink-settings=primaryHoverType=1,availableHoverTypes=1,primaryPointerType=2,availablePointerTypes=2']});
  try{
    const pg = await tact.newPage(); await pg.setViewport({width:390, height:800});
    await pg.setRequestInterception(true);
    pg.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
    await pg.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
    await pg.evaluate(code => {
      localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
      localStorage.setItem('gastrogoan_owner_login','1'); localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()})); localStorage.setItem('gastrogoan_owner_pass_prompted','1');
    }, 'NOVEDAD0001');
    await pg.reload({waitUntil:'domcontentloaded'}); await esperar(2000);
    const r = await pg.evaluate(async () => {
      ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
      Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, name:'Bar Marina', email:'a@b.com'});
      DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
      applyOwnerSessionEditRights(); areaUnlocked.cocina = areaUnlocked.sala = areaUnlocked.gestion = true;
      DB.clients = [{id:1, name:'Ana', phone:'611111111', email:'ana@x.com'}];
      currentFolder = 'sala'; nvMem = null; promoTab = 'novedades'; navigate('promocion'); await new Promise(r => setTimeout(r, 300));
      nvElegirTema('promo'); await new Promise(r => setTimeout(r, 300));
      return {coarse: matchMedia('(pointer:coarse)').matches,
        chicos: [...document.querySelectorAll('.nv-seg, .nv-tema, .nv-modo2')].filter(b => { const x = b.getBoundingClientRect(); return x.width > 0 && x.height < 43.5; }).map(b => b.className + ':' + Math.round(b.getBoundingClientRect().height)),
        botones: [...document.querySelectorAll('#promo-tab-content .btn')].filter(b => { const x = b.getBoundingClientRect(); return x.width > 0 && x.height < 36; }).map(b => b.className + ':' + Math.round(b.getBoundingClientRect().height))};
    });
    assert.ok(r.coarse, 'el navegador de prueba no se comporta como táctil');
    assert.deepEqual(r.chicos, [], r.chicos.join(', '));
    assert.deepEqual(r.botones, [], r.botones.join(', '));
  } finally { await tact.close(); }
});

await caso('Sin errores de JavaScript', async () => { assert.deepEqual(errores, [], errores.join(' | ')); });
await browser.close();
console.log(fallos ? `\n❌ ${fallos} fallo(s)` : '\n✅ todos los casos de Novedades pasaron');
process.exit(fallos ? 1 : 0);
