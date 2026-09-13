// La Cuenta de Resultados dejaba elegir el AÑO, pero nada más: la tabla
// enseñaba los doce meses y la cabecera de comparación daba SIEMPRE el mes en
// curso del año en curso. Al retroceder de año, la tabla cambiaba a 2025 y la
// cabecera seguía con los números de este septiembre — la misma pantalla,
// dos años a la vez (lo vio el dueño el 13/09).
//
// Ahora hay tira de periodos —doce meses o cuatro trimestres, según la
// resolución— y la cabecera habla SIEMPRE del periodo y año elegidos.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
await page.setViewport({width:1280, height:950});
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
}, 'CDRPERIO');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2300));

// Una venta este mes y otra el mismo mes del año pasado: así se puede
// comprobar que cada periodo enseña LO SUYO.
const {mesActual, anyoActual} = await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  editUnlocked = true;
  const hoy = new Date();
  const f = (anyo, mes, dia) => `${anyo}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
  const venta = (id, fecha, total) => ({id, date: fecha, createdAt: fecha+'T14:00:00', total,
    tipo:'mesa', metodoPago:'Tarjeta', items:[{name:'Plato', qty:1, price: total, ivaPct:10, recipeId:null}]});
  DB.sales = [
    venta('hoy', f(hoy.getFullYear(), hoy.getMonth(), 5), 1100),
    venta('anyoPasado', f(hoy.getFullYear()-1, hoy.getMonth(), 5), 2200),
  ];
  DB.ge = DB.ge || {}; DB.ge.fijos = []; DB.ge.variables = [];
  saveDB();
  currentFolder = 'gestion'; navigate('economia'); GE.tab('cdr');
  return {mesActual: hoy.getMonth(), anyoActual: hoy.getFullYear()};
});
await new Promise(r=>setTimeout(r,1100));

let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}

const estado = () => page.evaluate(()=>({
  anyo: (document.getElementById('cdr-year')||{}).textContent,
  pills: [...document.querySelectorAll('#cdr-periodos .month-pill')].map(e=>e.innerText),
  activo: (document.querySelector('#cdr-periodos .month-pill.active')||{}).innerText,
  cabecera: (document.getElementById('cdr-comparison')||{}).innerText.replace(/\n/g,' | '),
}));

await caso('Hay selector de año y tira de periodos, las dos cosas', async () => {
  const e = await estado();
  assert.ok(e.anyo && /^\d{4}$/.test(e.anyo.trim()), 'el año tiene que verse: ' + JSON.stringify(e.anyo));
  assert.equal(e.pills.length, 4, 'de entrada, trimestral: cuatro periodos — ' + JSON.stringify(e.pills));
  assert.deepEqual(e.pills, ['T1','T2','T3','T4'], JSON.stringify(e.pills));
  assert.ok(e.activo, 'y uno marcado como el que se está mirando');
});

await caso('Arranca en el trimestre de hoy, no en el último del año', async () => {
  const e = await estado();
  const esperado = 'T' + (Math.floor(mesActual/3) + 1);
  assert.equal(e.activo, esperado, 'debería empezar en ' + esperado + ': ' + JSON.stringify(e));
});

await caso('En Mensual salen los doce meses, y empieza por el mes en curso', async () => {
  const e = await page.evaluate(async ()=>{
    GE.setCDRGranularidad('mes');
    await new Promise(r=>setTimeout(r,500));
    return {pills: [...document.querySelectorAll('#cdr-periodos .month-pill')].map(x=>x.innerText),
      activo: (document.querySelector('#cdr-periodos .month-pill.active')||{}).innerText};
  });
  assert.equal(e.pills.length, 12, 'doce meses: ' + JSON.stringify(e.pills));
  assert.equal(e.activo, e.pills[mesActual], 'el mes en curso marcado: ' + JSON.stringify(e));
});

await caso('La cabecera habla del periodo elegido, con su año', async () => {
  const e = await estado();
  assert.ok(e.cabecera.includes(String(anyoActual)), 'tiene que decir de qué año habla: ' + e.cabecera.slice(0,120));
  // La venta de este mes son 1.100 € con IVA incluido.
  assert.ok(/1\.?100/.test(e.cabecera), 'y dar la facturación de ESE mes: ' + e.cabecera.slice(0,120));
});

await caso('Al cambiar de año, la cabecera cambia con él (era el fallo)', async () => {
  const e = await page.evaluate(async ()=>{
    GE.setCDRYear(-1);
    await new Promise(r=>setTimeout(r,600));
    return {anyo: document.getElementById('cdr-year').textContent,
      cabecera: document.getElementById('cdr-comparison').innerText.replace(/\n/g,' | ')};
  });
  assert.equal(e.anyo.trim(), String(anyoActual-1), 'la tabla se va al año anterior');
  assert.ok(e.cabecera.includes(String(anyoActual-1)), 'y la cabecera también: ' + e.cabecera.slice(0,120));
  // Ese mismo mes del año pasado facturó 2.200 €, no 1.100.
  assert.ok(/2\.?200/.test(e.cabecera), 'con los números de ESE año: ' + e.cabecera.slice(0,140));
  assert.ok(!/1\.?100/.test(e.cabecera), 'y no los de este: ' + e.cabecera.slice(0,140));
});

await caso('Elegir otro mes cambia los números', async () => {
  const e = await page.evaluate(async ()=>{
    GE.setCDRYear(1);                    // volver al año actual
    await new Promise(r=>setTimeout(r,400));
    const pills = [...document.querySelectorAll('#cdr-periodos .month-pill')];
    // Un mes sin ventas: enero si no estamos en enero.
    const otro = pills[0].innerText === (document.querySelector('#cdr-periodos .month-pill.active')||{}).innerText ? pills[11] : pills[0];
    otro.click();
    await new Promise(r=>setTimeout(r,500));
    return {activo: (document.querySelector('#cdr-periodos .month-pill.active')||{}).innerText,
      cabecera: document.getElementById('cdr-comparison').innerText.replace(/\n/g,' | ')};
  });
  assert.ok(!/1\.?100/.test(e.cabecera), 'un mes sin ventas no puede enseñar las del mes en curso: ' + e.cabecera.slice(0,140));
  // En minúsculas: la cabecera va en mayúsculas por CSS y innerText las
  // devuelve ya transformadas ("ENE" frente a "Ene" del selector).
  assert.ok(e.cabecera.toLowerCase().includes(e.activo.toLowerCase()), 'la cabecera dice qué mes es: ' + e.cabecera.slice(0,120));
});

await caso('Un trimestre suma sus tres meses', async () => {
  const total = await page.evaluate(async ()=>{
    // Tres ventas de 100 € en los tres meses de T1, y a mirar T1.
    const anyo = new Date().getFullYear();
    const venta = (id, mes) => ({id, date:`${anyo}-${String(mes+1).padStart(2,'0')}-10`, createdAt:`${anyo}-${String(mes+1).padStart(2,'0')}-10T14:00:00`,
      total:100, tipo:'mesa', metodoPago:'Tarjeta', items:[{name:'P', qty:1, price:100, ivaPct:10, recipeId:null}]});
    DB.sales = [venta('e',0), venta('f',1), venta('m',2)];
    saveDB();
    GE.setCDRGranularidad('trimestre');
    await new Promise(r=>setTimeout(r,400));
    GE.setCDRPeriodo(0);
    await new Promise(r=>setTimeout(r,500));
    return document.getElementById('cdr-comparison').innerText.replace(/\n/g,' | ');
  });
  assert.ok(/T1/.test(total), 'se está mirando T1: ' + total.slice(0,100));
  assert.ok(/300/.test(total), 'T1 tiene que sumar los tres meses (300 €): ' + total.slice(0,140));
});

await caso('Ningún error de JavaScript', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(70));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
