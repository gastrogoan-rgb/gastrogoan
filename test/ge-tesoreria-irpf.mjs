// Tesorería (10/09): igual que ya existía "Reserva IVA (modelo 303)"
// acumulada del trimestre en curso, ahora hay una fila equivalente para el
// IRPF retenido a los empleados — se declara/ingresa también cada
// trimestre (Modelo 111) y antes no había ningún sitio que lo acumulara,
// solo la cifra suelta del mes en Gastos Fijos. También se corrige la
// previsión a 30/60/90 días para que use el resultado NETO (después de
// impuestos), no el de antes de impuestos, que sobreestimaba la caja real.
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
}, 'GETEIRPF1');
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

await caso('Con un empleado con IRPF calculado, Tesorería muestra "IRPF retenido" acumulado del trimestre', async () => {
  const r = await page.evaluate(()=>{
    DB.ge.fijos = [{
      id: genId(), nombre:'JUAN PÉREZ', categoria:'PERSONAL', autoCalc:true,
      sueldoNeto: 1400, irpfPct: 15, ssTrabPct: 6.35, ssPct: 31,
      sueldoBruto: 1400/(1-0.2135), ssEmpresa: (1400/(1-0.2135))*0.31, irpfMensual: (1400/(1-0.2135))*0.15,
      importe: (1400/(1-0.2135))*1.31, periodicidadMeses:1,
    }];
    snapshotGeFijosNeto();
    navigate('economia');
    GE.tab('tesoreria');
    return document.getElementById('te-rows').textContent;
  });
  assert.ok(r.toLowerCase().includes('irpf retenido'), 'debe aparecer una fila "IRPF retenido": ' + r);
  assert.ok(/T\d \(/.test(r), 'debe llevar la etiqueta del trimestre (T1/T2/T3/T4): ' + r);
});

await caso('Sin ningún empleado con IRPF calculado, la fila de IRPF no aparece (no aporta nada en 0)', async () => {
  const r = await page.evaluate(()=>{
    DB.ge.fijos = [];
    snapshotGeFijosNeto();
    GE.tab('tesoreria');
    return document.getElementById('te-rows').textContent;
  });
  assert.ok(!r.toLowerCase().includes('irpf retenido'), 'sin IRPF que reservar, la fila no debe pintarse: ' + r);
});

// Previsión de tesorería = misma cuenta que «Previsión de liquidez» (Beneficio y caja): lo que ENTRA es el ritmo medio de CAJA, no el
// resultado contable. Cuentas a mano: un único mes con actividad, 100 menús × 100 € (el precio YA lleva el IVA del 10 %) = 10.000 cobrados
// → base 9.090,91 + IVA 909,09. Sin gastos: resultado antes de impuestos 9.090,91; el impuesto (25 %, 2.272,73) está provisionado pero no
// pagado y el IVA cobrado (909,09) sigue en caja → caja del mes = 6.818,18 + 2.272,73 + 909,09 = 10.000,00 (justo lo cobrado).
// Con un solo mes de histórico el ritmo es 10.000/mes: 30 días +10.000, 60 +20.000, 90 +30.000.
await caso('La previsión de tesorería a 30/60/90 días parte de la CAJA (10.000/mes), no del resultado contable', async () => {
  const r = await page.evaluate(()=>{
    const hoy = new Date();
    let m = hoy.getMonth(), y = hoy.getFullYear();
    m -= 1; if(m<0){ m=11; y-=1; }
    const fecha = `${y}-${String(m+1).padStart(2,'0')}-10`;
    DB.sales = [{id: genId(), date: fecha, total: 11000, propina:0, subtotal:11000, tipo:'mesa', items:[{name:'Menú', qty:100, price:100, ivaPct:10}], status:'pagada', metodoPago:'Tarjeta'}];
    DB.ge.fijos = []; DB.ge.variables = []; DB.ge.capex = []; DB.ge.obligaciones = {}; delete DB.ge.saldoBanco;
    DB.ge.config.pctImpuestoBeneficio = 25;
    saveDB();
    GE.tab('tesoreria');
    const box = document.getElementById('te-forecast');
    return {texto: box.textContent, estim: [...box.querySelectorAll('.ge-kpi .sub')].map(e => e.textContent)};
  });
  const num = s => parseFloat(s.replace(/[^\d,-]/g, '').replace(/\.(?=\d{3})/g,'').replace(',', '.'));
  const entra = r.estim.map(x => { const m = /Entra \(estim\.\)\s*\+([\d.,]+)/.exec(x); return m ? num(m[1].replace(/\./g,'')) : NaN; });
  assert.ok(Math.abs(entra[0] - 10000) < 1 && Math.abs(entra[1] - 20000) < 1 && Math.abs(entra[2] - 30000) < 1, 'lo que entra debe ser 10.000 / 20.000 / 30.000: ' + JSON.stringify(r));
});

await caso('Ningún error de JavaScript en todo el recorrido', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(68));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
