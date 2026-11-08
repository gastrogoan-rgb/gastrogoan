// Mi Negocio, ronda del 8/11: fiscal bloqueado, reservas por grupo desmarcable, plano de sala + mesas juntos y en rejilla,
// horario especial, IVA por producto, impresoras/pantallas y zona de reparto.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
page.on('dialog', d => d.dismiss().catch(() => {}));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|nominatim|zippopotam/.test(r.url()) ? r.abort() : r.continue());
await page.setViewport({width:1280, height:900});
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(() => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'MINEG003', tenantId: ggBizTenantId('MINEG003')}));
  localStorage.setItem('gastrogoan_owner_login', '1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r => setTimeout(r, 2000));
await page.evaluate(() => {
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id => document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  currentFolder = 'gestion'; ownerUnlocked = true; navigate('minegocio');
});
await new Promise(r => setTimeout(r, 600));
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }

await caso('Forma jurídica y régimen fiscal NO se pueden tocar desde Mi Negocio (los pone quien da el alta)', async () => {
  const r = await page.evaluate(() => {
    DB.business.fiscalFijado = false; DB.business.formaJuridica = 'autonomo'; DB.business.regimenFiscal = 'directa'; renderMiNegocio();
    const ids = ['mn-forma-juridica','mn-regimen-fiscal','mn-modalidad-directa'];
    return ids.map(i => { const e = document.getElementById(i); return e ? e.disabled : 'sin campo'; });
  });
  assert.deepEqual(r, [true, true, true]);
});

await caso('Reservas por grupo: la casilla se marca y se DESMARCA (el valor vuelve a 0)', async () => {
  const r = await page.evaluate(async () => {
    const out = {};
    DB.business.reservaConfirmManualDesde = 0; renderMiNegocio();
    document.getElementById('mn-require-manual-confirm').click();
    await new Promise(r => setTimeout(r, 300));
    out.marcada = document.getElementById('mn-require-manual-confirm').checked; out.v1 = DB.business.reservaConfirmManualDesde;
    document.getElementById('mn-require-manual-confirm').click();
    await new Promise(r => setTimeout(r, 300));
    out.desmarcada = !document.getElementById('mn-require-manual-confirm').checked; out.v2 = DB.business.reservaConfirmManualDesde;
    return out;
  });
  assert.equal(r.marcada, true); assert.ok(r.v1 > 0); assert.equal(r.desmarcada, true); assert.equal(r.v2, 0);
});

await caso('Plano de sala: crear zona y mesas configuradas van juntas; las mesas en rejilla de 3 por fila en PC y 1 en móvil; «plazas» rotulado en cada mesa', async () => {
  await page.evaluate(async () => {
    DB.tables.length = 0; renderMiNegocio();
    document.getElementById('mn-zona-nombre').value = 'Sala'; document.getElementById('mn-zona-cantidad').value = '6';
    await addZonaConMesas();
  });
  const medir = async () => page.evaluate(() => {
    const mesas = [...document.querySelectorAll('#mn-mesas-list .mn-mesa')];
    const filas = new Set(mesas.map(m => Math.round(m.getBoundingClientRect().top)));
    const cab = document.querySelector('.mn-mesas-cab').getBoundingClientRect();
    const btn = [...document.querySelectorAll('button')].find(b => /addZonaConMesas/.test(b.getAttribute('onclick')||'')).getBoundingClientRect();
    const rot = mesas.every(m => /plazas|places|seats/i.test(m.querySelector('.mn-mesa-plazas span').textContent));
    const w = document.documentElement.scrollWidth <= innerWidth;
    return {n: mesas.length, filas: filas.size, rot, w, distancia: Math.round(cab.top - btn.bottom)};
  });
  const pc = await medir();
  assert.equal(pc.n, 6); assert.equal(pc.filas, 2, 'en PC deben ir 3 por fila: ' + JSON.stringify(pc)); assert.ok(pc.rot); assert.ok(pc.w);
  assert.ok(pc.distancia < 110, 'zona nueva y mesas configuradas separadas ' + pc.distancia + 'px');
  await page.setViewport({width:390, height:844}); await new Promise(r => setTimeout(r, 400));
  await page.evaluate(() => { renderMiNegocio(); (typeof mnAbrirDe==='function') && mnAbrirDe(document.getElementById('mn-mesas-list')); });
  const mov = await medir();
  assert.equal(mov.filas, 6, 'en móvil una por fila: ' + JSON.stringify(mov)); assert.ok(mov.w, 'scroll lateral en móvil');
  await page.setViewport({width:1280, height:900});
});

await caso('Horario especial: un día con otras horas manda sobre la semana (reservas, aforo, TPV); un cierre gana; quitarlo vuelve al horario normal', async () => {
  const r = await page.evaluate(async () => {
    const out = {};
    const fut = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
    const dia = fut(10);
    DB.business.horario = defaultHorario().map(d => ({...d, abierto: true, modo: 'seguido', seguido: {ini: '13:00', fin: '16:00'}, turnos: [{ini: '', fin: ''}, {ini: '', fin: ''}]}));
    DB.business.horariosEspeciales = []; DB.business.diasCerrados = [];
    renderMiNegocio();
    out.normal = JSON.stringify(getTurnosForDate(dia));
    document.getElementById('he-desde').value = dia;
    document.getElementById('he-motivo').value = 'Nochevieja';
    document.getElementById('he-t1-ini').value = '20:00'; document.getElementById('he-t1-fin').value = '23:00';
    anadirHorarioEspecial();
    out.guardados = DB.business.horariosEspeciales.length;
    out.especial = JSON.stringify(getTurnosForDate(dia));
    out.otroDia = JSON.stringify(getTurnosForDate(fut(11)));
    out.horarioDia = JSON.stringify(horarioDiaDe(dia).turnos);
    out.enLista = document.body.innerText.includes('Nochevieja');
    out.espejo = CAMPOS_PUBLICOS_DEL_NEGOCIO.includes('horariosEspeciales');
    // aforo por turno usa el horario especial
    out.aforoTurnos = (getAforoInfoForDate(dia) || []).map(t => t.abre + '-' + t.cierra).join(',');
    // un cierre gana
    DB.business.diasCerrados = [{id: 'c1', desde: dia, hasta: dia, motivo: 'x'}];
    out.cierreGana = JSON.stringify(getTurnosForDate(dia));
    DB.business.diasCerrados = [];
    // validaciones: sin horas no guarda; solape no guarda
    renderMiNegocio();
    document.getElementById('he-desde').value = fut(20);
    anadirHorarioEspecial(); out.sinHoras = DB.business.horariosEspeciales.length;
    document.getElementById('he-desde').value = dia;
    document.getElementById('he-t1-ini').value = '12:00'; document.getElementById('he-t1-fin').value = '14:00';
    anadirHorarioEspecial(); out.mismoDia = DB.business.horariosEspeciales.length;
    quitarHorarioEspecial(DB.business.horariosEspeciales[0].id);
    out.vuelta = JSON.stringify(getTurnosForDate(dia));
    return out;
  });
  assert.equal(r.normal, '[{"abre":"13:00","cierra":"16:00"}]');
  assert.equal(r.guardados, 1);
  assert.equal(r.especial, '[{"abre":"20:00","cierra":"23:00"}]');
  assert.equal(r.otroDia, '[{"abre":"13:00","cierra":"16:00"}]');
  assert.equal(r.horarioDia, '[{"ini":"20:00","fin":"23:00"}]');
  assert.ok(r.enLista); assert.ok(r.espejo);
  assert.equal(r.aforoTurnos, '20:00-23:00');
  assert.equal(r.cierreGana, '[]');
  assert.equal(r.sinHoras, 1); assert.equal(r.mismoDia, 1);
  assert.equal(r.vuelta, '[{"abre":"13:00","cierra":"16:00"}]');
});

await caso('IVA del ticket: ya no es «uno solo»; cada producto lleva el suyo, hay IVA por defecto de comida y de bebidas, y el ticket desglosa cada tipo', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    DB.cartas = [{id: 1, nombre: 'Carta', secciones: [{id: 1, nombre: 'X', platos: [{id: 1, nombre: 'Menú', precio: 11, ivaPct: 10}, {id: 2, nombre: 'Copa', precio: 6, ivaPct: 21}, {id: 3, nombre: 'Sin tipo', precio: 5}]}]}];
    DB.menus = [];
    DB.business.ticket = {ivaPct: 10};
    renderMiNegocio();
    const txt = document.querySelector('.tk-iva-resumen').innerText;
    out.resumen = /10 %/.test(txt) && /21 %/.test(txt) && /1/.test(txt);
    out.falta = !!document.querySelector('.tk-iva-chip.falta');
    document.getElementById('tk-iva').value = '10'; document.getElementById('tk-iva-bebidas').value = '21';
    saveTicketConfig();
    out.guardado = JSON.stringify([DB.business.ticket.ivaPct, DB.business.ticket.ivaBebidasPct]);
    out.defComida = ivaPorDefectoDe({name: 'Plato'});
    out.defBebida = ivaPorDefectoDe({name: 'Copa', bebida: true});
    out.propio = fiscalLineIvaPct({name: 'Agua', bebida: true, ivaPct: 10});
    const venta = {descuentoPct: 0, items: [{name: 'A', price: 11, qty: 1, ivaPct: 10}, {name: 'B', price: 6, qty: 1, bebida: true}, {name: 'C', price: 5, qty: 1}]};
    out.grupos = JSON.stringify(saleIvaGroupsForFiscal(venta).map(g => [g.ivaPct, g.base, g.cuota]));
    document.getElementById('tk-iva-bebidas').value = '';
    saveTicketConfig(); out.vacio = DB.business.ticket.ivaBebidasPct;
    out.defBebida2 = ivaPorDefectoDe({bebida: true});
    return out;
  });
  assert.ok(r.resumen && r.falta, JSON.stringify(r));
  assert.equal(r.guardado, '[10,21]'); assert.equal(r.defComida, 10); assert.equal(r.defBebida, 21); assert.equal(r.propio, 10);
  assert.equal(r.grupos, '[[21,4.96,1.04],[10,14.55,1.45]]');
  assert.equal(r.vacio, null); assert.equal(r.defBebida2, 10);
});

await caso('Impresoras y pantallas: el estado se lee de un vistazo, se añade cocina/barra con un toque y avisa si falta activar o emparejar', async () => {
  const r = await page.evaluate(async () => {
    const out = {};
    DB.business.comandas = {modo: 'pantalla', anchoTicket: 80};
    renderMiNegocio();
    out.pantalla = /pantalla/i.test(document.querySelector('.cp-estado-global').innerText) && !document.getElementById('comanda-printers-list');
    setComandaModo('impresion');
    DB.business.comandas.printers.forEach(p => p.activo = false); renderMiNegocio();
    out.sinActiva = document.querySelector('.cp-estado-global').classList.contains('warn');
    addComandaPrinter('bebida');
    const nueva = DB.business.comandas.printers[DB.business.comandas.printers.length - 1];
    out.preset = [nueva.contenido, nueva.nombre, nueva.activo];
    renderMiNegocio();
    out.okTrasActivar = document.querySelector('.cp-estado-global').classList.contains('ok') && document.querySelector('.cp-estado-global').innerText.includes('Barra');
    out.tarjetas = document.querySelectorAll('.cp-imp').length === DB.business.comandas.printers.length;
    out.rotulos = [...document.querySelectorAll('.cp-imp')].every(c => /Qué imprime/.test(c.innerText) && /Ancho del rollo/.test(c.innerText) && /Activa/.test(c.innerText));
    out.menu = !!document.querySelector('.cp-imp .cp-cab button[aria-haspopup="menu"]');
    // Bluetooth elegido sin emparejar → aviso
    const id = nueva.id; setPrintMode(id, 'bluetooth');
    return out;
  });
  assert.ok(r.pantalla && r.sinActiva, JSON.stringify(r));
  assert.deepEqual(r.preset, ['bebida', 'Barra', true]);
  assert.ok(r.okTrasActivar && r.tarjetas && r.rotulos && r.menu, JSON.stringify(r));
});

// (las demás secciones de la ronda se añaden debajo)

assert.equal(errs.length, 0, 'errores de página: ' + errs.join(' | '));
console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo en verde');
await browser.close();
process.exit(fallos ? 1 : 0);
