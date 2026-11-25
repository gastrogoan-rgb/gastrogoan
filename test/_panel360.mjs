// Utilidad compartida de las pruebas del PANEL del coach (admin-panel/plan360.html): Chromium + un Firebase simulado en memoria
// (ninguna nube real). Se separó de plan360-panel-auditoria.mjs para no copiar 40 líneas en cada prueba nueva.
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
export async function lanzarPanel(seed, ancho = 1280, alto = 900){
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
  await p.setViewport({width: ancho, height: alto});
  await p.goto('http://localhost:8950/admin-panel/plan360.html', {waitUntil:'domcontentloaded'});
  await new Promise(r => setTimeout(r, 1500));
  await p.evaluate(async () => { await onLoggedIn(); });
  const esperar = ms => new Promise(r => setTimeout(r, ms));
  await esperar(1200);
  const abrir = async (t, n) => { await p.evaluate(async (t, n) => { await openClient(t, n); }, t, n); await esperar(1200); };
  return {b, p, errs, esperar, abrir};
}
