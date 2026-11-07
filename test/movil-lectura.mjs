// LECTURA EN MÓVIL (7/11): lo que `movil.mjs` no mide y hace que el móvil «se sienta roto».
//  1) Ningún campo (input, select, textarea) con letra menor de 16 px: por debajo, Safari de iPhone AMPLÍA toda la página al
//     tocarlo y ya no vuelve solo. Había 13 px en todos los buscadores y en 98 de los 123 campos de Mi Negocio.
//  3) Nada cortado por el borde de la pantalla (`movil.mjs` solo mira la PRIMERA pestaña de cada pantalla: el «⋯» de las lecturas de
//     temperatura salía medio fuera en la pestaña Temperaturas y nadie lo veía).
//  2) Ningún texto largo aplastado en una columna de letras: «Reserva IVA (modelo 303)» salía en 33 líneas de una letra en Tesorería
//     (`movil.mjs` solo mira elementos hoja; ese texto colgaba de un elemento con icono).
// Recorre TODAS las pantallas y sus pestañas internas en los cinco anchos de móvil.
import puppeteer from 'puppeteer-core';
const TODOS = [
 ['inicio', "navigate('home')"],
 ['cocina', "currentFolder='cocina'; navigate('folder')"],
 ['sala', "currentFolder='sala'; navigate('folder')"],
 ['gestion', "currentFolder='gestion'; navigate('folder')"],
 ['comandas', "navigate('comandascocina')"],
 ['carta', "navigate('carta')"],
 ['carta-menus', "navigate('carta')", ['Menús']],
 ['idr', "currentFolder='cocina'; navigate('idr')"],
 ['megalista', "navigate('megalista')"],
 ['proveedores', "navigate('proveedores')"],
 ['escandallo', "navigate('escandallo')"],
 ['escandallo-elab', "navigate('escandallo')", ['Elaboraciones']],
 ['fichas', "navigate('fichas')"],
 ['pedidos', "navigate('pedidos')"],
 ['pedidos-hist', "navigate('pedidos')", ['Historial de Pedidos']],
 ['stock', "navigate('stock')"],
 ['stock-elab', "navigate('stock')", ['Elaboraciones']],
 ['horarios', "navigate('horarios')"],
 ['horarios-cal', "navigate('horarios')", ['Calendario']],
 ['distribucion', "navigate('distribucion')"],
 ['limpieza', "navigate('limpieza')"],
 ['limpieza-temp', "navigate('limpieza')", ['Temperaturas']],
 ['limpieza-alerg', "navigate('limpieza')", ['Alérgenos']],
 ['limpieza-mant', "navigate('limpieza')", ['Mantenimiento']],
 ['tpv', "currentFolder='sala'; navigate('tpv')"],
 ['reservas', "navigate('reservas')"],
 ['reservas-sem', "navigate('reservas')", ['Semana']],
 ['reservas-mes', "navigate('reservas')", ['Mes']],
 ['clientes', "navigate('clientes')"],
 ['promocion', "navigate('promocion')"],
 ['promo-sem', "navigate('promocion')", ['Semana']],
 ['promo-mes', "navigate('promocion')", ['Mes']],
 ['promo-nov', "navigate('promocion')", ['Novedades']],
 ['promo-cli', "navigate('promocion')", ['Clientes']],
 ['promo-ideas', "navigate('promocion')", ['Ideas de contenido']],
 ['dashboard', "currentFolder='gestion'; navigate('dashboard')"],
 ['ge-ventas', "navigate('economia'); GE.tab('ventas')"],
 ['ge-fijos', "navigate('economia'); GE.tab('fijos')"],
 ['ge-variables', "navigate('economia'); GE.tab('variables')"],
 ['ge-cdr', "navigate('economia'); GE.tab('cdr')"],
 ['ge-tesoreria', "navigate('economia'); GE.tab('tesoreria')"],
 ['ge-bc', "navigate('economia'); GE.tab('bc')"],
 ['ge-pe', "navigate('economia'); GE.tab('pe')"],
 ['ge-capex', "navigate('economia'); GE.tab('capex')"],
 ['minegocio', "navigate('minegocio')"],
 ['manual', "navigate('manual')"],
 ['plan360', "currentFolder='gestion'; navigate('plan360')"],
];
const SOLO = (process.argv[2] || '').split(',').filter(Boolean);   // ej.: node test/movil-lectura.mjs ge-tesoreria,megalista
const ESTADOS = SOLO.length ? TODOS.filter(e => SOLO.includes(e[0])) : TODOS;
const MODALES = [
  ['abrir mesa', "currentFolder='sala'; navigate('tpv'); openTableOrder((DB.tables[0]||{}).id)"],
  ['nuevo ingrediente', "currentFolder='cocina'; navigate('megalista'); openIngredientModal()"],
  ['nuevo cliente', "currentFolder='sala'; navigate('clientes'); openClientModal()"],
  ['nueva reserva', "currentFolder='sala'; navigate('reservas'); openReservationModal()"],
  ['nuevo empleado', "currentFolder='cocina'; navigate('horarios'); openEmployeeModal()"],
  ['exportar contabilidad', "currentFolder='gestion'; navigate('economia'); GE.openExportModal()"],
  ['centro de ayuda', "toggleHelpPanel()"],
];
const ANCHOS = [[320,568],[360,800],[390,844],[412,915],[430,932]];
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox']});
const w = ms => new Promise(r => setTimeout(r, ms));
const hall = [];
for(const [W,H] of ANCHOS){
  const page = await browser.newPage(); await page.setViewport({width:W,height:H,isMobile:true,hasTouch:true,deviceScaleFactor:1});
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|raw.githubusercontent/.test(r.url()) ? r.abort() : r.continue());
  await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'}); await w(2500);
  const datos = await page.evaluate(async () => (await fetch('/dist/ggburger.json')).json());
  await page.evaluate(async d => { localStorage.setItem('gastrogoan_owner_login','1'); localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()})); localStorage.setItem('gastrogoan_owner_pass_prompted','1'); localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10)); if(d.license) localStorage.setItem('gastrogoan_license_v1', JSON.stringify(d.license)); await idbSet('gastrogoan_data_v1', d); }, datos);
  await page.reload({waitUntil:'domcontentloaded'}); await page.waitForFunction(() => typeof DB !== 'undefined' && DB && DB.sales, {timeout:60000}); await w(1200);
  await page.evaluate(() => { ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate','app-splash'].forEach(x => document.getElementById(x)?.remove()); try{hideAccessSelectScreen();}catch(e){} try{hideBusinessSelectScreen();}catch(e){} try{closeModal();}catch(e){} editUnlocked = true; document.body.classList.add('edit-unlocked','owner-session'); });
  for(const [n, js, clics] of ESTADOS){
    try{ await page.evaluate(js); }catch(e){}
    await w(650);
    for(const txt of (clics || [])){ await page.evaluate(t => { const v = document.querySelector('.view.active') || document; const b = [...v.querySelectorAll('button,a,[role=tab]')].find(x => x.getClientRects().length && x.textContent.trim().toLowerCase().includes(t.toLowerCase())); if(b) b.click(); }, txt); await w(500); }
    const r = await page.evaluate(() => {
      const v = document.querySelector('.view.active'); if(!v) return {campos:[], aplastado:[], cortado:[]};
      const campos = [...v.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=range]):not([type=color]):not([type=file]),select,textarea')]
        .filter(e => e.getClientRects().length && parseFloat(getComputedStyle(e).fontSize) < 16)
        .map(e => e.tagName.toLowerCase() + ' ' + parseFloat(getComputedStyle(e).fontSize) + 'px «' + (e.placeholder || e.id || '').slice(0, 22) + '»');
      const aplastado = [], cortado = [], Wv = window.innerWidth;
      const dentroDeScroll = el => { for(let q = el.parentElement; q && q !== document.body; q = q.parentElement){ const o = getComputedStyle(q).overflowX; if(o === 'auto' || o === 'scroll' || o === 'hidden' && q.classList.contains('mn-indice')) return true; } return false; };
      v.querySelectorAll('*').forEach(el => {
        if(!el.getClientRects().length) return; const rc = el.getBoundingClientRect(); if(rc.width === 0 || rc.height === 0) return;
        // Por la derecha se perdona si cuelga de algo con scroll; por la IZQUIERDA nunca (no hay scroll que lo recupere).
        if(rc.left < -1.5 || (rc.right > Wv + 1.5 && !dentroDeScroll(el))){
          const cs = getComputedStyle(el); if(cs.position === 'fixed') return;
          cortado.push(el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : '') + ' «' + (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 24) + '» x=' + Math.round(rc.left) + '..' + Math.round(rc.right));
        }
      });
      const it = document.createTreeWalker(v, NodeFilter.SHOW_TEXT);
      for(let nd = it.nextNode(); nd; nd = it.nextNode()){
        const t = (nd.textContent || '').trim().replace(/\s+/g, ' '); if(t.length < 12) continue;
        const p = nd.parentElement; if(!p || !p.getClientRects().length) continue;
        const rg = document.createRange(); rg.selectNodeContents(nd);
        const rects = [...rg.getClientRects()].filter(x => x.width > 0 && x.height > 0); if(!rects.length) continue;
        const lineas = new Set(rects.map(x => Math.round(x.top))).size, palabras = t.split(' ').length;
        if(lineas > palabras + 2 || Math.max(...rects.map(x => x.width)) < 30) aplastado.push(t.slice(0, 40) + ' → ' + lineas + ' líneas / ' + palabras + ' palabras');
      }
      return {campos:[...new Set(campos)], aplastado:[...new Set(aplastado)], cortado:[...new Set(cortado)]};
    });
    if(r.campos.length || r.aplastado.length || r.cortado.length) hall.push({W, n, ...r});
  }
  // Las ventanas (donde más se escribe en un móvil): mismos criterios dentro de #modal-box.
  for(const [nombre, js] of MODALES){
    try{ await page.evaluate(js); }catch(e){ continue; }
    await w(650);
    const r = await page.evaluate(() => {
      const caja = document.getElementById('modal-box'); if(!caja || !caja.getClientRects().length) return null;
      const campos = [...caja.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=range]):not([type=color]):not([type=file]),select,textarea')].filter(e => e.getClientRects().length && parseFloat(getComputedStyle(e).fontSize) < 16).map(e => e.tagName.toLowerCase() + ' ' + parseFloat(getComputedStyle(e).fontSize) + 'px «' + (e.placeholder || e.id || '').slice(0, 22) + '»');
      const Wv = window.innerWidth, cortado = [];
      caja.querySelectorAll('*').forEach(el => { if(!el.getClientRects().length) return; const rc = el.getBoundingClientRect(); if(rc.width === 0 || rc.height === 0) return; if(rc.left < -1.5 || rc.right > Wv + 1.5){ let sc = false; for(let q = el.parentElement; q && q !== document.body; q = q.parentElement){ const o = getComputedStyle(q).overflowX; if(o === 'auto' || o === 'scroll') sc = true; } if(rc.left < -1.5 || !sc) cortado.push(el.tagName.toLowerCase() + ' «' + (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 24) + '»'); } });
      return {campos:[...new Set(campos)], aplastado:[], cortado:[...new Set(cortado)]};
    });
    try{ await page.evaluate(() => { try{ closeModal(); }catch(e){} try{ if(document.getElementById('help-panel')?.classList.contains('active')) toggleHelpPanel(); }catch(e){} }); }catch(e){}
    await w(200);
    if(r && (r.campos.length || r.cortado.length)) hall.push({W, n: 'ventana: ' + nombre, ...r});
  }
  await page.close();
}
await browser.close();
if(hall.length){
  console.log('❌ ' + hall.length + ' pantalla(s) con fallos de lectura en móvil');
  hall.slice(0, 40).forEach(h => { console.log('  ▸ ' + h.n + ' @ ' + h.W + 'px'); h.campos.slice(0, 3).forEach(x => console.log('      campo pequeño: ' + x)); h.aplastado.slice(0, 3).forEach(x => console.log('      texto aplastado: ' + x)); h.cortado.slice(0, 4).forEach(x => console.log('      cortado por el borde: ' + x)); });
  process.exit(1);
}
console.log('✅ ' + ESTADOS.length + ' pantallas × 5 anchos: todos los campos a 16 px o más, ningún texto aplastado en columna de letras y nada cortado por el borde');
