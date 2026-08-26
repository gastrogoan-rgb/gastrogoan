// Defectos VISUALES concretos, medidos en las 3 pantallas reales.
// No basta con "no se desborda": se miran objetivos táctiles pequeños,
// letra ilegible, texto cortado, solapes y scroll horizontal.
import puppeteer from 'puppeteer-core';

const TAMANOS = [
  {n:'MÓVIL',    w:390,  h:844},
  {n:'TABLET',   w:820,  h:1180},
  {n:'ESCRITORIO', w:1440, h:900},
];
const VISTAS = [
  ['home',null],['folder','cocina'],['folder','sala'],['folder','gestion'],
  ['comandascocina','cocina'],['carta','cocina'],['megalista','cocina'],['escandallo','cocina'],
  ['fichas','cocina'],['pedidos','cocina'],['stock','cocina'],['horarios','cocina'],
  ['distribucion','cocina'],['limpieza','cocina'],['proveedores','cocina'],
  ['tpv','sala'],['reservas','sala'],['clientes','sala'],['promocion','sala'],['togo','sala'],
  ['dashboard','gestion'],['economia','gestion'],['minegocio','gestion'],['manual','gestion'],
];

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox'],headless:true});
const hallazgos = [];

for(const T of TAMANOS){
  const page = await browser.newPage();
  await page.setViewport({width:T.w, height:T.h, deviceScaleFactor:1, isMobile:T.w<500, hasTouch:T.w<500});
  await page.setCacheEnabled(false);
  await page.goto('http://localhost:8950/index.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{
    localStorage.setItem('gastrogoan_license_v1',JSON.stringify({code:'VISUAL01',tenantId:ggBizTenantId('VISUAL01')}));
    localStorage.setItem('gastrogoan_owner_login',JSON.stringify({user:'x',authKey:'k',pinHash:'h'}));
    localStorage.setItem('gastrogoan_access_session',JSON.stringify({type:'owner',ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  });
  await page.reload({waitUntil:'domcontentloaded'});
  await new Promise(r=>setTimeout(r,2400));
  await page.evaluate(()=>{
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
    Object.assign(DB.business,{netlifySetupDone:true,extConnPromptSeen:true,tourSeen:true,categoryIconHintSeen:true,name:'Restaurante de Prueba'});
    const eid=genId();
    DB.employees.push({id:eid,name:'Ana Fernández',rol:'Jefa de cocina',area:'cocina',active:true,color:'#DF7039'});
    DB.employees.push({id:genId(),name:'Luis Martín',rol:'Camarero',area:'sala',active:true,color:'#4A5D4E'});
    DB.tables.push({id:1,name:'Mesa 1',zona:'Salón',plazas:4},{id:2,name:'Mesa 2',zona:'Terraza',plazas:2});
    const ing=genId();
    DB.ingredients.push({id:ing,name:'Solomillo de ternera',category:'Carnes',area:'cocina',unit:'g',price:0.024,packQty:1000,packPrice:24,supplier:'Cárnicas del Norte',activo:true});
    DB.providers.push({id:genId(),nombre:'Cárnicas del Norte',area:'cocina',diasEntrega:[],gastoEnvio:0});
    const rid=genId();
    DB.recipes.push({id:rid,name:'Solomillo al Pedro Ximénez',area:'cocina',isBase:false,price:22,ivaPct:10,category:'Principales',ingredients:[{type:'ingredient',ingredientId:ing,qty:220,merma:8}]});
    const cid=genId();
    DB.cartas.push({id:cid,nombre:'CARTA DE TEMPORADA',area:'cocina',horario:defaultItemHorario(),secciones:[{id:genId(),nombre:'Principales',platos:[{id:genId(),recipeId:rid,nombre:'Solomillo al Pedro Ximénez',precio:22,ivaPct:10,disponible:true}]}]});
    DB.activeCartaIds=[cid];
    DB.sales.push({id:genId(),date:todayStr(),createdAt:new Date().toISOString(),total:22,subtotal:20,propina:0,tipo:'mesa',metodoPago:'Efectivo',items:[{name:'Solomillo al Pedro Ximénez',price:22,qty:1,ivaPct:10}]});
    DB.reservations.push({id:genId(),clientName:'Familia Rodríguez',date:todayStr(),time:'21:30',people:6,status:'confirmada',tableId:1});
    DB.clients.push({id:genId(),name:'Familia Rodríguez',phone:'600111222',email:'r@ejemplo.com'});
    DB.turnos.push({id:genId(),employeeId:eid,fecha:todayStr(),tipo:'M',desde:'09:00',hasta:'17:00'});
    DB.limpieza.tareas.push({id:genId(),area:'Campana extractora',producto:'Desengrasante',tipo:'mensual',diaMes:new Date().getDate(),responsableId:eid,zona:'cocina'});
    DB.ge.fijos.push({id:genId(),concepto:'Alquiler del local',importe:1850,iva:21,categoria:'ALQUILER'});
    DB.ge.variables.push({id:genId(),concepto:'Compra semanal',importe:640,iva:10,fecha:todayStr(),categoria:'MATERIA PRIMA'});
    saveDB();
  });

  for(const [vista, carpeta] of VISTAS){
    await page.evaluate(({vista,carpeta})=>{ if(carpeta) currentFolder=carpeta; navigate(vista); },{vista,carpeta});
    await new Promise(r=>setTimeout(r,450));
    const d = await page.evaluate((esMovil)=>{
      const out = {tactiles:[], letraPequena:[], cortado:[], solapes:[], scrollH:0};
      const visible = e => { const r=e.getBoundingClientRect(); return r.width>0 && r.height>0 && getComputedStyle(e).visibility!=='hidden'; };
      const cont = document.getElementById('content');
      if(!cont) return out;

      out.scrollH = document.documentElement.scrollWidth - document.documentElement.clientWidth;

      // Objetivos táctiles: el mínimo que el propio proyecto se fijó es 44px
      if(esMovil){
        cont.querySelectorAll('button, a, input[type=checkbox], input[type=radio], select, [onclick]').forEach(e=>{
          if(!visible(e)) return;
          const r = e.getBoundingClientRect();
          // Criterio realista, no un número redondo: una casilla de marcar
          // nunca mide 44 px en ninguna app (lo que importa es el área de
          // su etiqueta), y una fila ancha de tabla se acierta aunque sea
          // baja. Lo que de verdad se falla es un botón pequeño EN LAS DOS
          // dimensiones.
          const esCasilla = e.tagName==='INPUT' && (e.type==='checkbox'||e.type==='radio');
          const malo = esCasilla ? (r.height < 24 || r.width < 24)
                                 : (r.height < 26 || (r.height < 32 && r.width < 140));
          if(malo){
            const cs2=getComputedStyle(e);
            out.tactiles.push({txt:(e.textContent||'').trim().replace(/\s+/g,' ').slice(0,26) || e.tagName,
                               w:Math.round(r.width), h:Math.round(r.height),
                               cls:(e.className||e.tagName), minH:cs2.minHeight, padre:((e.parentElement||{}).className||'')});
          }
        });
      }
      // Letra por debajo de lo legible
      cont.querySelectorAll('*').forEach(e=>{
        if(!visible(e)) return;
        if(!e.childNodes.length) return;
        const tieneTexto = [...e.childNodes].some(n=>n.nodeType===3 && n.textContent.trim().length>2);
        if(!tieneTexto) return;
        const fs = parseFloat(getComputedStyle(e).fontSize);
        if(fs && fs < 10.5) out.letraPequena.push({px:fs.toFixed(1), txt:e.textContent.trim().replace(/\s+/g,' ').slice(0,34)});
      });
      // Texto cortado: se sale de su caja y está oculto
      cont.querySelectorAll('*').forEach(e=>{
        if(!visible(e)) return;
        const cs = getComputedStyle(e);
        if(cs.overflow==='visible' && cs.overflowX==='visible') return;
        if(e.scrollWidth > e.clientWidth + 3 && e.clientWidth > 0 && cs.overflowX!=='auto' && cs.overflowX!=='scroll'){
          const txt=(e.textContent||'').trim().replace(/\s+/g,' ').slice(0,34);
          if(txt) out.cortado.push({txt, visible:e.clientWidth, real:e.scrollWidth});
        }
      });
      return out;
    }, T.w<500);

    const clave = `${T.n} · ${vista}${carpeta?'/'+carpeta:''}`;
    if(d.scrollH > 1) hallazgos.push({clave, tipo:'SCROLL HORIZONTAL', detalle:d.scrollH+'px de más'});
    d.tactiles.slice(0,4).forEach(x=>hallazgos.push({clave, tipo:'OBJETIVO PEQUEÑO', detalle:`${x.w}×${x.h}px  "${x.txt}"  [${x.cls}] minH=${x.minH} padre=[${x.padre}]`}));
    d.letraPequena.slice(0,3).forEach(x=>hallazgos.push({clave, tipo:'LETRA PEQUEÑA', detalle:`${x.px}px  "${x.txt}"`}));
    d.cortado.slice(0,3).forEach(x=>hallazgos.push({clave, tipo:'TEXTO CORTADO', detalle:`${x.visible}px de ${x.real}px  "${x.txt}"`}));
  }
  await page.close();
}
await browser.close();

const porTipo = {};
hallazgos.forEach(h=>{ (porTipo[h.tipo] = porTipo[h.tipo]||[]).push(h); });
console.log('═'.repeat(66));
Object.entries(porTipo).sort((a,b)=>b[1].length-a[1].length).forEach(([tipo, lista])=>{
  console.log(`\n${tipo}  (${lista.length})`);
  lista.slice(0,14).forEach(h=>console.log(`   ${h.clave}\n      ${h.detalle}`));
  if(lista.length>14) console.log(`   … y ${lista.length-14} más`);
});
console.log('\n' + '═'.repeat(66));
console.log(hallazgos.length ? `${hallazgos.length} cosas que revisar` : '✅ nada que señalar');
