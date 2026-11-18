import puppeteer from 'puppeteer-core';
const W = +process.env.W || 360;
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
await page.setViewport({width:W, height:+(process.env.H||740), deviceScaleFactor:1});
await page.setRequestInterception(true);
page.on('request', r => /firebase|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(code => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
}, 'PROBE00001');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));
await page.evaluateOnNewDocument((p)=>{window.__PANE=p},process.env.PANE||'comanda');
await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate','app-splash'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  DB.tables.push({id:1, name:'Mesa 2', zona:'Salón', plazas:4});
  const hoy = todayStr();
  DB.reservations.push({id:1,date:hoy,time:'13:45',clientName:'mrcos con nombre largo largo', name:'mrcos con nombre largo largo',people:2,status:'confirmada',tableId:1,phone:'612345678',notes:'Chicken frito',publicToken:'1CFJOZABCDEF'},{id:2,date:hoy,time:'14:30',clientName:'Ana', name:'Ana',people:4,status:'pendiente'});
  saveDB(); currentFolder='sala'; navigate('dashboard');
});
await new Promise(r=>setTimeout(r,800));
if(process.env.SEC){ await page.evaluate(()=>{document.querySelectorAll('.tp-seccion')[1]?.click()}); await new Promise(r=>setTimeout(r,400)); await page.evaluate(()=>{const s=document.getElementById('tp-sel-carta'); if(s){s.selectedIndex=1;s.dispatchEvent(new Event('change',{bubbles:true}))}}); await new Promise(r=>setTimeout(r,300)); await page.evaluate(()=>{document.querySelector('.tp-seccion')?.click()}); await new Promise(r=>setTimeout(r,300)); await page.evaluate(()=>{document.querySelector('.tp-plato-main')?.click()}); await new Promise(r=>setTimeout(r,300)); }
await page.screenshot({path:process.env.OUT||'/tmp/claude-0/probe.png'});
await browser.close();
