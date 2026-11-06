// AUDITORÍA FISCAL INDEPENDIENTE (encargo maestro, fases 2 y 4): todas las cifras esperadas están calculadas A MANO con la normativa,
// NO con el código de la app. Si una de estas pruebas falla, o la app o la normativa cambió: nunca se «arregla» copiando lo que sale.
//   Fuentes: IRPF — LIRPF art. 30, 32, 58, 63, 74 y escala general estatal+autonómica supletoria (19/24/30/37/45/47 %); mínimo personal 5.550 €;
//   reducciones: AEAT, Manual práctico de Renta 2025 («Reducción para contribuyentes con rentas no exentas inferiores a 12.000 euros»:
//   alternativa a la de 6.498 €, no acumulable). IS — art. 29 y disp. trans. 44.ª LIS tras la Ley 7/2024 (AEAT, Manual de Sociedades 2025).
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const cerca = (a, b, m) => assert.ok(Math.abs(a - b) < 0.01, `${m}: salió ${a}, esperado ${b}`);
const page = await browser.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.dismiss().catch(() => {}));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|nominatim|zippopotam/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(() => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'FISIND01', tenantId: ggBizTenantId('FISIND01')}));
  localStorage.setItem('gastrogoan_owner_login', '1'); localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted', '1'); localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
});
await page.reload({waitUntil:'domcontentloaded'}); await new Promise(r => setTimeout(r, 2000));
await page.evaluate(async () => {
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id => document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, cif:'B12345678'});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  currentFolder = 'gestion'; ownerUnlocked = true; navigate('economia'); await new Promise(r => setTimeout(r, 500));
});
const irpf = (rend, extra = {}) => page.evaluate((r, e) => { const b = DB.business; const antes = {...b}; Object.assign(b, {modalidadDirecta:'simplificada', otrasRentasTitular:0, hijosTitular:0, inicioActividad20:false}, e.bz || {}); const v = irpfActividad(r, e.opts || {}); Object.keys(b).forEach(k => delete b[k]); Object.assign(b, antes); return v; }, rend, extra);

await caso('IRPF autónomo, estimación directa SIMPLIFICADA: 30.000 € de rendimiento → 5.661,00 € (5 % = 1.500; escala 6.715,50 − cuota del mínimo 1.054,50)', async () => {
  cerca(await irpf(30000), 5661, 'IRPF 30.000');
});
await caso('IRPF 40.000 € → 8.707,00 € (5 % tope 2.000; 38.000 por la escala = 9.761,50 − 1.054,50) y 90.000 € → 29.447,00 €', async () => {
  cerca(await irpf(40000), 8707, 'IRPF 40.000'); cerca(await irpf(90000), 29447, 'IRPF 90.000');
});
await caso('Reducciones NO acumulables (hallazgo 1, corregido): 16.000 € → 848,51 € (solo la de 6.498 € menos 1,14 por euro sobre 14.047,50; antes se sumaba además la de 1.620 € y salía menos)', async () => {
  // 5 % = 800 → 15.200; reducción = 6.498 − 1,14 × (15.200 − 14.047,50) = 5.184,15 → neto 10.015,85 → ×19 % = 1.903,01 − 1.054,50 = 848,51
  cerca(await irpf(16000), 848.5115, 'IRPF 16.000');
});
await caso('Rendimiento bajo (10.000 €): 5 % → 9.500; reducción de 6.498 € → 3.002 € → cuota 570,38 € menor que el mínimo → IRPF 0', async () => { cerca(await irpf(10000), 0, 'IRPF 10.000'); });
await caso('Otras rentas del titular > 6.500 €: no cabe la reducción de 6.498 € ni la de 1.620 € (rentas totales > 12.000 €): 5.000 € de actividad + 10.000 € de otras → 1.017,50 €', async () => {
  // neto 4.750; cuota(14.750) = 2.365,50 + 2.300 × 24 % = 2.917,50; cuota(10.000) = 1.900; menos el mínimo (1.054,50) cada una → 1.863 − 845,50
  cerca(await irpf(5000, {bz:{otrasRentasTitular:10000}}), 1017.5, 'IRPF con otras rentas');
});
await caso('Reducción de 1.620 € SOLO si no cabe la de 6.498 €: otras rentas 6.600 € + 4.000 € de actividad → rentas totales 10.400 € (neto 3.800 + 6.600): reducción = 1.620 − 0,405 × 2.400 = 648', async () => {
  // neto 3.800 − 648 = 3.152; cuota(6.600 + 3.152 = 9.752) = 1.852,88; cuota(6.600) = 1.254; mínimo 1.054,50 → (1.852,88−1.054,50) − (1.254−1.054,50) = 798,38 − 199,50 = 598,88
  cerca(await irpf(4000, {bz:{otrasRentasTitular:6600}}), 598.88, 'IRPF con 1.620');
});
await caso('Estimación directa NORMAL (sin 5 %): 30.000 € → 6.111,00 €; con un hijo (mínimo 7.950 €) la simplificada baja a 5.205,00 €; con el 20 % de inicio de actividad a 3.951,00 €', async () => {
  cerca(await irpf(30000, {bz:{modalidadDirecta:'normal'}}), 6111, 'normal');
  cerca(await irpf(30000, {bz:{hijosTitular:1}}), 5205, 'un hijo');
  cerca(await irpf(30000, {bz:{inicioActividad20:true}}), 3951, 'inicio de actividad');
});
await caso('Impuesto de Sociedades por tramos (Ley 7/2024): micro 2026 40.000 € → 7.600; 80.000 € → 15.800; 2025 90.000 € → 19.300; reducida dimensión 2026 100.000 € → 23.000; 2028 → 21 %; general 25 %; nueva creación 15 %; base negativa → 0', async () => {
  const r = await page.evaluate(() => ({
    micro40: impuestoSociedades(40000, {año:2026, incnAnterior:500000}), micro80: impuestoSociedades(80000, {año:2026, incnAnterior:500000}),
    micro25: impuestoSociedades(90000, {año:2025, incnAnterior:500000}), micro27: impuestoSociedades(40000, {año:2027, incnAnterior:500000}),
    erd26: impuestoSociedades(100000, {año:2026, incnAnterior:5000000}), erd28: impuestoSociedades(100000, {año:2028, incnAnterior:5000000}), erd29: impuestoSociedades(100000, {año:2030, incnAnterior:5000000}),
    gral: impuestoSociedades(100000, {año:2026, incnAnterior:20000000}), nueva: impuestoSociedades(40000, {año:2026, nuevaCreacion:true, incnAnterior:500000}), neg: impuestoSociedades(-5000, {año:2026})}));
  cerca(r.micro40, 7600, 'micro 40.000'); cerca(r.micro80, 15800, 'micro 80.000'); cerca(r.micro25, 19300, 'micro 2025'); cerca(r.micro27, 6800, 'micro 2027');
  cerca(r.erd26, 23000, 'reducida 2026'); cerca(r.erd28, 21000, 'reducida 2028'); cerca(r.erd29, 20000, 'reducida 2029+'); cerca(r.gral, 25000, 'general'); cerca(r.nueva, 6000, 'nueva'); cerca(r.neg, 0, 'negativa');
});
// ---- Cadena completa de un negocio ficticio, un año pasado (2025) con 12 meses idénticos -----------------------------------------------
// Ventas: 11.000 € con IVA del 10 % al mes → base 10.000, IVA repercutido 1.000. Alquiler 500 € + IVA 21 % (105). Una nómina de coste 2.000 € con 300 € de IRPF retenido.
// Resultado antes de impuestos = 10.000 − 500 − 2.000 = 7.500 al mes → 90.000 al año.  IVA a liquidar = 1.000 − 105 = 895 al mes → 10.740 al año. Modelo 111 = 3.600 al año.
async function escenario(forma, extra){
  return page.evaluate(async (forma, extra) => {
    const y = new Date().getFullYear() - 1, dd = n => String(n).padStart(2, '0');
    Object.keys(DB.business).forEach(k => { if(['formaJuridica','regimenFiscal','comuneros','incnAnterior','anyo','modalidadDirecta','otrasRentasTitular','hijosTitular','inicioActividad20'].includes(k)) delete DB.business[k]; });
    Object.assign(DB.business, {formaJuridica:forma, regimenFiscal:'directa', anyo:2010}, extra || {});
    DB.sales = []; for(let m = 1; m <= 12; m++){ const f = `${y}-${dd(m)}-10`; DB.sales.push({id:'v' + m, date:f, createdAt:f + 'T14:00:00', total:11000, tipo:'mesa', metodoPago:'Tarjeta', items:[{name:'P', qty:1, price:11000, ivaPct:10}]}); }
    DB.ge = DB.ge || {}; DB.ge.config = {}; DB.ge.variables = []; DB.ge.capex = []; DB.ge.fijosLog = []; DB.ge.existencias = {}; DB.ge.otrosIngresos = []; DB.ge.vales = [];
    DB.ge.fijos = [{id:1, nombre:'ALQUILER', importe:500, periodicidadMeses:1, categoria:'FIJOS', iva:21},
      {id:2, nombre:'ANA', categoria:'PERSONAL', autoCalc:true, sueldoNeto:1300, irpfPct:15, ssTrabPct:6.5, ssPct:32.15, sueldoBruto:1500, ssEmpresa:500, irpfMensual:300, importe:2000, periodicidadMeses:1, iva:0}];
    snapshotGeFijosNeto(); saveDB(); navigate('economia'); GE.tab('cdr'); await new Promise(r => setTimeout(r, 300));
    const suma = f => { let s = 0; for(let m = 0; m < 12; m++) s += f(m, y); return Math.round(s * 100) / 100; };
    return {rai: suma((m, y) => GE.resultadoAntesImpMes(m, y)), imp: suma((m, y) => GE.impuestoMes(m, y)), neto: suma((m, y) => GE.resultadoMes(m, y)), iva: suma((m, y) => GE.ivaLiquidarMes(m, y)), r111: suma((m, y) => geModelo111ForMonth(y, m)), fac: suma((m, y) => GE.facturacionNetaMes ? GE.facturacionNetaMes(m, y) : 0)};
  }, forma, extra);
}
await caso('Cadena de un año (sociedad micro, INCN anterior 500.000 €): antes de impuestos 90.000; IS 2025 = 50.000×21 % + 40.000×22 % = 19.300; neto 70.700; IVA 10.740; 111 = 3.600', async () => {
  const r = await escenario('sociedad', {incnAnterior:'500000'});
  cerca(r.rai, 90000, 'antes de impuestos'); cerca(r.imp, 19300, 'IS'); cerca(r.neto, 70700, 'resultado neto'); cerca(r.iva, 10740, 'IVA a liquidar'); cerca(r.r111, 3600, 'modelo 111');
});
await caso('Sociedad de reducida dimensión (INCN anterior 5 M€): IS 2025 = 24 % de 90.000 = 21.600; neto 68.400', async () => {
  const r = await escenario('sociedad', {incnAnterior:'5000000'}); cerca(r.imp, 21600, 'IS reducida'); cerca(r.neto, 68400, 'neto');
});
await caso('Sociedad con tipo fijado a mano (30 %): manda ese tipo, 27.000 de impuesto', async () => {
  const r = await escenario('sociedad', {incnAnterior:'500000'}); void r;
  const x = await page.evaluate(async () => { DB.ge.config.pctImpuestoBeneficio = 30; saveDB(); const y = new Date().getFullYear() - 1; let s = 0; for(let m = 0; m < 12; m++) s += GE.impuestoMes(m, y); return Math.round(s * 100) / 100; });
  cerca(x, 27000, 'IS al 30 %');
});
await caso('Autónomo en directa simplificada: IRPF del año = 29.447,00 € sobre 90.000 € (la nómina del empleado SÍ es gasto; el sueldo del titular no); neto 60.553', async () => {
  const r = await escenario('autonomo'); cerca(r.rai, 90000, 'antes de impuestos'); cerca(r.imp, 29447, 'IRPF'); cerca(r.neto, 60553, 'neto'); cerca(r.iva, 10740, 'IVA'); cerca(r.r111, 3600, '111');
});
await caso('Comunidad de bienes 50/50: cada comunero tributa por 45.000 € → 10.557,00 € cada uno, 21.114,00 € en total', async () => {
  const r = await escenario('cb', {comuneros:[{nombre:'A', pct:50}, {nombre:'B', pct:50}]}); cerca(r.imp, 21114, 'IRPF de la CB'); cerca(r.neto, 68886, 'neto');
});
await caso('Cero ventas y cero gastos: todo a cero, sin NaN ni impuesto; y un año con pérdidas no genera impuesto', async () => {
  const r = await page.evaluate(async () => {
    DB.business.formaJuridica = 'sociedad'; DB.sales = []; DB.ge.fijos = []; DB.ge.variables = []; DB.ge.capex = []; saveDB(); navigate('economia'); GE.tab('cdr'); await new Promise(r => setTimeout(r, 200));
    const y = new Date().getFullYear() - 1; const vacio = [GE.resultadoMes(3, y), GE.impuestoMes(3, y), GE.ivaLiquidarMes(3, y)];
    DB.ge.fijos = [{id:1, nombre:'ALQUILER', importe:1000, periodicidadMeses:1, categoria:'FIJOS', iva:21}]; DB.ge.fijosLog = []; snapshotGeFijosNeto();
    await new Promise(r => setTimeout(r, 20));   // las cuentas se memorizan lo que dura un pintado: hay que dejar pasar un tick tras cambiar los datos
    DB.sales = [{id:'x', date:`${y}-06-10`, createdAt:`${y}-06-10T12:00:00`, total:110, tipo:'mesa', metodoPago:'Tarjeta', items:[{name:'P', qty:1, price:110, ivaPct:10}]}]; saveDB();
    await new Promise(r => setTimeout(r, 20));
    let imp = 0; for(let m = 0; m < 12; m++) imp += GE.impuestoMes(m, y);
    return {vacio, imp, rai: GE.resultadoAntesImpMes(5, y), dbg: [geTotalFijosNetoForMonth(y,5), geMesConActividad(y,5), geFijosDeduciblesForMonth(y,5), DB.business.formaJuridica, JSON.stringify(DB.ge.fijos).slice(0,80)]};
  });
  assert.deepEqual(r.vacio, [0, 0, 0]); cerca(r.imp, 0, 'impuesto con pérdidas'); assert.ok(r.rai < 0 && Number.isFinite(r.rai), 'pérdida: ' + r.rai + ' ' + JSON.stringify(r.dbg));
});
await caso('Ningún error de JavaScript en todo el recorrido', async () => { assert.deepEqual(errs, []); });
await browser.close();
console.log(fallos ? `\n❌ ${fallos} caso(s) fallaron` : '\n✅ todos los casos pasaron'); process.exit(fallos ? 1 : 0);
