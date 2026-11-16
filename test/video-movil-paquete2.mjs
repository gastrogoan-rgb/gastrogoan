// Vídeo de la app en un móvil real (paquete 2: TPV, Comandas Cocina, Reservas, Promoción, Clientes).
// Cada caso reproduce un fallo visto en el vídeo a 320-430 px con datos feos (nombres largos, mesas abiertas hace días).
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const PORT = process.env.PUERTO || 8950;
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}
async function abrir(w, sembrar){
  const page = await browser.newPage();
  await page.setViewport({width:w, height:740, isMobile:w < 500, hasTouch:true});
  page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
  await page.goto(`http://localhost:${PORT}/dist/index.html`, {waitUntil:'domcontentloaded'});
  await page.evaluate(() => {
    localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'VIDEOM2TEST', tenantId: ggBizTenantId('VIDEOM2TEST')}));
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
    applyOwnerSessionEditRights(); document.body.classList.add('owner-session'); areaUnlocked.cocina = areaUnlocked.sala = areaUnlocked.gestion = true;
  });
  await page.evaluate(sembrar);
  await new Promise(r => setTimeout(r, 600));
  return page;
}
const sembrarTpv = () => {
  DB.tables.length = 0; DB.tpvOrders.length = 0; DB.cartas.length = 0; DB.sales.length = 0;
  ['Interior','Interior','Interior','exterior','Barra'].forEach((zona, i) => DB.tables.push({id:i+1, name:`Mesa ${i+1}`, zona, plazas:4}));
  DB.cartas.push({id:1, nombre:'Carta principal', secciones:[{id:10, nombre:'Entrantes', icono:'ic:none', platos:[{id:100, nombre:'Patatas GG con salsa de la casa', precio:6.5, disponible:true, alergenos:''}]}]},
    {id:2, nombre:'Bebidas y cócteles', tipo:'bebida', secciones:[]});
  DB.activeCartaIds = [1, 2];
  const L = (n, p, q) => ({lineId:genId(), platoId:100, name:n, price:p, qty:q, tanda:'Entrantes', estado:'entregado', marchada:q, notas:''});
  const hace = m => new Date(Date.now() - m*60000).toISOString();
  DB.tpvOrders.push({id:900, tableId:1, tipo:'mesa', status:'abierta', pax:2, items:[L('Patatas', 6.5, 1)], tandas:['Entrantes'], createdAt:hace(3703)});
  DB.tpvOrders.push({id:901, tableId:2, tipo:'mesa', status:'abierta', pax:3, items:[L('Patatas', 6.5, 2)], tandas:['Entrantes'], createdAt:hace(1665)});
  DB.tpvOrders.push({id:960, tableId:5, tipo:'mesa', status:'abierta', pax:2, items:[], tandas:[], clienteNombre:'Marta Puig Fernández de la Torre', openedByOwner:true, createdAt:hace(2)});
  saveDB(); currentFolder = 'sala'; navigate('tpv');
};

for(const w of [320, 360, 390, 412, 430]){
  await caso(`TPV ${w}: la cabecera de la comanda (con «Liberar mesa») no aplasta el nombre ni solapa botones, y mide poco`, async () => {
    const page = await abrir(w, sembrarTpv);
    const r = await page.evaluate(() => {
      renderTPV(); openTableOrder(5, 960);
      const cab = document.querySelector('.tp-or-cab');
      const hijos = [...cab.children].map(e => { const b = e.getBoundingClientRect(); return {n:(e.className || e.tagName).toString().slice(0, 24), l:b.left, r:b.right, t:b.top, b:b.bottom, w:b.width}; }).filter(x => x.w > 0);
      let solapes = [];
      for(let i = 0; i < hijos.length; i++) for(let j = i + 1; j < hijos.length; j++){
        const a = hijos[i], c = hijos[j];
        if(a.l < c.r - 1 && c.l < a.r - 1 && a.t < c.b - 1 && c.t < a.b - 1) solapes.push(a.n + ' x ' + c.n);
      }
      return {mesaW: cab.querySelector('.tp-or-mesa').getBoundingClientRect().width, alto: cab.getBoundingClientRect().height, solapes, liberar: !!cab.querySelector('.tp-or-acc')};
    });
    await page.close();
    assert.ok(r.liberar, 'la mesa vacía debe llevar «Liberar mesa»');
    assert.ok(r.mesaW > w * 0.5, 'el nombre se aplasta (' + r.mesaW + ' px): ' + JSON.stringify(r));
    assert.deepEqual(r.solapes, [], 'se solapan: ' + r.solapes.join(', '));
    assert.ok(r.alto < 150, 'la cabecera ocupa ' + r.alto + ' px');
  });
}

await caso('Tiempos: ninguna ficha de mesa pinta minutos crudos y «Mesa N» no se parte (360)', async () => {
  const page = await abrir(360, sembrarTpv);
  const r = await page.evaluate(() => ({
    tiempos: [...document.querySelectorAll('.tp-mesa-tiempo')].map(e => e.textContent.trim()),
    partidos: [...document.querySelectorAll('.tp-mesa-nombre')].filter(e => e.getClientRects().length > 1 || e.getBoundingClientRect().height > 30).map(e => e.textContent),
    f: [fmtDurMin(45), fmtDurMin(65), fmtDurMin(200), fmtDurMin(1665), fmtDurMin(999999)],
  }));
  await page.close();
  assert.deepEqual(r.f, ['45 min', '1 h 05', '3 h 20', '1 d', '+30 d']);
  assert.ok(r.tiempos.every(x => !/\d{3,}'/.test(x)), 'minutos crudos: ' + r.tiempos.join(' | '));
  assert.deepEqual(r.partidos, [], 'nombre partido: ' + r.partidos.join(','));
});

await caso('Comandas Cocina 360 y 320: una columna a ancho completo, sin carrusel ni scroll interno, y minutos legibles', async () => {
  for(const w of [360, 320]){
    const page = await abrir(w, () => {
      DB.tables = [{id:1, name:'Mesa 1', zona:'Salón'}];
      DB.cartas = [{id:1, nombre:'Carta principal', activa:true, secciones:[{id:11, nombre:'Entrantes', platos:[{id:111, nombre:'Croquetas de jamón ibérico', allergensManual:['Gluten']}]}]}];
      const hace = m => new Date(Date.now() - m*60000).toISOString();
      const L = (n, id, ex) => Object.assign({platoId:id, name:n, price:9, qty:1, tanda:'Entrantes', notas:'', estado:'cocina', enviadoAt:hace(680), bebida:false, modificadores:[], vale:1}, ex || {});
      DB.tpvOrders = [
        {id:901, tableId:1, tipo:'mesa', pax:2, status:'abierta', createdAt:hace(690), valeActual:1, items:[L('Croquetas de jamón ibérico', 111)]},
        {id:902, tableId:1, tipo:'mesa', pax:2, status:'abierta', cerrada:true, createdAt:hace(100), valeActual:1, items:[L('Croquetas de jamón ibérico', 111, {estado:'entregado', entregadoAt:hace(3), recogidoAt:hace(2)})]},
        {id:903, tableId:1, tipo:'mesa', pax:2, status:'abierta', createdAt:hace(5), valeActual:1, items:[L('Croquetas de jamón ibérico', 111, {enviadoAt:hace(5)})]},
      ];
      saveDB(); currentFolder = 'cocina'; chaosCocina = false; navigate('comandascocina');
    });
    for(const tab of ['activas', 'cerradas']){
      await page.evaluate(t => setComandasCocinaTab(t), tab); await new Promise(r => setTimeout(r, 300));
      const r = await page.evaluate(() => {
        const g = document.querySelector('.grid-kds, .cz-grid');
        const kt = [...document.querySelectorAll('.kt')];
        return {doc: document.documentElement.scrollWidth, gridDesborda: g ? g.scrollWidth > g.clientWidth + 1 : false, n: kt.length,
          izq: kt.map(k => Math.round(k.getBoundingClientRect().left)), ancho: kt.map(k => Math.round(k.getBoundingClientRect().width)),
          interno: kt.some(k => k.scrollHeight > k.clientHeight + 1), tm: [...document.querySelectorAll('.kt-tm')].map(e => e.textContent)};
      });
      assert.ok(r.n >= 1, tab + ': sin tickets');
      assert.ok(r.doc <= w, `${w} ${tab}: la página se arrastra de lado (${r.doc})`);
      assert.ok(!r.gridDesborda, `${w} ${tab}: carrusel horizontal`);
      assert.ok(new Set(r.izq).size === 1 && r.ancho.every(a => a >= w - 24), `${w} ${tab}: no son una columna a ancho completo ${JSON.stringify(r)}`);
      assert.ok(!r.interno, `${w} ${tab}: ticket con scroll interno`);
      assert.ok(!r.tm.some(x => /\d{3,}'/.test(x)), `${w} ${tab}: minutos crudos ${r.tm}`);
    }
    await page.close();
  }
});

const sembrarRes = () => {
  Object.assign(DB.business, {name:'Bar Marina', aforo:'40'});
  const hoy = todayStr();
  DB.tables = [{id:1, name:'Mesa 1', plazas:4}];
  DB.clients = [{id:1, name:'María López Fernández', phone:'612345678', visits:10}];
  DB.reservations = [{id:1, clientId:1, date:hoy, time:'13:30', people:4, status:'confirmada', tableId:1}];
  DB.clients.push(...Array.from({length:8}, (_, i) => ({id:10 + i, name:'Cliente ' + i, phone:'61200000' + i, consentMarketing:true})));
  currentFolder = 'sala';
};
for(const w of [320, 360, 430]){
  await caso(`Reservas ${w}: el contador del mes no tapa el número del día, y «Nueva Reserva» no deja medio ancho vacío`, async () => {
    const page = await abrir(w, sembrarRes);
    const r = await page.evaluate(() => {
      currentFolder = 'sala'; reservasTab = 'mes'; reservasFiltro = ''; reservasDate = todayStr(); navigate('reservas'); renderReservas();
      const dia = document.querySelector('.pm-mes-dia.tiene');
      const n = dia.querySelector('.pm-mes-n').getBoundingClientRect(), b = dia.querySelector('b').getBoundingClientRect();
      const nuevo = document.querySelector('.pm-barra > .btn');
      const barra = document.querySelector('.pm-barra').getBoundingClientRect();
      return {solapa: n.left < b.right && b.left < n.right && n.top < b.bottom && b.top < n.bottom, nuevoW: nuevo.getBoundingClientRect().width, barraW: barra.width};
    });
    await page.close();
    assert.ok(!r.solapa, 'el contador tapa el número del día');
    assert.ok(r.nuevoW >= r.barraW * 0.85 || r.nuevoW < r.barraW * 0.5, 'botón a medias: ' + JSON.stringify(r));
  });
}

await caso('Promoción 360: las seis pestañas en ≤ 2 filas', async () => {
  const page = await abrir(360, sembrarRes);
  const filas = await page.evaluate(() => { currentFolder = 'sala'; navigate('promocion'); return new Set([...document.querySelectorAll('#promo-tabs-row .btn')].map(b => Math.round(b.getBoundingClientRect().top / 20))).size; });
  await page.close();
  assert.ok(filas <= 2, 'pestañas en ' + filas + ' filas');
});

await caso('Clientes 360: filtros en ≤ 4 filas, buscador y orden en una fila, sin desborde, fechas y plurales legibles', async () => {
  const page = await abrir(360, sembrarRes);
  const r = await page.evaluate(() => {
    currentFolder = 'sala'; navigate('clientes');
    const filas = new Set([...document.querySelectorAll('#clientes-content .cl-chips .btn')].map(b => Math.round(b.getBoundingClientRect().top))).size;
    const s = document.getElementById('clientes-search').getBoundingClientRect(), o = document.getElementById('clientes-orden').getBoundingClientRect();
    return {filas, mismaFila: Math.abs(s.top - o.top) < 8, doc: document.documentElement.scrollWidth,
      f: [fechaLegibleCorta('2026-11-10'), fechaLegibleCorta('texto')]};
  });
  await page.close();
  assert.ok(r.filas <= 4, 'filtros en ' + r.filas + ' filas');
  assert.ok(r.mismaFila, 'buscador y orden en filas distintas');
  assert.ok(r.doc <= 360);
  assert.ok(!/2026-11-10/.test(r.f[0]) && /10/.test(r.f[0]) && r.f[1] === 'texto', JSON.stringify(r.f));
});

await caso('Calendario de pedidos del TPV 360: fechas legibles y «MAR» entero en la semana', async () => {
  const page = await abrir(360, sembrarTpv);
  const r = await page.evaluate(() => {
    openTogoCalendarModal(); setTogoCalMode('semana');
    const lab = document.querySelector('.tg-label').textContent;
    const cortados = [...document.querySelectorAll('.tg-dow')].filter(e => e.scrollWidth > e.clientWidth + 1).length;
    setTogoCalMode('dia');
    return {lab, cortados, dia: document.querySelector('.tg-label').textContent};
  });
  await page.close();
  assert.ok(!/\d{4}-\d{2}-\d{2}/.test(r.lab + r.dia), 'fecha ISO: ' + JSON.stringify(r));
  assert.equal(r.cortados, 0);
});

console.log('\n' + '═'.repeat(68));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
