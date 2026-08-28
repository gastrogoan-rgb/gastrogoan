// R9 — La app en catalán e inglés.
//
// Las pruebas visuales corrían todas en castellano. En los otros dos
// idiomas los textos son bastante más largos (hasta un +141%: "SS
// AUTÓNOMOS" pasa a "SELF-EMPLOYED SOCIAL SECURITY"), y ahí es donde los
// diseños se rompen: etiquetas cortadas, botones que no caben, columnas
// que se salen.
import puppeteer from 'puppeteer-core';

const IDIOMAS = ['ca','en'];              // el castellano ya lo cubren las otras
const TAMANOS = [{n:'MÓVIL',w:390,h:844},{n:'ESCRITORIO',w:1440,h:900}];
const VISTAS = [
  ['comandascocina','cocina'],['carta','cocina'],['idr','cocina'],['megalista','cocina'],['escandallo','cocina'],
  ['fichas','cocina'],['pedidos','cocina'],['stock','cocina'],['horarios','cocina'],
  ['distribucion','cocina'],['limpieza','cocina'],['proveedores','cocina'],
  ['tpv','sala'],['reservas','sala'],['clientes','sala'],['promocion','sala'],
  ['dashboard','gestion'],['economia','gestion'],['minegocio','gestion'],['manual','gestion'],
];
// Las pestañas donde más texto largo hay
const PESTANAS = {
  economia: ['ventas','fijos','variables','cdr','resultado','tesoreria','pe','capex'].map(t=>[`GE.tab('${t}')`,t]),
  limpieza: ['protocolo','manos','temperaturas','alergenos','plagas','mantenimiento'].map(t=>[`setLimpiezaTab('${t}')`,t]),
  horarios: ['personal','semana','mes'].map(t=>[`setHorariosTab('${t}')`,t]),
};

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox'],headless:true});
const hallazgos=[]; let revisadas=0;
const anota=(c,t,d)=>hallazgos.push({clave:c,tipo:t,detalle:d});

const SEMILLA = `(function(){
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
  Object.assign(DB.business,{netlifySetupDone:true,extConnPromptSeen:true,tourSeen:true,categoryIconHintSeen:true,name:'Restaurante de Prueba'});
  const hoy=todayStr(); const eid=genId();
  DB.employees.push({id:eid,name:'Ana Fernández',rol:'Jefa de cocina',area:'cocina',active:true,color:'#DF7039',pin:'H2:x'});
  DB.employees.push({id:genId(),name:'Luis Martín',rol:'Camarero',area:'sala',active:true,color:'#4A5D4E',pin:'H2:y'});
  DB.tables.push({id:1,name:'Mesa 1',zona:'Salón',plazas:4});
  const ing=genId();
  DB.ingredients.push({id:ing,name:'Solomillo de ternera',category:'Carnes',area:'cocina',unit:'g',price:0.024,packQty:1000,packPrice:24,supplier:'Prov',activo:true});
  DB.providers.push({id:genId(),nombre:'Distribuciones del Norte',area:'cocina',diasEntrega:[],gastoEnvio:0});
  const rid=genId();
  DB.recipes.push({id:rid,name:'Solomillo al PX',area:'cocina',isBase:false,price:22,ivaPct:10,category:'Principales',ingredients:[{type:'ingredient',ingredientId:ing,qty:220,merma:8}]});
  const cid=genId();
  DB.cartas.push({id:cid,nombre:'CARTA',area:'cocina',horario:defaultItemHorario(),secciones:[{id:genId(),nombre:'Principales',platos:[{id:genId(),recipeId:rid,nombre:'Solomillo al PX',precio:22,ivaPct:10,disponible:true}]}]});
  DB.activeCartaIds=[cid];
  DB.sales.push({id:genId(),date:hoy,createdAt:new Date().toISOString(),total:22,subtotal:20,propina:0,tipo:'mesa',metodoPago:'Efectivo',items:[{name:'Solomillo al PX',price:22,qty:1,ivaPct:10}]});
  DB.reservations.push({id:genId(),clientName:'Familia Rodríguez',date:hoy,time:'21:30',people:6,status:'confirmada',tableId:1});
  DB.clients.push({id:genId(),name:'Familia Rodríguez',phone:'600111222'});
  DB.turnos.push({id:genId(),employeeId:eid,fecha:hoy,tipo:'M',desde:'09:00',hasta:'17:00'});
  DB.purchaseOrders.push({id:genId(),supplier:'Distribuciones del Norte',date:hoy,estado:'ENVIADO',items:[{ingredientId:ing,name:'Solomillo',cantidad:5,precio:24}],notas:'',recepcion:null,comprobacion:'',area:'cocina'});
  DB.limpieza.tareas.push({id:genId(),area:'Campana',producto:'Desengrasante',tipo:'mensual',diaMes:new Date().getDate(),responsableId:eid,zona:'cocina'});
  DB.limpieza.temperaturas=(DB.limpieza.temperaturas||[]).concat([{id:genId(),equipo:'Cámara 1',fecha:hoy,valor:4,responsableId:eid}]);
  DB.limpieza.mantenimiento=(DB.limpieza.mantenimiento||[]).concat([{id:genId(),equipo:'Horno',fecha:hoy,tipo:'preventivo',empresa:'Técnicos S.L.'}]);
  // Las categorías de gasto son donde más crece el texto en inglés
  DB.ge.fijos.push({id:genId(),concepto:'Alquiler',importe:1850,iva:21,categoria:'ALQUILER'});
  DB.ge.fijos.push({id:genId(),concepto:'Cuota autónomos',importe:320,iva:0,categoria:'SS AUTÓNOMOS'});
  DB.ge.fijos.push({id:genId(),concepto:'Seguros sociales',importe:1240,iva:0,categoria:'SS EMPRESA'});
  DB.ge.variables.push({id:genId(),concepto:'Compra semanal',importe:640,iva:10,fecha:hoy,categoria:'MATERIA PRIMA'});
  DB.ge.capex=(DB.ge.capex||[]).concat([{id:genId(),concepto:'Horno nuevo',importe:4200,fecha:hoy,anios:5}]);
  saveDB();
})`;

const MEDIR = `(function(){
  const c=document.getElementById('content'); if(!c) return {sinContenido:true};
  const out={cortados:[],scrollH:0,elementos:c.querySelectorAll('*').length};
  out.scrollH = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  const visible = e => { const rr=e.getBoundingClientRect(); return rr.width>0&&rr.height>0&&getComputedStyle(e).visibility!=='hidden'; };
  c.querySelectorAll('*').forEach(e=>{
    if(!visible(e)) return;
    const cs=getComputedStyle(e);
    if(['auto','scroll'].includes(cs.overflowX)) return;
    if(cs.overflow==='visible'&&cs.overflowX==='visible') return;
    if(e.scrollWidth>e.clientWidth+3 && e.clientWidth>0){
      const t=(e.textContent||'').trim().replace(/\\s+/g,' ').slice(0,44);
      if(t) out.cortados.push(\`\${e.clientWidth}px de \${e.scrollWidth}px "\${t}"\`);
    }
  });
  return out;
})`;

for(const lang of IDIOMAS){
  for(const T of TAMANOS){
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport({width:T.w,height:T.h,isMobile:T.w<500,hasTouch:T.w<900});
    await page.setCacheEnabled(false);
    const errs=[]; page.on('pageerror',e=>errs.push(e.message));
    await page.goto('http://localhost:8950/index.html',{waitUntil:'domcontentloaded'});
    await page.evaluate(l=>{
      localStorage.setItem('gastrogoan_lang', l);
      localStorage.setItem('gastrogoan_license_v1',JSON.stringify({code:'IDIOM001',tenantId:ggBizTenantId('IDIOM001')}));
      localStorage.setItem('gastrogoan_owner_login',JSON.stringify({user:'x',authKey:'k',pinHash:'h'}));
      localStorage.setItem('gastrogoan_access_session',JSON.stringify({type:'owner',ts:Date.now()}));
      localStorage.setItem('gastrogoan_owner_pass_prompted','1');
    }, lang);
    await page.reload({waitUntil:'domcontentloaded'});
    await new Promise(r=>setTimeout(r,2400));
    await page.evaluate(s=>eval(s)(), SEMILLA);
    // Comprobación honesta: que el idioma se haya aplicado de verdad. Sin
    // esto, "0 hallazgos" podría significar que la prueba corrió dos veces
    // en castellano sin enterarse.
    const prueba = await page.evaluate(()=>({lang:getLang(), muestra:t('view.tpv.subtitle')||t('home.title')}));
    if(prueba.lang !== lang) throw new Error(`el idioma NO se aplicó: pedí ${lang} y quedó en ${prueba.lang}`);
    console.log(`  [${lang}/${T.n}] idioma aplicado · muestra: "${prueba.muestra}"`);

    for(const [vista,carpeta] of VISTAS){
      const paradas = [[null,'']].concat(PESTANAS[vista]||[]);
      for(const [codigo, tabNombre] of paradas){
        const errAntes=errs.length;
        const r = await page.evaluate(({vista,carpeta,codigo,medirSrc})=>{
          currentFolder=carpeta; navigate(vista);
          if(codigo){ try{ eval(codigo); }catch(e){ return {error:e.message}; } }
          return eval(medirSrc)();
        }, {vista,carpeta,codigo,medirSrc:MEDIR});
        await new Promise(r=>setTimeout(r,230));
        revisadas++;
        const clave = `${lang.toUpperCase()} ${T.n} · ${vista}${tabNombre?'→'+tabNombre:''}`;
        if(errs.length>errAntes) anota(clave,'ERROR JS',errs[errs.length-1].slice(0,90));
        if(r.error){ anota(clave,'NO ABRE',r.error); continue; }
        if(r.scrollH>1) anota(clave,'SCROLL HORIZONTAL',`${r.scrollH}px de más`);
        [...new Set(r.cortados||[])].slice(0,2).forEach(x=>anota(clave,'TEXTO CORTADO',x));
      }
    }
    await ctx.close();
  }
}
await browser.close();
const porTipo={}; hallazgos.forEach(h=>{ (porTipo[h.tipo]=porTipo[h.tipo]||[]).push(h); });
console.log('═'.repeat(66));
if(!hallazgos.length) console.log('✅ catalán e inglés: nada que señalar');
else Object.entries(porTipo).sort((a,b)=>b[1].length-a[1].length).forEach(([tipo,lista])=>{
  console.log(`\n${tipo}  (${lista.length})`);
  lista.slice(0,12).forEach(h=>console.log(`   ${h.clave}\n      ${h.detalle}`));
  if(lista.length>12) console.log(`   … y ${lista.length-12} más`);
});
console.log('\n'+'─'.repeat(66)); console.log(`${revisadas} paradas revisadas · ${hallazgos.length} hallazgos`);
