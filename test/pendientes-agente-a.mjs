// Pendientes del vídeo en un móvil real (16/11), zona A: ficha técnica, Mi puesto, Limpieza/Mantenimiento, Stock, Mega Lista, TPV,
// foco en oliva y botones «Ver»/«Copiar enlace» con caja y 44 px. Se mide en CINCO anchos (320, 360, 390, 412 y 430), con nombres LARGOS.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox'], protocolTimeout:60000});
let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}
const esperar = ms => new Promise(r => setTimeout(r, ms));
const ANCHOS = [320, 360, 390, 412, 430];

// Viernes de la semana (ya hay días pasados en ella): sin esto, un lunes no puede haber tareas «atrasadas» y la prueba no mediría nada.
const RELOJ = (() => { const o = new Date('2026-11-20T12:00:00').getTime() - Date.now(); return `(() => { const off=${o}; const R=Date; function F(...a){ if(!(new.target)) return new R(R.now()+off).toString(); if(a.length===0) return new R(R.now()+off); return new R(...a); } F.prototype=R.prototype; F.now=()=>R.now()+off; F.UTC=R.UTC; F.parse=R.parse; window.Date=F; })();`; })();

async function abrir(ancho, semilla, opts = {}){
  const page = await browser.newPage();
  await page.setViewport({width:ancho, height: ancho < 600 ? 800 : 900});
  if(opts.reloj) await page.evaluateOnNewDocument(RELOJ);
  page.erroresJs = []; page.on('pageerror', e => page.erroresJs.push(e.message));
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
  await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
  await page.evaluate(() => {
    localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'PVMA00001', tenantId: ggBizTenantId('PVMA00001')}));
    localStorage.setItem('gastrogoan_owner_login','1');
    localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted','1');
    localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
  });
  await page.reload({waitUntil:'domcontentloaded'});
  await esperar(2200);
  await page.evaluate(() => {
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate','app-splash'].forEach(id => document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, name:'Restaurante Casa Paco de la Montaña'});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    applyOwnerSessionEditRights(); document.body.classList.add('owner-session'); areaUnlocked.cocina = areaUnlocked.sala = areaUnlocked.gestion = true;
  });
  await page.evaluate(semilla);
  await esperar(500);
  return page;
}

// Contraste real de un elemento: su color (con la opacidad acumulada) frente al primer fondo opaco (o el ::before de un botón fino).
const FN_CONTRASTE = () => {
  const num = c => { const m = c.match(/rgba?\(([^)]+)\)/); if(!m) return null; const p = m[1].split(',').map(Number); return {r:p[0], g:p[1], b:p[2], a: p.length > 3 ? p[3] : 1}; };
  const lum = ({r, g, b}) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const mezcla = (f, b, a) => ({r: f.r * a + b.r * (1 - a), g: f.g * a + b.g * (1 - a), b: f.b * a + b.b * (1 - a)});
  window.__contraste = el => {
    let op = 1, n = el; while(n && n.nodeType === 1){ op *= parseFloat(getComputedStyle(n).opacity); n = n.parentElement; }
    let bg = null;
    for(let n2 = el; n2 && n2.nodeType === 1 && !bg; n2 = n2.parentElement){
      const cs = getComputedStyle(n2);
      if(n2.classList.contains('btn-fino')){ const b = num(getComputedStyle(n2, '::before').backgroundColor); if(b && b.a > .9){ bg = b; break; } }
      const b = num(cs.backgroundColor); if(b && b.a > .9) bg = b;
    }
    bg = bg || {r:250, g:248, b:244};
    const fg0 = num(getComputedStyle(el).color); const fg = mezcla(fg0, bg, fg0.a * op);
    const L1 = lum(fg), L2 = lum(bg); return (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
  };
};

for(const ancho of ANCHOS){
  // ---------- 1 · Ficha técnica ----------
  await caso(`Ficha técnica: el paso se lee en minúsculas y a todo el ancho, sin palabras partidas (${ancho}px)`, async () => {
    const page = await abrir(ancho, () => {
      const L = (id, qty) => ({type:'ingredient', ingredientId:id, qty, merma:0});
      DB.ingredients = [{id:1, name:'Merluza', category:'Pescados', unit:'kg', supplier:'', price:14, packQty:1, packPrice:14, iva:10, allergens:[], area:'cocina'}];
      DB.recipes = [{id:11, name:'Merluza con patata', price:19.8, priceBase:18, ivaPct:10, category:'Pescados', comensales:4, area:'cocina', isBase:false, ingredients:[L(1, .8)]}];
      DB.recipeCategories = [{name:'Pescados', area:'cocina'}];
      DB.fichas = [{id:1, name:'Merluza con patata', recipeId:11, comensales:4, baseComensales:4, produccion:4, tiempo:45, temp:'CALIENTE', ingredients:[],
        pasos:['Cortar a la mitad con el cuchillo de sierra y reservar en frío', 'Decorar al gusto y rellenar', 'Tercero'], pasosDet:[{min:3}, {min:5, aviso:'Ojo con la sal'}, {}], allergens:[], presentation:'', photo:'', area:'cocina'}];
      saveDB(); currentFolder = 'cocina'; fichaHoja = false; fichasFolder = null; fichasTab = 'platos'; navigate('fichas'); openFichaFolder('Pescados');
    });
    await page.evaluate(() => document.querySelector('.es-plato').click()); await esperar(500);
    const r = await page.evaluate(() => [...document.querySelectorAll('.fi-paso')].map(p => {
      const c = p.querySelector('.fi-paso-leer'), cs = getComputedStyle(c), li = p.getBoundingClientRect(), r = c.getBoundingClientRect();
      const rg = document.createRange(); rg.selectNodeContents(c);
      return {tt: cs.textTransform, ratio: r.width / li.width, palabras: c.textContent.split(/\s+/).length, lineas: rg.getClientRects().length, desborde: c.scrollWidth > c.clientWidth + 1};
    }));
    assert.equal(r.length, 3);
    r.forEach((x, i) => { assert.equal(x.tt, 'none', 'paso ' + i + ' en mayúsculas'); assert.ok(x.ratio > .75, `paso ${i}: el texto solo tiene el ${Math.round(x.ratio * 100)} % del ancho`); assert.ok(x.lineas <= x.palabras, 'paso ' + i + ': más renglones que palabras'); assert.ok(!x.desborde); });
    await page.close();
  });

  // ---------- 2 · Mi puesto ----------
  await caso(`Mi puesto: un solo aviso de atrasadas con «Verlas» de 44 px y ningún «0 elaboraciones» (${ancho}px)`, async () => {
    const page = await abrir(ancho, () => {
      DB.employees = ['Alejandro Fernández-Montoya', 'Beatriz Sánchez'].map((n, i) => ({id:i + 1, name:n, rol:'Cocinero de partida', color:'#2E86C1', area:'cocina', active:true, fechaAlta:'2025-01-10', pin:hashPin('1111', 'PVMA00001'), pinChanged:true}));
      DB.ingredients = []; DB.stock = {}; DB.recipes = [{id:900, name:'Croquetas de jamón', area:'cocina', ingredients:[], steps:[]}]; DB.fichas = [];
      DB.workDistribution = {};
      DB.employees.forEach(e => { DB.workDistribution[e.id] = {platos:['Croquetas de jamón'], elabs:[], produccion:{}, doneDates:{}, tareasUnicas:{}};
        for(let i = 0; i < 7; i++) DB.workDistribution[e.id].produccion[i] = [{id:'t' + i + 'a', text:'Preparar la bechamel', bySelf:false}, {id:'t' + i + 'b', text:'Rebozar', bySelf:false}]; });
      DB.turnos = []; DB.fichajes = []; DB.promos = []; DB.limpieza = {tareas:[], checksMes:{}}; DB.turnoSwapRequests = []; DB.vacationRequests = [];
      saveDB(); currentFolder = 'cocina'; distCurrentEmployeeId = null; navigate('distribucion');
    }, {reloj:true});
    await page.evaluate(() => openDistEmployee(1)); await esperar(400);
    const r = await page.evaluate(() => ({
      avisos: document.querySelectorAll('.dp-aviso').length,
      verlas: [...document.querySelectorAll('button')].filter(b => /^(Verlas?|Veure-les|Veure-la|Show me)$/.test(b.textContent.trim())).map(b => b.getBoundingClientRect().height),
      cuantas: (document.querySelector('.dp-aviso span') || {}).textContent,
      tile: [...document.querySelectorAll('.dp-tile-txt small')].map(x => x.textContent.trim()).join('|'),
      menciones: (document.querySelector('#view-distribucion').innerText.match(/\d+ tareas atrasadas/g) || []).length}));
    assert.equal(r.avisos, 1, 'el aviso de atrasadas sale una sola vez'); assert.equal(r.verlas.length, 1, '«Verlas» una sola vez');
    assert.ok(r.verlas[0] >= 43.9, '«Verlas» mide ' + r.verlas[0]); assert.equal(r.menciones, 1, 'la cifra de atrasadas no se repite');
    assert.ok(!/\b0 (elaboraci|elaboracions|preparation)/.test(r.tile), 'plural suelto: ' + r.tile);
    await page.close();
  });

  // ---------- 3 · Limpieza / Mantenimiento ----------
  await caso(`Limpieza: ningún texto de tarea cortado y un solo estado en Mantenimiento: «Vencido» no convive con «OK» (${ancho}px)`, async () => {
    const page = await abrir(ancho, () => {
      const dia = new Date().getDate();
      DB.employees = [{id:1, name:'Ana Pérez', rol:'Cocinera', color:'#2E86C1', area:'cocina', active:true}];
      DB.limpieza = {tareas:[{id:1, area:'Limpieza de ollas y utensilios de la cocina grande', producto:'Agua caliente y jabón desengrasante neutro', tipo:'mensual', diaMes:dia, fecha:null, responsableId:1, zona:'cocina'}],
        checksMes:{}, aperturaLog:[], cierreLog:[], temperaturas:[], plagas:[],
        mantenimiento:[{id:1, nombre:'Plancha doble cara industrial', ultimo:'2026-01-01', proximo:'2026-09-17', responsable:'Servicio técnico Hostelería Norte', estado:'OK', notas:'', zona:'cocina'}], manosPasos:{}, aperturaPasos:{}, cierrePasos:{}};
      limpiezaTab = 'mes'; limpiezaCalMode = 'dia'; limpiezaCalDate = new Date(); saveDB(); currentFolder = 'cocina'; navigate('limpieza');
    });
    await esperar(300);
    const cort = await page.evaluate(() => [...document.querySelectorAll('.lp-tarea-sub *, .lp-tarea .dp-txt')].filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent.trim()));
    assert.deepEqual(cort, [], 'texto cortado: ' + cort.join(' | '));
    await page.evaluate(() => setLimpiezaTab('mantenimiento')); await esperar(300);
    const m = await page.evaluate(() => { const c = document.querySelector('.lp-eq'); return {vencido: !!c.querySelector('.pr-chip.msg'), ok: !!c.querySelector('.lp-estado-eq.ok'), estado: c.querySelector('.lp-estado-eq').textContent.trim()}; });
    assert.ok(m.vencido, 'la tarjeta está vencida'); assert.ok(!m.ok, 'dice «OK» estando vencida: ' + m.estado);
    await page.close();
  });

  // ---------- 4 · Stock + foco oliva + propietario ----------
  await caso(`Stock compacto (≤100 px por producto), foco en oliva y «P» del propietario en oliva (${ancho}px)`, async () => {
    const page = await abrir(ancho, () => {
      DB.ingredients = [{id:101, name:'Tomate', category:'Verduras', unit:'g', price:0.002, area:'cocina'}, {id:102, name:'Sal', category:'Verduras', unit:'kg', price:0.5, area:'cocina'}];
      DB.stock = {101:{qty:5000, min:3000}, 102:{qty:3, min:0}}; DB.stockLog = []; DB.recipes = []; DB.elaboraciones = []; DB.mermas = []; DB.purchaseOrders = []; DB.categoryIcons = {recipe:{}, ingredient:{}};
      saveDB(); currentFolder = 'cocina'; navigate('stock');
    });
    await page.evaluate(() => { const c = document.querySelector('.ml-carpeta'); c && c.click(); }); await esperar(400);
    const h = await page.evaluate(() => [...document.querySelectorAll('.st-fila')].map(f => f.getBoundingClientRect().height));
    assert.ok(h.length === 2 && h.every(x => x <= 100), 'alturas ' + h.join(', '));
    await page.bringToFront();
    await (await page.createCDPSession()).send('Emulation.setFocusEmulationEnabled', {enabled:true});
    const f = await page.evaluate(async () => {
      const i = document.createElement('input'); i.className = 'x'; const d = document.createElement('div'); d.className = 'field'; d.appendChild(i); document.body.appendChild(d); i.focus();
      const b = document.createElement('button'); b.className = 'btn'; document.getElementById('content').appendChild(b);
      await new Promise(r => setTimeout(r, 500)); return {borde: getComputedStyle(i).borderColor, olive: getComputedStyle(document.documentElement).getPropertyValue('--olive').trim()};
    });
    assert.equal(f.borde, 'rgb(74, 93, 78)', 'el campo enfocado no va en oliva: ' + f.borde);
    const p = await page.evaluate(() => { const d = document.createElement('div'); d.innerHTML = mesaWaiterChipHtml(null, true); document.body.appendChild(d); const a = d.querySelector('.mesa-waiter-avatar'); return {bg: getComputedStyle(a).backgroundColor, txt: a.textContent}; });
    assert.equal(p.bg, 'rgb(74, 93, 78)', 'la P del propietario no va en oliva: ' + p.bg); assert.equal(p.txt, 'P');
    await page.close();
  });

  // ---------- 5 · Mega Lista + contraste de chips ----------
  await caso(`Mega Lista: sin párrafos de ayuda sueltos y todos los chips/etiquetas con contraste ≥ 4,5:1 (${ancho}px)`, async () => {
    const page = await abrir(ancho, () => {
      DB.providers = [{id:1, nombre:'Distribuciones Alimentarias del Norte', area:'cocina'}];
      DB.ingredients = []; for(let i = 1; i <= 12; i++) DB.ingredients.push({id:100 + i, name:'Arroz bomba de Calasparra ' + i, category:'Arroces', unit:'g', supplier:i % 2 ? 'Distribuciones Alimentarias del Norte' : '', price:i % 3 ? 0 : 0.002, packQty:1000, packPrice:i % 3 ? 0 : 2, iva:i % 4 ? null : 10, allergens:[], area:'cocina'});
      DB.stock = {101:{qty:2, min:10}}; DB.recipes = []; DB.purchaseOrders = []; DB.preciosHistorial = []; DB.categoryIcons = {recipe:{}, ingredient:{}};
      saveDB(); currentFolder = 'cocina'; megalistaFolder = 'Arroces'; navigate('megalista');
    });
    await page.evaluate(FN_CONTRASTE); await page.evaluate(() => { window.FN = null; });
    await page.evaluate(FN_CONTRASTE);
    const largos = await page.evaluate(() => [...document.querySelectorAll('#view-megalista p, #view-megalista .ml-intro, #view-megalista .gg-nota-txt')].filter(e => e.offsetParent && e.textContent.trim().length > 120).map(e => e.textContent.trim().slice(0, 60)));
    assert.deepEqual(largos, [], 'ayuda larga a la vista: ' + largos.join(' | '));
    const malos = await page.evaluate(() => [...document.querySelectorAll('#view-megalista .ml-falta, #view-megalista .ml-n, #view-megalista .ml-resumen-et, #view-megalista .ml-resumen .btn, #view-megalista .ml-carpeta-pend')]
      .filter(e => e.offsetParent && e.textContent.trim()).map(e => ({t: e.textContent.trim().slice(0, 20), c: __contraste(e)})).filter(x => x.c < 4.5));
    assert.deepEqual(malos, [], 'contraste bajo: ' + JSON.stringify(malos));
    await page.close();
  });

  // ---------- 6 · TPV ----------
  await caso(`TPV: filtros sin abreviar, vacío con salida, «Cobrar» desactivado legible y explicado, ventanas claras y aviso que no tapa «Cobrar» (${ancho}px)`, async () => {
    const page = await abrir(ancho, () => {
      DB.tables.length = 0; DB.tpvOrders.length = 0; DB.cartas.length = 0; DB.sales.length = 0; DB.reservations = [];
      ['Interior', 'Interior', 'exterior', 'exterior', 'Barra'].forEach((z, i) => DB.tables.push({id:i + 1, name:'Mesa ' + (i + 1), zona:z, plazas:4}));
      let pid = 100, sid = 10; const pl = (n, p) => ({id:pid++, nombre:n, precio:p, disponible:true, alergenos:''});
      DB.cartas.push({id:1, nombre:'Carta del día', secciones:[{id:sid++, nombre:'Entrantes', icono:'ic:none', platos:[pl('Croquetas de jamón ibérico', 9.5)]}]}, {id:2, nombre:'Bebidas', tipo:'bebida', secciones:[{id:sid++, nombre:'Cervezas y vinos', icono:'ic:none', platos:[pl('Caña de cerveza', 2.5)]}]});
      DB.activeCartaIds = [1, 2];
      const now = Date.now(); const L = (n, p, q, t, e, m) => ({lineId:genId(), platoId:pid++, recipeId:null, name:n, price:p, qty:q, tanda:t, estado:e, marchada:m, bebida:false, notas:''});
      DB.tpvOrders.push({id:900, tableId:1, tipo:'mesa', status:'abierta', pax:2, items:[L('Croquetas', 9.5, 2, 'Entrantes', 'entregado', 2)], tandas:['Entrantes'], createdAt:new Date(now - 12 * 60000).toISOString()});
      DB.tpvOrders.push({id:902, tableId:5, tipo:'mesa', status:'abierta', pax:4, items:[], tandas:[], createdAt:new Date(now - 5 * 60000).toISOString()});
      saveDB(); currentFolder = 'sala'; tpvFiltroInicialAplicado = true; navigate('tpv');
    });
    await esperar(400);
    await page.evaluate(FN_CONTRASTE);
    const fil = await page.evaluate(() => document.querySelector('.tp-filtros').innerText);
    assert.ok(!/Ocup\.|Serv\./.test(fil), 'filtros abreviados: ' + fil); assert.ok(/Ocupadas/.test(fil) && /Servidas/.test(fil), fil);
    const vac = await page.evaluate(() => { tpvMesaFiltro = 'mias'; tpvZonaSel = 'exterior'; renderTpvMesasZona(); const v = document.querySelector('.tp-vacio'); const b = v && v.querySelector('button');
      const r = {txt: v && v.innerText, alto: b && b.getBoundingClientRect().height}; if(b) b.click(); r.despues = tpvMesaFiltro + '|' + tpvZonaSel; return r; });
    assert.ok(/exterior/i.test(vac.txt) && vac.alto >= 43.9, JSON.stringify(vac)); assert.equal(vac.despues, 'todas|');
    await page.evaluate(() => openNewOrderPaxModal(2)); await esperar(300);
    const ab = await page.evaluate(() => { const ops = [...document.querySelectorAll('.ao-op')]; return {tt: ops.map(o => getComputedStyle(o).textTransform), nota: !!document.querySelector('.ao-nota'),
      partidas: ops.some(o => { const s = o.querySelector('span'), rg = document.createRange(); rg.selectNodeContents(s); return rg.getClientRects().length > s.textContent.trim().split(/\s+/).length; }),
      desborde: document.getElementById('modal-box') ? document.getElementById('modal-box').scrollWidth > document.getElementById('modal-box').clientWidth + 1 : false}; });
    assert.deepEqual(ab.tt, ['none', 'none']); assert.ok(ab.nota, 'sin reservas: dice por qué no se puede elegir'); assert.ok(!ab.partidas, 'palabra partida'); assert.ok(!ab.desborde);
    await page.evaluate(() => closeModal());
    await page.evaluate(() => openMarkDishOutModal()); await esperar(300);
    const ag = await page.evaluate(() => ({tit: document.querySelector('#modal-box h3').textContent.trim(), ayuda: (document.querySelector('.dishout-ayuda') || {}).textContent || ''}));
    assert.ok(!/bebida agotada|drink as out/i.test(ag.tit) && /bebida|beguda|drink/i.test(ag.ayuda), JSON.stringify(ag));
    await page.evaluate(() => closeModal());
    await page.evaluate(() => openTableOrder(5)); await esperar(500);
    const co = await page.evaluate(() => { const b = document.querySelector('.tp-or-cobrar'); showToast('Mesa abierta correctamente, todo guardado'); return {dis: b.disabled, c: __contraste(b), why: !!document.getElementById('tp-or-cobrar-why'), caja: b.getBoundingClientRect().toJSON(), fuera: b.scrollWidth > b.clientWidth + 1}; });
    await esperar(300);
    assert.ok(co.dis && co.why, 'desactivado sin explicación'); assert.ok(co.c >= 4.5, 'contraste de «Cobrar» desactivado ' + co.c.toFixed(2)); assert.ok(!co.fuera, 'la cifra de «Cobrar» se sale del botón');
    const sol = await page.evaluate(() => { const t = document.querySelector('.toast').getBoundingClientRect(), b = document.querySelector('.tp-or-cobrar').getBoundingClientRect(); return !(t.bottom <= b.top || t.top >= b.bottom || t.right <= b.left || t.left >= b.right); });
    assert.ok(!sol, 'el aviso negro tapa «Cobrar»');
    await page.close();
  });
}

// ---------- 7 · «Ver» y «Copiar enlace»: con caja y 44 px (en TODO el código) ----------
await caso('Botones «Ver» / «Copiar enlace» / «Ver página»: todos llevan btn-toque (caja y 44 px)', async () => {
  const src = ['core', 'panel', 'app', 'entregas', 'polish'].map(f => readFileSync(`js/${f}.js`, 'utf8')).join('\n').split('\n');
  const sin = src.filter(l => /<(button|a) [^>]*class="btn/.test(l) && /(mn\.online\.copyLink|mn\.online\.viewPage|mn\.online\.downloadQr|pp\.activate|Copiar enlace|gl\(\{es: ?'Ver', ca)/.test(l) && !/btn-toque|min-height:44px/.test(l));
  assert.deepEqual(sin.map(l => l.trim().slice(0, 90)), []);
  const page = await abrir(360, () => { saveDB(); navigate('home'); });
  const r = await page.evaluate(() => { const b = document.createElement('button'); b.className = 'btn btn-sm btn-fino btn-toque'; b.textContent = 'Ver'; document.getElementById('content').appendChild(b);
    const c = document.createElement('button'); c.className = 'btn btn-toque'; c.textContent = 'Copiar enlace'; document.getElementById('content').appendChild(c);
    return [b, c].map(x => x.getBoundingClientRect().height); });
  assert.ok(r.every(h => h >= 43.9), 'alturas ' + r.join(', '));
  await page.close();
});

await browser.close();
console.log(fallos ? `\n${fallos} caso(s) fallan` : '\nTodo en orden');
process.exit(fallos ? 1 : 0);
