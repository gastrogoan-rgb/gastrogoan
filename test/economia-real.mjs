// CUENTA DE RESULTADOS › «Lo que te queda de verdad» (12/11, pedido del dueño): el resultado oficial NO cambia; debajo, una línea aparte que suma lo que
// no es gasto pero quita dinero (las cuotas que devuelven el préstamo, las inversiones pagadas al contado) y quita lo que es gasto pero no quita dinero
// (el desgaste). Cuentas hechas a mano: préstamo de 10.000 € a 24 cuotas de 450 € (cuadro francés → interés del mes 1 = 62,51 €, o sea devolución 387,49 €).
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const w = ms => new Promise(r => setTimeout(r, ms));
const num = t => { const m = /([+−-])?\s*([\d.]+,\d{2})/.exec(t.replace(/\s+/g, ' ')); if(!m) return null; const v = parseFloat(m[2].replace(/\./g, '').replace(',', '.')); return m[1] === '−' || m[1] === '-' ? -v : v; };
async function abrir(ancho = 1280, extra = true){
  const page = await browser.newPage(); await page.setViewport({width: ancho, height: 900, isMobile: ancho < 500, hasTouch: ancho < 1000});
  page.errs = []; page.on('pageerror', e => page.errs.push(e.message));
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
  await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
  await page.evaluate(() => {
    localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'ECOREAL1', tenantId: ggBizTenantId('ECOREAL1')}));
    localStorage.setItem('gastrogoan_owner_login', '1'); localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted', '1'); localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
  });
  await page.reload({waitUntil:'domcontentloaded'}); await w(2000);
  await page.evaluate(async extra => {
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id => document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, cif:'B12345678', formaJuridica:'sociedad', regimenFiscal:'directa'});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    const y = new Date().getFullYear();
    DB.sales = [{id:'s1', date:`${y}-01-10`, createdAt:`${y}-01-10T14:00:00`, total:1100, subtotal:1100, tipo:'mesa', items:[{name:'Menú', price:1100, qty:1, ivaPct:10}], pagos:[{metodoPago:'Efectivo', amount:1100}]}];
    DB.ge = DB.ge || {}; DB.ge.config = {...(DB.ge.config || {}), pctImpuestoBeneficio:25};
    DB.ge.fijos = []; DB.ge.variables = []; DB.ge.fijosLog = [];
    DB.ge.capex = extra ? [
      {id:1, descripcion:'HORNO', importe:10000, iva:0, fecha:`${y}-01-01`, estadoPago:'PAGADO', tipoAmort:'maquinaria', financiado:true, cuotaMensual:450, cuotas:24, importeFinanciado:10000},
      {id:2, descripcion:'MESA GRANDE', importe:2000, iva:0, fecha:`${y}-01-10`, estadoPago:'PAGADO', tipoAmort:'mobiliario', financiado:false}
    ] : [];
    snapshotGeFijosNeto(); saveDB();
    currentFolder = 'gestion'; ownerUnlocked = true; navigate('economia'); GE.tab('cdr');
    GE.setCDRGranularidad('mes'); GE.setCDRPeriodo(0);
    await new Promise(r => setTimeout(r, 900));
  }, extra);
  return page;
}
const filas = p => p.evaluate(() => [...document.querySelectorAll('#cdr-real .bc-lin')].map(f => ({txt: f.querySelector('span').childNodes[0].textContent.trim(), val: f.querySelector('b').textContent.trim(), total: f.classList.contains('is-total')})));

const p = await abrir();
await caso('Aparece «Lo que te queda de verdad» debajo de la tabla, con el periodo, y el resultado oficial no se toca', async () => {
  const cab = await p.evaluate(() => document.querySelector('#cdr-real h4') && document.querySelector('#cdr-real h4').innerText);
  assert.match(cab, /lo que te queda de verdad/i); assert.match(cab, /ene/i);   // el título sale en mayúsculas por estilo
  const orden = await p.evaluate(() => { const t = document.getElementById('cdr-table').getBoundingClientRect(), r = document.getElementById('cdr-real').getBoundingClientRect(); return r.top >= t.bottom - 1; });
  assert.equal(orden, true, 'no está debajo de la tabla');
});
await caso('Las cuentas cuadran a mano: resultado + desgaste − devolución del préstamo (387,49) − inversión al contado (2.000) = lo que te queda', async () => {
  const f = await filas(p);
  const por = n => f.find(x => x.txt.startsWith(n));
  const base = num(por('Resultado del periodo').val), des = por('Desgaste') ? num(por('Desgaste').val) : 0, dev = num(por('Cuotas del préstamo').val), con = num(por('Inversiones pagadas al contado').val), total = num(f.find(x => x.total).val);
  assert.equal(dev, -387.49, 'devolución: ' + dev); assert.equal(con, -2000, 'contado: ' + con);
  const esperado = Math.round((base + des + dev + con) * 100) / 100;
  assert.equal(total, esperado, `total ${total} ≠ ${base} + ${des} − 387,49 − 2000 = ${esperado}`);
  assert.ok(des > 0, 'el desgaste debe SUMARSE (es gasto arriba pero no sale dinero): ' + des);
});
await caso('Coincide con «Beneficio y caja» (misma fuente): el desgaste y la devolución de préstamos son los mismos números', async () => {
  const r = await p.evaluate(() => { const d = GE.bcMesDatosPublico ? GE.bcMesDatosPublico(0, new Date().getFullYear()) : null; return d ? {amort: d.amort, principal: d.principal} : null; });
  if(r){ const f = await filas(p); assert.equal(Math.round(num(f.find(x => x.txt.startsWith('Desgaste')).val) * 100) / 100, Math.round(r.amort * 100) / 100); }
});
await caso('Cada línea lleva su explicación corta y hay un enlace a «Beneficio y caja» que funciona', async () => {
  const r = await p.evaluate(() => ({ayudas: document.querySelectorAll('#cdr-real .bc-lin small').length, enlace: !!document.querySelector('#cdr-real a')}));
  assert.ok(r.ayudas >= 3, 'faltan explicaciones: ' + r.ayudas); assert.equal(r.enlace, true);
  assert.equal(await p.evaluate(() => [...document.querySelectorAll('#cdr-real p')].filter(x => x.offsetParent && x.textContent.length > 120).length), 0, 'quedan párrafos largos a la vista (van detrás de «¿Cómo se calcula?»)');
  await p.evaluate(() => { document.querySelector('#cdr-real .cdr-real-bt').click(); document.querySelector('#cdr-real a').click(); }); await w(500);
  assert.equal(await p.evaluate(() => document.getElementById('ge-bc').classList.contains('active')), true, 'el enlace no lleva a Beneficio y caja');
});
await caso('Sin errores de página', async () => { assert.deepEqual(p.errs, []); });
await p.close();

const q = await abrir(1280, false);
await caso('Sin inversiones ni préstamos: solo el resultado y el total (no se inventan líneas) y el total es el resultado', async () => {
  const f = await filas(q); assert.deepEqual(f.map(x => x.txt), ['Resultado del periodo', 'Lo que te queda de verdad'], JSON.stringify(f));
  assert.equal(num(f[0].val), num(f[1].val));
});
await q.close();

const m = await abrir(360);
await caso('En móvil (360 px) no se desborda ni se parte ninguna palabra', async () => {
  const r = await m.evaluate(() => { const b = document.getElementById('cdr-real').getBoundingClientRect(); return {der: b.right, ancho: innerWidth, scrollX: document.documentElement.scrollWidth > innerWidth, fuera: [...document.querySelectorAll('#cdr-real *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).length}; });
  assert.ok(r.der <= r.ancho + 1 && !r.scrollX && r.fuera === 0, JSON.stringify(r));
});
await m.close();
await browser.close();
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ todos los casos pasaron');
process.exit(fallos ? 1 : 0);
