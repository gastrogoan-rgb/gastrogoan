import puppeteer from 'puppeteer-core';
const S = process.argv[2];
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox'],headless:true});
const W = (process.argv[3]||'1280x800,820x1180,390x844').split(',').map(s=>s.split('x').map(Number));
for(const [w,h] of W){
  const page = await browser.newPage();
  await page.setViewport({width:w,height:h,isMobile:w<500,hasTouch:w<1000,deviceScaleFactor:1});
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
  await page.goto('http://localhost:8950/dist/index.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{
    localStorage.setItem('gastrogoan_license_v1',JSON.stringify({code:'TPVCAP01',tenantId:ggBizTenantId('TPVCAP01')}));
    localStorage.setItem('gastrogoan_owner_login','1');
    localStorage.setItem('gastrogoan_access_session',JSON.stringify({type:'owner',ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted','1');
    localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
  });
  await page.reload({waitUntil:'domcontentloaded'}); await new Promise(r=>setTimeout(r,2200));
  await page.evaluate(()=>{
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
    Object.assign(DB.business,{netlifySetupDone:true,extConnPromptSeen:true,tourSeen:true,categoryIconHintSeen:true});
    DB.business.ownFirebase={apiKey:'fake',databaseURL:'https://fake-default-rtdb.firebaseio.com'};
    DB.tables.length=0; DB.tpvOrders.length=0; DB.cartas.length=0;
    const z=['Salón','Salón','Salón','Salón','Salón','Salón','Terraza','Terraza','Terraza','Terraza','Barra','Barra'];
    z.forEach((zona,i)=>DB.tables.push({id:i+1,name:`Mesa ${i+1}`,zona,plazas:[2,4,4,6,2,8,4,4,2,6,2,2][i]}));
    let pid=100, sid=10;
    const pl=(n,p,al)=>({id:pid++,nombre:n,precio:p,disponible:true,alergenos:al||''});
    const carta={id:1,nombre:'Carta del día',secciones:[
      {id:sid++,nombre:'Entrantes',icono:'ic:none',platos:[pl('Croquetas de jamón ibérico',9.5),pl('Ensalada de burrata y tomate',12),pl('Patatas bravas',6.5),pl('Pulpo a la gallega',16.5)]},
      {id:sid++,nombre:'Principales',icono:'ic:none',platos:[pl('Solomillo al Pedro Ximénez',22),pl('Lubina a la espalda',21.5),pl('Arroz de bogavante',26),pl('Hamburguesa de ternera',14)]},
      {id:sid++,nombre:'Postres',icono:'ic:none',platos:[pl('Tarta de queso al horno',6.5),pl('Brownie con helado',6)]},
    ]};
    const bebidas={id:2,nombre:'Bebidas',tipo:'bebida',secciones:[{id:sid++,nombre:'Cervezas y vinos',icono:'ic:none',platos:[pl('Caña de cerveza',2.5),pl('Copa de Ribera del Duero',4.5),pl('Agua mineral',2)]}]};
    DB.cartas.push(carta,bebidas); DB.activeCartaIds=[1,2];
    const now=Date.now();
    const L=(n,p,q,tanda,estado,marchada,bebida)=>({lineId:genId(),platoId:pid++,recipeId:null,name:n,price:p,qty:q,tanda,estado,marchada,bebida:!!bebida,notas:''});
    const ord=(id,t,mins,items,pax,extra)=>DB.tpvOrders.push(Object.assign({id,tableId:t,tipo:'mesa',status:'abierta',pax,items,tandas:[...new Set(items.map(i=>i.tanda))],createdAt:new Date(now-mins*60000).toISOString()},extra||{}));
    ord(900,1,12,[L('Croquetas de jamón ibérico',9.5,2,'Entrantes',null,0),L('Caña de cerveza',2.5,2,'Bebidas',null,0,true)],2);
    ord(901,2,34,[L('Solomillo al Pedro Ximénez',22,2,'Principales','cocina',2),L('Ensalada de burrata y tomate',12,1,'Entrantes','entregado',1)],3);
    ord(902,3,71,[L('Arroz de bogavante',26,2,'Principales','entregado',2),L('Copa de Ribera del Duero',4.5,2,'Bebidas','entregado',2,true)],2);
    ord(903,4,5,[],4);
    ord(904,7,48,[L('Hamburguesa de ternera',14,3,'Principales','preparando',3),L('Patatas bravas',6.5,2,'Entrantes','entregado',2)],5);
    ord(905,11,95,[L('Caña de cerveza',2.5,4,'Bebidas','entregado',4,true)],2);
    ord(906,9,20,[L('Pulpo a la gallega',16.5,1,'Entrantes','cocina',1),L('Lubina a la espalda',21.5,1,'Principales',null,0)],2);
    const T=(id,tipo,nom,mins,time,items,extra)=>DB.tpvOrders.push(Object.assign({id,tableId:null,tipo,status:'abierta',pax:null,clienteNombre:nom,time,items,tandas:['Principales'],createdAt:new Date(now-mins*60000).toISOString(),date:todayStr()},extra||{}));
    T(950,'takeaway','Marta Ruiz',8,null,[L('Hamburguesa de ternera',14,2,'Principales',null,0)],{pagado:true});
    T(951,'delivery','Familia Soler',3,null,[L('Arroz de bogavante',26,1,'Principales','cocina',1)],{clienteDireccion:'C/ Mayor 14, 3º B',metodoPagoLocal:'efectivo'});
    T(952,'takeaway','Pau Vidal',2,'13:00',[L('Pulpo a la gallega',16.5,1,'Entrantes',null,0)],{});
    T(953,'takeaway','Lucía Gómez',1,'21:00',[L('Croquetas de jamón ibérico',9.5,2,'Entrantes',null,0)],{status:'pendiente-online',origenOnline:true,clientRef:'ABCD1234EFGH',clienteTelefono:'612345678',notas:'Sin gluten, por favor'});
    saveDB();
  });
  const sh = async (n)=> page.screenshot({path:`${S}/tpv-${n}-${w}.png`});
  const total = await page.evaluate(()=>TOUR_STEPS.length);
  await page.evaluate(()=>{ startAppTour(); });
  const quiero = (process.argv[4]||'0,5,13,17,22,26,31,37').split(',').map(Number);
  for(let i=0;i<total;i++){
    await new Promise(r=>setTimeout(r,i===0?900:1100));
    if(quiero.includes(i)) await page.screenshot({path:`${S}/tour-${String(i).padStart(2,'0')}-${w}.png`});
    const info = await page.evaluate(()=>{ const b=document.getElementById('tour-bubble'); const r=b&&b.getBoundingClientRect(); const s=document.getElementById('tour-spotlight'); return {t:b&&b.querySelector('h3')&&b.querySelector('h3').textContent, cut:r&&(r.left<0||r.right>innerWidth||r.top<0||r.bottom>innerHeight), centered:b&&b.classList.contains('tour-bubble-centered'), foco:s&&!s.classList.contains('no-target')}; });
    console.log(i, JSON.stringify(info));
    if(i<total-1) await page.evaluate(()=>tourNext());
  }
  console.log(w,'errores:',errs);
  await page.close();
}
await browser.close();
