// Gestión Económica → Cuenta de Resultados (6/11): gráfica con el resultado de cada mes al pasar el ratón, explicaciones detrás de botones
// (nada de párrafos largos a la vista), ayuda de «Intereses de préstamos» con el caso real del negocio, y nada se desborda en 5 anchos.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox', '--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4']});
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
async function abrir(w, h, forma){
  const page = await browser.newPage();
  await page.setViewport({width:w, height:h, isMobile:w < 500, hasTouch:w < 1000});
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|nominatim|zippopotam/.test(r.url()) ? r.abort() : r.continue());
  await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
  await page.evaluate(() => {
    localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'ECORES01', tenantId: ggBizTenantId('ECORES01')}));
    localStorage.setItem('gastrogoan_owner_login', '1'); localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted', '1'); localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
  });
  await page.reload({waitUntil:'domcontentloaded'}); await new Promise(r => setTimeout(r, 2000));
  await page.evaluate(async forma => {
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id => document.getElementById(id)?.remove());
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true, cif:'B12345678', formaJuridica:forma, regimenFiscal:'directa'});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    const hoy = new Date(), y = hoy.getFullYear(), dd = n => String(n).padStart(2, '0');
    DB.sales = []; let k = 1;
    for(let m = 0; m <= hoy.getMonth(); m++) for(const d of [3, 10, 17]){ const f = `${y}-${dd(m + 1)}-${dd(d)}`; DB.sales.push({id:'s' + (k++), date:f, createdAt:f + 'T14:00:00', total:1100, tipo:'mesa', metodoPago:'Tarjeta', items:[{name:'P', qty:1, price:1100, ivaPct:10}]}); }
    DB.ge = DB.ge || {}; DB.ge.config = {...(DB.ge.config || {}), pctImpuestoBeneficio:25};
    DB.ge.fijos = [{id:1, nombre:'ALQUILER', importe:1200, periodicidadMeses:1, categoria:'FIJOS', iva:21}, {id:2, nombre:'SUELDOS', importe:1500, periodicidadMeses:1, categoria:'PERSONAL', iva:0}];
    DB.ge.variables = []; DB.ge.fijosLog = [];
    DB.ge.capex = [{id:9, descripcion:'HORNO MIXTO', importe:5000, iva:21, fecha:`${y}-01-01`, estadoPago:'PARCIAL', tipoAmort:'maquinaria', financiado:true, cuotaMensual:250, cuotas:30, importeFinanciado:6050}];
    snapshotGeFijosNeto(); saveDB();
    currentFolder = 'gestion'; ownerUnlocked = true; navigate('economia'); GE.tab('cdr'); await new Promise(r => setTimeout(r, 800));
  }, forma || 'sociedad');
  return {page, errs};
}
await caso('Gráfica: una curva con los 12 meses, el resultado del mes al pasar el ratón (globo + titular) y pestañas neto / antes de impuestos / ventas', async () => {
  const {page, errs} = await abrir(1280, 900);
  const mes = await page.evaluate(() => new Date().getMonth());
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms)); const out = {};
    out.puntos = document.querySelectorAll('#cdr-chart .dt-punto').length; out.barras = document.querySelectorAll('#cdr-chart .bar-col').length;
    out.curva = !!document.querySelector('#cdr-chart path.dt-linea');
    out.vals = window.dashSeriesPorId['cdr-serie'].map(p => p.value);
    out.esperadoMes0 = Math.round(GE.resultadoMes(0, new Date().getFullYear()) * 100) / 100;
    const p = document.querySelectorAll('#cdr-chart .dt-punto')[1]; p.dispatchEvent(new MouseEvent('mouseenter', {bubbles: true})); await esp(150);
    out.titular = document.getElementById('cdr-graf-titular').textContent.replace(/\s+/g, ' ');
    out.globo = p.getAttribute('data-v'); out.globoVisible = getComputedStyle(p, '::before').content;
    out.tabs = [...document.querySelectorAll('#cdr-graf-tabs .btn')].map(b => b.textContent.trim());
    document.querySelectorAll('#cdr-graf-tabs .btn')[2].click(); await esp(200);
    out.ventasMes0 = window.dashSeriesPorId['cdr-serie'][0].value; out.esperadoVentas = 3000;
    return out;
  });
  assert.equal(r.puntos, mes + 1, 'solo los meses que ya han llegado'); assert.equal(r.barras, 0, 'ya no hay barras'); assert.ok(r.curva);
  assert.equal(r.vals[0], r.esperadoMes0, 'el punto de enero es el resultado neto de enero'); assert.match(r.titular, /febrero/i); assert.ok(r.titular.includes('€'));
  assert.match(r.globo, /febrero.*€/i); assert.notEqual(r.globoVisible, 'none'); assert.equal(r.tabs.length, 3); assert.equal(r.ventasMes0, r.esperadoVentas);
  assert.deepEqual(errs, []); await page.close();
});
await caso('Nada de párrafos largos a la vista: las explicaciones están detrás de «¿Cómo se calcula?» y de la ayuda de cada fila', async () => {
  const {page} = await abrir(1280, 900);
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms));
    const panel = document.getElementById('ge-cdr'); const out = {largos: [...panel.querySelectorAll('p')].filter(p => p.offsetParent && p.textContent.length > 160).length,
      viejas: /Como autónomo tu impuesto|PROVISIÓN para saber|El "Resultado Neto" ya descuenta/.test(panel.innerText)};
    document.getElementById('cdr-como').click(); await esp(250);
    out.modal = document.getElementById('modal-box').innerText; closeModal(); await esp(200);
    const ayudas = [...document.querySelectorAll('#cdr-table .cdr-ayuda')]; out.nAyudas = ayudas.length;
    ayudas[0].click(); await esp(250); out.ayuda1 = document.getElementById('modal-box').innerText; closeModal(); await esp(150);
    return out;
  });
  assert.equal(r.largos, 0, 'quedan párrafos largos a la vista'); assert.equal(r.viejas, false);
  assert.match(r.modal, /de lo que cobras a lo que te llevas/i); assert.match(r.modal, /Sociedad/); assert.match(r.modal, /provisión/i); assert.match(r.modal, /303/); assert.ok(r.nAyudas >= 6, 'ayuda en EBITDA, intereses, antes de impuestos, impuesto, neto, IVA, IRPF'); assert.ok(r.ayuda1.length > 200); await page.close();
});
await caso('Intereses de préstamos: la ayuda explica el concepto y usa el HORNO del negocio con su cuota partida en intereses y devolución', async () => {
  const {page} = await abrir(1280, 900);
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms)); const hoy = new Date();
    const fila = [...document.querySelectorAll('#cdr-table tbody tr')].find(tr => /Intereses de préstamos/.test(tr.textContent));
    fila.querySelector('.cdr-ayuda').click(); await esp(250); const txt = document.getElementById('modal-box').innerText; closeModal();
    const d = capexCuotaDesglose(DB.ge.capex[0], hoy.getFullYear(), hoy.getMonth());
    return {txt, interes: fmtMoney(d.interes), principal: fmtMoney(d.principal), filaTxt: fila.textContent};
  });
  assert.match(r.txt, /devolver el dinero prestado/); assert.match(r.txt, /HORNO MIXTO/); assert.ok(r.txt.includes(r.interes) && r.txt.includes(r.principal), 'cuota partida: ' + r.interes + ' / ' + r.principal + ' en ' + r.txt.slice(0, 600));
  assert.match(r.txt, /gasto fijo/); assert.match(r.txt, /Tesorería/); await page.close();
});
await caso('Cada forma jurídica ve SU explicación (autónomo, módulos, CB, sociedad, cooperativa) y sin forma avisa en rojo', async () => {
  const {page} = await abrir(1280, 900);
  const r = await page.evaluate(async () => {
    const esp = ms => new Promise(r => setTimeout(r, ms)); const out = {};
    const texto = async () => { document.getElementById('cdr-como').click(); await esp(200); const t = document.getElementById('modal-box').innerText; closeModal(); await esp(150); return t; };
    for(const [forma, reg] of [['autonomo', 'directa'], ['autonomo', 'modulos'], ['cb', 'directa'], ['sociedad', 'directa'], ['cooperativa', 'directa']]){
      DB.business.formaJuridica = forma; DB.business.regimenFiscal = reg; GE.tab('cdr'); await esp(250); out[forma + '/' + reg] = await texto();
    }
    DB.business.formaJuridica = ''; GE.tab('cdr'); await esp(250); out.sin = await texto(); out.avisoSin = document.getElementById('res-pct-impuesto-nota').textContent;
    return out;
  });
  assert.match(r['autonomo/directa'], /estimación directa/i); assert.match(r['autonomo/directa'], /19 % al 47 %/); assert.match(r['autonomo/modulos'], /módulos/i); assert.match(r['cb/directa'], /Comunidad de bienes/);
  assert.match(r['sociedad/directa'], /Impuesto sobre Sociedades/); assert.match(r['cooperativa/directa'], /Ley 20\/1990/); assert.match(r.sin, /Todavía no se ha indicado la forma jurídica/); assert.match(r.avisoSin, /forma jurídica/i); await page.close();
});
for(const ancho of [320, 360, 390, 412, 430]){
  await caso(`Móvil ${ancho}: Cuenta de Resultados sin desborde, chips de 44 px, gráfica y modal dentro de la pantalla`, async () => {
    const {page} = await abrir(ancho, 800);
    const r = await page.evaluate(async () => {
      const esp = ms => new Promise(r => setTimeout(r, ms)); const raiz = document.getElementById('ge-cdr');
      const out = {desborde: document.documentElement.scrollWidth - innerWidth};
      out.fuera = [...raiz.querySelectorAll('.cdr-barra *, .cdr-chips *, .cdr-graf *, #cdr-comparison *')].filter(e => { const q = e.getBoundingClientRect(); return q.width && (q.right > innerWidth + 1 || q.left < -1); }).map(e => e.className || e.tagName).slice(0, 5);
      out.chicos = [...raiz.querySelectorAll('.cdr-chips .month-pill, #cdr-como, .cdr-gran .btn')].filter(b => b.getBoundingClientRect().height < 35.5).length;
      document.getElementById('cdr-como').click(); await esp(250); const mb = document.getElementById('modal-box').getBoundingClientRect(); out.modal = mb.right <= innerWidth + 1 && mb.left >= -1; closeModal();
      return out;
    });
    assert.equal(r.desborde, 0, JSON.stringify(r)); assert.deepEqual(r.fuera, [], JSON.stringify(r)); assert.equal(r.chicos, 0, JSON.stringify(r)); assert.ok(r.modal); await page.close();
  });
}
await browser.close();
console.log(fallos ? `\n❌ ${fallos} caso(s) fallaron` : '\n✅ todos los casos pasaron'); process.exit(fallos ? 1 : 0);
