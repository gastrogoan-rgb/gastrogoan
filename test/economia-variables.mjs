// Gestión Económica → Gastos Variables (6/11): filas con chips, menú ⋯ (editar, duplicar, eliminar), detalle plegable en móvil,
// «a dónde va cada euro», próximos pagos no mensuales y la ficha por secciones. Nada se desborda en 5 anchos.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
async function abrir(w, h){
  const page = await browser.newPage();
  await page.setViewport({width:w, height:h, isMobile:w < 500, hasTouch:w < 1000});
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|nominatim|zippopotam/.test(r.url()) ? r.abort() : r.continue());
  await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
  await page.evaluate(() => {
    localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'ECOVAR01', tenantId: ggBizTenantId('ECOVAR01')}));
    localStorage.setItem('gastrogoan_owner_login', '1'); localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted', '1'); localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
  });
  await page.reload({waitUntil:'domcontentloaded'}); await new Promise(r => setTimeout(r, 2000));
  await page.evaluate(async () => {
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id => document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, cif:'B12345678', formaJuridica:'autonomo', regimenFiscal:'directa'});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    DB.sales.length = 0; const hoy = new Date().toISOString().slice(0, 10);
    for(let i = 0; i < 20; i++) DB.sales.push({id:i + 1, date:hoy, createdAt:hoy + 'T13:00:00', total:100, tipo:'mesa', items:[{name:'Plato', price:100, qty:1}], pagos:[{amount:100, metodoPago:'Efectivo'}]});
    DB.ge = DB.ge || {}; const hoyD = new Date(), y = hoyD.getFullYear(), m = hoyD.getMonth(), dd = n => String(n).padStart(2, '0');
    const f = d => y + '-' + dd(m + 1) + '-' + dd(d);
    DB.ge.variables = [
      {id:9001, proveedor:'Makro', categoria:'MATERIA PRIMA', importe:400, iva:10, fecha:f(3), mes:m, 'año':y, auto:true},
      {id:9002, proveedor:'Makro', categoria:'MATERIA PRIMA', importe:100, iva:10, fecha:f(4), mes:m, 'año':y, auto:true},
      {id:9003, proveedor:'Ferretería Paco', categoria:'MATERIA PRIMA', importe:50, iva:21, fecha:f(5), mes:m, 'año':y, numFactura:'F-77', nifProveedor:'B222'},
      {id:9004, proveedor:'Limpiezas Sol', categoria:'LIMPIEZA', importe:80, iva:21, fecha:f(6), mes:m, 'año':y},
      {id:9005, proveedor:'Error de dedo', categoria:'LIMPIEZA', importe:999, iva:21, fecha:f(7), mes:m, 'año':y, anulado:true, anuladoMotivo:'Importe mal puesto'}
    ];
    for(let i = 0; i < 7; i++) DB.ge.variables.push({id:9100 + i, proveedor:'Comisión TPV', categoria:'OTROS', importe:12, iva:21, fecha:f(2), mes:m, 'año':y});
    currentFolder = 'gestion'; ownerUnlocked = true; navigate('economia'); GE.tab('variables'); await new Promise(r => setTimeout(r, 900));
  });
  return {page, errs};
}

await caso('Compras: filas con chips, anulación en el ⋯, subtotal por categoría y anulados tachados', async () => {
  const {page, errs} = await abrir(1280, 900);
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms));
    const lista = document.getElementById('gv-list');
    const out = {cats: [...lista.querySelectorAll('.gv-cat')].map(c => c.textContent.replace(/\s+/g, ' ').trim()), filas: lista.querySelectorAll('.gf-fila').length,
      viejos: lista.querySelectorAll('.ge-item, .btn-icon').length, lock: lista.innerHTML.includes('ti-lock'), tachado: lista.innerHTML.includes('line-through'),
      menus: lista.querySelectorAll('.mn-btn').length, anulaStr: /anularGVGroup/.test(lista.innerHTML) && /anularGV\(9003\)/.test(lista.innerHTML)};
    const fila = lista.querySelector('.gf-fila[data-pl="gv-m-9003"]'); out.chips = [...fila.querySelectorAll('.gf-chip')].map(c => c.textContent.trim().toLowerCase());
    out.detalle = fila.querySelector('.gf-det').textContent;
    fila.querySelector('.mn-btn').click(); await esp(200);
    out.items = [...document.querySelectorAll('.mn-menu .mn-item')].map(b => b.textContent.trim().toLowerCase()); ggCerrarMenuAcciones();
    return out;
  });
  assert.equal(r.filas, 11, 'filas'); assert.equal(r.viejos, 0); assert.ok(r.lock && r.tachado && r.anulaStr, JSON.stringify(r));
  assert.ok(r.cats.length === 3 && r.cats.every(c => /\d/.test(c)), JSON.stringify(r.cats));
  assert.ok(r.chips.some(c => /iva 21/.test(c)), r.chips.join('|')); assert.match(r.detalle, /F-77/); assert.match(r.detalle, /B222/);
  assert.equal(r.items.length, 1, 'sin factura adjunta, solo «Anular»: ' + r.items); assert.deepEqual(errs, []); await page.close();
});
await caso('Reparto por categoría (suma 100 %), proveedores que más pesan y gasto hormiga', async () => {
  const {page} = await abrir(1280, 900);
  const r = await page.evaluate(() => {
    const leg = [...document.querySelectorAll('#gv-resumen .gf-leyenda li')]; const suma = leg.map(l => parseFloat(l.querySelector('small').textContent)).reduce((a, b) => a + b, 0);
    return {leg: leg.length, suma, barra: document.querySelectorAll('#gv-resumen .ve-barra span').length, rank: [...document.querySelectorAll('#gv-resumen .gv-rank li')].map(l => l.textContent.replace(/\s+/g, ' ').trim()), hormiga: document.getElementById('gv-hormiga').textContent, kpis: document.getElementById('gv-kpis').textContent};
  });
  assert.equal(r.leg, 3, JSON.stringify(r)); assert.equal(r.barra, 3); assert.ok(Math.abs(r.suma - 100) <= 2, 'suma ' + r.suma);
  assert.match(r.rank[0], /Makro/); assert.ok(r.rank.length >= 3); assert.match(r.hormiga, /Comisión TPV/); assert.match(r.kpis, /Cambiar/); await page.close();
});
await caso('Buscar filtra las compras y muestra el aviso vacío con su icono', async () => {
  const {page} = await abrir(1280, 900);
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms)); const out = {};
    const inp = document.getElementById('gv-search'); inp.value = 'makro'; inp.dispatchEvent(new Event('input', {bubbles: true})); await esp(250);
    out.makro = [...document.querySelectorAll('#gv-list .gf-fila .gf-nom b')].map(b => b.textContent);
    inp.value = 'zzzz'; inp.dispatchEvent(new Event('input', {bubbles: true})); await esp(250);
    out.vacio = document.getElementById('gv-empty').textContent.trim(); out.visible = getComputedStyle(document.getElementById('gv-empty')).display;
    return out;
  });
  assert.deepEqual(r.makro, ['Makro'], 'Makro agrupa sus pedidos en una fila: ' + JSON.stringify(r)); assert.ok(r.vacio.length > 3 && r.visible !== 'none'); await page.close();
});
for(const ancho of [320, 360, 390, 412, 430]){
  await caso(`Móvil ${ancho}: sin desborde, detalle plegado y objetivos de toque`, async () => {
    const {page} = await abrir(ancho, 800);
    await page.evaluate(async () => { navigate('economia'); GE.tab('variables'); await new Promise(r => setTimeout(r, 600)); });
    const r = await page.evaluate(async () => {
      const esp = ms => new Promise(r => setTimeout(r, ms)); const raiz = document.getElementById('ge-variables');
      const fila = raiz.querySelector('.gf-fila[data-pl="gv-m-9003"]');
      const out = {desborde: document.documentElement.scrollWidth - innerWidth, det0: getComputedStyle(fila.querySelector('.gf-det')).display};
      fila.querySelector('.pl-chev').click(); await esp(200); out.det1 = getComputedStyle(fila.querySelector('.gf-det')).display;
      out.chicos = [...raiz.querySelectorAll('.gf-fila .mn-btn, .gf-fila .pl-chev')].filter(b => { const q = b.getBoundingClientRect(); return q.width && (q.width < 39.5 || q.height < 36); }).length;
      out.fuera = [...raiz.querySelectorAll('.gf-fila *, .gf-card *, .gv-nota *, .gv-hormiga *, .gv-cat *')].filter(e => { const q = e.getBoundingClientRect(); return q.width && (q.right > innerWidth + 1 || q.left < -1); }).length;
      return out;
    });
    assert.equal(r.desborde, 0, JSON.stringify(r)); assert.equal(r.det0, 'none'); assert.notEqual(r.det1, 'none'); assert.equal(r.chicos, 0); assert.equal(r.fuera, 0, JSON.stringify(r)); await page.close();
  });
}
await browser.close();
console.log(fallos ? `\n❌ ${fallos} caso(s) fallaron` : '\n✅ todos los casos pasaron'); process.exit(fallos ? 1 : 0);
