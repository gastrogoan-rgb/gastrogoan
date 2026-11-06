// Gestión Económica → Punto de equilibrio (6/11): las cuentas hechas a mano, margen de seguridad, beneficio objetivo, gráfico,
// palancas «¿y si…?», food cost sincronizado con Tesorería (sin reajustar a cada tecla), escenarios y «Usar datos del último mes» por cubiertos.
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
    localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'ECOEQU01', tenantId: ggBizTenantId('ECOEQU01')}));
    localStorage.setItem('gastrogoan_owner_login', '1'); localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted', '1'); localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
  });
  await page.reload({waitUntil:'domcontentloaded'}); await new Promise(r => setTimeout(r, 2000));
  await page.evaluate(async () => {
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id => document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, cif:'B12345678', formaJuridica:'autonomo', regimenFiscal:'directa'});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    DB.sales = []; DB.cashClosures = [];
    DB.ge = DB.ge || {};
    DB.ge.config = {distPct:{per:30, gf:20, mp:30, og:5, ben:15}, foodCostObj:30, scenarios:[]};
    // 2.000 € de personal + 1.000 € de gastos fijos (sin IVA) = 3.000 € de costes fijos
    DB.ge.fijos = [{id:1, nombre:'SUELDOS', importe:2000, periodicidadMeses:1, categoria:'PERSONAL', iva:0}, {id:2, nombre:'ALQUILER', importe:1000, periodicidadMeses:1, categoria:'FIJOS', iva:0}];
    DB.ge.fijosLog = []; DB.ge.capex = []; snapshotGeFijosNeto(); saveDB();
    currentFolder = 'gestion'; ownerUnlocked = true; navigate('economia'); GE.tab('pe'); await new Promise(r => setTimeout(r, 700));
  });
  return {page, errs};
}
const poner = (page, vals) => page.evaluate(async v => {
  for(const [id, x] of Object.entries(v)){ const el = document.getElementById(id); el.value = x; el.dispatchEvent(new Event(id === 'pe-fc' ? 'change' : 'input', {bubbles: true})); }
  await new Promise(r => setTimeout(r, 300));
}, vals);
const txt = (page, id) => page.evaluate(i => document.getElementById(i).textContent.replace(/\s+/g, ' ').trim(), id);
await caso('Las cuentas a mano: 3.000 € de fijos, ticket 20 €, food cost 30 % + 10 % otros → contribución 12 € → 250 cubiertos, 10 al día, 5.000 € de ventas mínimas', async () => {
  const {page, errs} = await abrir(1280, 900);
  assert.match(await txt(page, 'pe-fijos-desglose'), /2000,00.*1000,00/);
  await poner(page, {'pe-ticket': '20', 'pe-cubiertos': '300', 'pe-dias': '25', 'pe-fc': '30', 'pe-otros': '10'});
  assert.match(await txt(page, 'pe-r1'), /8,00/); assert.match(await txt(page, 'pe-r2'), /12,00/);
  assert.match(await txt(page, 'pe-r3'), /250/); assert.match(await txt(page, 'pe-r4'), /10/); assert.match(await txt(page, 'pe-r5'), /5000,00/);
  assert.match(await txt(page, 'pe-r6'), /\+50/); assert.match(await txt(page, 'pe-r7'), /16,7/);
  assert.match(await txt(page, 'pe-r8'), /\+600,00/, 'resultado = 300 × 12 − 3.000 = +600');
  assert.match(await txt(page, 'pe-r9'), /334/, 'beneficio 15 %: 3.000 / (12 − 0,15 × 20) = 333,3 → 334');
  const bien = await page.evaluate(() => ({cls: document.getElementById('pe-estado').className, icono: document.getElementById('pe-estado').innerHTML.includes('ti-check'), r8: document.getElementById('pe-r8').className}));
  assert.ok(bien.cls.includes('is-ok') && bien.icono && bien.r8.includes('is-ok'), JSON.stringify(bien));
  await poner(page, {'pe-cubiertos': '200'});
  assert.match(await txt(page, 'pe-r8'), /−600,00/); assert.match(await txt(page, 'pe-r6'), /-50/);
  const mal = await page.evaluate(() => ({cls: document.getElementById('pe-estado').className, cruz: document.getElementById('pe-estado').innerHTML.includes('ti-x'), r7: document.getElementById('pe-r7').className}));
  assert.ok(mal.cls.includes('is-ko') && mal.cruz && mal.r7.includes('is-ko'), JSON.stringify(mal));
  assert.deepEqual(errs, []); await page.close();
});
await caso('Gráfico del equilibrio (ingresos, costes, punto y «hoy») y las cuatro palancas con sus cuentas', async () => {
  const {page} = await abrir(1280, 900);
  await poner(page, {'pe-ticket': '20', 'pe-cubiertos': '300', 'pe-dias': '25', 'pe-fc': '30', 'pe-otros': '10'});
  const r = await page.evaluate(() => ({lineas: document.querySelectorAll('#pe-chart svg line').length, areas: document.querySelectorAll('#pe-chart svg polygon').length, eq: document.querySelector('#pe-chart .pe-e-eq').textContent, hoy: document.querySelector('#pe-chart .pe-e-hoy').textContent,
    pal: [...document.querySelectorAll('#pe-levers .pe-pal')].map(p => p.textContent.replace(/\s+/g, ' ').trim()), vacio: document.getElementById('pe-vacio').textContent.trim()}));
  assert.ok(r.lineas >= 4 && r.areas === 2); assert.match(r.eq, /250/); assert.match(r.hoy, /300/); assert.equal(r.pal.length, 4, JSON.stringify(r.pal)); assert.equal(r.vacio, '');
  // ticket +1 €: 3.000 / 12,6 → 239 (−11) y +180 € al mes con 300 cubiertos
  assert.ok(/−11/.test(r.pal[0]) && /\+180,00/.test(r.pal[0]), r.pal[0]);
  // food cost −2 puntos: contribución 12,4 → 242 (−8), +120 €
  assert.ok(/−8/.test(r.pal[1]) && /\+120,00/.test(r.pal[1]), r.pal[1]);
  // fijos −10 %: 2.700 / 12 = 225 (−25), +300 €
  assert.ok(/−25/.test(r.pal[2]) && /\+300,00/.test(r.pal[2]), r.pal[2]);
  // +10 % de cubiertos: mismo equilibrio, 330 × 12 − 3.000 = 960 → +360 €
  assert.ok(/Mismo equilibrio/.test(r.pal[3]) && /\+360,00/.test(r.pal[3]), r.pal[3]);
  await page.close();
});
await caso('Sin ticket ni días no se inventa nada: aviso claro y sin gráfico; con contribución ≤ 0 dice que no es calculable', async () => {
  const {page} = await abrir(1280, 900);
  const vacio = await page.evaluate(() => ({aviso: document.getElementById('pe-vacio').textContent.trim(), grafico: document.getElementById('pe-chart').innerHTML.trim(), r3: document.getElementById('pe-r3').textContent}));
  assert.match(vacio.aviso, /ticket medio/i); assert.equal(vacio.grafico, ''); assert.equal(vacio.r3, '—');
  await poner(page, {'pe-ticket': '10', 'pe-dias': '25', 'pe-fc': '60', 'pe-otros': '45'});
  assert.ok((await txt(page, 'pe-r3')).length > 3 && !/\d{2,} /.test(await txt(page, 'pe-r3')), await txt(page, 'pe-r3')); await page.close();
});
await caso('El food cost es el mismo número que el reparto de Tesorería, entero, y NO reajusta el reparto mientras se teclea', async () => {
  const {page} = await abrir(1280, 900);
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms)); const el = document.getElementById('pe-fc'); const out = {};
    el.value = '3'; el.dispatchEvent(new Event('input', {bubbles: true})); await esp(200); out.trasTecla = {...DB.ge.config.distPct};
    el.value = '33.4'; el.dispatchEvent(new Event('change', {bubbles: true})); await esp(250); out.trasCambio = {...DB.ge.config.distPct}; out.campo = el.value;
    return out;
  });
  assert.equal(r.trasTecla.mp, 30, 'una tecla a medias no toca el reparto: ' + JSON.stringify(r.trasTecla));
  assert.equal(r.trasCambio.mp, 33); assert.equal(r.campo, '33'); assert.equal(Object.values(r.trasCambio).reduce((a, b) => a + b, 0), 100); assert.ok(Object.values(r.trasCambio).every(Number.isInteger)); await page.close();
});
await caso('Escenarios: guardar, verlos comparados, cargar y eliminar desde el ⋯ (con confirmación)', async () => {
  const {page, errs} = await abrir(1280, 900);
  await poner(page, {'pe-ticket': '20', 'pe-cubiertos': '300', 'pe-dias': '25', 'pe-fc': '30', 'pe-otros': '10'});
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms)); const out = {};
    window.promptText = async () => 'Subo precios'; await GE.peSaveScenario(); await esp(250);
    const t2 = document.getElementById('pe-ticket'); t2.value = '25'; t2.dispatchEvent(new Event('input', {bubbles: true})); await esp(250);
    out.filas = [...document.querySelectorAll('#pe-escenarios .pe-esc')].map(f => f.textContent.replace(/\s+/g, ' ').trim());
    document.querySelector('#pe-escenarios .pe-esc .btn:not(.mn-btn)').click(); await esp(300);
    out.cargado = document.getElementById('pe-ticket').value;
    document.querySelector('#pe-escenarios .pe-esc .mn-btn').click(); await esp(200);
    out.menu = [...document.querySelectorAll('.mn-menu .mn-item')].map(b => b.textContent.trim());
    document.querySelector('.mn-menu .mn-item').click(); await esp(300);
    out.confirma = !!document.querySelector('#modal-box .btn-danger, #modal-box .btn-primary[onclick*="acceptConfirm"]'); acceptConfirmModal(); await esp(300);
    out.quedan = DB.ge.config.scenarios.length; return out;
  });
  assert.equal(r.filas.length, 1); assert.match(r.filas[0], /Subo precios/); assert.match(r.filas[0], /250/); assert.equal(r.cargado, '20');
  assert.equal(r.menu.length, 1); assert.ok(r.confirma); assert.equal(r.quedan, 0); assert.deepEqual(errs, []); await page.close();
});
await caso('«Usar datos del último mes» cuenta CUBIERTOS (comensales), no tickets, y los días con ventas; el ticket va sin IVA', async () => {
  const {page} = await abrir(1280, 900);
  const r = await page.evaluate(async () => {
    const hoy = new Date(), d = n => { const x = new Date(hoy.getTime() - n * 864e5); return x.toISOString().slice(0, 10); };
    // 110 € con IVA al 10 % = 100 € netos con 4 comensales; 55 € = 50 € netos con 2 comensales (otro día); 22 € = 20 € netos para llevar (sin pax = 1 cubierto)
    DB.sales = [
      {id:'a', date:d(1), createdAt:d(1) + 'T14:00:00', total:110, tipo:'mesa', pax:4, items:[{name:'P', qty:1, price:110, ivaPct:10}]},
      {id:'b', date:d(2), createdAt:d(2) + 'T14:00:00', total:55, tipo:'mesa', pax:2, items:[{name:'P', qty:1, price:55, ivaPct:10}]},
      {id:'c', date:d(2), createdAt:d(2) + 'T15:00:00', total:22, tipo:'takeaway', items:[{name:'P', qty:1, price:22, ivaPct:10}]}
    ]; saveDB(); GE.peUseRealData(); await new Promise(r => setTimeout(r, 300));
    return {ticket: document.getElementById('pe-ticket').value, cub: document.getElementById('pe-cubiertos').value, dias: document.getElementById('pe-dias').value};
  });
  assert.equal(r.cub, '7'); assert.equal(r.dias, '2'); assert.equal(r.ticket, (170 / 7).toFixed(2), 'neto 170 € entre 7 cubiertos'); await page.close();
});
for(const ancho of [320, 360, 390, 412, 430]){
  await caso(`Móvil ${ancho}: Punto de equilibrio sin desborde, campos de 44 px, gráfico y palancas dentro de la pantalla`, async () => {
    const {page} = await abrir(ancho, 800);
    await page.evaluate(async () => { navigate('economia'); GE.tab('pe'); await new Promise(r => setTimeout(r, 500)); });
    await poner(page, {'pe-ticket': '20', 'pe-cubiertos': '300', 'pe-dias': '25', 'pe-fc': '30', 'pe-otros': '10'});
    const r = await page.evaluate(() => {
      const raiz = document.getElementById('ge-pe');
      return {desborde: document.documentElement.scrollWidth - innerWidth,
        fuera: [...raiz.querySelectorAll('.pe-graf *, .pe-pal *, .pe-esc *, .ge-input-row *, .pe-kpis *')].filter(e => { const q = e.getBoundingClientRect(); return q.width && (q.right > innerWidth + 1 || q.left < -1); }).map(e => e.className || e.tagName).slice(0, 5),
        chicos: [...raiz.querySelectorAll('.ge-input-row input:not([readonly])')].filter(i => i.getBoundingClientRect().height < 43.5).length,
        letra: Math.min(...[...raiz.querySelectorAll('*')].filter(e => e.children.length === 0 && e.textContent.trim() && e.getBoundingClientRect().width).map(e => parseFloat(getComputedStyle(e).fontSize)))};
    });
    assert.equal(r.desborde, 0, JSON.stringify(r)); assert.deepEqual(r.fuera, [], JSON.stringify(r)); assert.equal(r.chicos, 0); assert.ok(r.letra >= 11, 'letra de ' + r.letra); await page.close();
  });
}
await browser.close();
console.log(fallos ? `\n❌ ${fallos} caso(s) fallaron` : '\n✅ todos los casos pasaron'); process.exit(fallos ? 1 : 0);
