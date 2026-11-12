/* ¿Por qué parpadea la app? (12/11) Dos aparatos contra la nube real (emulador), quietos en una pantalla: se cuenta cuántas veces se REPINTA
 * (renderView) y cuántos cambios de DOM caen en #content por minuto. Un aparato parado no debería repintarse más que por el reloj. */
import puppeteer from 'puppeteer-core';
const CODE='EMUPARPA', DBURL='http://127.0.0.1:9000/?ns=demo-gastrogoan', BASE='http://app.test:8951';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox','--host-resolver-rules=MAP app.test 127.0.0.1'], headless:true});
const w = ms => new Promise(r=>setTimeout(r,ms));
async function aparato(nombre){
  const ctx = await (browser.createBrowserContext ? browser.createBrowserContext() : browser.createIncognitoBrowserContext());
  const page = await ctx.newPage(); await page.setViewport({width:1280,height:900}); await page.setCacheEnabled(false);
  page.on('pageerror', e => console.log('  [' + nombre + '] error JS:', e.message));
  await page.setRequestInterception(true);
  page.on('request', req => { const m = req.url().match(/gstatic\.com\/firebasejs\/[\d.]+\/(firebase-[a-z-]+\.js)/); if(m) return req.continue({url:'http://localhost:8951/__sdk/'+m[1]}); let h=''; try{h=new URL(req.url()).hostname}catch(e){} if(h!=='127.0.0.1'&&h!=='localhost'&&h!=='app.test'&&/googleapis|raw.githubusercontent|qrserver/.test(req.url())) return req.abort(); req.continue(); });
  await page.evaluateOnNewDocument(() => { try{ localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10)); }catch(e){} });
  await page.goto(BASE+'/index.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(() => (typeof dbReadyPromise !== 'undefined') ? dbReadyPromise : null).catch(()=>{});
  await page.evaluate(async ([code,dburl]) => {
    localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
    localStorage.setItem('gastrogoan_owner_pass_prompted','1');
    localStorage.setItem('gastrogoan_owner_login', JSON.stringify({user:'jefe', authKey:'k'.repeat(20), pinHash:'h'}));
    localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
    Object.assign(DB.business,{name:'Casa Paco',netlifySetupDone:true,extConnPromptSeen:true,tourSeen:true,categoryIconHintSeen:true});
    DB.business.ownFirebase = {apiKey:'fake-api-key', databaseURL:dburl}; await saveDB();
  },[CODE,DBURL]);
  await page.reload({waitUntil:'domcontentloaded'}); await w(7000);
  await page.evaluate(() => {
    window.__r = []; window.__m = 0;
    const o = window.renderView; window.renderView = function(v){ window.__r.push(v + '@' + Math.round(performance.now()/1000)); return o.apply(this, arguments); };
    new MutationObserver(l => { window.__m += l.length; }).observe(document.getElementById('content'), {childList:true, subtree:true});
  });
  return page;
}
const A = await aparato('A'), B = await aparato('B');
// Servicio con ACTIVIDAD: A guarda un cambio cada 700 ms durante 10 s (tres bloques distintos, como un camarero que toma notas) y B mira la pantalla.
for(const vista of ['dashboard','tpv','stock']){
  await B.evaluate(v => { navigate(v); }, vista); await w(2000);
  await B.evaluate(() => { window.__r = []; window.__m = 0; });
  await A.evaluate(async () => {
    for(let i = 0; i < 14; i++){
      DB.business.slogan = 'x' + i + Date.now();
      DB.chatMessages = DB.chatMessages || []; DB.chatMessages.push({id: 'm' + Date.now() + i, authorId: 'z', authorName: 'Z', text: 'hola ' + i, ts: new Date().toISOString(), channel: 'general'});
      DB.stockMovimientos = DB.stockMovimientos || [];
      await saveDB(); await new Promise(r => setTimeout(r, 700));
    }
  });
  await w(4000);
  const r = await B.evaluate(() => ({n: window.__r.length, m: window.__m}));
  console.log(`vista ${vista}: A hace 14 guardados en 10 s → B se repinta ${r.n} veces (${r.m} cambios de DOM)`);
}
await browser.close();
