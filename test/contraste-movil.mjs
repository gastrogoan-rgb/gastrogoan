// CONTRASTE EN MÓVIL CON DATOS LLENOS (16/11, vídeo en un móvil real): `contraste.mjs` mira 1440 px y un negocio casi vacío, así
// que no veía las ayudas en gris claro de Gestión Económica y del Panel (la de «¿Cómo se calcula?» salía a ~2,6:1). Aquí se abre
// cada pantalla de Gestión con el negocio de prueba lleno (dist/ggburger.json), a 360 px, con los desplegables abiertos, y todo
// texto debe llegar a 4,5:1 (3:1 si es grande). Un fondo semitransparente se compone con lo que hay debajo.
import puppeteer from 'puppeteer-core';
const BASE = process.env.GG_URL || 'http://localhost:8950';
const VISTAS = [
  ['panel', "currentFolder='gestion'; navigate('dashboard')"],
  ['ge-ventas', "currentFolder='gestion'; navigate('economia'); GE.tab('ventas')"],
  ['ge-fijos', "navigate('economia'); GE.tab('fijos')"],
  ['ge-variables', "navigate('economia'); GE.tab('variables')"],
  ['ge-cdr', "navigate('economia'); GE.tab('cdr')"],
  ['ge-tesoreria', "navigate('economia'); GE.tab('tesoreria')"],
  ['ge-bc', "navigate('economia'); GE.tab('bc')"],
  ['ge-pe', "navigate('economia'); GE.tab('pe')"],
  ['ge-capex', "navigate('economia'); GE.tab('capex')"],
  ['megalista', "currentFolder='cocina'; navigate('megalista')"],
  ['proveedores', "navigate('proveedores')"],
  ['carta', "navigate('carta')"],
  ['promo-novedades', "currentFolder='sala'; navigate('promocion')"],
  ['minegocio', "currentFolder='gestion'; navigate('minegocio')"],
  ['manual', "navigate('manual')"],
];
const w = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox']});
const page = await browser.newPage(); await page.setViewport({width: 360, height: 800, isMobile: true, hasTouch: true});
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|raw.githubusercontent/.test(r.url()) ? r.abort() : r.continue());
await page.goto(BASE + '/dist/index.html', {waitUntil: 'domcontentloaded'}); await w(2500);
const datos = await page.evaluate(async () => (await fetch('/dist/ggburger.json')).json());
await page.evaluate(async d => { localStorage.setItem('gastrogoan_owner_login', '1'); localStorage.setItem('gastrogoan_access_session', JSON.stringify({type: 'owner', ts: Date.now()})); localStorage.setItem('gastrogoan_owner_pass_prompted', '1'); localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0, 10)); if(d.license) localStorage.setItem('gastrogoan_license_v1', JSON.stringify(d.license)); await idbSet('gastrogoan_data_v1', d); }, datos);
await page.reload({waitUntil: 'domcontentloaded'}); await page.waitForFunction(() => typeof DB !== 'undefined' && DB && DB.sales, {timeout: 60000}); await w(1200);
await page.evaluate(() => { ['netlify-gate', 'license-gate', 'extconn-gate', 'firebase-gate', 'revoked-gate', 'app-splash'].forEach(x => document.getElementById(x)?.remove()); try{hideAccessSelectScreen();}catch(e){} try{hideBusinessSelectScreen();}catch(e){} try{closeModal();}catch(e){} editUnlocked = true; document.body.classList.add('edit-unlocked', 'owner-session'); });
const malos = [];
for(const [n, js] of VISTAS){
  try{ await page.evaluate(js); }catch(e){}
  await w(1300);
  const r = await page.evaluate(() => {
    document.querySelectorAll('.view.active details').forEach(d => d.open = true);
    const lum = c => { const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const parse = s => { const m = s.match(/rgba?\(([^)]+)\)/); if(!m) return null; const p = m[1].split(',').map(x => parseFloat(x)); return {rgb: [p[0], p[1], p[2]], a: p.length > 3 ? p[3] : 1}; };
    const mezcla = (f, b) => f.a >= 1 ? f.rgb : f.rgb.map((c, i) => c * f.a + b[i] * (1 - f.a));
    const fondoDe = e => {
      const capas = []; let n = e;
      while(n && n !== document.documentElement){
        const b = parse(n.classList.contains('btn-fino') ? getComputedStyle(n, '::before').backgroundColor : getComputedStyle(n).backgroundColor);
        if(b && b.a > 0) capas.push(b); if(b && b.a >= 1) break; n = n.parentElement;
      }
      let base = [250, 248, 244]; for(let i = capas.length - 1; i >= 0; i--) base = mezcla(capas[i], base); return base;
    };
    const out = [];
    document.querySelectorAll('.view.active *').forEach(e => {
      if(![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 2)) return;
      const rr = e.getBoundingClientRect(); if(!rr.width || !rr.height) return;
      const cs = getComputedStyle(e); if(cs.visibility === 'hidden' || cs.opacity === '0') return;
      if(e.closest('[disabled],[aria-disabled=true],.is-disabled,.disabled')) return;   // un control apagado está exento (WCAG 1.4.3)
      const fg = parse(cs.color); if(!fg) return;
      const bg = fondoDe(e), fgc = mezcla(fg, bg);
      const l1 = lum(fgc), l2 = lum(bg), ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      const fs = parseFloat(cs.fontSize), grande = fs >= 24 || (fs >= 18.66 && parseInt(cs.fontWeight) >= 700);
      if(ratio < (grande ? 3 : 4.5)) out.push(ratio.toFixed(2) + ' «' + e.textContent.trim().replace(/\s+/g, ' ').slice(0, 34) + '» ' + e.tagName.toLowerCase() + '.' + String(e.className).split(' ')[0] + ' ' + cs.color);
    });
    return [...new Set(out)];
  });
  if(r.length) malos.push({n, r});
}
await browser.close();
if(malos.length){
  console.log('❌ texto por debajo de 4,5:1 en móvil (360 px, datos llenos)');
  malos.forEach(m => { console.log('  ▸ ' + m.n); m.r.slice(0, 12).forEach(x => console.log('      ' + x)); });
  process.exit(1);
}
console.log('✅ ' + VISTAS.length + ' pantallas a 360 px con datos llenos: todo el texto llega a 4,5:1 (3:1 si es grande)');
