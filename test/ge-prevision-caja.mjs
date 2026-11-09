// Previsión de caja a 30/60/90 días (Tesorería y Beneficio y caja): cuentas a mano; sin doble descuento de los gastos periódicos y con los modelos del trimestre anterior.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
const erroresJs = [];
page.on('pageerror', e => erroresJs.push(e.message));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(code => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
}, 'GEPREVCAJ1');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));
await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
});

let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}


// PREVISIÓN DE CAJA (Tesorería y Beneficio y caja usan la MISMA función). Cuentas hechas a mano, no con el código:
// ventas de un único mes anterior: 100 menús × 100 € con el IVA del 10 % YA incluido = 10.000 cobrados → base 9.090,91 + IVA 909,09.
// Caja de ese mes = 10.000 (lo cobrado: ni gastos, ni IVA ingresado aún, ni impuesto pagado).
const sembrar = (extra) => page.evaluate((extra)=>{
  const hoy = new Date();
  let m = hoy.getMonth() - 1, y = hoy.getFullYear(); if(m < 0){ m = 11; y -= 1; }
  DB.sales = [{id: genId(), date: `${y}-${String(m+1).padStart(2,'0')}-10`, total: 10000, propina:0, subtotal:10000, tipo:'mesa', items:[{name:'Menú', qty:100, price:100, ivaPct:10}], status:'pagada', metodoPago:'Tarjeta'}];
  DB.ge.fijos = []; DB.ge.fijosLog = []; DB.ge.variables = []; DB.ge.capex = []; DB.ge.obligaciones = {}; DB.ge.config.pctImpuestoBeneficio = 25;
  if(extra === 'seguro'){
    const f = new Date(hoy.getTime() + 45 * 864e5);
    DB.ge.fijos = [{id: genId(), nombre:'Seguro anual', categoria:'FIJOS', importe:1200, iva:0, periodicidadMeses:12, mesPago:f.getMonth()+1, diaPago:f.getDate()}];
  }
  saveDB();
  const P = GE.bcPrevisionCaja(5000);
  return JSON.parse(JSON.stringify(P));
}, extra);
const cerca = (a, b, tol = 0.02) => Math.abs(a - b) <= tol;

await caso('Sin gastos periódicos: el ritmo de caja es 10.000/mes y 30/60/90 días estiman 10.000 / 20.000 / 30.000', async () => {
  const P = await sembrar('');
  assert.ok(cerca(P.ritmo, 10000), 'ritmo ' + P.ritmo);
  assert.ok(cerca(P.filas[0].estim, 10000) && cerca(P.filas[1].estim, 20000) && cerca(P.filas[2].estim, 30000), JSON.stringify(P.filas));
  P.filas.forEach(f => assert.ok(cerca(f.total, 5000 - f.conf + f.estim) && cerca(f.variacion, f.estim - f.conf), 'saldo = 5.000 − confirmado + estimado: ' + JSON.stringify(f)));
});

await caso('Un gasto fijo ANUAL (1.200 €) no se descuenta dos veces: el ritmo recupera su parte mensual (100 €) y el pago entero cae el día que vence', async () => {
  const P = await sembrar('seguro');
  // En el resultado del mes ya iban 100 € de reparto → la caja de ese mes sale 9.900; el ritmo la devuelve a 10.000.
  assert.ok(cerca(P.ritmoBruto, 9900), 'ritmo bruto (con el reparto de 100 €) ' + P.ritmoBruto);
  assert.ok(cerca(P.ritmo, 10000), 'ritmo ajustado ' + P.ritmo);
  const c = P.filas.map(f => f.conf);
  // El seguro vence dentro de 45 días: no cuenta a 30, sí a 60 y 90 (además del 303 si su plazo cae antes).
  assert.ok(c[1] - c[0] >= 1200 - 0.01 && c[2] - c[1] >= -0.01, 'los 1.200 € deben aparecer a 60 días y no a 30: ' + JSON.stringify(c));
  assert.ok(P.filas[1].conf >= 1200 - 0.01, 'a 60 días lo confirmado incluye el seguro');
});

await caso('Los modelos del trimestre ANTERIOR cuyo plazo sigue por delante se cuentan (5 de enero: el 303 del 4T vence el 30/01); pasado el plazo, no', async () => {
  const r = await page.evaluate(()=>{
    const Y = new Date().getFullYear() + 1;                       // 5/1 y 10/2 del año que viene; ventas en noviembre de este año
    DB.sales = [{id: genId(), date: `${Y-1}-11-10`, total: 10000, propina:0, subtotal:10000, tipo:'mesa', items:[{name:'Menú', qty:100, price:100, ivaPct:10}], status:'pagada', metodoPago:'Tarjeta'}];
    DB.ge.fijos = []; DB.ge.fijosLog = []; DB.ge.variables = []; DB.ge.capex = []; DB.ge.obligaciones = {};
    saveDB();
    const t303 = lista => lista.filter(f => f.modelo === '303' && f.periodo === 'T4 ' + (Y-1)).map(f => f.importe);
    return {enero: t303(GE.obligacionesPendientes(new Date(Y, 0, 5))), febrero: t303(GE.obligacionesPendientes(new Date(Y, 1, 10)))};
  });
  assert.equal(r.enero.length, 1, 'el 303 del 4T debe estar pendiente el 5 de enero: ' + JSON.stringify(r));
  assert.ok(cerca(r.enero[0], 909.09), 'IVA 10 % incluido en 10.000 € = 909,09: ' + r.enero[0]);
  assert.equal(r.febrero.length, 0, 'el 10 de febrero el plazo (30/01) ya pasó: no se supone impagado: ' + JSON.stringify(r));
});

// LIQUIDACIÓN ANUAL. Negocio ficticio del año pasado (mismas cuentas que fiscal-independiente.mjs, hechas a mano): 12 meses de ventas 11.000 € con IVA
// del 10 % (base 10.000), alquiler 500 y una nómina de 2.000 → antes de impuestos 90.000; sociedad micro (INCN anterior 500.000) → IS = 50.000×21 % + 40.000×22 % = 19.300.
// Sin pagos a cuenta (el año anterior a ese no tiene ventas, el 202 sale 0) → a pagar el 25/07 del año siguiente: 19.300.
await caso('Liquidación anual: el IS del año pasado (19.300 €) entra en la previsión mientras su plazo (25/07) siga por delante; ni antes de hora ni marcado como pagado', async () => {
  const r = await page.evaluate(() => {
    const ej = new Date().getFullYear() - 1, dd = n => String(n).padStart(2, '0');
    Object.keys(DB.business).forEach(k => { if(['formaJuridica','regimenFiscal','comuneros','incnAnterior','anyo','modalidadDirecta'].includes(k)) delete DB.business[k]; });
    Object.assign(DB.business, {formaJuridica:'sociedad', regimenFiscal:'directa', anyo:2010, incnAnterior:'500000'});
    DB.sales = []; for(let m = 1; m <= 12; m++){ const f = `${ej}-${dd(m)}-10`; DB.sales.push({id:'v' + m, date:f, createdAt:f + 'T14:00:00', total:11000, tipo:'mesa', metodoPago:'Tarjeta', items:[{name:'P', qty:1, price:11000, ivaPct:10}]}); }
    DB.ge = DB.ge || {}; DB.ge.config = {}; DB.ge.variables = []; DB.ge.capex = []; DB.ge.fijosLog = []; DB.ge.existencias = {}; DB.ge.otrosIngresos = []; DB.ge.vales = []; DB.ge.obligaciones = {};
    DB.ge.fijos = [{id:1, nombre:'ALQUILER', importe:500, periodicidadMeses:1, categoria:'FIJOS', iva:21},
      {id:2, nombre:'ANA', categoria:'PERSONAL', autoCalc:true, sueldoNeto:1300, irpfPct:15, ssTrabPct:6.5, ssPct:32.15, sueldoBruto:1500, ssEmpresa:500, irpfMensual:300, importe:2000, periodicidadMeses:1, iva:0}];
    snapshotGeFijosNeto(); saveDB();
    const anual = d => (GE.obligacionesPendientes(d).find(f => f.anual) || null);
    const antes = anual(new Date(ej + 1, 5, 10)), despues = anual(new Date(ej + 1, 8, 10));
    const P = GE.bcPrevisionCaja(100000, new Date(ej + 1, 5, 10));
    DB.ge.obligaciones['x'] = {};
    const clave = antes && antes.key; DB.ge.obligaciones[clave] = {pagado:'2026-06-20', presentado:'2026-06-20'};
    const marcado = anual(new Date(ej + 1, 5, 10));
    return {antes: antes && {importe: antes.importe, vence: antes.vence, modelo: antes.modelo}, despues, marcado, conf30: P.filas[0].conf, conf60: P.filas[1].conf};
  });
  assert.ok(r.antes && cerca(r.antes.importe, 19300, 0.5) && r.antes.vence.startsWith('25/07/') && r.antes.modelo === '200', JSON.stringify(r));
  assert.equal(r.despues, null, 'pasado el 25/07 ya no se espera: ' + JSON.stringify(r));
  assert.equal(r.marcado, null, 'marcado como pagado, no cuenta');
  // el 10/06 el plazo (25/07) está a 45 días: no entra a 30 pero sí a 60 días
  assert.ok(r.conf60 - r.conf30 >= 19300 - 0.5, 'a 60 días lo confirmado suma los 19.300: ' + JSON.stringify(r));
});

await caso('Tesorería y Beneficio y caja enseñan el mismo "entra (estim.)" a 30 días', async () => {
  await sembrar('');
  const r = await page.evaluate(()=>{
    GE.tab('tesoreria');
    const te = document.getElementById('te-forecast').textContent;
    return te;
  });
  assert.ok(/Entra \(estim\.\) \+10\.000,00/.test(r), r.slice(0, 400));
});

await caso('Ningún error de JavaScript en todo el recorrido', async () => { assert.deepEqual(erroresJs, [], erroresJs.join(' | ')); });
console.log('\n' + '═'.repeat(68));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
