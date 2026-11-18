// Cocina en móvil (18/11, 2.ª parte), con los datos de un negocio lleno, en 320-430 y tablet:
//  A) NINGÚN botón tiene el texto fuera de su caja («Ver todos» y «Historial de Pedidos» salían por arriba y abajo de la caja de 28 px);
//  B) Personal: la fila de iconos de cada tarjeta cabe dentro de la tarjeta, y «Historial de Personal» / «Añadir Empleado» no desbordan;
//  C) APPCC › Higiene: las siete secciones se ven TODAS (envuelven, sin «Más» ni scroll lateral);
//  D) Proveedores: el índice A–Z de artículos y el historial (el «N artículos» es un botón) no se salen ni se solapan a 360;
//  E) una línea de paso (Limpieza, Ficha) nunca lleva SOLO un lápiz/«⋯»: comparte fila con el número o con el texto.
// Servir con `python3 -m http.server 8950` desde la raíz (PUERTO=… para otro). SHOTS=<carpeta> guarda capturas.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const PUERTO = process.env.PUERTO || '8950';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox'], protocolTimeout:60000});
let fallos = 0;
async function caso(nombre, fn){
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
}
const esperar = ms => new Promise(r => setTimeout(r, ms));

async function abrir(ancho){
  const page = await browser.newPage();
  await page.setViewport({width:ancho, height: ancho < 600 ? 800 : 1000, isMobile: ancho < 700, hasTouch: ancho < 700});
  page.erroresJs = [];
  page.on('pageerror', e => page.erroresJs.push(e.message));
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|raw.githubusercontent/.test(r.url()) ? r.abort() : r.continue());
  await page.goto(`http://localhost:${PUERTO}/dist/index.html`, {waitUntil:'domcontentloaded'}); await esperar(2500);
  const datos = await page.evaluate(async () => (await fetch('/dist/ggburger.json')).json());
  await page.evaluate(async d => {
    localStorage.setItem('gastrogoan_owner_login','1'); localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted','1'); localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
    if(d.license) localStorage.setItem('gastrogoan_license_v1', JSON.stringify(d.license));
    await idbSet('gastrogoan_data_v1', d);
  }, datos);
  await page.reload({waitUntil:'domcontentloaded'}); await page.waitForFunction(() => typeof DB !== 'undefined' && DB && DB.sales, {timeout:60000}); await esperar(1200);
  await page.evaluate(() => {
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate','app-splash'].forEach(x => document.getElementById(x)?.remove());
    try{ hideAccessSelectScreen(); }catch(e){} try{ hideBusinessSelectScreen(); }catch(e){} try{ closeModal(); }catch(e){}
    editUnlocked = true; document.body.classList.add('edit-unlocked','owner-session');
    // datos de prueba con textos LARGOS (la norma del vídeo del 16/11): nombres de empleado y de proveedor de 25 letras
    if(DB.employees[0]) DB.employees[0].name = 'Maximiliano Fernández-Quintana';
    DB.purchaseOrders.push({id:99001, supplier: DB.providers[0].nombre, date:'2025-03-02', estado:'ENVIADO', items:(DB.purchaseOrders[0] || {items:[]}).items, area:'cocina'});
  });
  return page;
}
const entrar = async (page, js) => { await page.evaluate(() => { try{ closeModal(); }catch(e){} }); await page.evaluate(js); await esperar(700); };

// Medidor: el texto de cada botón visible cabe en SU CAJA (la caja de un .btn-fino es su ::before, no el botón).
const MEDIR_BOTONES = () => {
  const malos = []; let vistos = 0;
  const r = document.createRange();
  document.querySelectorAll('#content .btn, #modal-box .btn').forEach(b => {
    const rb = b.getBoundingClientRect();
    if(!b.getClientRects().length || rb.width < 2 || b.classList.contains('btn-icon')) return;
    // rectángulos de TEXTO (no de iconos <i>)
    const rs = [];
    const w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
    while(w.nextNode()){ const n = w.currentNode; if(!n.textContent.trim()) continue; r.selectNodeContents(n); [...r.getClientRects()].forEach(q => { if(q.width > 1) rs.push(q); }); }
    if(!rs.length) return;
    vistos++;
    let top = rb.top, bot = rb.bottom;
    if(b.classList.contains('btn-fino')){
      const cs = getComputedStyle(b, '::before');
      if(cs.height !== 'auto' && cs.position === 'absolute'){ const t = (parseFloat(cs.top) || 0) + (parseFloat(cs.marginTop) || 0); top = rb.top + t; bot = top + parseFloat(cs.height); }
    }
    const tt = Math.min(...rs.map(q => q.top)), tb = Math.max(...rs.map(q => q.bottom)), tl = Math.min(...rs.map(q => q.left)), tr = Math.max(...rs.map(q => q.right));
    const et = (b.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 30);
    if(tt < top - 0.5 || tb > bot + 0.5) malos.push(`«${et}» el texto (${Math.round(tt)}-${Math.round(tb)}) sale de su caja (${Math.round(top)}-${Math.round(bot)})`);
    else if(tl < rb.left - 0.5 || tr > rb.right + 0.5) malos.push(`«${et}» el texto sale por los lados del botón`);
  });
  return {malos, vistos};
};

for(const ancho of [320, 360, 390, 412, 430, 768]){
  const page = await abrir(ancho);
  const q = (fn, ...a) => page.evaluate(fn, ...a);

  await caso(`A) Ningún botón con el texto fuera de su caja, en las pantallas de Cocina (${ancho}px)`, async () => {
    const malos = []; let vistos = 0;
    const PANTALLAS = [
      ['pedidos', "navigate('pedidos')"], ['pedidos-hist', "navigate('pedidos')", 'Historial de Pedidos'], ['pedidos-realizar', "navigate('pedidos')", 'Realizar Pedido'],
      ['personal', "navigate('horarios'); setHorariosTab('personal')"], ['proveedores', "navigate('proveedores')"], ['stock', "navigate('stock')"],
      ['megalista', "navigate('megalista')"], ['escandallo', "navigate('escandallo')"], ['fichas', "navigate('fichas')"],
      ['limpieza', "navigate('limpieza')"], ['limpieza-manos', "navigate('limpieza'); setLimpiezaTab('manos')"], ['limpieza-temp', "navigate('limpieza'); setLimpiezaTab('temperaturas')"],
      ['carta', "currentFolder='cocina'; navigate('carta')"],
    ];
    for(const [n, js, clic] of PANTALLAS){
      await entrar(page, js);
      if(clic){ await q(t => { const b = [...document.querySelectorAll('button')].find(x => x.getClientRects().length && x.innerText.replace(/\s+/g,' ').includes(t)); if(b) b.click(); }, clic); await esperar(500); }
      const r = await q(MEDIR_BOTONES); vistos += r.vistos; r.malos.forEach(m => malos.push(`${n}: ${m}`));
    }
    assert.ok(vistos > 40, 'se midieron botones: ' + vistos);
    assert.deepEqual([...new Set(malos)], []);
  });

  await caso(`B) Personal: iconos de cada tarjeta dentro de ella; «Historial de Personal» y «Añadir Empleado» sin desbordar (${ancho}px)`, async () => {
    await entrar(page, "navigate('horarios'); setHorariosTab('personal')");
    const r = await q(() => [...document.querySelectorAll('.pr-card')].map(c => {
      const cr = c.getBoundingClientRect();
      const hijos = [...c.querySelectorAll('button')].filter(b => b.getClientRects().length).map(b => b.getBoundingClientRect());
      return {derFuera: Math.max(0, ...hijos.map(h => h.right - cr.right)), izqFuera: Math.max(0, ...hijos.map(h => cr.left - h.left)), pagina: document.documentElement.scrollWidth - innerWidth, n: hijos.length};
    }));
    assert.ok(r.length >= 3, 'hay tarjetas');
    r.forEach(x => { assert.ok(x.derFuera <= 0.5 && x.izqFuera <= 0.5 && x.pagina <= 1, JSON.stringify(x)); });
    const cab = await q(() => [...document.querySelectorAll('#content button')].filter(b => /Historial de Personal|Añadir Empleado/.test(b.innerText) && b.getClientRects().length).map(b => { const r = b.getBoundingClientRect(); return {t: b.innerText.trim(), der: r.right, w: innerWidth, sw: b.scrollWidth, cw: b.clientWidth}; }));
    assert.equal(cab.length, 2);
    cab.forEach(x => assert.ok(x.der <= x.w && x.sw <= x.cw + 1, JSON.stringify(x)));
  });

  await caso(`C) APPCC › Higiene: las siete secciones se ven todas, sin «Más» ni scroll lateral (${ancho}px)`, async () => {
    await entrar(page, "navigate('limpieza')");
    const r = await q(() => { const hs = [...document.querySelectorAll('#limpieza-tabs-row .ge-tab')].filter(b => b.getClientRects().length); return {n: hs.length, fuera: hs.filter(b => { const x = b.getBoundingClientRect(); return x.right > innerWidth + 0.5 || x.left < -0.5; }).length, mas: hs.some(b => /^más$/i.test(b.innerText.trim())), pagina: document.documentElement.scrollWidth - innerWidth}; });
    assert.ok(r.n >= 7 && r.fuera === 0 && !r.mas && r.pagina <= 1, JSON.stringify(r));
  });

  if(ancho <= 430){
    await caso(`D) Proveedores: índice A–Z y fila del historial sin solaparse (${ancho}px)`, async () => {
      const id = await q(() => { navigate('proveedores'); return (DB.providers.find(p => ingredientsForSupplier(p.nombre).length > 3) || DB.providers[0]).id; });
      await q(i => openSupplierIngredientsModal(i, ''), id); await esperar(500);
      const az = await q(() => { const m = document.getElementById('modal-box'); const ls = [...m.querySelectorAll('.pv-az-l')]; return {n: ls.length, filas: m.querySelectorAll('.pv-art').length, bajo44: ls.filter(l => l.getBoundingClientRect().height < 43.5).length, desborda: m.scrollWidth > m.clientWidth + 1}; });
      assert.ok(az.n >= 26 && az.filas === 0 && az.bajo44 === 0 && !az.desborda, JSON.stringify(az));
      await q(i => { const p = DB.providers.find(x => x.id === i); pedidosDeProveedor(p.nombre).length || DB.purchaseOrders.push({id:99002, supplier:p.nombre, date:'2025-03-02', estado:'RECIBIDO', items:(DB.purchaseOrders.find(o => (o.items||[]).length) || {items:[]}).items, area:'cocina'}); openSupplierOrdersModal(i); }, id); await esperar(500);
      const h = await q(() => { const f = document.querySelector('#modal-box .pv-ped'); const cs = [...f.querySelectorAll('.pv-ped-f,.badge,.pv-ped-n,.pv-ped-t')].map(e => e.getBoundingClientRect()); let solapa = false;
        for(let i = 0; i < cs.length; i++) for(let j = i + 1; j < cs.length; j++){ const a = cs[i], c = cs[j]; if(a.left < c.right - 1 && c.left < a.right - 1 && a.top < c.bottom - 1 && c.top < a.bottom - 1) solapa = true; }
        return {solapa, desplegables: document.querySelectorAll('#modal-box details, #modal-box summary').length, boton: /art/.test(f.querySelector('.pv-ped-n').textContent), desborda: document.getElementById('modal-box').scrollWidth > document.getElementById('modal-box').clientWidth + 1}; });
      assert.ok(!h.solapa && h.desplegables === 0 && h.boton && !h.desborda, JSON.stringify(h));
      await q(() => closeModal());
    });
  }

  await caso(`E) Una línea de paso nunca lleva SOLO un lápiz o un «⋯» (${ancho}px)`, async () => {
    await entrar(page, "navigate('limpieza'); setLimpiezaTab('manos')");
    const solos = [];
    const revisar = async nombre => { const r = await q(() => [...document.querySelectorAll('.lp-paso, .fi-paso')].filter(p => p.getClientRects().length).map(p => {
      const bs = [...p.querySelectorAll('button')].filter(b => b.getClientRects().length).map(b => b.getBoundingClientRect());
      const otros = [...p.querySelectorAll('.lp-num, .fi-paso-n, .lp-paso-leer, .fi-paso-leer, textarea')].filter(e => e.getClientRects().length).map(e => e.getBoundingClientRect());
      // una fila (franja de alto) con botones y nada más del paso a su altura
      return bs.filter(b => !otros.some(o => o.top < b.bottom - 2 && o.bottom > b.top + 2)).length;
    })); r.forEach(n => { if(n) solos.push(nombre); }); };
    await revisar('manos');
    await entrar(page, "navigate('limpieza'); setLimpiezaTab('protocolo'); lpEditarPasos('cierre', true); lpPasoEditar('cierre', 1)");
    await revisar('protocolo editando');
    await entrar(page, "const f = DB.fichas[0]; f.pasos = ['CORTAR A LA MITAD CON EL CUCHILLO DE SIERRA Y RETIRAR LA CORTEZA', 'Cocer la patata']; f.pasosDet = [{min:15}, {}]; navigate('fichas'); openFichaModal(f.id)");
    await revisar('ficha');
    assert.deepEqual(solos, []);
  });

  await caso(`Sin errores de JavaScript (${ancho}px)`, async () => { assert.deepEqual(page.erroresJs, []); });
  await page.close();
}

await browser.close();
console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo en orden');
process.exit(fallos ? 1 : 0);
