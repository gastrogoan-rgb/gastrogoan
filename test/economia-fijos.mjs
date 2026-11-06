// Gestión Económica → Gastos Fijos (6/11): filas con chips, menú ⋯ (editar, duplicar, eliminar), detalle plegable en móvil,
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
    localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'ECOFIJ01', tenantId: ggBizTenantId('ECOFIJ01')}));
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
    DB.employees = [{id:501, name:'Ana Pérez', area:'cocina', role:'Cocinera'}];
    DB.ge = DB.ge || {};
    DB.ge.fijos = [
      {id:11, nombre:'ALQUILER', importe:1200, periodicidadMeses:1, categoria:'FIJOS', iva:21, diaPago:5, proveedor:'Inmobiliaria Sol', nifProveedor:'B11111111'},
      {id:12, nombre:'SEGURO DEL LOCAL', importe:600, periodicidadMeses:12, categoria:'FIJOS', iva:21},
      {id:13, nombre:'INTERNET/TELEFONÍA', importe:90, periodicidadMeses:3, categoria:'FIJOS', iva:21, mesPago:1, notas:'Fibra + móvil'},
      {id:14, nombre:'GAS', importe:80, periodicidadMeses:1, categoria:'FIJOS'},
      {id:21, nombre:'CUOTA AUTÓNOMOS (RETA)', importe:310, periodicidadMeses:1, categoria:'PERSONAL'}
    ];
    currentFolder = 'gestion'; ownerUnlocked = true; navigate('economia'); GE.tab('fijos'); await new Promise(r => setTimeout(r, 900));
  });
  return {page, errs};
}
await caso('Filas con nombre, chips y menú ⋯ (sin los botones sueltos de editar/borrar), avisos y empleados sin coste', async () => {
  const {page, errs} = await abrir(1280, 900);
  const r = await page.evaluate(() => {
    const filas = [...document.querySelectorAll('#ge-fijos .gf-fila')];
    return {
      n: filas.length, menus: document.querySelectorAll('#ge-fijos .gf-fila .mn-btn').length,
      viejos: document.querySelectorAll('#ge-fijos .ge-item .btn-icon').length,
      chips: filas.map(f => [...f.querySelectorAll('.gf-chip')].map(c => c.textContent.trim().toLowerCase()).join('|')),
      sinMes: [...document.querySelectorAll('#ge-fijos .gf-chip.is-aviso')].map(c => c.textContent.trim().toLowerCase()),
      sug: document.querySelector('#gf-sugeridos')?.textContent || '', total: document.getElementById('gf-total-val').textContent
    };
  });
  assert.equal(r.n, 5, 'cinco filas'); assert.equal(r.menus, 5); assert.equal(r.viejos, 0);
  assert.ok(r.chips[2].includes('anual'), r.chips[2]); assert.ok(r.chips[3].includes('trimestral'), r.chips[3]);
  assert.ok(r.sinMes.some(x => /sin mes de factura/.test(x)), 'el seguro anual sin mes de factura avisa: ' + r.sinMes);
  assert.ok(r.sinMes.some(x => /falta el iva/.test(x)), 'el gas sin IVA avisa');
  assert.match(r.sug, /Ana Pérez/); assert.match(r.total, /\d/); assert.deepEqual(errs, []); await page.close();
});
await caso('«A dónde va cada euro» (barra + leyenda que suma 100 %) y próximos pagos no mensuales ordenados', async () => {
  const {page} = await abrir(1280, 900);
  const r = await page.evaluate(() => {
    const leg = [...document.querySelectorAll('#gf-resumen .gf-leyenda li')];
    const pct = leg.map(l => parseFloat(l.querySelector('small').textContent));
    return {leg: leg.length, suma: pct.reduce((a, b) => a + b, 0), barra: document.querySelectorAll('#gf-resumen .ve-barra span').length,
      prox: [...document.querySelectorAll('#gf-resumen .gf-prox li')].map(l => l.querySelector('.gf-prox-n').textContent.trim()), dist: !!document.querySelector('#gf-visual-content .gf-dist')};
  });
  assert.ok(r.leg >= 4 && r.barra === r.leg, JSON.stringify(r)); assert.ok(Math.abs(r.suma - 100) <= 3, 'suma ' + r.suma);
  assert.equal(r.prox.length, 2, JSON.stringify(r.prox)); assert.ok(r.prox.some(x => /SEGURO/i.test(x)) && r.prox.some(x => /INTERNET/i.test(x))); assert.ok(r.dist);
  await page.close();
});
await caso('Menú ⋯: Editar abre la ficha por secciones; Duplicar abre una copia; Eliminar pregunta y borra', async () => {
  const {page, errs} = await abrir(1280, 900);
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms)); const out = {};
    const abrirMenu = id => { document.querySelector(`#ge-fijos .gf-fila[data-pl="gf-${id}"] .mn-btn`).click(); return esp(200); };
    await abrirMenu(11); out.items = [...document.querySelectorAll('.mn-menu .mn-item')].map(b => b.textContent.trim());
    [...document.querySelectorAll('.mn-menu .mn-item')][0].click(); await esp(300);
    out.secciones = [...document.querySelectorAll('#modal-box .gf-mh')].map(x => x.textContent.trim().toLowerCase());
    out.nombre = document.getElementById('gf-f-nombre').value; closeModal(); await esp(200);
    await abrirMenu(11); [...document.querySelectorAll('.mn-menu .mn-item')][1].click(); await esp(300);
    out.copia = document.getElementById('gf-f-nombre').value; out.copiaIva = document.getElementById('gf-f-iva')?.value;
    GE.saveGF(); await esp(300); out.trasDup = DB.ge.fijos.length; closeModal(); await esp(150);
    const idCopia = DB.ge.fijos[DB.ge.fijos.length - 1].id;
    await abrirMenu(idCopia); [...document.querySelectorAll('.mn-menu .mn-item')][2].click(); await esp(300);
    out.confirma = !!document.querySelector('#modal-box .btn-danger, #modal-box .btn-primary[onclick*="acceptConfirm"]');
    acceptConfirmModal(); await esp(300); out.trasBorrar = DB.ge.fijos.length;
    return out;
  });
  assert.deepEqual(r.items.map(x => x.toLowerCase()), ['editar', 'duplicar', 'eliminar']);
  assert.ok(r.secciones.length >= 4, JSON.stringify(r.secciones)); assert.equal(r.nombre, 'ALQUILER');
  assert.match(r.copia, /ALQUILER.*copia/i); assert.equal(r.trasDup, 6); assert.ok(r.confirma); assert.equal(r.trasBorrar, 5); assert.deepEqual(errs, []); await page.close();
});
for(const ancho of [320, 360, 390, 412, 430]){
  await caso(`Móvil ${ancho}: sin desborde, detalle plegado que se abre con el chevron, objetivos de toque`, async () => {
    const {page} = await abrir(ancho, 800);
    await page.evaluate(async () => { navigate('economia'); GE.tab('fijos'); await new Promise(r => setTimeout(r, 600)); });
    const r = await page.evaluate(async () => {
      const esp = ms => new Promise(r => setTimeout(r, ms));
      const raiz = document.getElementById('ge-fijos'); const fila = raiz.querySelector('.gf-fila[data-pl="gf-11"]');
      const out = {desborde: document.documentElement.scrollWidth - innerWidth, det0: getComputedStyle(fila.querySelector('.gf-det')).display, chips: []};
      fila.querySelector('.pl-chev').click(); await esp(200); out.det1 = getComputedStyle(fila.querySelector('.gf-det')).display;
      out.chicos = [...raiz.querySelectorAll('.gf-fila .mn-btn, .gf-fila .pl-chev')].filter(b => { const q = b.getBoundingClientRect(); return q.width && (q.width < 39.5 || q.height < 36); }).length;
      out.fuera = [...raiz.querySelectorAll('.gf-fila *')].filter(e => { const q = e.getBoundingClientRect(); return q.width && (q.right > innerWidth + 1 || q.left < -1); }).length;
      out.chip = Math.min(...[...raiz.querySelectorAll('.gf-chip')].map(c => parseFloat(getComputedStyle(c).fontSize)));
      return out;
    });
    assert.equal(r.desborde, 0); assert.equal(r.det0, 'none'); assert.notEqual(r.det1, 'none'); assert.equal(r.chicos, 0, 'botones por debajo del mínimo del sistema (40×36,5)'); assert.equal(r.fuera, 0); assert.ok(r.chip >= 11);
    await page.close();
  });
}
await browser.close();
console.log(fallos ? `\n❌ ${fallos} caso(s) fallaron` : '\n✅ todos los casos pasaron'); process.exit(fallos ? 1 : 0);
