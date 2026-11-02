// TPV rehecho (1/11): franja corta, cartas en un botón, mesas como fichas con filtros, tomar nota con la comanda siempre
// a la vista, notas rápidas, para llevar con el mismo lenguaje y AIRE por los cuatro lados en las ventanas.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}
async function abrir(w, h){
  const page = await browser.newPage();
  await page.setViewport({width:w, height:h, isMobile:w < 500, hasTouch:w < 1000});
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  page.on('dialog', d => d.dismiss().catch(() => {}));
  page.setDefaultTimeout(20000);
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
  await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
  await page.evaluate(() => {
    localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'TPVTEST01', tenantId: ggBizTenantId('TPVTEST01')}));
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
    DB.tables.length = 0; DB.tpvOrders.length = 0; DB.cartas.length = 0; DB.sales.length = 0;
    const zonas = ['Salón','Salón','Salón','Salón','Salón','Salón','Terraza','Terraza','Terraza','Terraza','Barra','Barra'];
    zonas.forEach((zona, i) => DB.tables.push({id:i+1, name:`Mesa ${i+1}`, zona, plazas:4}));
    let pid = 100, sid = 10;
    const pl = (n, p) => ({id:pid++, nombre:n, precio:p, disponible:true, alergenos:''});
    DB.cartas.push({id:1, nombre:'Carta del día', secciones:[
      {id:sid++, nombre:'Entrantes', icono:'ic:none', platos:[pl('Croquetas de jamón ibérico', 9.5), pl('Patatas bravas', 6.5)]},
      {id:sid++, nombre:'Principales', icono:'ic:none', platos:[pl('Solomillo al Pedro Ximénez', 22), pl('Hamburguesa de ternera', 14)]},
    ]}, {id:2, nombre:'Bebidas', tipo:'bebida', secciones:[{id:sid++, nombre:'Cervezas y vinos', icono:'ic:none', platos:[pl('Caña de cerveza', 2.5)]}]});
    DB.activeCartaIds = [1, 2];
    const now = Date.now();
    const L = (n, p, q, tanda, estado, marchada, bebida) => ({lineId:genId(), platoId:pid++, recipeId:null, name:n, price:p, qty:q, tanda, estado, marchada, bebida:!!bebida, notas:''});
    const ord = (id, t, mins, items, pax) => DB.tpvOrders.push({id, tableId:t, tipo:'mesa', status:'abierta', pax, items, tandas:[...new Set(items.map(i => i.tanda))], createdAt:new Date(now - mins*60000).toISOString()});
    ord(900, 1, 12, [Object.assign(L('Croquetas de jamón ibérico', 9.5, 2, 'Entrantes', null, 0), {platoId:100})], 2);
    ord(901, 2, 34, [L('Solomillo al Pedro Ximénez', 22, 2, 'Principales', 'cocina', 2)], 3);
    ord(902, 3, 71, [L('Hamburguesa de ternera', 14, 2, 'Principales', 'entregado', 2)], 2);
    ord(903, 4, 5, [], 4);
    ord(905, 11, 95, [L('Caña de cerveza', 2.5, 4, 'Bebidas', 'entregado', 4, true)], 2);
    DB.tpvOrders.push({id:950, tableId:null, tipo:'takeaway', status:'abierta', clienteNombre:'Marta Ruiz', items:[L('Hamburguesa de ternera', 14, 1, 'Principales', null, 0)], tandas:['Principales'], createdAt:new Date(now - 4*60000).toISOString(), date:todayStr(), pagado:true});
    DB.tpvOrders.push({id:953, tableId:null, tipo:'takeaway', status:'pendiente-online', clienteNombre:'Lucía Gómez', items:[L('Patatas bravas', 6.5, 2, 'Entrantes', null, 0)], tandas:['Entrantes'], createdAt:new Date(now - 1*60000).toISOString(), date:todayStr(), origenOnline:true, clientRef:'ABCD1234EFGH'});
    saveDB();
    currentFolder = 'sala'; navigate('tpv');
  });
  await new Promise(r => setTimeout(r, 700));
  return {page, errs};
}

const ANCHOS = [[1280,800],[820,1180],[430,932],[412,915],[390,844],[360,740],[320,700]];

await caso('Arriba solo hay una franja corta: cifras + Cartas + Lista de espera + Cerrar caja + botones pequeños. Las dos cajas de cartas y menús ya no existen', async () => {
  const {page} = await abrir(1280, 800);
  const r = await page.evaluate(() => ({
    cifras: document.querySelectorAll('.tp-cifra').length,
    chip: !!document.querySelector('.tp-chip-cartas'),
    cajonesViejos: document.querySelectorAll('#view-tpv .card h3 .ti-book-2').length,
    caja: !!document.getElementById('tpv-close-cash-btn'),
    sec: document.querySelectorAll('.tp-botonera .btn').length,
    primeraMesa: Math.round(document.querySelector('.tp-mesa').getBoundingClientRect().top),
  }));
  assert.equal(r.cifras, 4, JSON.stringify(r)); assert.ok(r.chip && r.caja && r.sec >= 6, 'Anulaciones, Agotado y Arqueos son botones pequeños, no un menú: ' + JSON.stringify(r));
  assert.equal(r.cajonesViejos, 0, 'no quedan los recuadros viejos de cartas activas: ' + JSON.stringify(r));
  assert.ok(r.primeraMesa < 420, 'en PC la primera mesa se ve sin bajar: ' + JSON.stringify(r));
  await page.close();
});

await caso('En móvil se llega a las mesas rápido: la primera ficha empieza en la primera pantalla (390 y 360)', async () => {
  for(const [w, h] of [[390,844],[360,740]]){
    const {page} = await abrir(w, h);
    const r = await page.evaluate(() => ({top: Math.round(document.querySelector('.tp-mesa').getBoundingClientRect().top), cifrasVisibles: [...document.querySelectorAll('.tp-cifra')].filter(c => c.offsetParent).length}));
    assert.ok(r.top < 640, `${w}px: la primera mesa empieza a ${r.top}px (antes pasaba de 700)`);
    assert.equal(r.cifrasVisibles, 2, `${w}px: solo las dos cifras que importan`);
    await page.close();
  }
});

await caso('«Cartas» es un botón que cuenta las activas y enseña cuáles son (con su estado) en una ventana', async () => {
  const {page} = await abrir(1280, 800);
  const r = await page.evaluate(async () => {
    const n = document.querySelector('.tp-chip-cartas b').textContent.trim();
    document.querySelector('.tp-chip-cartas').click();
    await new Promise(r => setTimeout(r, 300));
    const filas = [...document.querySelectorAll('.tp-ca-fila')].map(f => f.textContent.replace(/\s+/g, ' ').trim());
    return {n, filas};
  });
  assert.equal(r.n, '2'); assert.equal(r.filas.length, 2, JSON.stringify(r));
  assert.ok(r.filas.every(f => /Activa/.test(f)), JSON.stringify(r));
  await page.close();
});

await caso('Las mesas son fichas con el estado a la vista (libre, tomando nota, en cocina, servida) y con total y tiempo', async () => {
  const {page} = await abrir(1280, 800);
  const r = await page.evaluate(() => {
    const k = n => document.querySelector(`.tp-mesa[data-mesa="${n}"]`);
    return {
      m1: k(1).className, m2: k(2).className, m3: k(3).className, m4: k(4).className, m5: k(5).className,
      total2: k(2).querySelector('.tp-mesa-total')?.textContent.trim(), tiempo2: k(2).querySelector('.tp-mesa-tiempo')?.textContent.trim(),
      urgente: k(11).querySelector('.tp-mesa-tiempo').className,
    };
  });
  assert.match(r.m1, /is-tomando/); assert.match(r.m2, /is-cocina/); assert.match(r.m3, /is-servida/); assert.match(r.m4, /is-ocupada/); assert.match(r.m5, /is-libre/);
  assert.match(r.total2, /44,00/); assert.match(r.tiempo2, /34/); assert.match(r.urgente, /is-aviso/, '95 min = aviso de mesa larga: ' + JSON.stringify(r));
  await page.close();
});

await caso('Filtros: Libres / Ocupadas / Servidas con su cuenta, zona y buscador «Ir a mesa…»', async () => {
  const {page} = await abrir(1280, 800);
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms));
    const vis = () => [...document.querySelectorAll('.tp-mesa')].map(m => m.dataset.mesa).join(',');
    const out = {};
    out.todas = vis();
    setTpvMesaFiltro('libres'); await esp(100); out.libres = vis();
    setTpvMesaFiltro('servidas'); await esp(100); out.servidas = vis();
    setTpvMesaFiltro('ocupadas'); await esp(100); out.ocupadas = vis();
    setTpvMesaFiltro('todas'); setTpvZona('Terraza'); await esp(100); out.terraza = vis();
    setTpvZona(''); setTpvMesaBusca('mesa 11'); await esp(100); out.busca = vis();
    setTpvMesaBusca(''); await esp(50);
    out.cuentas = [...document.querySelectorAll('.tp-filtros .btn b')].map(b => b.textContent.trim()).slice(0, 4).join(',');
    return out;
  });
  assert.equal(r.libres, '5,6,7,8,9,10,12'.split(',').filter(n => !['5','6','7','8','9','10','12'].includes('x')).join(','), JSON.stringify(r));
  assert.equal(r.servidas, '3', JSON.stringify(r)); assert.equal(r.ocupadas, '1,2,3,4,11', JSON.stringify(r));
  assert.equal(r.terraza, '7,8,9,10', JSON.stringify(r)); assert.equal(r.busca, '11', JSON.stringify(r));
  assert.equal(r.cuentas, '12,7,5,1', 'cuentas de Todas, Libres, Ocupadas, Servidas (libres 7, ocupadas 5): ' + JSON.stringify(r));
  await page.close();
});

await caso('Modo caos: una sola lista con las ocupadas, la que más lleva esperando primero', async () => {
  const {page} = await abrir(1280, 800);
  const r = await page.evaluate(async () => {
    toggleChaosMode(); await new Promise(r => setTimeout(r, 200));
    return [...document.querySelectorAll('.tp-mesa')].map(m => m.dataset.mesa).join(',');
  });
  assert.equal(r, '11,3,2,1,4', 'de 95 a 5 minutos: ' + r);
  await page.close();
});

await caso('Tomar nota: tocar un plato lo añade, la ficha dice cuántos lleva (×N) y la comanda del lado se ve a la vez', async () => {
  const {page} = await abrir(1280, 800);
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms));
    openTableOrder(4, 903); await esp(400);
    const out = {sinPlatos: document.querySelectorAll('.tp-com-vacia').length};
    closeModal(); openTableOrder(1, 900); await esp(400);
    document.querySelector('.tp-or-tab:not(.is-on)').click(); await esp(200);   // carta del día
    document.querySelectorAll('.tp-seccion')[1].click(); await esp(200);        // Principales: segunda tanda, no sale sola a cocina
    const p = document.querySelector('.tp-plato-main'); p.click(); await esp(200);
    document.querySelector('.tp-plato-main').click(); await esp(200);
    const ficha = document.querySelector('.tp-plato.tiene');
    out.n = ficha?.querySelector('.tp-plato-n')?.textContent.trim();
    out.lineas = document.querySelectorAll('.tp-linea').length;
    out.cant = [...document.querySelectorAll('.tp-q-n')].map(e => e.textContent.trim()).join(',');
    out.comandaVisible = !!document.querySelector('.tp-or-comanda')?.offsetParent && !!document.querySelector('.tp-or-carta')?.offsetParent;
    document.querySelector('.tp-plato-menos').click(); await esp(200);
    out.tras = document.querySelector('.tp-plato-n')?.textContent.trim();
    out.total = document.querySelector('.tp-com-total')?.textContent.trim();
    return out;
  });
  assert.equal(r.sinPlatos, 1, JSON.stringify(r)); assert.equal(r.n, '×2', JSON.stringify(r)); assert.equal(r.cant, '2,1,1', 'las 2 croquetas ya pedidas y el plato nuevo en dos líneas (la primera sale sola a cocina): ' + JSON.stringify(r));
  assert.ok(r.comandaVisible, 'carta y comanda lado a lado en PC: ' + JSON.stringify(r));
  assert.equal(r.tras, '×1', 'el − de la ficha quita uno: ' + JSON.stringify(r)); assert.match(r.total, /41,00/, '19 de croquetas + 22 del principal: ' + JSON.stringify(r));
  await page.close();
});

await caso('El buscador de platos encuentra de cualquier carpeta y respeta lo que ya está en la comanda', async () => {
  const {page} = await abrir(1280, 800);
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms));
    openTableOrder(1, 900); await esp(400);
    document.querySelector('.tp-or-tab:not(.is-on)').click(); await esp(200);
    const ent = document.getElementById('tp-plato-busca'); ent.value = 'croq'; ent.dispatchEvent(new Event('input', {bubbles:true})); await esp(200);
    const out = {hallados: [...document.querySelectorAll('.tp-plato-nom')].map(n => n.textContent.trim()), conN: document.querySelector('.tp-plato.tiene .tp-plato-n')?.textContent.trim()};
    ent.value = 'zzzz'; ent.dispatchEvent(new Event('input', {bubbles:true})); await esp(200);
    out.vacio = !!document.querySelector('.tp-or-carta .es-vacio');
    return out;
  });
  assert.deepEqual(r.hallados, ['Croquetas de jamón ibérico'], JSON.stringify(r)); assert.equal(r.conN, '×2', JSON.stringify(r)); assert.ok(r.vacio, JSON.stringify(r));
  await page.close();
});

await caso('Notas rápidas: un toque las añade o las quita del campo y se marcan; lo anotado se ve destacado en la comanda', async () => {
  const {page} = await abrir(1280, 800);
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms));
    openTableOrder(1, 900); await esp(300);
    openLineNotesModal(900, 0); await esp(300);
    const bt = [...document.querySelectorAll('.tp-notas-rapidas [data-nota]')];
    bt.find(b => /cebolla/i.test(b.dataset.nota)).click(); bt.find(b => /punto/i.test(b.dataset.nota)).click();
    const campo = document.getElementById('line-notas-input').value;
    const marcados = document.querySelectorAll('.tp-notas-rapidas .is-on').length;
    bt.find(b => /cebolla/i.test(b.dataset.nota)).click();
    const tras = document.getElementById('line-notas-input').value;
    bt.find(b => /gluten/i.test(b.dataset.nota)).click();
    confirmLineNotes(900, 0); await esp(300);
    return {campo, marcados, tras, nota: document.querySelector('.tp-linea-nota')?.textContent.trim(), fondo: getComputedStyle(document.querySelector('.tp-linea-nota')).backgroundColor, botones: bt.length};
  });
  assert.equal(r.campo, 'Sin cebolla, Al punto', JSON.stringify(r)); assert.equal(r.marcados, 2, JSON.stringify(r)); assert.equal(r.tras, 'Al punto', JSON.stringify(r));
  assert.match(r.nota, /Al punto, Sin gluten/, JSON.stringify(r)); assert.notEqual(r.fondo, 'rgba(0, 0, 0, 0)', 'la nota va destacada: ' + JSON.stringify(r)); assert.equal(r.botones, 10);
  await page.close();
});

await caso('La cabecera de la comanda conserva «Cambiar de mesa» primero y a la vista, y cobrar abre el cobro', async () => {
  const {page} = await abrir(1280, 800);
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms));
    openTableOrder(2, 901); await esp(300);
    const h = document.querySelector('.modal-header'); const hs = [...h.children];
    const out = {primero: hs[0].textContent.trim(), h3: hs.findIndex(e => e.tagName === 'H3')};
    document.querySelector('.tp-or-cobrar').click(); await esp(300);
    out.cobro = !!document.querySelector('.modal-footer .btn-primary') && /Cobrar/.test(document.querySelector('.modal-header h3').textContent);
    return out;
  });
  assert.match(r.primero, /Cambiar de mesa/, JSON.stringify(r)); assert.equal(r.h3, 1, JSON.stringify(r)); assert.ok(r.cobro, JSON.stringify(r));
  await page.close();
});

await caso('Móvil: carta y comanda se alternan a pantalla completa, con la barra del total siempre a mano', async () => {
  const {page} = await abrir(390, 844);
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms));
    openTableOrder(2, 901); await esp(400);
    const vis = s => { const e = document.querySelector(s); return !!e && e.offsetParent !== null && e.getBoundingClientRect().height > 0; };
    const out = {carta: vis('.tp-or-carta'), comanda: vis('.tp-or-comanda'), barra: vis('.tp-or-barra'), barraTxt: document.querySelector('.tp-or-barra')?.textContent.replace(/\s+/g, ' ').trim()};
    document.querySelector('.tp-or-barra').click(); await esp(300);
    out.c2 = vis('.tp-or-carta'); out.m2 = vis('.tp-or-comanda'); out.b2 = vis('.tp-or-barra'); out.volver = vis('.tp-or-volver');
    const cob = document.querySelector('.tp-or-cobrar').getBoundingClientRect();
    out.cobrarDentro = cob.bottom <= innerHeight - 6 && cob.top >= 0 && cob.left >= 0 && cob.right <= innerWidth;
    out.cobrarAlto = Math.round(cob.height);
    return out;
  });
  assert.ok(r.carta && !r.comanda && r.barra, JSON.stringify(r)); assert.match(r.barraTxt, /44,00/, JSON.stringify(r));
  assert.ok(!r.c2 && r.m2 && !r.b2 && r.volver, JSON.stringify(r));
  assert.ok(r.cobrarDentro && r.cobrarAlto >= 44, 'el botón de cobrar entero dentro de la pantalla, con altura de dedo: ' + JSON.stringify(r));
  await page.close();
});

await caso('AIRE: en las ventanas del TPV (cobro, caja, espera, notas) el cuerpo respira por abajo y por los lados, y los botones del pie caben enteros (5 anchos)', async () => {
  for(const [w, h] of [[1280,800],[430,932],[412,915],[390,844],[360,740],[320,700]]){
    const {page} = await abrir(w, h);
    const r = await page.evaluate(async () => {
      const esp = ms => new Promise(r => setTimeout(r, ms));
      const mal = [];
      for(const [n, fn] of [['cobro', () => { openTableOrder(2, 901); openPaymentModal(901); }], ['caja', () => { openCashClosureModal(); }], ['espera', () => { openWaitlistModal(); }], ['notas', () => { openTableOrder(1, 900); openLineNotesModal(900, 0); }], ['cartas', () => { openCartasActivasModal(); }], ['comanda', () => { openTableOrder(1, 900); }]]){
        closeModal(); fn(); await esp(350);
        const box = document.getElementById('modal-box'); const cuerpo = box.querySelector('.modal-body'); const pie = box.querySelector('.modal-footer');
        const cs = getComputedStyle(cuerpo);
        const aire = box.classList.contains('modal-order') ? parseFloat(getComputedStyle(box.querySelector('.tp-or-col')).paddingBottom) : parseFloat(cs.paddingBottom);
        if(aire < 12) mal.push(`${n}: aire inferior ${aire}px`);
        const br = box.getBoundingClientRect();
        if(br.bottom > innerHeight + 1 || br.right > innerWidth + 1 || br.left < -1) mal.push(`${n}: la ventana se sale (${Math.round(br.bottom)}/${innerHeight})`);
        if(pie){
          const pr = pie.getBoundingClientRect();
          if(getComputedStyle(pie).borderTopWidth === '0px') mal.push(`${n}: el pie no se separa del cuerpo`);
          pie.querySelectorAll('button').forEach(b => { const q = b.getBoundingClientRect(); if(q.width && (q.right > innerWidth + 1 || q.left < -1 || q.bottom > innerHeight + 1)) mal.push(`${n}: botón «${b.textContent.trim().slice(0, 20)}» cortado (${Math.round(q.left)}-${Math.round(q.right)} de ${innerWidth})`); });
        }
        box.querySelectorAll('button,input,select,textarea').forEach(b => { const q = b.getBoundingClientRect(); if(q.width && q.right > br.right - 4) mal.push(`${n}: «${(b.textContent || b.id).trim().slice(0, 18)}» pega con el borde derecho (${Math.round(br.right - q.right)}px)`); });
      }
      closeModal();
      return mal;
    });
    assert.deepEqual(r, [], `${w}px: ` + r.join(' | '));
    await page.close();
  }
});

await caso('Para llevar: fichas con la hora y el total, pendientes de la web con Aceptar/Rechazar de 44 px o más, y el interruptor de pedidos online', async () => {
  const {page} = await abrir(390, 844);
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms));
    const out = {toggle: !!document.getElementById('tpv-online-toggle-btn'), tabs: document.querySelectorAll('.tp-togo-tabs .btn').length};
    out.pendiente = !!document.querySelector('.tp-ped.is-nuevo');
    const ac = document.querySelector('.tp-ped-botones .btn-fino.is-on'); out.alto = Math.round(ac.getBoundingClientRect().height); out.ancho = Math.round(document.querySelector('.tp-ped').getBoundingClientRect().width);
    setTogoTabManual('activos'); await esp(200);
    out.fichas = document.querySelectorAll('button.tp-ped').length; out.total = document.querySelector('.tp-ped-total')?.textContent.trim();
    return out;
  });
  assert.ok(r.toggle && r.tabs === 2 && r.pendiente, JSON.stringify(r)); assert.ok(r.alto >= 44, JSON.stringify(r)); assert.ok(r.ancho > 300, 'la ficha ocupa el ancho en móvil: ' + JSON.stringify(r));
  assert.equal(r.fichas, 1, JSON.stringify(r)); assert.match(r.total, /14,00/, JSON.stringify(r));
  await page.close();
});

await caso('Nada se desborda ni se corta en los siete anchos (320 a 1280): ni la página, ni las fichas, ni los textos', async () => {
  for(const [w, h] of ANCHOS){
    const {page} = await abrir(w, h);
    const r = await page.evaluate(() => {
      const mal = [];
      const sw = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      if(sw > 1) mal.push(`la página se desplaza ${sw}px de lado`);
      document.querySelectorAll('.tp-mesa,.tp-ped,.tp-cifra,.tp-acciones .btn,.tp-filtros .btn').forEach(e => {
        const q = e.getBoundingClientRect(); if(!q.width) return;
        if(q.right > innerWidth + 1 || q.left < -1) mal.push(`«${e.textContent.trim().replace(/\s+/g, ' ').slice(0, 24)}» sale de la pantalla`);
        e.querySelectorAll('*').forEach(h => { if(h.scrollWidth > h.clientWidth + 2 && h.clientWidth > 0 && getComputedStyle(h).overflowX !== 'visible' ) mal.push(`texto cortado en «${h.textContent.trim().slice(0, 20)}»`); });
      });
      document.querySelectorAll('.tp-mesa-nombre,.tp-ped-nom').forEach(e => { const rg = document.createRange(); rg.selectNodeContents(e); const f = [...rg.getClientRects()].length; if(e.textContent.trim().split(/\s+/).length === 1 && f > 1) mal.push(`palabra partida: ${e.textContent}`); });
      document.querySelectorAll('.tp-mesa *,.tp-ped *,.tp-cifra *').forEach(e => { const fs = parseFloat(getComputedStyle(e).fontSize); if(e.children.length === 0 && e.textContent.trim() && fs < 11) mal.push(`letra de ${fs}px en «${e.textContent.trim().slice(0, 16)}»`); });
      return mal;
    });
    assert.deepEqual(r, [], `${w}px: ` + r.join(' | '));
    await page.close();
  }
});

await caso('Ningún error de JavaScript en todo el recorrido', async () => {
  const {page, errs} = await abrir(1280, 800);
  await page.evaluate(async () => { openTableOrder(1, 900); await new Promise(r => setTimeout(r, 300)); closeModal(); renderTPV(); });
  assert.deepEqual(errs, [], errs.join(' | '));
  await page.close();
});

console.log('\n' + '═'.repeat(70));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ todos los casos pasaron');
await browser.close();
