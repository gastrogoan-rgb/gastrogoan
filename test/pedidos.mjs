// Pedidos (30/10): «Realizar pedido» como lista de la compra (stock, precio y cantidad con − y +), «sugerir por déficit» que
// descuenta lo que ya viene de camino y redondea al envase, enviar/imprimir, el historial con el selector de periodo común
// y la hoja de cada pedido con su recepción.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox'], protocolTimeout:30000});
let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}
const esperar = ms => new Promise(r => setTimeout(r, ms));

const SEMBRAR_PEDIDOS = () => {
  const L = (id, q, extra) => Object.assign({ingredientId:id, cantidad:q, cantidadRecibida:null}, extra || {});
  const f = d => { const x = new Date(); x.setDate(x.getDate() + d); return dateStr(x); };
  const hoy = new Date(); const otroMes = new Date(hoy.getFullYear(), hoy.getMonth() - 2, 10);
  DB.purchaseOrders = [
    {id:1, supplier:'Pescados Martínez', date:f(3), estado:'ENVIADO', enviadoEn:f(-1), area:'cocina', items:[L(1,5), L(2,2)], notas:''},
    {id:2, supplier:'Verduras Ca la Rosa', date:f(-3), estado:'RECIBIDO', enviadoEn:f(-5), area:'cocina', recibidoPor:'Marta', comprobacion:'ok', items:[L(6,10,{cantidadRecibida:10, recibidoCheck:true})], notas:''},
    {id:3, supplier:'Pescados Martínez', date:f(5), estado:'BORRADOR', area:'cocina', items:[L(3,4)], notas:'Llamar antes de las 10'},
    {id:4, supplier:'Verduras Ca la Rosa', date:dateStr(otroMes), estado:'RECIBIDO', area:'cocina', items:[L(6,3,{cantidadRecibida:3, recibidoCheck:true})], notas:''},
  ];
  pedidoDetailId = null; saveDB();
};
async function abrir(ancho){
  const page = await browser.newPage();
  await page.setViewport({width:ancho, height: ancho < 600 ? 800 : 900});
  page.erroresJs = [];
  page.on('pageerror', e => page.erroresJs.push(e.message));
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
  await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
  await page.evaluate(code => {
    localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
    localStorage.setItem('gastrogoan_owner_login','1');
    localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted','1');
    localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
  }, 'PEDIDOS001');
  await page.reload({waitUntil:'domcontentloaded'});
  await esperar(2200);
  await page.evaluate(()=>{
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, name:'Bar de Pruebas'});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    DB.providers = [
      {id:1, nombre:'Pescados Martínez', tel:'600111222', email:'p@m.es', diasEntrega:['Martes','Jueves','Sábado'], horaEntrega:'08:30', envioTipo:'minimo', envioMinimo:150, envioCoste:12, area:'cocina'},
      {id:2, nombre:'Verduras Ca la Rosa', tel:'931234567', area:'cocina'},
    ];
    const I = (id, name, unit, price, supplier, pack) => ({id, name, category:'Pescados', unit, supplier, price, packQty: pack || 1, packPrice: price * (pack || 1), iva:10, allergens:[], area:'cocina'});
    DB.ingredients = [I(1,'Merluza','kg',14,'Pescados Martínez'), I(2,'Gambas','kg',38,'Pescados Martínez'), I(3,'Calamar','kg',11,'Pescados Martínez'), I(4,'Mejillón','kg',4.5,'Pescados Martínez'), I(5,'Sal gruesa','g',0.002,'Pescados Martínez',1000), I(6,'Lechuga','ud',0.9,'Verduras Ca la Rosa')];
    DB.stock = {1:{qty:2,min:10}, 2:{qty:1,min:3}, 3:{qty:8,min:5}, 4:{qty:0,min:0}, 5:{qty:200,min:2000}, 6:{qty:4,min:12}};
    const L = (id, q, extra) => Object.assign({ingredientId:id, cantidad:q, cantidadRecibida:null}, extra || {});
    const f = d => { const x = new Date(); x.setDate(x.getDate() + d); return dateStr(x); };
    const hoy = new Date(); const otroMes = new Date(hoy.getFullYear(), hoy.getMonth() - 2, 10);
    DB.purchaseOrders = [
      {id:1, supplier:'Pescados Martínez', date:f(3), estado:'ENVIADO', enviadoEn:f(-1), area:'cocina', items:[L(1,5), L(2,2)], notas:''},
      {id:2, supplier:'Verduras Ca la Rosa', date:f(-3), estado:'RECIBIDO', enviadoEn:f(-5), area:'cocina', recibidoPor:'Marta', comprobacion:'ok', items:[L(6,10,{cantidadRecibida:10, recibidoCheck:true})], notas:''},
      {id:3, supplier:'Pescados Martínez', date:f(5), estado:'BORRADOR', area:'cocina', items:[L(3,4)], notas:'Llamar antes de las 10'},
      {id:4, supplier:'Verduras Ca la Rosa', date:dateStr(otroMes), estado:'RECIBIDO', area:'cocina', items:[L(6,3,{cantidadRecibida:3, recibidoCheck:true})], notas:''},
    ];
    DB.pedidoSolicitudes = [];
    saveDB(); currentFolder = 'cocina'; pedidoDetailId = null; navigate('pedidos'); setPedidosTab('crear');
  });
  await esperar(500);
  return page;
}

for(const ancho of [1280, 360]){
  const page = await abrir(ancho);
  const q = (fn, ...a) => page.evaluate(fn, ...a);

  await caso(`Realizar pedido: elegir proveedor enseña sus días de reparto, el contacto y los artículos con stock y precio (${ancho}px)`, async () => {
    assert.ok(await q(() => !!document.querySelector('.pc-vacio')), 'sin proveedor, un mensaje');
    await q(() => selectOrderSupplier('Pescados Martínez')); await esperar(400);
    const r = await q(() => ({dias: [...document.querySelectorAll('.pc-dia.on')].map(d => d.textContent), contacto: [...document.querySelectorAll('.pc-contacto')].map(c => c.className.split(' ').pop() + ':' + c.textContent.trim()),
      filas: [...document.querySelectorAll('.pc-art')].map(f => f.querySelector('b').textContent), primera: document.querySelector('.pc-art').innerText.replace(/\s+/g,' ')}));
    assert.deepEqual(r.dias.map(d => d.toLowerCase()), ['mar', 'jue', 'sáb']);
    assert.ok(r.contacto.some(c => /ok:WhatsApp/.test(c)) && r.contacto.some(c => /ok:Email/.test(c)), r.contacto.join('|'));
    assert.equal(r.filas.length, 5); assert.ok(/Stock: \d/.test(r.primera) && /€\/kg/.test(r.primera), r.primera);
  });

  await caso(`Las cantidades se ponen con − y + (o escribiendo) y el resumen suma al momento (${ancho}px)`, async () => {
    await q(() => { ordenPaso(1, 1); ordenPaso(1, 1); ordenPaso(1, 1); }); await esperar(150);
    assert.equal(await q(() => document.getElementById('oq-1').value), '3');
    await q(() => { const i = document.getElementById('oq-2'); i.value = '2'; i.dispatchEvent(new Event('input', {bubbles:true})); }); await esperar(150);
    const r = await q(() => ({res: document.getElementById('order-summary').innerText.replace(/\s+/g,' '), con: document.querySelectorAll('.pc-art.con').length, chip: [...document.querySelectorAll('.pc-chips .btn')].map(b => b.textContent.replace(/\s+/g,' ').trim())}));
    // 3 kg merluza (42) + 2 kg gambas (76) = 118 + 10 % IVA = 129,80; no llega a 150 → +12 de envío
    assert.ok(/118,00/.test(r.res) && /11,80/.test(r.res) && /12,00/.test(r.res) && /141,80/.test(r.res), r.res);
    assert.ok(/Te faltan 32,00/.test(r.res) && !/\$\{/.test(r.res), 'avisa de lo que falta para el envío gratis, sin dejar marcadores: ' + r.res);
    assert.equal(r.con, 2); assert.equal(r.chip[2], 'Con cantidad 2');
  });

  await caso(`Filtros: «bajo mínimo» enseña solo lo que está por debajo y el buscador filtra (${ancho}px)`, async () => {
    await q(() => setOrderFiltro('bajo')); await esperar(300);
    assert.deepEqual(await q(() => [...document.querySelectorAll('.pc-art b')].map(b => b.textContent).sort()), ['Gambas', 'Merluza', 'Sal gruesa']);
    await q(() => setOrderFiltro('bajo')); await esperar(200);
    await q(() => updateOrderItemSearch('mej')); await esperar(200);
    assert.deepEqual(await q(() => [...document.querySelectorAll('.pc-art b')].map(b => b.textContent)), ['Mejillón']);
    await q(() => updateOrderItemSearch(''));
  });

  await caso(`Sugerir por déficit: descuenta lo que ya viene de camino y redondea al envase (${ancho}px)`, async () => {
    await q(() => { limpiarPedidoEnCurso && orderModalLines.forEach(l => l.cantidad = 0); refreshOrderForm(); });
    await q(() => { sugerirPorDeficit(); }); await esperar(500);
    const r = await q(() => Object.fromEntries(orderModalLines.map(l => [l.ingredientId, l.cantidad])));
    // Merluza: mín 10 − stock 2 − 5 en camino = 3 · Gambas: 3 − 1 − 2 en camino = 0 (ya viene) · Calamar: 8 > 5 = 0 ·
    // Mejillón: sin mínimo = 0 · Sal gruesa: falta 1800 g y el envase es de 1000 → 2000
    assert.deepEqual(r, {1:3, 2:0, 3:0, 4:0, 5:2000});
    const aviso = await q(() => document.getElementById('toast')?.innerText || [...document.querySelectorAll('.toast')].map(t => t.innerText).join(' '));
    assert.ok(/2 artículos sugeridos/.test(aviso) && /ya vienen de camino/.test(aviso) && /sin mínimo/.test(aviso), aviso);
    assert.ok(await q(() => !!document.querySelector('.pc-tag.cam')), 'las líneas con pedido en camino lo dicen');
  });

  await caso(`Sin nada por debajo del mínimo lo dice, en vez de «cantidades sugeridas» a secas (${ancho}px)`, async () => {
    await q(() => { DB.stock[1].qty = 50; DB.stock[5].qty = 5000; orderModalLines.forEach(l => l.cantidad = 0); });
    await q(() => { sugerirPorDeficit(); }); await esperar(400);
    assert.ok(/Nada que pedir/.test(await q(() => document.getElementById('toast')?.innerText || [...document.querySelectorAll('.toast')].map(t => t.innerText).join(' '))));
    await q(() => { DB.stock[1].qty = 2; DB.stock[5].qty = 200; });
  });

  await caso(`Enviar, guardar borrador e imprimir: desactivados sin artículos y bien explicados (${ancho}px)`, async () => {
    await q(() => { orderModalLines.forEach(l => l.cantidad = 0); refreshOrderForm(); }); await esperar(300);
    assert.ok(await q(() => [...document.querySelectorAll('#order-acciones .btn')].every(b => b.disabled)), 'sin nada que pedir, todo desactivado');
    await q(() => selectOrderSupplier('Verduras Ca la Rosa')); await esperar(300);
    await q(() => { ordenPaso(6, 1); }); await esperar(200);
    const r = await q(() => ({wa: document.querySelector('#order-acciones .btn').disabled, titulo: document.querySelector('#order-acciones .btn').title, nota: document.getElementById('order-acciones').innerText}));
    assert.ok(r.wa && /fijo/i.test(r.titulo), 'un proveedor con fijo no puede recibir WhatsApp y dice por qué: ' + JSON.stringify(r));
    assert.ok(/ni correo|móvil ni correo/i.test(r.nota), 'explica qué hacer: ' + r.nota);
    await q(() => selectOrderSupplier('Pescados Martínez')); await esperar(200);
  });

  await caso(`WhatsApp: crea el pedido enviado y abre el mensaje con a quién, para cuándo y qué (${ancho}px)`, async () => {
    await q(() => { ordenPaso(1, 1); ordenPaso(1, 1); ordenPaso(3, 1); document.getElementById('order-notas').value = 'Llamar al llegar'; });
    const url = await q(async () => { let u = ''; const o = window.open; window.open = x => { u = x; return null; };
      document.getElementById('order-date').value = (() => { const d = new Date(); for(let i = 1; i < 9; i++){ d.setDate(d.getDate() + 1); if(['Martes','Jueves','Sábado'].includes(WEEK_DAYS[(d.getDay() + 6) % 7])) return dateStr(d); } })();
      DB.purchaseOrders = DB.purchaseOrders.filter(x => !(x.supplier === 'Pescados Martínez' && x.estado !== 'RECIBIDO'));
      await sendNewPedido('whatsapp'); window.open = o; return u; });
    const txt = decodeURIComponent(url.split('text=')[1] || '');
    assert.ok(url.startsWith('https://wa.me/34600111222'), url);
    assert.ok(/Pescados Martínez/.test(txt) && /Merluza: 2 kg/.test(txt) && /Calamar: 1 kg/.test(txt) && /entrega/i.test(txt) && /Llamar al llegar/.test(txt) && /Bar de Pruebas/.test(txt), txt);
    assert.ok(!/€/.test(txt), 'sin precios para el proveedor');
    const o = await q(() => DB.purchaseOrders.find(x => x.supplier === 'Pescados Martínez' && x.notas === 'Llamar al llegar'));
    assert.ok(o && o.estado === 'ENVIADO' && o.items.length === 2, JSON.stringify(o));
    assert.ok(await q(() => pedidosTab === 'historial'), 'pasa al historial');
  });

  await caso(`Guardar borrador deja el pedido sin enviar y abre su hoja (${ancho}px)`, async () => {
    await q(() => { setPedidosTab('crear'); selectOrderSupplier('Pescados Martínez'); ordenPaso(4, 1); }); await esperar(300);
    await q(() => { document.getElementById('order-date').value = (() => { const d = new Date(); for(let i = 1; i < 9; i++){ d.setDate(d.getDate() + 1); if(['Martes','Jueves','Sábado'].includes(WEEK_DAYS[(d.getDay() + 6) % 7])) return dateStr(d); } })(); DB.purchaseOrders = DB.purchaseOrders.filter(x => !(x.supplier === 'Pescados Martínez' && x.estado !== 'RECIBIDO')); });
    await q(() => { guardarBorradorPedido(); }); await esperar(500);
    const b = await q(() => DB.purchaseOrders.filter(x => x.estado === 'BORRADOR' && x.supplier === 'Pescados Martínez'));
    assert.equal(b.length, 1); assert.ok(await q(() => !!document.querySelector('.pd-prov')), 'abre la hoja del borrador');
  });

  await caso(`El impreso del pedido: a quién, para cuándo, tabla con casillas de recibido y sin precios (${ancho}px)`, async () => {
    const html = await q(() => { window.__h = ''; const o = window.open; window.open = () => ({document:{write:h => { window.__h += h; }, close(){}}, print(){}}); printPedido(); window.open = o; return window.__h; });
    assert.ok(/pp-metas/.test(html) && /Pescados Martínez/.test(html) && /pp-ck/.test(html), 'estructura');
    assert.ok(/Mejillón/.test(html) && !/4,50/.test(html), 'artículos sin precios');
    assert.ok(!/class="ti /.test(html), 'sin iconos de fuente');
  });

  await q(SEMBRAR_PEDIDOS);
  await caso(`Historial: selector de periodo único con flechas, doce meses con su recuento y «todo el año» (${ancho}px)`, async () => {
    await q(() => setPedidosTab('historial')); await esperar(400);
    const hoy = await q(() => ({mes: new Date().getMonth(), anio: new Date().getFullYear()}));
    const etq = await q(() => document.querySelector('.pe-actual span').textContent.trim().toLowerCase());
    assert.ok(etq.includes(String(hoy.anio)), etq);
    await q(() => document.querySelector('.pe-actual').click()); await esperar(200);
    const pop = await q(() => ({meses: document.querySelectorAll('.pe-pop .pe-mes').length, conDatos: [...document.querySelectorAll('.pe-pop .pe-mes.tiene')].map(m => m.querySelector('em').textContent), anual: !!document.querySelector('.pe-pop .pe-pie .btn')}));
    assert.equal(pop.meses, 12); assert.ok(pop.conDatos.length >= 1 && pop.anual, JSON.stringify(pop));
    await page.keyboard.press('Escape'); await esperar(100);
    assert.equal(await q(() => !!document.querySelector('.pe-pop')), false, 'Escape lo cierra');
    // Flechas: un mes atrás y otra vez adelante.
    await q(() => document.querySelectorAll('.pe-flecha')[0].click()); await esperar(250);
    assert.equal(await q(() => pedidoHistorialMonth), (hoy.mes + 11) % 12);
    await q(() => document.querySelectorAll('.pe-flecha')[1].click()); await esperar(250);
    assert.equal(await q(() => pedidoHistorialMonth), hoy.mes);
    // Todo el año
    await q(() => setPedidoHistorialPeriodo(new Date().getFullYear(), null)); await esperar(250);
    assert.ok(/^\d{4}$/.test(await q(() => document.querySelector('.pe-actual span').textContent.trim())), 'el año entero se llama por su año');
    await q(() => setPedidoHistorialPeriodo(new Date().getFullYear(), new Date().getMonth()));
  });

  await caso(`Historial: tarjetas por pedido con estado, entrega, artículos y total; lo pendiente se ve siempre (${ancho}px)`, async () => {
    await q(() => { setPedidoHistorialPeriodo(new Date().getFullYear(), new Date().getMonth()); }); await esperar(300);
    const r = await q(() => ({tarjetas: [...document.querySelectorAll('#pedido-results .pe-ped')].map(c => c.innerText.replace(/\s+/g,' ')), tabla: !!document.querySelector('#pedido-results table')}));
    assert.ok(!r.tabla);
    assert.ok(r.tarjetas.some(t => /ENVIADO/.test(t)) && r.tarjetas.some(t => /BORRADOR/.test(t)) && r.tarjetas.some(t => /RECIBIDO/.test(t)), r.tarjetas.join(' || '));
    assert.ok(!r.tarjetas.some(t => /Verduras/.test(t) && /RECIBIDO/.test(t) && /ARTÍCULOS\s+1/.test(t) && false), 'ok');
    // El recibido de hace dos meses no sale en este mes…
    assert.equal(await q(() => [...document.querySelectorAll('#pedido-results .pe-recibido')].length), 1);
    // …pero buscando se avisa de que hay más fuera.
    await q(() => { pedidoHistorialSupplierFilter = 'Verduras Ca la Rosa'; renderPedidoList(); }); await esperar(250);
    assert.ok(await q(() => !!document.querySelector('.pe-aviso')), 'avisa de los de otros meses');
    await q(() => { pedidoHistorialSupplierFilter = ''; renderPedidoList(); });
  });

  await caso(`Historial: filtrar por estado con los botones y el menú de cada tarjeta (${ancho}px)`, async () => {
    await q(() => setPedidoHistorialEstado('ENVIADO')); await esperar(250);
    assert.ok(await q(() => [...document.querySelectorAll('#pedido-results .pe-ped')].every(c => /ENVIADO/.test(c.innerText))));
    await q(() => setPedidoHistorialEstado('ENVIADO')); await esperar(200);
    const m = await q(() => { const rec = document.querySelector('#pedido-results .pe-recibido [data-acc]'); const env = document.querySelector('#pedido-results .pe-enviado [data-acc]'); return {rec: JSON.parse(rec.dataset.acc).map(a => a.fn.split('(')[0]), env: JSON.parse(env.dataset.acc).map(a => a.fn.split('(')[0])}; });
    assert.deepEqual(m.rec, ['openPedido', 'duplicateOrder'], 'un recibido no se borra'); assert.deepEqual(m.env, ['openPedido', 'duplicateOrder', 'deleteOrder']);
  });

  await caso(`La hoja de un pedido enviado: estado, líneas con ✓/✗, precio de albarán y total (${ancho}px)`, async () => {
    await q(() => { const e = DB.purchaseOrders.find(o => o.estado === 'ENVIADO'); openPedido(e.id); }); await esperar(400);
    const r = await q(() => ({pasos: [...document.querySelectorAll('.pd-pasos li')].map(l => l.className || '-'), lineas: document.querySelectorAll('.pd-linea').length, botones: document.querySelectorAll('.pd-ck').length,
      primario: [...document.querySelectorAll('#pedidos-list .es-barra button')].map(b => b.innerText.trim()), acc: document.querySelector('#pedidos-list .es-barra [data-acc]') ? JSON.parse(document.querySelector('#pedidos-list .es-barra [data-acc]').dataset.acc).map(a => a.fn.split('(')[0]) : []}));
    assert.deepEqual(r.pasos, ['hecho', 'actual', '-']); assert.equal(r.lineas, 2); assert.equal(r.botones, 4);
    assert.ok(r.primario.some(b => /Marcar recibido/i.test(b)) && r.primario.some(b => /Email/.test(b)) && r.primario.some(b => /Imprimir/i.test(b)), r.primario.join('|'));
    assert.deepEqual(r.acc, ['duplicateOrder', 'deleteOrder']);
  });

  await caso(`Recepción: marcar ✓ suma al stock al recibir, con su gasto; el recibido ofrece «deshacer» (${ancho}px)`, async () => {
    const id = await q(() => pedidoDetailId);
    await q(() => { const o = getPurchaseOrder(pedidoDetailId); o.items.forEach((l, i) => toggleRecepcionCheck(i, true)); }); await esperar(250);
    assert.equal(await q(() => document.querySelectorAll('.pd-ck.is-ok').length), 2);
    const antes = await q(() => DB.stock[1].qty);
    await q(() => { changePedidoEstado('RECIBIDO'); }); await esperar(500);
    assert.equal(await q(() => DB.stock[1].qty), antes + 5, 'la merluza pedida entra en stock');
    assert.ok(await q(() => getPurchaseOrder(pedidoDetailId).estado === 'RECIBIDO' && document.querySelector('.pd-pasos li:last-child').classList.contains('actual')));
    assert.ok((await q(() => JSON.parse(document.querySelector('#pedidos-list .es-barra [data-acc]').dataset.acc).map(a => a.fn.split('(')[0]))).includes('revertPedidoRecepcion'));
    assert.ok(await q(() => !!document.getElementById('rec-fecha')), 'el control de recepción sigue ahí');
  });

  await caso(`Pedir lo que falta (sin permiso de editar): lista con − y +, y se envía (${ancho}px)`, async () => {
    await q(() => { window.__eu = editUnlocked; editUnlocked = false; setPedidosTab('solicitar'); }); await esperar(300);
    await q(() => { updateSolicitudSearch('merl'); }); await esperar(150);
    await q(() => { document.querySelector('.pc-res-fila .btn').click(); }); await esperar(150);
    await q(() => stepSolicitudQty(0, 1)); await esperar(100);
    assert.equal(await q(() => solicitudLines[0].cantidad), 2);
    await q(() => { document.getElementById('solicitud-notas').value = 'Urgente'; submitPedidoSolicitud(); }); await esperar(300);
    assert.equal(await q(() => (DB.pedidoSolicitudes || []).length), 1);
    await q(() => { editUnlocked = window.__eu; setPedidosTab('crear'); }); await esperar(300);
    assert.ok(await q(() => !!document.querySelector('.pc-solicitudes')), 'quien puede editar la ve arriba del pedido');
    await q(() => { DB.pedidoSolicitudes = []; });
  });

  await caso(`Nada se desborda y los controles se pueden tocar (${ancho}px)`, async () => {
    const r = await q(async () => {
      const mira = () => ({pagina: document.documentElement.scrollWidth > innerWidth + 1,
        toque: [...document.querySelectorAll('#pedidos-list button, #pedidos-list select, #pedidos-list input:not([type=file]):not([type=checkbox])')].filter(b => { const x = b.getBoundingClientRect(); return x.width && (x.height < 34 || x.width < 34); }).map(b => b.outerHTML.slice(0, 70))});
      const out = {};
      setPedidosTab('crear'); selectOrderSupplier('Pescados Martínez'); await new Promise(r => setTimeout(r, 300)); ordenPaso(1, 1); out.crear = mira();
      setPedidosTab('historial'); await new Promise(r => setTimeout(r, 300)); out.hist = mira();
      openPedido(DB.purchaseOrders.find(o => o.estado === 'RECIBIDO').id); await new Promise(r => setTimeout(r, 300)); out.hoja = mira();
      return out;
    });
    for(const [k, v] of Object.entries(r)) assert.ok(!v.pagina && v.toque.length === 0, k + ': ' + JSON.stringify(v));
  });

  await caso(`Ningún error de JavaScript (${ancho}px)`, async () => { assert.deepEqual(page.erroresJs, [], page.erroresJs.join(' | ')); });
  await page.close();
}

console.log('\n' + '═'.repeat(70));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
