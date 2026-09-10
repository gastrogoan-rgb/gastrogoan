// Gestión Económica → Gastos Fijos (10/09, revisión contable pedida por el
// dueño): antes "% Retenciones" mezclaba IRPF y SS del trabajador en un
// solo campo, sin ninguna cifra que dijera cuánto de eso es IRPF (lo que
// hay que declarar en el Modelo 111). Ahora van separados, se calcula el
// IRPF retenido del mes y se muestra como KPI aparte. Y la etiqueta
// "Personal (sin IVA)" pasa a ser solo "Personal": el personal nunca lleva
// IVA, decirlo daba a entender que podría llevarlo.
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
}, 'GEFIJOSIRPF1');
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

await caso('El cálculo automático de nómina separa IRPF y SS trabajador, y calcula el IRPF retenido en euros', async () => {
  const r = await page.evaluate(()=>{
    DB.ge.fijos = [];
    navigate('economia');
    GE.tab('fijos');
    GE.newGF('PERSONAL');
    document.getElementById('gf-f-nombre').value = 'JUAN PÉREZ';
    document.getElementById('gf-f-autocalc').checked = true;
    GE.toggleGFAutoCalc();
    document.getElementById('gf-f-neto').value = '1400';
    document.getElementById('gf-f-irpfpct').value = '15';
    document.getElementById('gf-f-sstrabpct').value = '6.35';
    document.getElementById('gf-f-sspct').value = '31';
    GE.recalcGFAuto();
    return {
      bruto: document.getElementById('gf-auto-bruto').textContent,
      ss: document.getElementById('gf-auto-ss').textContent,
      irpf: document.getElementById('gf-auto-irpf').textContent,
      total: document.getElementById('gf-auto-total').textContent,
    };
  });
  // neto=1400, irpf=15%, ssTrab=6.35% → bruto = 1400/(1-0.2135) = 1780,04
  const num = s => parseFloat(s.replace(/[^\d,.-]/g,'').replace(/\.(?=\d{3})/g,'').replace(',','.'));
  assert.ok(Math.abs(num(r.bruto) - 1780.04) < 0.01, 'sueldo bruto mal calculado: ' + JSON.stringify(r));
  assert.ok(Math.abs(num(r.ss) - 551.81) < 0.01, 'SS empresa (31% del bruto) mal calculada: ' + JSON.stringify(r));
  assert.ok(Math.abs(num(r.irpf) - 267.01) < 0.01, 'IRPF retenido (15% del bruto) mal calculado: ' + JSON.stringify(r));
  assert.ok(Math.abs(num(r.total) - 2331.85) < 0.01, 'coste total empresa mal calculado: ' + JSON.stringify(r));
});

await caso('Con auto-cálculo activo, la periodicidad de pago queda bloqueada en Mensual', async () => {
  // Fallo real encontrado en la revisión (10/09): el sueldo neto del
  // auto-cálculo se pide siempre MENSUAL, pero la periodicidad de pago
  // (Mensual/Trimestral/Anual...) era un campo aparte, editable a la vez.
  // Si alguien la ponía en "Trimestral", gfMonthlyImporte() volvía a
  // dividir el coste YA mensual entre 3, descuadrando el coste real.
  const r = await page.evaluate(()=>{
    const sel = document.getElementById('gf-f-periodo');
    return {disabled: sel.disabled, valor: sel.value};
  });
  assert.equal(r.disabled, true, 'la periodicidad debe quedar deshabilitada con auto-cálculo activo: ' + JSON.stringify(r));
  assert.equal(r.valor, '1', 'y fijada en Mensual: ' + JSON.stringify(r));
});

await caso('Guardar con auto-cálculo fuerza periodicidadMeses=1 aunque se manipule el select', async () => {
  const r = await page.evaluate(()=>{
    // Simula manipular el select deshabilitado directamente (o una ficha
    // vieja con otra periodicidad guardada) para comprobar que saveGF()
    // igualmente fuerza mensual cuando autoCalc está activo.
    document.getElementById('gf-f-periodo').disabled = false;
    document.getElementById('gf-f-periodo').value = '3';
    document.getElementById('gf-f-dia').value = '25';
    GE.saveGF();
    return DB.ge.fijos.find(g=>g.nombre==='JUAN PÉREZ').periodicidadMeses;
  });
  assert.equal(r, 1, 'periodicidadMeses debe quedar en 1 (mensual) pese a manipular el select: ' + JSON.stringify(r));
});

await caso('Tras guardar, el IRPF retenido del mes aparece como KPI aparte en Gastos Fijos', async () => {
  // La ficha ya se guardó en el caso anterior (con periodicidadMeses
  // forzado a 1) — aquí solo se comprueba que el KPI de la lista refleja
  // ese IRPF real.
  const r = await page.evaluate(()=>document.getElementById('gf-kpis').textContent);
  assert.ok(r.toLowerCase().includes('irpf retenido'), 'debe verse el KPI "IRPF retenido": ' + r);
  assert.ok(r.includes('267,01'), 'el importe del KPI debe ser el IRPF real retenido este mes: ' + r);
});

await caso('La etiqueta "Personal" ya no dice "(sin IVA)" — el personal nunca lleva IVA', async () => {
  const r = await page.evaluate(()=>document.getElementById('gf-kpis').textContent);
  assert.ok(r.toLowerCase().includes('personal'), 'debe seguir habiendo una casilla de Personal: ' + r);
  assert.ok(!r.toLowerCase().includes('personal (sin iva)') && !r.toLowerCase().includes('personal(siniva)'), 'no debe decir "(sin IVA)" junto a Personal: ' + r);
});

await caso('Hay una nota que explica de qué se compone "Coste real mensual"', async () => {
  const r = await page.evaluate(()=>document.getElementById('gf-cost-hint').textContent);
  assert.ok(r.length > 10, 'debe haber una explicación no vacía de qué es el coste real mensual: ' + JSON.stringify(r));
});

await caso('El campo "Importe" de un gasto de Personal no dice "sin IVA" — un empleado nunca lleva IVA', async () => {
  const r = await page.evaluate(()=>{
    GE.newGF('PERSONAL');
    return document.querySelector('label[for], label').closest ? [...document.querySelectorAll('.modal label')].map(l=>l.textContent).join(' | ') : '';
  });
  assert.ok(!r.toLowerCase().includes('sin iva'), 'ningún campo del alta de Personal debe mencionar IVA: ' + r);
});

await caso('Un gasto fijo antiguo con el % de retención combinado (sin separar) sigue editable sin perder su bruto ya calculado', async () => {
  const r = await page.evaluate(()=>{
    DB.ge.fijos = [{
      id: genId(), nombre:'ANA GÓMEZ', categoria:'PERSONAL', autoCalc:true,
      sueldoNeto: 1200, retPct: 21.35, ssPct: 30,
      sueldoBruto: 1200/(1-0.2135), ssEmpresa: (1200/(1-0.2135))*0.30,
      importe: (1200/(1-0.2135))*1.30, periodicidadMeses:1,
    }];
    saveDB();
    GE.tab('fijos');
    const g = DB.ge.fijos[0];
    GE.editGF(g.id);
    return {
      irpfInput: document.getElementById('gf-f-irpfpct').value,
      ssTrabInput: document.getElementById('gf-f-sstrabpct').value,
      brutoMostrado: document.getElementById('gf-auto-bruto').textContent,
    };
  });
  const num2 = s => parseFloat(s.replace(/[^\d,.-]/g,'').replace(/\.(?=\d{3})/g,'').replace(',','.'));
  assert.equal(r.irpfInput, '15', 'debe repartir un 15% típico de IRPF por defecto al migrar una ficha antigua: ' + JSON.stringify(r));
  assert.ok(Math.abs(parseFloat(r.ssTrabInput) - 6.35) < 0.01, 'el resto (21.35 - 15) debe ir a SS trabajador: ' + JSON.stringify(r));
  assert.ok(Math.abs(num2(r.brutoMostrado) - 1525.75) < 0.01, 'el bruto ya calculado no debe cambiar solo por abrir la ficha para editarla: ' + JSON.stringify(r));
});

await caso('Ningún error de JavaScript en todo el recorrido', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(68));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
