// VÍDEO EN UN MÓVIL REAL (15/11) · PAQUETE 1: GLOBAL + ENTRADA + TOUR.
// Fija las causas de fondo que se vieron en el vídeo a 360 px: nombres partidos en la fila del selector de negocios, rótulos de las tablas apiladas,
// aviso negro tapando botones, fundidos a media opacidad, barra de versión, pantalla de acceso, «Volver» único y tour con los botones a la vista.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const PORT = process.env.GG_PORT || '8950';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox']});
let fallos = 0;
const w = ms => new Promise(r => setTimeout(r, ms));
async function caso(n, fn){ try{ const d = await fn(); console.log('✅ ' + n + (d ? '  → ' + d : '')); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }

async function abrir(W, H){
  const page = await browser.newPage();
  await page.setViewport({width:W, height:H, isMobile:true, hasTouch:true, deviceScaleFactor:2});
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|raw.githubusercontent/.test(r.url()) ? r.abort() : r.continue());
  await page.goto(`http://localhost:${PORT}/dist/index.html`, {waitUntil:'domcontentloaded'});
  await w(2500);
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
    ['netlify-gate', 'license-gate', 'extconn-gate', 'firebase-gate', 'revoked-gate', 'app-splash'].forEach(x => document.getElementById(x)?.remove());
    try{ hideAccessSelectScreen(); }catch(e){} try{ hideBusinessSelectScreen(); }catch(e){} try{ closeModal(); }catch(e){}
    editUnlocked = true; ownerUnlocked = true; document.body.classList.add('edit-unlocked', 'owner-session');
  });
  await w(600);
  return page;
}

await caso('Ni `overflow-wrap:anywhere` ni `break-all` en el CSS ni `word-break:break-word` en el JS de pantallas', async () => {
  // Excepción de la norma: los CÓDIGOS (el de licencia enmascarado de la ventana «Nube») no tienen espacios donde partir.
  const css = fs.readFileSync('css/styles.css', 'utf8').replace(/\.nb-lic-cod\{[^}]*\}/g, '');
  assert.ok(!/overflow-wrap:\s*anywhere/.test(css), 'queda overflow-wrap:anywhere en css/styles.css');
  assert.ok(!/word-break:\s*break-(all|word)/.test(css), 'queda word-break:break-all/break-word en css/styles.css');
});

for(const [W, H] of [[320, 568], [360, 800], [390, 844], [412, 915], [430, 932]]){
  const page = await abrir(W, H);

  await caso(`[${W}] Selector de negocios: el nombre largo ocupa todo el ancho y no se parte a media palabra`, async () => {
    const r = await page.evaluate(() => {
      const me = currentOwnerId();
      saveBusinessSlots([{id:getActiveSlot(), name:'PruebasGastroGoanApp', code:'AAAAAAAA', ownerId:me}, {id:'b', name:'Restaurante El Rincón de la Abuela Paca y Familia', code:'BBBBBBBB', ownerId:me}]);
      showBusinessSelectScreen();
      return [...document.querySelectorAll('.bs-item-name')].map(e => {
        const rg = document.createRange(); rg.selectNodeContents(e);
        const lineas = new Set([...rg.getClientRects()].map(x => Math.round(x.top))).size;
        return {t: e.textContent, w: e.getBoundingClientRect().width, lineas, fila: e.closest('.bs-item').getBoundingClientRect().width};
      });
    });
    for(const n of r){
      assert.ok(n.w > 140, `«${n.t}» mide ${Math.round(n.w)} px en una fila de ${Math.round(n.fila)}`);
      assert.ok(n.lineas <= (n.t.length > 30 ? 3 : 1), `«${n.t}» sale en ${n.lineas} renglones`);
    }
    await page.evaluate(() => hideBusinessSelectScreen());
  });

  await caso(`[${W}] Tabla apilada: el rótulo va en su propia línea y no pisa el valor`, async () => {
    const r = await page.evaluate(() => {
      navigate('home');
      const v = document.querySelector('.view.active');
      v.insertAdjacentHTML('beforeend', `<div id="vm-t" class="table-wrap"><table class="table-cards"><thead><tr><th>a</th><th>b</th><th>c</th><th>d</th></tr></thead><tbody><tr>
        <td data-label="Plato / Elaboración">Croquetas de jamón ibérico</td><td data-label="Coste">12,50 €</td><td data-label="PVP">3,20 €</td><td data-label="Alérgenos"><span class="badge">Gluten</span> <span class="badge">Huevo</span> <span class="badge">Lácteos</span></td></tr></tbody></table></div>`);
      const tds = [...document.querySelectorAll('#vm-t td')];
      const out = tds.map(td => { const cs = getComputedStyle(td, '::before'); const r = td.getBoundingClientRect(); return {disp: cs.display, w: r.width, right: r.right}; });
      const solape = (() => { const a = tds[0].getBoundingClientRect(), b = tds[1].getBoundingClientRect(); return b.top < a.bottom - 1; })();
      document.getElementById('vm-t').remove();
      return {out, solape, W: innerWidth};
    });
    assert.ok(r.out.every(o => o.disp === 'block'), 'el rótulo no es un bloque propio');
    assert.ok(r.out.every(o => o.right <= r.W + 1), 'una celda se sale de la pantalla');
    assert.ok(!r.solape, 'dos celdas se pisan');
  });

  await caso(`[${W}] Aviso negro: arriba, entero, sin tapar el botón de abajo; uno vacío no se ve`, async () => {
    const r = await page.evaluate(async () => {
      showToast('Comanda marchada a cocina');
      await new Promise(r => setTimeout(r, 450));
      const t = document.getElementById('toast').getBoundingClientRect();
      const op = getComputedStyle(document.getElementById('toast')).opacity;
      showToast('');
      await new Promise(r => setTimeout(r, 450));
      const vacio = getComputedStyle(document.getElementById('toast')).opacity;
      return {top: t.top, bottom: t.bottom, H: innerHeight, left: t.left, right: t.right, W: innerWidth, op, vacio};
    });
    assert.ok(r.top >= 8 && r.bottom < r.H * 0.25, `el aviso está en ${Math.round(r.top)}–${Math.round(r.bottom)} de ${r.H}`);
    assert.ok(r.left >= 12 - 1 && r.right <= r.W - 12 + 1, 'el aviso se sale por los lados');
    assert.ok(parseFloat(r.op) > 0.95, 'el aviso no es opaco');
    assert.equal(parseFloat(r.vacio), 0, 'un aviso vacío se está viendo');
  });

  await caso(`[${W}] Cambio de pantalla: opacidad plena al acabar y sin animación en la vista entera`, async () => {
    const r = await page.evaluate(async () => {
      navigate('folder'); await new Promise(r => setTimeout(r, 700));
      const v = document.querySelector('.view.active');
      const vs = getComputedStyle(v);
      const hijos = [...v.querySelectorAll('.module-card,.card,.view-title')].map(e => getComputedStyle(e).opacity);
      return {anim: vs.animationName, op: vs.opacity, hijos};
    });
    assert.equal(r.anim, 'none', 'la vista entera sigue con su propio fundido');
    assert.equal(parseFloat(r.op), 1);
    assert.ok(r.hijos.every(o => parseFloat(o) === 1), 'algo se queda a media opacidad: ' + r.hijos.join(','));
  });

  await caso(`[${W}] Acceso del propietario: «Volver» a la izquierda y de 44 px; Desbloquear en oliva; título sin huérfana`, async () => {
    const r = await page.evaluate(async () => {
      accessScreenMode = 'owner'; showAccessSelectScreen(); accessScreenMode = 'owner'; renderAccessScreen();
      await new Promise(r => setTimeout(r, 400));
      const volver = document.querySelector('.access-volver'), btn = document.getElementById('acc-owner-btn'), card = document.querySelector('.access-card');
      const vr = volver.getBoundingClientRect(), cr = card.getBoundingClientRect();
      const ti = document.querySelector('.access-card-title');
      const out = {izq: vr.left - cr.left, w: vr.width, h: vr.height, bg: getComputedStyle(btn).backgroundColor, balance: getComputedStyle(ti).textWrap, oliva: getComputedStyle(document.documentElement).getPropertyValue('--olive').trim()};
      hideAccessSelectScreen();
      return out;
    });
    assert.ok(r.izq < 40, `«Volver» está a ${Math.round(r.izq)} px del borde izquierdo de la tarjeta`);
    assert.ok(r.h >= 43.5 && r.w >= 44, `«Volver» mide ${Math.round(r.w)}×${Math.round(r.h)}`);
    assert.ok(r.bg !== 'rgb(28, 26, 23)', 'Desbloquear sigue en negro');
    assert.ok(/balance|pretty/.test(r.balance), 'título sin text-wrap:balance');
  });

  await caso(`[${W}] «Volver» único: carpeta e interiores usan la misma palabra`, async () => {
    const r = await page.evaluate(() => [...document.querySelectorAll('#folder-home-btn span, .view .btn-back span')].map(e => e.textContent.trim()).filter(Boolean));
    assert.ok(r.length && r.every(x => x === 'Volver'), 'etiquetas: ' + [...new Set(r)].join(' | '));
  });

  await caso(`[${W}] Tour: en los ${'48'} pasos el pie con Anterior/Siguiente queda a la vista y la hoja no pasa del 46 %`, async () => {
    await page.evaluate(() => { startAppTour(); });
    const n = await page.evaluate(() => TOUR_STEPS.length);
    const malos = [];
    for(let i = 0; i < n; i++){
      await w(650);
      const m = await page.evaluate(() => {
        const b = document.getElementById('tour-bubble').getBoundingClientRect();
        const f = document.querySelector('#tour-bubble .tour-bubble-footer'), h = document.querySelector('#tour-bubble h3');
        return {i: tourStepIndex, vh: innerHeight, h: b.height, foot: f ? f.getBoundingClientRect().bottom : 0, tit: h ? h.getBoundingClientRect().top : 0, fin: !!TOUR_STEPS[tourStepIndex].finale || tourStepIndex === 0};
      });
      if(m.foot > m.vh - 2) malos.push(`paso ${m.i + 1}: botones cortados`);
      if(m.tit < 0) malos.push(`paso ${m.i + 1}: título cortado`);
      if(!m.fin && m.h > m.vh * 0.47) malos.push(`paso ${m.i + 1}: hoja de ${Math.round(100 * m.h / m.vh)} %`);
      await page.evaluate(() => tourNext());
    }
    await page.evaluate(() => { try{ finishTour(); }catch(e){} });
    assert.deepEqual(malos, []);
  });

  await page.close();
}

await caso('Barra de versión: es de la paleta y «Más tarde» desaparece al actualizar; la pregunta temprana existe', async () => {
  const page = await abrir(360, 800);
  const r = await page.evaluate(() => {
    mostrarAvisoVersionNueva('x');
    const barra = document.getElementById('gg-version-nueva');
    const bg = getComputedStyle(barra).backgroundColor;
    const luego = !!barra.querySelector('.gg-vn-luego');
    aplicarVersionNueva = async () => {};
    const ok = barra.querySelector('.gg-vn-ok'); ok.disabled = true; ok.textContent = 'Actualizando…';
    const bgOk = getComputedStyle(ok).backgroundColor, opOk = getComputedStyle(ok).opacity;
    return {bg, luego, bgOk, opOk};
  });
  assert.equal(r.bg, 'rgb(28, 26, 23)', 'la barra no usa la tinta de la app: ' + r.bg);
  assert.ok(r.luego);
  assert.equal(r.opOk, '1', 'el botón «Actualizando…» no puede quedar desvaído');
  assert.ok(/ggPreguntaTemprana/.test(fs.readFileSync('js/polish.js', 'utf8')), 'falta la comprobación de version.json durante el splash');
  await page.close();
});

await browser.close();
if(fallos){ console.log(`\n❌ ${fallos} fallo(s)`); process.exitCode = 1; } else console.log('\n✅ Vídeo móvil (paquete 1): todo en orden');
