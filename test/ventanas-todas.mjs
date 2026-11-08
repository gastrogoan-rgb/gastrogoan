/* TODAS LAS VENTANAS (8/11)
 * ─────────────────────────
 * Cada pantalla se recorre pulsando sus botones; todo lo que abre una VENTANA (modal) se mide con los mismos criterios que
 * `movil.mjs` (cortado, palabras partidas, letra < 11 px, objetivos táctiles, campos < 16 px en móvil) y, si SHOTS=<dir>,
 * se fotografía. Antes solo se miraban 7 (movil.mjs) o 15 (movil-lectura.mjs) de las ~90 ventanas de la app.
 *
 * Uso:  ANCHO=360 node test/ventanas-todas.mjs        (móvil)     ·   ANCHO=1280 SHOTS=/ruta node test/ventanas-todas.mjs
 * Botones que sacan de la app o destruyen datos NO se pulsan (NO_PULSAR); la confirmación de borrados se responde «no».
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const ANCHO = parseInt(process.env.ANCHO || '360', 10);
const SHOTS = process.env.SHOTS || '';
const MOVIL = ANCHO < 700;
const MAX_POR_VISTA = parseInt(process.env.MAX || '14', 10);

const VISTAS = [
  ['inicio', "navigate('home')"],
  ['cocina', "currentFolder='cocina'; navigate('folder')"],
  ['megalista', "currentFolder='cocina'; navigate('megalista')"],
  ['idr', "currentFolder='cocina'; navigate('idr')"],
  ['plan360', "currentFolder='gestion'; navigate('plan360')"],
  ['escandallo', "currentFolder='cocina'; navigate('escandallo')"],
  ['fichas', "currentFolder='cocina'; navigate('fichas')"],
  ['carta', "currentFolder='cocina'; navigate('carta')"],
  ['stock', "currentFolder='cocina'; navigate('stock')"],
  ['proveedores', "currentFolder='cocina'; navigate('proveedores')"],
  ['pedidos', "currentFolder='cocina'; navigate('pedidos')"],
  ['comandascocina', "currentFolder='cocina'; navigate('comandascocina')"],
  ['horarios', "currentFolder='cocina'; navigate('horarios')"],
  ['personal', "currentFolder='cocina'; navigate('horarios'); setHorariosTab && setHorariosTab('personal')"],
  ['distribucion', "currentFolder='cocina'; navigate('distribucion')"],
  ['limpieza', "currentFolder='cocina'; navigate('limpieza')"],
  ['tpv', "currentFolder='sala'; navigate('tpv')"],
  ['reservas', "currentFolder='sala'; navigate('reservas')"],
  ['clientes', "currentFolder='sala'; navigate('clientes')"],
  ['promocion', "currentFolder='sala'; navigate('promocion')"],
  ['dashboard', "currentFolder='gestion'; navigate('dashboard')"],
  ['ge-ventas', "currentFolder='gestion'; navigate('economia'); GE.tab('ventas')"],
  ['ge-fijos', "currentFolder='gestion'; navigate('economia'); GE.tab('fijos')"],
  ['ge-variables', "currentFolder='gestion'; navigate('economia'); GE.tab('variables')"],
  ['ge-cdr', "currentFolder='gestion'; navigate('economia'); GE.tab('cdr')"],
  ['ge-tesoreria', "currentFolder='gestion'; navigate('economia'); GE.tab('tesoreria')"],
  ['ge-pe', "currentFolder='gestion'; navigate('economia'); GE.tab('pe')"],
  ['ge-capex', "currentFolder='gestion'; navigate('economia'); GE.tab('capex')"],
  ['ge-bc', "currentFolder='gestion'; navigate('economia'); GE.tab('bc')"],
  ['minegocio', "currentFolder='gestion'; navigate('minegocio')"],
];
const SOLO = process.env.VISTAS ? process.env.VISTAS.split(',') : null;

// Botones que NO se pulsan: sacan de la app, borran de verdad o abren selectores del sistema.
const NO_PULSAR = /logout|cerrarSesion|closeSession|clearAccessSession|setLang\(|resetApp|wipe|factoryReset|downloadFullBackup|restoreBackup|switchBusiness|showBusinessSelectScreen|openCloudWizard|saveOwnFirebase|deleteBusiness|archiveOld|exportAll|\.click\(\)|location\.|printFicha|window\.print|navigator\.|connectThermal|stripe|Stripe|conectarStripe|pairPrinter|print|imprimir|descargar|download|exportar|Export/i;

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'], headless:'new'});
const page = await browser.newPage();
await page.setViewport({width:ANCHO, height: MOVIL ? 800 : 900, isMobile: MOVIL, hasTouch: MOVIL, deviceScaleFactor: 1});
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|raw.githubusercontent|stripe/.test(r.url()) ? r.abort() : r.continue());
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
await new Promise(r => setTimeout(r, 2500));
const datos = await page.evaluate(async () => (await fetch('/dist/ggburger.json')).json());
await page.evaluate(async d => {
  localStorage.setItem('gastrogoan_owner_login', '1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0, 10));
  if(d.license) localStorage.setItem('gastrogoan_license_v1', JSON.stringify(d.license));
  await idbSet('gastrogoan_data_v1', d);
}, datos);
await page.reload({waitUntil:'domcontentloaded'});
await page.waitForFunction(() => typeof DB !== 'undefined' && DB && DB.sales, {timeout:60000});
await page.evaluate(() => {
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(x => document.getElementById(x)?.remove());
  try{ hideAccessSelectScreen(); }catch(e){} try{ hideBusinessSelectScreen(); }catch(e){} try{ closeModal(); }catch(e){}
  document.getElementById('app-splash')?.remove();
  editUnlocked = true; document.body.classList.add('edit-unlocked', 'owner-session');
  window.open = () => null; window.print = () => {}; location.reload = () => {};
  window.confirmModal = async () => false; window.alertModal = async () => {};
  window.confirm = () => false; window.alert = () => {}; window.prompt = () => null;
});
await new Promise(r => setTimeout(r, 600));

const MEDIR = (W, movil) => {
  const caja = document.getElementById('modal-box');
  const ov = document.getElementById('modal-overlay');
  if(!caja || !ov || !ov.classList.contains('active') || !caja.innerHTML.trim()) return null;
  const out = {titulo: (caja.querySelector('h3, h2, .modal-header')?.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 50), cortado: [], partido: [], letra: [], toque: [], campo: [], scrollH: caja.scrollHeight, altoCaja: Math.round(caja.getBoundingClientRect().height), vacio: false};
  const texto = el => (el.innerText || el.textContent || el.getAttribute('aria-label') || el.placeholder || '').trim().replace(/\s+/g, ' ').slice(0, 30);
  const quien = el => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '');
  const lineasDe = el => { const n = el.firstChild; if(!n || n.nodeType !== 3) return 1; const r = document.createRange(); r.selectNodeContents(el); return Math.max(1, new Set([...r.getClientRects()].filter(x => x.width > 0).map(x => Math.round(x.top))).size); };
  const dentroDeScroll = el => { for(let p = el.parentElement; p && p !== document.body; p = p.parentElement){ const o = getComputedStyle(p).overflowX; if(o === 'auto' || o === 'scroll') return true; } return false; };
  const cr = caja.getBoundingClientRect();
  if(cr.right > W + 1.5 || cr.left < -1.5) out.cortado.push('LA CAJA ' + Math.round(cr.left) + '→' + Math.round(cr.right));
  if(!caja.innerText.trim()) out.vacio = true;
  caja.querySelectorAll('*').forEach(el => {
    if(!el.getClientRects().length) return;
    const r = el.getBoundingClientRect(); if(r.width === 0 || r.height === 0) return;
    if((r.right > W + 1.5 || r.left < -1.5) && !dentroDeScroll(el)) out.cortado.push(`${quien(el)} «${texto(el)}»`);
    const hoja = el.children.length === 0 && (el.textContent || '').trim().length > 0;
    if(hoja){
      const pal = (el.textContent || '').trim().split(/\s+/).length;
      if(lineasDe(el) > pal) out.partido.push(`«${texto(el)}» ${pal}pal→${lineasDe(el)}líneas [${quien(el)}]`);
      const fs = parseFloat(getComputedStyle(el).fontSize); if(fs && fs < 11) out.letra.push(`«${texto(el)}» ${fs}px [${quien(el)}]`);
    }
    if((el.tagName === 'BUTTON' || (el.tagName === 'A' && String(el.className).includes('btn'))) && (r.height < 36 || r.width < 36) && !el.closest('[hidden]')) out.toque.push(`«${texto(el)}» ${Math.round(r.width)}×${Math.round(r.height)}`);
    if(movil && ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) && !['checkbox', 'radio', 'hidden', 'file', 'range', 'color'].includes(el.type)){
      const fs = parseFloat(getComputedStyle(el).fontSize); if(fs < 16) out.campo.push(`${el.tagName.toLowerCase()}#${el.id || el.name || ''} ${fs}px`);
    }
  });
  const u = a => [...new Set(a)];
  out.cortado = u(out.cortado); out.partido = u(out.partido); out.letra = u(out.letra); out.toque = u(out.toque); out.campo = u(out.campo);
  return out;
};

const hallazgos = [];
const vistas = new Set();
let ventanas = 0, intentos = 0;
const yaVistas = new Set();
if(SHOTS) fs.mkdirSync(SHOTS, {recursive:true});


const limpiar = () => page.evaluate(() => { try{ closeModal(); }catch(e){} const ov = document.getElementById('modal-overlay'), bx = document.getElementById('modal-box'); if(ov) ov.classList.remove('active', 'is-sheet'); if(bx) bx.innerHTML = ''; document.querySelectorAll('.gg-menu, .mn-menu').forEach(x => x.remove()); });
const BOTONES = (no, enModal) => {
  const re = new RegExp(no, 'i');
  const raiz = enModal ? document.getElementById('modal-box') : (document.querySelector('.view.active') || document.body);
  const vistos = new Set(); const out = [];
  raiz.querySelectorAll('[onclick]').forEach(el => {
    if(!el.getClientRects().length) return;
    const oc = el.getAttribute('onclick') || '';
    if(re.test(oc)) return;
    if(/^\s*(navigate|setTab|setPedidosTab|setReservasTab|GE\.tab|setPromoTab|clIr|clVolver|backTo|toggle|ggTogglePlegable|closeModal|cancelConfirmModal|acceptConfirmModal|save|confirm|submit|finalize|perform|delete|remove|guardar|apply)/.test(oc)) return;
    if(/ggAbrirMenuAcciones/.test(oc)) return;
    const fn = (oc.match(/[A-Za-z_.]+\(/) || [''])[0];
    if(vistos.has(fn)) return;
    vistos.add(fn);
    out.push({ocFull: oc, oc: oc.slice(0, 80), txt: (el.innerText || el.getAttribute('aria-label') || el.getAttribute('data-tip') || '').trim().slice(0, 30)});
  });
  // menús «⋯»: cada acción que no sea peligrosa
  if(!enModal){
    [...raiz.querySelectorAll('[data-acc]')].filter(e => e.getClientRects().length).slice(0, 3).forEach((b, k) => {
      let lista = []; try{ lista = JSON.parse(b.dataset.acc || '[]'); }catch(e){}
      lista.forEach(a => { if(a.peligro || re.test(a.fn || '')) return; const fn = 'menu:' + (a.fn || '').split('(')[0]; if(vistos.has(fn)) return; vistos.add(fn); out.push({menu: k, ocFull: a.fn, oc: '⋯ ' + (a.texto || a.fn).slice(0, 60), txt: a.texto || ''}); });
    });
  }
  return out;
};
const pulsar = (c, enModal) => page.evaluate((c, enModal) => {
  const raiz = enModal ? document.getElementById('modal-box') : (document.querySelector('.view.active') || document.body);
  if(c.menu !== undefined){
    const b = [...raiz.querySelectorAll('[data-acc]')].filter(e => e.getClientRects().length)[c.menu]; if(!b) return false;
    b.click();
    const it = [...document.querySelectorAll('.mn-menu .mn-item')].find(e => e.getAttribute('onclick') === c.ocFull); if(!it) return false;
    it.click(); return true;
  }
  const el = [...raiz.querySelectorAll('[onclick]')].find(e => e.getAttribute('onclick') === c.ocFull && e.getClientRects().length);
  if(!el) return false; el.click(); return true;
}, c, enModal);
const medir = async (nombre, etiqueta, ruta) => {
  await new Promise(r => setTimeout(r, 450));
  // Con la máquina cargada la ventana aún puede estar entrando (escala .97): se mediría 35 px en un botón de 36,5.
  await page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))));
  const m = await page.evaluate(MEDIR, ANCHO, MOVIL);
  if(process.env.GG_DEBUG) console.log(`  ${nombre} · ${etiqueta} → ${m ? 'VENTANA «' + m.titulo + '»' : 'nada'}`);
  if(!m) return null;
  const clave = m.titulo + '|' + m.altoCaja;
  if(yaVistas.has(clave)) return m;
  yaVistas.add(clave); ventanas++;
  const n = m.cortado.length + m.partido.length + m.letra.length + m.toque.length + m.campo.length + (m.vacio ? 1 : 0);
  if(n) hallazgos.push({vista: nombre, boton: etiqueta, ...m});
  if(SHOTS) await page.screenshot({path: `${SHOTS}/${String(ventanas).padStart(3, '0')}-${nombre}-${(m.titulo || etiqueta || 'x').replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚ]+/g, '_').slice(0, 30)}-${ANCHO}.png`});
  return m;
};

for(const [nombre, js] of VISTAS){
  if(SOLO && !SOLO.includes(nombre)) continue;
  try{ await page.evaluate(js); }catch(e){ continue; }
  await new Promise(r => setTimeout(r, 500));
  const candidatos = await page.evaluate(BOTONES, NO_PULSAR.source, false);
  for(const c of candidatos.slice(0, MAX_POR_VISTA)){
    intentos++;
    try{
      await page.evaluate(js); await new Promise(r => setTimeout(r, 300)); await limpiar();
      if(!(await pulsar(c, false))) continue;
      const m = await medir(nombre, c.txt || c.oc, c);
      if(!m) continue;
      // segundo nivel: lo que se abre desde DENTRO de la ventana
      const hijos = await page.evaluate(BOTONES, NO_PULSAR.source, true);
      for(const h of hijos.slice(0, 5)){
        intentos++;
        await page.evaluate(js); await new Promise(r => setTimeout(r, 250)); await limpiar();
        if(!(await pulsar(c, false))) break;
        await new Promise(r => setTimeout(r, 400));
        if(!(await pulsar(h, true))) continue;
        await medir(nombre, (c.txt || c.oc) + ' › ' + (h.txt || h.oc), h);
      }
    }catch(e){ errs.push(nombre + ': ' + e.message.slice(0, 80)); }
  }
}
await browser.close();

console.log(`\nVentanas distintas abiertas y medidas: ${ventanas} (de ${intentos} botones pulsados) a ${ANCHO}px`);
hallazgos.forEach(h => {
  console.log(`\n▸ ${h.vista} → «${h.titulo || h.boton}»  [${h.altoCaja}px de alto]`);
  if(h.vacio) console.log('   VENTANA VACÍA');
  if(h.cortado.length) console.log('   cortado: ' + h.cortado.slice(0, 5).join(' · '));
  if(h.partido.length) console.log('   partido: ' + h.partido.slice(0, 5).join(' · '));
  if(h.letra.length) console.log('   letra:   ' + h.letra.slice(0, 5).join(' · '));
  if(h.toque.length) console.log('   toque:   ' + h.toque.slice(0, 6).join(' · '));
  if(h.campo.length) console.log('   campos <16px: ' + h.campo.slice(0, 6).join(' · '));
});
if(errs.length) console.log('\nErrores de JavaScript:\n  ' + [...new Set(errs)].slice(0, 10).join('\n  '));
console.log('\n' + '═'.repeat(60));
console.log(hallazgos.length || errs.length ? `❌ ${hallazgos.length} ventana(s) con hallazgos, ${errs.length} error(es)` : `✅ ${ventanas} ventanas sin hallazgos a ${ANCHO}px`);
process.exitCode = hallazgos.length || errs.length ? 1 : 0;
