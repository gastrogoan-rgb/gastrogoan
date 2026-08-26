// Contenido real de un negocio exigente (nombres largos, muchas mesas,
// muchos empleados) en las pantallas más difíciles: móvil pequeño, móvil
// en horizontal y tablet en vertical.
import puppeteer from 'puppeteer-core';
const TAMANOS = [
  {n:'MÓVIL PEQUEÑO (320)', w:320, h:568},
  {n:'MÓVIL HORIZONTAL',    w:844, h:390},
  {n:'TABLET VERTICAL',     w:768, h:1024},
];
const VISTAS = [
  ['tpv','sala'],['reservas','sala'],['clientes','sala'],['carta','cocina'],
  ['megalista','cocina'],['escandallo','cocina'],['stock','cocina'],
  ['horarios','cocina'],['distribucion','cocina'],['limpieza','cocina'],
  ['comandascocina','cocina'],['pedidos','cocina'],['minegocio','gestion'],['dashboard','gestion'],
];
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox'],headless:true});
const hallazgos=[];
for(const T of TAMANOS){
  const page = await browser.newPage();
  await page.setViewport({width:T.w,height:T.h,isMobile:T.w<500,hasTouch:T.w<900});
  await page.setCacheEnabled(false);
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto('http://localhost:8950/index.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{
    localStorage.setItem('gastrogoan_license_v1',JSON.stringify({code:'EXTREM01',tenantId:ggBizTenantId('EXTREM01')}));
    localStorage.setItem('gastrogoan_owner_login',JSON.stringify({user:'x',authKey:'k',pinHash:'h'}));
    localStorage.setItem('gastrogoan_access_session',JSON.stringify({type:'owner',ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  });
  await page.reload({waitUntil:'domcontentloaded'}); await new Promise(r=>setTimeout(r,2400));
  await page.evaluate(()=>{
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
    Object.assign(DB.business,{netlifySetupDone:true,extConnPromptSeen:true,tourSeen:true,categoryIconHintSeen:true,
      name:'Restaurante Casa Manolo y Hermanos — Cocina de Mercado desde 1974'});
    for(let i=0;i<12;i++){
      DB.employees.push({id:1000+i,name:`María del Carmen Fernández-Villaverde ${i}`,rol:'Jefa de partida de cuarto frío',area:i%2?'sala':'cocina',active:true,color:'#DF7039',pin:'H2:x'});
    }
    for(let i=0;i<24;i++) DB.tables.push({id:100+i,name:`Mesa ${i+1} del comedor principal`,zona:i<12?'Salón principal':'Terraza acristalada',plazas:4});
    for(let i=0;i<30;i++){
      DB.ingredients.push({id:2000+i,name:`Solomillo de ternera gallega madurado ${i}`,category:i%3===0?'Carnes y derivados cárnicos':'Pescados y mariscos frescos',
        area:'cocina',unit:'g',price:0.024,packQty:1000,packPrice:24,supplier:'Distribuciones Alimentarias del Norte S.L.',activo:true});
    }
    DB.providers.push({id:genId(),nombre:'Distribuciones Alimentarias del Norte S.L.',area:'cocina',diasEntrega:[],gastoEnvio:0});
    const rid=genId();
    DB.recipes.push({id:rid,name:'Solomillo de ternera al Pedro Ximénez con puré trufado',area:'cocina',isBase:false,price:28.5,ivaPct:10,
      category:'Principales de carne',ingredients:[{type:'ingredient',ingredientId:2000,qty:220,merma:8}]});
    const cid=genId();
    DB.cartas.push({id:cid,nombre:'CARTA DE TEMPORADA OTOÑO-INVIERNO',area:'cocina',horario:defaultItemHorario(),
      secciones:[{id:genId(),nombre:'Principales de carne y caza',platos:[{id:genId(),recipeId:rid,nombre:'Solomillo de ternera al Pedro Ximénez con puré trufado',precio:28.5,ivaPct:10,disponible:true}]}]});
    DB.activeCartaIds=[cid];
    for(let i=0;i<8;i++){
      DB.reservations.push({id:3000+i,clientName:`Familia Rodríguez-Menéndez de la Torre ${i}`,date:todayStr(),time:'21:30',people:6,status:'confirmada',tableId:100});
      DB.clients.push({id:4000+i,name:`Familia Rodríguez-Menéndez de la Torre ${i}`,phone:'600111222',email:'muy.largo.correo@ejemplo-restaurante.com'});
    }
    DB.limpieza.tareas.push({id:genId(),area:'Campana extractora de la cocina caliente',producto:'Desengrasante industrial',tipo:'mensual',diaMes:new Date().getDate(),responsableId:1000,zona:'cocina'});
    saveDB();
  });
  for(const [vista,carpeta] of VISTAS){
    const errAntes=errs.length;
    const r = await page.evaluate(({vista,carpeta})=>{
      currentFolder=carpeta; navigate(vista);
      const c=document.getElementById('content');
      if(!c) return {sinContenido:true};
      const out={cortados:[], solapes:0};
      out.scrollH = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      // Texto cortado por no caber
      c.querySelectorAll('*').forEach(e=>{
        const cs=getComputedStyle(e);
        if(cs.overflowX==='auto'||cs.overflowX==='scroll') return;
        if(cs.overflow==='visible'&&cs.overflowX==='visible') return;
        if(e.scrollWidth>e.clientWidth+3 && e.clientWidth>0){
          const t=(e.textContent||'').trim().replace(/\s+/g,' ').slice(0,40);
          if(t) out.cortados.push(`${e.clientWidth}px de ${e.scrollWidth}px  "${t}"`);
        }
      });
      // Botones que se pisan entre sí
      const bts=[...c.querySelectorAll('button')].filter(e=>{const r2=e.getBoundingClientRect(); return r2.width>0&&r2.height>0;}).slice(0,60);
      for(let i=0;i<bts.length;i++) for(let j=i+1;j<bts.length;j++){
        const a=bts[i].getBoundingClientRect(), b=bts[j].getBoundingClientRect();
        if(a.left<b.right-2&&b.left<a.right-2&&a.top<b.bottom-2&&b.top<a.bottom-2) out.solapes++;
      }
      return out;
    }, {vista,carpeta});
    await new Promise(r=>setTimeout(r,260));
    const clave=`${T.n} · ${vista}/${carpeta}`;
    if(errs.length>errAntes) hallazgos.push([clave,'ERROR JS',errs[errs.length-1].slice(0,90)]);
    if(r.scrollH>1) hallazgos.push([clave,'SCROLL HORIZONTAL',`${r.scrollH}px de más`]);
    if(r.solapes) hallazgos.push([clave,'BOTONES QUE SE PISAN',`${r.solapes} pares`]);
    (r.cortados||[]).slice(0,2).forEach(x=>hallazgos.push([clave,'TEXTO CORTADO',x]));
  }
  await page.close();
}
await browser.close();
console.log('═'.repeat(64));
if(!hallazgos.length) console.log('✅ aguanta contenido largo en las tres pantallas difíciles');
else hallazgos.forEach(([c,t,d])=>console.log(`❌ ${c}\n     ${t}: ${d}`));
console.log('─'.repeat(64)); console.log(hallazgos.length+' hallazgos');
