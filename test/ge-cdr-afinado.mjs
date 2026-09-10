// Cuenta de Resultados: segunda vuelta pedida por el dueño tras la fusión
// (10/09):
// - Se quita "IVA soportado en compras (deducible)" — era un % fijo que se
//   aplicaba a cualquier compra sin IVA propio, cuando en realidad cada
//   compra ya lleva su IVA real (obligatorio al darla de alta).
// - La tarjeta "Facturación de {mes}" de arriba pasa a mostrar el total
//   CON IVA (antes mostraba la neta, que ya se ve más abajo en la tabla).
// - Tooltips al pasar el cursor por una columna de trimestre o de año, con
//   el desglose de los meses/trimestres que la componen.
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
}, 'GECDRAFIN1');
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

await caso('Ya no existe el campo "IVA soportado en compras" — cada compra usa su propio IVA', async () => {
  const r = await page.evaluate(()=>{
    navigate('economia');
    GE.tab('cdr');
    return {
      existeInput: !!document.getElementById('res-pct-iva-compras'),
      existeFn: typeof GE.setPctIvaCompras,
    };
  });
  assert.equal(r.existeInput, false, 'el campo del % fijo no debe existir: ' + JSON.stringify(r));
  assert.equal(r.existeFn, 'undefined', 'la función ya no debe estar expuesta: ' + JSON.stringify(r));
});

await caso('Un gasto variable con su propio IVA (21%) calcula el IVA soportado real, no un % genérico', async () => {
  await page.evaluate(()=>{
    const y = new Date().getFullYear(), m = new Date().getMonth();
    DB.ge.variables = [{id: genId(), categoria:'PACKAGING', proveedor:'Envases SA', importe:100, iva:21, mes:m, año:y, fecha:`${y}-${String(m+1).padStart(2,'0')}-05`}];
    saveDB();
  });
  const r2 = await page.evaluate(()=>{
    GE.tab('variables');
    const total = document.getElementById('gv-total-val').textContent;
    return total;
  });
  // Base 100€ + 21% IVA = 121€ total con IVA
  assert.ok(r2.includes('21,00'), 'el IVA soportado debe ser 21,00 € (21% real de esa compra), no un % genérico: ' + r2);
});

await caso('La tarjeta "Facturación de {mes}" de arriba muestra el total CON IVA, no la neta', async () => {
  const r = await page.evaluate(()=>{
    const y = new Date().getFullYear(), m = new Date().getMonth();
    DB.sales = [{id: genId(), date: `${y}-${String(m+1).padStart(2,'0')}-05`, total: 110, propina:0, subtotal:110, tipo:'mesa', items:[{name:'Menú', qty:1, price:110, ivaPct:10}], status:'pagada', metodoPago:'Tarjeta'}];
    saveDB();
    GE.tab('cdr');
    return document.getElementById('cdr-comparison').textContent;
  });
  // 110€ de venta ya es el total con IVA (base 100 + 10% = 110). Si la
  // tarjeta mostrara la neta, diría 100,00 €; debe decir 110,00 €.
  assert.ok(r.includes('110,00'), 'la tarjeta debe mostrar el total CON IVA (110,00 €): ' + r);
  assert.ok(r.toLowerCase().includes('con iva'), 'la etiqueta debe aclarar que es con IVA: ' + r);
});

await caso('Al pasar el cursor por una columna de trimestre o de año, hay un tooltip con el desglose', async () => {
  const r = await page.evaluate(()=>{
    GE.setCDRGranularidad('trimestre');
    const filaFacturacion = [...document.querySelectorAll('#cdr-table tbody tr')][0];
    const celdas = [...filaFacturacion.querySelectorAll('td')];
    return {
      tituloT1: celdas[1].getAttribute('title'),
      tituloAño: celdas[celdas.length-1].getAttribute('title'),
    };
  });
  assert.ok(r.tituloT1 && r.tituloT1.includes('Ene') && r.tituloT1.includes('Feb') && r.tituloT1.includes('Mar'), 'el tooltip de T1 debe desglosar Ene/Feb/Mar: ' + JSON.stringify(r));
  assert.ok(r.tituloAño && r.tituloAño.includes('T1') && r.tituloAño.includes('T4'), 'el tooltip del año debe desglosar T1..T4: ' + JSON.stringify(r));
});

await caso('Ningún error de JavaScript en todo el recorrido', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(68));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
