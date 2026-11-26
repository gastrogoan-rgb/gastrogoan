// COBRAR CON 20.000 VENTAS (26/11): el dueño contaba que la app «se cuelga unos segundos» entre pulsar Cobrar y el ticket.
// Medido con CPU x4 (un móvil flojo): cada cobro convertía a texto, copiaba y SUBÍA las 20.000 ventas (12,7 MB) y los demás aparatos
// las recibían enteras. Con las ventas una a una (js/ventas-nube.js) solo viaja la venta nueva. Esta prueba FALLA si vuelve el
// comportamiento antiguo en un negocio con la bandera encendida, y deja medido el antiguo como referencia.
// Nube falsa (sin emulador): cuenta los bytes de cada subida. Las pruebas con Firebase de verdad están en test/emulador/ventas-nube.mjs.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const N = 20000, K = 4;
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
let fallos = 0, casos = 0;
async function caso(n, fn){ casos++; try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }

async function medir(ON){
  const page = await browser.newPage(); await page.setViewport({width:1280, height:800});
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|raw.githubusercontent/.test(r.url()) ? r.abort() : r.continue());
  await page.goto('http://localhost:8950/index.html', {waitUntil:'domcontentloaded'}); await new Promise(r => setTimeout(r, 2500));
  const datos = await page.evaluate(async () => (await fetch('/dist/ggburger.json')).json());
  await page.evaluate(async (d, N) => {
    localStorage.clear();
    localStorage.setItem('gastrogoan_owner_login', '1'); localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
    localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
    localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0, 10));
    localStorage.setItem('gastrogoan_license_v1', JSON.stringify(d.license));
    const base = d.sales, out = [];
    for(let i = 0; out.length < N; i++){ const s = JSON.parse(JSON.stringify(base[i % base.length])); s.id = 'v-' + i + '_' + (i % base.length); const dd = new Date(Date.now() - (N - out.length) * 260e3); s.date = dd.toISOString().slice(0, 10); s.createdAt = dd.toISOString(); s.ticketNum = 'T26K4P-' + String(i + 1).padStart(6, '0'); out.push(s); }
    d.sales = out;
    Object.assign(d.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
    d.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    await idbSet('gastrogoan_data_v1', d);
  }, datos, N);
  await page.goto('about:blank'); await page.goto('http://localhost:8950/index.html', {waitUntil:'domcontentloaded'}); await new Promise(r => setTimeout(r, 4500));
  const cdp = await page.createCDPSession();
  await page.evaluate(async ON => {
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate','app-splash','access-select-screen'].forEach(id => document.getElementById(id)?.remove());
    window.__subidas = [];
    lastSyncedSnapshot = {}; Object.keys(DB).forEach(k => { if(!(ON && k === 'sales')) lastSyncedSnapshot[k] = canonicalStringify(DB[k]); });
    socketConnected = true;
    cloudRef = {update: u => { window.__subidas.push({bytes: JSON.stringify(u).length, claves: Object.keys(u)}); return new Promise(r => setTimeout(r, 50)); }, set: () => Promise.resolve()};
    if(ON){
      DB.business.ventasPorMes = true;
      vnRef = {update: u => { window.__subidas.push({bytes: JSON.stringify(u).length, claves: ['ventas'], n: Object.keys(u).length}); return new Promise(r => setTimeout(r, 50)); }};
      vnListo = true; DB.sales.forEach(s => vnNube.set(String(s.id), vnCanon(s)));
    }
    DB.tables = [{id:1, name:'Mesa 1', zona:'Salón', plazas:4}];
    DB.tpvOrders = [{id:777001, tableId:1, tipo:'mesa', status:'abierta', createdAt:new Date().toISOString(), tandas:[], pax:2, items:[{lineId:'L1', platoId:1, name:'Solomillo', qty:2, price:22, ivaPct:10, tanda:'', notas:'', recipeId:1014}]}];
    await saveDB();
  }, ON);
  await cdp.send('Emulation.setCPUThrottlingRate', {rate:K});
  await new Promise(r => setTimeout(r, 2500));
  await page.evaluate(() => { window.__subidas.length = 0; window.__lt = []; try{ new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push(Math.round(e.duration)))).observe({entryTypes:['longtask']}); }catch(e){} });
  const m = await page.evaluate(async () => {
    const T = {}; const o = window.flushCloudSync; window.flushCloudSync = function(){ const t0 = performance.now(); try{ return o.apply(this, arguments); }finally{ T.flush = Math.round(performance.now() - t0); } };
    openPaymentModal(777001); await new Promise(r => setTimeout(r, 300));
    const t0 = performance.now(); finalizeCharge(777001); const sync = performance.now() - t0;
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const pintado = performance.now() - t0;
    await new Promise(r => setTimeout(r, 3000));
    return {sync: Math.round(sync), pintado: Math.round(pintado), flush: T.flush, subidas: window.__subidas, longtasks: window.__lt, ventas: DB.sales.length, cobrada: DB.sales.some(s => s.id === 777001)};
  });
  let recibir = null;
  if(ON){   // otro aparato cobra: llega UNA venta por la nube
    recibir = await page.evaluate(async () => {
      const nueva = JSON.parse(JSON.stringify(DB.sales[DB.sales.length - 2])); nueva.id = 'otro-aparato-1'; nueva.ticketNum = 'T26ZZZZ-000001';
      const t0 = performance.now(); vnEntrantes.set('otro-aparato-1', nueva); await vnProcesar(); const ms = performance.now() - t0;
      return {ms: Math.round(ms), esta: DB.sales.some(s => s.id === 'otro-aparato-1'), total: DB.sales.length};
    });
  }
  await page.close();
  return {m, recibir};
}

const off = await medir(false);
const on = await medir(true);
const kb = a => Math.round(a / 1024);
const bytes = r => r.m.subidas.reduce((s, x) => s + x.bytes, 0);
console.log(`   ℹ️  CPU x${K}, ${N} ventas. ANTES (bloque entero): subida ${kb(bytes(off))} KB, flush ${off.m.flush} ms, pantalla del ticket ${off.m.pintado} ms`);
console.log(`   ℹ️  CPU x${K}, ${N} ventas. AHORA (una a una):     subida ${kb(bytes(on))} KB, flush ${on.m.flush} ms, pantalla del ticket ${on.m.pintado} ms, recibir una venta de otro aparato ${on.recibir.ms} ms`);

await caso('Referencia: con la bandera apagada, un cobro sube todo el historial (más de 5 MB)', async () => {
  assert.ok(bytes(off) > 5e6, 'subió ' + bytes(off) + ' B');
  assert.ok(off.m.subidas.some(s => s.claves.includes('sales')));
});
await caso('Con las ventas una a una un cobro sube MENOS de 20 KB (solo la venta nueva y lo que cambió de verdad)', async () => {
  assert.ok(bytes(on) < 20000, 'subió ' + bytes(on) + ' B');
  assert.ok(!on.m.subidas.some(s => s.claves.includes && s.claves.includes('sales')), 'no puede subir el bloque `sales`');
  const v = on.m.subidas.find(s => s.claves[0] === 'ventas'); assert.ok(v && v.n === 1, 'tiene que subir exactamente UNA venta: ' + JSON.stringify(v));
});
await caso('La venta cobrada existe, una sola vez, y el resto de ventas siguen ahí', async () => {
  assert.equal(on.m.ventas, N + 1); assert.ok(on.m.cobrada);
});
await caso(`La subida tras cobrar tarda menos de 400 ms con CPU x${K} (antes ${off.m.flush} ms)`, async () => {
  assert.ok(on.m.flush < 400, 'flush ' + on.m.flush + ' ms');
});
await caso('Pulsar «Cobrar» hasta tener el ticket pintado: menos de 300 ms con CPU x4', async () => {
  assert.ok(on.m.pintado < 300, 'pintado ' + on.m.pintado + ' ms');
});
await caso('Nada de la subida bloquea la pantalla más de 600 ms seguidos (CPU x4)', async () => {
  assert.ok(Math.max(0, ...on.m.longtasks) < 600, JSON.stringify(on.m.longtasks));
});
await caso('Recibir una venta de otro aparato con 20.000 ventas: menos de 250 ms y entra una sola vez', async () => {
  assert.ok(on.recibir.ms < 250, on.recibir.ms + ' ms'); assert.ok(on.recibir.esta); assert.equal(on.recibir.total, N + 2);
});
await browser.close();
console.log('\n' + (fallos ? `❌ ${fallos} de ${casos} fallaron` : `✅ los ${casos} casos pasaron`));
process.exit(fallos ? 1 : 0);
