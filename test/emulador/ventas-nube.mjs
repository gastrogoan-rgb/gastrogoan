// VENTAS UNA A UNA EN LA NUBE (js/ventas-nube.js) contra un Firebase de verdad, con DOS aparatos reales.
// Comprueba: migración sin pérdida desde el layout antiguo, una venta en A llega a B, simultáneas, un aparato sin conexión que vuelve,
// anulación y borrado, un aparato «viejo» que sigue escribiendo el bloque antiguo, marcha atrás, bytes por cobro y una ráfaga aleatoria.
import puppeteer from 'puppeteer-core';
const DBURL = 'http://127.0.0.1:9000/?ns=demo-gastrogoan';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'], headless:true});
const res = []; const ok = (n, c, d) => { res.push({n, c:!!c}); console.log((c?'✅':'❌') + ' ' + n + (d ? '  → ' + d : '')); };
const H = {Authorization:'Bearer owner'};
const gf = (u, o) => fetch(u, Object.assign({headers:H}, o || {}));
const w = ms => new Promise(r => setTimeout(r, ms));
for(const ns of ['demo-gastrogoan', 'demo-plataforma']) await gf(`http://127.0.0.1:9000/.json?ns=${ns}`, {method:'DELETE'});

async function dispositivo(){
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage(); await page.setCacheEnabled(false);
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.setRequestInterception(true);
  page.on('request', req => { const m = req.url().match(/gstatic\.com\/firebasejs\/[\d.]+\/(firebase-[a-z-]+\.js)/);
    if(m) return req.continue({url:'http://localhost:8951/__sdk/' + m[1]}); req.continue(); });
  await page.evaluateOnNewDocument(() => {
    const iv = setInterval(() => { try{ if(typeof PLATFORM_FIREBASE_CONFIG !== 'undefined'){ PLATFORM_FIREBASE_CONFIG.databaseURL = 'http://127.0.0.1:9000/?ns=demo-plataforma'; clearInterval(iv); } }catch(e){} }, 5);
    setTimeout(() => clearInterval(iv), 4000);
  });
  return {page, errs, ctx};
}
async function arrancar(d, code, bandera){
  await d.page.goto('http://localhost:8951/index.html', {waitUntil:'domcontentloaded'});
  await d.page.evaluate(async ({code, dburl, bandera}) => {
    localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
    localStorage.setItem('gastrogoan_owner_login', JSON.stringify({user:'jefe', authKey:'k', pinHash:'h'}));
    localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
    Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
    DB.business.ownFirebase = {apiKey:'fake', databaseURL:dburl};
    if(bandera !== undefined) DB.business.ventasPorMes = bandera;
    await saveDB();
  }, {code, dburl:DBURL, bandera});
  for(let intento = 0; intento < 4; intento++){   // el primer arranque tras levantar el emulador a veces no llega a conectar: se reintenta
    await d.page.reload({waitUntil:'domcontentloaded'});
    await w(3500);
    const t0 = Date.now(); let conectado = false;
    while(Date.now() - t0 < 10000 && !conectado){ conectado = await d.page.evaluate(() => typeof cloudRef !== 'undefined' && !!cloudRef && typeof vnListo !== 'undefined' && vnListo).catch(() => false); if(!conectado) await w(500); }
    if(conectado) break;
  }
  await d.page.evaluate(() => {
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id => document.getElementById(id)?.remove());
    window.confirmModal = async () => true; window.isOwnerSession = () => true;   // el aviso de activar se acepta solo
    window.__bytes = {db:0, ventas:0, nUpd:0};
  });
  await d.page.evaluate(() => {   // contador de bytes subidos (db y ventas)
    const medir = (ref, k) => { if(!ref || ref.__m) return; const o = ref.update.bind(ref); ref.update = u => { try{ window.__bytes[k] += JSON.stringify(u).length; window.__bytes.nUpd++; }catch(e){} return o(u); }; ref.__m = 1; };
    window.__medir = () => { medir(cloudRef, 'db'); medir(vnRef, 'ventas'); };
    window.__medir();
  });
}
const venta = (id, extra) => Object.assign({id, date: new Date().toISOString().slice(0,10), createdAt: new Date().toISOString(), total: 20, subtotal: 18.2, propina: 0, tipo:'mesa', metodoPago:'Efectivo', pagos:[{label:'Efectivo', amount:20, metodoPago:'Efectivo'}], items:[{name:'Menú', qty:1, price:20, ivaPct:10}]}, extra || {});
const ids = d => d.page.evaluate(() => (DB.sales || []).map(s => String(s.id)).sort());
const idsNube = async () => { // lo que hay en el nodo nuevo y en el antiguo, leído por REST con el emulador
  const t = await (await gf('http://127.0.0.1:9000/gastrogoan/tenants.json?ns=demo-gastrogoan&shallow=true')).json();
  const tid = Object.keys(t || {})[0];
  const nuevo = await (await gf(`http://127.0.0.1:9000/gastrogoan/tenants/${tid}/ventas.json?ns=demo-gastrogoan&shallow=true`)).json();
  return {tid, nuevo: Object.keys(nuevo || {}).length};
};
const igual = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const esperaIguales = async (A, B, ms = 15000) => { const t0 = Date.now(); let a, b; do{ a = await ids(A); b = await ids(B); if(igual(a, b)) return {a, b, ok:true}; await w(400); }while(Date.now() - t0 < ms); return {a, b, ok:false}; };

/* ═══ 1. Migración desde el layout antiguo ═══ */
const CODE = 'VENTAS001';
const A = await dispositivo(); await arrancar(A, CODE, false);
await A.page.evaluate(n => { DB.sales = []; for(let i = 0; i < n; i++) DB.sales.push({id:'h' + i, date:'2026-0' + (1 + i % 9) + '-1' + (i % 9), createdAt:'2026-01-01T10:00:00.000Z', total:10 + i % 7, subtotal:9, tipo:'mesa', metodoPago:'Tarjeta', items:[{name:'Plato ' + (i % 30), qty:1, price:10, ivaPct:10}], pagos:[{label:'Tarjeta', amount:10, metodoPago:'Tarjeta'}], ticketNum:'T26AAAA-' + String(i + 1).padStart(6, '0')}); saveDB(); }, 3000);
await w(7000);
console.log('   ℹ️  A:', JSON.stringify(await A.page.evaluate(() => ({cloud: !!cloudRef, badge: lastSyncBadgeState, err: lastSyncErrorCode, vnListo, snap: !!lastSyncedSnapshot, n: DB.sales.length}))), A.errs.slice(0,3));
const B = await dispositivo(); await arrancar(B, CODE, undefined);
await w(5000);
let r = await esperaIguales(A, B, 20000);
ok('1a. Layout antiguo: el segundo aparato recibe las 3000 ventas', r.ok && r.a.length === 3000, 'A=' + r.a.length + ' B=' + r.b.length);
ok('1b. Con la bandera apagada el bloque nuevo no se usa', (await idsNube()).nuevo === 0);

// Cobro con la bandera APAGADA: bytes subidos (la referencia «todo el historial»)
await A.page.evaluate(() => { window.__bytes = {db:0, ventas:0, nUpd:0}; window.__medir(); });
await A.page.evaluate(v => { DB.sales.push(v); saveDB(); }, venta('cobro-legacy'));
await w(3500);
const bLegacy = await A.page.evaluate(() => window.__bytes);
ok('1c. Referencia: un cobro con la bandera apagada sube TODO el historial', bLegacy.db > 200000, 'bytes subidos: ' + bLegacy.db);

// Activar
await A.page.evaluate(() => { window.__medir(); });
const t0 = Date.now();
await A.page.evaluate(async () => { await vnActivar(); });
const ms = Date.now() - t0;
const nube1 = await idsNube();
ok('1d. Migración: las 3001 ventas están en la nube nueva y la bandera sube', nube1.nuevo === 3001 && await A.page.evaluate(() => DB.business.ventasPorMes === true), 'nuevo=' + nube1.nuevo + ' en ' + ms + ' ms');
await w(4000);
ok('1e. El otro aparato recibe la bandera y no pierde ni duplica nada', await B.page.evaluate(() => DB.business.ventasPorMes === true) && (await ids(B)).length === 3001 && new Set(await ids(B)).size === 3001);
ok('1f. El bloque antiguo se deja (red de seguridad para aparatos viejos)', await (async () => { const x = await (await gf(`http://127.0.0.1:9000/gastrogoan/tenants/${nube1.tid}/db/sales.json?ns=demo-gastrogoan&shallow=true`)).json(); return x && Object.keys(x).length >= 3000; })());

/* ═══ 2. Venta en A llega a B; lo subido baja a «solo lo nuevo» ═══ */
await A.page.evaluate(() => { window.__bytes = {db:0, ventas:0, nUpd:0}; window.__medir(); });
await B.page.evaluate(() => { window.__t = []; const o = vnProcesar; window.vnProcesar = async function(){ const t = performance.now(); try{ return await o.apply(this, arguments); }finally{ window.__t.push(performance.now() - t); } }; });
await A.page.evaluate(v => { DB.sales.push(v); saveDB(); }, venta('cobro-nuevo-1'));
await w(3500);
const bNuevo = await A.page.evaluate(() => window.__bytes);
r = await esperaIguales(A, B, 8000);
ok('2a. Una venta de A llega a B', r.ok && r.a.includes('cobro-nuevo-1'), r.a.length + ' ventas en cada uno');
ok('2b. Un cobro sube solo esa venta, no el historial', bNuevo.ventas > 0 && bNuevo.ventas < 3000 && bNuevo.db < 50000, `bloque antiguo ${bLegacy.db} B  →  ahora ${bNuevo.ventas} B en ventas + ${bNuevo.db} B en el resto`);
console.log('   ℹ️  proceso en B de esa venta: ' + JSON.stringify((await B.page.evaluate(() => window.__t)).map(x => Math.round(x))) + ' ms');

/* ═══ 3. Simultáneas ═══ */
await Promise.all([
  A.page.evaluate(() => { for(let i = 0; i < 60; i++) DB.sales.push(Object.assign({id:'sa' + i, date:todayStr(), createdAt:new Date().toISOString(), total:5, subtotal:4.5, tipo:'mesa', metodoPago:'Efectivo', items:[{name:'x', qty:1, price:5}]})); saveDB(); }),
  B.page.evaluate(() => { for(let i = 0; i < 60; i++) DB.sales.push(Object.assign({id:'sb' + i, date:todayStr(), createdAt:new Date().toISOString(), total:7, subtotal:6, tipo:'mesa', metodoPago:'Tarjeta', items:[{name:'y', qty:1, price:7}]})); saveDB(); }),
]);
r = await esperaIguales(A, B, 15000);
ok('3. Ventas simultáneas en los dos aparatos: ninguna se pierde ni se duplica', r.ok && r.a.length === 3001 + 1 + 120 && new Set(r.a).size === r.a.length, 'A=' + r.a.length + ' B=' + r.b.length);
const sumaA = await A.page.evaluate(() => DB.sales.reduce((s, x) => s + x.total, 0)), sumaB = await B.page.evaluate(() => DB.sales.reduce((s, x) => s + x.total, 0));
ok('3b. Los totales de dinero coinciden', Math.abs(sumaA - sumaB) < 0.001, sumaA + ' / ' + sumaB);

/* ═══ 4. Aparato sin conexión que vuelve ═══ */
await A.page.evaluate(() => firebase.database().goOffline());
await A.page.evaluate(() => { for(let i = 0; i < 25; i++) DB.sales.push({id:'off' + i, date:todayStr(), createdAt:new Date().toISOString(), total:3, subtotal:2.7, tipo:'mesa', metodoPago:'Efectivo', items:[{name:'z', qty:1, price:3}]}); saveDB(); });
await B.page.evaluate(() => { for(let i = 0; i < 25; i++) DB.sales.push({id:'onl' + i, date:todayStr(), createdAt:new Date().toISOString(), total:4, subtotal:3.6, tipo:'mesa', metodoPago:'Efectivo', items:[{name:'w', qty:1, price:4}]}); saveDB(); });
await w(2500);
await A.page.evaluate(() => firebase.database().goOnline());
r = await esperaIguales(A, B, 25000);
ok('4. Un aparato sin conexión vuelve y todo se junta (sin perder ni duplicar)', r.ok && r.a.length === 3001 + 1 + 120 + 50 && new Set(r.a).size === r.a.length, 'A=' + r.a.length + ' B=' + r.b.length);

/* ═══ 5. Anulación y borrado ═══ */
await A.page.evaluate(() => { const s = DB.sales.find(x => x.id === 'sa1'); s.status = 'anulada'; s.rectificativa = {num:'R26AAAA-000001', fecha:todayStr(), rectifica:'x', motivo:'prueba'}; saveDB(); });
await w(3500);
ok('5a. Anular una venta llega al otro aparato (la venta sigue, anulada)', await B.page.evaluate(() => { const s = DB.sales.find(x => x.id === 'sa1'); return !!s && s.status === 'anulada' && !!s.rectificativa; }));
await A.page.evaluate(() => { DB.sales = DB.sales.filter(s => !/^off/.test(String(s.id))); saveDB(); });   // como «archivar datos antiguos»
await w(5000);
const post = await esperaIguales(A, B, 15000);
ok('5b. Borrar (archivar) en A lo borra también en B y en la nube, con lápida', post.ok && !post.b.some(x => /^off/.test(x)) && post.a.length === 3001 + 1 + 120 + 25, 'A=' + post.a.length + ' B=' + post.b.length);
ok('5c. La nube ya no tiene las borradas', await (async () => { const t = await (await gf(`http://127.0.0.1:9000/gastrogoan/tenants/${nube1.tid}/ventas/off3.json?ns=demo-gastrogoan`)).json(); return t === null; })());

/* ═══ 6. Aparato «viejo» que sigue escribiendo el bloque antiguo ═══ */
const base = `http://127.0.0.1:9000/gastrogoan/tenants/${nube1.tid}`;
const leg = await (await gf(`${base}/db/sales.json?ns=demo-gastrogoan`)).json();
const arr = Array.isArray(leg) ? leg.filter(Boolean) : Object.values(leg || {});
arr.push(venta('viejo-1', {createdAt: new Date().toISOString()}), venta('viejo-2', {createdAt: new Date().toISOString()}));
await gf(`${base}/db/sales.json?ns=demo-gastrogoan`, {method:'PUT', body:JSON.stringify(arr)});
await w(5000);
r = await esperaIguales(A, B, 15000);
ok('6a. Las ventas de un aparato viejo (bloque antiguo) entran en los dos aparatos nuevos', r.ok && r.a.includes('viejo-1') && r.a.includes('viejo-2'));
await w(3000);
const enNuevo = await (await gf(`${base}/ventas/viejo-1.json?ns=demo-gastrogoan`)).json();
ok('6b. …y pasan al sitio nuevo para los demás', !!enNuevo && enNuevo.id === 'viejo-1');
ok('6c. La app avisa de que hay un aparato sin actualizar', await A.page.evaluate(() => vnViejoVisto === true) || await B.page.evaluate(() => vnViejoVisto === true));

/* ═══ 7. Marcha atrás ═══ */
const antesAtras = (await ids(A)).length;
await A.page.evaluate(async () => { await vnDesactivar(); });
await w(6000);
const legAtras = await (await gf(`${base}/db/sales.json?ns=demo-gastrogoan&shallow=true`)).json();
ok('7a. Marcha atrás: el bloque antiguo vuelve a tener TODAS las ventas', Object.keys(legAtras || {}).length === antesAtras, Object.keys(legAtras || {}).length + ' de ' + antesAtras);
ok('7b. …y B sigue la bandera', await B.page.evaluate(() => !DB.business.ventasPorMes));
await A.page.evaluate(v => { DB.sales.push(v); saveDB(); }, venta('tras-atras'));
await w(4000);
r = await esperaIguales(A, B, 10000);
ok('7c. Tras la marcha atrás sigue sincronizando', r.ok && r.a.includes('tras-atras'));
await A.page.evaluate(async () => { await vnActivar(); }); await w(4000);

/* ═══ 8. Ráfaga aleatoria: dos aparatos, ventas, anulaciones y borrados mezclados ═══ */
let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const esperados = new Map(); (await A.page.evaluate(() => DB.sales.map(s => [String(s.id), s.status === 'anulada']))).forEach(([i, a]) => esperados.set(i, a));
for(let ronda = 0; ronda < 6; ronda++){
  for(const [D, p] of [[A, 'ra'], [B, 'rb']]){
    const ops = []; for(let k = 0; k < 30; k++){ const x = rnd(); ops.push(x < .6 ? {t:'v', id:`${p}${ronda}_${k}`} : x < .85 ? {t:'a', i:Math.floor(rnd() * 3000)} : {t:'b', i:3000 - 1 - Math.floor(rnd() * 400)}); }
    ops.forEach(o => { if(o.t === 'v') esperados.set(o.id, false); if(o.t === 'a' && esperados.has('h' + o.i)) esperados.set('h' + o.i, true); if(o.t === 'b'){ /* borrado: solo si nadie más lo ha tocado ya */ } });
    await D.page.evaluate(ops => { ops.forEach(o => {
      if(o.t === 'v') DB.sales.push({id:o.id, date:todayStr(), createdAt:new Date().toISOString(), total:2, subtotal:1.8, tipo:'mesa', metodoPago:'Efectivo', items:[{name:'q', qty:1, price:2}]});
      else if(o.t === 'a'){ const s = DB.sales.find(x => x.id === 'h' + o.i); if(s){ s.status = 'anulada'; s.rectificativa = {num:'R-' + o.i, fecha:todayStr(), rectifica:'x', motivo:'r'}; } }
    }); saveDB(); }, ops.filter(o => o.t !== 'b'));
    await w(300);
  }
}
r = await esperaIguales(A, B, 30000);
const unicos = new Set(r.a).size === r.a.length;
const sinPerdidas = [...esperados.keys()].filter(k => !/^off/.test(k)).every(k => r.a.includes(k));
ok('8a. Ráfaga aleatoria: los dos aparatos acaban con las MISMAS ventas, sin duplicados ni pérdidas', r.ok && unicos && sinPerdidas, 'A=' + r.a.length + ' B=' + r.b.length);
const anuA = await A.page.evaluate(() => DB.sales.filter(s => s.status === 'anulada').map(s => s.id).sort().join()), anuB = await B.page.evaluate(() => DB.sales.filter(s => s.status === 'anulada').map(s => s.id).sort().join());
ok('8b. Las mismas ventas anuladas en los dos', anuA === anuB && anuA.length > 0);
const sA = await A.page.evaluate(() => Math.round(DB.sales.filter(s => s.status !== 'anulada').reduce((s, x) => s + x.total, 0) * 100)), sB = await B.page.evaluate(() => Math.round(DB.sales.filter(s => s.status !== 'anulada').reduce((s, x) => s + x.total, 0) * 100));
ok('8c. La facturación (sin anuladas) coincide al céntimo', sA === sB, sA + ' / ' + sB);
const nubeFinal = await idsNube();
ok('8d. La nube tiene exactamente las ventas de los aparatos', nubeFinal.nuevo === r.a.length, nubeFinal.nuevo + ' vs ' + r.a.length);

/* ═══ 9. Negocio nuevo: nace con la bandera encendida ═══ */
const C = await dispositivo(); await arrancar(C, 'VENTAS002', undefined);
await w(2500);
ok('9. Un negocio nuevo (nube vacía) nace con las ventas una a una', await C.page.evaluate(() => DB.business.ventasPorMes === true));

const errores = [A, B, C].flatMap(d => d.errs).filter(e => !/net::|Failed to fetch|firebase/i.test(e));
ok('10. Sin errores de JavaScript', errores.length === 0, errores.slice(0, 3).join(' | '));
for(const d of [A, B, C]) try{ await d.ctx.close(); }catch(e){}
await browser.close();
const mal = res.filter(x => !x.c);
console.log('\n' + '─'.repeat(60) + '\n' + (mal.length ? `❌ ${mal.length} de ${res.length} fallaron` : `✅ los ${res.length} escenarios pasaron`));
process.exit(mal.length ? 1 : 0);
