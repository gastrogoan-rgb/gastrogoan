// DOS dispositivos reales sincronizando contra un Firebase de verdad (el
// emulador oficial). Es el escenario que las pruebas locales NO cubrían y
// por el que se colaron los bugs de esta semana.
import puppeteer from 'puppeteer-core';

const CODE = 'EMUTEST1';
const DBURL = 'http://127.0.0.1:9000/?ns=demo-gastrogoan';
const browser = await puppeteer.launch({
  executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--no-sandbox'], headless:true });

// Sirve el SDK real desde local (gstatic está bloqueado aquí) y apunta la
// app al emulador en vez de a la nube de un negocio real.
async function nuevoDispositivo(nombre){
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  const errs=[]; page.on('pageerror',e=>errs.push(nombre+': '+e.message));
  await page.setRequestInterception(true);
  page.on('request', req => {
    const u = req.url();
    const m = u.match(/gstatic\.com\/firebasejs\/[\d.]+\/(firebase-[a-z-]+\.js)/);
    if(m) return req.continue({url: 'http://localhost:8951/__sdk/'+m[1]});
    req.continue();
  });
  page.on('console', m => { if(m.type()==='error' && !/ERR_|Failed to load resource/.test(m.text())) errs.push(nombre+' [consola]: '+m.text()); });
  return {page, errs, nombre};
}

async function arrancar(d, {employeeId} = {}){
  await d.page.goto('http://localhost:8951/index.html',{waitUntil:'domcontentloaded'});
  await d.page.evaluate(async ({code, dburl, employeeId})=>{
    localStorage.setItem('gastrogoan_license_v1',JSON.stringify({code, tenantId: ggBizTenantId(code)}));
    localStorage.setItem('gastrogoan_owner_pass_prompted','1');
    if(employeeId){
      localStorage.setItem('gastrogoan_access_session',JSON.stringify({type:'employee',employeeId,area:'cocina',ts:Date.now()}));
    }else{
      localStorage.setItem('gastrogoan_owner_login',JSON.stringify({user:'jefe',authKey:'k',pinHash:'h'}));
      localStorage.setItem('gastrogoan_access_session',JSON.stringify({type:'owner',ts:Date.now()}));
    }
    Object.assign(DB.business,{netlifySetupDone:true,extConnPromptSeen:true,tourSeen:true,categoryIconHintSeen:true});
    DB.business.ownFirebase = {apiKey:'fake-api-key', databaseURL: dburl};
    await saveDB();
  }, {code:CODE, dburl:DBURL, employeeId});
  await d.page.reload({waitUntil:'domcontentloaded'});
  await new Promise(r=>setTimeout(r,3000));
  await d.page.evaluate(()=>{
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  });
}

const A = await nuevoDispositivo('TABLET');
const B = await nuevoDispositivo('MOVIL');
await arrancar(A);
await arrancar(B);

const estado = async d => d.page.evaluate(()=>({
  badge: (document.getElementById('sync-badge')||{}).textContent,
  cloudRefOk: typeof cloudRef !== 'undefined' && !!cloudRef,
}));
console.log('TABLET:', await estado(A));
console.log('MOVIL :', await estado(B));

// --- La prueba: la tablet crea un empleado CON trabajo asignado ---
await A.page.evaluate(()=>{
  DB.employees.push({id:777,name:'ANA_DESDE_TABLET',rol:'Cocinera',area:'cocina',active:true,color:'#DF7039'});
  // Su ficha de distribución: es lo que tiene que quedar sincronizado en el
  // móvil ANTES del borrado para reproducir el fallo de verdad.
  // Con contenido real: Firebase no guarda objetos vacíos, así que una
  // ficha vacía ni siquiera viaja (comprobado con el emulador).
  DB.workDistribution[777] = {platos:['Caldo base'], produccion:{'0':[{id:1,text:'Preparar caldo'}]}, doneDates:{}, tareasUnicas:{}};
  saveDB();
});
await new Promise(r=>setTimeout(r,4000));
const llego = await B.page.evaluate(()=> ({
  empleado: (DB.employees||[]).some(e=>e.id===777 && e.name==='ANA_DESDE_TABLET'),
  fichaTrabajo: !!(DB.workDistribution||{})[777],
}));
console.log(llego.empleado && llego.fichaTrabajo ? '✅ empleado y su ficha de trabajo llegaron al móvil' : '❌ NO llegó: '+JSON.stringify(llego));
// Que el móvil DÉ POR SINCRONIZADO lo recibido es lo que arma el fallo:
// al borrarlo la tablet, la fusión ve "aquí no se ha tocado" y se queda
// con lo que manda la nube... que ya no existe.
await B.page.evaluate(async ()=>{ currentFolder='cocina'; navigate('distribucion'); await new Promise(r=>setTimeout(r,400)); });

// --- Y el bug de esta semana: borrarlo en la tablet, ¿rompe el móvil? ---
await A.page.evaluate(()=>{
  DB.employees = DB.employees.filter(e=>e.id!==777);
  delete DB.workDistribution[777];
  saveDB();
});
await new Promise(r=>setTimeout(r,4000));
const trasBorrado = await B.page.evaluate(async ()=>{
  const errores=[];
  window.addEventListener('error', e=>errores.push(e.message));
  // Se vacía la pantalla primero: si el redibujado revienta, se queda
  // vacía y se nota. Antes se daba por buena la de la vez anterior.
  const box = document.getElementById('distribucion-content');
  if(box) box.innerHTML = '';
  const claves = Object.keys(DB.workDistribution||{});
  const fantasma = claves.filter(k => DB.workDistribution[k] === undefined || DB.workDistribution[k] === null);
  currentFolder='cocina';
  try{ renderDistribucion(); }catch(e){ errores.push('EXCEPCIÓN: '+e.message); }
  await new Promise(r=>setTimeout(r,400));
  return {
    pintó: (document.getElementById('distribucion-content')||{}).innerHTML?.length > 0,
    errores,
    clavesEnElMapa: claves,
    fantasma,
  };
});
console.log('MOVIL tras el borrado:', trasBorrado);
console.log(trasBorrado.pintó && !trasBorrado.errores.length ? '✅ Distribución del Trabajo sigue viva' : '❌ se rompió');

console.log('\nERRORES JS:', [...A.errs, ...B.errs].length ? [...A.errs,...B.errs] : 'ninguno');
await browser.close();
