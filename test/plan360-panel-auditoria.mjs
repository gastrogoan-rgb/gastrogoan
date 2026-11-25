// Panel del coach · auditoría del 25/11: el estado de un cliente no cruza a otro (P0), banco de tareas plegado,
// acta con responsable y fechas legibles, guía de primeros pasos, sin emojis y panel usable a 390 px.
// Firebase simulado en memoria (no se toca ninguna nube). El CSS de iconos relativo no existe al servir admin-panel/
// en local: se sirve desde css/.
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
let ok = 0, mal = 0;
const caso = async (n, f) => { try{ await f(); console.log('✅ ' + n); ok++; }catch(e){ console.log('❌ ' + n + '\n     ⤷ ' + e.message); mal++; } };
const hoy = new Date(); const iso = d => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
const mas = n => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
const seed = {gastrogoan:{coaching360:{T1:{name:'Casa Uno'}, T3:{name:'Cafetería Nueva Era'}},
  tenantLookup:{T1:{apiKey:'k',databaseURL:'u'},T3:{apiKey:'k',databaseURL:'u'}},
  tenants:{T1:{db:{business:{name:'Casa Uno', plan360:true, plan360StartDate: mas(-2), plan360StartDateConfirmed:true}}},T3:{db:{business:{name:'Cafetería Nueva Era', plan360:true}}}}}};
const FAKE = `(${function(seed){
  const store = seed; const L = []; const seg = p => p.split('/').filter(Boolean);
  const get = p => { let o = store; for(const k of seg(p)){ if(o == null || typeof o !== 'object') return null; o = o[k]; } return o === undefined ? null : o; };
  const clean = v => { if(v === null || v === undefined) return undefined; if(Array.isArray(v)){ const a = v.map(clean); return a.length ? a : undefined; } if(typeof v === 'object'){ const o = {}; Object.keys(v).forEach(k => { const c = clean(v[k]); if(c !== undefined) o[k] = c; }); return Object.keys(o).length ? o : undefined; } return v; };
  const set = (p, v) => { const s = seg(p); let o = store; for(let i = 0; i < s.length - 1; i++){ if(o[s[i]] == null || typeof o[s[i]] !== 'object') o[s[i]] = {}; o = o[s[i]]; } const c = clean(JSON.parse(JSON.stringify(v === undefined ? null : v))); if(c === undefined) delete o[s[s.length-1]]; else o[s[s.length-1]] = c; };
  const snap = p => ({val: () => { const v = get(p); return v == null ? null : JSON.parse(JSON.stringify(v)); }, exists: () => get(p) != null, key: seg(p).pop()});
  const notify = p => setTimeout(() => L.forEach(l => { if(l.p.startsWith(p) || p.startsWith(l.p)) l.cb(snap(l.p)); }), 20);
  window.__store = store;
  const ref = p => ({
    once: () => new Promise(r => setTimeout(() => r(snap(p)), 10)),
    on: (ev, cb) => { L.push({p, cb}); setTimeout(() => cb(snap(p)), 10); return cb; },
    off: () => { for(let i = L.length - 1; i >= 0; i--) if(L[i].p === p) L.splice(i, 1); },
    set: v => { set(p, v); notify(p); return Promise.resolve(); },
    update: o => { Object.keys(o).forEach(k => set(p + '/' + k, o[k])); notify(p); return Promise.resolve(); },
    remove: () => { set(p, null); notify(p); return Promise.resolve(); },
    child: c => ref(p + '/' + c), push: v => { const k = 'k' + Math.random().toString(36).slice(2); set(p + '/' + k, v); return ref(p + '/' + k); },
    transaction: fn => { const r = fn(get(p)); set(p, r); return Promise.resolve({committed: true, snapshot: snap(p)}); },
  });
  const apps = {};
  const mk = name => ({auth: () => ({currentUser: {email: 'gastrogoan@gmail.com', uid: 'x'}, signInAnonymously: async () => {}, signInWithEmailAndPassword: async () => {}, onAuthStateChanged: cb => setTimeout(() => cb({email: 'gastrogoan@gmail.com'}), 50), signOut: () => {}}), database: () => ({ref, goOnline(){}, goOffline(){}}), name});
  window.firebase = {app: n => { if(!apps[n]) throw new Error('no app'); return apps[n]; }, initializeApp: (c, n) => (apps[n] = mk(n)), apps: [], database: {ServerValue: {TIMESTAMP: Date.now()}}};
}})(${JSON.stringify(seed)})`;
const b = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'], headless:true});
const p = await b.newPage();
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(); if(/firebase|gstatic|googleapis|github|qrserver/.test(u)) return r.abort(); const m = u.match(/localhost:8950\/admin-panel\/(css|fonts)\/([^?]+)/); if(m){ const f = new URL('../' + m[1] + '/' + m[2], import.meta.url).pathname; if(fs.existsSync(f)) return r.respond({status:200, contentType: f.endsWith('css') ? 'text/css' : 'font/woff2', body: fs.readFileSync(f)}); } r.continue(); });
const errs = [];
p.on('pageerror', e => errs.push(e.message));
p.on('dialog', d => d.accept());
await p.evaluateOnNewDocument(`window.__fake = ${FAKE}`);
await p.evaluateOnNewDocument(() => { window.open = () => ({document:{write(h){ window.__w = (window.__w||'') + h; }, close(){}}, focus(){}, print(){}}); });
await p.setViewport({width:1280, height:900});
await p.goto('http://localhost:8950/admin-panel/plan360.html', {waitUntil:'domcontentloaded'});
await new Promise(r => setTimeout(r, 1500));
await p.evaluate(async () => { await onLoggedIn(); });
const esperar = ms => new Promise(r => setTimeout(r, ms));
await esperar(1200);
const abrir = async (t, n) => { await p.evaluate(async (t, n) => { await openClient(t, n); }, t, n); await esperar(1200); };

await caso('P0-1 · el borrador del acta no cruza de un cliente a otro', async () => {
  await abrir('T1', 'Casa Uno');
  await p.evaluate(() => { renderActaPage(); document.getElementById('acta-texto').value = 'Pesar el pescado'; document.getElementById('acta-tipo').value = 'objetivo'; actaAnadir(); });
  assert.equal(await p.evaluate(() => actaBorrador.length), 1);
  await p.evaluate(() => { closeClient(); });
  await esperar(300);
  assert.equal(await p.evaluate(() => actaBorrador.length), 0, 'al cerrar el cliente el borrador debe vaciarse');
  await abrir('T3', 'Cafetería Nueva Era');
  const r = await p.evaluate(() => { actaEnviar(); return {n: actaBorrador.length, actas: Object.keys(remoteBiz.plan360Actas || {}).length}; });
  assert.equal(r.n, 0); assert.equal(r.actas, 0, 'enviar con borrador vacío no crea acta en el cliente B');
  const t1 = await p.evaluate(() => JSON.stringify(window.__store.gastrogoan.tenants.T1.db.business.plan360Actas || null));
  assert.equal(t1, 'null');
});
await caso('P0-1 · cambiar de cliente sin cerrar (abrir B estando en A) también vacía el borrador y el día activo', async () => {
  await abrir('T1', 'Casa Uno');
  await p.evaluate(() => { actaBorrador.push({tipo:'nota', texto:'x'}); plan360TrabajoDiaActivo = {tasks: []}; });
  await abrir('T3', 'Cafetería Nueva Era');
  assert.deepEqual(await p.evaluate(() => [actaBorrador.length, plan360TrabajoDiaActivo]), [0, null]);
});
await caso('P1-13 · cliente recién creado: guía de 3 pasos y plantilla bloqueada hasta confirmar la fecha', async () => {
  await abrir('T3', 'Cafetería Nueva Era');
  const g = await p.evaluate(() => { const el = document.getElementById('p360-guia'); return el ? {t: el.innerText, off: [...el.querySelectorAll('button')].map(b => [b.innerText.trim(), b.disabled])} : null; });
  assert.ok(g, 'falta la guía');
  assert.ok(/Confirmar la fecha de la primera visita/.test(g.t) && /plantilla base/.test(g.t) && /cuestionario previo/.test(g.t));
  assert.equal(g.off.find(x => /plantilla/i.test(x[0]))[1], true);
  assert.ok(!/0 de 0 acciones/.test(await p.evaluate(() => document.body.innerText)));
});
await caso('P1-13 · confirmar la fecha basta (un solo clic guarda y el negocio la ve); luego la plantilla marca su paso', async () => {
  await p.evaluate(() => { document.getElementById('p360-startdate').value = new Date(Date.now() + 5*864e5).toISOString().slice(0,10); plan360GuiaConfirmarFecha(); });
  await esperar(500);
  assert.equal(await p.evaluate(() => window.__store.gastrogoan.tenants.T3.db.business.plan360StartDateConfirmed), true);
  await p.evaluate(async () => { await plan360GuiaPlantilla(); });
  await esperar(500);
  const t = await p.evaluate(() => document.getElementById('p360-guia').innerText);
  const hechos = await p.evaluate(() => [...document.querySelectorAll('.p360-guia-paso.hecho')].length);
  assert.ok(hechos >= 2, 'pasos hechos: ' + hechos + ' ' + t);
});
await caso('P1-13 · el calendario marca HOY y los días atrasados con tareas sin hacer', async () => {
  await abrir('T1', 'Casa Uno');
  await p.evaluate(async d => { remoteBiz.plan360StartDate = d; await plantillaPonerBase(); renderClientGrid(); }, mas(-10));
  const r = await p.evaluate(() => ({hoy: document.querySelectorAll('.p360-day-hoy').length, tarde: document.querySelectorAll('.p360-day-late').length}));
  assert.equal(r.hoy, 1); assert.ok(r.tarde >= 1, 'atrasados: ' + r.tarde);
});
await caso('P1-9 · el banco de tareas va plegado, empieza en la primera categoría y no dice «interno»', async () => {
  const r = await p.evaluate(() => {
    const d = remoteBiz.plan360Program.find(x => x.phase === 'trabajo'); renderTrabajoPage(d);
    const caja = document.getElementById('banco-caja');
    const antes = getComputedStyle(caja).display;
    const tarea = document.querySelector('#task-list .card'); const yTarea = tarea ? tarea.getBoundingClientRect().top : 0;
    plan360BancoToggle();
    return {antes, despues: getComputedStyle(caja).display, cat: document.getElementById('banco-categoria').value, yTarea, banco: JSON.stringify(PLAN360_CONTENT_BANK)};
  });
  assert.equal(r.antes, 'none'); assert.notEqual(r.despues, 'none'); assert.equal(r.cat, 'Cocina');
  assert.ok(!/interno|Mistery/i.test(r.banco), 'queda «interno» o «Mistery» en el banco'); assert.ok(/Cliente misterioso/.test(r.banco));
  assert.ok(r.yTarea < 900, 'las tareas reales empiezan en ' + r.yTarea);
});
await caso('P1-10 · acta: «Para el día» nunca es un día pasado, hay responsable y fecha, y las enviadas son legibles y se imprimen', async () => {
  const r = await p.evaluate(() => {
    renderActaPage();
    const opts = [...document.querySelectorAll('#acta-dia option')].map(o => Number(o.value));
    const hoyS = todayStr();
    const pasados = opts.filter(d => plan360DateForDay(d) < hoyS);
    document.getElementById('acta-texto').value = 'Ficha del arroz'; document.getElementById('acta-tipo').value = 'tarea';
    document.getElementById('acta-resp').value = 'empleado'; actaResponsableChange();
    document.getElementById('acta-resp-nombre-in').value = 'Marta'; document.getElementById('acta-fecha').value = '2026-11-30';
    actaAnadir(); actaEnviar(); renderActaPage();
    const det = document.querySelector('#client-grid details');
    const tk = remoteBiz.plan360Program.flatMap(d => d.tasks || []).find(x => x.title === 'Ficha del arroz');
    return {pasados, hayOpts: opts.length, resumen: det.innerText, tarea: tk && tk.description, texto: document.getElementById('client-grid').innerText};
  });
  assert.equal(r.pasados.length, 0); assert.ok(r.hayOpts > 0);
  assert.ok(/1 decisión/.test(r.resumen) && !/1 decisiones/.test(r.resumen), r.resumen);
  assert.ok(!/\d{4}-\d{2}-\d{2}/.test(r.texto), 'fecha ISO en pantalla'); assert.ok(/Responsable: Marta/.test(r.tarea) && /30 de noviembre de 2026/.test(r.tarea));
  const w = await p.evaluate(() => { const id = Object.keys(remoteBiz.plan360Actas)[0]; actaImprimir(id); return window.__w; });
  assert.ok(/Acta de la reunión/.test(w) && /Ficha del arroz/.test(w) && /Marta/.test(w));
});
await caso('P2-14 · ninguna pantalla del panel pinta emojis ni símbolos (✏ ★ ✓ ⚠ ✕ 🏆 🔑 ↻)', async () => {
  const malos = [];
  const emo = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2705}\u{274C}\u{21BB}\u{21BA}\u{FE0F}]/u;
  for(const f of ['renderClientGrid()', 'renderSummaryPage()', 'renderActaPage()', 'renderPlantillaPage()', 'renderIntakePage()', 'renderDayDetail(8)']){
    const t = await p.evaluate(f => { try{ eval(f); }catch(e){} return document.getElementById('client-grid').innerText + document.getElementById('client-startdate').innerText; }, f);
    const m = t.match(emo); if(m) malos.push(f + ' → ' + m[0]);
  }
  assert.deepEqual(malos, []);
  const html = fs.readFileSync(new URL('../admin-panel/plan360.html', import.meta.url), 'utf8');
  assert.ok(!/<h1[^>]*>🔑|↻ Actualizar|✏️|Mistery check/.test(html));
});
await caso('P2-15 · «Fecha de inicio» comparte fila con el título (no ocupa una tarjeta entera) y el ⋯ de la tarea funciona', async () => {
  const r = await p.evaluate(() => { renderClientGrid(); const f = document.getElementById('client-startdate'), h = document.getElementById('client-name'); return {mismaFila: Math.abs(f.getBoundingClientRect().top - h.getBoundingClientRect().top) < 80, ancho: f.getBoundingClientRect().width}; });
  assert.ok(r.mismaFila && r.ancho < 600, JSON.stringify(r));
  const n = await p.evaluate(() => { const d = remoteBiz.plan360Program.find(x => x.phase === 'trabajo' && (x.tasks||[]).length > 1); renderTrabajoPage(d); const antes = d.tasks.length; document.querySelector('#task-list .p360-mas').click(); document.querySelector('#p360-menu button').click(); return [antes, plan360TrabajoDiaActivo.tasks.length, document.querySelectorAll('#task-list .ti-trash').length]; });
  assert.equal(n[1], n[0] - 1); assert.equal(n[2], 0, 'no quedan papeleras sueltas');
});
await p.setViewport({width:390, height:780});
await esperar(300);
await caso('P2-16 · a 390 px: campos ≥16 px, sin desborde horizontal y objetivos táctiles ≥36 px', async () => {
  const r = await p.evaluate(() => {
    const out = {};
    for(const [k, f] of [['resumen', 'renderSummaryPage()'], ['acta', 'renderActaPage()'], ['grid', 'renderClientGrid()']]){
      eval(f);
      const campos = [...document.querySelectorAll('#view-client input, #view-client select, #view-client textarea')].filter(e => e.offsetParent && !['checkbox','radio'].includes(e.type));
      const chicos = campos.filter(e => parseFloat(getComputedStyle(e).fontSize) < 16).length;
      const bots = [...document.querySelectorAll('#view-client button')].filter(e => e.offsetParent && e.getBoundingClientRect().height < 36).length;
      const culpable = [...document.querySelectorAll('#view-client *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).slice(0, 4).map(e => e.tagName + '.' + e.className + '#' + e.id + '[' + (e.getAttribute('style')||'').slice(0,50) + ']' + Math.round(e.getBoundingClientRect().right));
      out[k] = {chicos, bots, ov: document.documentElement.scrollWidth - innerWidth, culpable};
    }
    return out;
  });
  for(const k of Object.keys(r)){ assert.equal(r[k].chicos, 0, k + ' campos pequeños'); assert.ok(r[k].ov <= 0, k + ' desborda ' + r[k].ov + ' ' + r[k].culpable); assert.equal(r[k].bots, 0, k + ' botones bajos'); }
});
await caso('P2-16 · el Resumen no desborda con una palabra larguísima', async () => {
  const ov = await p.evaluate(() => { const d = remoteBiz.plan360Program.find(x => x.phase === 'trabajo'); d.tasks = [{id: 99, title: 'Supercalifragilisticoespialidoso'.repeat(4), status: 'pendiente', objectiveId: null}]; renderSummaryPage(); return document.documentElement.scrollWidth - innerWidth; });
  assert.ok(ov <= 0, 'desborda ' + ov);
});
await caso('Ningún error de JavaScript', async () => { assert.deepEqual(errs, []); });
await b.close();
console.log(mal ? '\n❌ ' + mal + ' caso(s) fallaron' : '\n✅ Plan 360 · panel auditoría: ' + ok + ' casos en orden');
process.exit(mal ? 1 : 0);
