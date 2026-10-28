import puppeteer from 'puppeteer-core';
const S='/tmp/claude-0/-home-user-gastrogoan/9f1abb2c-92fd-5a33-8aab-42cccc1d20dd/scratchpad/';
const tag=process.argv[2]||'e';
const b=await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const shots=[
 ['splash',()=>{document.getElementById('app-splash')?.classList.remove('hide');}],
 ['negocios',()=>{document.getElementById('app-splash')?.remove();showBusinessSelectScreen()}],
 ['licencia',()=>{document.getElementById('app-splash')?.remove();showActivationGate()}],
 ['firebase',()=>{document.getElementById('app-splash')?.remove();showFirebaseSetupGate()}],
 ['netlify',()=>{document.getElementById('app-splash')?.remove();showNetlifySetupGate()}],
 ['revocada',()=>{document.getElementById('app-splash')?.remove();showRevokedGate()}],
];
for(const [w,h,t] of [[1366,800,'pc'],[390,780,'mov']]) for(const [n,fn] of shots){
  const p=await b.newPage();await p.setViewport({width:w,height:h});
  await p.setRequestInterception(true);p.on('request',r=>/firebase|gstatic|googleapis|githubusercontent/.test(r.url())?r.abort():r.continue());
  await p.goto('http://localhost:8950/dist/index.html',{waitUntil:'domcontentloaded'});await new Promise(r=>setTimeout(r,n==='splash'?300:3200));
  try{await p.evaluate(fn)}catch(e){console.log(n,'ERR',e.message.slice(0,80))}
  await new Promise(r=>setTimeout(r,700));
  await p.screenshot({path:S+`${tag}-${t}-${n}.png`});await p.close();
}
await b.close();
