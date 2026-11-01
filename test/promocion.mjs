// Promoción con el diseño nuevo (1/11): las seis pestañas, cada ventana y cada botón, más los fallos que se corrigieron al
// revisarla entera: (1) desde Sala solo se podían rebajar BEBIDAS, nunca una hamburguesa; (2) WhatsApp abría «wa.me/612345678»
// sin prefijo de país, que no abre ningún chat; (3) una promo semanal no podía terminar nunca.
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
}, 'PROMO000001');
await page.reload({waitUntil:'domcontentloaded'}); await esperar(2200);
async function sembrar(){
  await page.evaluate(() => {
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, name:'Bar Marina', ig:'barmarina'});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    applyOwnerSessionEditRights(); document.body.classList.add('owner-session'); areaUnlocked.cocina = areaUnlocked.sala = areaUnlocked.gestion = true;
    const hoy = todayStr();
    DB.employees = [{id:70, name:'Laura Camarera', rol:'Camarera', color:'#2E86C1', area:'sala', active:true}];
    DB.cartas = [
      {id:40, nombre:'Carta', area:'cocina', secciones:[{id:41, nombre:'Hamburguesas', platos:[{id:42, nombre:'Hamburguesa Marina', precio:12.5}]}]},
      {id:43, nombre:'Bebidas', area:'sala', secciones:[{id:44, nombre:'Cócteles', platos:[{id:45, nombre:'Gin Sour', precio:9}]}]},
    ];
    DB.promos = [
      {id:1, fecha:hoy, titulo:'Happy hour de cócteles', descripcion:'Gin Sour a mitad de precio', responsableId:70, recurrence:'weekly', hasta:null, menuItemName:'Gin Sour', menuItemPlatoId:45, discountPct:50, horaInicio:'18:00', horaFin:'20:00', maxUses:30, usedDates:{}, doneDates:{}, zona:'sala'},
      {id:2, fecha:hoy, titulo:'Subir story del plato del día', descripcion:'', responsableId:null, recurrence:null, menuItemName:null, usedDates:{}, doneDates:{}, zona:'sala', done:false},
    ];
    DB.clients = [
      {id:1, name:'María López', phone:'612345678', email:'maria@x.com', cumpleanos:'1990-' + hoy.slice(5,7) + '-' + String(Math.min(28, parseInt(hoy.slice(8)) + 3)).padStart(2,'0'), ultimoContacto:hoy, marketingConsent:true},
      {id:2, name:'Juan Pérez', phone:'912345678', email:'', ultimoContacto:'2025-01-01'},
      {id:3, name:'Sin Permiso', phone:'612345679', email:'n@x.com', cumpleanos:'1990-' + hoy.slice(5,7) + '-' + String(Math.min(28, parseInt(hoy.slice(8)) + 2)).padStart(2,'0'), marketingConsent:false},
    ];
    currentFolder = 'sala';
  });
}
await sembrar();
const ir = async tab => { await page.evaluate(tab => { currentFolder = 'sala'; navigate('promocion'); setPromoTab(tab); }, tab); await esperar(250); };
const txt = () => page.evaluate(() => document.getElementById('promo-tab-content').innerText);

await caso('Las seis pestañas se pintan, con el diseño nuevo y sin errores', async () => {
  for(const tab of ['dia','semana','mes','novedades','clientes','ideas']){
    await ir(tab);
    const r = await page.evaluate(tab => ({
      on: document.getElementById('promo-tab-' + tab).classList.contains('is-on'),
      fino: document.querySelectorAll('#view-promocion .btn.btn-fino').length,
      vacio: document.getElementById('promo-tab-content').innerText.trim().length < 20,
      vieja: !!document.querySelector('#view-promocion .ge-tab'),
    }), tab);
    assert.ok(r.on, `la pestaña ${tab} no queda marcada`);
    assert.ok(r.fino > 3, `${tab}: los botones no tienen el diseño nuevo`);
    assert.ok(!r.vacio, `${tab} sale vacía`);
    assert.ok(!r.vieja, 'queda la fila de pestañas vieja');
  }
});

await caso('Día: cifras, tarjetas, etiquetas de descuento y responsable', async () => {
  await ir('dia');
  const r = await page.evaluate(() => ({
    cifras: document.querySelectorAll('#promo-tab-content .st-cel').length,
    tarjetas: document.querySelectorAll('#promo-tab-content .pm-card').length,
    dto: !!document.querySelector('#promo-tab-content .pm-et.is-dto'),
    resp: document.querySelector('#promo-tab-content .pm-resp').innerText,
    fecha: document.querySelector('.pm-fecha-txt').textContent,
  }));
  assert.equal(r.tarjetas, 2); assert.ok(r.cifras >= 4); assert.ok(r.dto, 'falta la etiqueta de descuento');
  assert.ok(/Laura/.test(r.resp));
  assert.ok(/^[A-ZÁÉÍÓÚ]/.test(r.fecha) && !/ De /.test(r.fecha), 'la fecha larga sale mal escrita: ' + r.fecha);
});

await caso('Marcar hecha es directo; desmarcar pregunta', async () => {
  await ir('dia');
  await page.evaluate(() => { const c = document.querySelectorAll('#promo-tab-content .dp-check input')[1]; c.checked = true; c.dispatchEvent(new Event('change', {bubbles:true})); });
  await esperar(200);
  assert.ok(await page.evaluate(() => !!(promoDoneInfo(DB.promos.find(p => p.id === 2), todayStr()) || {}).done), 'no se marcó');
  await page.evaluate(() => { const c = document.querySelectorAll('#promo-tab-content .dp-check input')[1]; c.checked = false; c.dispatchEvent(new Event('change', {bubbles:true})); });
  await esperar(300);
  assert.ok(await page.evaluate(() => /seguro|segur|sure/i.test((document.getElementById('modal-box') || {}).innerText || '')), 'desmarcar no preguntó');
  await page.evaluate(() => { const b = [...document.querySelectorAll('#modal-box .btn')].find(x => /cancel/i.test(x.innerText)); if(b) b.click(); });
  await esperar(200);
  assert.ok(await page.evaluate(() => !!(promoDoneInfo(DB.promos.find(p => p.id === 2), todayStr()) || {}).done), 'al cancelar se desmarcó igualmente');
});

await caso('Cada tarjeta lleva su menú ⋯ con editar, duplicar y eliminar', async () => {
  await ir('dia');
  const acc = await page.evaluate(() => { const b = document.querySelector('#promo-tab-content .pm-card [aria-haspopup="menu"]'); return JSON.parse(b.dataset.acc).map(a => a.texto); });
  assert.equal(acc.length, 3, 'acciones: ' + acc);
  assert.ok(!(await page.evaluate(() => !!document.querySelector('#promo-tab-content .pm-card .btn-icon'))), 'quedan botones sueltos de editar/borrar');
});

await caso('Duplicar al día siguiente copia la acción sin lo hecho', async () => {
  const r = await page.evaluate(() => { const antes = DB.promos.length; duplicarPromo(2); return {antes, ahora: DB.promos.length, copia: DB.promos[DB.promos.length - 1], fecha: promoDate}; });
  assert.equal(r.ahora, r.antes + 1);
  assert.equal(r.copia.titulo, 'Subir story del plato del día');
  assert.ok(r.copia.fecha > new Date().toISOString().slice(0, 10) || r.copia.fecha > '2000');
  assert.equal(r.copia.doneAt, null); assert.equal(r.copia.fecha, r.fecha);
  await page.evaluate(() => { DB.promos = DB.promos.filter(p => p.titulo !== 'Subir story del plato del día' || p.id === 2); promoDate = todayStr(); });
});

await caso('La ventana de la acción: secciones, todos los campos y vista del precio rebajado', async () => {
  await page.evaluate(() => openPromoModal(1)); await esperar(300);
  const r = await page.evaluate(() => ({
    ids: ['promo-titulo','promo-descripcion','promo-date','promo-responsable','promo-recurrence','promo-hasta','promo-has-discount','promo-dish','promo-discount-pct','promo-hora-inicio','promo-hora-fin','promo-max-uses'].filter(i => !document.getElementById(i)),
    secciones: document.querySelectorAll('#modal-box .pm-sec-modal').length,
    prev: document.getElementById('promo-precio-prev').innerText,
    ds: document.getElementById('modal-box').classList.contains('ds-nuevo'),
  }));
  assert.deepEqual(r.ids, [], 'faltan campos: ' + r.ids);
  assert.equal(r.secciones, 3); assert.ok(r.ds, 'la ventana no lleva el diseño nuevo');
  assert.ok(/4[,.]50/.test(r.prev), 'el precio rebajado no sale: ' + r.prev);
  await page.evaluate(() => closeModal());
});

await caso('Desde Sala se puede rebajar un PLATO, no solo bebidas (fallo corregido)', async () => {
  await page.evaluate(() => openPromoModal()); await esperar(250);
  const grupos = await page.evaluate(() => [...document.querySelectorAll('#promo-dish optgroup')].map(g => g.label + ':' + [...g.querySelectorAll('option')].map(o => o.value).join('|')));
  assert.ok(grupos.some(g => /Hamburguesa Marina/.test(g)), 'no se ofrece la hamburguesa: ' + grupos);
  assert.ok(grupos.some(g => /Gin Sour/.test(g)), 'no se ofrece el cóctel: ' + grupos);
  await page.evaluate(() => {
    document.getElementById('promo-titulo').value = '2x1 en hamburguesas';
    document.getElementById('promo-has-discount').checked = true; togglePromoDiscountFields();
    document.getElementById('promo-dish').value = 'Hamburguesa Marina';
    document.getElementById('promo-discount-pct').value = '25';
  });
  await page.evaluate(() => savePromo(null)); await esperar(400);
  const p = await page.evaluate(() => DB.promos.find(x => x.titulo === '2x1 en hamburguesas'));
  assert.ok(p, 'no se guardó'); assert.equal(p.menuItemPlatoId, 42, 'no se enlazó al plato de la carta de cocina'); assert.equal(p.discountPct, 25);
  assert.ok(await page.evaluate(() => getActivePromosForSync().some(x => x.menuItemPlatoId === 42)), 'la web pública no la recibe');
});

await caso('Una promo semanal puede terminar: «hasta» se respeta y no puede ser anterior al inicio', async () => {
  const r = await page.evaluate(() => {
    const d = n => { const x = new Date(); x.setDate(x.getDate() + n); return dateStr(x); };
    const p = {fecha: d(0), recurrence: 'weekly', hasta: d(14)};
    return {en7: promoOccursOn(p, d(7)), en14: promoOccursOn(p, d(14)), en21: promoOccursOn(p, d(21)), sinFin: promoOccursOn({fecha: d(0), recurrence: 'weekly'}, d(70))};
  });
  assert.ok(r.en7 && r.en14 && !r.en21 && r.sinFin, JSON.stringify(r));
  await page.evaluate(() => { openPromoModal(); document.getElementById('promo-titulo').value = 'Mal'; document.getElementById('promo-date').value = '2026-11-10'; document.getElementById('promo-recurrence').checked = true; document.getElementById('promo-hasta').value = '2026-11-01'; });
  await page.evaluate(() => savePromo(null)); await esperar(250);
  assert.ok(await page.evaluate(() => !DB.promos.some(p => p.titulo === 'Mal')), 'se guardó con el fin antes del inicio');
  await page.evaluate(() => closeModal());
});

await caso('Semana: siete días, hoy marcado y cada acción abre su ventana', async () => {
  await ir('semana');
  const r = await page.evaluate(() => ({dias: document.querySelectorAll('.pm-sem-dia').length, hoy: document.querySelectorAll('.pm-sem-dia.is-hoy').length, chips: document.querySelectorAll('.pm-chip').length, mas: document.querySelectorAll('.pm-mas').length}));
  assert.equal(r.dias, 7); assert.equal(r.hoy, 1); assert.ok(r.chips >= 2); assert.equal(r.mas, 7);
  await page.evaluate(() => document.querySelector('.pm-chip').click()); await esperar(250);
  assert.ok(await page.evaluate(() => !!document.getElementById('promo-titulo')), 'el chip no abre la acción');
  await page.evaluate(() => closeModal());
  await page.evaluate(() => document.querySelector('.pm-mas').click()); await esperar(250);
  assert.ok(await page.evaluate(() => !!document.getElementById('promo-titulo') && document.getElementById('promo-date').value.length === 10));
  await page.evaluate(() => closeModal());
});

await caso('Mes: cuadrícula completa, selector de periodo con datos y salto al día', async () => {
  await ir('mes');
  const r = await page.evaluate(() => ({dias: document.querySelectorAll('.pm-mes-dia').length, sel: !!document.querySelector('.pe-sel'), cab: document.querySelectorAll('.pm-mes-cab').length, cifras: document.querySelectorAll('#promo-tab-content .st-cel').length}));
  assert.ok(r.dias >= 28 && r.sel && r.cab === 7 && r.cifras === 3, JSON.stringify(r));
  await page.evaluate(() => promoMesCb(2027, 0)); await esperar(200);
  assert.ok(/2027/.test(await page.evaluate(() => document.querySelector('.pe-actual').innerText)), 'el selector no cambia de mes');
  await page.evaluate(() => { promoMes = null; renderPromoMes(); document.querySelector('.pm-mes-dia.tiene').click(); }); await esperar(250);
  assert.ok(await page.evaluate(() => document.getElementById('promo-tab-dia').classList.contains('is-on')), 'pulsar un día no lleva a la pestaña Día');
});

await caso('Clientes: sin quien retiró el permiso, y el WhatsApp lleva prefijo de país (fallo corregido)', async () => {
  await ir('clientes');
  const t0 = await txt();
  assert.ok(!/Sin Permiso/.test(t0), 'sale un cliente que retiró el consentimiento');
  await page.evaluate(() => { window.__abierto = []; window.open = u => { window.__abierto.push(u); return null; }; openClientMessageModal(1, 'cumple'); }); await esperar(250);
  await page.evaluate(() => sendPromoClientWhatsapp(1));
  const url = await page.evaluate(() => window.__abierto[0]);
  assert.ok(/^https:\/\/wa\.me\/34612345678\?text=/.test(url), 'URL de WhatsApp: ' + url);
  const fijo = await page.evaluate(() => { openClientMessageModal(2, 'vuelve'); return document.querySelector('#modal-box .btn-fino[onclick*="sendPromoClientWhatsapp"]').disabled; });
  assert.ok(fijo, 'un teléfono fijo no debería poder abrir WhatsApp');
  await page.evaluate(() => closeModal());
});

await caso('Ideas: categorías, búsqueda entre todas y crear acción', async () => {
  await ir('ideas');
  assert.ok((await page.evaluate(() => document.querySelectorAll('.pm-cat').length)) >= 10);
  await page.evaluate(() => promoIdeasBuscar('cóctel')); await esperar(200);
  const n = await page.evaluate(() => document.querySelectorAll('.pm-idea').length);
  assert.ok(n >= 2, 'la búsqueda no encuentra: ' + n);
  await page.evaluate(() => document.querySelector('.pm-idea .btn').click()); await esperar(250);
  assert.ok(await page.evaluate(() => document.getElementById('promo-titulo').value.length > 3), 'crear acción no rellena el título');
  await page.evaluate(() => { closeModal(); promoIdeasBuscar(''); });
});

await caso('«Anunciar a clientes» lleva la promo a Novedades ya escrita', async () => {
  await ir('dia');
  assert.ok(await page.evaluate(() => !!document.querySelector('#promo-tab-content button[onclick^="promoAnunciar"]')), 'no hay botón de anunciar');
  await page.evaluate(() => promoAnunciar(1)); await esperar(400);
  const r = await page.evaluate(() => ({tab: promoTab, c: nvC()}));
  assert.equal(r.tab, 'novedades');
  assert.ok(/Gin Sour/.test(r.c.oferta.titulo) && r.c.oferta.on, 'la oferta no se rellena: ' + JSON.stringify(r.c.oferta));
  assert.equal(r.c.tema, 'promo');
});

await caso('Sin desbordes de ancho en cinco anchos de móvil, en las seis pestañas y con la ventana abierta', async () => {
  const malos = [];
  for(const w of [320, 360, 390, 412, 430]){
    await page.setViewport({width:w, height:800}); await esperar(150);
    for(const tab of ['dia','semana','mes','novedades','clientes','ideas']){
      await ir(tab);
      const o = await page.evaluate(() => ({sw: document.documentElement.scrollWidth, iw: window.innerWidth}));
      if(o.sw > o.iw + 1) malos.push(`${tab}@${w}: ${o.sw}>${o.iw}`);
    }
    await page.evaluate(() => openPromoModal(1)); await esperar(200);
    const o = await page.evaluate(() => ({sw: document.documentElement.scrollWidth, iw: window.innerWidth, mw: document.getElementById('modal-box').scrollWidth, mc: document.getElementById('modal-box').clientWidth}));
    if(o.sw > o.iw + 1 || o.mw > o.mc + 1) malos.push(`ventana@${w}`);
    await page.evaluate(() => closeModal());
  }
  await page.setViewport({width:1280, height:900});
  assert.deepEqual(malos, [], malos.join(' · '));
});

await caso('Sin errores de JavaScript', async () => { assert.deepEqual(errores, [], errores.join(' | ')); });
await browser.close();
console.log(fallos ? `\n❌ ${fallos} fallo(s)` : '\n✅ todos los casos de Promoción pasaron');
process.exit(fallos ? 1 : 0);
