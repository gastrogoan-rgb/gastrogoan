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
  navigate('minegocio'); renderMiNegocio();
  const v=document.getElementById('view-minegocio'); const out=[];
  v.querySelectorAll('input,select,textarea').forEach(el=>{
    if(['button','submit','file'].includes(el.type)) return;
    const card=el.closest('.card');
    const tieneBoton=card&&[...card.querySelectorAll('button')].some(b=>/save|guardar|device-floppy/i.test((b.getAttribute('onclick')||'')+b.innerHTML));
    const auto=el.hasAttribute('onchange')||el.hasAttribute('oninput')||el.closest('[onchange]');
    if(!auto&&!tieneBoton) out.push((el.id||el.name||el.className||el.type)+' @ '+((card&&card.querySelector('h3,h4,.card-title')||{}).textContent||'').trim().slice(0,40));
  });
  document.title=JSON.stringify(out);
});
await new Promise(r=>setTimeout(r,800));
if(process.env.SEC){ await page.evaluate(()=>{document.querySelectorAll('.tp-seccion')[1]?.click()}); await new Promise(r=>setTimeout(r,400)); await page.evaluate(()=>{const s=document.getElementById('tp-sel-carta'); if(s){s.selectedIndex=1;s.dispatchEvent(new Event('change',{bubbles:true}))}}); await new Promise(r=>setTimeout(r,300)); await page.evaluate(()=>{document.querySelector('.tp-seccion')?.click()}); await new Promise(r=>setTimeout(r,300)); await page.evaluate(()=>{document.querySelector('.tp-plato-main')?.click()}); await new Promise(r=>setTimeout(r,300)); }
console.log(await page.title());
await page.screenshot({path:process.env.OUT||'/tmp/claude-0/probe.png'});
await browser.close();
