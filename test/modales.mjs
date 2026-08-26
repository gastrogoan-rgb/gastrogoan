// Las ventanas emergentes en MÓVIL: que quepan, que se puedan desplazar
// si son largas, y que los botones de acción queden al alcance.
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox'],headless:true});
const page = await browser.newPage();
await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
await page.setCacheEnabled(false);
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:8950/index.html',{waitUntil:'domcontentloaded'});
await page.evaluate(()=>{
  localStorage.setItem('gastrogoan_license_v1',JSON.stringify({code:'MODAL001',tenantId:ggBizTenantId('MODAL001')}));
  localStorage.setItem('gastrogoan_owner_login',JSON.stringify({user:'x',authKey:'k',pinHash:'h'}));
  localStorage.setItem('gastrogoan_access_session',JSON.stringify({type:'owner',ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
});
await page.reload({waitUntil:'domcontentloaded'}); await new Promise(r=>setTimeout(r,2400));
await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business,{netlifySetupDone:true,extConnPromptSeen:true,tourSeen:true,categoryIconHintSeen:true,name:'Restaurante de Prueba'});
  const eid=genId();
  DB.employees.push({id:eid,name:'Ana Fernández',rol:'Jefa de cocina',area:'cocina',active:true,color:'#DF7039',pin:'H2:x'});
  DB.tables.push({id:1,name:'Mesa 1',zona:'Salón',plazas:4});
  const ing=genId();
  DB.ingredients.push({id:ing,name:'Solomillo de ternera',category:'Carnes',area:'cocina',unit:'g',price:0.024,packQty:1000,packPrice:24,supplier:'Prov',activo:true});
  DB.providers.push({id:genId(),nombre:'Cárnicas del Norte',area:'cocina',diasEntrega:[],gastoEnvio:0});
  const rid=genId();
  DB.recipes.push({id:rid,name:'Solomillo al Pedro Ximénez',area:'cocina',isBase:false,price:22,ivaPct:10,category:'Principales',ingredients:[{type:'ingredient',ingredientId:ing,qty:220,merma:8}]});
  DB.clients.push({id:genId(),name:'Familia Rodríguez',phone:'600111222'});
  DB.reservations.push({id:genId(),clientName:'Familia Rodríguez',date:todayStr(),time:'21:30',people:6,status:'confirmada',tableId:1});
  saveDB();
});

// Modales representativos, con la vista que hay que abrir antes
const CASOS = [
  ['Nuevo ingrediente',   'megalista','cocina', 'openIngredientModal()'],
  ['Nuevo proveedor',     'proveedores','cocina','openProviderModal()'],
  ['Nuevo plato',         'escandallo','cocina', 'openRecipeModal()'],
  ['Nueva elaboración',   'escandallo','cocina', 'openRecipeModal(null, true)'],
  ['Ficha de empleado',   'horarios','cocina',   `openEmployeePersonalCard(${'DB.employees[0].id'})`],
  ['Comanda de mesa',     'tpv','sala',          'openTableOrder(1)'],
  ['Nueva reserva',       'reservas','sala',     'openReservationModal()'],
  ['Editar reserva',      'reservas','sala',     'openReservationModal(DB.reservations[0].id)'],
  ['Cobrar / caja',       'tpv','sala',          'openCashClosureModal ? openCashClosureModal() : openCierreCajaModal()'],
  ['Nuevo cliente',       'clientes','sala',     'openClientModal()'],
  ['Confirmación',        'megalista','cocina',  `confirmModal('¿Seguro que quieres continuar con esta acción que tiene un texto razonablemente largo?')`],
  ['Icono de carpeta',    'megalista','cocina',  `openCategoryIconModal('Carnes','Carnes','renderMegalista','ingredient')`],
];

const hallazgos=[];
for(const [nombre, vista, carpeta, llamada] of CASOS){
  const r = await page.evaluate(async ({vista,carpeta,llamada})=>{
    if(typeof closeModal==='function') closeModal();
    currentFolder=carpeta; navigate(vista);
    await new Promise(r=>setTimeout(r,300));
    try{ eval(llamada); }catch(e){ return {error:e.message}; }
    await new Promise(r=>setTimeout(r,450));
    const ov = document.querySelector('.modal-overlay');
    if(!ov) return {sinModal:true};
    const box = ov.querySelector('.modal-box') || ov.firstElementChild;
    if(!box) return {sinCaja:true};
    const rb = box.getBoundingClientRect();
    const cs = getComputedStyle(box);
    // ¿Los botones de acción quedan dentro de la pantalla?
    const pie = box.querySelector('.modal-footer');
    let pieVisible = true, pieY = null;
    if(pie){ const rp=pie.getBoundingClientRect(); pieY=Math.round(rp.bottom); pieVisible = rp.top < window.innerHeight; }
    // Objetivos pequeños dentro del modal
    const chicos=[];
    box.querySelectorAll('button,input,select,[onclick]').forEach(e=>{
      const rr=e.getBoundingClientRect(); if(!rr.width||!rr.height) return;
      const esCasilla = e.tagName==='INPUT' && (e.type==='checkbox'||e.type==='radio');
      const malo = esCasilla ? (rr.height<24) : (rr.height<26 || (rr.height<32 && rr.width<140));
      if(malo) chicos.push(`${Math.round(rr.width)}×${Math.round(rr.height)} "${(e.textContent||e.tagName).trim().slice(0,20)}"`);
    });
    return {
      ancho: Math.round(rb.width), alto: Math.round(rb.height),
      seSaleAncho: rb.right > window.innerWidth+1 || rb.left < -1,
      masAltoQuePantalla: rb.height > window.innerHeight,
      puedeDesplazarse: cs.overflowY==='auto' || cs.overflowY==='scroll' || box.scrollHeight<=box.clientHeight+2,
      pieVisible, pieY, pantalla: window.innerHeight,
      chicos: chicos.slice(0,3),
    };
  }, {vista,carpeta,llamada});

  if(r.error){ hallazgos.push([nombre, 'NO ABRE', r.error]); continue; }
  if(r.sinModal){ hallazgos.push([nombre, 'NO ABRE', 'no apareció ninguna ventana']); continue; }
  if(r.seSaleAncho) hallazgos.push([nombre, 'SE SALE A LO ANCHO', `${r.ancho}px en pantalla de 390`]);
  if(r.masAltoQuePantalla && !r.puedeDesplazarse) hallazgos.push([nombre, 'MÁS ALTA QUE LA PANTALLA Y NO SE DESPLAZA', `${r.alto}px de ${r.pantalla}`]);
  if(!r.pieVisible) hallazgos.push([nombre, 'BOTONES FUERA DE PANTALLA', `el pie acaba en ${r.pieY}px de ${r.pantalla}`]);
  r.chicos.forEach(c=>hallazgos.push([nombre, 'OBJETIVO PEQUEÑO', c]));
}
await browser.close();
console.log('═'.repeat(64));
if(!hallazgos.length) console.log('✅ las ventanas emergentes se comportan bien en móvil');
else hallazgos.forEach(([n,t,d])=>console.log(`❌ ${n}\n     ${t}: ${d}`));
if(errs.length) console.log('\nERRORES JS:', errs.slice(0,4));
