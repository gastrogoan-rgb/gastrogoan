import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

let ok = 0, fallos = 0;
async function caso(nombre, fn){
  try{ const d = await fn(); ok++; console.log('✅ '+nombre+(d?'  → '+d:'')); }
  catch(e){ fallos++; console.log('❌ '+nombre+'\n   '+(e.message||e)); }
}

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'], headless:true});
const page = await browser.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(() => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'P360FECHA1', tenantId: ggBizTenantId('P360FECHA1')}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
});
await page.reload({waitUntil:'domcontentloaded'});

// Plan 360º · Fase 0.5 y 0.6 (17/11): la fecha de inicio la confirma el coach, y el «antes» es un mes COMPLETO.
const r = await page.evaluate(() => {
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  const out = {};
  // 0.5 · programa recién creado: sin fecha, sin «hoy», sin atrasados, y la pantalla lo dice
  delete DB.business.plan360StartDate; delete DB.business.plan360Program; delete DB.business.plan360Contract; delete DB.business.plan360Cierre;
  ensurePlan360Program();
  out.fechaTrasCrear = DB.business.plan360StartDate || null;
  out.diaHoy = plan360DiaDeHoy();
  out.hoyCard = plan360HoyCardHtml();
  document.body.insertAdjacentHTML('beforeend', '<div id="plan360-content"></div>');
  renderPlan360Grid();
  out.pantalla = document.getElementById('plan360-content').innerText;
  // 0.6 · el «antes»: mes anterior al inicio
  const hoy = new Date(), y = hoy.getFullYear(), m = hoy.getMonth();
  const mes = d => { const x = new Date(y, m + d, 1); return {y: x.getFullYear(), m: x.getMonth(), s: `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}`}; };
  const ant = mes(-1), ant2 = mes(-2), ant3 = mes(-3);
  Object.assign(DB.business, {formaJuridica:'sociedad', plan360:true, plan360StartDate:`${ant.s}-15`});
  DB.ge.config.pctImpuestoBeneficio = 25;
  const venta = (s, i, neto) => ({id:'v'+s+i, date:`${s}-${String(2+i).padStart(2,'0')}`, total: neto*1.1, items:[{name:'Menú', price: neto*1.1, qty:1, ivaPct:10}]});
  DB.sales = []; DB.ge.variables = []; DB.ge.fijos = []; DB.preciosHistorial = []; DB.business.plan360Kpis = {};
  for(let i=0;i<4;i++) DB.sales.push(venta(ant2.s, i, 1000));      // mes anterior al inicio con solo 4 días de venta
  for(let i=0;i<10;i++) DB.sales.push(venta(ant.s, i, 1200));      // el mes del inicio (parcial): NO vale de «antes»
  plan360ActualizarKpis(true);
  out.pocosDias = (DB.business.plan360Kpis || {}).dia1 || null;
  for(let i=4;i<12;i++) DB.sales.push(venta(ant2.s, i, 1000));     // ya 12 días de venta
  plan360ActualizarKpis(true);
  out.completo = ((DB.business.plan360Kpis || {}).dia1) || null;
  // el coach cambia la fecha: el «antes» pasa al mes de antes
  for(let i=0;i<12;i++) DB.sales.push(venta(ant3.s, i, 800));
  DB.business.plan360StartDate = `${ant2.s}-15`;
  plan360ActualizarKpis(true);
  out.trasCambio = ((DB.business.plan360Kpis || {}).dia1) || null;
  out.ant2 = ant2.s; out.ant3 = ant3.s;
  return out;
});
await caso('Sin confirmar la fecha: el programa no fija «hoy», no hay Día de hoy ni atrasados y la pantalla dice que el coach la está fijando', async () => {
  assert.equal(r.fechaTrasCrear, null, 'la app fijó sola la fecha: ' + r.fechaTrasCrear);
  assert.equal(r.diaHoy, null); assert.equal(r.hoyCard, '');
  assert.ok(/fijando la primera visita/i.test(r.pantalla), r.pantalla);
});
await caso('El «antes» exige un mes completo con días de venta: 4 días no valen y el mes del inicio (parcial) tampoco', async () => {
  assert.equal(r.pocosDias, null, 'se tomó como «antes» un mes con 4 días: ' + JSON.stringify(r.pocosDias));
});
await caso('Con el mes anterior completo (12 días de venta) el «antes» es ESE mes', async () => {
  assert.ok(r.completo, 'no hay Día 1'); assert.equal(r.completo.mes, r.ant2); assert.equal(Math.round(r.completo.netas), 12000);
});
await caso('Si el coach cambia la fecha de inicio, el «antes» se recalcula con el mes de antes', async () => {
  assert.ok(r.trasCambio, 'sin Día 1 tras el cambio'); assert.equal(r.trasCambio.mes, r.ant3); assert.equal(Math.round(r.trasCambio.netas), 9600);
});
await browser.close();
console.log(fallos ? '\n❌ ' + fallos + ' caso(s) fallaron' : '\n✅ Plan 360 · fecha de inicio y «antes»: ' + ok + ' casos en orden');
process.exit(fallos ? 1 : 0);
