// TPV · el menú se pide PASO A PASO (12/11, pedido del dueño: «como en la web de pedidos»): un apartado cada vez, elegir avanza solo
// (salvo si la opción lleva extras), «Atrás» corrige y el último botón añade con el total. Lo que se guarda es lo de siempre.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}
const w = ms => new Promise(r => setTimeout(r, ms));
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
async function sembrar(page){
  await page.evaluate(() => {
    DB.menus = [{id:7, nombre:'Menú del día', precio:15, grupos:[
      {id:71, nombre:'Primeros', opciones:[
        {id:711, nombre:'Ensalada', suplemento:0, disponible:true},
        {id:712, nombre:'Sopa de pescado', suplemento:1.5, disponible:true},
        {id:713, nombre:'Gazpacho', suplemento:0, disponible:false}]},
      {id:72, nombre:'Segundos', opciones:[
        {id:721, nombre:'Merluza', suplemento:0, disponible:true, modificadores:[{id:1, nombre:'Sin sal', precio:0}, {id:2, nombre:'Con alioli', precio:0.8}]},
        {id:722, nombre:'Entrecot', suplemento:3, disponible:true}]},
      {id:73, nombre:'Postres', opciones:[
        {id:731, nombre:'Flan', suplemento:0, disponible:true}]}]}];
    DB.tpvOrders.push({id:960, tableId:5, tipo:'mesa', status:'abierta', pax:2, items:[], tandas:[], createdAt:new Date().toISOString()});
    saveDB();
  });
}
const vis = page => page.evaluate(() => [...document.querySelectorAll('.tp-mp-g')].filter(f => !f.hidden).map(f => +f.dataset.step));
const txt = (page, id) => page.evaluate(i => (document.getElementById(i) || {}).innerText || '', id);
const pulsar = (page, g, o) => page.evaluate((g, o) => document.querySelector(`input[name="menu-grupo-${g}"][value="${o}"]`).click(), g, o);

for(const [ancho, alto] of [[1280, 900], [390, 800]]){
  const {page, errs} = await abrir(ancho, alto);
  await sembrar(page);
  const abrirMenu = async () => { await page.evaluate(() => openMenuConfigModal(960, 7)); await w(350); };

  await caso(`Se abre en el primer apartado: solo se ve «Primeros», sin nada marcado y con «Siguiente» apagado (${ancho}px)`, async () => {
    await abrirMenu();
    assert.deepEqual(await vis(page), [0]);
    assert.match(await txt(page, 'tp-mp-eye'), /Paso 1 de 3/i);
    assert.equal(await page.evaluate(() => document.querySelectorAll('.tp-mp-g[data-step="0"] input:checked').length), 0, 'nada preseleccionado en el primer apartado');
    assert.equal(await page.evaluate(() => document.getElementById('tp-mp-sig').disabled), true);
    assert.match(await txt(page, 'tp-mp-sig'), /Segundos/);
    assert.match(await txt(page, 'tp-mp-atras'), /Cancelar|Cancel/i);
    // la opción agotada no se puede elegir
    assert.equal(await page.evaluate(() => document.querySelector('input[value="713"]').disabled), true);
  });

  await caso(`Elegir una opción sin extras avanza solo al siguiente apartado y «Atrás» vuelve (${ancho}px)`, async () => {
    await pulsar(page, 71, 712); await w(600);
    assert.deepEqual(await vis(page), [1], 'avanza a Segundos');
    assert.match(await txt(page, 'tp-mp-eye'), /Paso 2 de 3/i);
    assert.match(await txt(page, 'tp-mp-atras'), /Atrás|Back|Enrere/i);
    await page.evaluate(() => tpvMenuAtras(960)); await w(200);
    assert.deepEqual(await vis(page), [0]);
    assert.equal(await page.evaluate(() => document.querySelector('input[value="712"]').checked), true, 'lo elegido se conserva');
    await page.evaluate(() => tpvMenuIr(1)); await w(200);
  });

  await caso(`Una opción CON extras NO avanza sola: se ven los extras y manda «Siguiente»; el total suma suplementos y extras (${ancho}px)`, async () => {
    await pulsar(page, 72, 721); await w(600);
    assert.deepEqual(await vis(page), [1], 'se queda para marcar extras');
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.menu-extras-72-721')).display), 'block');
    await page.evaluate(() => document.querySelector('.menu-mod-72[data-mod-id="2"]').click()); await w(150);
    await page.evaluate(() => tpvMenuSiguiente()); await w(250);
    assert.deepEqual(await vis(page), [2]);
    // 15 base + 1,5 (sopa) + 0,8 (alioli) = 17,30
    const boton = await txt(page, 'tp-mp-sig');
    assert.ok(/17[,.]30/.test(boton), 'el botón final lleva el total con suplementos y extras: ' + boton);
    assert.equal(await page.evaluate(() => document.querySelector('input[value="731"]').checked), true, 'con una sola opción disponible va marcada');
    assert.equal(await page.evaluate(() => document.getElementById('tp-mp-sig').disabled), false);
  });

  await caso(`Cambiar de opción en un apartado desmarca los extras de la anterior (${ancho}px)`, async () => {
    await page.evaluate(() => tpvMenuIr(1)); await w(200);
    await pulsar(page, 72, 722); await w(600);
    assert.equal(await page.evaluate(() => document.querySelector('.menu-mod-72[data-mod-id="2"]').checked), false);
    await page.evaluate(() => tpvMenuIr(1)); await pulsar(page, 72, 721); await w(150);
    await page.evaluate(() => { document.querySelector('.menu-mod-72[data-mod-id="2"]').click(); tpvMenuIr(2); }); await w(200);
  });

  await caso(`Al pulsar «Añadir» se guarda el menú de siempre: una línea por apartado, mismo menuInstanceId, precio con suplementos y extras (${ancho}px)`, async () => {
    await page.evaluate(() => document.getElementById('tp-mp-sig').click()); await w(500);
    const r = await page.evaluate(() => { const o = DB.tpvOrders.find(x => x.id === 960); return {n: o.items.length, nombres: o.items.map(l => l.name), inst: new Set(o.items.map(l => l.menuInstanceId)).size, total: o.items.reduce((s, l) => s + l.price * l.qty, 0), tandas: o.tandas}; });
    assert.equal(r.n, 3, JSON.stringify(r)); assert.equal(r.inst, 1);
    assert.deepEqual(r.nombres.map(x => x.replace(/ \(.*\)/, '')), ['Sopa de pescado', 'Merluza', 'Flan']);
    assert.ok(Math.abs(r.total - 17.3) < 0.005, 'total 17,30: ' + r.total);
    assert.deepEqual(r.tandas, ['Primeros', 'Segundos', 'Postres']);
  });

  await caso(`«Cancelar» en el primer apartado vuelve a la mesa sin añadir nada (${ancho}px)`, async () => {
    await page.evaluate(() => { DB.tpvOrders.find(x => x.id === 960).items = []; openMenuConfigModal(960, 7); }); await w(300);
    await page.evaluate(() => document.getElementById('tp-mp-atras').click()); await w(400);
    assert.equal(await page.evaluate(() => DB.tpvOrders.find(x => x.id === 960).items.length), 0);
    assert.ok(await page.evaluate(() => !!document.getElementById('table-order-modal-marker')), 'vuelve a la comanda de la mesa');
  });

  await caso(`Volver de la ficha de un plato (i) conserva lo elegido y el apartado (${ancho}px)`, async () => {
    await page.evaluate(() => openMenuConfigModal(960, 7)); await w(300);
    await pulsar(page, 71, 711); await w(600);
    await page.evaluate(() => openMenuConfigModal(960, 7, true)); await w(300);
    assert.deepEqual(await vis(page), [1], 'sigue en Segundos');
    assert.equal(await page.evaluate(() => document.querySelector('input[value="711"]').checked), true);
  });

  await caso(`Se ve bien: nada se desborda y las filas se tocan con el dedo (≥44 px) (${ancho}px)`, async () => {
    await page.evaluate(() => { openMenuConfigModal(960, 7); }); await w(300);
    const m = await page.evaluate(() => { const b = document.getElementById('modal-box'); const f = [...document.querySelectorAll('.tp-mp-g:not([hidden]) .tp-mp-opt')].map(x => x.getBoundingClientRect().height);
      return {desborda: b.scrollWidth > b.clientWidth + 1, minAlto: Math.min(...f), n: f.length}; });
    assert.equal(m.desborda, false, 'desborda a lo ancho');
    assert.ok(m.minAlto >= 44, 'filas de ' + m.minAlto + ' px');
  });

  await caso(`Sin errores de JavaScript (${ancho}px)`, async () => { assert.deepEqual(errs, []); });
  await page.close();
}
await browser.close();
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ el menú por pasos del TPV funciona');
process.exit(fallos ? 1 : 0);
