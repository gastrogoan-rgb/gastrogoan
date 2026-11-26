// Plan 360º · CICLO COMPLETO en el panel del coach (26/11): cliente nuevo, plantilla base, tareas, reunión, mantenimiento, cierre, a 320/360/390 px. Mide desbordes, relleno, undefined/NaN y errores.
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
await p.evaluateOnNewDocument(() => { window.open = () => ({document:{write(h){ window.__w = (window.__w||'') + h; }, close(){}, images: []}, focus(){}, print(){}}); });
await p.setViewport({width:1280, height:900});
await p.goto('http://localhost:8950/admin-panel/plan360.html', {waitUntil:'domcontentloaded'});
await new Promise(r => setTimeout(r, 1500));
await p.evaluate(async () => { await onLoggedIn(); });
const esperar = ms => new Promise(r => setTimeout(r, ms));
await esperar(1200);
const fallos = [];
const PROHIBIDO = [/pendiente de definir/i, /\bundefined\b/, /\bNaN\b/, /\[object /, /\{\{[a-zA-Z]+\}\}/];
async function medir(etapa, ancho, llamadas){
  await p.setViewport({width: ancho, height: 900});
  const r = await p.evaluate(async (llamadas) => {
    const out = [];
    for(const c of llamadas){
      try{ eval(c); }catch(e){ out.push({c, err: e.message}); continue; }
      await new Promise(r => setTimeout(r, 60));
      const cont = document.getElementById('client-grid') || document.body;
      let desborde = null;
      for(const el of cont.querySelectorAll('*')){
        const b = el.getBoundingClientRect(); if(!b.width) continue;
        if(b.left < -1 || b.right > innerWidth + 1){
          let q = el, enScroll = false;
          while(q && q !== cont){ const o = getComputedStyle(q).overflowX; if(o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip'){ enScroll = true; break; } q = q.parentElement; }
          if(!enScroll){ desborde = (el.className && el.className.baseVal === undefined ? el.className : el.tagName) + ' ' + Math.round(b.left) + '..' + Math.round(b.right); break; }
        }
      }
      out.push({c, desborde, sw: document.documentElement.scrollWidth, iw: innerWidth, texto: cont.innerText});
    }
    return out;
  }, llamadas);
  for(const x of r){
    const id = `[${etapa} · ${ancho}px] ${x.c}`;
    if(x.err){ fallos.push(id + ' → error: ' + x.err); continue; }
    if(x.desborde) fallos.push(id + ' → se sale por los lados: ' + x.desborde);
    else if(x.sw > x.iw + 1) fallos.push(id + ` → scroll horizontal de página (${x.sw} > ${x.iw})`);
    for(const re of PROHIBIDO) if(re.test(x.texto)) fallos.push(id + ' → texto prohibido ' + re);
  }
}
const lista = ['renderClientGrid()'];
await p.evaluate(async () => { await openClient('T1', 'Casa Uno'); });
await esperar(1200);
// Etapa 1: cliente nuevo con la plantilla base aplicada
await p.evaluate(() => { plantillaPonerBase && plantillaPonerBase(); });
await esperar(500);
const pantallas = ['renderClientGrid()','renderPlantillaPage()','renderInformeSemanaPage()','renderActaPage()','renderCoachDatosPage()','renderIntakePage()','renderQuestionnairePage()','renderWelcomePage(false)','renderContractPage()','renderDocsPage()','renderObjetivosPage(2)','renderPlanAccionPage(2)','renderInversionesPage(2)','renderOrdenDiaPage(8)','renderOrdenDiaPage(15)','renderTrabajoPage(remoteBiz.plan360Program.find(d => d.day === 3))','renderTrabajoPage(remoteBiz.plan360Program.find(d => d.day === 20))','renderSummaryPage()','renderMantPage()'];
const hechas = await p.evaluate(() => {
  const P = remoteBiz && remoteBiz.plan360Program || [];
  return {dias: P.length, tareas: P.reduce((n, d) => n + (d.tasks || []).length, 0), relleno: P.reduce((n, d) => n + (d.tasks || []).filter(t => !plan360TareaReal(t)).length, 0)};
});
if(hechas.dias !== 28) fallos.push('el programa tras aplicar la plantilla no tiene 28 días: ' + hechas.dias);
if(hechas.tareas < 30) fallos.push('la plantilla base no dejó tareas (hay ' + hechas.tareas + ')');
if(hechas.relleno) fallos.push('la plantilla base dejó ' + hechas.relleno + ' tarea(s) de relleno');
const ETAPAS = [
  ['plantilla recién aplicada (día 1)', async () => {}],
  ['en marcha (día 12)', async () => { await p.evaluate(() => { const P = remoteBiz.plan360Program; remoteBiz.plan360StartDate = addDaysStr(todayStr(), -11); P.forEach(d => (d.tasks || []).forEach((t, i) => { if(d.day < 9) t.status = i % 2 ? 'hecha' : 'no_hecha'; if(d.day === 7 && i === 0) t.note = 'Sin tiempo esta semana por la reforma de la cocina'; })); }); }],
  ['cierre (día 28)', async () => { await p.evaluate(() => { remoteBiz.plan360StartDate = addDaysStr(todayStr(), -27); }); }],
  ['mantenimiento', async () => { await p.evaluate(() => { const d = new Date(); const k = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0'); remoteBiz.plan360Servicio = {fase:'mant', mantDesde:k, cuota:75}; remoteBiz.plan360Mant = {meses:{[k]:{objetivo:'Bajar mermas', semanas:{s1:{canal:'whatsapp', items:{a:{tipo:'tarea', titulo:'Revisar el escandallo de las cinco especialidades de la carta de temporada', dia:0}}}}}}}; }); }],
];
for(const [nombre, prep] of ETAPAS){
  await prep();
  for(const a of [320, 360, 390]) await medir(nombre, a, pantallas);
}
await p.evaluate(() => { renderMiSemana && renderMiSemana(); });
for(const a of [320, 360, 390]) await medir('mi agenda', a, ['renderMiSemana()']);
if(errs.length) fallos.push('errores de JavaScript: ' + [...new Set(errs)].slice(0, 5).join(' | '));
await b.close();
console.log('Panel: ' + ETAPAS.length + ' etapas × 3 anchos × ' + pantallas.length + ' pantallas');
if(fallos.length){ console.log('❌ ' + fallos.length + ' fallo(s):'); [...new Set(fallos)].slice(0, 60).forEach(x => console.log('  · ' + x.slice(0, 230))); process.exit(1); }
console.log('✅ Plan 360 · ciclo completo del panel: sin desbordes, sin relleno ni errores');
