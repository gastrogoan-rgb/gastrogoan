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


const pedidoDelivery = (page, id, extra) => page.evaluate((id, extra) => {
  const L = (n, p, q, notas) => ({lineId:genId(), platoId:null, recipeId:null, name:n, price:p, qty:q, tanda:'Principales', estado:'cocina', marchada:q, bebida:false, notas:notas||'', vale:1});
  DB.tpvOrders = DB.tpvOrders.filter(o => o.id !== id);
  DB.tpvOrders.push(Object.assign({id, tableId:null, tipo:'delivery', status:'abierta', origenOnline:true, clientRef:'ABCDEF123456', clienteNombre:'Marta Ruiz', clienteDireccion:'Carrer Gran 12, 2n', clienteCodigoPostal:'08500', clienteTelefono:'600111222',
    items:[L('Hamburguesa de ternera',14,2,'Sin cebolla'), L('Patatas bravas',6.5,1), L('Croquetas',9.5,1), L('Ensalada',8,1), L('Tarta de queso',7,1), L('Flan',5,1)], tandas:['Principales'], createdAt:new Date().toISOString(), valeActual:1, notas:'Llamar al llegar'}, extra||{}));
  saveDB();
}, id, extra);

await caso('Delivery: la ficha enseña lo pedido (con notas y «+N más»), la dirección y las notas del cliente', async () => {
  const {page} = await abrir(1280, 800);
  await pedidoDelivery(page, 3001);
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms));
    setTogoTabManual('activos'); renderTPV(); await esp(300);
    const f = [...document.querySelectorAll('.tp-ped')].find(x => (x.getAttribute('onclick') || '').includes('3001'));
    return {txt: f ? f.innerText.replace(/\s+/g,' ') : null};
  });
  assert.ok(r.txt, JSON.stringify(r)); assert.match(r.txt, /2×\s*Hamburguesa/i, r.txt); assert.match(r.txt, /Sin cebolla/); assert.match(r.txt, /\+1 más/i, 'seis líneas: se ven cinco y «+1 más»: ' + r.txt); assert.match(r.txt, /Carrer Gran 12/); assert.match(r.txt, /Llamar al llegar/);
  await page.close();
});

await caso('Delivery: el pedido abre en «Pedido» (lo pedido arriba, sin la tarjeta del reparto encima) y el reparto vive en su pestaña', async () => {
  const {page} = await abrir(1280, 800);
  await pedidoDelivery(page, 3002);
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms));
    openTableOrder(null, 3002); await esp(400);
    const vis = s => { const e = document.querySelector(s); return !!e && e.offsetParent !== null && e.getBoundingClientRect().height > 0; };
    const out = {pest: [...document.querySelectorAll('.tp-or-pestana')].map(b => b.textContent.replace(/\s+/g,' ').trim()), pedido: vis('.tp-or-comanda'), reparto: vis('.tp-or-repartocol'), primeraLinea: Math.round(document.querySelector('.tp-linea')?.getBoundingClientRect().top || 0)};
    document.querySelector('.tp-or-pest-reparto').click(); await esp(300);
    out.reparto2 = vis('.tp-or-repartocol'); out.boton = !![...document.querySelectorAll('.tp-or-repartocol button')].find(b => /entregado/i.test(b.textContent));
    return out;
  });
  assert.ok(r.pedido && !r.reparto, JSON.stringify(r)); assert.ok(r.pest.length === 2 && /Reparto/.test(r.pest[1]), 'un pedido de la web no se toma: Pedido + Reparto: ' + JSON.stringify(r)); assert.ok(r.primeraLinea < 420, 'lo pedido se ve sin bajar: ' + JSON.stringify(r));
  assert.ok(r.reparto2 && r.boton, JSON.stringify(r));
  await page.close();
});

await caso('Control de repartos: asignar repartidor, ruta agrupada, entregado pasa al historial, y pagado online cierra la venta solo', async () => {
  const {page} = await abrir(1280, 800);
  await pedidoDelivery(page, 3003); await pedidoDelivery(page, 3004, {clienteNombre:'Pau Soler', clienteDireccion:'Carrer Petit 3'}); await pedidoDelivery(page, 3005, {clienteNombre:'Online Pagado', pagado:true, pagoImporte:64, pagoFecha:new Date().toISOString(), metodoPagoLocal:'tarjeta'});
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms));
    DB.employees.push({id:88, name:'Rider Rafa', area:'sala', active:true, color:'#4A5D4E', esRepartidor:true});
    assignRepartidorForOrder(3003, 'emp:88'); assignRepartidorForOrder(3004, 'emp:88'); await esp(200);
    openRepartosControlModal(); await esp(300);
    const cuerpo = document.getElementById('repartos-control-modal-body').innerText.replace(/\s+/g,' ');
    const out = {enCurso: /3|En curso/i.test(cuerpo), ruta: /ruta|route/i.test(cuerpo), rider: /Rider Rafa/.test(cuerpo)};
    closeModal();
    markRepartoEntregado(3003); await esp(200);
    out.entregado = DB.tpvOrders.find(o => o.id === 3003).entregaEstado;
    const antesVentas = DB.sales.length;
    markRepartoEntregado(3005); await esp(400);
    out.ventaOnline = DB.sales.length - antesVentas; out.estado3005 = DB.tpvOrders.find(o => o.id === 3005)?.status;
    openRepartosControlModal(); await esp(300);
    out.historial = /Marta Ruiz/.test(document.getElementById('repartos-control-modal-body').innerText);
    return out;
  });
  assert.ok(r.ruta && r.rider, JSON.stringify(r)); assert.equal(r.entregado, 'entregado', JSON.stringify(r)); assert.ok(r.historial, JSON.stringify(r));
  assert.equal(r.ventaOnline, 1, 'pagado online: entregar = cerrar y apuntar la venta: ' + JSON.stringify(r)); assert.equal(r.estado3005, 'pagada');
  await page.close();
});
await caso('Ningún error de JavaScript', async () => { const {page, errs} = await abrir(1280, 800); await new Promise(r => setTimeout(r, 400)); assert.deepEqual(errs, []); await page.close(); });
console.log('\n' + '═'.repeat(70));
console.log(fallos ? `❌ ${fallos} casos fallaron` : '✅ casos pasaron');
await browser.close(); process.exit(fallos ? 1 : 0);
