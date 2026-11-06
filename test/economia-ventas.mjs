// Gestión Económica → Ventas (2/11): el canal elegido manda (Mesa / Take away / Delivery solo enseñan lo suyo), sin vales regalo,
// selector de periodo común, curva día a día, y el aviso «sin su mes de factura» lleva al gasto.
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
    localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'ECOVEN01', tenantId: ggBizTenantId('ECOVEN01')}));
    localStorage.setItem('gastrogoan_owner_login', '1'); localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted', '1'); localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
  });
  await page.reload({waitUntil:'domcontentloaded'}); await new Promise(r => setTimeout(r, 2000));
  await page.evaluate(async () => {
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id => document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, cif:'B12345678', formaJuridica:'autonomo', regimenFiscal:'directa', tiposServicio:{mesa:true, takeaway:true, delivery:true}});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    DB.sales.length = 0; let k = 1; const hoy = new Date(); const mes = hoy.toISOString().slice(0, 8);
    const venta = (dia, tipo, total) => DB.sales.push({id:k++, date: mes + String(dia).padStart(2, '0'), createdAt: mes + String(dia).padStart(2, '0') + 'T13:00:00', total, tipo, items:[{name:'Plato', price:total, qty:1}], pagos:[{amount:total, metodoPago:'Efectivo'}]});
    venta(1, 'mesa', 100); venta(1, 'mesa', 50); venta(2, 'takeaway', 30); venta(3, 'delivery', 40); venta(3, 'delivery', 20);
    DB.ge = DB.ge || {}; DB.ge.fijos = [{id:77, nombre:'SEGURO', importe:600, periodicidadMeses:12, categoria:'GENERAL', activo:true}];
    DB.ge.otrosIngresos = [{id:1, fecha: mes + '02', concepto:'Subvención', importe:500, tipo:'subvencion'}];
    currentFolder = 'gestion'; ownerUnlocked = true; navigate('economia'); await new Promise(r => setTimeout(r, 1000));
  });
  return {page, errs};
}
await caso('«Todos» enseña el desglose por canal; Mesa / Take away / Delivery enseñan SOLO su canal (sin desglose, sin otros ingresos) y su total', async () => {
  const {page, errs} = await abrir(1280, 900);
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms));
    const num = s => parseFloat(s.replace(/[^\d,]/g, '').replace(',', '.'));
    const val = () => num(document.querySelector('#ventas-kpis .ge-kpi .val').textContent);
    const out = {chips: [...document.querySelectorAll('#ventas-tipo-filter .btn')].map(b => b.textContent.replace(/\s+/g, ' ').trim())};
    out.todos = {total: val(), desglose: document.querySelectorAll('#ventas-por-tipo .ve-leg').length, otros: !!document.querySelector('#ventas-otros-ingresos *'), filas: document.querySelectorAll('#ventas-dia-table tbody tr').length};
    for(const [tipo, i] of [['mesa', 1], ['takeaway', 2], ['delivery', 3]]){
      document.querySelectorAll('#ventas-tipo-filter .btn')[i].click(); await esp(250);
      out[tipo] = {total: val(), desglose: document.querySelectorAll('#ventas-por-tipo *').length, otros: !!document.querySelector('#ventas-otros-ingresos *'), filas: document.querySelectorAll('#ventas-dia-table tbody tr').length, titulo: document.getElementById('ventas-dia-title').textContent};
    }
    out.vales = !!document.getElementById('ventas-vales') || /vale regalo|vender un vale/i.test(document.getElementById('ge-ventas').textContent);
    return out;
  });
  assert.equal(r.todos.total, 240); assert.equal(r.todos.desglose, 3); assert.equal(r.todos.otros, true);
  assert.equal(r.mesa.total, 150); assert.equal(r.takeaway.total, 30); assert.equal(r.delivery.total, 60);
  for(const k of ['mesa','takeaway','delivery']){ assert.equal(r[k].desglose, 0, k + ' no debe enseñar el desglose de los demás canales'); assert.equal(r[k].otros, false, k + ' no debe enseñar otros ingresos'); }
  assert.equal(r.mesa.filas, 1); assert.equal(r.delivery.filas, 1 + 0, JSON.stringify(r.delivery)); assert.ok(!r.vales, 'ya no hay vales regalo en Ventas');
  assert.match(r.chips[1], /Mesa\s+2/); assert.deepEqual(errs, []); await page.close();
});
await caso('Selector de periodo común (flechas y año/mes), curva día a día y «mejor día»', async () => {
  const {page} = await abrir(1280, 900);
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms));
    const out = {selector: !!document.querySelector('#ventas-periodo .pe-sel'), antiguos: document.querySelectorAll('#ventas-months .month-pill, #ventas-year').length, curva: document.querySelectorAll('#ve-curva .dt-punto').length, mejor: (document.querySelector('.ve-curva .dt-pico') || {}).textContent};
    const antes = document.querySelector('#ventas-periodo .pe-actual').textContent.trim();
    document.querySelectorAll('#ventas-periodo .pe-flecha')[0].click(); await esp(250);
    out.cambia = document.querySelector('#ventas-periodo .pe-actual').textContent.trim() !== antes;
    out.vacioMes = !document.getElementById('ve-curva') && /./.test(document.getElementById('ventas-dia-table').textContent);
    return out;
  });
  assert.ok(r.selector && r.antiguos === 0 && r.cambia, JSON.stringify(r)); assert.ok(r.curva >= 28, JSON.stringify(r)); assert.match(r.mejor, /100|150/); assert.ok(r.vacioMes);
  await page.close();
});
await caso('«Gastos que no son mensuales sin su mes de factura»: el botón Ir abre el gasto que falta', async () => {
  const {page} = await abrir(1280, 900);
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms));
    GE.irPrimeroSinMesPago(); await esp(500);
    return {modal: document.getElementById('modal-overlay').classList.contains('active'), nombre: (document.getElementById('gf-nombre') || document.querySelector('#modal-box input') || {}).value, tabFijos: document.getElementById('ge-fijos').classList.contains('active')};
  });
  assert.ok(r.tabFijos && r.modal, JSON.stringify(r)); assert.match(String(r.nombre), /SEGURO/i, JSON.stringify(r));
  await page.close();
});
await caso('Sin desbordes en 5 anchos', async () => {
  for(const [w, h] of [[1280,900],[430,932],[390,844],[360,740],[320,700]]){
    const {page} = await abrir(w, h);
    const r = await page.evaluate(() => { const mal = []; if(document.documentElement.scrollWidth - document.documentElement.clientWidth > 1) mal.push('scroll lateral'); document.querySelectorAll('#view-economia .ve-barra-sup *, #ventas-kpis *, .ve-leg, .ge-tab').forEach(e => { const q = e.getBoundingClientRect(); if(q.width && q.right > innerWidth + 1) mal.push('sale: ' + e.className); }); return mal; });
    assert.deepEqual(r, [], `${w}px: ` + r.join(' | ')); await page.close();
  }
});
console.log(fallos ? `\n❌ ${fallos} caso(s) fallaron` : '\n✅ todos los casos pasaron'); if(fallos) process.exitCode = 1;
await browser.close();
