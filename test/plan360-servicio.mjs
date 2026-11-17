// Plan 360º · «Mi mantenimiento» y resumen semanal para WhatsApp (17/11).
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
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'P360SERV1', tenantId: ggBizTenantId('P360SERV1')}));
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
  const out = {};
  DB.business.plan360Servicio = {cuota: 75, mantHasta: addDaysStr(hoy, 20), cobros: {'2026-09': {ts: 1, importe: 75}, '2026-10': {ts: 2, importe: 75}}};
  out.h1 = plan360MantServicioHtml();
  document.body.insertAdjacentHTML('beforeend', '<div id="plan360-content"></div>');
  window.confirm = () => true;
  plan360SolicitarBaja();
  out.baja = DB.business.plan360Servicio.baja && DB.business.plan360Servicio.baja.por;
  out.cobrosIntactos = Object.keys(DB.business.plan360Servicio.cobros).length;
  out.h2 = plan360MantServicioHtml();
  plan360RetirarBaja();
  out.sinBaja = !DB.business.plan360Servicio.baja; out.cobrosTras = Object.keys(DB.business.plan360Servicio.cobros).length;
  // resumen semanal
  DB.business.plan360StartDate = addDaysStr(hoy, -2);
  const prog = DB.business.plan360Program; prog.filter(d => d.phase === 'trabajo').forEach(d => { d.tasks = []; });
  const hoyDia = plan360DiaDeHoy();
  const dHoy = prog.find(d => d.day === hoyDia);
  dHoy.tasks = [{id:1, title:'A', status:'hecha'}, {id:2, title:'B', status:'pendiente'}, {id:3, title:'C', status:'hecha'}];
  prog.find(x => x.day === 2).objectives = [{id:'o', titulo:'Bajar el food cost', prioridad:'prioritario', mediciones:[{fecha:hoy, valor:'35 %'}, {fecha:hoy, valor:'31,4 %'}]}];
  out.texto = plan360SemanaTexto();
  return out;
});
await caso('«Mi mantenimiento» enseña la cuota, hasta cuándo está pagado y los meses cobrados', async () => { assert.ok(/75 € \+ IVA/.test(r.h1)); assert.ok(/Pagado hasta/.test(r.h1)); assert.ok(/Solicitar la baja/.test(r.h1)); });
await caso('Pedir la baja la guarda (por el negocio), no toca los cobros y cambia el aviso', async () => { assert.equal(r.baja, 'negocio'); assert.equal(r.cobrosIntactos, 2); assert.ok(/Has pedido la baja/.test(r.h2) && /Retirar la solicitud/.test(r.h2)); });
await caso('Retirar la solicitud quita la baja y deja los cobros como estaban', async () => { assert.equal(r.sinBaja, true); assert.equal(r.cobrosTras, 2); });
await caso('El resumen semanal cuenta las tareas de la semana y pone cada objetivo con su última medición', async () => {
  assert.ok(/2 de 3 hechas/.test(r.texto), r.texto); assert.ok(/Bajar el food cost: 31,4 %/.test(r.texto), r.texto); assert.ok(/^\*Plan 360º · semana del/.test(r.texto));
  assert.ok(!/<[a-z]/i.test(r.texto), 'lleva HTML');
});
await browser.close();
console.log(mal ? '\n❌ ' + mal + ' caso(s) fallaron' : '\n✅ Plan 360 · servicio y resumen semanal: ' + ok + ' casos en orden');
process.exit(mal ? 1 : 0);
