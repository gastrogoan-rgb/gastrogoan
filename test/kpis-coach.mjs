// Números del negocio para el coach (6/10). La app calcula un resumen por
// mes (plan360Kpis) con las MISMAS funciones que su Cuenta de Resultados; el
// panel del coach lo convierte en el informe del mes, las alertas, el
// cierre «Día 1 → hoy» y las cifras de «Mi semana».
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
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'KPICOACH1', tenantId: ggBizTenantId('KPICOACH1')}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r => setTimeout(r, 2000));

const r = await page.evaluate(() => {
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  const hoy = new Date(), y = hoy.getFullYear(), m = hoy.getMonth();
  const mes = d => { const x = new Date(y, m + d, 1); return {y: x.getFullYear(), m: x.getMonth(), s: `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}`}; };
  const ant = mes(-1), ant2 = mes(-2);
  Object.assign(DB.business, {formaJuridica:'sociedad', plan360:true, plan360StartDate:`${ant.s}-15`});
  DB.ge.config.pctImpuestoBeneficio = 25;
  DB.sales = []; DB.ge.variables = []; DB.ge.capex = []; DB.ge.fijosLog = []; DB.mermas = []; DB.preciosHistorial = [];
  // Día 1 = mes anterior al inicio (ant2): 10.000 € netos, 3.500 € de compras.
  // Último mes (ant): 12.000 € netos, 3.600 € de compras.
  const venta = (s, i, neto) => ({id:'v'+s+i, date:`${s}-${String(2+i).padStart(2,'0')}`, total: neto*1.1, items:[{name:'Menú', price: neto*1.1, qty:1, ivaPct:10}]});
  for(let i=0;i<10;i++) DB.sales.push(venta(ant2.s, i, 1000));
  for(let i=0;i<10;i++) DB.sales.push(venta(ant.s, i, 1200));
  DB.ge.variables = [{id:1, mes:ant2.m, año:ant2.y, fecha:`${ant2.s}-05`, importe:3500, iva:10, proveedor:'X', categoria:'MATERIA PRIMA'},
                     {id:2, mes:ant.m, año:ant.y, fecha:`${ant.s}-05`, importe:3600, iva:10, proveedor:'X', categoria:'MATERIA PRIMA'}];
  DB.ge.fijos = [{id:9, nombre:'ALQUILER', importe:2000, iva:21, categoria:'FIJOS', periodicidadMeses:1}];
  DB.preciosHistorial = [{id:1, fecha:`${ant.s}-08`, nombre:'Aceite', proveedor:'Makro', antes:5, despues:6, pct:20}];
  plan360ActualizarKpis(true);
  return {K: DB.business.plan360Kpis, ant: ant.s, ant2: ant2.s, marcador: plan360MarcadorEuros()};
});

await caso('La app guarda los indicadores del mes y la foto del Día 1 (el mes anterior al inicio)', async () => {
  const k = r.K.meses[r.ant];
  assert.ok(k, 'falta el mes anterior');
  assert.equal(Math.round(k.netas), 12000);
  assert.equal(k.foodCostPct, 30);
  assert.equal(k.tickets, 10);
  assert.equal(r.K.dia1.mes, r.ant2); assert.equal(r.K.dia1.foodCostPct, 35);
  assert.equal(k.alertas.subida.producto, 'Aceite');
  return `food cost ${r.K.dia1.foodCostPct} % → ${k.foodCostPct} %`;
});

await caso('Punto de equilibrio: fijos / (1 − compras/ventas)', async () => {
  const k = r.K.meses[r.ant];
  assert.equal(Math.round(k.puntoEquilibrio), Math.round(2000 / (1 - 0.30)));
});

await caso('Marcador en euros: 5 puntos menos de food cost sobre 12.000 € = 600 € al mes', async () => {
  const fc = r.marcador.filas.find(f => f.k === 'foodCost');
  assert.equal(fc.antes, 35); assert.equal(fc.hoy, 30); assert.equal(Math.round(fc.euros), 600);
});

await caso('No se vuelve a guardar si nada ha cambiado (no provoca subidas a la nube)', async () => {
  const igual = await page.evaluate(() => { const ts = DB.business.plan360Kpis.ts; plan360ActualizarKpis(true); return DB.business.plan360Kpis.ts === ts; });
  assert.ok(igual);
});

await caso('Ningún error de JavaScript en la app', async () => { assert.deepEqual(errs, []); });
await browser.close();

// --- Panel del coach: las funciones del informe, sin navegador -----------
await caso('Panel: el informe del mes sale con cifras, comparación y alertas, listo para WhatsApp', async () => {
  const html = fs.readFileSync(new URL('../admin-panel/plan360.html', import.meta.url), 'utf8');
  const ini = html.indexOf('const KPI_FILAS'), fin = html.indexOf('function mantResumenNegocio');
  const ctx = {remoteBiz: {plan360Kpis: r.K}, console};
  vm.createContext(ctx);
  vm.runInContext(html.slice(ini, fin) + '; this.kpiInformeTexto = kpiInformeTexto; this.kpiCierreHtml = kpiCierreHtml;', ctx);
  ctx.esc = s => String(s);
  const txt = ctx.kpiInformeTexto(r.ant);
  assert.ok(/Ventas sin IVA: 12\.000 €/.test(txt) && /\+2000 € frente al mes anterior/.test(txt), txt);
  assert.ok(/Food cost: 30 %/.test(txt) && /−?-?5 pt/.test(txt), txt);
  assert.ok(/Aceite/.test(txt), 'falta la alerta del proveedor');
  const cierre = ctx.kpiCierreHtml();
  assert.ok(/Día 1/.test(cierre) && /35 %/.test(cierre), 'el cierre no trae el Día 1');
});

console.log('\n'+'═'.repeat(64)+'\n'+(fallos?`❌ ${fallos} fallaron`:`✅ los ${ok} casos pasaron`));
process.exit(fallos?1:0);
