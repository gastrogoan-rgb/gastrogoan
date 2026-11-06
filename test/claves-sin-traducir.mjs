// CLAVES SIN TRADUCIR (7/11): ninguna pantalla puede enseñar una clave interna («module.sala.idr.name») en vez de su texto.
// Se coló una en la carpeta Sala (el módulo I+D no tenía textos en ningún idioma) y ninguna prueba la vio, porque
// `traducciones.mjs` mira 41 pantallas elegidas a mano. Esta recorre TODAS las vistas, las tres carpetas y las
// pestañas de Gestión Económica, en es/ca/en, y busca texto con forma de clave.
import puppeteer from 'puppeteer-core';
const VISTAS = [
  ['inicio', "navigate('home')"],
  ['cocina', "currentFolder='cocina'; navigate('folder')"],
  ['megalista', "navigate('megalista')"],
  ['escandallo', "navigate('escandallo')"],
  ['fichas', "navigate('fichas')"],
  ['carta', "navigate('carta')"],
  ['stock', "navigate('stock')"],
  ['proveedores', "navigate('proveedores')"],
  ['pedidos', "navigate('pedidos')"],
  ['comandascocina', "navigate('comandascocina')"],
  ['horarios', "navigate('horarios')"],
  ['distribucion', "navigate('distribucion')"],
  ['limpieza', "navigate('limpieza')"],
  ['tpv', "currentFolder='sala'; navigate('tpv')"],
  ['reservas', "navigate('reservas')"],
  ['clientes', "navigate('clientes')"],
  ['promocion', "navigate('promocion')"],
  ['dashboard', "currentFolder='gestion'; navigate('dashboard')"],
  ['ge-ventas', "navigate('economia'); GE.tab('ventas')"],
  ['ge-fijos', "navigate('economia'); GE.tab('fijos')"],
  ['ge-variables', "navigate('economia'); GE.tab('variables')"],
  ['ge-cdr', "navigate('economia'); GE.tab('cdr')"],
  ['ge-tesoreria', "navigate('economia'); GE.tab('tesoreria')"],
  ['ge-pe', "navigate('economia'); GE.tab('pe')"],
  ['ge-capex', "navigate('economia'); GE.tab('capex')"],
  ['ge-bc', "navigate('economia'); GE.tab('bc')"],
  ['minegocio', "navigate('minegocio')"],
  ['manual', "navigate('manual')"],
];


VISTAS.push(['sala', "currentFolder='sala'; navigate('folder')"], ['gestion', "currentFolder='gestion'; navigate('folder')"]);
const CLAVE = /^[a-z][a-z0-9]*(\.[a-zA-Z0-9_-]+){1,}$/;
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage(); await page.setViewport({width:1280, height:800});
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|raw.githubusercontent/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
await new Promise(r => setTimeout(r, 2500));
const datos = await page.evaluate(async () => (await fetch('/dist/ggburger.json')).json());
await page.evaluate(async d => {
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
  if(d.license) localStorage.setItem('gastrogoan_license_v1', JSON.stringify(d.license));
  await idbSet('gastrogoan_data_v1', d);
}, datos);
await page.reload({waitUntil:'domcontentloaded'});
await page.waitForFunction(() => typeof DB !== 'undefined' && DB && DB.sales, {timeout:60000});
await page.evaluate(() => { ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(x => document.getElementById(x)?.remove()); try{hideAccessSelectScreen();}catch(e){} try{hideBusinessSelectScreen();}catch(e){} try{closeModal();}catch(e){} editUnlocked = true; document.body.classList.add('edit-unlocked','owner-session'); });
const w = ms => new Promise(r => setTimeout(r, ms));
const claves = () => page.evaluate(CLAVE_SRC => {
  const re = new RegExp(CLAVE_SRC);
  const out = [];
  const raiz = document.getElementById('content') || document.body;
  const it = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
  for(let n = it.nextNode(); n; n = it.nextNode()){
    const t = (n.textContent || '').trim();
    if(!t || t.length > 60 || /\s/.test(t)) continue;
    const p = n.parentElement; if(!p || !p.getClientRects().length) continue;
    if(re.test(t) && !/^[0-9.,]+$/.test(t) && !/\.(html|json|csv|pdf|xlsx|com|es|js)$/i.test(t) && !/^www\./i.test(t)) out.push(t);
  }
  ['placeholder','title','aria-label','data-tip'].forEach(a => document.querySelectorAll('['+a+']').forEach(e => { const v = (e.getAttribute(a)||'').trim(); if(v && !/\s/.test(v) && v.length < 60 && re.test(v) && !/^www\./i.test(v) && e.getClientRects().length) out.push(a+':'+v); }));
  return [...new Set(out)];
}, CLAVE.source);
let fallos = 0;
for(const lang of ['es','ca','en']){
  await page.evaluate(l => { localStorage.setItem('gastrogoan_lang', l); try{ setLang(l); }catch(e){} }, lang).catch(() => {});
  await page.waitForFunction(() => typeof DB !== 'undefined' && DB, {timeout:30000});
  await w(800);
  await page.evaluate(() => { ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(x => document.getElementById(x)?.remove()); try{hideAccessSelectScreen();}catch(e){} try{hideBusinessSelectScreen();}catch(e){} try{closeModal();}catch(e){} editUnlocked = true; document.body.classList.add('edit-unlocked','owner-session'); });
  const malas = [];
  for(const [nombre, js] of VISTAS){
    try{ await page.evaluate(js); }catch(e){}
    await w(450);
    const c = await claves();
    if(c.length) malas.push(nombre + ' → ' + c.slice(0,6).join(', '));
  }
  if(malas.length){ fallos += malas.length; console.log('❌ ' + lang + ': claves sin traducir en ' + malas.length + ' pantalla(s)\n   ' + malas.join('\n   ')); }
  else console.log('✅ ' + lang + ': ninguna pantalla enseña una clave interna (' + VISTAS.length + ' vistas)');
}
if(errs.length){ fallos++; console.log('❌ errores de página: ' + errs.slice(0,3).join(' | ')); }
if(!fallos) console.log('✅ ninguna clave interna a la vista en es, ca y en');
await browser.close();
process.exit(fallos ? 1 : 0);
