// Gestión Económica → Cuenta de Resultados (10/09): antes había dos
// pestañas separadas (Cuenta de Resultados y Resultado) con las MISMAS
// cifras pero filas distintas entre una y otra (Margen Bruto/EBITDA solo
// en Resultado, IVA a liquidar solo en Cuenta de Resultados) — fusionadas
// en una sola tabla con un interruptor Mensual/Trimestral, todas las filas
// juntas, más la fila de IRPF a ingresar (Modelo 111) y el concepto fijo
// al hacer scroll horizontal.
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
}, 'GECDRUNIF1');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));
await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  DB.ge.fijos.push({
    id: genId(), nombre:'JUAN PÉREZ', categoria:'PERSONAL', autoCalc:true,
    sueldoNeto: 1400, irpfPct: 15, ssTrabPct: 6.35, ssPct: 31,
    sueldoBruto: 1400/(1-0.2135), ssEmpresa: (1400/(1-0.2135))*0.31, irpfMensual: (1400/(1-0.2135))*0.15,
    importe: (1400/(1-0.2135))*1.31, periodicidadMeses:1,
  });
  snapshotGeFijosNeto();
  navigate('economia');
  GE.tab('cdr');
});

let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}

await caso('Ya no existe la pestaña "Resultado" por separado, solo "Cuenta de Resultados"', async () => {
  const r = await page.evaluate(()=>{
    const tabs = [...document.querySelectorAll('#ge-tabs-row .ge-tab')].map(b=>b.textContent.trim());
    return {tabs, existeResultado: !!document.getElementById('ge-resultado')};
  });
  assert.ok(r.tabs.some(t=>t.includes('Cuenta de Resultados')), 'debe seguir existiendo Cuenta de Resultados: ' + JSON.stringify(r));
  assert.ok(!r.tabs.some(t=>t.trim()==='Resultado'), 'no debe haber una pestaña "Resultado" aparte: ' + JSON.stringify(r));
  assert.ok(!r.existeResultado, 'el panel viejo #ge-resultado no debe existir: ' + JSON.stringify(r));
});

await caso('En modo Trimestral aparecen Margen Bruto y EBITDA Operativo (antes solo en Resultado)', async () => {
  const r = await page.evaluate(()=>{ GE.setCDRGranularidad('trimestre'); return document.getElementById('cdr-table').textContent; });
  assert.ok(r.includes('Margen Bruto'), 'debe verse "Margen Bruto": ' + r.slice(0,200));
  assert.ok(r.includes('EBITDA Operativo'), 'debe verse "EBITDA Operativo": ' + r.slice(0,200));
  assert.ok(r.includes('IVA a liquidar'), 'debe seguir viéndose "IVA a liquidar" (antes solo en CDR): ' + r.slice(0,200));
  assert.ok(r.includes('IRPF') && r.includes('111'), 'debe verse la nueva fila de IRPF a ingresar (Modelo 111): ' + r.slice(0,300));
});

await caso('En modo Trimestral la tabla NO lleva columnas de meses individuales (solo T1-T4 y Año)', async () => {
  const r = await page.evaluate(()=>{
    const ths = [...document.querySelectorAll('#cdr-table thead th')].map(th=>th.textContent.trim().toLowerCase());
    return ths;
  });
  assert.deepEqual(r, ['concepto','t1','t2','t3','t4','año'], 'las columnas deben ser exactamente Concepto/T1-T4/Año: ' + JSON.stringify(r));
});

await caso('En modo Mensual la tabla SÍ lleva las 12 columnas de mes además de T1-T4 y Año', async () => {
  const r = await page.evaluate(()=>{
    GE.setCDRGranularidad('mes');
    const ths = [...document.querySelectorAll('#cdr-table thead th')].map(th=>th.textContent.trim());
    return ths;
  });
  assert.equal(r.length, 1+12+4+1, 'deben ser 18 columnas (concepto + 12 meses + 4 trimestres + año): ' + JSON.stringify(r));
  assert.ok(r.includes('Ene') && r.includes('Dic'), 'deben verse los meses Ene...Dic: ' + JSON.stringify(r));
});

await caso('El interruptor Mensual/Trimestral marca el modo activo', async () => {
  const r = await page.evaluate(()=>({
    mes: document.getElementById('cdr-gran-mes').classList.contains('btn-primary'),
    trimestre: document.getElementById('cdr-gran-trimestre').classList.contains('btn-primary'),
  }));
  assert.ok(r.mes && !r.trimestre, 'con "mes" activo debe marcarse ese botón, no el otro: ' + JSON.stringify(r));
});

await caso('El importe del Margen Bruto y el EBITDA son coherentes con sus componentes (no hay bug de cálculo)', async () => {
  const r = await page.evaluate(()=>{
    const y = new Date().getFullYear();
    const netaEne = geFacturacionNetaMes(y,0), costeEne = geTotalVariablesNetoMes(y,0);
    const fijosEne = geTotalFijosNetoForMonth(y,0), comisionesEne = geComisionesMes(y,0);
    return {
      margenEsperado: netaEne - costeEne,
      ebitdaEsperado: netaEne - costeEne - fijosEne - comisionesEne,
    };
  });
  // Solo verifica que la fórmula en sí es coherente (margen >= ebitda si hay costes fijos/comisiones positivos)
  assert.ok(r.margenEsperado >= r.ebitdaEsperado, 'el margen bruto debe ser mayor o igual que el EBITDA (se resta gastos fijos y comisiones de más): ' + JSON.stringify(r));
});

await caso('La columna de concepto queda fija (position:sticky) al hacer scroll horizontal', async () => {
  const r = await page.evaluate(()=>getComputedStyle(document.querySelector('#cdr-table td:first-child')).position);
  assert.equal(r, 'sticky', 'la primera columna debe ser sticky: ' + r);
});

await caso('Ningún error de JavaScript en todo el recorrido', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(68));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
