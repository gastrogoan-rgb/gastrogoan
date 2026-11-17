// Plan 360º · «Dinero sobre la mesa» (17/11): el diagnóstico con las cifras reales, en euros al año, frente a los
// objetivos que el propio negocio fijó en Tesorería. Cuentas hechas a mano.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
let ok = 0, mal = 0;
const caso = async (n, f) => { try{ await f(); console.log('✅ ' + n); ok++; }catch(e){ console.log('❌ ' + n + '\n     ⤷ ' + e.message); mal++; } };
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'], headless:true});
const page = await browser.newPage();
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(() => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'P360DIAG1', tenantId: ggBizTenantId('P360DIAG1')}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r => setTimeout(r, 2000));
const r = await page.evaluate(() => {
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  const hoy = new Date(), f = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const mes = `${f.getFullYear()}-${String(f.getMonth()+1).padStart(2,'0')}`;
  Object.assign(DB.business, {formaJuridica:'sociedad'});
  DB.ge.config.pctImpuestoBeneficio = 25;
  DB.ge.config.distPct = {per:30, gf:20, mp:30, og:10, ben:10};          // objetivos del negocio: food cost 30 %, personal 30 %
  DB.sales = []; DB.ge.variables = []; DB.ge.fijos = []; DB.ge.fijosLog = []; DB.mermas = []; DB.preciosHistorial = [];
  const out = {};
  out.sinVentas = plan360DiagnosticoDatos();                               // sin ventas del mes: nada
  const venta = i => ({id:'v'+i, date:`${mes}-${String(2+i).padStart(2,'0')}`, total: 1100, items:[{name:'Menú', price: 1100, qty:1, ivaPct:10}]});
  for(let i=0;i<10;i++) DB.sales.push(venta(i));                          // 10.000 € netos
  DB.ge.variables = [{id:1, mes:f.getMonth(), año:f.getFullYear(), fecha:`${mes}-05`, importe:3500, iva:10, proveedor:'X', categoria:'MATERIA PRIMA'}];   // food cost 35 %
  DB.mermas = [{id:'m1', fecha:`${mes}-06`, coste:200, motivo:'caducidad'}];
  DB.preciosHistorial = [{id:1, fecha:`${mes}-08`, nombre:'Aceite', proveedor:'Makro', antes:5, despues:6, pct:20}];
  out.d = plan360DiagnosticoDatos();
  out.html = plan360DiagnosticoHtml();
  window.__w = ''; window.open = () => ({document:{write(h){ window.__w += h; }, close(){}, images: []}, focus(){}, print(){}});
  plan360AbrirDiagnostico(); out.abierto = window.__w.includes('Dinero sobre la mesa') || window.__w.includes('Datos de');
  DB.ge.variables = [{id:1, mes:f.getMonth(), año:f.getFullYear(), fecha:`${mes}-05`, importe:2900, iva:10, proveedor:'X', categoria:'MATERIA PRIMA'}];   // 29 %: por debajo del objetivo
  DB.mermas = []; DB.preciosHistorial = [];
  out.bien = plan360DiagnosticoDatos();
  return out;
});
await caso('Sin ventas en el último mes completo no hay diagnóstico (no se inventa nada)', async () => assert.equal(r.sinVentas, null));
await caso('Food cost 35 % con objetivo 30 % sobre 10.000 € de ventas: 5 puntos = 6.000 € al año', async () => {
  const h = r.d.hallazgos.find(x => x.id === 'foodcost'); assert.ok(h, 'falta el hallazgo'); assert.equal(h.euros, 6000);
});
await caso('Las mermas del mes (200 €) se anualizan: 2.400 €', async () => assert.equal(r.d.hallazgos.find(x => x.id === 'mermas').euros, 2400));
await caso('La subida de un proveedor sale como hallazgo sin euros inventados', async () => {
  const h = r.d.hallazgos.find(x => x.id === 'subida'); assert.ok(h && h.euros === null);
});
await caso('Ordenado de más a menos dinero y con el total de lo medible (8.400 €)', async () => {
  assert.equal(r.d.hallazgos[0].id, 'foodcost'); assert.equal(r.d.total, 8400);
});
await caso('El documento muestra las cifras, la estimación y se abre en la ventana de impresión', async () => {
  assert.ok(/6[.]?000/.test(r.html) && /8[.]?400/.test(r.html), 'faltan cifras'); assert.ok(/estimación/i.test(r.html)); assert.ok(r.abierto);
});
await caso('Con el food cost por debajo de SU objetivo no se le dice nada de food cost', async () => assert.ok(!r.bien.hallazgos.some(x => x.id === 'foodcost')));
await browser.close();
console.log(mal ? '\n❌ ' + mal + ' caso(s) fallaron' : '\n✅ Plan 360 · dinero sobre la mesa: ' + ok + ' casos en orden');
process.exit(mal ? 1 : 0);
