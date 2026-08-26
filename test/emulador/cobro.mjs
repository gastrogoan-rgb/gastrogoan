// R12 — La nube donde está el dinero: dos dispositivos cobrando, cerrando
// caja y anulando a la vez, contra un Firebase de verdad.
import puppeteer from 'puppeteer-core';
const DBURL='http://127.0.0.1:9000/?ns=demo-gastrogoan';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox'],headless:true});
const res=[]; const ok=(n,c,d)=>{res.push({n,c:!!c}); console.log((c?'✅':'❌')+' '+n+(d?'  → '+d:''));};

for(const ns of ['demo-gastrogoan','demo-plataforma']){
  const r=await fetch(`http://127.0.0.1:9000/.json?ns=${ns}`,{method:'DELETE'});
  if(!r.ok) console.warn('no se pudo vaciar',ns);
}
console.log('→ emulador vaciado\n');

const contextos=[];
async function dispositivo(){
  const ctx=await browser.createBrowserContext(); contextos.push(ctx);
  const page=await ctx.newPage(); await page.setCacheEnabled(false);
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.setRequestInterception(true);
  page.on('request',req=>{ const m=req.url().match(/gstatic\.com\/firebasejs\/[\d.]+\/(firebase-[a-z-]+\.js)/);
    if(m) return req.continue({url:'http://localhost:8951/__sdk/'+m[1]}); req.continue(); });
  await page.evaluateOnNewDocument(()=>{
    const iv=setInterval(()=>{ try{ if(typeof PLATFORM_FIREBASE_CONFIG!=='undefined'){
      PLATFORM_FIREBASE_CONFIG.databaseURL='http://127.0.0.1:9000/?ns=demo-plataforma'; clearInterval(iv);} }catch(e){} },5);
    setTimeout(()=>clearInterval(iv),4000);
  });
  return {page,errs};
}
async function arrancar(d,code){
  await d.page.goto('http://localhost:8951/index.html',{waitUntil:'domcontentloaded'});
  await d.page.evaluate(async ({code,dburl})=>{
    localStorage.setItem('gastrogoan_license_v1',JSON.stringify({code,tenantId:ggBizTenantId(code)}));
    localStorage.setItem('gastrogoan_owner_login',JSON.stringify({user:'jefe',authKey:'k',pinHash:'h'}));
    localStorage.setItem('gastrogoan_access_session',JSON.stringify({type:'owner',ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted','1');
    Object.assign(DB.business,{netlifySetupDone:true,extConnPromptSeen:true,tourSeen:true,categoryIconHintSeen:true});
    DB.business.ownFirebase={apiKey:'fake',databaseURL:dburl};
    await saveDB();
  },{code,dburl:DBURL});
  await d.page.reload({waitUntil:'domcontentloaded'});
  await new Promise(r=>setTimeout(r,3200));
  await d.page.evaluate(()=>{['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());});
}

/* ═══ 1. Dos camareros cobran la MISMA mesa a la vez ═══════════════ */
{
  const CODE='COBRO001';
  const A=await dispositivo(); await arrancar(A,CODE);
  const B=await dispositivo(); await arrancar(B,CODE);
  await new Promise(r=>setTimeout(r,2500));
  await A.page.evaluate(()=>{
    DB.tables=[{id:1,name:'Mesa 1',zona:'Salón',plazas:4}];
    DB.tpvOrders=[{id:7000,tableId:1,tipo:'mesa',status:'abierta',createdAt:new Date().toISOString(),tandas:[],
      items:[{lineId:'L1',platoId:1,name:'Solomillo',qty:1,price:22,ivaPct:10,tanda:'',notas:''}]}];
    DB.sales=[]; saveDB();
  });
  await new Promise(r=>setTimeout(r,3500));
  // Los dos cobran esa mesa casi a la vez
  await Promise.all([
    A.page.evaluate(()=>{ const o=DB.tpvOrders.find(x=>x.id===7000); o.status='pagada';
      DB.sales.push({id:'V-A',date:todayStr(),createdAt:new Date().toISOString(),total:22,subtotal:20,propina:0,tipo:'mesa',metodoPago:'Efectivo',orderId:7000,items:o.items}); saveDB(); }),
    B.page.evaluate(()=>{ const o=DB.tpvOrders.find(x=>x.id===7000); o.status='pagada';
      DB.sales.push({id:'V-B',date:todayStr(),createdAt:new Date().toISOString(),total:22,subtotal:20,propina:0,tipo:'mesa',metodoPago:'Tarjeta',orderId:7000,items:o.items}); saveDB(); }),
  ]);
  await new Promise(r=>setTimeout(r,6000));
  const r = await A.page.evaluate(()=>({
    ventas:(DB.sales||[]).map(s=>s.id).sort(),
    delMismoPedido:(DB.sales||[]).filter(s=>s.orderId===7000).length,
  }));
  // Lo importante: que NINGUNA de las dos ventas desaparezca. Un cobro
  // duplicado se ve y se anula; uno perdido no lo detecta nadie.
  ok('1. Dos cobros a la vez: no se pierde ninguna venta', r.ventas.length===2, 'quedaron '+JSON.stringify(r.ventas));
  // Y que el duplicado quede ANOTADO: una venta de más infla facturación
  // e IVA, y si nadie lo ve se declara mal.
  const aviso = await A.page.evaluate(()=> (DB.auditLog||[]).find(e=>e.action==='cobro_duplicado'));
  ok('1b. El cobro duplicado queda anotado como crítico',
     !!aviso && aviso.severity==='critical',
     aviso ? aviso.summary.slice(0,72)+'…' : 'no se anotó nada');
  await A.page.close(); await B.page.close();
}

/* ═══ 2. Cierre de caja simultáneo (hay un cerrojo) ════════════════ */
{
  const CODE='COBRO002';
  const A=await dispositivo(); await arrancar(A,CODE);
  const B=await dispositivo(); await arrancar(B,CODE);
  await new Promise(r=>setTimeout(r,2500));
  await A.page.evaluate(()=>{
    DB.sales=[{id:'S1',date:todayStr(),createdAt:new Date().toISOString(),total:50,subtotal:45,propina:0,tipo:'mesa',metodoPago:'Efectivo',items:[]}];
    DB.cashClosures=[]; saveDB();
  });
  await new Promise(r=>setTimeout(r,3500));
  // Solo el .ok: cuando GANA el cerrojo, la función devuelve además una
  // referencia de Firebase que no se puede sacar del navegador, y el
  // resultado entero llegaba como null — parecía que nadie lo conseguía
  // cuando en realidad lo tenía el primero.
  const intentos = await Promise.all([
    A.page.evaluate(async ()=>{ try{ const l=await acquireCashClosureLock(); return {ok:!!(l&&l.ok), conRef:!!(l&&l.lockRef)}; }catch(e){ return {error:e.message}; } }),
    B.page.evaluate(async ()=>{ try{ const l=await acquireCashClosureLock(); return {ok:!!(l&&l.ok), conRef:!!(l&&l.lockRef)}; }catch(e){ return {error:e.message}; } }),
  ]);
  const conseguidos = intentos.filter(x=>x.ok).length;
  ok('2. Cierre de caja: solo un dispositivo se lleva el cerrojo', conseguidos===1, 'lo consiguieron '+conseguidos+' → '+JSON.stringify(intentos));
  await A.page.close(); await B.page.close();
}

/* ═══ 3. Una reserva entra por la web mientras el panel está abierto ═ */
{
  const CODE='COBRO003';
  const A=await dispositivo(); await arrancar(A,CODE);
  await new Promise(r=>setTimeout(r,2500));
  await A.page.evaluate(()=>{ DB.reservations=[]; DB.tables=[{id:1,name:'Mesa 1',zona:'Salón',plazas:4}]; saveDB();
    currentFolder='sala'; navigate('reservas'); });
  await new Promise(r=>setTimeout(r,2500));
  // Otro dispositivo (la web pública) escribe una reserva en la nube
  const B=await dispositivo(); await arrancar(B,CODE);
  await new Promise(r=>setTimeout(r,2500));
  await B.page.evaluate(()=>{
    DB.reservations=[{id:9001,clientName:'Familia Rodríguez',date:todayStr(),time:'21:30',people:6,status:'confirmada',tableId:1}];
    saveDB();
  });
  await new Promise(r=>setTimeout(r,5000));
  const llego = await A.page.evaluate(()=>({
    enDatos:(DB.reservations||[]).some(r=>r.id===9001),
    enPantalla:(document.getElementById('content')||{}).innerText?.includes('Rodríguez'),
  }));
  ok('3. Una reserva nueva aparece sola en el panel abierto', llego.enDatos && llego.enPantalla, JSON.stringify(llego));
  await A.page.close(); await B.page.close();
}

for(const c of contextos){ try{ await c.close(); }catch(e){} }
await browser.close();
console.log('\n'+'─'.repeat(60));
const mal=res.filter(r=>!r.c);
console.log(mal.length?`❌ ${mal.length} de ${res.length} fallaron`:`✅ los ${res.length} escenarios pasaron`);
