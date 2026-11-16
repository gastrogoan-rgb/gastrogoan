// GESTIÓN ECONÓMICA + PANEL EN MÓVIL (vídeo del 15/11, Android de 360 px). Mide, en 320/360/390/412/430 px y con un negocio lleno con
// NOMBRES LARGOS, lo que se vio roto: Tesorería con cifras montadas, pestañas de anchos distintos, nombre de gasto en 100 px,
// tablas cortadas por el borde, «CAPEX», frases de PC y el selector nativo de «¿Es deducible?».
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const BASE = process.env.GG_BASE || 'http://localhost:8950';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox']});
const w = ms => new Promise(r => setTimeout(r, ms));
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
async function abrir(W){
  const page = await browser.newPage(); await page.setViewport({width:W, height:800, isMobile:true, hasTouch:true});
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|raw.githubusercontent/.test(r.url()) ? r.abort() : r.continue());
  await page.goto(BASE + '/dist/index.html', {waitUntil:'domcontentloaded'}); await w(1800);
  const datos = await page.evaluate(async () => (await fetch('/dist/ggburger.json')).json());
  datos.ge.capex.push({id:9701, descripcion:'Dos freidoras de alto rendimiento y gran capacidad', importe:4114, iva:21, fecha:'2026-03-12', estadoPago:'PAGADO', financiado:false},
    {id:9702, descripcion:'Terraza: mesas, sillas y toldo', importe:3751, iva:21, fecha:'2026-02-12', estadoPago:'PAGADO', financiado:true, cuotas:24, cuotaMensual:150, anios:8});
  datos.ge.fijos.push({id:9499, nombre:'Nóminas y seguros sociales de toda la plantilla', importe:3585.83, periodicidadMeses:1, iva:0, categoria:'FIJOS'});
  await page.evaluate(async d => {
    localStorage.setItem('gastrogoan_owner_login','1'); localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted','1'); localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
    if(d.license) localStorage.setItem('gastrogoan_license_v1', JSON.stringify(d.license));
    await idbSet('gastrogoan_data_v1', d);
  }, datos);
  await page.reload({waitUntil:'domcontentloaded'}); await page.waitForFunction(() => typeof DB !== 'undefined' && DB && DB.sales, {timeout:60000}); await w(1200);
  await page.evaluate(() => { ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate','app-splash'].forEach(x => document.getElementById(x)?.remove()); try{ hideAccessSelectScreen(); }catch(e){} try{ hideBusinessSelectScreen(); }catch(e){} ownerUnlocked = true; });
  return page;
}
const ir = async (page, js) => { await page.evaluate(js); await w(900); };
for(const W of [320, 360, 390, 412, 430]){
  const page = await abrir(W);
  await caso(`${W}px · pestañas: mismo ancho, como mucho 4 filas, y ninguna palabra «CAPEX»`, async () => {
    await ir(page, "navigate('economia'); GE.tab('ventas')");
    await w(300);
    const cerrada = await page.evaluate(() => ({vis: [...document.querySelectorAll('#ge-tabs-row .ge-tab')].filter(b => b.getClientRects().length).length, mas: !!document.querySelector('#ge-tabs-row .gg-pest-mas')}));
    assert.ok(cerrada.mas && cerrada.vis === 1, 'plegada: solo la pestaña marcada y «Más»: ' + JSON.stringify(cerrada));
    await page.evaluate(() => document.querySelector('#ge-tabs-row .gg-pest-mas').click()); await w(200);
    const r = await page.evaluate(() => { const bs = [...document.querySelectorAll('#ge-tabs-row .ge-tab')].filter(b => b.getClientRects().length); const rc = bs.map(b => b.getBoundingClientRect());
      return {tops: rc.map(x => [Math.round(x.top), Math.round(x.width)]), filas: rc.map(x => x.top).sort((a, b) => a - b).filter((t, i, a) => i === 0 || t - a[i - 1] > 20).length, anchos: [...new Set(rc.filter(x => x.width < window.innerWidth - 40).map(x => Math.round(x.width)))], capex: /capex/i.test(document.getElementById('view-economia').innerText)}; });
    assert.ok(r.filas <= 4, 'filas de pestañas: ' + r.filas + ' ' + JSON.stringify(r)); assert.ok(r.anchos.length <= 1, 'anchos distintos: ' + r.anchos); assert.ok(!r.capex, 'sale «CAPEX»');
  });
  await caso(`${W}px · Tesorería: Objetivo / Real / Dif. en renglones distintos y sin solaparse`, async () => {
    await ir(page, "navigate('economia'); GE.tab('tesoreria')");
    const r = await page.evaluate(() => [...document.querySelectorAll('#te-rows .te-row.te-dist')].map(f => { const c = s => f.querySelector(s).getBoundingClientRect(); const a = c('.te-c-obj'), b = c('.te-c-real'), d = c('.te-c-dif');
      return {solapa: !(a.bottom <= b.top + 1 && b.bottom <= d.top + 1), fuera: [a, b, d].some(x => x.right > window.innerWidth + 1), n: f.dataset.k}; }));
    assert.ok(r.length === 5, 'filas: ' + r.length); r.forEach(x => { assert.ok(!x.solapa, 'cifras montadas en ' + x.n); assert.ok(!x.fuera, 'cifra fuera de pantalla en ' + x.n); });
  });
  await caso(`${W}px · Gastos fijos, variables e Inversiones: el nombre ocupa casi todo el ancho de su fila y no se parte una palabra`, async () => {
    for(const [tab, sel] of [['fijos', '#ge-fijos .gf-fila'], ['variables', '#gv-list .gf-fila'], ['capex', '#capex-list .gf-fila']]){
      await ir(page, `navigate('economia'); GE.tab('${tab}')`);
      const r = await page.evaluate(sel => [...document.querySelectorAll(sel)].filter(f => f.getClientRects().length).slice(0, 12).map(f => { const n = f.querySelector('.gf-nom b'), fr = f.getBoundingClientRect(), nr = n.getBoundingClientRect();
        const rg = document.createRange(); rg.selectNodeContents(n); const ancho = Math.max(...[...rg.getClientRects()].map(x => x.width));
        const palabraMax = Math.max(...n.textContent.split(/\s+/).map(p => p.length)) * 6;   // letra aprox. de 14 px
        return {ancho: nr.width / fr.width, palabra: palabraMax <= nr.width + 2, txt: n.textContent.slice(0, 30), imp: f.querySelector('.gf-imp') ? f.querySelector('.gf-imp').getBoundingClientRect().bottom > nr.bottom - 1 : true}; }), sel);
      assert.ok(r.length, 'sin filas en ' + tab);
      r.forEach(x => { assert.ok(x.ancho > 0.7, `${tab}: nombre en ${Math.round(x.ancho * 100)} % del ancho «${x.txt}»`); assert.ok(x.palabra, tab + ': palabra partida «' + x.txt + '»'); assert.ok(x.imp, tab + ': el importe comparte renglón con el nombre'); });
    }
  });
  await caso(`${W}px · tablas de Ventas por día, Cuenta de Resultados y del Panel sin cortar por el borde (scroll solo donde se declara)`, async () => {
    await ir(page, "navigate('economia'); GE.tab('ventas')");
    let r = await page.evaluate(() => { const t = document.getElementById('ventas-dia-table'); return t.getBoundingClientRect().right <= window.innerWidth + 1 && t.parentElement.scrollWidth <= t.parentElement.clientWidth + 1; });
    assert.ok(r, 'Ventas por día se sale');
    await ir(page, "navigate('economia'); GE.tab('cdr')");
    r = await page.evaluate(() => getComputedStyle(document.getElementById('cdr-table')).borderCollapse); assert.equal(r, 'separate', 'los filetes de la franja «Resultado neto» no viajan con la celda fija');
    await ir(page, "currentFolder='gestion'; navigate('dashboard')"); await w(600);
    await page.evaluate(() => { document.querySelectorAll('.view.active .gg-plegable:not(.gg-abierto) > .gg-acc-h').forEach(h => h.click()); document.querySelectorAll('.view.active details').forEach(d => d.open = true); }); await w(500);
    r = await page.evaluate(() => [...document.querySelectorAll('#view-dashboard .dp-tabla')].filter(t => t.getClientRects().length).map(t => { const p = t.parentElement; return p.scrollWidth - p.clientWidth; }));
    assert.ok(r.length && r.every(x => x <= 1), 'tabla del Panel cortada: ' + r);
    r = await page.evaluate(() => { const t = document.getElementById('platos-matrix'); return t ? [t.getBoundingClientRect().right <= window.innerWidth + 1, t.scrollWidth <= t.clientWidth + 1] : [true, true]; }); assert.deepEqual(r, [true, true], 'matriz de rentabilidad cortada');
  });
  await caso(`${W}px · Panel: sin «pasa el ratón»/«click para plegar», «Todo en orden» plegado y «¿Cómo se calcula?» sin texto sobre texto`, async () => {
    await ir(page, "currentFolder='gestion'; navigate('dashboard')");
    await ir(page, "currentFolder='gestion'; navigate('dashboard')");
    const r = await page.evaluate(() => { const v = document.getElementById('view-dashboard'); const cerrado = document.querySelector('#dashboard-attention .att-zero'); const filas = [...document.querySelectorAll('.dp-eq-tabla tr')];
      document.querySelectorAll('.dp-eq-como').forEach(d => d.open = true);
      const sol = [...document.querySelectorAll('.dp-eq-tabla tr')].some(tr => { const [a, b] = tr.children; return a.getBoundingClientRect().right > b.getBoundingClientRect().left + 1; });
      return {raton: /pasa el rat|click para plegar/i.test(v.innerText), zero: !!cerrado && !cerrado.open, sol}; });
    assert.ok(!r.raton, 'frase de PC en el Panel'); assert.ok(r.zero, '«Todo en orden» debería ir plegado en móvil'); assert.ok(!r.sol, 'texto sobre texto en «¿Cómo se calcula?»');
  });
  await caso(`${W}px · «¿Es deducible?»: botones propios, sin selector nativo, y guardan lo elegido`, async () => {
    await ir(page, "navigate('economia'); GE.tab('fijos'); GE.newGF()");
    const r = await page.evaluate(() => { const b = [...document.querySelectorAll('#gf-f-deduc-box')].length, sel = document.querySelector('select#gf-f-deduc'); const ops = [...document.querySelectorAll('.ded-op')];
      ops.find(x => x.dataset.v === 'parcial').click(); const caja = document.getElementById('gf-f-deduc-box').style.display; const v = document.getElementById('gf-f-deduc').value; const alto = Math.min(...ops.map(x => x.getBoundingClientRect().height));
      return {sel: !!sel, n: ops.length, caja, v, alto}; });
    assert.ok(!r.sel && r.n === 4, JSON.stringify(r)); assert.equal(r.caja, 'block'); assert.equal(r.v, 'parcial'); assert.ok(r.alto >= 43.5, 'botón de ' + r.alto + ' px');
    await page.evaluate(() => closeModal());
  });
  await page.close();
}
await browser.close();
if(fallos){ console.log('❌ ' + fallos + ' caso(s) con fallos'); process.exit(1); }
console.log('✅ Gestión Económica y Panel en móvil: 5 anchos sin cifras montadas, pestañas estables, nombres enteros y tablas sin cortar');
