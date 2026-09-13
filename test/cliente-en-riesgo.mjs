// "En riesgo" en Clientes (13/09). El dueño dio un premio de fidelidad y vio
// que al cliente le salía la etiqueta "En riesgo" — gente con MIL visitas y
// la última AYER.
//
// El cálculo era `dias_sin_venir > intervalo_medio * 2`, sin ningún suelo. Un
// cliente que viene casi a diario tiene un intervalo medio de 0,4 días: con
// UN día sin aparecer ya pasaba del doble. La etiqueta no decía nada de
// nadie, y un aviso que no lleva a ninguna acción enseña a ignorar el resto.
//
// Aquí se comprueban los dos lados: que no marca a quien viene a menudo, y
// que SÍ marca a quien de verdad ha dejado de venir.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
await page.setViewport({width:1280, height:900});
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
}, 'RIESGO01');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2300));

await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  editUnlocked = true;

  const haceDias = n => { const d = new Date(); d.setDate(d.getDate()-n); return dateStr(d); };
  const venta = (id, clientId, dias) => ({id, clientId, date: haceDias(dias), createdAt: haceDias(dias)+'T14:00:00',
    total: 30, tipo:'mesa', metodoPago:'Tarjeta', items:[{name:'Plato', qty:1, price:30, ivaPct:10, recipeId:null}]});

  DB.clients = [
    {id: 1, name:'Habitual Diario', phone:'600111111', points: 11},
    {id: 2, name:'Quincenal Perdido', phone:'600222222', points: 4},
    {id: 3, name:'Quincenal Al Día', phone:'600333333', points: 4},
    {id: 4, name:'Fin De Semana Nuevo', phone:'600444444', points: 2},
  ];

  const ventas = [];
  let n = 0;
  // 1) Viene casi a diario desde hace tres meses, la última AYER.
  for(let d = 90; d >= 1; d--) ventas.push(venta('h'+(n++), 1, d));
  // 2) Venía cada 15 días durante un año... y lleva 70 días sin aparecer.
  for(let d = 365; d >= 70; d -= 15) ventas.push(venta('p'+(n++), 2, d));
  // 3) Igual de quincenal, pero vino hace 10 días.
  for(let d = 365; d >= 10; d -= 15) ventas.push(venta('a'+(n++), 3, d));
  // 4) Tres visitas del mismo fin de semana, hace cuatro días.
  [6,5,4].forEach(d => ventas.push(venta('f'+(n++), 4, d)));

  DB.sales = ventas;
  saveDB();
  currentFolder = 'sala';
  navigate('clientes');
});
await new Promise(r=>setTimeout(r,900));

let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}

const stats = nombre => page.evaluate(n => {
  const c = DB.clients.find(x => x.name === n);
  const s = clientSalesStats(c);
  return {atRisk: s.atRisk, visitas: s.visitas, recency: s.recency,
    avg: s.avgIntervalDays != null ? +s.avgIntervalDays.toFixed(2) : null,
    span: s.spanDays != null ? Math.round(s.spanDays) : null};
}, nombre);

await caso('Quien viene a diario y vino ayer NO está en riesgo (era el fallo)', async () => {
  const s = await stats('Habitual Diario');
  assert.ok(s.visitas > 50, 'tiene que tener muchas visitas: ' + JSON.stringify(s));
  assert.equal(s.recency, 1, 'vino ayer: ' + JSON.stringify(s));
  assert.ok(s.avg < 2, 'y su intervalo medio es de horas, no de días: ' + JSON.stringify(s));
  assert.equal(s.atRisk, false, 'no puede estar en riesgo: ' + JSON.stringify(s));
});

await caso('Quien venía cada 15 días y lleva 70 sin venir SÍ está en riesgo', async () => {
  const s = await stats('Quincenal Perdido');
  assert.ok(s.recency >= 70, 'lleva más de dos meses sin aparecer: ' + JSON.stringify(s));
  assert.equal(s.atRisk, true, 'a este hay que ir a buscarlo: ' + JSON.stringify(s));
});

await caso('El mismo cliente quincenal, si vino hace diez días, no', async () => {
  const s = await stats('Quincenal Al Día');
  assert.equal(s.atRisk, false, 'diez días es su ritmo normal: ' + JSON.stringify(s));
});

await caso('Tres visitas de un fin de semana no bastan para decir nada', async () => {
  const s = await stats('Fin De Semana Nuevo');
  assert.ok(s.span < 30, 'histórico corto: ' + JSON.stringify(s));
  assert.equal(s.atRisk, false, 'sin histórico no se sabe su ritmo: ' + JSON.stringify(s));
});

await caso('Y la lista de Clientes no enseña la etiqueta a quien no toca', async () => {
  const r = await page.evaluate(()=>{
    const texto = document.getElementById('view-clientes').innerText;
    const filas = [...document.querySelectorAll('#view-clientes tr, #view-clientes .card')]
      .filter(f => /Habitual Diario/.test(f.innerText)).map(f => f.innerText);
    return {hayEtiquetaEnHabitual: filas.some(f => /riesgo/i.test(f)), tieneClientes: /Habitual Diario/.test(texto)};
  });
  assert.ok(r.tieneClientes, 'la lista tiene que estar pintada');
  assert.ok(!r.hayEtiquetaEnHabitual, 'el cliente que vino ayer no lleva etiqueta de riesgo');
});

await caso('Dar un premio no cambia si está en riesgo o no', async () => {
  const r = await page.evaluate(async ()=>{
    const antes = clientSalesStats(DB.clients.find(c=>c.name==='Habitual Diario')).atRisk;
    openRewardModal(1);
    await new Promise(r=>setTimeout(r,300));
    const sel = document.getElementById('reward-select');
    if(sel) sel.value = sel.options[0].value;
    confirmClientReward(1);
    await new Promise(r=>setTimeout(r,400));
    const c = DB.clients.find(x=>x.id===1);
    const despues = clientSalesStats(c).atRisk;
    try{ closeModal(); }catch(e){}
    return {antes, despues, puntos: c.points, historial: (c.rewardsHistory||[]).length};
  });
  assert.equal(r.antes, false);
  assert.equal(r.despues, false, 'dar el premio no puede ponerlo en riesgo: ' + JSON.stringify(r));
  assert.equal(r.puntos, 0, 'y los puntos se reinician: ' + JSON.stringify(r));
  assert.equal(r.historial, 1, 'con el premio anotado en su historial: ' + JSON.stringify(r));
});

await caso('Ningún error de JavaScript', async () => {
  assert.deepEqual(erroresJs, [], 'errores: ' + erroresJs.join(' | '));
});

console.log('\n' + '═'.repeat(70));
if(fallos){ console.log(`❌ ${fallos} caso(s) fallaron`); process.exitCode = 1; }
else console.log('✅ casos pasaron');
await browser.close();
