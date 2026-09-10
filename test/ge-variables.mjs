// Gestión Económica → Gastos Variables (10/09, revisión contable):
// - Meses centrados bajo el año (igual que Ventas/Fijos).
// - El objetivo de food cost (antes solo visible, solo editable desde
//   Punto de Equilibrio sin ningún aviso de dónde) ahora se puede editar
//   directamente desde aquí, con un lápiz junto al propio dato.
// - Verificación de que un pedido a proveedor marcado "Recibido" siempre
//   genera su gasto variable correspondiente, y que revertir la recepción
//   lo retira (no deja gasto huérfano).
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
}, 'GEVARIABLES1');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));
await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  navigate('economia');
  GE.tab('variables');
});

let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}

await caso('El selector de meses queda centrado', async () => {
  const r = await page.evaluate(()=>getComputedStyle(document.getElementById('gv-months')).justifyContent);
  assert.equal(r, 'center', 'la fila de meses debe estar centrada: ' + r);
});

await caso('El objetivo de food cost se puede editar desde aquí, y queda guardado en config().foodCostObj', async () => {
  const r = await page.evaluate(()=>{
    window.__promptedWith = null;
    window.promptText = async (msg, def) => { window.__promptedWith = {msg, def}; return '28'; };
    return GE.editFoodCostObj().then(()=>({
      guardado: DB.ge.config.foodCostObj,
      prompted: window.__promptedWith,
      kpiTexto: document.getElementById('gv-kpis').textContent,
    }));
  });
  assert.equal(r.guardado, 28, 'debe guardarse el nuevo objetivo en config().foodCostObj: ' + JSON.stringify(r));
  assert.equal(r.prompted.def, '35', 'el prompt debe partir del valor actual (35% por defecto): ' + JSON.stringify(r));
  assert.ok(r.kpiTexto.includes('28'), 'el KPI debe reflejar ya el nuevo objetivo: ' + r.kpiTexto);
});

await caso('El objetivo de food cost y el "% Gastos Variables" de Tesorería son EL MISMO número, no dos separados', async () => {
  const r = await page.evaluate(()=>{
    // Editar desde Gastos Variables debe dejar el reparto de Tesorería
    // (distPct) con "mp" ya sincronizado al nuevo objetivo, reajustando el
    // resto para seguir sumando 100.
    const dp = DB.ge.config.distPct;
    const suma = dp ? ['per','gf','mp','og','ben'].reduce((s,k)=>s+(dp[k]||0),0) : null;
    GE.tab('tesoreria');
    const teTexto = document.getElementById('te-pct-mp')?.value;
    return {dp, suma, teTexto};
  });
  assert.ok(r.dp, 'debe existir un reparto en Tesorería tras editar el objetivo desde Gastos Variables: ' + JSON.stringify(r));
  assert.equal(r.dp.mp, 28, 'el "% Gastos Variables" de Tesorería debe quedar igual al nuevo objetivo (28%): ' + JSON.stringify(r));
  assert.ok(Math.abs(r.suma - 100) < 0.01, 'el reparto debe seguir sumando 100% tras el reajuste: ' + JSON.stringify(r));
  assert.equal(r.teTexto, '28', 'el propio input de Tesorería debe mostrar 28 al volver a esa pestaña: ' + JSON.stringify(r));
});

await caso('Un pedido a proveedor marcado "Recibido" genera su gasto variable correspondiente', async () => {
  const r = await page.evaluate(()=>{
    const ingId = genId();
    DB.ingredients.push({id: ingId, name:'Tomate', category:'Verduras', area:'cocina', price: 2, unit:'kg', iva: 10, activo:true, supplier:'Frutas García'});
    const pedidoId = genId();
    DB.purchaseOrders = DB.purchaseOrders || [];
    DB.purchaseOrders.push({
      id: pedidoId, supplier:'Frutas García', estado:'ENVIADO', area:'cocina',
      items:[{ingredientId: ingId, cantidad: 10, cantidadRecibida:0, recibidoCheck: true}],
    });
    pedidoDetailId = pedidoId;
    changePedidoEstado('RECIBIDO');
    saveDB();
    const gasto = DB.ge.variables.find(v => v.pedidoId === pedidoId);
    return {existeGasto: !!gasto, proveedor: gasto?.proveedor, importe: gasto?.importe, pedidoId};
  });
  assert.ok(r.existeGasto, 'el pedido recibido debe generar un gasto variable: ' + JSON.stringify(r));
  assert.equal(r.proveedor, 'Frutas García', 'el gasto debe llevar el proveedor correcto: ' + JSON.stringify(r));
  assert.equal(r.importe, 20, '10kg × 2€ = 20€ de base: ' + JSON.stringify(r));
});

await caso('Revertir la recepción retira el gasto variable (no deja huérfanos)', async () => {
  const r = await page.evaluate(()=>{
    const o = DB.purchaseOrders.find(x=>x.estado==='RECIBIDO');
    reallyRevertPedidoRecepcion(o.id, null);
    return DB.ge.variables.some(v => v.pedidoId === o.id);
  });
  assert.equal(r, false, 'tras revertir, no debe quedar ningún gasto ligado a ese pedido: ' + r);
});

await caso('Ningún error de JavaScript en todo el recorrido', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(68));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
