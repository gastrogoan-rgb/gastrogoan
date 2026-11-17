// Plan 360º · avisos en el Panel y la campana (17/11): tareas de hoy/atrasadas y el informe de cierre listo. Solo el propietario.
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
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'P360AVIS1', tenantId: ggBizTenantId('P360AVIS1')}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r => setTimeout(r, 2000));
const r = await page.evaluate(() => {
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  const busca = () => avisosDeLaApp().filter(i => /ti-target-arrow|ti-file-text/.test(i.icon));
  const out = {};
  DB.business.plan360 = true;
  delete DB.business.plan360StartDate; delete DB.business.plan360Program;
  ensurePlan360Program();
  out.sinFecha = busca().length;                                     // sin fecha de inicio: nada
  DB.business.plan360StartDate = addDaysStr(todayStr(), -4);         // día 5
  const prog = DB.business.plan360Program;
  const trabajo = prog.filter(d => d.phase === 'trabajo');
  trabajo.forEach(d => { d.tasks = []; });
  const dHoy = prog.find(d => d.day === 5), dAyer = prog.find(d => d.day === 4);
  dHoy.tasks = [{id:'t1', title:'Revisar mermas', status:'pendiente'}, {id:'t2', title:'Llamar al proveedor', status:'hecha'}];
  dAyer.tasks = [{id:'t3', title:'Ficha del arroz', status:'pendiente'}];
  const a = busca(); out.tareas = a.find(i => /target-arrow/.test(i.icon)) || null;
  dAyer.tasks[0].status = 'hecha'; dHoy.tasks[0].status = 'hecha';
  out.todoHecho = busca().filter(i => /target-arrow/.test(i.icon)).length;
  DB.business.plan360StartDate = addDaysStr(todayStr(), -27);        // día 28
  DB.business.plan360Cierre = DB.business.plan360Cierre || {kpis:{}, mantenimiento:{}};
  delete DB.business.plan360Cierre.informeVistoEn;
  out.cierre = busca().some(i => /file-text/.test(i.icon));
  DB.business.plan360Cierre.informeVistoEn = Date.now();
  out.cierreVisto = busca().some(i => /file-text/.test(i.icon));
  // empleado: no lo ve
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'employee', employeeId:'x', area:'sala', ts:Date.now()}));
  delete DB.business.plan360Cierre.informeVistoEn;
  out.empleado = busca().length;
  return out;
});
await caso('Sin fecha de inicio confirmada no hay avisos del Plan 360', async () => assert.equal(r.sinFecha, 0));
await caso('El día 5 con una tarea de hoy y una atrasada pendientes: un aviso de 2 en rojo («1 atrasada»)', async () => {
  assert.ok(r.tareas, 'no salió el aviso'); assert.equal(r.tareas.count, 2); assert.equal(r.tareas.warn, true); assert.ok(/1 atrasada/.test(r.tareas.label), r.tareas.label);
});
await caso('Con todo hecho el aviso desaparece', async () => assert.equal(r.todoHecho, 0));
await caso('El día 28 sale «Tu informe de cierre está listo» y se apaga al abrirlo', async () => { assert.equal(r.cierre, true); assert.equal(r.cierreVisto, false); });
await caso('Un empleado no ve nada del Plan 360', async () => assert.equal(r.empleado, 0));
await browser.close();
console.log(mal ? '\n❌ ' + mal + ' caso(s) fallaron' : '\n✅ Plan 360 · avisos: ' + ok + ' casos en orden');
process.exit(mal ? 1 : 0);
