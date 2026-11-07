// (copia de la semilla de tpv.mjs) TPV rehecho (1/11): franja corta, cartas en un botón, mesas como fichas con filtros, tomar nota con la comanda siempre
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


const hace = m => new Date(Date.now() - m*60000).toISOString();
await caso('Rondas: lo que se pide cuando la mesa ya pidió sale en un SEGUNDO bloque, y con una sola ronda no hay cabeceras', async () => {
  const {page} = await abrir(1280, 800);
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms));
    const vacia = (() => { openTableOrder(2, 901); return document.querySelectorAll('.tp-ronda').length; })();   // mesa con UNA ronda marchada
    await esp(300);
    // piden más: una línea nueva de comida sin marchar
    const o = DB.tpvOrders.find(x => x.id === 901);
    o.items.push({lineId:genId(), platoId:101, recipeId:null, name:'Patatas bravas', price:6.5, qty:1, tanda:'Entrantes', estado:null, marchada:0, bebida:false, notas:'', vale:1});
    if(!o.tandas.includes('Entrantes')) o.tandas.push('Entrantes');
    saveDB(); renderTableOrderModal(901); await esp(300);
    const rondas = [...document.querySelectorAll('.tp-ronda')].map(x => x.querySelector('.tp-ronda-tit').textContent.replace(/\s+/g,' ').trim());
    const nueva = document.querySelector('.tp-ronda.es-nueva');
    return {vacia, rondas, nuevaTiene: nueva ? nueva.querySelector('.tp-linea-nom')?.textContent : null, primera: document.querySelector('.tp-ronda:not(.es-nueva)')?.textContent.includes('Solomillo')};
  });
  assert.equal(r.vacia, 0, 'con una sola ronda no hay cabeceras: ' + JSON.stringify(r));
  assert.equal(r.rondas.length, 2, JSON.stringify(r)); assert.match(r.rondas[0], /Pedido 1/i); assert.match(r.rondas[1], /Añadido ahora/i);
  assert.equal(r.nuevaTiene, 'Patatas bravas', JSON.stringify(r)); assert.ok(r.primera, JSON.stringify(r));
  await page.close();
});

await caso('Cada línea del pedido va en UNA fila (cantidad, nombre, precio y ⋯) también en 360 px', async () => {
  for(const w of [1280, 360]){
    const {page} = await abrir(w, 760);
    const r = await page.evaluate(async () => {
      const esp = ms => new Promise(r => setTimeout(r, ms));
      openTableOrder(2, 901); await esp(400);
      const l = document.querySelector('.tp-linea'); const lr = l.getBoundingClientRect(); const medio = (lr.top + lr.bottom) / 2;
      const hijos = [...l.children].map(c => { const r = c.getBoundingClientRect(); return r.top <= medio + 1 && r.bottom >= medio - 1; });
      return {alto: Math.round(lr.height), tops: hijos, mas: !!l.querySelector('.tp-ac-mas'), botonesSueltos: l.querySelectorAll('.tp-linea-acc > .tp-ac:not(.tp-ac-mas)').length};
    });
    assert.ok(r.mas && r.botonesSueltos === 0, w + ': acciones en un ⋯: ' + JSON.stringify(r));
    assert.ok(r.tops.every(Boolean), w + ': todo en la misma fila (cada pieza cruza la línea media): ' + JSON.stringify(r));
    await page.close();
  }
});

await caso('El camarero sale BLOQUEADO (candado) para quien no es el propietario; el propietario puede reasignarlo', async () => {
  const {page} = await abrir(1280, 800);
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms));
    const emp = {id:77, name:'Lola Mesera', area:'sala', active:true, color:'#4A5D4E'}; DB.employees.push(emp);
    DB.tpvOrders.find(x => x.id === 901).camareroId = 77; saveDB();
    openTableOrder(2, 901); await esp(300);
    const chip = () => document.querySelector('.tp-chip-fijo');
    const dueno = {candado: !!chip()?.querySelector('.ti-lock'), pulsable: chip()?.classList.contains('badge-pulsable'), nombre: chip()?.textContent.trim()};
    document.body.classList.remove('owner-session'); setAccessSession({type:'employee', employeeId:77, area:'sala', ts:Date.now()});
    renderTableOrderModal(901); await esp(300);
    const emple = {candado: !!chip()?.querySelector('.ti-lock'), pulsable: chip()?.classList.contains('badge-pulsable')};
    return {dueno, emple};
  });
  assert.ok(r.dueno.candado && r.dueno.pulsable && /Lola/.test(r.dueno.nombre), JSON.stringify(r)); assert.ok(r.emple.candado && !r.emple.pulsable, 'un empleado no puede cambiarlo: ' + JSON.stringify(r));
  await page.close();
});

await caso('Alérgenos de la mesa: los 14 como botones, un toque los marca, y llegan a la comanda de cocina', async () => {
  const {page} = await abrir(1280, 800);
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms));
    openTableOrder(2, 901); await esp(300);
    promptTableAllergens(901); await esp(250);
    const botones = document.querySelectorAll('.tp-alg').length;
    const alto = Math.min(...[...document.querySelectorAll('.tp-alg')].map(b => b.getBoundingClientRect().height));
    [...document.querySelectorAll('.tp-alg')].find(b => b.dataset.a === 'Gluten').click();
    [...document.querySelectorAll('.tp-alg')].find(b => b.dataset.a === 'Huevos').click();
    document.getElementById('tpv-alg-nota').value = 'Celíaco';
    tpvAlgGuardar(901); await esp(300);
    const o = DB.tpvOrders.find(x => x.id === 901);
    const badge = [...document.querySelectorAll('.tp-or-chips .badge')].find(b => /Gluten/.test(b.textContent))?.textContent.trim();
    return {botones, alto: Math.round(alto), lista: o.tableAllergenList, texto: o.tableAllergens, badge, cocina: ticketAlergiaTextos(o).join(' | ')};
  });
  assert.equal(r.botones, 14, JSON.stringify(r)); assert.ok(r.alto >= 40, 'tamaño de dedo: ' + JSON.stringify(r));
  assert.deepEqual(r.lista, ['Gluten', 'Huevos'], JSON.stringify(r)); assert.match(r.texto, /Gluten.*Huevos.*Celíaco/, JSON.stringify(r));
  assert.ok(r.badge, 'la mesa lo enseña: ' + JSON.stringify(r)); assert.match(r.cocina, /Gluten/, 'y cocina lo recibe: ' + JSON.stringify(r));
  await page.close();
});

await caso('Ningún error de JavaScript', async () => { const {page, errs} = await abrir(1280, 800); await new Promise(r => setTimeout(r, 400)); assert.deepEqual(errs, []); await page.close(); });

console.log('\n' + '═'.repeat(70));
console.log(fallos ? `❌ ${fallos} casos fallaron` : '✅ casos pasaron');
await browser.close(); process.exit(fallos ? 1 : 0);
