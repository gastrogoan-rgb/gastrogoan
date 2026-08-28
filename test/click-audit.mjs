// Pulsa TODOS los botones de TODAS las pantallas y caza los que fallan.
// El análisis estático solo comprueba que la función exista; esto comprueba
// que al pulsarla no reviente a mitad, que es lo que hace que un botón
// "no haga nada" (la pantalla se queda como estaba y no hay ningún aviso).
import puppeteer from 'puppeteer-core';

const VIEWS = [
  ['home',null], ['folder',null],
  ['idr','cocina'], ['megalista','cocina'], ['proveedores','cocina'], ['escandallo','cocina'], ['fichas','cocina'],
  ['carta','cocina'], ['stock','cocina'], ['pedidos','cocina'], ['limpieza','cocina'],
  ['personal','cocina'], ['horarios','cocina'], ['comandascocina','cocina'], ['chat','cocina'],
  ['distribucion','cocina'],                       // <-- faltaba en el recorrido
  ['tpv','sala'], ['reservas','sala'], ['clientes','sala'], ['carta','sala'],
  ['escandallo','sala'], ['stock','sala'], ['megalista','sala'], ['limpieza','sala'],
  ['personal','sala'], ['horarios','sala'], ['distribucion','sala'], ['togo','sala'],
  ['dashboard','gestion'], ['economia','gestion'], ['minegocio','gestion'],
];

// Botones que NO se pulsan: sacan de la app o borran cosas de forma que
// invalidan el resto del recorrido. No es que estén sin probar — es que su
// efecto es irse, y entonces ya no hay nada más que auditar.
const NO_PULSAR = /logout|cerrarSesion|closeSession|clearAccessSession|setLang\(|resetApp|wipe|factoryReset|downloadFullBackup|restoreBackup|switchBusiness|showBusinessSelectScreen|openCloudWizard|saveOwnFirebase/i;

const browser = await puppeteer.launch({
  executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--no-sandbox'], headless:true });

const fallos = [];
let pulsados = 0;

const page = await browser.newPage();
await page.setViewport({width:1280,height:900});

let DONDE = 'arranque';

await page.goto('http://localhost:8950/index.html',{waitUntil:'domcontentloaded'});
await page.evaluate(()=>{
  Object.assign(DB.business,{netlifySetupDone:true,extConnPromptSeen:true,tourSeen:true,categoryIconHintSeen:true});
  DB.business.ownFirebase={apiKey:'fake',databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  localStorage.setItem('gastrogoan_license_v1',JSON.stringify({code:'CLICKAUD',tenantId:ggBizTenantId('CLICKAUD')}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session',JSON.stringify({type:'owner',ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2300));

// Semilla realista + red de seguridad para poder pulsar sin que la página se vaya
await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  const eid=genId(), eid2=genId();
  DB.employees.push({id:eid,name:'Ana',area:'cocina',active:true,activo:true,color:'#DF7039',rol:'Cocinera'});
  DB.employees.push({id:eid2,name:'Luis',area:'sala',active:true,activo:true,color:'#4A5D4E',rol:'Camarero'});
  DB.tables.push({id:1,name:'Mesa 1',zona:'Salón',plazas:4},{id:2,name:'Mesa 2',zona:'Salón',plazas:2});
  const ingId=genId();
  DB.ingredients.push({id:ingId,name:'Pollo',category:'Carnes',area:'cocina',unit:'g',price:0.006,packQty:1000,packPrice:6,supplier:'Prov',activo:true});
  DB.providers.push({id:genId(),nombre:'Prov',area:'cocina',diasEntrega:[],gastoEnvio:0});
  const rid=genId();
  DB.recipes.push({id:rid,name:'Pollo asado',area:'cocina',isBase:false,price:12,ivaPct:10,category:'Principales',
                   ingredients:[{type:'ingredient',ingredientId:ingId,qty:250,merma:5}]});
  const cartaId=genId();
  DB.cartas.push({id:cartaId,nombre:'CARTA',area:'cocina',horario:defaultItemHorario(),
    secciones:[{id:genId(),nombre:'Principales',platos:[{id:genId(),recipeId:rid,nombre:'Pollo asado',precio:12,ivaPct:10,disponible:true}]}]});
  DB.activeCartaIds=[cartaId];
  DB.sales.push({id:genId(),date:todayStr(),createdAt:new Date().toISOString(),total:12,subtotal:12,propina:0,tipo:'mesa',metodoPago:'Efectivo',items:[{name:'Pollo asado',price:12,qty:1,ivaPct:10}]});
  DB.reservations.push({id:genId(),clientName:'Cliente',date:todayStr(),time:'21:00',people:2,status:'confirmada',tableId:1});
  DB.clients.push({id:genId(),name:'Cliente',phone:'600111222'});
  DB.turnos.push({id:genId(),employeeId:eid,fecha:todayStr(),tipo:'M',desde:'09:00',hasta:'17:00'});
  DB.limpieza.tareas.push({id:genId(),area:'Campana',producto:'Desengrasante',tipo:'mensual',diaMes:new Date().getDate(),responsableId:eid,zona:'cocina'});
  DB.ge.fijos.push({id:genId(),concepto:'Alquiler',importe:1200,iva:21,categoria:'ALQUILER'});
  DB.ge.variables.push({id:genId(),concepto:'Compra',importe:300,iva:10,fecha:todayStr(),categoria:'MATERIA PRIMA'});
  saveDB();
  // Nada de recargas, ventanas nuevas ni diálogos de impresión a mitad de la prueba
  window.__reloadPedido = false;
  location.reload = () => { window.__reloadPedido = true; };
  window.open = () => null;
  window.print = () => {};
  // No confirmar nada destructivo: interesa si el botón revienta ANTES de preguntar
  window.confirmModal = async () => false;
  window.alertModal   = async () => {};
  window.__errs = [];
  window.addEventListener('error', e => window.__errs.push(e.message));
  window.__snapshot = JSON.stringify(DB);
});

for(const [view, folder] of VIEWS){
  // Cuántos botones hay en esta pantalla
  const n = await page.evaluate(({view,folder})=>{
    DB = JSON.parse(window.__snapshot);
    if(folder) currentFolder = folder;
    navigate(view);
    return [...document.querySelectorAll('#content [onclick]')]
             .filter(e => !!(e.offsetParent || e.getClientRects().length)).length;
  },{view,folder});
  await new Promise(r=>setTimeout(r,120));

  for(let i=0;i<n;i++){
    const info = await page.evaluate(({view,folder,i,NO})=>{
      DB = JSON.parse(window.__snapshot);
      if(folder) currentFolder = folder;
      navigate(view);
      // Solo lo que un usuario puede ver y tocar. La app mantiene cada
      // pantalla en su propia sección oculta, así que sin este filtro se
      // acababan pulsando botones de vistas invisibles (p.ej. el editor de
      // la carta estando en Dashboard), que nadie puede pulsar de verdad.
      const visible = e => !!(e.offsetParent || e.getClientRects().length);
      const els=[...document.querySelectorAll('#content [onclick]')].filter(visible);
      const el=els[i];
      if(!el) return {saltado:'ya no existe'};
      const code = el.getAttribute('onclick')||'';
      if(new RegExp(NO,'i').test(code)) return {saltado:'excluido', code};
      const antes = document.getElementById('content').innerHTML;
      window.__errs.length = 0;
      let err=null;
      try{ el.click(); }catch(e){ err = e.message; }
      if(!err && window.__errs.length) err = window.__errs[0];
      const despues = document.getElementById('content').innerHTML;
      const hayModal = !!document.querySelector('.modal-overlay');
      if(hayModal && typeof closeModal==='function') closeModal();
      return {code: code.slice(0,80), err, cambio: antes!==despues, hayModal};
    },{view,folder,i,NO:NO_PULSAR.source});
    
    if(info.saltado) continue;
    pulsados++;
    DONDE = `${view}${folder?'/'+folder:''} → ${info.code}`;
    if(info.err) fallos.push({donde:DONDE, err:'EXCEPCIÓN AL PULSAR: '+info.err});
  }
  process.stdout.write('.');
}
console.log('');
await page.close(); await browser.close();

console.log(`\n=== ${pulsados} botones pulsados en ${VIEWS.length} pantallas ===`);
if(!fallos.length){ console.log('✅ Ninguno lanzó un error.'); }
else{
  console.log(`❌ ${fallos.length} con problemas:\n`);
  const vistos=new Set();
  for(const f of fallos){
    const k=f.donde+f.err; if(vistos.has(k)) continue; vistos.add(k);
    console.log(`  · ${f.donde}\n      ${f.err}\n`);
  }
}
