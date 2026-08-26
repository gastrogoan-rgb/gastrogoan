// Un servicio de verdad: una mesa con 14 líneas, varias tandas, y la
// pantalla de cocina con 8 comandas a la vez. Es donde la app se usa con
// prisa y donde un defecto cuesta dinero.
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox'],headless:true});
const hallazgos=[];
for(const T of [{n:'MÓVIL',w:390,h:844},{n:'TABLET',w:768,h:1024}]){
  const page = await browser.newPage();
  await page.setViewport({width:T.w,height:T.h,isMobile:T.w<500,hasTouch:true});
  await page.setCacheEnabled(false);
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto('http://localhost:8950/index.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{
    localStorage.setItem('gastrogoan_license_v1',JSON.stringify({code:'SERVI001',tenantId:ggBizTenantId('SERVI001')}));
    localStorage.setItem('gastrogoan_owner_login',JSON.stringify({user:'x',authKey:'k',pinHash:'h'}));
    localStorage.setItem('gastrogoan_access_session',JSON.stringify({type:'owner',ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  });
  await page.reload({waitUntil:'domcontentloaded'}); await new Promise(r=>setTimeout(r,2400));
  await page.evaluate(()=>{
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
    Object.assign(DB.business,{netlifySetupDone:true,extConnPromptSeen:true,tourSeen:true,categoryIconHintSeen:true});
    for(let i=0;i<8;i++) DB.tables.push({id:i+1,name:`Mesa ${i+1}`,zona:i<4?'Salón':'Terraza',plazas:4});
    const platos=['Croquetas caseras de jamón ibérico','Ensalada de burrata y tomate','Solomillo al Pedro Ximénez',
      'Lubina a la espalda con verduras','Arroz de bogavante','Tarta de queso al horno','Ribera del Duero Crianza','Caña de cerveza'];
    // Una mesa bien cargada, con tandas
    const items=[];
    for(let i=0;i<14;i++) items.push({lineId:genId(),platoId:i,recipeId:i,name:platos[i%platos.length],
      price:[9.5,12,28.5,22,24,7.5,19,2.5][i%8], qty:(i%3)+1, tanda:i<5?'Primeros':'Segundos',
      notas:i%4===0?'Sin cebolla, alergia leve':'', estado:i<3?'entregado':'pendiente', marchada:i<5});
    DB.tpvOrders.push({id:9000,tableId:1,tipo:'mesa',status:'abierta',items,tandas:['Primeros','Segundos'],
      createdAt:new Date().toISOString(),comensales:6});
    // Y ocho comandas más en cocina
    for(let k=1;k<8;k++){
      const it=[];
      for(let i=0;i<4;i++) it.push({lineId:genId(),platoId:i,recipeId:i,name:platos[(i+k)%platos.length],
        price:12,qty:1,tanda:'Primeros',notas:'',estado:'pendiente',marchada:true});
      DB.tpvOrders.push({id:9000+k,tableId:k+1,tipo:'mesa',status:'abierta',items:it,tandas:['Primeros'],
        createdAt:new Date().toISOString(),comensales:2});
    }
    saveDB();
  });

  for(const [nombre, prep] of [
    ['TPV con 8 mesas ocupadas', `currentFolder='sala'; navigate('tpv');`],
    ['Comanda de mesa con 14 líneas', `currentFolder='sala'; navigate('tpv'); openTableOrder(1);`],
    ['Pantalla de cocina con 8 comandas', `currentFolder='cocina'; navigate('comandascocina');`],
  ]){
    const errAntes=errs.length;
    const r = await page.evaluate(async (prep)=>{
      if(typeof closeModal==='function') closeModal();
      eval(prep);
      await new Promise(r=>setTimeout(r,600));
      const raiz = document.querySelector('.modal-overlay') || document.getElementById('content');
      const out={cortados:[],chicos:[],solapes:0};
      out.scrollH = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      raiz.querySelectorAll('*').forEach(e=>{
        const rr=e.getBoundingClientRect(); if(!rr.width||!rr.height) return;
        const cs=getComputedStyle(e);
        if(cs.visibility==='hidden') return;
        if(!(cs.overflowX==='auto'||cs.overflowX==='scroll') && !(cs.overflow==='visible'&&cs.overflowX==='visible')){
          if(e.scrollWidth>e.clientWidth+3 && e.clientWidth>0){
            const t=(e.textContent||'').trim().replace(/\s+/g,' ').slice(0,44);
            if(t) out.cortados.push(`${e.clientWidth}px de ${e.scrollWidth}px  "${t}"`);
          }
        }
      });
      raiz.querySelectorAll('button,[onclick]').forEach(e=>{
        const rr=e.getBoundingClientRect(); if(!rr.width||!rr.height) return;
        if(rr.height<26 || (rr.height<32 && rr.width<140)) out.chicos.push(`${Math.round(rr.width)}×${Math.round(rr.height)} "${(e.textContent||e.tagName).trim().slice(0,26)}"`);
      });
      // Se confirma con elementFromPoint: la geometría sola da falsas
      // alarmas con listas que se desplazan (un botón recortado parece
      // estar encima de otro sin estarlo).
      const bts=[...raiz.querySelectorAll('button')].filter(e=>{const r2=e.getBoundingClientRect(); return r2.width>0&&r2.height>0;}).slice(0,70);
      const visibleEnSuCentro = e => {
        const r2=e.getBoundingClientRect();
        const cx=r2.left+r2.width/2, cy=r2.top+r2.height/2;
        if(cy<0||cy>window.innerHeight||cx<0||cx>window.innerWidth) return false;
        const enPunto=document.elementFromPoint(cx,cy);
        return !!enPunto && (enPunto===e || e.contains(enPunto));
      };
      for(let i=0;i<bts.length;i++) for(let j=i+1;j<bts.length;j++){
        const a=bts[i].getBoundingClientRect(), b=bts[j].getBoundingClientRect();
        if(a.left<b.right-2&&b.left<a.right-2&&a.top<b.bottom-2&&b.top<a.bottom-2){
          if(visibleEnSuCentro(bts[i]) && visibleEnSuCentro(bts[j])) out.solapes++;
        }
      }
      return out;
    }, prep);
    const clave=`${T.n} · ${nombre}`;
    if(errs.length>errAntes) hallazgos.push([clave,'ERROR JS',errs[errs.length-1].slice(0,90)]);
    if(r.scrollH>1) hallazgos.push([clave,'SCROLL HORIZONTAL',`${r.scrollH}px`]);
    if(r.solapes) hallazgos.push([clave,'BOTONES QUE SE PISAN',`${r.solapes} pares`]);
    [...new Set(r.cortados)].slice(0,3).forEach(x=>hallazgos.push([clave,'TEXTO CORTADO',x]));
    [...new Set(r.chicos)].slice(0,3).forEach(x=>hallazgos.push([clave,'OBJETIVO PEQUEÑO',x]));
  }
  await page.close();
}
await browser.close();
console.log('═'.repeat(64));
if(!hallazgos.length) console.log('✅ el servicio con mesas llenas se ve bien');
else hallazgos.forEach(([c,t,d])=>console.log(`❌ ${c}\n     ${t}: ${d}`));
console.log('─'.repeat(64)); console.log(hallazgos.length+' hallazgos');
