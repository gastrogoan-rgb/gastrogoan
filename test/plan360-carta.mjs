// Plan 360º · ingeniería de carta (17/11): popularidad × margen, con cuentas hechas a mano.
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
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code:'P360CARTA1', tenantId: ggBizTenantId('P360CARTA1')}));
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
  DB.sales = [];
  // El coste lo da la línea (la prueba no monta recetas): costoUnitarioDeLinea es una función global.
  window.costoUnitarioDeLinea = l => l.coste;
  const L = (name, price, qty, coste) => ({name, price, qty, coste, recipeId:'r', ivaPct:10});   // precios con IVA 10 %: neto = precio / 1,1
  // Plato          u    precio coste  margen/u
  // Paella        40     20     8     12    popular, margen alto  → ESTRELLA
  // Hamburguesa   40     10     8      2    popular, margen bajo  → CABALLO
  // Solomillo      6     30     8     22    poco popular, alto    → PUZLE
  // Ensalada       4      9     8      1    poco popular, bajo    → PERRO
  const venta = (i, items) => ({id:'v'+i, date:`${mes}-${String(2+i).padStart(2,'0')}`, total: 0, items});
  DB.sales.push(venta(0, [L('Paella', 22, 40, 8), L('Hamburguesa', 11, 40, 8), L('Solomillo', 33, 6, 8), L('Ensalada', 9.9, 4, 8)]));
  const ic = plan360IngenieriaCarta(f.getFullYear(), f.getMonth());
  const pocas = (() => { DB.sales = [venta(1, [L('A', 10, 5, 3), L('B', 10, 5, 3)])]; return plan360IngenieriaCarta(f.getFullYear(), f.getMonth()); })();
  return {ic: ic && {est: ic.estrellas.map(p => p.nombre), cab: ic.caballos.map(p => p.nombre), puz: ic.puzles.map(p => p.nombre), per: ic.perros.map(p => p.nombre), medio: Math.round(ic.margenMedio * 100) / 100}, pocas, html: ic ? plan360CartaHtml(ic) : ''};
});
await caso('Cada plato cae en su cuadrante: paella estrella, hamburguesa caballo, solomillo puzle, ensalada perro', async () => {
  assert.deepEqual(r.ic.est, ['Paella']); assert.deepEqual(r.ic.cab, ['Hamburguesa']); assert.deepEqual(r.ic.puz, ['Solomillo']); assert.deepEqual(r.ic.per, ['Ensalada']);
});
await caso('El margen medio es el ponderado por unidades: (40·12 + 40·2 + 6·22 + 4·1) / 90 = 7,73 €', async () => assert.equal(r.ic.medio, 7.73));
await caso('Con menos de 4 platos con receta no hay carta que analizar (no se inventa)', async () => assert.equal(r.pocas, null));
await caso('El documento nombra cada grupo con su consejo', async () => {
  for(const t of ['Estrellas', 'Caballos de batalla', 'Puzles', 'Perros', 'Paella', 'Solomillo']) assert.ok(r.html.includes(t), 'falta ' + t);
});
const q = await page.evaluate(() => {
  DB.ge.config.distPct = {per:30, gf:20, mp:30, og:10, ben:10};
  const a = plan360Puntuaciones({foodCostPct:35, personalPct:28, mermasPct:2, nps:8.5, npsN:10});
  const b = plan360Puntuaciones({foodCostPct:null, personalPct:null, mermasPct:null, nps:9, npsN:1});
  return {a: Object.fromEntries(a.map(x => [x.id, x.puntos])), b: b.length, html: plan360PuntuacionesHtml({foodCostPct:35, personalPct:28, mermasPct:2, nps:8.5, npsN:10})};
});
await caso('Puntuaciones: food cost 35 % con objetivo 30 % = 50; personal por debajo del objetivo = 100; mermas 2 % = 60; nota 8,5 = 85', async () => {
  assert.equal(q.a.foodcost, 50); assert.equal(q.a.personal, 100); assert.equal(q.a.mermas, 60); assert.equal(q.a.nps, 85);
});
await caso('Lo que no se puede medir no sale (nunca un 0 por falta de datos; con una sola encuesta no hay nota)', async () => assert.equal(q.b, 0));
await caso('El documento dice contra qué se mide cada área', async () => assert.ok(/Cómo está cada área/.test(q.html) && /objetivos que fijaste/.test(q.html)));
await browser.close();
console.log(mal ? '\n❌ ' + mal + ' caso(s) fallaron' : '\n✅ Plan 360 · ingeniería de carta: ' + ok + ' casos en orden');
process.exit(mal ? 1 : 0);
