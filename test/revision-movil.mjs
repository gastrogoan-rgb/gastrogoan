// REVISIÓN VISUAL DE MÓVIL (14/11) — herramienta para MIRAR la app, no para medirla.
// Abre la app con el negocio de prueba lleno (dist/ggburger.json) en un móvil emulado (táctil, pantalla completa) y, para cada pantalla,
// saca los fotogramas que vería una persona al hacer scroll (viewport entero, sin reducir nada). Con PULSAR abre también las ventanas.
// Uso:  ANCHO=390 ALTO=844 OUT=/ruta VISTAS=tpv,reservas node test/revision-movil.mjs      (servidor en :8950 sirviendo el repo)
//       VENTANAS=1 pulsa los botones de cada pantalla y fotografía cada ventana que se abre.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const ANCHO = parseInt(process.env.ANCHO || '390', 10), ALTO = parseInt(process.env.ALTO || '844', 10);
const OUT = process.env.OUT || '/tmp/claude-0/revision'; const SOLO = process.env.VISTAS ? process.env.VISTAS.split(',') : null;
const VENTANAS = process.env.VENTANAS === '1'; const MAX_FOTOS = parseInt(process.env.MAX_FOTOS || '6', 10); const MAX_VENT = parseInt(process.env.MAX_VENT || '10', 10);
fs.mkdirSync(OUT, {recursive: true});

export const VISTAS = [
  ['inicio', "navigate('home')"], ['cocina-carpeta', "currentFolder='cocina'; navigate('folder')"], ['sala-carpeta', "currentFolder='sala'; navigate('folder')"], ['gestion-carpeta', "currentFolder='gestion'; navigate('folder')"],
  ['megalista', "currentFolder='cocina'; navigate('megalista')"], ['idr', "currentFolder='cocina'; navigate('idr')"], ['escandallo', "currentFolder='cocina'; navigate('escandallo')"],
  ['fichas', "currentFolder='cocina'; navigate('fichas')"], ['carta', "currentFolder='cocina'; navigate('carta')"], ['stock', "currentFolder='cocina'; navigate('stock')"],
  ['proveedores', "currentFolder='cocina'; navigate('proveedores')"], ['pedidos', "currentFolder='cocina'; navigate('pedidos')"], ['comandascocina', "currentFolder='cocina'; navigate('comandascocina')"],
  ['horarios', "currentFolder='cocina'; navigate('horarios')"], ['personal', "currentFolder='cocina'; navigate('horarios'); setHorariosTab && setHorariosTab('personal')"],
  ['distribucion', "currentFolder='cocina'; navigate('distribucion')"], ['limpieza', "currentFolder='cocina'; navigate('limpieza')"],
  ['tpv', "currentFolder='sala'; navigate('tpv')"], ['reservas', "currentFolder='sala'; navigate('reservas')"], ['clientes', "currentFolder='sala'; navigate('clientes')"], ['promocion', "currentFolder='sala'; navigate('promocion')"],
  ['dashboard', "currentFolder='gestion'; navigate('dashboard')"],
  ['ge-ventas', "currentFolder='gestion'; navigate('economia'); GE.tab('ventas')"], ['ge-fijos', "currentFolder='gestion'; navigate('economia'); GE.tab('fijos')"],
  ['ge-variables', "currentFolder='gestion'; navigate('economia'); GE.tab('variables')"], ['ge-cdr', "currentFolder='gestion'; navigate('economia'); GE.tab('cdr')"],
  ['ge-tesoreria', "currentFolder='gestion'; navigate('economia'); GE.tab('tesoreria')"], ['ge-pe', "currentFolder='gestion'; navigate('economia'); GE.tab('pe')"],
  ['ge-capex', "currentFolder='gestion'; navigate('economia'); GE.tab('capex')"], ['ge-bc', "currentFolder='gestion'; navigate('economia'); GE.tab('bc')"],
  ['minegocio', "currentFolder='gestion'; navigate('minegocio')"], ['plan360', "currentFolder='gestion'; navigate('plan360')"],
];

// EXTRA='nombre=js;;nombre2=js2' añade pantallas o estados a medida (se ejecutan tal cual en la página).
if(process.env.EXTRA) process.env.EXTRA.split(';;').forEach(x => { const i = x.indexOf('='); VISTAS.push([x.slice(0, i), x.slice(i + 1)]); });
const browser = await puppeteer.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'], headless: 'new'});
const page = await browser.newPage();
await page.setViewport({width: ANCHO, height: ALTO, isMobile: true, hasTouch: true, deviceScaleFactor: 2});
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|raw.githubusercontent|stripe/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/index.html', {waitUntil: 'domcontentloaded'});
await new Promise(r => setTimeout(r, 2500));
const datos = await page.evaluate(async () => (await fetch('/dist/ggburger.json')).json());
await page.evaluate(async d => {
  localStorage.setItem('gastrogoan_owner_login', '1'); localStorage.setItem('gastrogoan_access_session', JSON.stringify({type: 'owner', ts: Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted', '1'); localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0, 10));
  if(d.license) localStorage.setItem('gastrogoan_license_v1', JSON.stringify(d.license)); await idbSet('gastrogoan_data_v1', d);
}, datos);
await page.reload({waitUntil: 'domcontentloaded'});
await page.waitForFunction(() => typeof DB !== 'undefined' && DB && DB.sales, {timeout: 60000});
await page.evaluate(() => {
  ['netlify-gate', 'license-gate', 'extconn-gate', 'firebase-gate', 'revoked-gate'].forEach(x => document.getElementById(x)?.remove());
  try{ hideAccessSelectScreen(); }catch(e){} try{ hideBusinessSelectScreen(); }catch(e){} try{ closeModal(); }catch(e){}
  document.getElementById('app-splash')?.remove(); editUnlocked = true; document.body.classList.add('edit-unlocked', 'owner-session');
  window.open = () => null; window.print = () => {}; window.confirmModal = async () => false; window.alertModal = async () => {}; window.confirm = () => false; window.alert = () => {}; window.prompt = () => null;
});
await new Promise(r => setTimeout(r, 600));

// Qué se desplaza: la ventana o #content.
const scroller = () => page.evaluate(() => { const c = document.getElementById('content'); const o = c && getComputedStyle(c).overflowY; return (c && (o === 'auto' || o === 'scroll') && c.scrollHeight > c.clientHeight + 4) ? 'content' : 'window'; });
const alto = async () => page.evaluate(() => { const c = document.getElementById('content'); const o = c && getComputedStyle(c).overflowY; return (c && (o === 'auto' || o === 'scroll') && c.scrollHeight > c.clientHeight + 4) ? c.scrollHeight : document.documentElement.scrollHeight; });
const irA = y => page.evaluate(y => { const c = document.getElementById('content'); const o = c && getComputedStyle(c).overflowY; if(c && (o === 'auto' || o === 'scroll') && c.scrollHeight > c.clientHeight + 4) c.scrollTop = y; else window.scrollTo(0, y); }, y);

const indice = [];
for(const [nombre, js] of VISTAS){
  if(SOLO && !SOLO.includes(nombre)) continue;
  try{ await page.evaluate(() => { try{ closeModal(); }catch(e){} }); }catch(e){}
  try{ await page.evaluate(js); }catch(e){ indice.push(`${nombre}: ERROR al abrir ${e.message}`); continue; }
  await new Promise(r => setTimeout(r, 1300));
  const total = await alto(); const paso = Math.round(ALTO * 0.82); const n = Math.min(MAX_FOTOS, Math.max(1, Math.ceil(total / paso)));
  for(let i = 0; i < n; i++){
    await irA(i * paso); await new Promise(r => setTimeout(r, 250));
    await page.screenshot({path: `${OUT}/${nombre}-${ANCHO}-${String(i + 1).padStart(2, '0')}.png`});
  }
  indice.push(`${nombre}: ${n} fotogramas (alto de la página ${total}px)`);
  await irA(0);
  if(VENTANAS){
    const botones = await page.evaluate(() => [...document.querySelectorAll('#content button[onclick], #content .btn[onclick], #content [onclick*="open"]')].filter(b => b.getClientRects().length && !/logout|cerrarSesion|setLang|resetApp|wipe|backup|switchBusiness|showBusinessSelect/i.test(b.getAttribute('onclick') || '')).map(b => b.getAttribute('onclick')).filter((v, i, a) => a.indexOf(v) === i));
    let v = 0;
    for(const oc of botones){
      if(v >= MAX_VENT) break;
      try{
        await page.evaluate(js, ); await new Promise(r => setTimeout(r, 500));
        await page.evaluate(oc => { try{ closeModal(); }catch(e){} const b = [...document.querySelectorAll('[onclick]')].find(x => x.getAttribute('onclick') === oc && x.getClientRects().length); if(b) b.click(); }, oc);
        await new Promise(r => setTimeout(r, 700));
        const abierta = await page.evaluate(() => { const ov = document.getElementById('modal-overlay'); return !!(ov && ov.classList.contains('active') && document.getElementById('modal-box').innerHTML.trim()); });
        if(abierta){ v++; await page.screenshot({path: `${OUT}/${nombre}-VENT${String(v).padStart(2, '0')}-${ANCHO}.png`}); indice.push(`${nombre} ventana ${v}: ${oc.slice(0, 60)}`); await page.evaluate(() => { try{ closeModal(); }catch(e){} }); }
      }catch(e){}
    }
  }
}
fs.writeFileSync(`${OUT}/INDICE-${ANCHO}.txt`, indice.join('\n') + '\n');
console.log(indice.join('\n'));
await browser.close();
