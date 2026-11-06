// Gestión Económica → Inversiones (6/11): tarjetas con menú ⋯, cuentas de cartera hechas a mano, filtros con su cuenta,
// progreso de cuotas, duplicar, aviso de cuotas acabadas sin marcar «pagado» y vacío con salida. Nada se desborda en 5 anchos.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
async function abrir(w, h, vacio){
  const page = await browser.newPage();
  await page.setViewport({width:w, height:h, isMobile:w < 500, hasTouch:w < 1000});
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|nominatim|zippopotam/.test(r.url()) ? r.abort() : r.continue());
  await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
  await page.evaluate(() => {
    localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'ECOINV01', tenantId: ggBizTenantId('ECOINV01')}));
    localStorage.setItem('gastrogoan_owner_login', '1'); localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted', '1'); localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
  });
  await page.reload({waitUntil:'domcontentloaded'}); await new Promise(r => setTimeout(r, 2000));
  await page.evaluate(async vacio => {
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id => document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, cif:'B12345678', formaJuridica:'sociedad', regimenFiscal:'directa'});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    const hoy = new Date(); const primero = n => { const d = new Date(hoy.getFullYear(), hoy.getMonth() - n, 1, 12); return d.toISOString().slice(0, 10); };
    DB.ge = DB.ge || {};
    DB.ge.capex = vacio ? [] : [
      {id:1, descripcion:'HORNO MIXTO', importe:5000, iva:21, fecha:primero(6), estadoPago:'PARCIAL', tipoAmort:'maquinaria', financiado:true, cuotaMensual:200, cuotas:30},
      {id:2, descripcion:'TPV NUEVO', importe:250, iva:21, fecha:primero(2), estadoPago:'PAGADO', tipoAmort:'informatica', financiado:false},
      {id:3, descripcion:'REFORMA DEL LOCAL', importe:20000, iva:21, fecha:primero(0), estadoPago:'PENDIENTE', tipoAmort:'obras', financiado:false}
    ];
    saveDB(); currentFolder = 'gestion'; ownerUnlocked = true; navigate('economia'); GE.tab('capex'); await new Promise(r => setTimeout(r, 700));
  }, !!vacio);
  return {page, errs};
}
const numero = s => parseFloat(String(s).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
await caso('Cartera a mano: 25.250 € invertidos, 5.302,50 € de IVA, 4.800 € de deuda (24 cuotas × 200), cuota 200 €/mes y valor hoy 24.483,33 €', async () => {
  const {page, errs} = await abrir(1280, 900);
  const k = await page.evaluate(() => [...document.querySelectorAll('#capex-kpis .ge-kpi')].map(x => ({l: x.querySelector('.lbl').textContent.trim(), v: x.querySelector('.val').textContent, s: x.querySelector('.sub').textContent})));
  assert.equal(k.length, 5, JSON.stringify(k));
  assert.equal(numero(k[0].v), 25250); assert.match(k[0].s, /5302,50/);
  assert.ok(Math.abs(numero(k[1].v) - 24483.33) < 0.02, 'valor hoy = 4.650 + 0 + 19.833,33: ' + k[1].v);
  assert.equal(numero(k[2].v), 4800); assert.match(k[2].s, /24/);
  assert.equal(numero(k[3].v), 200);
  assert.ok(Math.abs(numero(k[4].v) - 216.67) < 0.02, 'amortización del mes = 50 + 0 + 166,67: ' + k[4].v);
  const barra = await page.evaluate(() => document.getElementById('capex-total').textContent + '|' + document.getElementById('capex-base').textContent);
  assert.match(barra, /30552,50.*25250,00/); assert.deepEqual(errs, []); await page.close();
});
await caso('Tarjetas: nombre, chips (tipo, estado, financiación), menú ⋯ de tres acciones, progreso de cuotas y detalle; sin tabla vieja', async () => {
  const {page} = await abrir(1280, 900);
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms)); const f = id => document.querySelector(`#capex-list .gf-fila[data-pl="cx-${id}"]`);
    const out = {filas: document.querySelectorAll('#capex-list .gf-fila').length, tabla: !!document.getElementById('capex-table'), viejos: document.querySelectorAll('#capex-list .btn-icon').length,
      orden: [...document.querySelectorAll('#capex-list .gf-nom b')].map(b => b.textContent), horno: f(1).textContent.replace(/\s+/g, ' '), tpv: f(2).textContent.replace(/\s+/g, ' '), progreso: f(1).querySelector('.cx-prog small')?.textContent, sinProg: !f(3).querySelector('.cx-prog')};
    f(1).querySelector('.mn-btn').click(); await esp(200); out.menu = [...document.querySelectorAll('.mn-menu .mn-item')].map(b => b.textContent.trim().toLowerCase()); ggCerrarMenuAcciones();
    return out;
  });
  assert.equal(r.filas, 3); assert.equal(r.tabla, false); assert.equal(r.viejos, 0); assert.deepEqual(r.orden, ['REFORMA DEL LOCAL', 'TPV NUEVO', 'HORNO MIXTO'], 'las más recientes primero');
  assert.match(r.horno, /Maquinaria/i); assert.match(r.horno, /24/); assert.match(r.horno, /Última cuota/i); assert.match(r.horno, /4650,00/);
  assert.match(r.tpv, /Todo a gasto/i); assert.match(r.progreso, /6 \/ 30/); assert.ok(r.sinProg); assert.deepEqual(r.menu, ['editar', 'duplicar', 'eliminar']); await page.close();
});
await caso('Filtros con su cuenta: Todas 3 · Financiadas 1 · Por pagar 2 · Pagadas 1', async () => {
  const {page} = await abrir(1280, 900);
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms)); const out = {chips: [...document.querySelectorAll('#capex-filtros .btn')].map(b => b.textContent.replace(/\s+/g, ' ').trim())};
    for(const [i, k] of [[1, 'fin'], [2, 'pend'], [3, 'pag'], [0, 'todas']]){ document.querySelectorAll('#capex-filtros .btn')[i].click(); await esp(150); out[k] = document.querySelectorAll('#capex-list .gf-fila').length; }
    return out;
  });
  assert.deepEqual(r.chips.map(c => c.replace(/\D+/g, '')), ['3', '1', '2', '1'], JSON.stringify(r.chips)); assert.deepEqual([r.fin, r.pend, r.pag, r.todas], [1, 2, 1, 3]); await page.close();
});
await caso('Menú ⋯: Editar abre la ficha por secciones; Duplicar abre una copia pendiente; Eliminar pregunta y borra', async () => {
  const {page, errs} = await abrir(1280, 900);
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms)); const out = {};
    const menu = async (id, i) => { document.querySelector(`#capex-list .gf-fila[data-pl="cx-${id}"] .mn-btn`).click(); await esp(200); [...document.querySelectorAll('.mn-menu .mn-item')][i].click(); await esp(300); };
    await menu(1, 0); out.secciones = [...document.querySelectorAll('#modal-box .gf-mh')].map(x => x.textContent.trim().toLowerCase()); out.nombre = document.getElementById('cx-f-desc').value; closeModal(); await esp(200);
    await menu(1, 1); out.copia = document.getElementById('cx-f-desc').value; out.estado = document.getElementById('cx-f-estado').value; out.financiado = document.getElementById('cx-f-financiado').checked;
    saveCapex(); await esp(300); out.tras = DB.ge.capex.length; closeModal(); await esp(150);
    const idCopia = DB.ge.capex[DB.ge.capex.length - 1].id; await menu(idCopia, 2);
    out.confirma = !!document.querySelector('#modal-box .btn-danger, #modal-box .btn-primary[onclick*="acceptConfirm"]'); acceptConfirmModal(); await esp(300); out.final = DB.ge.capex.length;
    return out;
  });
  assert.equal(r.secciones.length, 4, JSON.stringify(r.secciones)); assert.equal(r.nombre, 'HORNO MIXTO'); assert.match(r.copia, /HORNO MIXTO.*COPIA/); assert.equal(r.estado, 'PENDIENTE'); assert.ok(r.financiado);
  assert.equal(r.tras, 4); assert.ok(r.confirma); assert.equal(r.final, 3); assert.deepEqual(errs, []); await page.close();
});
await caso('Cuotas acabadas sin marcar «pagado»: aviso arriba y chip en la tarjeta; y sin inversiones, vacío con botón', async () => {
  const {page} = await abrir(1280, 900);
  const r = await page.evaluate(async () => {
    DB.ge.capex[0].cuotas = 6; saveDB(); GE.renderCapex && GE.renderCapex(); navigate('economia'); GE.tab('capex'); await new Promise(r => setTimeout(r, 400));
    return {alerta: getComputedStyle(document.getElementById('capex-overdue-alert')).display, txt: document.getElementById('capex-overdue-alert').textContent, chip: document.querySelector('#capex-list .gf-fila[data-pl="cx-1"] .gf-chip.is-aviso')?.textContent || ''};
  });
  assert.equal(r.alerta, 'block'); assert.match(r.txt, /HORNO/); assert.match(r.chip, /Pagado/); await page.close();
  const {page: p2} = await abrir(1280, 900, true);
  const v = await p2.evaluate(() => ({vacio: getComputedStyle(document.getElementById('capex-empty')).display, boton: !!document.querySelector('#capex-empty .btn-primary'), barra: getComputedStyle(document.getElementById('capex-total-bar')).display, kpis: document.querySelectorAll('#capex-kpis .ge-kpi').length}));
  assert.notEqual(v.vacio, 'none'); assert.ok(v.boton); assert.equal(v.barra, 'none'); assert.equal(v.kpis, 5); await p2.close();
});
for(const ancho of [320, 360, 390, 412, 430]){
  await caso(`Móvil ${ancho}: Inversiones sin desborde, detalle plegado y botones de toque`, async () => {
    const {page} = await abrir(ancho, 800);
    const r = await page.evaluate(async () => {
      const esp = ms => new Promise(r => setTimeout(r, ms)); const raiz = document.getElementById('ge-capex'); const fila = raiz.querySelector('.gf-fila[data-pl="cx-1"]');
      const out = {desborde: document.documentElement.scrollWidth - innerWidth, det0: getComputedStyle(fila.querySelector('.cx-det')).display};
      fila.querySelector('.pl-chev').click(); await esp(200); out.det1 = getComputedStyle(fila.querySelector('.cx-det')).display;
      out.fuera = [...raiz.querySelectorAll('.gf-fila *, .cx-kpis *, #capex-filtros *, #capex-total-bar *')].filter(e => { const q = e.getBoundingClientRect(); return q.width && (q.right > innerWidth + 1 || q.left < -1); }).map(e => e.className || e.tagName).slice(0, 5);
      out.chicos = [...raiz.querySelectorAll('.mn-btn, .pl-chev, #capex-filtros .btn')].filter(b => { const q = b.getBoundingClientRect(); return q.width && (q.width < 39.5 || q.height < 36); }).length;
      out.letra = Math.min(...[...raiz.querySelectorAll('*')].filter(e => e.children.length === 0 && e.textContent.trim() && e.getBoundingClientRect().width).map(e => parseFloat(getComputedStyle(e).fontSize)));
      return out;
    });
    assert.equal(r.desborde, 0, JSON.stringify(r)); assert.equal(r.det0, 'none'); assert.notEqual(r.det1, 'none'); assert.deepEqual(r.fuera, [], JSON.stringify(r)); assert.equal(r.chicos, 0, JSON.stringify(r)); assert.ok(r.letra >= 11, 'letra ' + r.letra); await page.close();
  });
}
await browser.close();
console.log(fallos ? `\n❌ ${fallos} caso(s) fallaron` : '\n✅ todos los casos pasaron'); process.exit(fallos ? 1 : 0);
