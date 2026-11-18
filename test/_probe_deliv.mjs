import puppeteer from 'puppeteer-core';
const W = +process.env.W || 360;
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless:'new', args:['--no-sandbox']});
const page = await browser.newPage();
await page.setViewport({width:W, height:740, deviceScaleFactor:1});
await page.setRequestInterception(true);
page.on('request', r => /firebase|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(code => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
}, 'PROBE00001');
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,2200));
await page.evaluateOnNewDocument((p)=>{window.__PANE=p},process.env.PANE||'comanda');
await page.evaluate((PANE_X)=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate','app-splash'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake', databaseURL:'https://fake-default-rtdb.firebaseio.com'};
  DB.tables.push({id:1, name:'Mesa 1', zona:'Salón', plazas:4});
  const L = (n,p,q,tanda,estado,marchada,extra)=>Object.assign({lineId:genId(),platoId:genId(),recipeId:null,name:n,price:p,qty:q,tanda,estado,marchada,bebida:false,notas:''},extra||{});
  const items=[L('Ensalada',0,1,'Primero','recogido',1,{menuId:5,menuName:'Menú del día'}),L('Bistec con patatas',0,1,'Segundos',null,0,{menuId:5,menuName:'Menú del día'}),L('Flan casero con nata',0,1,'Postres',null,0,{menuId:5,menuName:'Menú del día'}),L('Caña de cerveza',2.5,2,'Bebidas','entregado',2,{bebida:true}),L('Croquetas de jamón ibérico muy largo nombre',9.5,9,'Entrantes',null,0)];
  DB.tpvOrders.push({id:77,tableId:null,tipo:'delivery',status:'abierta',clienteNombre:'M González Anguiano',clienteDireccion:'Calle Larga 4',origenOnline:true,clientRef:'BNQ690ABCDEF',createdAt:new Date().toISOString(),items:[L('Plato único (Plato único: Rodaballo a la brasa, Postre: Batido de vainilla)',14.1,1,'',  'cocina',1,{}),L('Caña de cerveza',2.5,2,'Bebidas','entregado',2,{bebida:true})],tandas:['']});
  let pid=300,sid=50; const pl=(n,p)=>({id:pid++,nombre:n,precio:p,disponible:true,alergenos:''});
  DB.cartas.length=0;
  DB.cartas.push({id:1,nombre:'Carta principal',secciones:[{id:sid++,nombre:'Entrantes',icono:'ic:none',platos:[pl('Croquetas de jamón',9.5),pl('Patatas bravas',6.5),pl('Ensaladilla rusa',7)]},{id:sid++,nombre:'Principales',icono:'ic:none',platos:[pl('Solomillo al Pedro Ximénez',22),pl('Hamburguesa de ternera',14)]}]},{id:2,nombre:'Carta GG Burger',secciones:[{id:sid++,nombre:'Burgers',icono:'ic:none',platos:[pl('Doble queso',11)]}]},{id:3,nombre:'Bebidas',tipo:'bebida',secciones:[{id:sid++,nombre:'Cervezas',icono:'ic:none',platos:[pl('Caña',2.5),pl('Tercio',3.2)]}]});
  DB.activeCartaIds=[1,2,3];
  saveDB(); navigate('tpv'); openTableOrder(null,77); setTpvOrderMobilePane && setTpvOrderMobilePane(PANE_X,77);
}, process.env.PANE||'comanda');
await new Promise(r=>setTimeout(r,800));
if(process.env.SEC){ await page.evaluate(()=>{document.querySelectorAll('.tp-seccion')[1]?.click()}); await new Promise(r=>setTimeout(r,400)); await page.evaluate(()=>{const s=document.getElementById('tp-sel-carta'); if(s){s.selectedIndex=1;s.dispatchEvent(new Event('change',{bubbles:true}))}}); await new Promise(r=>setTimeout(r,300)); await page.evaluate(()=>{document.querySelector('.tp-seccion')?.click()}); await new Promise(r=>setTimeout(r,300)); await page.evaluate(()=>{document.querySelector('.tp-plato-main')?.click()}); await new Promise(r=>setTimeout(r,300)); }
console.log(await page.evaluate(()=>{const p=document.querySelector('.tp-or-pest');const r=document.querySelector('.tp-or-pest-reparto');const cs=getComputedStyle(p),cr=getComputedStyle(r);return JSON.stringify({wrap:cs.flexWrap,w:p.getBoundingClientRect().width,rflex:cr.flex,rw:r.getBoundingClientRect().width,kids:[...p.children].map(c=>c.className+':'+Math.round(c.getBoundingClientRect().width))})}));
await page.screenshot({path:process.env.OUT||'/tmp/claude-0/probe.png'});
await browser.close();
