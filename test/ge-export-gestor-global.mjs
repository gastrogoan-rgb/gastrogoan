// Revisión global de conexiones de Gestión Económica (10/09, tercera ronda):
// - Exportación al gestor: "Resultado del mes" descontaba la cuota CAPEX
//   financiada, pero el resumen mostraba el importe TOTAL comprado (sumCapexBase)
//   bajo la misma etiqueta — las dos cifras del mismo informe no cuadraban.
//   Ahora la fila del resumen muestra la cuota realmente descontada.
// - El IVA soportado en la comisión de las plataformas de delivery faltaba
//   en "IVA a liquidar" del informe — desincronizado de ivaLiquidarMes (CDR).
// - El desglose de IVA por tipo (21/10/4%) del informe usaba la configuración
//   ACTUAL de gastos fijos para meses pasados, mientras el resumen del mismo
//   informe usaba el histórico real — dos cifras contradictorias.
// - requestCancelSale (TPV) no respetaba el cierre de mes de Gestión Económica.
// - DB.ge.cierres/fijosLog (sin `id`) cayían en la rama "sin id → manda la
//   nube entera" de mergeArraysById: un cierre reciente sin subir, o una
//   entrada de fijosLog añadida en otro dispositivo, se perdían sin aviso.
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
}, 'GEGLOBAL1');
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

await caso('Informe al gestor: la fila de CAPEX del resumen coincide con lo que resta a Resultado del mes (antes: mostraba el total comprado)', async () => {
  const r = await page.evaluate(()=>{
    const y = new Date().getFullYear(), m = new Date().getMonth();
    const mesStr = `${y}-${String(m+1).padStart(2,'0')}`;
    DB.sales = [{id: genId(), date: `${mesStr}-05`, total: 1100, propina:0, subtotal:1100, tipo:'mesa', items:[{name:'Menú', qty:10, price:110, ivaPct:10}], status:'pagada', metodoPago:'Tarjeta'}];
    DB.ge.fijos = []; DB.ge.variables = [];
    // Una compra CAPEX al contado de 3000€ (no financiada) y otra financiada
    // a 24 cuotas de 100€/mes empezando este mismo mes.
    DB.ge.capex = [
      {id: genId(), descripcion:'Horno (contado)', importe:3000, iva:21, fecha:`${mesStr}-02`, financiado:false},
      {id: genId(), descripcion:'Cámara (financiada)', importe:2400, iva:21, fecha:`${mesStr}-01`, financiado:true, cuotaMensual:100, cuotas:24},
    ];
    saveDB();
    let capturedRows = null;
    const origDownload = window.downloadCSV;
    window.downloadCSV = (rows) => { capturedRows = rows; };
    GE.openExportModal();
    document.getElementById('exp-mes').value = String(m);
    document.getElementById('exp-anyo').value = String(y);
    GE.exportMonth();
    window.downloadCSV = origDownload;
    const flat = capturedRows.map(r => r.join('|'));
    const capexQuotaRow = flat.find(r => /Cuota CAPEX financiado/.test(r));
    const resultRow = flat.find(r => /Resultado del mes/.test(r));
    return {capexQuotaRow, resultRow};
  });
  assert.ok(r.capexQuotaRow, 'debe existir la fila de cuota CAPEX: ' + JSON.stringify(r));
  const capexQuota = parseFloat(r.capexQuotaRow.split('|').pop().replace(',', '.'));
  const resultado = parseFloat(r.resultRow.split('|').pop().replace(',', '.'));
  assert.ok(Math.abs(capexQuota - 100) < 0.01, 'la cuota CAPEX debe ser la mensual financiada (100€), no el total comprado: ' + r.capexQuotaRow);
  // Ingresos netos ~1000€ (1100 con 10% IVA) - cuota CAPEX 100€ = ~900€.
  assert.ok(Math.abs(resultado - 900) < 1, `Resultado del mes debe cuadrar con la cuota CAPEX mostrada (esperado ~900€, salió ${resultado})`);
});

await caso('requestCancelSale bloquea anular una venta de un mes ya cerrado en Gestión Económica, avisando con un toast', async () => {
  const r = await page.evaluate(()=>{
    const y = new Date().getFullYear(), m = new Date().getMonth();
    const mesStr = `${y}-${String(m+1).padStart(2,'0')}`;
    const sale = {id: genId(), date: `${mesStr}-03`, total: 50, status:'pagada', items:[]};
    DB.sales = [sale];
    DB.ge.cierres = [mesStr];
    saveDB();
    let toastShown = false;
    const origToast = window.showToast;
    window.showToast = (msg) => { toastShown = true; };
    let pinAskeado = false;
    const origPin = window.requestBusinessPinAction;
    window.requestBusinessPinAction = () => { pinAskeado = true; };
    requestCancelSale(sale.id);
    window.showToast = origToast;
    window.requestBusinessPinAction = origPin;
    return {toastShown, pinAskeado, saleStatus: DB.sales[0].status};
  });
  assert.equal(r.pinAskeado, false, 'no debe siquiera pedir el PIN si el mes está cerrado: ' + JSON.stringify(r));
  assert.equal(r.toastShown, true, 'debe avisar con un toast del motivo, no fallar en silencio: ' + JSON.stringify(r));
  assert.equal(r.saleStatus, 'pagada', 'la venta no debe quedar anulada: ' + JSON.stringify(r));
});

await caso('requestCancelSale SÍ permite anular una venta de un mes abierto', async () => {
  const r = await page.evaluate(()=>{
    const y = new Date().getFullYear(), m = new Date().getMonth();
    const mesStr = `${y}-${String(m+1).padStart(2,'0')}`;
    const sale = {id: genId(), date: `${mesStr}-03`, total: 50, status:'pagada', items:[]};
    DB.sales = [sale];
    DB.ge.cierres = [];
    saveDB();
    let pinAskeado = false;
    const origPin = window.requestBusinessPinAction;
    window.requestBusinessPinAction = () => { pinAskeado = true; };
    requestCancelSale(sale.id);
    window.requestBusinessPinAction = origPin;
    return {pinAskeado};
  });
  assert.equal(r.pinAskeado, true, 'con el mes abierto sí debe pedir el PIN como siempre: ' + JSON.stringify(r));
});

await caso('mergeGeCierres: un cierre hecho aquí y aún no subido sobrevive a una sincronización con una nube que todavía no lo tiene', async () => {
  const r = await page.evaluate(()=>{
    const antes = ['2026-07']; // foto de la última sincronización (antes de cerrar agosto aquí)
    const local = ['2026-07', '2026-08']; // se cerró agosto en este dispositivo
    const remote = ['2026-07']; // la nube todavía no tiene agosto
    const merged = mergeGeCierres(local, remote, JSON.stringify({cierres: antes}));
    return merged;
  });
  assert.ok(r.includes('2026-08'), 'el cierre local reciente no debe perderse: ' + JSON.stringify(r));
});

await caso('mergeGeCierres: reabrir un mes aquí (borrarlo) SÍ se respeta si la nube ya lo tenía en la foto anterior', async () => {
  const r = await page.evaluate(()=>{
    const antes = ['2026-07', '2026-08']; // foto de la última sincronización
    const local = ['2026-07']; // aquí se reabrió (borró) agosto
    const remote = ['2026-07', '2026-08']; // la nube todavía tiene el cierre viejo
    const merged = mergeGeCierres(local, remote, JSON.stringify({cierres: antes}));
    return merged;
  });
  assert.ok(!r.includes('2026-08'), 'el mes reabierto no debe resucitar: ' + JSON.stringify(r));
});

await caso('mergeFijosLog: una entrada añadida aquí y otra en la nube (mismo día no) se unen sin perder ninguna', async () => {
  const r = await page.evaluate(()=>{
    const local = [{fecha:'2026-08-01', totalNeto:1000, totalGross:1100}, {fecha:'2026-09-01', totalNeto:1200, totalGross:1300}];
    const remote = [{fecha:'2026-08-01', totalNeto:1000, totalGross:1100}];
    return mergeFijosLog(local, remote);
  });
  assert.equal(r.length, 2, 'debe conservar la entrada local que la nube aún no tenía: ' + JSON.stringify(r));
});

await caso('Ningún error de JavaScript en todo el recorrido', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(68));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
