// Plan 360º · acta en vivo (17/11): el coach apunta decisiones y las envía (panel); el negocio las lee (app).
import fs from 'node:fs';
import vm from 'node:vm';
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
let ok = 0, mal = 0;
const caso = async (n, f) => { try{ await f(); console.log('✅ ' + n); ok++; }catch(e){ console.log('❌ ' + n + '\n     ⤷ ' + e.message); mal++; } };
// ── Lado coach: se carga la lógica de la acta del propio panel
const html = fs.readFileSync(new URL('../admin-panel/plan360.html', import.meta.url), 'utf8');
const js = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
const trozo = (ini, fin) => js.slice(js.indexOf(ini), js.indexOf(fin, js.indexOf(ini)));
const hoyStr = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
let n = 1000;
const ctx = {console, remoteBiz: null, todayStr: hoyStr, plan360GenId: () => ++n, JSON, Date, Object, Array, String, Number};
vm.createContext(ctx);
vm.runInContext([trozo('let actaBorrador', 'function renderActaPage'), trozo('function actaAplicar', 'function actaEnviar'), 'this.A = {aplicar: actaAplicar, get b(){ return actaBorrador; }, set b(v){ actaBorrador = v; }, san: actaSanitizar};'].join('\n'), ctx);
ctx.remoteBiz = {plan360Program: [{day: 2, phase: 'presencial', objectives: []}, {day: 5, phase: 'trabajo', tasks: [{id: 1, title: 'previa'}]}, {day: 6, phase: 'trabajo'}]};
ctx.A.b = [{tipo: 'tarea', texto: 'Pesar el pescado al recibir', dia: 5}, {tipo: 'objetivo', texto: 'Bajar el food cost al 30 %', dia: null}, {tipo: 'nota', texto: 'El dueño prefiere WhatsApp', dia: null}, {tipo: 'tarea', texto: 'Ficha del arroz', dia: 6}];
const r = ctx.A.aplicar();
await caso('Enviar el acta crea las tareas en SU día (también donde aún no había lista) y el objetivo en el Día 2', async () => {
  const p = ctx.remoteBiz.plan360Program;
  assert.equal(r.tareas, 2); assert.equal(r.objetivos, 1);
  assert.equal(p[1].tasks.length, 2); assert.equal(p[1].tasks[1].title, 'Pesar el pescado al recibir'); assert.equal(p[1].tasks[1].status, 'pendiente');
  assert.equal(p[2].tasks.length, 1); assert.equal(p[0].objectives[0].titulo, 'Bajar el food cost al 30 %'); assert.equal(p[0].objectives[0].prioridad, 'esencial');
});
await caso('Las tareas nuevas llevan id propio y no pisan las anteriores', async () => {
  const ids = ctx.remoteBiz.plan360Program[1].tasks.map(t => t.id); assert.equal(new Set(ids).size, 2); assert.ok(ids.includes(1));
});
await caso('El acta se guarda como OBJETO por id (no lista) con sus 4 decisiones', async () => {
  const a = ctx.remoteBiz.plan360Actas; assert.ok(a && !Array.isArray(a)); const v = Object.values(a); assert.equal(v.length, 1); assert.equal(v[0].decisiones.length, 4); assert.equal(v[0].fecha, hoyStr());
});
await caso('El texto se recorta y se limpia (nada de 10.000 letras ni null)', async () => { assert.equal(ctx.A.san('  hola  '), 'hola'); assert.equal(ctx.A.san(null), ''); assert.equal(ctx.A.san('x'.repeat(5000)).length, 600); });
// ── Lado negocio: la app lee el acta que dejó el coach
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'], headless:true});
const page = await browser.newPage();
await page.setRequestInterception(true);
page.on('request', rq => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(rq.url()) ? rq.abort() : rq.continue());
await page.goto('http://localhost:8950/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(() => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'P360ACTA1', tenantId: ggBizTenantId('P360ACTA1')}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r2 => setTimeout(r2, 2000));
const q = await page.evaluate(actas => {
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  DB.business.plan360 = true; delete DB.business.plan360Program; ensurePlan360Program();
  delete DB.business.plan360Actas;
  const sin = plan360ActasLista().length;
  DB.business.plan360Actas = actas;
  return {sin, con: plan360ActasLista().length, html: plan360ActasHtml()};
}, ctx.remoteBiz.plan360Actas);
await caso('Sin actas no hay tarjeta ni lista; con el acta del coach, la app la lista', async () => { assert.equal(q.sin, 0); assert.equal(q.con, 1); });
await caso('El negocio lee cada decisión con su tipo y el día de las tareas', async () => {
  for(const t of ['Pesar el pescado al recibir', 'Bajar el food cost al 30 %', 'El dueño prefiere WhatsApp', 'Tarea', 'Objetivo', 'Nota', 'Reunión del']) assert.ok(q.html.includes(t), 'falta ' + t);
});
await browser.close();
console.log(mal ? '\n❌ ' + mal + ' caso(s) fallaron' : '\n✅ Plan 360 · acta en vivo: ' + ok + ' casos en orden');
process.exit(mal ? 1 : 0);
