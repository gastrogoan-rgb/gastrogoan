// Plan 360º · «Mi plan de acción» imprimible (17/11): objetivos por prioridad con sus tareas y casillas.
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
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'P360PLAN1', tenantId: ggBizTenantId('P360PLAN1')}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r => setTimeout(r, 2000));
const r = await page.evaluate(() => {
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  DB.business.plan360 = true; delete DB.business.plan360StartDate; delete DB.business.plan360Program;
  ensurePlan360Program();
  const sinFecha = plan360HayPlanDeAccion();
  DB.business.plan360StartDate = addDaysStr(todayStr(), -3);
  const prog = DB.business.plan360Program;
  prog.filter(d => d.phase === 'trabajo').forEach(d => { d.tasks = []; });
  const d2 = prog.find(x => x.day === 2);
  d2.objectives = [{id:'oc', titulo:'Subir el ticket medio', prioridad:'complementario', metrica:'ticket medio €', mediciones:[]}, {id:'op', titulo:'Bajar el food cost', prioridad:'prioritario', metrica:'food cost %', mediciones:[]}];
  const t5 = prog.find(x => x.day === 5), t6 = prog.find(x => x.day === 6);
  t5.tasks = [{id:'a', title:'Pesar el producto al recibir', objectiveId:'op', status:'hecha'}, {id:'b', title:'Ficha del arroz', objectiveId:'op', status:'pendiente'}];
  t6.tasks = [{id:'c', title:'Sugerir el postre', objectiveId:'oc', status:'pendiente'}, {id:'d', title:'Cambiar la bombilla', objectiveId:null, status:'pendiente'}];
  const html = plan360PlanAccionHtml();
  document.body.insertAdjacentHTML('beforeend', '<div id="plan360-content"></div>');
  window.__w = ''; window.open = () => ({document:{write(h){ window.__w += h; }, close(){}, images: []}, focus(){}, print(){}});
  plan360ImprimirPlan();
  return {sinFecha, hay: plan360HayPlanDeAccion(), html, abierto: window.__w.includes('Pesar el producto')};
});
await caso('Sin fecha de inicio no hay plan de acción que imprimir', async () => assert.equal(r.sinFecha, false));
await caso('Con tareas y fecha, el plan existe y el botón imprime la ventana', async () => { assert.equal(r.hay, true); assert.ok(r.abierto); });
await caso('Los objetivos salen por prioridad: el prioritario antes que el complementario', async () => {
  assert.ok(r.html.indexOf('Bajar el food cost') < r.html.indexOf('Subir el ticket medio'));
});
await caso('Cada tarea va bajo SU objetivo, con casilla marcada si está hecha y vacía si no', async () => {
  const i = r.html.indexOf('Bajar el food cost'), j = r.html.indexOf('Subir el ticket medio');
  const bloque1 = r.html.slice(i, j), bloque2 = r.html.slice(j);
  assert.ok(bloque1.includes('Pesar el producto') && bloque1.includes('Ficha del arroz') && !bloque1.includes('Sugerir el postre'));
  assert.ok(bloque2.includes('Sugerir el postre'));
  assert.ok(/☑<\/td><td>Pesar/.test(r.html) && /☐<\/td><td>Ficha del arroz/.test(r.html));
});
await caso('Lo que no cuelga de ningún objetivo va al final, en «Otras acciones»', async () => {
  assert.ok(r.html.indexOf('Otras acciones') > r.html.indexOf('Sugerir el postre') && r.html.includes('Cambiar la bombilla'));
});
await browser.close();
console.log(mal ? '\n❌ ' + mal + ' caso(s) fallaron' : '\n✅ Plan 360 · plan de acción imprimible: ' + ok + ' casos en orden');
process.exit(mal ? 1 : 0);
