// Cocina en móvil (vídeo Android 15/11, paquete 4): teclado numérico, cantidades pequeñas, plurales, Stock (etiqueta viva y orden fijo),
// Personal sin nombres partidos, Distribución sin contradicciones, APPCC con alérgenos que envuelven y fechas legibles.
// Usa el negocio de prueba dist/ggburger.json y 360 px. Puerto por GG_PUERTO (por defecto 8950).
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const PUERTO = process.env.GG_PUERTO || '8950';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox'], protocolTimeout:60000});
let fallos = 0;
async function caso(nombre, fn){ try{ await fn(); console.log('✅ ' + nombre); } catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); } }
const esperar = ms => new Promise(r => setTimeout(r, ms));

async function abrir(W = 360){
  const page = await browser.newPage();
  await page.setViewport({width:W, height:800, isMobile:true, hasTouch:true});
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|raw.githubusercontent/.test(r.url()) ? r.abort() : r.continue());
  await page.goto(`http://localhost:${PUERTO}/dist/index.html`, {waitUntil:'domcontentloaded'}); await esperar(2500);
  const d = await page.evaluate(async () => (await fetch('/dist/ggburger.json')).json());
  await page.evaluate(async d => {
    localStorage.setItem('gastrogoan_owner_login','1'); localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted','1'); localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
    if(d.license) localStorage.setItem('gastrogoan_license_v1', JSON.stringify(d.license));
    await idbSet('gastrogoan_data_v1', d);
  }, d);
  await page.reload({waitUntil:'domcontentloaded'}); await page.waitForFunction(() => typeof DB !== 'undefined' && DB && DB.sales, {timeout:60000}); await esperar(1200);
  await page.evaluate(() => { ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate','app-splash'].forEach(x => document.getElementById(x)?.remove()); try{hideAccessSelectScreen();}catch(e){} try{hideBusinessSelectScreen();}catch(e){} try{closeModal();}catch(e){} editUnlocked = true; document.body.classList.add('edit-unlocked','owner-session'); try{applyOwnerSessionEditRights();}catch(e){} });
  return page;
}
const page = await abrir();
const q = (fn, ...a) => page.evaluate(fn, ...a);

await caso('Todo campo numérico trae inputmode (teclado numérico) en Escandallo, Stock, Pedidos y Mega Lista', async () => {
  for(const js of ["navigate('escandallo'); openRecipeModal(DB.recipes.find(r=>!r.isBase&&(r.ingredients||[]).length).id)", "navigate('stock'); openStockFolder('Lácteos')", "navigate('megalista'); openIngredientModal()", "navigate('pedidos'); openPedido(9802)"]){
    await q(js); await esperar(700);
    const malos = await q(() => [...document.querySelectorAll('input[type=number]')].filter(e => e.getClientRects().length && !e.inputMode).map(e => e.id || e.className));
    assert.deepEqual(malos, [], js + ' → ' + malos.join(','));
    await q(() => { try{closeModal();}catch(e){} });
  }
});

await caso('Una cantidad pequeña no se redondea a cero (3 g de sal = 0,003 kg)', async () => {
  const r = await q(() => [fmtCant(0.003), fmtCant(0.25), fmtCant(12.5), fmtCant(1234), fmtCant(0)]);
  assert.deepEqual(r, ['0,003', '0,25', '12,5', '1234', '0']);
});

await caso('Plurales: «1 plato», «1 grupo», «1 elaboración» (nunca «1 platos»)', async () => {
  const r = await q(() => [t('noun.group'), t('noun.groups'), tA('label.oneElaboration')]);
  assert.deepEqual(r, ['grupo', 'grupos', '1 elaboración']);
});

await caso('Stock: la etiqueta cambia en cada toque del «+» (no espera al guardado) y el orden no salta', async () => {
  await q(() => { const ing = DB.ingredients.find(i => i.category === 'Lácteos'); DB.stock[ing.id] = {qty: 1, min: 8}; window.__ing = ing.id; saveDB(); navigate('stock'); openStockFolder('Lácteos'); });
  await esperar(600);
  const antes = await q(() => [...document.querySelectorAll('.st-fila .st-nom b')].map(e => e.textContent));
  const r = await q(() => {
    const f = document.querySelector('[data-st="ing-' + window.__ing + '"]');
    const tag0 = f.querySelector('.st-tag').textContent;
    const mas = f.querySelectorAll('.st-qty .btn')[1];
    for(let i = 0; i < 9; i++) mas.click();   // 1 → 10, con mínimo 8
    return {tag0, tag1: f.querySelector('.st-tag').textContent, ok: f.classList.contains('is-ok'), bajo: f.classList.contains('is-bajo')};
  });
  assert.ok(/falta/i.test(r.tag0), r.tag0);
  assert.ok(/sobre el mínimo/i.test(r.tag1) && r.ok && !r.bajo, JSON.stringify(r));
  await esperar(1400);
  const despues = await q(() => [...document.querySelectorAll('.st-fila .st-nom b')].map(e => e.textContent));
  assert.deepEqual(despues, antes, 'el orden de la carpeta no cambia mientras se cuenta');
});

await caso('Personal: ningún nombre se parte a mitad de palabra y no hay chip «Fuera de servicio» que coma la columna', async () => {
  await q("currentFolder='cocina'; navigate('horarios'); setHorariosTab('personal')"); await esperar(700);
  const r = await q(() => [...document.querySelectorAll('.pr-card')].map(c => {
    const n = c.querySelector('.pr-nom'); const rg = document.createRange(); rg.selectNodeContents(n);
    const lineas = new Set([...rg.getClientRects()].map(x => Math.round(x.top))).size;
    const palabras = n.textContent.trim().split(/\s+/).length;
    return {lineas, palabras, chip: !!c.querySelector('.pr-chip.off') && getComputedStyle(c.querySelector('.pr-chip.off')).display !== 'none', w: n.getBoundingClientRect().width};
  }));
  assert.ok(r.length >= 3);
  r.forEach(x => { assert.ok(x.lineas <= x.palabras, 'nombre en demasiados renglones: ' + JSON.stringify(x)); assert.ok(!x.chip, 'chip visible'); assert.ok(x.w > 180, 'columna del nombre estrecha: ' + x.w); });
});

await caso('Distribución: quien descansa hoy no lleva contador «0 / N» y el día elegido va en oliva', async () => {
  await q(() => { const e = DB.employees[0]; DB.turnos = (DB.turnos || []).filter(x => !(x.employeeId === e.id && x.fecha === todayStr())); DB.turnos.push({id: 987654, employeeId: e.id, fecha: todayStr(), tipo: 'D'}); saveDB(); navigate('distribucion'); });
  await esperar(700);
  const lista = await q(() => document.querySelector('.dp-emp .dp-hoy-mini').className + '|' + document.querySelector('.dp-emp .dp-hoy-mini').textContent);
  assert.ok(/is-descansa/.test(lista) && !/\d \/ \d/.test(lista), lista);
  await q(() => openDistEmployee(DB.employees[0].id)); await esperar(500);
  const r = await q(() => ({sel: getComputedStyle(document.querySelector('.dp-dia.is-sel')).backgroundColor, txt: document.querySelector('.dp-prog').textContent}));
  assert.equal(r.sel, 'rgb(74, 93, 78)');
  assert.ok(!/de\s*\d+\s*tareas/.test(r.txt), r.txt);
});

await caso('APPCC › Alérgenos por plato: todos los alérgenos caben dentro de la tarjeta y el rótulo no pisa el nombre', async () => {
  await q("currentFolder='cocina'; navigate('limpieza'); setLimpiezaTab('alergenos')"); await esperar(700);
  const r = await q(() => [...document.querySelectorAll('.lp-alerg-tabla tbody tr')].map(tr => {
    const R = tr.getBoundingClientRect();
    return {fuera: [...tr.querySelectorAll('.badge')].some(b => b.getBoundingClientRect().right > R.right + 1), nom: tr.querySelector('.lp-alerg-nom').textContent.length};
  }));
  assert.ok(r.length > 3);
  assert.ok(r.every(x => !x.fuera && x.nom > 0), JSON.stringify(r.filter(x => x.fuera)));
  const rotuloEnNombre = await q(() => document.querySelector('.lp-alerg-nom').textContent.includes('ELABORACI'));
  assert.ok(!rotuloEnNombre);
});

await caso('APPCC: el resumen de hoy solo sale en la primera pestaña y las fechas no son ISO', async () => {
  await q("navigate('limpieza'); setLimpiezaTab('plagas')"); await esperar(500);
  assert.equal(await q(() => getComputedStyle(document.querySelector('.lp-resumen')).display), 'none');
  await q("setLimpiezaTab('protocolo')"); await esperar(300);
  assert.notEqual(await q(() => getComputedStyle(document.querySelector('.lp-resumen')).display), 'none');
  const iso = await q(() => { DB.limpieza.plagas = DB.limpieza.plagas || []; DB.limpieza.plagas.push({id: 5551, zona:'cocina', fecha:'2026-06-29', proxima:'2026-09-27', area:'Almacén', hallazgos:'', accion:''}); saveDB(); setLimpiezaTab('plagas'); return /\d{4}-\d{2}-\d{2}/.test(document.getElementById('limpieza-tab-content').textContent); });
  assert.ok(!iso, 'queda una fecha ISO a la vista');
});

await caso('Calendario › Día: «‹ fecha ›» en una sola fila y sin desbordar', async () => {
  await q("currentFolder='cocina'; navigate('horarios'); setHorariosTab('calendario'); setHorariosCalView('dia')"); await esperar(700);
  const r = await q(() => { const n = document.querySelector('.cal-nav'); const tops = new Set([...n.children].map(c => Math.round((c.getBoundingClientRect().top + c.getBoundingClientRect().bottom) / 2 / 20))); return {filas: tops.size, desb: document.documentElement.scrollWidth > innerWidth}; });
  assert.equal(r.filas, 1, JSON.stringify(r)); assert.ok(!r.desb);
});

await browser.close();
console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo en orden'); process.exit(fallos ? 1 : 0);
