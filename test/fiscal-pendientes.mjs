// PENDIENTES DEL MOTOR FISCAL, CERRADOS (18/11/2026). Cifras esperadas hechas A MANO (o con un cálculo aparte), NUNCA con el código de la app:
// si falla, o la app o la norma cambió; no se «arregla» copiando lo que sale.
//  1) 5 % de difícil justificación DENTRO del 130 — AEAT, instrucciones del modelo 130 (casilla 02, modalidad simplificada) y Manual de Renta 2025:
//     5 % del rendimiento neto positivo, máximo 2.000 € al año (en atribución de rentas, el tope es de cada socio).
//  2) Mínimo personal y familiar AUTONÓMICO — AEAT, Manual de Renta 2025 y 2024, cuadro de mínimos: el estatal se descuenta de la cuota estatal
//     y el autonómico de la autonómica.
//  3-4) Recargo de equivalencia, prorrata, IVA simplificado y criterio de caja: documentados como «no aplica» / «fuera del alcance».
//  5) Ejercicio 2024 — escalas de Asturias, Canarias y Cataluña de 2024 (AEAT, Manual de Renta 2024) y tipos del IS 2024 (tabla de la AEAT).
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
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'FISPEN01', tenantId: ggBizTenantId('FISPEN01')}));
  localStorage.setItem('gastrogoan_owner_login', '1'); localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted', '1'); localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
});
await page.reload({waitUntil:'domcontentloaded'}); await new Promise(r => setTimeout(r, 2000));
await page.evaluate(async () => {
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id => document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, cif:'B12345678'});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  DB.license = {code:'FISPEN01', tenantId: ggBizTenantId('FISPEN01')};
  currentFolder = 'gestion'; ownerUnlocked = true; navigate('economia'); await new Promise(r => setTimeout(r, 400));
});
// El mismo negocio de siempre: 2025, 12 meses iguales (10.000 base + 1.000 IVA de ventas; alquiler 500 + 21 %; nómina de coste 2.000 con 300 de IRPF)
async function escenario(forma, extra, lic){
  return page.evaluate(async (forma, extra, lic) => {
    const y = new Date().getFullYear() - 1, dd = n => String(n).padStart(2, '0');
    ['formaJuridica','regimenFiscal','comuneros','incnAnterior','anyo','modalidadDirecta','otrasRentasTitular','hijosTitular','inicioActividad20','territorio','fiscalFijado'].forEach(k => delete DB.business[k]);
    Object.assign(DB.business, {formaJuridica:forma, regimenFiscal:'directa', anyo:2010}, extra || {});
    DB.license = {code:'FISPEN01', tenantId: ggBizTenantId('FISPEN01'), ...(lic ? {fiscal: lic} : {})};
    DB.sales = []; for(let m = 1; m <= 12; m++){ const f = `${y}-${dd(m)}-10`; DB.sales.push({id:'v' + m, date:f, createdAt:f + 'T14:00:00', total:11000, tipo:'mesa', metodoPago:'Tarjeta', items:[{name:'P', qty:1, price:11000, ivaPct:10}]}); }
    DB.ge = DB.ge || {}; DB.ge.config = {}; DB.ge.variables = []; DB.ge.capex = []; DB.ge.fijosLog = []; DB.ge.existencias = {}; DB.ge.otrosIngresos = []; DB.ge.vales = []; DB.ge.obligaciones = {};
    DB.ge.fijos = [{id:1, nombre:'ALQUILER', importe:500, periodicidadMeses:1, categoria:'FIJOS', iva:21},
      {id:2, nombre:'ANA', categoria:'PERSONAL', autoCalc:true, sueldoNeto:1300, irpfPct:15, ssTrabPct:6.5, ssPct:32.15, sueldoBruto:1500, ssEmpresa:500, irpfMensual:300, importe:2000, periodicidadMeses:1, iva:0}];
    snapshotGeFijosNeto(); saveDB(); await new Promise(r => setTimeout(r, 30));
  }, forma, extra, lic);
}
const año = () => new Date().getFullYear() - 1;

// Ayuda: IRPF de una actividad con un perfil dado (no deja rastro en DB.business).
const ir = (rend, bz, opts) => page.evaluate((r, bz, o) => { const b = DB.business; const antes = {...b};
  Object.assign(b, {formaJuridica:'autonomo', regimenFiscal:'directa', modalidadDirecta:'simplificada', otrasRentasTitular:0, hijosTitular:0, inicioActividad20:false, territorio:'general'}, bz || {});
  const v = irpfActividad(r, o || {}); Object.keys(b).forEach(k => delete b[k]); Object.assign(b, antes); return v; }, rend, bz, opts);

// ---------- 1) 130 con el 5 % de difícil justificación ----------
await caso('130: el 5 % de difícil justificación va dentro del acumulado, con tope de 2.000 € AL AÑO; en la modalidad normal no hay 5 %', async () => {
  const r = await page.evaluate(() => { const b = DB.business, g = {...b}; Object.assign(b, {formaJuridica:'autonomo', regimenFiscal:'directa', modalidadDirecta:'simplificada'});
    const o = {a: pfDificilJustificacion(10000), b: pfDificilJustificacion(100000), c: pfDificilJustificacion(-500), d: pfDificilJustificacion(0)};
    b.modalidadDirecta = 'normal'; o.e = pfDificilJustificacion(100000);
    Object.keys(b).forEach(k => delete b[k]); Object.assign(b, g); return o; });
  cerca(r.a, 500, '5 % de 10.000'); cerca(r.b, 2000, '5 % de 100.000 = 5.000, tope 2.000'); cerca(r.c, 0, 'rendimiento negativo'); cerca(r.d, 0, 'cero'); cerca(r.e, 0, 'normal: sin 5 %');
});
await caso('130 con tope: acumulado 100.000 € → (100.000 − 2.000) × 20 % = 19.600 €; T2 con 150.000 € → (150.000 − 2.000) × 20 % − 19.600 = 10.000 € (el tope no se vuelve a descontar); en normal: 20.000 y 10.000', async () => {
  const f = bz => page.evaluate(bz => { const b = DB.business, g = {...b}; Object.assign(b, {formaJuridica:'autonomo', regimenFiscal:'directa', territorio:'general'}, bz);
    DB.ge.capex = []; DB.ge.variables = []; DB.ge.fijos = []; DB.ge.fijosLog = [];
    // total con IVA 10 %: 110.000 → 100.000 netos; 55.000 → 50.000 netos
    DB.sales = [{id:'1', date:'2025-02-10', total:110000, items:[{name:'x', price:110000, qty:1, ivaPct:10}]}, {id:'2', date:'2025-05-10', total:55000, items:[{name:'x', price:55000, qty:1, ivaPct:10}]}];
    const o = {t1: GE.pagoACuentaTrimestre(2, 2025), t2: GE.pagoACuentaTrimestre(5, 2025)}; Object.keys(b).forEach(k => delete b[k]); Object.assign(b, g); return o; }, bz);
  const s = await f({modalidadDirecta:'simplificada'}); cerca(s.t1.importe, 19600, 'T1 simplificada'); cerca(s.t2.importe, 10000, 'T2 simplificada');
  const n = await f({modalidadDirecta:'normal'}); cerca(n.t1.importe, 20000, 'T1 normal'); cerca(n.t2.importe, 10000, 'T2 normal');
});
await caso('130 de una comunidad de bienes: el tope de 2.000 € es de CADA comunero sobre su parte (50/50 de 100.000 → 2.500 cada uno, tope 2.000 → 4.000; 60/40 de 30.000 → 900 + 600 = 1.500)', async () => {
  const r = await page.evaluate(() => { const b = DB.business, g = {...b}; Object.assign(b, {formaJuridica:'cb', regimenFiscal:'directa', modalidadDirecta:'simplificada', comuneros:[{nombre:'A', pct:50}, {nombre:'B', pct:50}]});
    const o = {a: pfDificilJustificacion(100000)}; b.comuneros = [{nombre:'A', pct:60}, {nombre:'B', pct:40}]; o.b = pfDificilJustificacion(30000);
    Object.keys(b).forEach(k => delete b[k]); Object.assign(b, g); return o; });
  cerca(r.a, 4000, 'CB 50/50 de 100.000'); cerca(r.b, 1500, 'CB 60/40 de 30.000');
});

// ---------- 2) Mínimos personales y familiares autonómicos ----------
// Base de todos los casos: 30.000 € de rendimiento → 5 % = 1.500 → neto 28.500 (sin reducciones: pasa de 19.747,50 y de 12.000 €).
// Parte estatal: 12.450×9,5 % + 7.750×12 % + 8.300×15 % = 1.182,75 + 930 + 1.245 = 3.357,75 − 527,25 (cuota de 5.550) = 2.830,50.
await caso('Mínimo AUTONÓMICO — Madrid 2025: autonómica sobre 28.500 = 1.135,79 + 603,73 + 1.215,41 = 2.954,93 − 506,32 (cuota de 5.956,65) = 2.448,61 → total 5.279,12 €', async () => {
  cerca(await ir(30000, {territorio:'madrid'}, {año:2025}), 5279.11868, 'Madrid');
});
await caso('Mínimo AUTONÓMICO — Andalucía (5.790 €) = 2.830,50 + (1.235 + 972 + 1.110 − 550,05) = 5.597,45 €; Galicia con 2 hijos (estatal 10.650 €, autonómico 11.108 €) = 4.563,94 €', async () => {
  cerca(await ir(30000, {territorio:'andalucia'}, {año:2025}), 5597.45, 'Andalucía');
  cerca(await ir(30000, {territorio:'galicia', hijosTitular:2}, {año:2025}), 4563.938725, 'Galicia 2 hijos');
});
await caso('Comunidades que usan el mínimo estatal: Cataluña 2025 = 5.718,25 € (igual que antes de cargar los mínimos autonómicos) y los dos mínimos valen 5.550 € en CyL, La Rioja, Aragón, Cantabria, CLM, Extremadura, Murcia, Ceuta/Melilla y «sin comunidad»', async () => {
  cerca(await ir(30000, {territorio:'cataluna'}, {año:2025}), 5718.25, 'Cataluña 2025');
  const m = await page.evaluate(() => ['cataluna', 'cyl', 'rioja', 'aragon', 'cantabria', 'clm', 'extremadura', 'murcia', 'ceuta_melilla', 'general'].map(t => irpfMinimosTerritorio(t, 0, 2025)));
  m.forEach((x, i) => { cerca(x.estatal, 5550, 'estatal ' + i); cerca(x.auton, 5550, 'autonómico ' + i); });
});
await caso('Mínimo familiar: Madrid con 4 hijos = 5.956,65 + 2.575,85 + 2.897,83 + 4.400 + 4.950 = 20.780,33 €; con 3 = 15.830,33 €; estatal con 4 = 5.550 + 2.400 + 2.700 + 4.000 + 4.500 = 19.150 €', async () => {
  const r = await page.evaluate(() => ({m4: irpfMinimosTerritorio('madrid', 4, 2025), m3: irpfMinimosTerritorio('madrid', 3, 2025)}));
  cerca(r.m4.auton, 20780.33, 'Madrid 4'); cerca(r.m3.auton, 15830.33, 'Madrid 3'); cerca(r.m4.estatal, 19150, 'estatal 4');
});
await caso('La traza de Madrid cita IRPF-MIN-AUTONOMICO y IRPF-DIFICIL-5; la de Cataluña, IRPF-MIN-PERSONAL; las reglas del 130, los mínimos y el 5 % están verificadas', async () => {
  const r = await page.evaluate(() => { const b = DB.business, g = {...b}; Object.assign(b, {formaJuridica:'autonomo', regimenFiscal:'directa', modalidadDirecta:'simplificada', otrasRentasTitular:0, hijosTitular:0});
    b.territorio = 'madrid'; const m = irpfActividadDetalle(30000, {año:2025}).reglas; b.territorio = 'cataluna'; const c = irpfActividadDetalle(30000, {año:2025}).reglas;
    Object.keys(b).forEach(k => delete b[k]); Object.assign(b, g); return {m, c, est: ['IRPF-MIN-AUTONOMICO', 'IRPF-MIN-PERSONAL', 'IRPF-DIFICIL-5', 'PF-130'].map(id => fiscalRegla(id).estado)}; });
  assert.ok(r.m.includes('IRPF-MIN-AUTONOMICO') && r.m.includes('IRPF-DIFICIL-5')); assert.ok(r.c.includes('IRPF-MIN-PERSONAL') && !r.c.includes('IRPF-MIN-AUTONOMICO'));
  assert.deepEqual(r.est, ['verificada', 'verificada', 'verificada', 'verificada']);
});
await caso('Baleares: 5.550 € (6.105 € solo si el titular tiene más de 65 años: la app no sabe la edad) y la fiabilidad lo avisa', async () => {
  assert.equal((await page.evaluate(() => irpfMinimosTerritorio('baleares', 0, 2025))).auton, 5550);
  await escenario('autonomo', {}, {formaJuridica:'autonomo', regimenFiscal:'directa', modalidadDirecta:'simplificada', territorio:'baleares'});
  const a = await page.evaluate(() => fiscalTrazaAnual(new Date().getFullYear() - 1).avisos.join(' | ')); assert.match(a, /más de 65 años/);
});

// ---------- 3 y 4) IVA: recargo de equivalencia, prorrata, simplificado, criterio de caja ----------
await caso('Recargo de equivalencia NO aplica a un restaurante; prorrata y criterio de caja «fuera del alcance»; el simplificado ya es «módulos»; ninguna entra en el cálculo', async () => {
  const r = await page.evaluate(() => ({ids: ['IVA-RECARGO-EQUIV', 'IVA-PRORRATA', 'IVA-SIMPLIFICADO', 'IVA-CRITERIO-CAJA'].map(id => { const x = fiscalRegla(id); return {id, estado: x.estado, fuente: x.fuente, nota: !!x.nota}; }),
    avisos: fiscalTrazaAnual(new Date().getFullYear()).avisos.join(' | ')}));
  assert.deepEqual(r.ids.map(x => x.estado), ['noaplica', 'fuera', 'noaplica', 'fuera']);
  r.ids.forEach(x => { assert.match(x.fuente, /AEAT|BOE/, x.id); assert.ok(x.nota, x.id); });
  assert.doesNotMatch(r.avisos, /IVA-(RECARGO|PRORRATA|SIMPLIFICADO|CRITERIO)/);
});

// ---------- 5) Ejercicio 2024 ----------
await caso('Escalas autonómicas 2024 (AEAT, Manual de Renta 2024), 30.000 €: Asturias (sin mínimo propio en 2024) 5.662,36 € frente a 5.543,41 € en 2025; Canarias 5.503,79 € (mínimo 5.606 €) frente a 5.486,71 €; Cataluña 5.771,86 € frente a 5.718,25 €', async () => {
  // Canarias 2024: 13.465×9 % = 1.211,85 + 5.557×11,5 % = 639,06 + 9.478×14 % = 1.326,92 = 3.177,83 − 504,54 (5.606 × 9 %) = 2.673,29 + 2.830,50 = 5.503,79.
  // Asturias 2024: 12.450×10 % = 1.245 + 5.257,20×12 % = 630,86 + 10.792,80×14 % = 1.510,99 = 3.386,86 − 555 (mínimo 5.550 al 10 %) = 2.831,86; + estatal 2.830,50 = 5.662,36
  cerca(await ir(30000, {territorio:'asturias'}, {año:2024}), 5662.356, 'Asturias 2024'); cerca(await ir(30000, {territorio:'asturias'}, {año:2025}), 5543.406, 'Asturias 2025');
  cerca(await ir(30000, {territorio:'canarias'}, {año:2024}), 5503.785, 'Canarias 2024'); cerca(await ir(30000, {territorio:'canarias'}, {año:2025}), 5486.71, 'Canarias 2025');
  cerca(await ir(30000, {territorio:'cataluna'}, {año:2024}), 5771.856, 'Cataluña 2024'); cerca(await ir(30000, {territorio:'cataluna'}, {año:2025}), 5718.25, 'Cataluña 2025');
});
await caso('Las demás comunidades dan en 2024 lo mismo que en 2025 (la AEAT publica las mismas escalas y mínimos): Madrid, Andalucía, Galicia, Valencia, Murcia, La Rioja, Baleares, Aragón, Cantabria, CLM, CyL, Extremadura, Ceuta/Melilla', async () => {
  for(const t of ['madrid', 'andalucia', 'galicia', 'valencia', 'murcia', 'rioja', 'baleares', 'aragon', 'cantabria', 'clm', 'cyl', 'extremadura', 'ceuta_melilla']){
    cerca(await ir(30000, {territorio:t}, {año:2024}), await ir(30000, {territorio:t}, {año:2025}), t);
  }
});
await caso('IS 2024 a mano: microempresa (INCN < 1 M€) 60.000 € × 23 % = 13.800; reducida dimensión 100.000 € × 25 % = 25.000; nueva creación 40.000 € × 15 % = 6.000; 2025 sigue en 21 %/22 % (60.000 → 10.500 + 2.200 = 12.700)', async () => {
  const r = await page.evaluate(() => ({m: impuestoSociedades(60000, {año:2024, incnAnterior:500000}), e: impuestoSociedades(100000, {año:2024, incnAnterior:5000000}), n: impuestoSociedades(40000, {año:2024, nuevaCreacion:true, incnAnterior:500000}), m25: impuestoSociedades(60000, {año:2025, incnAnterior:500000})}));
  cerca(r.m, 13800, 'micro 2024'); cerca(r.e, 25000, 'reducida 2024'); cerca(r.n, 6000, 'nueva 2024'); cerca(r.m25, 12700, 'micro 2025');
});
await caso('Cooperativa 2024 a mano (excedente 100.000, FEP 5 %, 50 % del FRO al 20 % → base 85.000) × 20 % = 17.000, y la traza avisa con fiabilidad media', async () => {
  const r = await page.evaluate(() => { const b = DB.business, g = {...b}; Object.assign(b, {formaJuridica:'cooperativa', coopTipo:'protegida', coopFep:5, coopFro:20}); const v = impuestoCooperativa(100000, {año:2024, incnAnterior:500000}); Object.keys(b).forEach(k => delete b[k]); Object.assign(b, g); return v; });
  cerca(r, 17000, 'cooperativa 2024');
  await escenario('cooperativa', {coopTipo:'protegida', coopFep:5, coopFro:20}, null);
  const m = await page.evaluate(() => fiscalTrazaAnual(2024).avisos.join(' | ')); assert.match(m, /Cooperativa en 2024/);
});
await caso('Fiabilidad por ejercicio: 2023 es «baja» (regla ANTES-2025 hasta 2023); 2024 ya NO avisa de que las reglas no existen', async () => {
  await escenario('autonomo', {modalidadDirecta:'simplificada'}, null);
  const r = await page.evaluate(() => ({a23: fiscalTrazaAnual(2023).avisos.join(' | '), a24: fiscalTrazaAnual(2024).avisos.join(' | '), n23: fiscalTrazaAnual(2023).nivel, ant: fiscalRegla('ANTES-2025')}));
  assert.match(r.a23, /empiezan en 2024/); assert.doesNotMatch(r.a24, /empiezan en 2024/); assert.equal(r.n23, 'baja');
  assert.equal(r.ant.hasta, '2023-12-31'); assert.equal(r.ant.estado, 'pendiente');
});
await caso('Ningún error de JavaScript', async () => { assert.deepEqual(errs, []); });
await browser.close();
console.log(fallos ? `\n❌ ${fallos} caso(s) fallaron` : '\n✅ todos los casos pasaron'); process.exit(fallos ? 1 : 0);
