import puppeteer from 'puppeteer-core';
const W = parseInt(process.env.W||'1280'), H = parseInt(process.env.H||'900');
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage(); await page.setViewport({width:W,height:H,isMobile:W<500,hasTouch:W<1000});
const errs=[]; page.on('pageerror',e=>errs.push(e.message)); page.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text())});
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|raw.githubusercontent/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/index.html',{waitUntil:'domcontentloaded'}); await new Promise(r=>setTimeout(r,2500));
const datos = await page.evaluate(async()=> (await fetch('/dist/ggburger.json')).json());
await page.evaluate(async d=>{localStorage.setItem('gastrogoan_owner_login','1');localStorage.setItem('gastrogoan_access_session',JSON.stringify({type:'owner',ts:Date.now()}));localStorage.setItem('gastrogoan_owner_pass_prompted','1');localStorage.setItem('gastrogoan_backup_reminder_day',new Date().toISOString().slice(0,10)); if(d.license) localStorage.setItem('gastrogoan_license_v1',JSON.stringify(d.license)); await idbSet('gastrogoan_data_v1',d);},datos);
await page.reload({waitUntil:'domcontentloaded'}); await page.waitForFunction(()=>typeof DB!=='undefined'&&DB&&DB.sales,{timeout:60000}); await new Promise(r=>setTimeout(r,1200));
await page.evaluate(()=>{['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate','app-splash'].forEach(x=>document.getElementById(x)?.remove()); try{hideAccessSelectScreen&&hideAccessSelectScreen()}catch(e){} document.querySelectorAll('.modal-overlay').forEach(m=>m.classList.remove('active')); currentFolder='gestion'; ownerUnlocked=true; navigate('dashboard');});
await new Promise(r=>setTimeout(r,2000));
const info = await page.evaluate(()=>({ventas:DB.sales.length, clientes:DB.clients.length, res:DB.reservations.length, ge: Object.keys(DB.ge||{}).length, fecha: todayStr(), ultima: DB.sales.map(s=>s.date).sort().pop()}));
console.log(JSON.stringify(info));
const h = await page.evaluate(()=>document.querySelector('.content').scrollHeight); console.log('alto',h);
await page.screenshot({path:`/tmp/claude-0/panel-${W}.png`, fullPage:false});
for(const [i,id] of (process.env.ONLY||'dp-equilibrio,dp-reservas,dp-ventas,dp-gastos,dp-resultado,dp-analisis,dp-clientela').split(',').entries()){
  const el = await page.$('#'+id); if(!el) { console.log('falta',id); continue; }
  await el.evaluate(e=>e.closest('.card')?e.closest('.card').scrollIntoView():e.scrollIntoView());
  const box = await (await page.evaluateHandle(i=>document.getElementById(i).closest('.card')||document.getElementById(i),id)).asElement();
  await box.screenshot({path:`/tmp/claude-0/panel-${W}-${id}.png`});
}
if(process.env.SCROLLTO){ await page.evaluate(id=>{ const c=document.querySelector('.content'); const e=document.getElementById(id).closest('.card'); c.scrollTop = e.offsetTop - 70 + parseInt(process.env.OFF||'0'); }, process.env.SCROLLTO); await new Promise(r=>setTimeout(r,600)); await page.screenshot({path:`/tmp/claude-0/panel-${W}-scroll.png`}); }
console.log('errores',JSON.stringify(errs.slice(0,5)));
await browser.close();
