import puppeteer from 'puppeteer-core';
const OUT='/tmp/claude-0/-home-user-gastrogoan/9f1abb2c-92fd-5a33-8aab-42cccc1d20dd/scratchpad/'+(process.env.TAG||'d')+'-';
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

const casos={
 ficha:"printFicha(DB.recipes[0].id)",
 protocolo:"printProtocolo('apertura')",
 horario:"navigate('horarios'); printWeeklySchedule()",
 cierre:"printCashClosure((DB.cashClosures||[])[0]||{date:todayStr(),total:112.3,byMethod:{efectivo:26,tarjeta:86.3,otro:0},tickets:5,counted:26,fund:0,diff:0,ts:Date.now(),byWaiter:{}})",
 manual:"navigate('manual'); printManualChapter()",
 ticket:"window.__h = buildTicketHtml(DB.sales[DB.sales.length-1]||{id:1,total:23.5,items:[{name:'Smash clásica',qty:2,price:11.5}],date:todayStr(),payments:[]})",
};
for(const [n,code] of Object.entries(casos)){
  await p.evaluate(()=>{window.__h=null;window.open=()=>({document:{write:h=>{window.__h=h},close(){}},print(){},focus(){}});});
  const err=await p.evaluate(c=>{try{eval(c);return ''}catch(e){return String(e).slice(0,100)}},code);
  const h=await p.evaluate(()=>window.__h);
  if(err||!h){console.log(n,'ERR',err||'sin html');continue;}
  const q=await b.newPage();await q.setViewport({width:794,height:1123});await q.setContent(h,{waitUntil:'domcontentloaded'});await new Promise(r=>setTimeout(r,1200));
  await q.emulateMediaType('print');
  await q.screenshot({path:OUT+n+'.png',fullPage:true});
  await q.pdf({path:OUT+n+'.pdf',format:'A4',printBackground:true});await q.close();
}
await b.close();
