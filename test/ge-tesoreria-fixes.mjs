// Tesorería (10/09): meses centrados + fallo real reportado desde móvil —
// al escribir en "Configurar distribución objetivo" (Personal/G.Fijos/
// Gastos Variables/Otros/Beneficio), el campo colgaba de oninput y se
// REESCRIBÍA A SÍ MISMO en cada pulsación, a mitad de teclear. En un
// teclado numérico de móvil eso rompe la composición del número (se
// percibía como un salto errático a otra pestaña). Ahora cuelga de
// onchange (solo al terminar de editar) y nunca reescribe el campo que se
// acaba de tocar. También se verifica Cerrar mes y Conciliación bancaria.
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
}, 'GETEFIXES1');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));
await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  navigate('economia');
  GE.tab('tesoreria');
});

let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}

await caso('El selector de meses de Tesorería queda centrado', async () => {
  const r = await page.evaluate(()=>getComputedStyle(document.getElementById('te-months')).justifyContent);
  assert.equal(r, 'center', 'la fila de meses debe estar centrada: ' + r);
});

await caso('El reparto (Personal/G.Fijos/Variables/Otros/Beneficio) ya NO se recalcula en cada pulsación (oninput), solo al terminar de editar (onchange)', async () => {
  const r = await page.evaluate(()=>{
    const el = document.getElementById('te-pct-per');
    return {tieneOninput: !!el.oninput, tieneOnchange: !!el.getAttribute('onchange')};
  });
  assert.equal(r.tieneOninput, false, 'no debe quedar ningún manejador oninput: ' + JSON.stringify(r));
  assert.ok(r.tieneOnchange, 'debe colgar de onchange: ' + JSON.stringify(r));
});

await caso('Escribir en un campo del reparto NO lo reescribe a sí mismo mientras se teclea (simulado con dos pulsaciones)', async () => {
  const r = await page.evaluate(async ()=>{
    const el = document.getElementById('te-pct-per');
    el.focus();
    // Simula escribir "45" tecla a tecla, disparando 'input' cada vez —
    // como haría un teclado numérico real. El valor debe seguir siendo
    // EXACTAMENTE lo que el usuario tecleó tras cada pulsación, nunca
    // "corregido" a mitad de escribir.
    el.value = '4';
    el.dispatchEvent(new Event('input', {bubbles:true}));
    const trasPrimeraCifra = el.value;
    el.value = '45';
    el.dispatchEvent(new Event('input', {bubbles:true}));
    const trasSegundaCifra = el.value;
    return {trasPrimeraCifra, trasSegundaCifra};
  });
  assert.equal(r.trasPrimeraCifra, '4', 'tras escribir "4" el campo debe seguir diciendo "4", no algo recalculado: ' + JSON.stringify(r));
  assert.equal(r.trasSegundaCifra, '45', 'tras escribir "45" el campo debe seguir diciendo "45": ' + JSON.stringify(r));
});

await caso('Al terminar de editar (onchange/blur), SÍ se reparte el resto entre los otros campos y suma 100%', async () => {
  const r = await page.evaluate(()=>{
    const el = document.getElementById('te-pct-per');
    el.value = '50';
    el.dispatchEvent(new Event('change', {bubbles:true}));
    const ids = ['te-pct-per','te-pct-gf','te-pct-mp','te-pct-og','te-pct-ben'];
    const vals = ids.map(id=>parseFloat(document.getElementById(id).value)||0);
    return {per: vals[0], suma: vals.reduce((a,b)=>a+b,0)};
  });
  assert.equal(r.per, 50, 'el campo editado debe quedarse en el valor tecleado (50): ' + JSON.stringify(r));
  assert.ok(Math.abs(r.suma - 100) < 0.01, 'el reparto debe seguir sumando 100% tras repartir el resto: ' + JSON.stringify(r));
});

await caso('Cerrar mes bloquea añadir/editar gastos variables con fecha de ese mes', async () => {
  // Se simula el cierre directamente sobre DB.ge.cierres (lo que hace
  // toggleCierreTe tras confirmar el diálogo) para no depender del propio
  // modal de confirmación, que no es lo que se está probando aquí.
  const r = await page.evaluate(()=>{
    const y = new Date().getFullYear(), m = new Date().getMonth();
    const key = `${y}-${String(m+1).padStart(2,'0')}`;
    if(!DB.ge.cierres) DB.ge.cierres = [];
    if(!DB.ge.cierres.includes(key)) DB.ge.cierres.push(key);
    saveDB();
    GE.tab('tesoreria');
    GE.setGVYear ? null : null;
    // Intenta guardar un gasto variable con fecha de ese mes: debe rechazarse.
    GE.newGV();
    document.getElementById('gv-f-imp').value = '50';
    document.getElementById('gv-f-iva').value = '10';
    document.getElementById('gv-f-fecha').value = `${y}-${String(m+1).padStart(2,'0')}-15`;
    const antesDeGuardar = (DB.ge.variables||[]).length;
    GE.saveGV();
    const despuesDeGuardar = (DB.ge.variables||[]).length;
    return {
      botonMuestraCandado: document.getElementById('te-close-month-btn').innerHTML.includes('lock-open'),
      seGuardoAPesarDeEstarCerrado: despuesDeGuardar > antesDeGuardar,
    };
  });
  assert.ok(r.botonMuestraCandado, 'el botón debe ofrecer "Reabrir mes" cuando ya está cerrado: ' + JSON.stringify(r));
  assert.equal(r.seGuardoAPesarDeEstarCerrado, false, 'no debe poder guardarse un gasto con fecha de un mes ya cerrado: ' + JSON.stringify(r));
});

await caso('Conciliación bancaria calcula el importe esperado (ventas con tarjeta) del rango de fechas', async () => {
  const r = await page.evaluate(()=>{
    const y = new Date().getFullYear(), m = new Date().getMonth();
    const fecha = `${y}-${String(m+1).padStart(2,'0')}-05`;
    DB.cashClosures = [{id: genId(), fecha, desde: fecha+'T09:00', hasta: fecha+'T22:00', totales: {'Tarjeta': 350.75, 'Efectivo': 120}}];
    saveDB();
    openBankReconciliationModal();
    document.getElementById('rec-bank-desde').value = fecha;
    document.getElementById('rec-bank-hasta').value = fecha;
    refreshBankReconciliationRange();
    return document.getElementById('rec-bank-expected').textContent;
  });
  assert.ok(r.includes('350,75'), 'el importe esperado debe ser 350,75 € (solo Tarjeta, no Efectivo): ' + r);
});

await caso('Guardar una conciliación calcula bien la diferencia y queda en el historial', async () => {
  const r = await page.evaluate(()=>{
    document.getElementById('rec-bank-amount').value = '348.75';
    saveBankReconciliation();
    const ultima = DB.bankReconciliations[DB.bankReconciliations.length-1];
    return {expected: ultima.expected, bankAmount: ultima.bankAmount, difference: ultima.difference};
  });
  assert.equal(r.expected, 350.75, 'esperado correcto: ' + JSON.stringify(r));
  assert.equal(r.bankAmount, 348.75, 'importe del banco correcto: ' + JSON.stringify(r));
  assert.ok(Math.abs(r.difference - (-2)) < 0.01, 'la diferencia debe ser -2,00 €: ' + JSON.stringify(r));
});

await caso('Ningún error de JavaScript en todo el recorrido', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(68));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
