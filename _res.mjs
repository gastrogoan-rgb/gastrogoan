import puppeteer from 'puppeteer-core';
const S='/tmp/claude-0/-home-user-gastrogoan/9f1abb2c-92fd-5a33-8aab-42cccc1d20dd/scratchpad/';
const tag=process.env.TAG||'r';
const b=await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
for(const [w,h,t,mobile] of [[1366,900,'pc',false],[390,844,'mov',true]]){
 for(const tab of ['reserva','takeaway','mesa']){
  const p=await b.newPage();await p.setViewport({width:w,height:h,isMobile:mobile,hasTouch:mobile});
  await p.setRequestInterception(true);p.on('request',r=>/firebase|gstatic|googleapis|qrserver|githubusercontent|workers.dev/.test(r.url())?r.abort():r.continue());
  await p.goto('http://localhost:8950/reservagastrogoan.html?neg=pubx1',{waitUntil:'domcontentloaded'});await new Promise(r=>setTimeout(r,1500));
  await p.evaluate(tab=>{
   db={ref:()=>({on:()=>{},push:()=>Promise.resolve()})};
   publicId='pubx1';
   DB={business:{name:'GG Burger',brandColor:'#4A5D4E',tiposServicio:{mesa:true,takeaway:true,delivery:true},qrMesa:{activo:true},address:'C/ Major 12, Vic',phone:'938 000 000'},
    cartas:[{id:1,nombre:'Carta',secciones:[{id:10,nombre:'Hamburguesas',platos:[{id:100,nombre:'Smash clásica',precio:11.5,disponible:true,descripcion:'Doble carne, cheddar, pepinillo'},{id:101,nombre:'Cheese & bacon',precio:12.9,disponible:true},{id:102,nombre:'Veggie',precio:10.5,disponible:true}]},{id:11,nombre:'Para picar',platos:[{id:103,nombre:'Aros de cebolla',precio:5.5,disponible:true}]}]}],
    activeCartaIds:[1],menus:[],activeMenuIds:[],reservasResumen:{},mesasOcupadas:{},pedidosResumen:{},cocinaCargaActiva:0,
    tables:[{id:1,name:'Mesa 1',plazas:4}],promos:[],allergens:{}};
   currentTab=tab; renderApp();
  },tab);
  await new Promise(r=>setTimeout(r,1000));
  await p.screenshot({path:S+`${tag}-${t}-${tab}.png`});await p.close();
 }}
await b.close();
