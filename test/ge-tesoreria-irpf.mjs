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

await caso('La previsión a 30/60/90 días usa el resultado NETO (después de impuestos), no el de antes de impuestos', async () => {
  const r = await page.evaluate(()=>{
    const hoy = new Date();
    let m = hoy.getMonth(), y = hoy.getFullYear();
    // Mes anterior con ventas reales y sin gastos, para que el resultado
    // antes/después de impuestos sean claramente distintos (25% de diferencia).
    m -= 1; if(m<0){ m=11; y-=1; }
    const fecha = `${y}-${String(m+1).padStart(2,'0')}-10`;
    DB.sales = [{id: genId(), date: fecha, total: 11000, propina:0, subtotal:11000, tipo:'mesa', items:[{name:'Menú', qty:100, price:100, ivaPct:10}], status:'pagada', metodoPago:'Tarjeta'}];
    DB.ge.fijos = [];
    DB.ge.variables = [];
    DB.ge.capex = [];
    DB.ge.config.pctImpuestoBeneficio = 25;
    saveDB();
    GE.tab('tesoreria');
    const box = document.getElementById('te-forecast').textContent;
    // Con solo ese mes de histórico (los otros dos meses previos en 0), el
    // promedio de 3 meses = resultadoDelMesDePrueba / 3. Comprobamos que la
    // proyección a 30 días coincide con el NETO (post-impuestos) y no con
    // el bruto (antes de impuestos) — que sería un 33% más alto.
    const bruto = geResultadoAntesImpMes(y, m);
    const pctImp = 0.25;
    const neto = bruto>0 ? bruto*(1-pctImp) : bruto;
    const netoProj30 = (neto / 3 / 30.4) * 30;
    const brutoProj30 = (bruto / 3 / 30.4) * 30;
    return {box, netoProj30, brutoProj30};
  });
  const numsEnBox = (r.box.match(/-?[\d.,]+\s?€/g) || []).map(s => parseFloat(s.replace(/[^\d,.-]/g,'').replace(/\.(?=\d{3})/g,'').replace(',','.')));
  const cerca = (a,b) => Math.abs(a-b) < 1;
  assert.ok(numsEnBox.some(n => cerca(n, r.netoProj30)), 'la previsión a 30 días debe coincidir con el resultado NETO (post-impuestos): ' + JSON.stringify({numsEnBox, ...r}));
  assert.ok(!numsEnBox.some(n => cerca(n, r.brutoProj30)), 'no debe coincidir con el resultado bruto (antes de impuestos), que sobreestimaría la caja: ' + JSON.stringify({numsEnBox, ...r}));
});

await caso('Ningún error de JavaScript en todo el recorrido', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(68));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
