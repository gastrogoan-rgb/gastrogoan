// Clientes y vales regalo con el diseño nuevo (1/11): tarjetas que caben en pantalla sin mover nada de lado, ficha entera,
// notas amplias, historial en pantalla propia, y los vales regalo hechos bien (caducidad, estados, canje parcial,
// contabilidad, anulación) con su pantalla de historial.
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
}, 'CLIENTES0001');
await page.reload({waitUntil:'domcontentloaded'}); await esperar(2200);
async function sembrar(){
  await page.evaluate(() => {
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, name:'Bar Marina', phone:'+34 612 000 111', email:'hola@barmarina.es'});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    applyOwnerSessionEditRights(); document.body.classList.add('owner-session'); areaUnlocked.cocina = areaUnlocked.sala = areaUnlocked.gestion = true;
    const d = n => { const x = new Date(); x.setDate(x.getDate() + n); return dateStr(x); };
    DB.clients = [
      {id:1, name:'Ana Habitual', phone:'611111111', email:'ana@x.com', cp:'46001', points:9, allergies:'Celíaca', notes:'Mesa de la ventana', marketingConsent:true},
      {id:2, name:'Nuria Nueva', phone:'622222222', email:'', cp:'46002', points:0},
      {id:3, name:'Rita Riesgo', phone:'912345678', email:'rita@x.com', cp:'46003', points:10, noShows:2},
      {id:4, name:'Baja Baja', phone:'655555555', email:'baja@x.com', marketingConsent:false},
    ];
    DB.sales = []; let sid = 1000;
    [-1, -3, -5].forEach(x => DB.sales.push({id: sid++, date: d(x), total: 20, clientId: 1, items: [{name:'Gin Sour', qty:2}], createdAt: d(x) + 'T20:00'}));
    DB.sales.push({id: sid++, date: d(-5), total: 15, clientId: 2, items: [{name:'Caña', qty:1}], createdAt: d(-5) + 'T20:00'});
    [-200, -170, -140].forEach(x => DB.sales.push({id: sid++, date: d(x), total: 25, clientId: 3, items: [], createdAt: d(x) + 'T20:00'}));
    DB.reservations = [{id:1, clientId:1, date:d(2), time:'21:00', people:4, status:'confirmada'}];
    DB.giftVouchers = []; DB.ge.vales = []; DB.ge.cierres = [];
    currentFolder = 'sala'; clientesPantalla = 'lista'; clientesFiltro = ''; clientesBusca = '';
  });
}
await sembrar();
const ir = async () => { await page.evaluate(() => { currentFolder = 'sala'; clientesPantalla = 'lista'; clientesFiltro = ''; clientesBusca = ''; navigate('clientes'); renderClientes(); }); await esperar(300); };
const q = (fn, ...a) => page.evaluate(fn, ...a);

await caso('La lista son tarjetas (no tabla): nadie tiene que mover nada de lado y caben dos o tres por fila', async () => {
  await ir();
  const r = await q(() => {
    const tarjetas = [...document.querySelectorAll('#clientes-content .cl-card')];
    const filas = {}; tarjetas.forEach(c => { const y = Math.round(c.getBoundingClientRect().top); filas[y] = (filas[y] || 0) + 1; });
    return {n: tarjetas.length, porFila: Math.max(...Object.values(filas)), tabla: !!document.querySelector('#view-clientes table'), scroll: document.documentElement.scrollWidth > innerWidth + 1,
      cifras: document.querySelectorAll('#clientes-content .st-cel').length, nombre: tarjetas[0].querySelector('.cl-card-nom b').textContent};
  });
  assert.equal(r.n, 4); assert.ok(!r.tabla, 'queda una tabla'); assert.ok(!r.scroll, 'hay scroll horizontal');
  assert.ok(r.porFila >= 2 && r.porFila <= 4, 'tarjetas por fila: ' + r.porFila); assert.equal(r.cifras, 4);
});

await caso('Filtros en fichas con su cuenta, búsqueda por nombre, teléfono y email, y orden', async () => {
  const r = await q(async () => {
    const cuenta = f => { const b = [...document.querySelectorAll('.cl-chips .btn')].find(x => x.innerText.toLowerCase().startsWith(f)); return b ? parseInt(b.querySelector('b').textContent) : null; };
    const base = {todos: cuenta('todos'), vip: cuenta('vip'), riesgo: cuenta('en riesgo'), alergias: cuenta('con alergias'), noshows: cuenta('no-shows'), sinpermiso: cuenta('sin permiso')};
    const nombres = () => [...document.querySelectorAll('#clientes-content .cl-card-nom b')].map(x => x.textContent);
    clSetFiltro('atrisk'); const riesgo = nombres();
    clSetFiltro('noconsent'); const baja = nombres();
    clSetFiltro(''); clSetBusca('ana'); const porNombre = nombres();
    clSetBusca('9123'); const porTel = nombres();
    clSetBusca('baja@x'); const porMail = nombres();
    clSetBusca('zzz'); const nada = document.querySelector('#clientes-lista-zona .es-vacio') ? 'vacio' : 'hay';
    clSetBusca(''); clSetOrden('puntos'); const porPuntos = nombres();
    clSetOrden('nombre');
    return {base, riesgo, baja, porNombre, porTel, porMail, nada, porPuntos};
  });
  assert.deepEqual(r.base, {todos:4, vip:2, riesgo:1, alergias:1, noshows:1, sinpermiso:1});
  assert.deepEqual(r.riesgo, ['Rita Riesgo']); assert.deepEqual(r.baja, ['Baja Baja']);
  assert.deepEqual(r.porNombre, ['Ana Habitual']); assert.deepEqual(r.porTel, ['Rita Riesgo']); assert.deepEqual(r.porMail, ['Baja Baja']);
  assert.equal(r.nada, 'vacio'); assert.equal(r.porPuntos[0], 'Rita Riesgo');
});

await caso('Escribir en el buscador no pierde el foco (se puede seguir escribiendo)', async () => {
  await ir();
  await page.focus('#clientes-search');
  await page.keyboard.type('nur', {delay: 30});
  const r = await q(() => ({foco: document.activeElement && document.activeElement.id, valor: document.getElementById('clientes-search').value, n: document.querySelectorAll('#clientes-content .cl-card').length}));
  assert.equal(r.foco, 'clientes-search'); assert.equal(r.valor, 'nur'); assert.equal(r.n, 1);
  await q(() => clSetBusca(''));
});

await caso('Cada tarjeta lleva WhatsApp con prefijo (y ninguno si es un fijo), email y su menú ⋯', async () => {
  await ir();
  const r = await q(() => [...document.querySelectorAll('#clientes-content .cl-card')].map(c => ({n: c.querySelector('.cl-card-nom b').textContent, wa: (c.querySelector('a[href^="https://wa.me/"]') || {}).href || '', mail: !!c.querySelector('a[href^="mailto:"]'), menu: !!c.querySelector('[aria-haspopup="menu"]')})));
  const ana = r.find(x => x.n === 'Ana Habitual'), rita = r.find(x => x.n === 'Rita Riesgo');
  assert.equal(ana.wa, 'https://wa.me/34611111111'); assert.ok(ana.mail && ana.menu);
  assert.equal(rita.wa, '', 'un fijo no abre WhatsApp');
});

await caso('Tocar la tarjeta abre la ficha ENTERA: datos, números, puntos, reservas y vales', async () => {
  await ir();
  await q(() => document.querySelector('#clientes-content .cl-card').click()); await esperar(300);
  const r = await q(() => {
    const m = document.getElementById('modal-box');
    return {xl: m.classList.contains('modal-xl'), campos: ['client-name','client-phone','client-email','client-cp','client-cumpleanos','client-ultimo-contacto','client-allergies','client-notes','client-marketing-consent'].filter(i => !document.getElementById(i)),
      stats: m.querySelectorAll('.cl-stat').length, texto: m.innerText, nombre: document.getElementById('client-name').value, desborda: m.scrollWidth > m.clientWidth + 1};
  });
  assert.ok(r.xl, 'la ficha tiene que ser ancha'); assert.deepEqual(r.campos, []); assert.equal(r.stats, 6);
  assert.ok(/fidelidad/i.test(r.texto) && /Reservas próximas/i.test(r.texto) && /Vale regalo/i.test(r.texto), r.texto.slice(0, 200));
  assert.ok(!r.desborda); assert.ok(r.nombre.length > 2);
  await q(() => closeModal());
});

await caso('Las notas tienen sitio de sobra y crecen hacia abajo con un texto largo', async () => {
  await q(() => openClientModal(1)); await esperar(250);
  const r = await q(async () => {
    const ta = document.getElementById('client-notes');
    const antes = ta.getBoundingClientRect().height;
    ta.value = Array.from({length: 24}, (_, i) => 'Línea de nota número ' + (i + 1) + ' con bastante texto para que ocupe').join('\n');
    ta.dispatchEvent(new Event('input', {bubbles: true}));
    const despues = ta.getBoundingClientRect().height;
    return {antes, despues, recortado: ta.scrollHeight > ta.clientHeight + 2};
  });
  assert.ok(r.antes >= 150, 'las notas son un cuadrito: ' + r.antes); assert.ok(r.despues > r.antes, 'no crece'); assert.ok(!r.recortado, 'el texto queda recortado');
  await q(() => closeModal());
});

await caso('Guardar la ficha conserva las notas largas, la alergia y el permiso de marketing', async () => {
  await q(() => openClientModal(1)); await esperar(250);
  await q(() => { document.getElementById('client-notes').value = 'Línea 1\nLínea 2\n' + 'x'.repeat(600); document.getElementById('client-allergies').value = 'Frutos secos'; document.getElementById('client-marketing-consent').checked = false; });
  await q(() => saveClient(1)); await esperar(300);
  const c = await q(() => DB.clients.find(x => x.id === 1));
  assert.ok(c.notes.includes('Línea 2') && c.notes.length > 600, 'notas: ' + c.notes.length); assert.equal(c.allergies, 'Frutos secos'); assert.equal(c.marketingConsent, false);
  await q(() => { DB.clients.find(x => x.id === 1).marketingConsent = true; });
});

await caso('El historial es una PANTALLA propia con su Volver, filtros y todo lo del cliente', async () => {
  await ir();
  await q(() => openClientModal(1)); await esperar(200);
  await q(() => [...document.querySelectorAll('#modal-box .cl-ficha-bt .btn')].find(b => /historial/i.test(b.innerText)).click()); await esperar(300);
  const r = await q(() => ({modal: document.getElementById('modal-overlay').classList.contains('active'), titulo: (document.querySelector('.cl-tit-pantalla') || {}).innerText, eventos: document.querySelectorAll('.cl-ev').length, chips: document.querySelectorAll('.cl-chips .btn').length, cifras: document.querySelectorAll('#clientes-content .st-cel').length}));
  assert.ok(!r.modal, 'sigue siendo una ventana'); assert.ok(/Historial de Ana Habitual/.test(r.titulo)); assert.ok(r.eventos >= 4, 'eventos: ' + r.eventos); assert.equal(r.chips, 5); assert.equal(r.cifras, 4);
  const f = await q(() => { clHistTipo('reserva'); const res = document.querySelectorAll('.cl-ev').length; clHistTipo('pedido'); const ped = document.querySelectorAll('.cl-ev').length; return {res, ped}; });
  assert.equal(f.res, 1); assert.equal(f.ped, 3);
  await q(() => clVolver()); await esperar(150);
  assert.ok(await q(() => !!document.querySelector('#clientes-content .cl-grid')), 'Volver no regresa a la lista');
});

await caso('Fusionar: los vales siguen al cliente que se conserva; olvidar (RGPD): su nombre desaparece de los vales', async () => {
  const r = await q(() => {
    DB.giftVouchers = [{id: 901, tipo:'importe', importe: 30, clienteId: 2, clienteNombre:'Nuria Nueva', paraNombre:'Nuria Nueva', code:'VR-AAAAAA', createdAt: new Date().toISOString(), redeemed:false, canjes:[]}];
    mergeClients(2, 1);
    const trasFusion = {id: DB.giftVouchers[0].clienteId, nombre: DB.giftVouchers[0].paraNombre};
    DB.clients.push({id: 77, name:'Olvidada Total', phone:'600000000'}); DB.giftVouchers.push({id: 902, tipo:'importe', importe: 10, clienteId: 77, clienteNombre:'Olvidada Total', paraNombre:'Olvidada Total', code:'VR-BBBBBB', createdAt: new Date().toISOString(), redeemed:false, canjes:[]});
    window.requestBusinessPinAction = (a, b, fn) => fn();
    eraseClientDataRGPD(77);
    const v = DB.giftVouchers.find(x => x.id === 902);
    return {trasFusion, borrado: [v.paraNombre, v.clienteNombre], existeNuria: DB.clients.some(c => c.id === 2)};
  });
  assert.deepEqual(r.trasFusion, {id: 1, nombre: 'Ana Habitual'}); assert.ok(!r.existeNuria); assert.deepEqual(r.borrado, ['', '']);
  await sembrar();
});

// ── Vales regalo ─────────────────────────────────────────────────────────
const emitir = (tipo, datos) => q(async (tipo, datos) => {
  openGiftVouchersModal(); document.getElementById('voucher-tipo').value = tipo; renderGiftVoucherFormFields();
  if(datos.importe != null) document.getElementById('voucher-importe').value = datos.importe;
  if(datos.descripcion) document.getElementById('voucher-descripcion').value = datos.descripcion;
  if(datos.cliente) document.getElementById('voucher-cliente').value = datos.cliente;
  if(datos.vence) document.getElementById('voucher-vence').value = datos.vence;
  if(datos.sinVence) document.getElementById('voucher-sin-vence').checked = true;
  if(datos.iva) document.getElementById('voucher-iva').value = datos.iva;
  issueGiftVoucher(); await new Promise(r => setTimeout(r, 150));
  closeModal();
  return DB.giftVouchers[DB.giftVouchers.length - 1] || null;
}, tipo, datos);

await caso('Emitir un vale de importe: código único, caducidad a un año, y queda en la contabilidad como polivalente', async () => {
  await sembrar();
  const v = await emitir('importe', {importe: 50, cliente: '1'});
  const r = await q(v => ({asiento: DB.ge.vales.find(a => a.valeId === v.id), hoy: todayStr(), un_ano: valeVenceDefecto(), estado: valeEstado(v)}), v);
  assert.ok(/^VR-[A-Z2-9]{6}$/.test(v.code), v.code); assert.equal(v.importe, 50); assert.equal(v.venceEn, r.un_ano); assert.equal(v.paraNombre, 'Ana Habitual');
  assert.equal(v.fiscal, 'polivalente'); assert.equal(r.estado, 'pendiente');
  assert.ok(r.asiento && r.asiento.tipo === 'polivalente' && r.asiento.importe === 50 && r.asiento.venceEn === v.venceEn, JSON.stringify(r.asiento));
});

await caso('Emitir una experiencia: exige descripción y precio; es univalente con su IVA y entra en el libro', async () => {
  const mal = await q(async () => { const antes = DB.giftVouchers.length; openGiftVouchersModal(); document.getElementById('voucher-tipo').value = 'experiencia'; renderGiftVoucherFormFields(); issueGiftVoucher(); const sin = DB.giftVouchers.length === antes; closeModal(); return sin; });
  assert.ok(mal, 'se emitió sin descripción ni precio');
  const v = await emitir('experiencia', {descripcion: 'Cena para dos', importe: 60, iva: '10'});
  const a = await q(v => DB.ge.vales.find(x => x.valeId === v.id), v);
  assert.equal(v.fiscal, 'univalente'); assert.equal(v.iva, 10); assert.ok(a && a.tipo === 'univalente' && a.iva === 10 && a.importe === 60, JSON.stringify(a));
  const ivaMes = await q(() => geValesUnivalentesMes(todayStr().slice(0, 7)));
  assert.ok(Math.abs(ivaMes.iva - (60 - 60 / 1.1)) < 0.01, 'el IVA del vale no entra en el mes: ' + JSON.stringify(ivaMes));
});

await caso('No se emiten vales con importe cero, con caducidad pasada, y los códigos nunca se repiten', async () => {
  const r = await q(async () => {
    const antes = DB.giftVouchers.length;
    openGiftVouchersModal(); document.getElementById('voucher-importe').value = '0'; issueGiftVoucher();
    openGiftVouchersModal(); document.getElementById('voucher-importe').value = '10'; const v = document.getElementById('voucher-vence'); v.removeAttribute('min'); v.value = '2020-01-01'; issueGiftVoucher();
    const sinCambios = DB.giftVouchers.length === antes; closeModal();
    const usados = new Set(DB.giftVouchers.map(x => x.code)); const orig = giftVoucherCode; let n = 0;
    window.giftVoucherCode = () => (n++ < 3 ? [...usados][0] : 'VR-UNICOS'); const nuevo = valeCodigoUnico(); window.giftVoucherCode = orig;
    return {sinCambios, nuevo, reintentos: n};
  });
  assert.ok(r.sinCambios, 'se emitió algo inválido'); assert.equal(r.nuevo, 'VR-UNICOS'); assert.equal(r.reintentos, 4);
});

await caso('Canje parcial: el saldo baja, no se puede pasar del saldo, y al canjear el resto queda canjeado en vale y contabilidad', async () => {
  await sembrar();
  const v = await emitir('importe', {importe: 50, cliente: '1'});
  const r = await q(async id => {
    const vale = () => DB.giftVouchers.find(x => x.id === id);
    openCanjeVale(id); document.getElementById('canje-importe').value = '20'; document.getElementById('canje-nota').value = 'Mesa 4'; confirmarCanjeVale(id);
    const tras1 = {estado: valeEstado(vale()), saldo: valeSaldo(vale()), parcial: valeAsiento(vale()).canjeParcial, fecha: valeAsiento(vale()).canjeFecha, pend: geValesPendientes()};
    openCanjeVale(id); document.getElementById('canje-importe').value = '31'; confirmarCanjeVale(id);
    const exceso = {canjes: vale().canjes.length};
    document.getElementById('canje-importe').value = '30'; confirmarCanjeVale(id);
    const tras2 = {estado: valeEstado(vale()), saldo: valeSaldo(vale()), redeemed: vale().redeemed, fecha: valeAsiento(vale()).canjeFecha, pend: geValesPendientes(), canjes: vale().canjes.map(k => k.importe)};
    return {tras1, exceso, tras2};
  }, v.id);
  assert.deepEqual(r.tras1, {estado: 'parcial', saldo: 30, parcial: 20, fecha: null, pend: 30});
  assert.equal(r.exceso.canjes, 1, 'dejó canjear más que el saldo');
  assert.equal(r.tras2.estado, 'canjeado'); assert.equal(r.tras2.saldo, 0); assert.ok(r.tras2.redeemed); assert.equal(r.tras2.fecha, await q(() => todayStr())); assert.equal(r.tras2.pend, 0); assert.deepEqual(r.tras2.canjes, [20, 30]);
  await q(() => { closeModal(); });
});

await caso('Deshacer el último canje devuelve el saldo y la contabilidad; un vale canjeado no se puede canjear otra vez', async () => {
  const r = await q(() => {
    const v = DB.giftVouchers[0];
    valeDeshacerCanje(v.id);
    const tras = {estado: valeEstado(v), saldo: valeSaldo(v), fecha: valeAsiento(v).canjeFecha, parcial: valeAsiento(v).canjeParcial};
    openCanjeVale(v.id); document.getElementById('canje-importe').value = '30'; confirmarCanjeVale(v.id); closeModal();
    const otra = (() => { confirmarCanjeVale(v.id); return v.canjes.length; })();
    return {tras, otra};
  });
  assert.deepEqual(r.tras, {estado: 'parcial', saldo: 30, fecha: null, parcial: 20}); assert.equal(r.otra, 2, 'dejó canjear un vale ya canjeado');
});

await caso('Un vale canjeado una experiencia se canjea entero de una vez', async () => {
  await sembrar();
  const v = await emitir('experiencia', {descripcion: 'Menú degustación', importe: 80});
  const r = await q(id => { openCanjeVale(id); confirmarCanjeVale(id); closeModal(); const x = DB.giftVouchers.find(y => y.id === id); return {estado: valeEstado(x), fecha: valeAsiento(x).canjeFecha, canjes: x.canjes.length}; }, v.id);
  assert.deepEqual(r, {estado: 'canjeado', fecha: await q(() => todayStr()), canjes: 1});
});

await caso('Caducado: se ve como caducado, no cuenta como dinero por servir, avisa al canjear y se puede ampliar', async () => {
  await sembrar();
  const v = await emitir('importe', {importe: 40});
  const r = await q(async id => {
    const x = DB.giftVouchers.find(y => y.id === id); x.venceEn = '2020-01-01'; valeAsiento(x).venceEn = '2020-01-01';
    const e = valeEstado(x), pend = geValesPendientes(), vivo = geValeVivo(valeAsiento(x));
    openCanjeVale(id); const aviso = /caducó|expired|va caducar/i.test(document.getElementById('modal-box').innerText); closeModal();
    valeAmpliar(id); document.getElementById('vale-nueva-vence').value = dateStr(new Date(Date.now() + 86400000 * 30)); valeAmpliarOk(id);
    return {e, pend, vivo, aviso, trasAmpliar: valeEstado(x), asiento: valeAsiento(x).venceEn === x.venceEn};
  }, v.id);
  assert.equal(r.e, 'caducado'); assert.equal(r.pend, 0); assert.equal(r.vivo, false); assert.ok(r.aviso, 'no avisa de que está caducado'); assert.equal(r.trasAmpliar, 'pendiente'); assert.ok(r.asiento);
});

await caso('Anular: solo sin canjes y con el mes abierto; quita el asiento de la contabilidad; borrar solo un vale anulado', async () => {
  await sembrar();
  const a = await emitir('importe', {importe: 25});
  const b = await emitir('importe', {importe: 15});
  const r = await q(async (ia, ib) => {
    window.confirmModal = async () => true;
    const va = DB.giftVouchers.find(x => x.id === ia), vb = DB.giftVouchers.find(x => x.id === ib);
    await deleteGiftVoucher(ia); const noBorra = DB.giftVouchers.length === 2;      // sin anular no se borra
    openCanjeVale(ib); document.getElementById('canje-importe').value = '5'; confirmarCanjeVale(ib); closeModal();
    await valeAnular(ib); const conCanjes = !vb.anulado;                              // con canjes no se anula
    DB.ge.cierres = [todayStr().slice(0, 7)]; await valeAnular(ia); const cerrado = !va.anulado; DB.ge.cierres = [];   // mes cerrado, no
    await valeAnular(ia);
    const tras = {anulado: va.anulado, estado: valeEstado(va), asiento: !!valeAsiento(va), pend: geValesPendientes()};
    await deleteGiftVoucher(ia);
    return {noBorra, conCanjes, cerrado, tras, borrado: !DB.giftVouchers.some(x => x.id === ia)};
  }, a.id, b.id);
  assert.ok(r.noBorra && r.conCanjes && r.cerrado, JSON.stringify(r));
  assert.deepEqual(r.tras, {anulado: true, estado: 'anulado', asiento: false, pend: 10}); assert.ok(r.borrado);
});

await caso('La pantalla de vales: cifras, filtros con su cuenta, búsqueda por código y menú ⋯ de cada vale', async () => {
  await sembrar();
  await emitir('importe', {importe: 50, cliente: '1'});
  const c = await emitir('importe', {importe: 20});
  await q(id => { const x = DB.giftVouchers.find(y => y.id === id); x.venceEn = '2020-01-01'; }, c.id);
  await emitir('experiencia', {descripcion: 'Cena', importe: 60});
  await q(() => { clIr('vales'); }); await esperar(300);
  const r = await q(() => {
    const cuenta = k => { const b = [...document.querySelectorAll('.cl-chips .btn')].find(x => x.innerText.toLowerCase().startsWith(k)); return b ? parseInt(b.querySelector('b').textContent) : null; };
    const base = {todos: cuenta('todos'), pend: cuenta('pendientes'), cad: cuenta('caducados')};
    valesSetFiltro('caducado'); const soloCad = document.querySelectorAll('.cl-vale').length;
    valesSetFiltro('todos'); valesSetBusca(DB.giftVouchers[0].code.slice(3, 7)); const porCodigo = document.querySelectorAll('.cl-vale').length; valesSetBusca('');
    return {base, soloCad, porCodigo, cifras: document.querySelectorAll('#clientes-content .st-cel').length, menus: document.querySelectorAll('.cl-vale [aria-haspopup="menu"]').length, volver: !!document.querySelector('#clientes-content .toolbar .btn')};
  });
  assert.deepEqual(r.base, {todos: 3, pend: 2, cad: 1}); assert.equal(r.soloCad, 1); assert.equal(r.porCodigo, 1); assert.equal(r.cifras, 4); assert.equal(r.menus, 3); assert.ok(r.volver);
});

await caso('Los vales de antes (sin contabilidad) se pueden anotar de una vez, sin duplicar', async () => {
  await sembrar();
  await q(() => { DB.giftVouchers = [
    {id: 1, tipo:'importe', importe: 30, clienteId: 1, clienteNombre:'Ana Habitual', code:'VR-OLD111', createdAt: '2026-03-02T10:00:00Z', redeemed:false, redeemedAt:null},
    {id: 2, tipo:'importe', importe: 40, clienteId: 1, clienteNombre:'Ana Habitual', code:'VR-OLD222', createdAt: '2026-03-03T10:00:00Z', redeemed:true, redeemedAt:'2026-04-01T10:00:00Z'},
    {id: 3, tipo:'experiencia', descripcion:'Cena', importe: 0, clienteId: 1, clienteNombre:'Ana Habitual', code:'VR-OLD333', createdAt: '2026-03-04T10:00:00Z', redeemed:false, redeemedAt:null},
  ]; DB.ge.vales = []; });
  const antes = await q(() => ({estados: DB.giftVouchers.map(valeEstado), saldo: DB.giftVouchers.map(valeSaldo), sinConta: valesSinContabilidad().length}));
  assert.deepEqual(antes.estados, ['pendiente', 'canjeado', 'pendiente']); assert.deepEqual(antes.saldo, [30, 0, 0] .map((x, i) => i === 2 ? 0 : x));
  await q(() => { clIr('vales'); }); await esperar(250);
  assert.ok(await q(() => /no están anotados/i.test(document.getElementById('clientes-content').innerText)), 'no avisa de los vales sin anotar');
  await q(() => valesRegistrarAntiguos()); await esperar(200);
  await q(() => valesRegistrarAntiguos());
  const r = await q(() => ({asientos: DB.ge.vales.map(a => [a.codigo, a.tipo, a.importe, !!a.canjeFecha]), pend: geValesPendientes(), aviso: /no están anotados/i.test(document.getElementById('clientes-content').innerText)}));
  assert.deepEqual(r.asientos, [['VR-OLD111', 'polivalente', 30, false], ['VR-OLD222', 'polivalente', 40, true]]); assert.equal(r.pend, 30); assert.ok(!r.aviso);
});

await caso('El vale impreso lleva su caducidad y se puede mandar por WhatsApp con el prefijo y el texto', async () => {
  await sembrar();
  const v = await emitir('importe', {importe: 50, cliente: '1'});
  const r = await q(async id => {
    window.__abierto = []; const orig = window.open;
    window.open = (u, ...rest) => { window.__abierto.push(u); return u && u.startsWith('http') ? null : {document: {write: h => { window.__impreso = h; }, close(){}}}; };
    valeEnviar(id, 'wa'); printGiftVoucher(id);
    window.open = orig;
    return {url: window.__abierto[0], impreso: window.__impreso || ''};
  }, v.id);
  assert.ok(/^https:\/\/wa\.me\/34611111111\?text=/.test(r.url), r.url);
  assert.ok(decodeURIComponent(r.url).includes(v.code) && /Válido hasta/.test(decodeURIComponent(r.url)), 'el mensaje no lleva código ni caducidad');
  assert.ok(/Válido hasta/.test(r.impreso) && r.impreso.includes(v.code), 'el vale impreso no lleva la caducidad');
});

await caso('Ficha del cliente: enseña sus vales sin usar y lleva a la pantalla de vales filtrada', async () => {
  await sembrar();
  await emitir('importe', {importe: 50, cliente: '1'});
  await q(() => openClientModal(1)); await esperar(250);
  assert.ok(await q(() => /1 sin usar de 1/.test(document.getElementById('modal-box').innerText)), 'no cuenta sus vales');
  await q(() => document.querySelector('#modal-box .cl-ficha-der .cl-enlace[onclick*="vales"]').click()); await esperar(250);
  const r = await q(() => ({pantalla: clientesPantalla, busca: document.getElementById('vales-search').value, n: document.querySelectorAll('.cl-vale').length}));
  assert.deepEqual(r, {pantalla: 'vales', busca: 'Ana Habitual', n: 1});
});

await caso('La contabilidad (Gestión) no deja canjear a mano un vale que vive en Clientes', async () => {
  await sembrar();
  await emitir('importe', {importe: 50, cliente: '1'});
  const r = await q(() => { const l = (DB.ge.vales || []).filter(geValeVivo); return {n: l.length, conValeId: l.every(v => v.valeId)}; });
  assert.deepEqual(r, {n: 1, conValeId: true});
});

await caso('Tres idiomas: lista, ficha, historial, vales y ventanas sin claves sueltas ni «undefined»', async () => {
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
    }, 'CLIENTES0001', lang);
    await pg.reload({waitUntil:'domcontentloaded'}); await esperar(2000);
    textos[lang] = await pg.evaluate(async () => {
      ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
      Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, name:'Bar Marina'});
      DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
      applyOwnerSessionEditRights(); areaUnlocked.cocina = areaUnlocked.sala = areaUnlocked.gestion = true;
      DB.clients = [{id:1, name:'Ana Habitual', phone:'611111111', email:'ana@x.com', allergies:'Celíaca', points:10}];
      DB.sales = [{id:1, date: todayStr(), total: 20, clientId: 1, items: [{name:'Gin', qty:1}]}]; DB.giftVouchers = []; DB.ge.vales = [];
      currentFolder = 'sala'; clientesPantalla = 'lista'; navigate('clientes'); renderClientes(); await new Promise(r => setTimeout(r, 200));
      const out = [document.getElementById('clientes-content').innerText];
      openClientModal(1); await new Promise(r => setTimeout(r, 150)); out.push(document.getElementById('modal-box').innerText); closeModal();
      clIr('historial', 1); await new Promise(r => setTimeout(r, 150)); out.push(document.getElementById('clientes-content').innerText);
      clVolver(); openGiftVouchersModal(); await new Promise(r => setTimeout(r, 150)); out.push(document.getElementById('modal-box').innerText);
      document.getElementById('voucher-importe').value = '30'; issueGiftVoucher(); await new Promise(r => setTimeout(r, 150)); out.push(document.getElementById('modal-box').innerText); closeModal();
      clIr('vales'); await new Promise(r => setTimeout(r, 150)); out.push(document.getElementById('clientes-content').innerText);
      openCanjeVale(DB.giftVouchers[0].id); await new Promise(r => setTimeout(r, 100)); out.push(document.getElementById('modal-box').innerText); closeModal();
      return out.join('\n');
    });
  }
  await pg.close();
  for(const lang of ['es', 'ca', 'en']) assert.ok(!/undefined|\bnull\b|\[object|NaN/.test(textos[lang]), `${lang}: ` + textos[lang].match(/.{20}(undefined|\bnull\b|\[object|NaN).{20}/)?.[0]);
  assert.ok(/Historial de vales/i.test(textos.es) && /Historial de vals/i.test(textos.ca) && /Voucher history/i.test(textos.en), 'no cambia de idioma');
});

await caso('Sin desbordes de ancho en cinco anchos de móvil: lista, ficha, historial, vales y sus ventanas', async () => {
  await sembrar();
  await emitir('importe', {importe: 50, cliente: '1'});
  const malos = [];
  for(const w of [320, 360, 390, 412, 430]){
    await page.setViewport({width:w, height:800}); await esperar(150);
    for(const [nombre, fn] of [['lista', () => { clientesPantalla = 'lista'; renderClientes(); }], ['historial', () => clIr('historial', 1)], ['vales', () => clIr('vales')]]){
      await q(fn); await esperar(150);
      const o = await q(() => ({sw: document.documentElement.scrollWidth, iw: window.innerWidth}));
      if(o.sw > o.iw + 1) malos.push(`${nombre}@${w}: ${o.sw}>${o.iw}`);
    }
    for(const [nombre, fn] of [['ficha', () => openClientModal(1)], ['emitir', () => openGiftVouchersModal()], ['canje', () => openCanjeVale(DB.giftVouchers[0].id)]]){
      await q(fn); await esperar(150);
      const o = await q(() => ({sw: document.documentElement.scrollWidth, iw: window.innerWidth, mw: document.getElementById('modal-box').scrollWidth, mc: document.getElementById('modal-box').clientWidth}));
      if(o.sw > o.iw + 1 || o.mw > o.mc + 1) malos.push(`${nombre}@${w}`);
      await q(() => closeModal());
    }
  }
  await page.setViewport({width:1280, height:900});
  assert.deepEqual(malos, [], malos.join(' · '));
});

await caso('Sin errores de JavaScript', async () => { assert.deepEqual(errores, [], errores.join(' | ')); });
await browser.close();
console.log(fallos ? `\n❌ ${fallos} fallo(s)` : '\n✅ todos los casos de Clientes y vales pasaron');
process.exit(fallos ? 1 : 0);
