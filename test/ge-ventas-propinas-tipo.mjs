// Gestión Económica → Ventas (10/09, revisión contable pedida por el
// dueño): el total de "Ventas por día" y "TOTAL DEL MES" debe excluir la
// propina (es del personal, no facturación del negocio) y mostrarla aparte
// solo como referencia; además debe existir un desglose REAL por tipo de
// servicio (Mesa/Take Away/Delivery) del mes entero, no solo un filtro que
// oculta los demás, y ese desglose (y el propio filtro) no debe ofrecer
// tipos de servicio que el negocio no tiene activados.
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
}, 'GEVENTASTIPO1');
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

await caso('El total del día y del mes excluyen la propina, que se muestra aparte', async () => {
  const r = await page.evaluate(()=>{
    DB.sales = [];
    DB.business.tiposServicio = {mesa:true, takeaway:true, delivery:true};
    const y = new Date().getFullYear(), m = new Date().getMonth();
    const d1 = `${y}-${String(m+1).padStart(2,'0')}-05`;
    DB.sales.push(
      {id: genId(), date: d1, total: 120, propina: 10, tipo:'mesa', items:[], status:'pagada', metodoPago:'Tarjeta'},
      {id: genId(), date: d1, total: 30, propina: 0, tipo:'takeaway', items:[], status:'pagada', metodoPago:'Efectivo'},
    );
    saveDB();
    navigate('economia');
    GE.setVentasYear(y - new Date().getFullYear());
    GE.setVentasMonth(m);
    GE.tab('ventas');
    const tablaTexto = document.getElementById('ventas-dia-table').textContent;
    const notaTexto = document.getElementById('ventas-propinas-note').textContent;
    return {tablaTexto, notaTexto};
  });
  // 120+30 = 150 de venta bruta, 10 de propina → el total mostrado debe ser 140,00 €, no 150,00 €.
  assert.ok(r.tablaTexto.includes('140,00'), 'el total del mes debe ser SIN propina (140,00 €): ' + r.tablaTexto);
  assert.ok(!r.tablaTexto.includes('150,00'), 'no debe aparecer el total CON propina (150,00 €) en ningún sitio: ' + r.tablaTexto);
  assert.ok(r.tablaTexto.includes('10,00'), 'la propina del día (10,00 €) debe verse aparte, como referencia: ' + r.tablaTexto);
  assert.ok(r.notaTexto.includes('no se suma al total') || r.notaTexto.toLowerCase().includes('informativo'), 'debe aclarar que la propina no cuenta en el total: ' + r.notaTexto);
});

await caso('El desglose por tipo de servicio da cifras reales por Mesa/Take Away/Delivery, sin propina', async () => {
  // Los .ge-kpi de este desglose se pintan con animateKpiNumbers() (~600ms
  // contando desde 0 hasta el valor final) — leer el DOM justo tras
  // renderizar pilla una cifra intermedia, no un fallo real de la app.
  await new Promise(r=>setTimeout(r,700));
  const r = await page.evaluate(()=>{
    const box = document.getElementById('ventas-por-tipo');
    return box.textContent;
  });
  assert.ok(r.includes('Mesa') && r.includes('110,00'), 'Mesa debe mostrar 110,00 € (120 venta - 10 propina): ' + r);
  assert.ok(r.includes('Take Away') && r.includes('30,00'), 'Take Away debe mostrar 30,00 € (sin propina): ' + r);
});

await caso('Si el negocio solo tiene activado un tipo de servicio, no se muestra filtro ni desglose', async () => {
  const r = await page.evaluate(()=>{
    DB.business.tiposServicio = {mesa:true, takeaway:false, delivery:false};
    GE.tab('ventas');
    return {
      filtro: document.getElementById('ventas-tipo-filter').innerHTML.trim(),
      desglose: document.getElementById('ventas-por-tipo').innerHTML.trim(),
    };
  });
  assert.equal(r.filtro, '', 'con un solo tipo de servicio activo no debe haber nada que filtrar: ' + JSON.stringify(r));
  assert.equal(r.desglose, '', 'con un solo tipo de servicio activo el desglose no aporta nada, no debe pintarse: ' + JSON.stringify(r));
});

await caso('Si el negocio no hace delivery, "Delivery" no aparece ni en el filtro ni en el desglose', async () => {
  const r = await page.evaluate(()=>{
    DB.business.tiposServicio = {mesa:true, takeaway:true, delivery:false};
    GE.tab('ventas');
    return {
      filtro: document.getElementById('ventas-tipo-filter').textContent,
      desglose: document.getElementById('ventas-por-tipo').textContent,
    };
  });
  assert.ok(!r.filtro.includes('Delivery'), 'Delivery no debe salir en el filtro si el negocio no lo ofrece: ' + JSON.stringify(r));
  assert.ok(!r.desglose.includes('Delivery'), 'Delivery no debe salir en el desglose si el negocio no lo ofrece: ' + JSON.stringify(r));
  assert.ok(r.filtro.includes('Mesa') && r.filtro.includes('Take Away'), 'los tipos que sí ofrece deben seguir saliendo: ' + JSON.stringify(r));
});

await caso('El selector de meses queda centrado (month-sel-centered)', async () => {
  const r = await page.evaluate(()=>getComputedStyle(document.getElementById('ventas-months')).justifyContent);
  assert.equal(r, 'center', 'la fila de meses debe estar centrada: ' + r);
});

await caso('Ningún error de JavaScript en todo el recorrido', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(68));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
