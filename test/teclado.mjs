// Con el teclado del móvil abierto, la pantalla útil se queda en ~45%.
// Si el botón de guardar cae debajo y el formulario no se puede desplazar,
// no hay forma de terminar. Se simula reduciendo el alto de la ventana,
// que es exactamente lo que hace el teclado.
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox'],headless:true});
const page = await browser.newPage();
await page.setCacheEnabled(false);
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
await page.goto('http://localhost:8950/index.html',{waitUntil:'domcontentloaded'});
await page.evaluate(()=>{
  localStorage.setItem('gastrogoan_license_v1',JSON.stringify({code:'TECLA001',tenantId:ggBizTenantId('TECLA001')}));
  localStorage.setItem('gastrogoan_owner_login',JSON.stringify({user:'x',authKey:'k',pinHash:'h'}));
  localStorage.setItem('gastrogoan_access_session',JSON.stringify({type:'owner',ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
});
await page.reload({waitUntil:'domcontentloaded'}); await new Promise(r=>setTimeout(r,2400));
await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business,{netlifySetupDone:true,extConnPromptSeen:true,tourSeen:true,categoryIconHintSeen:true});
  DB.employees.push({id:1,name:'Ana',rol:'Cocinera',area:'cocina',active:true,color:'#DF7039',pin:'H2:x'});
  DB.tables.push({id:1,name:'Mesa 1',zona:'Salón',plazas:4});
  DB.ingredients.push({id:1,name:'Solomillo',category:'Carnes',area:'cocina',unit:'g',price:0.02,packQty:1000,packPrice:20,supplier:'P',activo:true});
  DB.providers.push({id:1,nombre:'Proveedor',area:'cocina',diasEntrega:[],gastoEnvio:0});
  DB.recipes.push({id:1,name:'Solomillo',area:'cocina',price:22,ivaPct:10,category:'Principales',ingredients:[]});
  DB.clients.push({id:1,name:'Cliente',phone:'600'});
  saveDB();
});

// El teclado deja ~380px útiles en un móvil de 844
await page.setViewport({width:390,height:380,isMobile:true,hasTouch:true});
await new Promise(r=>setTimeout(r,600));
await page.evaluate(()=>{ ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove()); });

const CASOS = [
  ['Nuevo ingrediente','megalista','cocina','openIngredientModal()'],
  ['Nuevo proveedor','proveedores','cocina','openProviderModal()'],
  ['Nuevo plato','escandallo','cocina','openRecipeModal()'],
  ['Nuevo cliente','clientes','sala','openClientModal()'],
  ['Nueva reserva','reservas','sala','openReservationModal()'],
];
const hallazgos=[];
for(const [nombre,vista,carpeta,llamada] of CASOS){
  const r = await page.evaluate(async ({vista,carpeta,llamada})=>{
    if(typeof closeModal==='function') closeModal();
    currentFolder=carpeta; navigate(vista);
    await new Promise(r=>setTimeout(r,250));
    try{ eval(llamada); }catch(e){ return {error:e.message}; }
    await new Promise(r=>setTimeout(r,400));
    const ov=document.querySelector('.modal-overlay'); if(!ov) return {sinModal:true};
    const box=ov.querySelector('.modal-box')||ov.firstElementChild;
    const pie=box.querySelector('.modal-footer');
    const cs=getComputedStyle(box);
    const rb=box.getBoundingClientRect();
    // ¿Se puede llegar al pie desplazando dentro del modal?
    let alcanzable=true, comoLlego='cabe';
    if(pie){
      const rp=pie.getBoundingClientRect();
      if(rp.bottom > window.innerHeight+1){
        // ¿el modal se desplaza por dentro?
        const puede = box.scrollHeight > box.clientHeight+2 && (cs.overflowY==='auto'||cs.overflowY==='scroll');
        if(puede){
          box.scrollTop = box.scrollHeight;
          const rp2 = pie.getBoundingClientRect();
          alcanzable = rp2.bottom <= window.innerHeight+2; comoLlego='desplazando dentro';
        } else {
          // ¿o desplazando la página?
          const puedePagina = ov.scrollHeight > ov.clientHeight+2;
          alcanzable = puedePagina; comoLlego = puedePagina ? 'desplazando la capa' : 'NO SE PUEDE';
        }
      }
    }
    return {alto:Math.round(rb.height), pantalla:window.innerHeight, alcanzable, comoLlego,
            overflowY:cs.overflowY, maxH:cs.maxHeight};
  }, {vista,carpeta,llamada});
  if(r.error||r.sinModal){ hallazgos.push([nombre,'NO ABRE', r.error||'sin ventana']); continue; }
  if(!r.alcanzable) hallazgos.push([nombre,'BOTÓN DE GUARDAR INALCANZABLE',
     `modal de ${r.alto}px en ${r.pantalla}px útiles · overflowY=${r.overflowY} maxHeight=${r.maxH}`]);
}
await browser.close();
console.log('═'.repeat(64));
if(!hallazgos.length) console.log('✅ con el teclado abierto se puede terminar cualquier formulario');
else hallazgos.forEach(([n,t,d])=>console.log(`❌ ${n}\n     ${t}\n     ${d}`));
if(errs.length) console.log('\nERRORES JS:', errs.slice(0,3));
