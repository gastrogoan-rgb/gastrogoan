// Tesorería (10/09, segunda ronda de ajustes visuales/lógicos):
// - "Configurar distribución objetivo" cabe en una sola línea (el rótulo
//   largo pasa a su propia línea, encima de los 5 campos).
// - Se quita el gráfico "Resultado mensual anual" — duplicaba EXACTAMENTE
//   el de arriba de Cuenta de Resultados (misma fórmula), sin aportar nada
//   propio de Tesorería, y encima con su propio año seleccionado aparte
//   que podía desincronizarse del de Cuenta de Resultados.
// - Se confirma con datos realistas y proporcionales que el semáforo
//   (tick verde / cruz roja) es correcto en ambas direcciones: gastar de
//   más en una fila de gasto es malo (rojo); superar el objetivo de
//   Beneficio es bueno (verde).
// - Las filas de Reserva IVA e IRPF siguen presentes.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
await page.setViewport({width:1200, height:900});
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
}, 'GETEREV1');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));
await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  const y = new Date().getFullYear(), m = new Date().getMonth();
  // Ventas del mes: 10.000€ netos (11.000€ con IVA)
  DB.sales = [];
  for(let d=1; d<=20; d++){
    DB.sales.push({id: genId(), date: `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`, total: 550, propina:0, subtotal:550, tipo:'mesa', items:[{name:'Menú', qty:5, price:110, ivaPct:10}], status:'pagada', metodoPago:'Tarjeta'});
  }
  // Personal MUY por encima del objetivo (30% de 10.000 = 3.000) — debe salir en rojo.
  DB.ge.fijos = [{id: genId(), nombre:'EQUIPO', categoria:'PERSONAL', importe:6000, periodicidadMeses:1}];
  // Gastos fijos por debajo del objetivo (20% de 10.000 = 2.000) — debe salir en verde.
  DB.ge.fijos.push({id: genId(), nombre:'ALQUILER', categoria:'FIJOS', importe:500, iva:21, periodicidadMeses:1});
  snapshotGeFijosNeto();
  DB.ge.variables = [{id: genId(), categoria:'MATERIA PRIMA', proveedor:'Proveedor', importe:2500, iva:10, mes:m, año:y, fecha:`${y}-${String(m+1).padStart(2,'0')}-10`}];
  saveDB();
  navigate('economia');
  GE.tab('tesoreria');
  GE.setMonthTe(m);
});

let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}

await caso('"Configurar distribución objetivo" cabe en una sola línea (los 5 campos alineados)', async () => {
  const r = await page.evaluate(()=>{
    const tops = ['te-pct-per','te-pct-gf','te-pct-mp','te-pct-og','te-pct-ben'].map(id => document.getElementById(id).getBoundingClientRect().top);
    return tops;
  });
  const [t0,...resto] = r;
  assert.ok(resto.every(t => Math.abs(t-t0) < 2), 'los 5 campos deben estar en la misma línea (mismo top): ' + JSON.stringify(r));
});

await caso('Ya no existe el gráfico "Resultado mensual anual" (duplicaba el de Cuenta de Resultados)', async () => {
  const r = await page.evaluate(()=>!!document.getElementById('te-annual-chart'));
  assert.equal(r, false, 'el gráfico duplicado no debe existir: ' + r);
});

await caso('Gastar de más en Personal (por encima del objetivo) se marca en ROJO con cruz', async () => {
  const r = await page.evaluate(()=>{
    const fila = [...document.querySelectorAll('#te-rows .te-row')].find(row => row.textContent.includes('Personal'));
    return {texto: fila.textContent, htmlEstado: fila.querySelector('span:last-child')?.innerHTML || ''};
  });
  assert.ok(r.htmlEstado.includes('ti-x'), 'Personal (6.000€ real vs 3.000€ objetivo) debe mostrar la cruz roja: ' + JSON.stringify(r));
});

await caso('Gastar de menos en Gastos Fijos (por debajo del objetivo) se marca en VERDE con tick', async () => {
  const r = await page.evaluate(()=>{
    const fila = [...document.querySelectorAll('#te-rows .te-row')].find(row => row.textContent.includes('Gastos Fijos'));
    return {texto: fila.textContent, htmlEstado: fila.querySelector('span:last-child')?.innerHTML || ''};
  });
  assert.ok(r.htmlEstado.includes('ti-check'), 'Gastos Fijos (500€ real vs 2.000€ objetivo) debe mostrar el tick verde: ' + JSON.stringify(r));
});

await caso('Las filas de Reserva IVA e IRPF retenido siguen presentes', async () => {
  const r = await page.evaluate(()=>document.getElementById('te-rows').textContent);
  assert.ok(r.includes('Reserva IVA'), 'debe seguir la fila de Reserva IVA: ' + r.slice(0,300));
});

await caso('Ningún error de JavaScript en todo el recorrido', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(68));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
