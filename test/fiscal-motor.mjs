// Motor fiscal (encargo maestro, fase 6) y previsión de impuestos (fase 5): catálogo de reglas con su fuente, escala de Cataluña con cifras hechas
// a mano, trazabilidad, fiabilidad, obligaciones presentadas/pagadas con la comparación previsto-real, y un simulador que no toca nada.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const cerca = (a, b, m) => assert.ok(Math.abs(a - b) < 0.02, `${m}: salió ${a}, esperado ${b}`);
const page = await browser.newPage(); await page.setViewport({width:1280, height:900});
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.dismiss().catch(() => {}));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|nominatim|zippopotam/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(() => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'FISMOT01', tenantId: ggBizTenantId('FISMOT01')}));
  localStorage.setItem('gastrogoan_owner_login', '1'); localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted', '1'); localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
});
await page.reload({waitUntil:'domcontentloaded'}); await new Promise(r => setTimeout(r, 2000));
await page.evaluate(async () => {
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id => document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, cif:'B12345678'});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  DB.license = {code:'FISMOT01', tenantId: ggBizTenantId('FISMOT01')};
  currentFolder = 'gestion'; ownerUnlocked = true; navigate('economia'); await new Promise(r => setTimeout(r, 400));
});
// El mismo negocio de siempre: 2025, 12 meses iguales (10.000 base + 1.000 IVA de ventas; alquiler 500 + 21 %; nómina de coste 2.000 con 300 de IRPF)
async function escenario(forma, extra, lic){
  return page.evaluate(async (forma, extra, lic) => {
    const y = new Date().getFullYear() - 1, dd = n => String(n).padStart(2, '0');
    ['formaJuridica','regimenFiscal','comuneros','incnAnterior','anyo','modalidadDirecta','otrasRentasTitular','hijosTitular','inicioActividad20','territorio','fiscalFijado'].forEach(k => delete DB.business[k]);
    Object.assign(DB.business, {formaJuridica:forma, regimenFiscal:'directa', anyo:2010}, extra || {});
    DB.license = {code:'FISMOT01', tenantId: ggBizTenantId('FISMOT01'), ...(lic ? {fiscal: lic} : {})};
    DB.sales = []; for(let m = 1; m <= 12; m++){ const f = `${y}-${dd(m)}-10`; DB.sales.push({id:'v' + m, date:f, createdAt:f + 'T14:00:00', total:11000, tipo:'mesa', metodoPago:'Tarjeta', items:[{name:'P', qty:1, price:11000, ivaPct:10}]}); }
    DB.ge = DB.ge || {}; DB.ge.config = {}; DB.ge.variables = []; DB.ge.capex = []; DB.ge.fijosLog = []; DB.ge.existencias = {}; DB.ge.otrosIngresos = []; DB.ge.vales = []; DB.ge.obligaciones = {};
    DB.ge.fijos = [{id:1, nombre:'ALQUILER', importe:500, periodicidadMeses:1, categoria:'FIJOS', iva:21},
      {id:2, nombre:'ANA', categoria:'PERSONAL', autoCalc:true, sueldoNeto:1300, irpfPct:15, ssTrabPct:6.5, ssPct:32.15, sueldoBruto:1500, ssEmpresa:500, irpfMensual:300, importe:2000, periodicidadMeses:1, iva:0}];
    snapshotGeFijosNeto(); saveDB(); await new Promise(r => setTimeout(r, 30));
  }, forma, extra, lic);
}
const año = () => new Date().getFullYear() - 1;
await caso('Catálogo de reglas: cada una con fuente, referencia y estado válido; las verificadas dicen cuándo; ninguna regla usada por el cálculo falta', async () => {
  const r = await page.evaluate(() => ({reglas: FISCAL_REGLAS.map(x => ({id:x.id, fuente:!!x.fuente, ref:!!x.referencia, estado:x.estado, desde:x.desde})), ver: FISCAL_VERIFICADO_EN,
    vigentes2026: fiscalReglasVigentes('2026-06-01', 'autonomo', 'cataluna').map(x => x.id), vigentesSoc: fiscalReglasVigentes('2026-06-01', 'sociedad').map(x => x.id)}));
  assert.ok(r.reglas.length >= 15); r.reglas.forEach(x => { assert.ok(x.fuente && x.ref, x.id + ' sin fuente'); assert.ok(['verificada', 'revisada', 'pendiente'].includes(x.estado), x.id); });
  assert.ok(r.reglas.filter(x => x.estado === 'verificada').length >= 6); assert.match(r.ver, /^2026-/);
  assert.ok(r.vigentes2026.includes('IRPF-ESC-CAT') && r.vigentes2026.includes('IRPF-RED-6498') && !r.vigentes2026.includes('IS-TIPOS'));
  assert.ok(r.vigentesSoc.includes('IS-TIPOS') && !r.vigentesSoc.includes('IRPF-DIFICIL-5'));
});
await caso('Escala de CATALUÑA (estatal + autonómica, hecha a mano): 30.000 € → 5.718,25 € y 90.000 € → 29.656,25 € (la general daba 5.661 y 29.447)', async () => {
  const r = await page.evaluate(() => { const b = DB.business; const guardar = {...b}; Object.assign(b, {formaJuridica:'autonomo', regimenFiscal:'directa', modalidadDirecta:'simplificada', otrasRentasTitular:0, hijosTitular:0, inicioActividad20:false});
    b.territorio = 'cataluna'; const cat = [irpfActividad(30000), irpfActividad(90000)]; b.territorio = 'general'; const gen = [irpfActividad(30000), irpfActividad(90000)];
    Object.keys(b).forEach(k => delete b[k]); Object.assign(b, guardar); return {cat, gen}; });
  // 30.000: neto 28.500. Estatal 1.182,75 + 930 + 1.245 = 3.357,75; autonómica 1.187,50 + 1.187,50 + 1.040 = 3.415 → 6.772,75 − mínimo (527,25 + 527,25) = 5.718,25
  // 90.000: neto 88.000. Estatal 15.250,75; autonómica 15.460 → 30.710,75 − 1.054,50 = 29.656,25
  cerca(r.cat[0], 5718.25, 'Cataluña 30.000'); cerca(r.cat[1], 29656.25, 'Cataluña 90.000'); cerca(r.gen[0], 5661, 'general 30.000'); cerca(r.gen[1], 29447, 'general 90.000');
});
await caso('El territorio fijado en la licencia manda: el motor usa Cataluña aunque el negocio dijera otra cosa, y la traza cita IRPF-ESC-CAT', async () => {
  await escenario('autonomo', {territorio:'general'}, {formaJuridica:'autonomo', regimenFiscal:'directa', modalidadDirecta:'simplificada', territorio:'cataluna'});
  const r = await page.evaluate(() => { const T = fiscalTrazaAnual(new Date().getFullYear() - 1); return {terr: territorioFiscal(), reglas: T.reglas, imp: T.impuestoAnual, nivel: T.nivel, avisos: T.avisos}; });
  assert.equal(r.terr, 'cataluna'); assert.ok(r.reglas.includes('IRPF-ESC-CAT') && !r.reglas.includes('IRPF-ESC-GENERAL'), JSON.stringify(r.reglas));
  assert.ok(!r.avisos.some(a => /Escala general de referencia/.test(a)), 'con Cataluña no avisa de escala general');
});
await caso('Traza de una sociedad micro (INCN 500.000 €): resultado contable 90.000 → base fiscal 90.000 → impuesto 19.300 € con los pasos y la regla IS-TIPOS; fiabilidad alta si la forma la fijó GastroGoan', async () => {
  await escenario('sociedad', {incnAnterior:'500000'}, {formaJuridica:'sociedad', regimenFiscal:'directa', modalidadDirecta:null, territorio:'general'});
  const T = await page.evaluate(() => fiscalTrazaAnual(new Date().getFullYear() - 1));
  cerca(T.baseCont, 90000, 'base contable'); cerca(T.baseFiscal, 90000, 'base fiscal'); cerca(T.impuestoAnual, 19300, 'impuesto'); assert.ok(T.reglas.includes('IS-TIPOS')); assert.ok(T.pasos.length >= 4);
  assert.equal(T.nivel, 'alta', JSON.stringify(T.motivos)); assert.equal(T.enCurso, false);
});
await caso('Fiabilidad honesta: sin forma → baja; cooperativa → baja; autónomo con escala general → media; gastos «pendientes de revisar» → media y lo dice; año anterior a 2025 → baja', async () => {
  const niv = async (forma, extra, lic) => { await escenario(forma, extra, lic); return page.evaluate(() => { const T = fiscalTrazaAnual(new Date().getFullYear() - 1); return {n: T.nivel, a: T.avisos.join(' | ')}; }); };
  assert.equal((await niv('', {})).n, 'baja'); assert.equal((await niv('cooperativa', {})).n, 'baja');
  const a = await niv('autonomo', {}, {formaJuridica:'autonomo', regimenFiscal:'directa', modalidadDirecta:'simplificada', territorio:'general'}); assert.equal(a.n, 'media'); assert.match(a.a, /Escala general de referencia/);
  await escenario('sociedad', {incnAnterior:'500000'}, {formaJuridica:'sociedad', regimenFiscal:'directa', modalidadDirecta:null, territorio:'general'});
  const rev = await page.evaluate(async () => { const y = new Date().getFullYear() - 1; DB.ge.variables = [{id:7, categoria:'OTROS', proveedor:'DUDA', importe:100, iva:21, fecha:`${y}-05-05`, mes:4, 'año':y, deducPct:100, deducRevisar:true}]; saveDB(); await new Promise(r => setTimeout(r, 30)); const T = fiscalTrazaAnual(y); return {n: T.nivel, a: T.avisos.join(' | '), rev: T.porRevisar}; });
  assert.equal(rev.n, 'media'); assert.match(rev.a, /pendiente\(s\) de revisar/); assert.equal(rev.rev, 1);
  const viejo = await page.evaluate(() => fiscalTrazaAnual(2024).nivel); assert.equal(viejo, 'baja');
});
await caso('Previsión del T4 2025: 303 = 2.685 € (895 × 3), 111 = 900 €; estado «plazo pasado» hasta que se marca; presentado → pagado con importe REAL y la desviación frente a lo previsto', async () => {
  await escenario('sociedad', {incnAnterior:'500000'}, {formaJuridica:'sociedad', regimenFiscal:'directa', modalidadDirecta:null, territorio:'general'});
  const r = await page.evaluate(async () => {
    const y = new Date().getFullYear() - 1, out = {}; const get = m => fiscalPrevision(y, 3).filas.find(f => f.modelo === m);
    out.f303 = {i: get('303').importe, e: get('303').estado, vence: get('303').vence}; out.i111 = get('111').importe;
    fiscalObligaciones()[fiscalClave(y, 3, '303')] = {presentado:`${y + 1}-01-20`, pagado:null, real:2700, estimado:2685}; out.presentado = get('303').estado;
    fiscalObligaciones()[fiscalClave(y, 3, '303')] = {presentado:`${y + 1}-01-20`, pagado:`${y + 1}-01-22`, real:2700, estimado:2685}; const p = get('303'); out.pagado = {e: p.estado, des: p.desviacion};
    delete fiscalObligaciones()[fiscalClave(y, 3, '303')]; out.vuelve = get('303').estado; return out;
  });
  cerca(r.f303.i, 2685, '303'); assert.equal(r.f303.vence, `30/01/${new Date().getFullYear()}`); cerca(r.i111, 900, '111'); assert.equal(r.f303.e, 'vencido'); assert.equal(r.presentado, 'presentado'); assert.equal(r.pagado.e, 'pagado'); cerca(r.pagado.des, 15, 'desviación real − previsto'); assert.equal(r.vuelve, 'vencido');
});
await caso('La tarjeta de Tesorería enseña el estado, la fiabilidad, la hora de actualización, los avisos y los botones «Ver cálculo», «Simular» y «Marcar»', async () => {
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms)); GE.tab('tesoreria'); await esp(400); const box = document.getElementById('te-calendario');
    const out = {txt: box.textContent, botones: [...box.querySelectorAll('button')].map(b => b.textContent.trim().toLowerCase())};
    [...box.querySelectorAll('button')].find(b => /ver cálculo/i.test(b.textContent)).click(); await esp(250); out.modal = document.getElementById('modal-box').innerText; closeModal(); await esp(150);
    [...box.querySelectorAll('button')].find(b => /marcar/i.test(b.textContent)).click(); await esp(250); out.marcar = document.getElementById('modal-box').innerText; closeModal(); return out;
  });
  assert.match(r.txt, /ESTIMACIONES/i); assert.match(r.txt, /actualizado a las/); assert.match(r.txt, /Fiabilidad/i); assert.match(r.txt, /303/); assert.match(r.txt, /hasta el/);
  assert.ok(r.botones.some(b => /ver cálculo/.test(b)) && r.botones.some(b => /simular/.test(b)) && r.botones.some(b => /marcar/.test(b)));
  assert.match(r.modal, /Cómo se ha calculado el impuesto/); assert.match(r.modal, /IS-TIPOS/); assert.match(r.modal, /Verificada con fuente oficial/i); assert.match(r.modal, /no una liquidación oficial/i); assert.match(r.marcar, /Presentado/);
});
await caso('Simulador: es una SIMULACIÓN (lo dice y no toca nada): +10 % de ventas sube el impuesto, contratar baja la base, y los datos reales quedan igual', async () => {
  const r = await page.evaluate(async () => {
    const y = new Date().getFullYear(); DB.sales = DB.sales.map(s => ({...s, date: s.date.replace(String(y - 1), String(y)), createdAt: s.createdAt.replace(String(y - 1), String(y))})); saveDB(); await new Promise(r => setTimeout(r, 30));
    const antes = JSON.stringify(DB.ge) + DB.sales.length; const base = fiscalSimular({}, y); const mas = fiscalSimular({ventasPct:10}, y); const contrata = fiscalSimular({personalMes:1500}, y);
    fiscalSimuladorModal(); const txt = document.getElementById('modal-box').innerText; closeModal();
    return {iguales: base.dImpuesto === 0 && base.dBase === 0, subeVentas: mas.dImpuesto, bajaBase: contrata.dBase, nivel: mas.nivel, txt, tocado: JSON.stringify(DB.ge) + DB.sales.length !== antes};
  });
  assert.ok(r.iguales); assert.ok(r.subeVentas > 0, 'más ventas, más impuesto: ' + r.subeVentas); assert.ok(r.bajaBase < 0); assert.equal(r.nivel, 'simulacion'); assert.match(r.txt, /ES UNA SIMULACIÓN/i); assert.equal(r.tocado, false);
});
await caso('Ningún error de JavaScript', async () => { assert.deepEqual(errs, []); });
await browser.close();
console.log(fallos ? `\n❌ ${fallos} caso(s) fallaron` : '\n✅ todos los casos pasaron'); process.exit(fallos ? 1 : 0);
