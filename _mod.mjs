import puppeteer from 'puppeteer-core';
const OUT='/tmp/claude-0/-home-user-gastrogoan/9f1abb2c-92fd-5a33-8aab-42cccc1d20dd/scratchpad/'+(process.env.TAG||'m')+'-';
const b = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox']});
const p = await b.newPage(); await p.setViewport({width:1360,height:860});
await p.setRequestInterception(true);
p.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|raw.githubusercontent/.test(r.url()) ? r.abort() : r.continue());
await p.goto('http://localhost:8950/dist/index.html',{waitUntil:'domcontentloaded'}); await new Promise(r=>setTimeout(r,2000));
const datos = await p.evaluate(async()=> (await fetch('/dist/ggburger.json')).json());
await p.evaluate(async d=>{localStorage.setItem('gastrogoan_owner_login','1');localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));localStorage.setItem('gastrogoan_owner_pass_prompted','1');localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10)); if(d.license) localStorage.setItem('gastrogoan_license_v1', JSON.stringify(d.license)); await idbSet('gastrogoan_data_v1', d);}, datos);
await p.reload({waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof DB !== 'undefined' && DB && DB.sales, {timeout:60000});
await p.evaluate(()=>{['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(x=>document.getElementById(x)?.remove()); try{hideAccessSelectScreen();}catch(e){} try{hideBusinessSelectScreen();}catch(e){} try{closeModal();}catch(e){} editUnlocked=true; document.body.classList.add('edit-unlocked','owner-session');});
await new Promise(r=>setTimeout(r,800));
const w = process.argv[2]==='m';
if(w) await p.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2});
await new Promise(r=>setTimeout(r,800));
for(const v of process.argv.slice(3)){
  await p.evaluate(()=>{try{closeModal();}catch(e){}});
  const err=await p.evaluate(code=>{try{eval(code);return ''}catch(e){return String(e).slice(0,80)}}, v);
  if(err) console.log(v,'ERR',err);
  await new Promise(r=>setTimeout(r,900));
  await p.screenshot({path:OUT+v.replace(/[^a-zA-Z0-9]/g,'').slice(0,28)+(w?'-m':'')+'.png'});
}
await b.close();
