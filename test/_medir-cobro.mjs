// TEMPORAL de medición (se borra): mide Cobrar con N ventas bajo CPU xK.
import puppeteer from 'puppeteer-core';
const N = +(process.env.N||20000), K = +(process.env.K||4), PROF = process.env.PROF==='1';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage(); await page.setViewport({width:1280,height:800});
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|raw.githubusercontent/.test(r.url()) ? r.abort() : r.continue());
page.on('pageerror', e => console.log('PAGEERR', e.message));
await page.goto('http://localhost:8950/index.html', {waitUntil:'domcontentloaded'}); await new Promise(r=>setTimeout(r,2500));
const datos = await page.evaluate(async () => (await fetch('/dist/ggburger.json')).json());
await page.evaluate(async (d, N) => {
  localStorage.clear();
  localStorage.setItem('gastrogoan_owner_login','1'); localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify(d.license));
  const base = d.sales, out = [];
  for(let i=0;out.length<N;i++){ const s = JSON.parse(JSON.stringify(base[i % base.length])); s.id = 'v-' + i + '_' + (i % base.length); const dd = new Date(Date.now() - (N-out.length)*40e3); s.date = dd.toISOString().slice(0,10); s.createdAt = dd.toISOString(); s.ticketNum = 'T26K4P-' + String(i+1).padStart(6,'0'); out.push(s); }
  d.sales = out;
  Object.assign(d.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  d.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  await idbSet('gastrogoan_data_v1', d);
}, datos, N);
await page.goto('about:blank'); await page.goto('http://localhost:8950/index.html', {waitUntil:'domcontentloaded'}); await new Promise(r=>setTimeout(r,4500));
const cdp = await page.createCDPSession();
const res = await page.evaluate(async () => {
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate','app-splash','access-select-screen'].forEach(id => document.getElementById(id)?.remove());
  window.__subidas = [];
  // nube falsa: registra bytes y confirma a los 50 ms
  lastSyncedSnapshot = {}; Object.keys(DB).forEach(k => lastSyncedSnapshot[k] = canonicalStringify(DB[k]));
  socketConnected = true;
  cloudRef = {update: u => { const t0=performance.now(); const b = JSON.stringify(u).length; window.__subidas.push({bytes:b, claves:Object.keys(u).length, rutas:Object.keys(u).slice(0,5)}); return new Promise(r=>setTimeout(r,50)); }, set: () => Promise.resolve()};
  DB.tables = [{id:1,name:'Mesa 1',zona:'Salón',plazas:4}];
  DB.tpvOrders = [{id:777001,tableId:1,tipo:'mesa',status:'abierta',createdAt:new Date().toISOString(),tandas:[],pax:2,items:[{lineId:'L1',platoId:1,name:'Solomillo',qty:2,price:22,ivaPct:10,tanda:'',notas:'',recipeId:1014}]}];
  await saveDB(); return {sales: DB.sales.length};
});
console.log('ventas', res.sales);
await cdp.send('Emulation.setCPUThrottlingRate', {rate:K});
await new Promise(r=>setTimeout(r,2500));   // deja pasar lo pendiente del arranque
await page.evaluate(() => { window.__subidas.length = 0; window.__lt = []; try{ new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push(Math.round(e.duration)))).observe({entryTypes:['longtask']}); }catch(e){} });
if(PROF){ await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval',{interval:200}); await cdp.send('Profiler.start'); }
const m = await page.evaluate(async () => {
  const T = {};
  // envoltorios con tiempos
  const envolver = (n) => { const o = window[n]; window[n] = function(){ const t0=performance.now(); try{ return o.apply(this, arguments); } finally { (T[n] = T[n]||[]).push(Math.round((performance.now()-t0)*10)/10); } }; };
  ['flushCloudSync','anotarLapidas','guardarLocalDB','volcarLocalDB','renderTPV','openTicketDeliveryModal','siguienteNumeroFactura','discountStockForOrder','saveDB','syncPublicMirror','avisosProgramar','refreshAfterRemoteChange','applyRemoteBlock'].forEach(n => { if(typeof window[n]==='function') envolver(n); });
  openPaymentModal(777001); await new Promise(r=>setTimeout(r,300));
  const t0 = performance.now();
  finalizeCharge(777001);
  const tSync = performance.now() - t0;
  // espera a que se pinte el ticket (un frame)
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const tPintado = performance.now() - t0;
  await new Promise(r=>setTimeout(r,3500));
  return {tSync: Math.round(tSync), tPintado: Math.round(tPintado), T, subidas: window.__subidas, longtasks: window.__lt};
});
console.log(JSON.stringify(m, null, 1));
const r2 = await page.evaluate(async () => {
  // recepción: otro aparato vendió 1 y la nube manda el array entero (objetos NUEVOS, como el SDK)
  const remoto = JSON.parse(JSON.stringify(DB.sales)); const nueva = JSON.parse(JSON.stringify(DB.sales[DB.sales.length-1])); nueva.id = 'otro-1'; nueva.ticketNum='T26ZZZZ-000001'; remoto.push(nueva);
  const t0 = performance.now(); applyRemoteBlock('sales', remoto); const dt = performance.now()-t0;
  const t1 = performance.now(); const j = JSON.stringify(DB.sales).length; const dj = performance.now()-t1;
  const t2 = performance.now(); canonicalStringify(DB.sales); const dc = performance.now()-t2;
  const t3 = performance.now(); DB.sales.forEach(s => JSON.stringify(s)); const dj2 = performance.now()-t3;
  return {applyRemoteBlock_ms: Math.round(dt), JSONstringify_ms: Math.round(dj), canonical_ms: Math.round(dc), jsonPorVenta_ms: Math.round(dj2), n: DB.sales.length, bytes: j};
});
console.log('RECEPCION', JSON.stringify(r2));
if(PROF){
  const {profile} = await cdp.send('Profiler.stop');
  const self = new Map(); const byId = new Map(profile.nodes.map(n=>[n.id,n]));
  const dts = profile.timeDeltas; profile.samples.forEach((id,i)=>{ const n = byId.get(id); const k = n.callFrame.functionName+' '+(n.callFrame.url.split('/').pop())+':'+n.callFrame.lineNumber; self.set(k,(self.get(k)||0)+(dts[i]||0)); });
  console.log('TOP self (ms, reales con CPU x'+K+'):'); [...self.entries()].sort((a,b)=>b[1]-a[1]).slice(0,14).forEach(([k,v])=>console.log(' ', Math.round(v/1000), k));
}
await browser.close();
