// Plan 360º · informe de cierre (17/11): primero el informe, DESPUÉS la oferta de mantenimiento (decisión del dueño).
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
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'P360INFO1', tenantId: ggBizTenantId('P360INFO1')}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r => setTimeout(r, 2000));
const r = await page.evaluate(() => {
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  const hoy = new Date(), mes = d => { const x = new Date(hoy.getFullYear(), hoy.getMonth() + d, 1); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}`; };
  DB.business.plan360 = true;
  ensurePlan360Program();
  DB.business.plan360StartDate = mes(-1) + '-15';
  const prog = DB.business.plan360Program; const d2 = prog.find(x => x.day === 2);
  d2.objectives = [{id:'o1', titulo:'Bajar el food cost', explicacion:'', prioridad:'prioritario', metrica:'food cost %', mediciones:[{fecha:'2026-10-01', valor:'35 %'}, {fecha:'2026-11-10', valor:'31 %'}], estadoFinal:'cumplido'}];
  DB.business.plan360Cierre = Object.assign(DB.business.plan360Cierre || {}, {kpis:{}, mejorasVisibles:'La cocina trabaja con fichas.', queVigilar:'La subida del aceite.', siguienteNivel:'Carta nueva', mantenimiento:{precio:'75 € + IVA al mes', respuesta:null}});
  delete DB.business.plan360Cierre.informeVistoEn;
  DB.business.plan360Kpis = {meses:{[mes(-1)]:{netas:12000, tickets:600, ticketMedio:20, foodCostPct:30, personalPct:32, resultado:1500}}, dia1:{mes:mes(-2), desde: DB.business.plan360StartDate, netas:10000, tickets:500, ticketMedio:18, foodCostPct:35, personalPct:36, resultado:400}};
  document.body.insertAdjacentHTML('beforeend', '<div id="plan360-content"></div>');
  const antes = plan360CierreHtml();
  const html = plan360InformeCierreHtml();
  window.open = () => ({document:{write(h){ window.__w = (window.__w||'') + h; }, close(){}, images: []}, focus(){}, print(){}});
  plan360InformeCierre();
  const despues = plan360CierreHtml();
  return {antes: /plan360MantenimientoAceptar|plan360.maintenancePlan|Plan de mantenimiento|75 € \+ IVA/.test(antes), antesPaso1: /Paso 1/.test(antes),
          html, visto: !!DB.business.plan360Cierre.informeVistoEn, despuesOferta: /plan360MantenimientoAceptar/.test(despues)};
});
await caso('Antes de abrir el informe NO sale la oferta de mantenimiento: solo el «Paso 1 · Tu informe de cierre»', async () => {
  assert.equal(r.antes, false, 'la oferta de mantenimiento salía antes del informe'); assert.ok(r.antesPaso1);
});
await caso('El informe lleva las cifras de antes y ahora con su diferencia en euros', async () => {
  assert.ok(/Food cost/.test(r.html) && /35 %/.test(r.html) && /30 %/.test(r.html), 'faltan cifras del food cost');
  assert.ok(/Ticket medio/.test(r.html) && /Resultado del mes/.test(r.html));
  assert.ok(/\+/.test(r.html), 'sin diferencia en euros');
});
await caso('El informe lleva los objetivos con su medición y su resultado, y los textos del coach', async () => {
  assert.ok(/Bajar el food cost/.test(r.html) && /Inicio 35 %/.test(r.html) && /Ahora 31 %/.test(r.html) && /Cumplido/.test(r.html));
  assert.ok(/La cocina trabaja con fichas/.test(r.html) && /La subida del aceite/.test(r.html) && /Carta nueva/.test(r.html));
});
await caso('El informe NO lleva la oferta de mantenimiento', async () => {
  assert.ok(!/mantenimiento|75 € \+ IVA/i.test(r.html), 'el informe nombra el mantenimiento');
});
await caso('Al abrirlo se marca como visto y ENTONCES aparece el paso siguiente (la oferta)', async () => {
  assert.ok(r.visto); assert.ok(r.despuesOferta, 'la oferta no apareció tras ver el informe');
});
await browser.close();
console.log(mal ? '\n❌ ' + mal + ' caso(s) fallaron' : '\n✅ Plan 360 · informe de cierre: ' + ok + ' casos en orden');
process.exit(mal ? 1 : 0);
