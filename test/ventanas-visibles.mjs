// VENTANAS Y AVISOS SIEMPRE ENTEROS (13/11). El dueño: «las ventanas se quedan comidas y no se ve el recuadro entero centrado en la pantalla; y el botón negro
// de aviso (el que sale abajo al aplicar algo) se queda comido». Norma: una ventana (modal) cabe SIEMPRE entera en lo que se ve —cabecera y pie incluidos—,
// centrada de lado a lado, con aire por los cuatro lados; y el aviso (toast) se ve al 100 % con aire por todos los lados y por encima de todo lo demás.
// Se mide en 9 tamaños de pantalla (móviles, tablet, PC y apaisado), con ventanas cortas, largas, anchas y la de la comanda, y el aviso con y sin ventana abierta.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
let fallos = 0;
async function caso(n, fn){ try{ const d = await fn(); console.log('✅ ' + n + (d ? '  → ' + d : '')); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const TAMANOS = [[320, 568], [360, 640], [390, 844], [412, 915], [568, 320], [667, 375], [768, 1024], [1024, 600], [1280, 720]];
const page = await browser.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/index.html', {waitUntil: 'domcontentloaded'});
await page.evaluate(() => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code: 'VENVIS01', tenantId: ggBizTenantId('VENVIS01')}));
  localStorage.setItem('gastrogoan_owner_login', '1'); localStorage.setItem('gastrogoan_access_session', JSON.stringify({type: 'owner', ts: Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted', '1'); localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0, 10));
});
await page.reload({waitUntil: 'domcontentloaded'}); await new Promise(r => setTimeout(r, 2000));
await page.evaluate(() => {
  ['netlify-gate', 'license-gate', 'extconn-gate', 'firebase-gate', 'revoked-gate', 'app-splash'].forEach(id => document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone: true, extConnPromptSeen: true, tourSeen: true, categoryIconHintSeen: true});
  DB.business.ownFirebase = {apiKey: 'fake', databaseURL: 'https://fake-default-rtdb.firebaseio.com'};
  DB.tables = [{id: 1, name: 'Mesa 1', plazas: 4}]; currentFolder = 'sala'; ownerUnlocked = true; navigate('tpv');
});
await new Promise(r => setTimeout(r, 800));
const w = ms => new Promise(r => setTimeout(r, ms));
const poner = async (ancho, alto) => { await page.setViewport({width: ancho, height: alto, isMobile: false, hasTouch: false, deviceScaleFactor: 1}); await w(250); };

await page.evaluate(() => { window.__largo = n => Array.from({length: n}, (_, i) => `<div class="field"><label for="vv-${i}">Campo ${i + 1}</label><input id="vv-${i}" type="text" value="Valor de prueba ${i + 1}"></div>`).join(''); });
// Cada ventana es TEXTO (se ejecuta dentro de la página: las funciones no cruzan al navegador).
const VENTANAS = {
  corta: "openModal('<div class=\"modal-header\"><h3>Ventana corta</h3><button class=\"modal-close\" onclick=\"closeModal()\">&times;</button></div><p>Un aviso corto.</p><div class=\"modal-footer\"><button class=\"btn\" onclick=\"closeModal()\">Cerrar</button><button class=\"btn btn-primary\">Aceptar</button></div>')",
  larga: "openModal('<div class=\"modal-header\"><h3>Ventana muy larga</h3><button class=\"modal-close\" onclick=\"closeModal()\">&times;</button></div>' + __largo(40) + '<div class=\"modal-footer\"><button class=\"btn\" onclick=\"closeModal()\">Cancelar</button><button class=\"btn btn-primary\">Guardar</button></div>')",
  ancha: "openModal('<div class=\"modal-header\"><h3>Ventana ancha</h3><button class=\"modal-close\" onclick=\"closeModal()\">&times;</button></div>' + __largo(12) + '<div class=\"modal-footer\"><button class=\"btn\" onclick=\"closeModal()\">Cerrar</button></div>', 'xl')",
  tabla: "openModal('<div class=\"modal-header\"><h3>Con tabla ancha</h3><button class=\"modal-close\" onclick=\"closeModal()\">&times;</button></div><table style=\"min-width:900px\"><tr>' + Array.from({length: 12}, (_, i) => '<td>Columna ' + i + '</td>').join('') + '</tr></table><div class=\"modal-footer\"><button class=\"btn\" onclick=\"closeModal()\">Cerrar</button></div>')",
  comanda: "openTableOrder(1)",
};
const medirVentana = () => page.evaluate(() => {
  const ov = document.getElementById('modal-overlay'), caja = document.getElementById('modal-box');
  if(!ov || !ov.classList.contains('active') || !caja) return null;
  const W = window.innerWidth, H = window.innerHeight, r = caja.getBoundingClientRect();
  const pie = caja.querySelector('.modal-footer, .tp-or-pie, .modal-actions'), cab = caja.querySelector('.modal-header, h3');
  const rp = pie ? pie.getBoundingClientRect() : null, rc = cab ? cab.getBoundingClientRect() : null;
  const cs = getComputedStyle(caja);
  return {W, H, top: r.top, bottom: r.bottom, left: r.left, right: r.right, w: r.width, h: r.height,
    pie: rp ? {t: rp.top, b: rp.bottom, visible: rp.height > 0} : null, cab: rc ? {t: rc.top, b: rc.bottom} : null, pos: cs.position, tr: cs.transform};
});
await caso('Cada ventana cabe ENTERA en pantalla (cabecera y pie incluidos) y centrada de lado a lado, en 9 tamaños', async () => {
  const malos = [];
  for(const [ancho, alto] of TAMANOS){
    await poner(ancho, alto);
    for(const [nombre, abrir] of Object.entries(VENTANAS)){
      await page.evaluate(() => { try{ closeModal(); }catch(e){} });
      await page.evaluate(abrir); await w(450);
      const m = await medirVentana();
      if(!m){ malos.push(`${ancho}×${alto} ${nombre}: no se abrió`); continue; }
      const dentro = m.top >= -1 && m.bottom <= m.H + 1 && m.left >= -1 && m.right <= m.W + 1;
      if(!dentro) malos.push(`${ancho}×${alto} ${nombre}: caja ${Math.round(m.left)},${Math.round(m.top)} → ${Math.round(m.right)},${Math.round(m.bottom)} en ${m.W}×${m.H}`);
      if(Math.abs(m.left - (m.W - m.right)) > 3 && m.w < m.W - 4) malos.push(`${ancho}×${alto} ${nombre}: descentrada (${Math.round(m.left)} / ${Math.round(m.W - m.right)})`);
      if(m.pie && m.pie.visible && (m.pie.b > m.H + 1 || m.pie.t < 0)) malos.push(`${ancho}×${alto} ${nombre}: el pie queda fuera (${Math.round(m.pie.t)}–${Math.round(m.pie.b)} de ${m.H})`);
      if(m.cab && m.cab.t < -1) malos.push(`${ancho}×${alto} ${nombre}: la cabecera queda fuera (${Math.round(m.cab.t)})`);
    }
  }
  await page.evaluate(() => { try{ closeModal(); }catch(e){} });
  assert.deepEqual(malos.slice(0, 12), [], malos.length + ' fallos');
  return TAMANOS.length + ' tamaños × ' + Object.keys(VENTANAS).length + ' ventanas';
});

const medirToast = () => page.evaluate(() => {
  const t = document.getElementById('toast'); if(!t) return null;
  const W = window.innerWidth, H = window.innerHeight, r = t.getBoundingClientRect(), cs = getComputedStyle(t);
  const antes = t.style.pointerEvents; t.style.pointerEvents = 'auto';
  const x = r.left + r.width / 2, y = r.top + r.height / 2, el = document.elementFromPoint(x, y);
  const encima = !!el && (el === t || t.contains(el));
  t.style.pointerEvents = antes;
  return {W, H, top: r.top, bottom: r.bottom, left: r.left, right: r.right, w: r.width, opacity: cs.opacity, encima, texto: t.textContent};
});
const AVISOS = [
  ['aviso corto', "showToast('Guardado')"],
  ['aviso largo (2 líneas)', "showToast('Se ha aplicado el descuento a toda la comanda y se ha enviado el aviso a la cocina para que lo vea')"],
  ['con ventana abierta', "openModal('<div class=\"modal-header\"><h3>Ventana</h3></div><p>Texto</p><div class=\"modal-footer\"><button class=\"btn\">Cerrar</button></div>'); showToast('Cambios aplicados')"],
  ['con la comanda abierta', "openTableOrder(1); showToast('Plato añadido a la comanda')"],
];
await caso('El aviso negro se ve ENTERO, con 12 px de aire por todos los lados, centrado y por encima de todo, en 9 tamaños', async () => {
  const malos = [];
  for(const [ancho, alto] of TAMANOS){
    await poner(ancho, alto);
    for(const [nombre, lanzar] of AVISOS){
      await page.evaluate(() => { try{ closeModal(); }catch(e){} });
      await page.evaluate(lanzar); await w(500);
      const m = await medirToast();
      if(!m){ malos.push(`${ancho}×${alto} ${nombre}: no hay aviso`); continue; }
      const cabe = m.left >= 12 - 1 && m.right <= m.W - 12 + 1 && m.top >= 12 && m.bottom <= m.H - 12 + 1;
      if(!cabe) malos.push(`${ancho}×${alto} ${nombre}: aviso ${Math.round(m.left)},${Math.round(m.top)} → ${Math.round(m.right)},${Math.round(m.bottom)} en ${m.W}×${m.H}`);
      if(Math.abs((m.left + m.right) / 2 - m.W / 2) > 3) malos.push(`${ancho}×${alto} ${nombre}: descentrado`);
      if(!m.encima) malos.push(`${ancho}×${alto} ${nombre}: algo lo tapa`);
      if(parseFloat(m.opacity) < 0.95) malos.push(`${ancho}×${alto} ${nombre}: no es opaco (${m.opacity})`);
    }
  }
  await page.evaluate(() => { try{ closeModal(); }catch(e){} });
  assert.deepEqual(malos.slice(0, 12), [], malos.length + ' fallos');
  return TAMANOS.length + ' tamaños × ' + AVISOS.length + ' avisos';
});
// Lo que flota sin ser una ventana: menús ⋯, selector de periodo, campana de avisos, ayuda y chat. Nada puede salirse de lo que se ve.
const FLOTANTES = [
  ['campana de avisos', "toggleAvisosPanel()", '#avisos-panel.active'],
  ['panel de ayuda', "toggleHelpPanel()", '.help-panel.active, #help-panel.active, .help-panel.open'],
  ['chat', "toggleChatPanel()", '#chat-panel.active'],
  ['menú ⋯', "(() => { const b = document.createElement('button'); b.id='vv-mas'; b.dataset.acc = JSON.stringify(Array.from({length: 14}, (_, i) => ({icono: 'ti-pencil', texto: 'Acción número ' + (i + 1), fn: 'void 0'}))); b.textContent='⋯'; b.style.cssText='position:fixed;right:6px;bottom:6px;z-index:5;width:44px;height:44px'; document.body.appendChild(b); ggAbrirMenuAcciones(b); })()", '.mn-menu'],
  ['selector de periodo', "(() => { const d = document.createElement('div'); d.innerHTML = ggPeriodoHtml({anio: 2026, mes: 10, cb: 'void0', datos: {}, anual: true}); d.style.cssText='position:fixed;left:4px;bottom:4px;z-index:5'; document.body.appendChild(d); window.void0 = () => {}; ggPeriodoAbrir(d.querySelector('.pe-sel')); })()", '.pe-pop'],
];
await caso('Los desplegables flotantes (campana, ayuda, chat, menú ⋯, selector de periodo) caben ENTEROS en pantalla en 9 tamaños', async () => {
  const malos = [];
  for(const [ancho, alto] of TAMANOS){
    await poner(ancho, alto);
    for(const [nombre, abrir, sel] of FLOTANTES){
      await page.evaluate(() => { try{ closeModal(); cerrarAvisos(); ggCerrarMenuAcciones(); document.getElementById('vv-mas')?.remove(); document.querySelectorAll('.help-panel.active,#chat-panel.active').forEach(e => e.classList.remove('active')); }catch(e){} });
      await page.evaluate(abrir).catch(() => {}); await w(350);
      const m = await page.evaluate(sel => {
        const e = [...document.querySelectorAll(sel)].find(x => x.offsetParent !== null || getComputedStyle(x).position === 'fixed');
        if(!e) return null;
        const r = e.getBoundingClientRect(); return {W: innerWidth, H: innerHeight, l: r.left, t: r.top, r: r.right, b: r.bottom};
      }, sel);
      if(!m){ malos.push(`${ancho}×${alto} ${nombre}: no se abrió`); continue; }
      if(m.l < -1 || m.t < -1 || m.r > m.W + 1 || m.b > m.H + 1) malos.push(`${ancho}×${alto} ${nombre}: ${Math.round(m.l)},${Math.round(m.t)} → ${Math.round(m.r)},${Math.round(m.b)} en ${m.W}×${m.H}`);
    }
  }
  assert.deepEqual(malos.slice(0, 14), [], malos.length + ' fallos');
  return 'todos dentro';
});
// Teclado abierto (o barras del navegador): el área visible se encoge y la ventana y el aviso tienen que seguirla, no quedarse detrás.
await caso('Con el teclado abierto (área visible de 340 px en un móvil de 640), la ventana y el aviso caben en lo que se ve', async () => {
  await poner(390, 640);
  const r = await page.evaluate(async (ventana) => {
    document.documentElement.style.setProperty('--vvh', '340px'); document.documentElement.style.setProperty('--vvt', '0px'); document.documentElement.style.setProperty('--vvb', '300px');
    eval(ventana); showToast('Cambios aplicados');
    await new Promise(r => setTimeout(r, 500));
    const c = document.getElementById('modal-box').getBoundingClientRect(), t = document.getElementById('toast').getBoundingClientRect();
    const out = {modalAbajo: c.bottom, modalArriba: c.top, toastAbajo: t.bottom, toastArriba: t.top};
    ['--vvh', '--vvt', '--vvb'].forEach(v => document.documentElement.style.removeProperty(v)); closeModal();
    return out;
  }, VENTANAS.larga);
  assert.ok(r.modalAbajo <= 341 && r.modalArriba >= 0, `la ventana (${Math.round(r.modalArriba)}–${Math.round(r.modalAbajo)}) no cabe en los 340 px visibles`);
  assert.ok(r.toastAbajo <= 640 - 300 && r.toastArriba >= 0, `el aviso (${Math.round(r.toastArriba)}–${Math.round(r.toastAbajo)}) queda detrás del teclado`);
  return `ventana ${Math.round(r.modalArriba)}–${Math.round(r.modalAbajo)} · aviso ${Math.round(r.toastArriba)}–${Math.round(r.toastAbajo)}`;
});
await caso('Sin errores de JavaScript', async () => { assert.deepEqual(errs, []); });
await browser.close();
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ ventanas y avisos siempre enteros');
process.exit(fallos ? 1 : 0);
