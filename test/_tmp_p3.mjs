import puppeteer from 'puppeteer-core';
const W = +(process.env.W||360), H = +(process.env.H||800);
const estados = (process.env.E||'ge-tes').split(',');
const ES = {
 'dash': "currentFolder='gestion'; navigate('dashboard')",
 'ge-ventas': "navigate('economia'); GE.tab('ventas')",
 'ge-fijos': "navigate('economia'); GE.tab('fijos')",
 'ge-var': "navigate('economia'); GE.tab('variables')",
 'ge-cdr': "navigate('economia'); GE.tab('cdr')",
 'ge-tes': "navigate('economia'); GE.tab('tesoreria')",
 'ge-bc': "navigate('economia'); GE.tab('bc')",
 'ge-pe': "navigate('economia'); GE.tab('pe')",
 'ge-capex': "navigate('economia'); GE.tab('capex')",
 'gf-edit': "navigate('economia'); GE.tab('fijos'); GE.newGF()",
 'dash-open': "currentFolder='gestion'; navigate('dashboard'); setTimeout(()=>{ document.querySelectorAll('.view.active .gg-plegable').forEach(e=>e.classList.add('gg-abierto')); document.querySelectorAll('.view.active details').forEach(d=>d.open=true); }, 900)",
 'folder': "currentFolder='gestion'; navigate('folder')",
};
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox']});
const w = ms => new Promise(r => setTimeout(r, ms));
const page = await browser.newPage(); await page.setViewport({width:W,height:H,isMobile:true,hasTouch:true,deviceScaleFactor:1});
await page.setRequestInterception(true);
page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|raw.githubusercontent/.test(r.url()) ? r.abort() : r.continue());
page.on('pageerror', e => console.log('PAGEERR', e.message));
await page.goto('http://localhost:8963/dist/index.html', {waitUntil:'domcontentloaded'}); await w(2000);
const datos = await page.evaluate(async () => (await fetch('/dist/ggburger.json')).json());
// nombres largos
datos.ge.capex.push({id:9701,descripcion:'Dos freidoras de alto rendimiento',importe:4114,iva:21,fecha:'2026-03-12',estadoPago:'PAGADO',financiado:false,tipo:'mobiliario'},{id:9702,descripcion:'Terraza: mesas, sillas y toldo',importe:3751,iva:21,fecha:'2026-02-12',estadoPago:'PAGADO',financiado:true,cuotas:24,cuotaMensual:150,anios:8});
datos.ge.fijos.push({id:9499,nombre:'SEGURO DEL NEGOCIO',importe:362.5,periodicidadMeses:1,iva:0,categoria:'FIJOS'},{id:9498,nombre:'Nóminas y seguros sociales de toda la plantilla',importe:3585.83,periodicidadMeses:1,iva:0,categoria:'FIJOS'});
await page.evaluate(async (d) => {
  localStorage.setItem('gastrogoan_owner_login','1'); localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()})); localStorage.setItem('gastrogoan_owner_pass_prompted','1'); localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
  if(d.license) localStorage.setItem('gastrogoan_license_v1', JSON.stringify(d.license));
  await idbSet('gastrogoan_data_v1', d);
}, datos);
await page.reload({waitUntil:'domcontentloaded'}); await page.waitForFunction(() => typeof DB !== 'undefined' && DB && DB.sales, {timeout:60000}); await w(1500);
await page.evaluate(() => { ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate','app-splash'].forEach(x => document.getElementById(x)?.remove()); try{hideAccessSelectScreen();}catch(e){} try{hideBusinessSelectScreen();}catch(e){} try{ownerUnlocked=true;}catch(e){} });
const out = process.env.OUT || '/tmp/claude-0/-home-user-gastrogoan/9f1abb2c-92fd-5a33-8aab-42cccc1d20dd/scratchpad';
for(const e of estados){
  await page.evaluate(ES[e]); await w(1200);
  await page.evaluate(() => { document.querySelector('#content')?.scrollTo(0,0); window.scrollTo(0,0); });
  const alto = await page.evaluate(() => document.querySelector('#content').scrollHeight);
  await page.setViewport({width:W,height:Math.min(alto+120, 16000),isMobile:true,hasTouch:true,deviceScaleFactor:1}); await w(500);
  for(let i=0;i*1000<alto+120;i++){ await page.screenshot({path:`${out}/p3/${e}-${W}-${i}.png`, clip:{x:0,y:i*1000,width:W,height:Math.min(1000,alto+120-i*1000)}}); }
  await page.setViewport({width:W,height:H,isMobile:true,hasTouch:true,deviceScaleFactor:1}); await w(300);
  console.log(e, 'alto', alto);
}
await browser.close();
