// Beneficio y caja (encargo maestro, fase 8): el PUENTE del beneficio al dinero, con las cuentas hechas a mano.
// Negocio ficticio, un año pasado (2025), doce meses iguales, sociedad micro:
//   cobra 11.000 € al mes (10.000 + 1.000 de IVA); paga el alquiler 605 € (500 + 105 de IVA) y una nómina que le cuesta 2.000 €, de los que retiene 300 € de IRPF
//   (la empresa solo desembolsa 1.700 € y se queda 300 € que debe a Hacienda).  →  caja = 11.000 − 605 − 1.700 = 8.695 € al mes.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const cerca = (a, b, m) => assert.ok(Math.abs(a - b) < 0.02, `${m}: salió ${a}, esperado ${b}`);
async function abrir(w, h){
  const page = await browser.newPage();
  await page.setViewport({width:w, height:h, isMobile:w < 500, hasTouch:w < 1000});
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|nominatim|zippopotam/.test(r.url()) ? r.abort() : r.continue());
  await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
  await page.evaluate(() => {
    localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'BENCAJ01', tenantId: ggBizTenantId('BENCAJ01')}));
    localStorage.setItem('gastrogoan_owner_login', '1'); localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted', '1'); localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
  });
  await page.reload({waitUntil:'domcontentloaded'}); await new Promise(r => setTimeout(r, 2000));
  await page.evaluate(async () => {
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id => document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, cif:'B12345678', formaJuridica:'sociedad', regimenFiscal:'directa', anyo:2010, incnAnterior:'500000'});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    const y = new Date().getFullYear() - 1, dd = n => String(n).padStart(2, '0');
    DB.sales = []; for(let m = 1; m <= 12; m++){ const f = `${y}-${dd(m)}-10`; DB.sales.push({id:'v' + m, date:f, createdAt:f + 'T14:00:00', total:11000, tipo:'mesa', metodoPago:'Tarjeta', items:[{name:'P', qty:1, price:11000, ivaPct:10}]}); }
    DB.ge = DB.ge || {}; DB.ge.config = {}; DB.ge.variables = []; DB.ge.capex = []; DB.ge.fijosLog = []; DB.ge.existencias = {}; DB.ge.otrosIngresos = []; DB.ge.vales = []; DB.ge.obligaciones = {}; delete DB.ge.saldoBanco;
    DB.ge.fijos = [{id:1, nombre:'ALQUILER', importe:500, periodicidadMeses:1, categoria:'FIJOS', iva:21},
      {id:2, nombre:'ANA', categoria:'PERSONAL', autoCalc:true, sueldoNeto:1300, irpfPct:15, ssTrabPct:6.5, ssPct:32.15, sueldoBruto:1500, ssEmpresa:500, irpfMensual:300, importe:2000, periodicidadMeses:1, iva:0}];
    snapshotGeFijosNeto(); saveDB(); currentFolder = 'gestion'; ownerUnlocked = true; navigate('economia'); GE.tab('bc'); await new Promise(r => setTimeout(r, 500));
  });
  return {page, errs};
}
const caja = (page, m) => page.evaluate(async m => { await new Promise(r => setTimeout(r, 20)); const y = new Date().getFullYear() - 1; const d = GE.bcMesDatos(m, y); return d; }, m);
await caso('Puente: cada mes el dinero que entra es 8.695 € (11.000 − 605 − 1.700), aunque el beneficio sea otro; y el año suma 104.340 €', async () => {
  const {page, errs} = await abrir(1280, 900);
  const d = await caja(page, 5);
  cerca(d.caja, 8695, 'caja de junio'); cerca(d.iva, 895, 'IVA'); cerca(d.ret, 300, 'retenciones'); cerca(d.rai, 7500, 'antes de impuestos');
  const año = await page.evaluate(() => { const y = new Date().getFullYear() - 1; return GE.bcAgregar([0,1,2,3,4,5,6,7,8,9,10,11].map(m => GE.bcMesDatos(m, y))); });
  cerca(año.caja, 104340, 'caja del año'); cerca(año.neto + año.imp, 90000, 'neto + impuesto = antes de impuestos'); assert.deepEqual(errs, []); await page.close();
});
await caso('Inversión al contado de 5.000 € + 21 % de IVA en marzo: sale 5.000 de caja y se recupera 1.050 de IVA → caja de marzo 2.645 € (beneficio 7.458,33)', async () => {
  const {page} = await abrir(1280, 900);
  await page.evaluate(async () => { const y = new Date().getFullYear() - 1; DB.ge.capex = [{id:1, descripcion:'REFORMA', importe:5000, iva:21, fecha:`${y}-03-10`, estadoPago:'PAGADO', tipoAmort:'mobiliario', financiado:false}]; saveDB(); await new Promise(r => setTimeout(r, 20)); });
  const d = await caja(page, 2);
  cerca(d.caja, 2645, 'caja de marzo'); cerca(d.invPagada, 5000, 'inversión pagada'); cerca(d.amort, 41.67, 'amortización'); cerca(d.rai, 7458.33, 'beneficio antes de impuestos'); cerca(d.iva, -155, 'IVA a favor');
  await page.close();
});
await caso('Inversión SIN pagar todavía: no ha salido dinero (caja 7.695 de marzo… + IVA) y se avisa; financiada con préstamo: el préstamo entra, la cuota sale y el interés cancela → 8.545 €', async () => {
  const {page} = await abrir(1280, 900);
  const sinPagar = await page.evaluate(async () => { const y = new Date().getFullYear() - 1; DB.ge.capex = [{id:1, descripcion:'HORNO', importe:5000, iva:21, fecha:`${y}-03-10`, estadoPago:'PENDIENTE', tipoAmort:'mobiliario', financiado:false}]; saveDB(); await new Promise(r => setTimeout(r, 20)); const d = GE.bcMesDatos(2, y); return {pend: d.invPendiente, pag: d.invPagada}; });
  cerca(sinPagar.pend, 5000, 'pendiente'); cerca(sinPagar.pag, 0, 'pagada');
  const fin = await page.evaluate(async () => { const y = new Date().getFullYear() - 1; DB.ge.capex = [{id:1, descripcion:'HORNO', importe:5000, iva:21, fecha:`${y}-03-10`, estadoPago:'PARCIAL', tipoAmort:'mobiliario', financiado:true, cuotaMensual:150, cuotas:48, importeFinanciado:6050}]; saveDB(); await new Promise(r => setTimeout(r, 20)); const d = GE.bcMesDatos(2, y); return {caja: d.caja, principal: d.principal, prestamos: d.prestamos, rai: d.rai}; });
  cerca(fin.caja, 8545, 'caja con préstamo'); cerca(fin.prestamos, 6050, 'préstamo recibido'); assert.ok(fin.principal > 100 && fin.principal < 150, 'la cuota de 150 € se parte en devolución e interés: ' + fin.principal);
  await page.close();
});
await caso('Pagos a Hacienda marcados: el 303 del T1 pagado el 20/04 (2.685 €) baja la caja de abril a 6.010 €; sin marcar, la caja no se inventa el pago', async () => {
  const {page} = await abrir(1280, 900);
  const antes = await caja(page, 3);
  await page.evaluate(async () => { const y = new Date().getFullYear() - 1; DB.ge.obligaciones = {[`${y}-T1:303`]: {presentado:`${y}-04-20`, pagado:`${y}-04-20`, real:2685, estimado:2685}}; saveDB(); await new Promise(r => setTimeout(r, 20)); });
  const despues = await caja(page, 3);
  cerca(antes.caja, 8695, 'abril sin marcar'); cerca(despues.caja, 6010, 'abril con el 303 pagado'); cerca(despues.pagosHacienda, 2685, 'pagos a Hacienda');
  await page.close();
});
await caso('Dinero disponible de verdad: saldo − lo de Hacienda − pagos periódicos; en rojo con cruz cuando no alcanza; sin saldo no se inventa nada', async () => {
  const {page} = await abrir(1280, 900);
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms)); const out = {};
    GE.tab('bc'); await esp(300); out.sinSaldo = document.getElementById('bc-disponible').textContent; out.liqSin = document.getElementById('bc-liquidez').textContent;
    document.getElementById('bc-saldo-in').value = '1'; GE.bcGuardarSaldo(); await esp(300);
    out.poco = {txt: document.getElementById('bc-disponible').innerHTML.includes('ti-x'), saldo: DB.ge.saldoBanco.importe};
    document.getElementById('bc-saldo-in').value = '500000'; GE.bcGuardarSaldo(); await esp(300);
    out.mucho = document.getElementById('bc-disponible').textContent;
    return out;
  });
  assert.match(r.sinSaldo, /Escribe tu saldo/); assert.match(r.liqSin, /saldo|Anota/i); assert.ok(r.poco.txt && r.poco.saldo === 1); assert.match(r.mucho, /te queda dinero/);
  await page.close();
});
await caso('Explica por qué no coinciden SOLO lo que pesa: con inversión y préstamo aparecen esas razones; sin ellas, solo IVA/retenciones', async () => {
  const {page} = await abrir(1280, 900);
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms)); const y = new Date().getFullYear() - 1; const out = {};
    bcYear = y; GE.bcPeriodo(y, 5); await esp(300); out.junio = document.getElementById('bc-porque').textContent;
    DB.ge.capex = [{id:1, descripcion:'HORNO', importe:20000, iva:21, fecha:`${y}-06-10`, estadoPago:'PARCIAL', tipoAmort:'maquinaria', financiado:true, cuotaMensual:500, cuotas:48, importeFinanciado:24200}]; saveDB(); await esp(30); GE.bcPeriodo(y, 5); await esp(300); out.conPrestamo = document.getElementById('bc-porque').textContent;
    return out;
  });
  assert.match(r.junio, /de Hacienda/); assert.ok(!/préstamos/.test(r.junio) && !/inversiones/.test(r.junio), r.junio);
  assert.match(r.conPrestamo, /préstamos/); assert.match(r.conPrestamo, /inversiones/); await page.close();
});
for(const ancho of [320, 360, 390, 412, 430]){
  await caso(`Móvil ${ancho}: Beneficio y caja sin desborde y con el saldo editable de 44 px`, async () => {
    const {page} = await abrir(ancho, 800);
    const r = await page.evaluate(async () => {
      const esp = ms => new Promise(r => setTimeout(r, ms)); const y = new Date().getFullYear() - 1; DB.ge.saldoBanco = {importe:3000, fecha:todayStr()}; saveDB(); bcYear = y; GE.bcPeriodo(y, null); await esp(400);
      // En móvil las secciones menos importantes van plegadas (7/11): se abren todas para medir también lo que cuelga de ellas.
      document.querySelectorAll('#ge-bc .gg-plegable:not(.gg-abierto) > .gg-acc-h').forEach(h => h.click()); await esp(300);
      const raiz = document.getElementById('ge-bc');
      return {desborde: document.documentElement.scrollWidth - innerWidth, fuera: [...raiz.querySelectorAll('*')].filter(e => { const q = e.getBoundingClientRect(); return q.width && (q.right > innerWidth + 1 || q.left < -1); }).map(e => e.className || e.tagName).slice(0, 4),
        alto: document.getElementById('bc-saldo-in').getBoundingClientRect().height, letra: Math.min(...[...raiz.querySelectorAll('*')].filter(e => e.children.length === 0 && e.textContent.trim() && e.getBoundingClientRect().width).map(e => parseFloat(getComputedStyle(e).fontSize)))};
    });
    assert.equal(r.desborde, 0, JSON.stringify(r)); assert.deepEqual(r.fuera, [], JSON.stringify(r)); assert.ok(r.alto >= 43.5, 'saldo ' + r.alto); assert.ok(r.letra >= 11, 'letra ' + r.letra); await page.close();
  });
}
await browser.close();
console.log(fallos ? `\n❌ ${fallos} caso(s) fallaron` : '\n✅ todos los casos pasaron'); process.exit(fallos ? 1 : 0);
