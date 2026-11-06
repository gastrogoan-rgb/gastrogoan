// Gestión Económica → Tesorería (6/11): reparto en ENTEROS que suma 100, objetivo cumplido en verde con tick y fuera en rojo con cruz,
// reservas de IVA / IRPF con las cuentas hechas a mano, plantillas del sector, y conciliación bancaria que cuadra de verdad.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
async function abrir(w, h){
  const page = await browser.newPage();
  await page.setViewport({width:w, height:h, isMobile:w < 500, hasTouch:w < 1000});
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|nominatim|zippopotam/.test(r.url()) ? r.abort() : r.continue());
  await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
  await page.evaluate(() => {
    localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'ECOTES01', tenantId: ggBizTenantId('ECOTES01')}));
    localStorage.setItem('gastrogoan_owner_login', '1'); localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted', '1'); localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
  });
  await page.reload({waitUntil:'domcontentloaded'}); await new Promise(r => setTimeout(r, 2000));
  await page.evaluate(async () => {
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id => document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, cif:'B12345678', formaJuridica:'autonomo', regimenFiscal:'directa'});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    const hoy = new Date(), y = hoy.getFullYear(), m = hoy.getMonth(), dd = n => String(n).padStart(2, '0'), f = d => y + '-' + dd(m + 1) + '-' + dd(d);
    // 11.000 € con IVA del 10 % → base 10.000 €, IVA repercutido 1.000 €
    DB.sales = [{id:'s1', date:f(2), createdAt:f(2) + 'T14:00:00', total:11000, tipo:'mesa', metodoPago:'Tarjeta', items:[{name:'Plato', qty:1, price:11000, ivaPct:10, recipeId:null}]}];
    DB.cashClosures = []; DB.bankReconciliations = [];
    DB.ge = DB.ge || {};
    DB.ge.config = {...(DB.ge.config || {}), distPct:{per:30, gf:20, mp:30, og:5, ben:15}, pctImpuestoBeneficio:25};
    // Compras 5.000 € + 10 % → soportado 500 €. Alquiler 500 € + 21 % → soportado 105 €. Nómina con 300 € de IRPF retenido.
    DB.ge.variables = [{id:8001, concepto:'Compras', proveedor:'P', categoria:'MATERIA PRIMA', importe:5000, iva:10, fecha:f(3), mes:m, 'año':y}];
    DB.ge.fijos = [
      {id:8002, nombre:'Alquiler', importe:500, periodicidadMeses:1, iva:21, categoria:'FIJOS'},
      {id:8003, nombre:'ANA', categoria:'PERSONAL', autoCalc:true, sueldoNeto:1500, irpfPct:15, ssTrabPct:6.5, ssPct:32.15, sueldoBruto:2000, ssEmpresa:643, irpfMensual:300, importe:2643, periodicidadMeses:1, iva:0}
    ];
    DB.ge.fijosLog = []; DB.ge.capex = [];
    snapshotGeFijosNeto(); saveDB();
    currentFolder = 'gestion'; ownerUnlocked = true; navigate('economia'); GE.tab('tesoreria'); GE.setMonthTe(m); await new Promise(r => setTimeout(r, 1000));
  });
  return {page, errs};
}
const numero = s => parseFloat(String(s).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
await caso('Reparto REDONDO: cada cambio deja los cinco en enteros que suman 100, y un reparto antiguo con decimales se lee redondo', async () => {
  const {page, errs} = await abrir(1280, 900);
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms)); const ids = ['te-pct-per','te-pct-gf','te-pct-mp','te-pct-og','te-pct-ben'];
    const leer = () => ids.map(id => parseFloat(document.getElementById(id).value));
    const out = {pasos: []};
    for(const [id, v] of [['te-pct-per', '47'], ['te-pct-gf', '13'], ['te-pct-ben', '7'], ['te-pct-mp', '33.6'], ['te-pct-og', '0'], ['te-pct-per', '101']]){
      const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('change', {bubbles: true})); await esp(250);
      out.pasos.push({id, v, vals: leer()});
    }
    DB.ge.config.distPct = {per:30.7, gf:19.4, mp:34.9, og:4.6, ben:10.4}; saveDB(); GE.renderTesoreria(); await esp(250);
    out.antiguo = leer(); out.food = GE.setFoodCostObjPct ? null : 'sin api'; out.obj = DB.ge.config.distPct;
    return out;
  });
  for(const p of r.pasos){ assert.ok(p.vals.every(Number.isInteger), JSON.stringify(p)); assert.equal(p.vals.reduce((a, b) => a + b, 0), 100, JSON.stringify(p)); }
  assert.equal(r.pasos[0].vals[0], 47); assert.equal(r.pasos[3].vals[2], 34, 'el 33,6 se queda en 34'); assert.equal(r.pasos[5].vals[0], 100, 'más de 100 se recorta a 100');
  assert.ok(r.antiguo.every(Number.isInteger) && r.antiguo.reduce((a, b) => a + b, 0) === 100, JSON.stringify(r.antiguo)); assert.deepEqual(errs, []); await page.close();
});
await caso('Objetivo cumplido = cantidad en VERDE con tick; fuera = ROJO con cruz (gastos y beneficio, cada uno en su sentido)', async () => {
  const {page} = await abrir(1280, 900);
  const r = await page.evaluate(async () => {
    const fila = k => document.querySelector(`#te-rows .te-row[data-k="${k}"]`); const out = {};
    const leer = k => { const real = fila(k).querySelector('.te-c-real'); return {clase: real.className, tick: real.innerHTML.includes('ti-check'), cruz: real.innerHTML.includes('ti-x')}; };
    const cambiarBen = async v => { const el = document.getElementById('te-pct-ben'); el.value = v; el.dispatchEvent(new Event('change', {bubbles: true})); await new Promise(r => setTimeout(r, 300)); };
    await cambiarBen('30'); out.benDespues = leer('ben'); await cambiarBen('15');
    for(const k of ['per', 'gf', 'mp', 'og', 'ben']){ const f = fila(k), real = f.querySelector('.te-c-real');
      out[k] = {clase: real.className, tick: real.innerHTML.includes('ti-check'), cruz: real.innerHTML.includes('ti-x'), color: getComputedStyle(real).color, dif: f.querySelector('.te-c-dif').className, real: real.querySelector('b').textContent}; }
    return out;
  });
  // objetivos sobre 10.000 €: personal 3.000 (real 2.643 ✓), fijos 2.000 (500 ✓), variables 3.000 (5.000 ✗), otros 500 (0 ✓), beneficio 1.500 (real 10.000 − 2.643 − 500 − 5.000 = 1.857 ✓; con un objetivo del 30 % pasa a ✗)
  assert.ok(r.per.clase.includes('is-ok') && r.per.tick, JSON.stringify(r.per)); assert.ok(r.gf.clase.includes('is-ok') && r.gf.tick);
  assert.ok(r.mp.clase.includes('is-ko') && r.mp.cruz && !r.mp.tick, JSON.stringify(r.mp)); assert.ok(r.og.clase.includes('is-ok'));
  assert.ok(r.ben.clase.includes('is-ok') && r.ben.tick, JSON.stringify(r.ben));
  assert.ok(r.benDespues.clase.includes('is-ko') && r.benDespues.cruz && !r.benDespues.tick, 'beneficio por debajo de su objetivo = rojo con cruz: ' + JSON.stringify(r.benDespues));
  const [rv, gv, bv] = r.per.color.match(/\d+/g).map(Number); assert.ok(gv > rv && gv > bv, 'verde de verdad: ' + r.per.color);
  const [rr, rg, rb] = r.mp.color.match(/\d+/g).map(Number); assert.ok(rr > rg && rr > rb, 'rojo de verdad: ' + r.mp.color);
  assert.equal(numero(r.mp.real), 5000); await page.close();
});
await caso('Reservas con las cuentas a mano: IVA = 1.000 − 500 − 105 = 395 €; IRPF retenido = 300 €; «Para Hacienda» suma las filas', async () => {
  const {page} = await abrir(1280, 900);
  const r = await page.evaluate(() => {
    const filas = [...document.querySelectorAll('#te-rows .te-res')].map(f => ({t: f.querySelector('.te-c-con').textContent.trim(), v: f.querySelector('.te-res-imp').textContent}));
    return {filas, grupo: document.querySelector('#te-rows .te-grupo b').textContent, kpi: [...document.querySelectorAll('#te-kpis .ge-kpi')].map(k => k.textContent.replace(/\s+/g, ' ').trim()), colchon: !!document.querySelector('#te-rows .te-colchon')};
  });
  const iva = r.filas.find(f => /IVA/i.test(f.t)), irpf = r.filas.find(f => /IRPF/i.test(f.t));
  assert.ok(iva && numero(iva.v) === 395, JSON.stringify(r.filas)); assert.ok(irpf && numero(irpf.v) === 300, JSON.stringify(r.filas));
  // «Para Hacienda» = la suma de las reservas de verdad del trimestre (IVA, IRPF y el pago a cuenta del 130), SIN el impuesto acumulado del año (informativo).
  const suma = r.filas.filter(f => !/acumulado|year to date/i.test(f.t)).reduce((a, f) => a + numero(f.v), 0);
  assert.equal(Math.round(numero(r.grupo) * 100), Math.round(suma * 100), 'el total es la suma de las filas: ' + r.grupo + ' vs ' + suma + ' ' + JSON.stringify(r.filas));
  assert.ok(numero(r.grupo) >= 695, 'al menos IVA + IRPF'); assert.ok(r.kpi.some(k => /Para Hacienda/i.test(k) && k.includes(r.grupo.trim())), r.kpi.join(' | ')); assert.ok(r.colchon);
  assert.ok(r.kpi.some(k => /Coste primo/i.test(k) && /%/.test(k)), r.kpi.join(' | ')); await page.close();
});
await caso('Plantillas del sector: aplican un reparto redondo que suma 100 y sincronizan el food cost; avisos si el margen es corto', async () => {
  const {page} = await abrir(1280, 900);
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms)); const out = {opciones: [...document.querySelectorAll('#te-plantilla option')].length};
    const sel = document.getElementById('te-plantilla'); sel.value = 'bar'; sel.dispatchEvent(new Event('change', {bubbles: true})); await esp(300);
    out.bar = ['per','gf','mp','og','ben'].map(k => DB.ge.config.distPct[k]); out.food = DB.ge.config.foodCostObj; out.selVuelve = document.getElementById('te-plantilla').value;
    const el = document.getElementById('te-pct-per'); el.value = '60'; el.dispatchEvent(new Event('change', {bubbles: true})); await esp(300);
    out.aviso = document.getElementById('te-avisos').textContent.trim();
    return out;
  });
  assert.equal(r.opciones, 5); assert.deepEqual(r.bar, [28, 20, 27, 5, 20]); assert.equal(r.food, 27); assert.equal(r.selVuelve, ''); assert.match(r.aviso, /65/); await page.close();
});
await caso('Conciliación: cuenta cierres + turnos sin cerrar, no pierde lo escrito al cambiar fechas, comisión y ✓/✗ con tolerancia de 1 €', async () => {
  const {page, errs} = await abrir(1280, 900);
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms)); const out = {};
    const hoy = new Date(), y = hoy.getFullYear(), m = hoy.getMonth(), dd = n => String(n).padStart(2, '0'), f = d => y + '-' + dd(m + 1) + '-' + dd(d);
    DB.cashClosures = [{id:1, fecha:f(5), desde:f(5) + 'T09:00', hasta:f(5) + 'T22:00', totales:{Tarjeta:200, Efectivo:50}}];
    DB.sales = [
      {id:'a', date:f(5), createdAt:f(5) + 'T20:00:00', total:200, cierreId:1, tipo:'mesa', metodoPago:'Tarjeta', items:[]},
      {id:'b', date:f(6), createdAt:f(6) + 'T14:00:00', total:100, tipo:'mesa', metodoPago:'Tarjeta', items:[]},
      {id:'c', date:f(6), createdAt:f(6) + 'T15:00:00', total:40, tipo:'mesa', metodoPago:'Efectivo', items:[]},
      {id:'d', date:f(6), createdAt:f(6) + 'T16:00:00', total:70, tipo:'mesa', metodoPago:'Tarjeta', status:'anulada', items:[]}
    ]; saveDB();
    openBankReconciliationModal(); await esp(200);
    const desde = document.getElementById('rec-bank-desde'), hasta = document.getElementById('rec-bank-hasta');
    desde.value = f(5); hasta.value = f(6); refreshBankReconciliationRange();
    out.esperado = document.getElementById('rec-bank-expected').textContent; out.detalle = document.getElementById('rec-bank-detalle').textContent;
    const monto = document.getElementById('rec-bank-amount'), fee = document.getElementById('rec-bank-fee'), notas = document.getElementById('rec-bank-notes');
    notas.value = 'nota escrita'; monto.value = '297'; monto.dispatchEvent(new Event('input', {bubbles: true}));
    out.alCambiarFechas = (() => { hasta.value = f(7); refreshBankReconciliationRange(); return {monto: monto.value, notas: notas.value}; })();
    hasta.value = f(6); refreshBankReconciliationRange();
    out.dif1 = {clase: document.getElementById('rec-bank-diff').className, txt: document.getElementById('rec-bank-diff').textContent.replace(/\s+/g, ' ')};
    fee.value = '3'; fee.dispatchEvent(new Event('input', {bubbles: true}));
    out.conComision = {clase: document.getElementById('rec-bank-diff').className, txt: document.getElementById('rec-bank-diff').textContent.replace(/\s+/g, ' ')};
    monto.value = '297.5'; monto.dispatchEvent(new Event('input', {bubbles: true})); out.tolerancia = document.getElementById('rec-bank-diff').className;
    monto.value = '310'; monto.dispatchEvent(new Event('input', {bubbles: true})); out.demas = document.getElementById('rec-bank-diff').textContent.replace(/\s+/g, ' ');
    monto.value = '297'; fee.value = '3'; monto.dispatchEvent(new Event('input', {bubbles: true}));
    saveBankReconciliation(); await esp(300);
    const ult = DB.bankReconciliations[DB.bankReconciliations.length - 1]; out.ult = {expected: ult.expected, fee: ult.fee, bank: ult.bankAmount, dif: ult.difference, estado: ult.status};
    out.historial = document.querySelectorAll('#modal-box .rc-hist-f').length; closeModal(); await esp(200);
    out.chip = document.getElementById('te-conc-estado').textContent.trim();
    openBankReconciliationModal(); await esp(200); out.siguiente = document.getElementById('rec-bank-desde').value; out.f6 = f(6);
    hasta.value; document.getElementById('rec-bank-desde').value = f(5); document.getElementById('rec-bank-hasta').value = f(6); refreshBankReconciliationRange();
    out.solape = document.getElementById('rec-bank-aviso').textContent.trim();
    return out;
  });
  assert.match(r.esperado, /300,00/, 'cierre 200 + turno sin cerrar 100 (el efectivo y el anulado no cuentan): ' + r.esperado); assert.match(r.detalle, /200,00/); assert.match(r.detalle, /100,00/);
  assert.deepEqual(r.alCambiarFechas, {monto: '297', notas: 'nota escrita'}, 'cambiar fechas no borra lo escrito');
  assert.ok(r.dif1.clase.includes('is-ko') && /-3,00/.test(r.dif1.txt) && /1[, ]?0? ?%|1 %|1,0/.test(r.dif1.txt), JSON.stringify(r.dif1));
  assert.ok(r.conComision.clase.includes('is-ok'), JSON.stringify(r.conComision)); assert.ok(r.tolerancia.includes('is-ok'), 'medio euro de diferencia es redondeo'); assert.match(r.demas, /\+?13,00|13,00/);
  assert.equal(r.ult.expected, 300); assert.equal(r.ult.fee, 3); assert.equal(r.ult.dif, 0); assert.equal(r.ult.estado, 'cuadra'); assert.equal(r.historial, 1);
  assert.match(r.chip, /Conciliado hasta/i); assert.ok(r.siguiente > r.f6 || r.siguiente.endsWith('-01') || r.siguiente !== '', 'propone empezar tras la última'); assert.match(r.solape, /pisan|overlap|trepitgen/i); assert.deepEqual(errs, []); await page.close();
});
for(const ancho of [320, 360, 390, 412, 430]){
  await caso(`Móvil ${ancho}: Tesorería sin desborde, porcentajes editables de 40 px y filas legibles`, async () => {
    const {page} = await abrir(ancho, 800);
    await page.evaluate(async () => { navigate('economia'); GE.tab('tesoreria'); await new Promise(r => setTimeout(r, 600)); });
    const r = await page.evaluate(() => {
      const raiz = document.getElementById('ge-tesoreria');
      return {desborde: document.documentElement.scrollWidth - innerWidth,
        fuera: [...raiz.querySelectorAll('.te-row *, .te-cal-f *, .te-barras *, .te-grupo *, .te-colchon *')].filter(e => { const q = e.getBoundingClientRect(); return q.width && (q.right > innerWidth + 1 || q.left < -1); }).length,
        chicos: [...raiz.querySelectorAll('.te-c-pct input')].filter(i => { const q = i.getBoundingClientRect(); return q.height < 39.5 || q.width < 39.5; }).map(i => Math.round(i.getBoundingClientRect().width) + 'x' + Math.round(i.getBoundingClientRect().height)),
        letra: Math.min(...[...raiz.querySelectorAll('.te-row *, .te-cal-f *')].filter(e => e.children.length === 0 && e.textContent.trim()).map(e => parseFloat(getComputedStyle(e).fontSize)))};
    });
    assert.equal(r.desborde, 0, JSON.stringify(r)); assert.equal(r.fuera, 0, JSON.stringify(r)); assert.equal(r.chicos.length, 0, JSON.stringify(r)); assert.ok(r.letra >= 11, 'letra de ' + r.letra);
    await page.close();
  });
}
await browser.close();
console.log(fallos ? `\n❌ ${fallos} caso(s) fallaron` : '\n✅ todos los casos pasaron'); process.exit(fallos ? 1 : 0);
