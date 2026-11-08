// Reservas · ajustes del 8/11: un solo «Nueva reserva» en el día vacío, horas de cuarto en cuarto con margen de cierre configurable, acciones sueltas en PC/tablet y «⋯» solo en móvil, semana compacta. (Base de pruebas: TPV rehecho 1/11): franja corta, cartas en un botón, mesas como fichas con filtros, tomar nota con la comanda siempre
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



const esperar = ms => new Promise(r => setTimeout(r, ms));
const irReservas = (page, n) => page.evaluate(n => {
  DB.reservations = [];
  for(let i=0;i<n;i++) DB.reservations.push({id:6000+i, date:todayStr(), time:`13:${String(15*i%60).padStart(2,'0')}`, people:2, tableId:1+i, clientName:'Cliente con un nombre bastante largo '+i, clientId:null, status:'confirmada', notes:''});
  saveDB(); currentFolder='sala'; navigate('reservas'); reservasDate = todayStr(); reservasTab = 'dia'; renderReservas();
}, n);

await caso('Día sin reservas: un solo botón «Nueva reserva»', async () => {
  const {page, errs} = await abrir(1280, 800);
  await irReservas(page, 0); await esperar(400);
  const n = await page.evaluate(() => [...document.querySelectorAll('#reservas-tab-content button')].filter(b => /nueva reserva/i.test(b.innerText)).length);
  assert.equal(n, 1);
  assert.deepEqual(errs, []); await page.close();
});

await caso('Horas de cuarto en cuarto; la última reserva respeta el margen de cierre configurable (30 por defecto, 0 = hasta el cierre)', async () => {
  const {page, errs} = await abrir(1280, 800);
  const r = await page.evaluate(() => {
    getTurnosForDate = () => [{abre:'13:00', cierra:'16:00'}];
    const ult = () => { const s = getReservationTimeSlots(todayStr()); return {n:s.length, primera:s[0], segunda:s[1], ultima:s[s.length-1]}; };
    delete DB.business.reservaMargenCierreMin; const a = ult();
    DB.business.reservaMargenCierreMin = 0; const b = ult();
    DB.business.reservaMargenCierreMin = 60; const c = ult();
    DB.business.reservaMargenCierreMin = ''; const d = ult();
    return {a, b, c, d, pub: CAMPOS_PUBLICOS_DEL_NEGOCIO.includes('reservaMargenCierreMin') && CAMPOS_PUBLICOS_DEL_NEGOCIO.includes('reservaDuracionMin')};
  });
  assert.deepEqual(r.a, {n:11, primera:'13:00', segunda:'13:15', ultima:'15:30'});
  assert.equal(r.b.ultima, '16:00'); assert.equal(r.c.ultima, '15:00'); assert.equal(r.d.ultima, '15:30');
  assert.ok(r.pub, 'la web pública recibe el margen y la duración de mesa');
  // el campo existe en Mi Negocio
  await page.evaluate(() => { currentFolder='gestion'; navigate('minegocio'); });
  await esperar(800);
  assert.ok(await page.evaluate(() => !!document.getElementById('mn-reserva-margen-cierre')), 'campo en Mi Negocio');
  assert.deepEqual(errs, []); await page.close();
});

await caso('PC y tablet: las acciones de la reserva van sueltas, sin «⋯»; en móvil, el «⋯»', async () => {
  for(const [w, h, sueltas] of [[1280, 800, true], [820, 1000, true], [390, 844, false]]){
    const {page, errs} = await abrir(w, h);
    await irReservas(page, 2); await esperar(400);
    const v = await page.evaluate(() => { const vis = e => !!e && getComputedStyle(e).display !== 'none' && e.offsetWidth > 0; const f = document.querySelector('.rv-fila'); return {s: vis(f.querySelector('.rv-acc-sueltas')), m: vis(f.querySelector('.rv-acc-menu')), tips: [...f.querySelectorAll('.rv-acc-sueltas button')].every(b => b.dataset.tip && b.getAttribute('aria-label')), n: f.querySelectorAll('.rv-acc-sueltas button').length}; });
    assert.equal(v.s, sueltas, w + ' sueltas'); assert.equal(v.m, !sueltas, w + ' menú');
    assert.ok(v.tips && v.n >= 2, w + ' rótulos');
    assert.deepEqual(errs, []); await page.close();
  }
});

await caso('Semana con muchas reservas: chips de una línea, tope de 6 y «Ver las N restantes»', async () => {
  const {page, errs} = await abrir(1280, 800);
  await irReservas(page, 14); await esperar(300);
  await page.evaluate(() => { setReservasTab('semana'); });
  await esperar(400);
  const v = await page.evaluate(() => { const hoy = document.querySelector('.pm-sem-dia.is-hoy'); const chips = [...hoy.querySelectorAll('.rv-chip:not(.rv-chip-mas)')]; return {n: chips.length, mas: hoy.querySelector('.rv-chip-mas')?.innerText, alturas: [...new Set(chips.map(c => Math.round(c.getBoundingClientRect().height)))], sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth}; });
  assert.equal(v.n, 6); assert.match(v.mas, /8/); assert.equal(v.alturas.length, 1, 'todas las líneas miden lo mismo: ' + v.alturas);
  assert.ok(v.sw <= v.cw);
  assert.deepEqual(errs, []); await page.close();
});

await browser.close();
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ casos pasaron');
process.exit(fallos ? 1 : 0);
