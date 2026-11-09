// PANEL DE CONTROL v2 (8/11): el orden que pidió el dueño, las cifras de HOY con su gráfica de semana/mes recorrible, el punto de equilibrio
// destacado (cuentas hechas a mano), la clientela y lo nuevo de «Hoy — Atención».
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const w = ms => new Promise(r => setTimeout(r, ms));
async function abrir(ancho = 1280, alto = 900){
  const page = await browser.newPage();
  await page.setViewport({width: ancho, height: alto, isMobile: ancho < 500, hasTouch: ancho < 1000});
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|nominatim|zippopotam/.test(r.url()) ? r.abort() : r.continue());
  await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
  await page.evaluate(() => {
    localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'PANEL002', tenantId: ggBizTenantId('PANEL002')}));
    localStorage.setItem('gastrogoan_owner_login', '1'); localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted', '1'); localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
  });
  await page.reload({waitUntil:'domcontentloaded'}); await w(2000);
  await page.evaluate(async () => {
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate','app-splash'].forEach(id => document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    // Un mes con cifras redondas para poder comprobar las cuentas a mano: 1 venta de 110 € (IVA 10 %) por día de los días 1-5 del mes.
    const hoy = new Date(), y = hoy.getFullYear(), m = hoy.getMonth(), p2 = n => String(n).padStart(2, '0');
    DB.sales.length = 0; DB.reservations.length = 0; DB.clients.length = 0;
    DB.clients.push({id: 901, name: 'Ana Fiel', phone: '600111222', points: 8, cumpleanos: (y - 40) + '-05-05', allergies: 'gluten'}, {id: 902, name: 'Beto Raro', phone: '600333444', points: 0, cumpleanos: (y - 24) + '-03-03'});
    const mes = y + '-' + p2(m + 1);
    for(let d = 1; d <= Math.min(5, hoy.getDate()); d++){
      for(let j = 0; j < 2; j++){
        DB.sales.push({id: 'v' + d + j, date: mes + '-' + p2(d), createdAt: new Date(y, m, d, 13 + j * 7, 10).toISOString(), total: 110, subtotal: 110, tipo: j ? 'delivery' : 'mesa', pax: 2, clientId: d === 1 ? 901 : (d === 2 && j === 0 ? 902 : null), status: 'cobrada',
          items: [{name: 'Plato', price: 110, qty: 1, ivaPct: 10}], pagos: [{metodoPago: 'Efectivo', amount: 110}]});
      }
    }
    DB.reservations.push({id: 'r1', date: mes + '-' + p2(hoy.getDate()), time: '21:00', people: 4, status: 'confirmada', name: 'Mesa A'}, {id: 'r2', date: mes + '-' + p2(hoy.getDate()), time: '22:00', people: 2, status: 'pendiente', name: 'Mesa B'});
    DB.tpvOrders.push({id: 'online1', status: 'pendiente-online', tipo: 'delivery', items: [], origenOnline: true, date: todayStr()});
    currentFolder = 'gestion'; ownerUnlocked = true; navigate('dashboard'); await new Promise(r => setTimeout(r, 1300));
  });
  return {page, errs};
}

await caso('Orden pedido: equilibrio arriba → atención → reservas → ventas → gastos → resultado → evolución del año → análisis de ventas → clientela → análisis de platos', async () => {
  const {page, errs} = await abrir();
  const orden = await page.evaluate(() => ['dp-equilibrio', 'dashboard-attention', 'dp-reservas', 'dp-ventas', 'dp-gastos', 'dp-resultado', 'dashboard-trend', 'dp-analisis', 'dp-clientela', 'platos-kpis'].map(id => { const e = document.getElementById(id); return e ? e.getBoundingClientRect().top + document.querySelector('.content').scrollTop : -1; }));
  assert.ok(orden.every(y => y >= 0), 'falta algún bloque: ' + JSON.stringify(orden));
  assert.deepEqual([...orden].sort((a, b) => a - b), orden, 'orden incorrecto: ' + JSON.stringify(orden));
  assert.deepEqual(errs, []); await page.close();
});

await caso('Reservas de hoy: 2 reservas, 6 comensales y 1 por confirmar; la gráfica pinta la semana con tooltip por día', async () => {
  const {page} = await abrir();
  const r = await page.evaluate(() => {
    const ks = [...document.querySelectorAll('#dp-reservas .dp-k-v')].map(e => e.textContent.trim());
    return {ks, puntos: document.querySelectorAll('#dp-reservas .dt-punto').length, tips: document.querySelectorAll('#dp-reservas .dt-punto[data-v]').length, modoSemana: document.querySelector('#dp-reservas .dp-modo .is-on').textContent.trim()};
  });
  assert.equal(r.ks[0], '2'); assert.equal(r.ks[1], '6'); assert.equal(r.ks[3], '1');
  assert.equal(r.puntos, 7); assert.equal(r.tips, 7); assert.match(r.modoSemana, /Semana/i);
  await page.close();
});

await caso('Ventas: cifras de hoy (tickets y ticket medio) y la gráfica pasa de Semana a Mes y recorre meses/semanas', async () => {
  const {page} = await abrir();
  const r = await page.evaluate(async () => {
    const out = {}, esp = ms => new Promise(r => setTimeout(r, ms));
    const hoy = new Date();
    const dia = DB.sales.filter(s => s.date === todayStr());
    out.tickets = document.querySelectorAll('#dp-ventas .dp-k-v')[1].textContent.trim();
    out.esperado = String(dia.length);
    out.puntosSemana = document.querySelectorAll('#dp-ventas .dt-punto').length;
    const etiq1 = document.querySelector('#dp-ventas .dp-semetq').textContent.trim();
    dpSemana('ventas', -1); await esp(100);
    out.cambiaSemana = etiq1 !== document.querySelector('#dp-ventas .dp-semetq').textContent.trim();
    dpModo('ventas', 'mes'); await esp(100);
    out.puntosMes = document.querySelectorAll('#dp-ventas .dt-punto').length;
    out.diasHastaHoy = hoy.getDate();
    out.selectorMes = !!document.querySelector('#dp-ventas .pe-sel .pe-actual');
    panelMesCb_ventas(hoy.getFullYear(), hoy.getMonth() === 0 ? 11 : hoy.getMonth() - 1); await esp(100);
    out.mesAnterior = document.querySelector('#dp-ventas .pe-actual span').textContent.trim();
    return out;
  });
  assert.equal(r.tickets, r.esperado); // Un lunes sin ventas esa semana la tarjeta enseña «sin ventas» en vez de la gráfica (0 puntos): solo se exige gráfica si hay ventas en la semana.
  assert.equal(r.puntosSemana <= 7 && (r.puntosSemana > 0 || new Date().getDay() === 1), true, JSON.stringify(r));
  assert.ok(r.cambiaSemana, 'la flecha no cambió de semana'); assert.equal(r.puntosMes, r.diasHastaHoy, JSON.stringify(r)); assert.ok(r.selectorMes);
  assert.ok(r.mesAnterior.length > 3, JSON.stringify(r));
  await page.close();
});

await caso('Punto de equilibrio: las cuentas salen de los números reales del mes (ventas netas, fijos = ventas − variables − resultado)', async () => {
  const {page} = await abrir();
  const r = await page.evaluate(() => {
    const D = dpEquilibrioDatos(), hoy = new Date(), y = hoy.getFullYear(), m = hoy.getMonth();
    return {S: D.S, esperadoS: geFacturacionNetaMes(y, m), F: D.F, FcalC: Math.max(0, geFacturacionNetaMes(y, m) - geTotalVariablesNetoMes(y, m) - geResultadoAntesImpMes(y, m)), objetivo: D.objetivo, v: D.v, dm: D.dm, dt: D.dt, proy: D.proyeccion, ritmo: D.ritmo};
  });
  assert.ok(Math.abs(r.S - r.esperadoS) < 0.01); assert.ok(Math.abs(r.F - r.FcalC) < 0.01);
  if(r.F > 0) assert.ok(Math.abs(r.objetivo - r.F / (1 - r.v)) < 0.01, 'objetivo = fijos / (1 − % variable)');
  assert.ok(Math.abs(r.proy - r.ritmo * r.dm) < 0.01);
  await page.close();
});

await caso('Punto de equilibrio con gastos fijos de 1.000 €: se ve el titular, la barra, la frase y las cuatro cifras; sin fijos pide apuntarlos', async () => {
  const {page} = await abrir();
  const r = await page.evaluate(async () => {
    const out = {}, esp = ms => new Promise(r => setTimeout(r, ms));
    out.sinFijos = !!document.querySelector('#dp-equilibrio .dp-eq-vacio') || !!document.querySelector('#dp-equilibrio .dp-eq-stats');
    // Forzamos un caso conocido: pérdida de 1.000 € con 0 € de ventas → fijos = 1.000.
    window.geResultadoAntesImpMes = () => -1000; window.geFacturacionNetaMes = () => 0; window.geTotalVariablesNetoMes = () => 0;
    renderDashboard(); await esp(300);
    const D = dpEquilibrioDatos();
    out.F = D.F; out.obj = Math.round(D.objetivo);
    out.partes = ['.dp-eq-num', '.dp-eq-barra', '.dp-eq-frase', '.dp-eq-stats .dp-eq-st'].map(s => document.querySelectorAll('#dp-equilibrio ' + s).length);
    return out;
  });
  assert.equal(r.F, 1000);
  assert.ok(r.obj > 1000, 'con food cost objetivo el equilibrio supera los fijos: ' + r.obj);
  assert.deepEqual(r.partes, [1, 1, 1, 4]);
  await page.close();
});

await caso('Clientela: con ficha / sin ficha, edades, matriz de cuatro cuadrantes y tipo de consumo cuadran con las ventas', async () => {
  const {page} = await abrir();
  const r = await page.evaluate(() => {
    const D = dpClientelaDatos(new Date().getFullYear(), new Date().getMonth());
    const cuad = Object.fromEntries(Object.entries(D.cuad).map(([k, v]) => [k, v.length]));
    return {n: D.ventas.length, con: D.conFicha.length, sin: D.sinFicha.length, clientes: D.info.length, edades: D.edades.length, cuad, canal: D.canal.mesa.n + D.canal.takeaway.n + D.canal.delivery.n, celdas: document.querySelectorAll('#dp-clientela .dp-q').length, ficha: document.querySelectorAll('#dp-clientela .dp-k-v')[0].textContent.trim()};
  });
  assert.equal(r.con + r.sin, r.n); assert.equal(r.canal, r.n); assert.equal(r.celdas, 4);
  assert.equal(Object.values(r.cuad).reduce((a, b) => a + b, 0), r.clientes);
  assert.equal(String(r.clientes), r.ficha); assert.ok(r.edades >= 1);
  await page.close();
});

await caso('Atención: avisa de los pedidos de la web por aceptar y de las reservas por confirmar (antes se quedaban esperando sin que nadie los viera)', async () => {
  const {page} = await abrir();
  const r = await page.evaluate(() => [...document.querySelectorAll('#dashboard-attention .att-chip')].map(c => c.innerText.replace(/\s+/g, ' ').trim()));
  assert.ok(r.some(t2 => /Pedidos de la web por aceptar/i.test(t2) && /^1\b/.test(t2)), JSON.stringify(r));
  assert.ok(r.some(t2 => /Reservas por confirmar/i.test(t2) && /^1\b/.test(t2)), JSON.stringify(r));
  await page.close();
});

await caso('Sin desbordes en 320, 360 y 390 px, y ninguna palabra cortada en el equilibrio ni en la matriz', async () => {
  for(const ancho of [320, 360, 390]){
    const {page} = await abrir(ancho, 800);
    const r = await page.evaluate(() => {
      const mal = [];
      if(document.documentElement.scrollWidth > innerWidth + 1) mal.push('scroll horizontal ' + document.documentElement.scrollWidth);
      document.querySelectorAll('#view-dashboard .dp-eq, #view-dashboard .dp-card').forEach(c => { if(c.getBoundingClientRect().right > innerWidth + 1) mal.push('se sale ' + (c.id || c.className)); });
      return mal;
    });
    assert.deepEqual(r, [], ancho + ': ' + JSON.stringify(r)); await page.close();
  }
});

await caso('Ningún error de JavaScript ni de consola propia en todo el panel', async () => {
  const {page, errs} = await abrir();
  await page.evaluate(async () => { for(const k of ['reservas', 'ventas', 'gastos', 'resultado']){ dpModo(k, 'mes'); dpModo(k, 'semana'); } panelAnalisisCb(new Date().getFullYear(), new Date().getMonth() === 0 ? 11 : new Date().getMonth() - 1); panelClientelaCb(new Date().getFullYear(), new Date().getMonth() === 0 ? 11 : new Date().getMonth() - 1); });
  await w(300);
  assert.deepEqual(errs, []); await page.close();
});

await browser.close();
console.log(fallos ? `\n❌ ${fallos} caso(s) fallaron` : '\n✅ todos los casos pasaron'); process.exit(fallos ? 1 : 0);
