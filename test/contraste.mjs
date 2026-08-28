// Contraste real del texto sobre su fondo. El estándar de accesibilidad
// pide 4.5:1 para texto normal y 3:1 para texto grande. Por debajo de 3:1
// hay gente que sencillamente no lo lee.
import puppeteer from 'puppeteer-core';
const VISTAS=[['tpv','sala'],['reservas','sala'],['clientes','sala'],['comandascocina','cocina'],
  ['carta','cocina'],['idr','cocina'],['megalista','cocina'],['escandallo','cocina'],['stock','cocina'],
  ['horarios','cocina'],['distribucion','cocina'],['limpieza','cocina'],['pedidos','cocina'],
  ['dashboard','gestion'],['economia','gestion'],['minegocio','gestion']];
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox'],headless:true});
const page = await browser.newPage();
await page.setViewport({width:1440,height:900});
await page.setCacheEnabled(false);
await page.goto('http://localhost:8950/index.html',{waitUntil:'domcontentloaded'});
await page.evaluate(()=>{
  localStorage.setItem('gastrogoan_license_v1',JSON.stringify({code:'CONTR001',tenantId:ggBizTenantId('CONTR001')}));
  localStorage.setItem('gastrogoan_owner_login',JSON.stringify({user:'x',authKey:'k',pinHash:'h'}));
  localStorage.setItem('gastrogoan_access_session',JSON.stringify({type:'owner',ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
});
await page.reload({waitUntil:'domcontentloaded'}); await new Promise(r=>setTimeout(r,2400));
await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business,{netlifySetupDone:true,extConnPromptSeen:true,tourSeen:true,categoryIconHintSeen:true});
  const eid=genId();
  DB.employees.push({id:eid,name:'Ana Fernández',rol:'Cocinera',area:'cocina',active:true,color:'#DF7039'});
  DB.tables.push({id:1,name:'Mesa 1',zona:'Salón',plazas:4});
  const ing=genId();
  DB.ingredients.push({id:ing,name:'Solomillo',category:'Carnes',area:'cocina',unit:'g',price:0.02,packQty:1000,packPrice:20,supplier:'P',activo:true});
  DB.providers.push({id:genId(),nombre:'Proveedor',area:'cocina',diasEntrega:[],gastoEnvio:0});
  const rid=genId();
  DB.recipes.push({id:rid,name:'Solomillo',area:'cocina',price:22,ivaPct:10,category:'Principales',ingredients:[{type:'ingredient',ingredientId:ing,qty:200,merma:5}]});
  DB.sales.push({id:genId(),date:todayStr(),createdAt:new Date().toISOString(),total:22,subtotal:20,propina:0,tipo:'mesa',metodoPago:'Efectivo',items:[]});
  DB.reservations.push({id:genId(),clientName:'Cliente',date:todayStr(),time:'21:00',people:2,status:'confirmada',tableId:1});
  DB.clients.push({id:genId(),name:'Cliente',phone:'600'});
  DB.limpieza.tareas.push({id:genId(),area:'Campana',producto:'X',tipo:'mensual',diaMes:new Date().getDate(),responsableId:eid,zona:'cocina'});
  DB.ge.fijos.push({id:genId(),concepto:'Alquiler',importe:1200,iva:21,categoria:'ALQUILER'});
  saveDB();
});
const malos = new Map();
for(const [vista,carpeta] of VISTAS){
  const r = await page.evaluate(({vista,carpeta})=>{
    currentFolder=carpeta; navigate(vista);
    const lum = c => { const [r,g,b]=c.map(v=>{v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4);}); return 0.2126*r+0.7152*g+0.0722*b; };
    const parse = s => { const m=s.match(/rgba?\(([^)]+)\)/); if(!m) return null;
      const p=m[1].split(',').map(x=>parseFloat(x)); return {rgb:[p[0],p[1],p[2]], a:p.length>3?p[3]:1}; };
    const fondoDe = e => { let n=e; while(n && n!==document.documentElement){ const b=parse(getComputedStyle(n).backgroundColor);
        if(b && b.a>0.5) return b.rgb; n=n.parentElement; } return [255,255,255]; };
    const out=[];
    document.querySelectorAll('#content *').forEach(e=>{
      const tieneTexto=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim().length>2);
      if(!tieneTexto) return;
      const rr=e.getBoundingClientRect(); if(!rr.width||!rr.height) return;
      const cs=getComputedStyle(e);
      if(cs.visibility==='hidden'||cs.opacity==='0') return;
      const fg=parse(cs.color); if(!fg) return;
      const bg=fondoDe(e);
      const l1=lum(fg.rgb), l2=lum(bg);
      const ratio=(Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
      const fs=parseFloat(cs.fontSize), grande = fs>=24 || (fs>=18.66 && parseInt(cs.fontWeight)>=700);
      const minimo = grande ? 3 : 4.5;
      if(ratio < minimo){
        out.push({ratio:ratio.toFixed(2), min:minimo, color:cs.color, fondo:`rgb(${bg.join(',')})`,
                  fs, txt:e.textContent.trim().replace(/\s+/g,' ').slice(0,34), cls:(e.className||e.tagName)});
      }
    });
    return out;
  }, {vista,carpeta});
  await new Promise(r=>setTimeout(r,220));
  r.forEach(x=>{ const k=`${x.color} sobre ${x.fondo} (${x.fs}px)`;
    if(!malos.has(k)) malos.set(k, {...x, donde:`${vista}/${carpeta}`, veces:0});
    malos.get(k).veces++; });
}
await browser.close();
console.log('═'.repeat(64));
const lista=[...malos.values()].sort((a,b)=>a.ratio-b.ratio);
if(!lista.length) console.log('✅ todo el texto tiene contraste suficiente');
else lista.slice(0,12).forEach(x=>console.log(`❌ ${x.ratio}:1 (mínimo ${x.min})  ${x.fs}px  ×${x.veces}\n     ${x.color} sobre ${x.fondo}\n     "${x.txt}"  [${x.cls}]  p.ej. ${x.donde}`));
console.log('─'.repeat(64)); console.log(lista.length+' combinaciones de color por debajo del mínimo');
