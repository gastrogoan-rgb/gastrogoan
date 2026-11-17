// Plan 360º · objetivos que se miden solos (17/11).
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
let ok = 0, mal = 0;
const caso = async (n, f) => { try{ await f(); console.log('✅ ' + n); ok++; }catch(e){ console.log('❌ ' + n + '\n     ⤷ ' + e.message); mal++; } };
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'], headless:true});
const page = await browser.newPage();
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(() => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'P360AUTO1', tenantId: ggBizTenantId('P360AUTO1')}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r => setTimeout(r, 2000));
const r = await page.evaluate(() => {
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  DB.business.plan360 = true; delete DB.business.plan360Program; ensurePlan360Program();
  const hoy = todayStr();
  DB.business.plan360StartDate = addDaysStr(hoy, -20);
  const d = new Date(), ant = new Date(d.getFullYear(), d.getMonth() - 1, 1), clave = `${ant.getFullYear()}-${String(ant.getMonth()+1).padStart(2,'0')}`;
  const d2 = DB.business.plan360Program.find(x => x.day === 2);
  d2.objectives = [
    {id:'o1', titulo:'Bajar el food cost', prioridad:'prioritario', metrica:'', mediciones:[], metricaAuto:'foodCostPct'},
    {id:'o2', titulo:'A mano', prioridad:'esencial', metrica:'x', mediciones:[{fecha:'2026-10-01', valor:'5'}]},
  ];
  const k = {meses:{[clave]:{foodCostPct:31.4, netas:12000}}, dia1:{mes:'2026-09', foodCostPct:35, netas:10000}};
  const c1 = plan360MedirObjetivosAuto(k);
  const m1 = JSON.parse(JSON.stringify(d2.objectives[0].mediciones));
  const c2 = plan360MedirObjetivosAuto(k);                                   // misma semana y mismo valor: nada nuevo
  const tras2 = d2.objectives[0].mediciones.length;
  d2.objectives[0].mediciones[d2.objectives[0].mediciones.length - 1].fecha = addDaysStr(hoy, -10);   // la última medición es de hace 10 días
  k.meses[clave].foodCostPct = 30.2;
  const c3 = plan360MedirObjetivosAuto(k);
  return {c1, m1, c2, tras2, c3, tras3: d2.objectives[0].mediciones.map(m => m.valor), manual: d2.objectives[1].mediciones.length};
});
await caso('La primera pasada apunta el Día 1 (35 %) y la cifra del último mes completo (31,4 %)', async () => {
  assert.equal(r.c1, true); assert.deepEqual(r.m1.map(m => m.valor), ['35 %', '31,4 %']); assert.ok(r.m1.every(m => m.auto));
});
await caso('En la misma semana y con el mismo valor no se apunta nada más', async () => { assert.equal(r.c2, false); assert.equal(r.tras2, 2); });
await caso('Pasada una semana y con otro valor se añade la nueva medición', async () => { assert.equal(r.c3, true); assert.deepEqual(r.tras3, ['35 %', '31,4 %', '30,2 %']); });
await caso('Un objetivo sin «se mide con» no se toca', async () => assert.equal(r.manual, 1));
await browser.close();
console.log(mal ? '\n❌ ' + mal + ' caso(s) fallaron' : '\n✅ Plan 360 · objetivos que se miden solos: ' + ok + ' casos en orden');
process.exit(mal ? 1 : 0);
