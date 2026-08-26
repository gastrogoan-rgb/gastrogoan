// R8 — Las pestañas internas de cada módulo.
//
// El recorrido automático entra en los 30 módulos, pero se queda en la
// pestaña que sale por defecto. Dentro de Limpieza hay 7, en Gestión
// Económica 8, en Horarios 4... unas 27 pantallas que NADIE abría. Ahí
// vivía el fallo de Distribución del Trabajo.
import puppeteer from 'puppeteer-core';

const PESTANAS = [
  ['limpieza','cocina', ['protocolo','manos','mes','temperaturas','alergenos','plagas','mantenimiento'], t=>`setLimpiezaTab('${t}')`],
  ['horarios','cocina', ['personal','dia','semana','mes'],                                                t=>`setHorariosTab('${t}')`],
  ['pedidos','cocina',  ['crear','historial'],                                                            t=>`setPedidosTab('${t}')`],
  ['carta','cocina',    ['carta','menus'],                                                                t=>`setOfertaTab('${t}')`],
  ['comandascocina','cocina', ['activas','cerradas'],                                                     t=>`setComandasCocinaTab('${t}')`],
  ['stock','cocina',    ['ing','elab'],                                                                   t=>`stockTab('${t}')`],
  ['stock','sala',      ['ing','elab'],                                                                   t=>`stockTab('${t}')`],
  ['carta','sala',      ['carta','menus'],                                                                t=>`setOfertaTab('${t}')`],
  ['horarios','sala',   ['personal','dia','semana','mes'],                                                t=>`setHorariosTab('${t}')`],
  ['limpieza','sala',   ['protocolo','manos','mes','temperaturas','alergenos','plagas','mantenimiento'],  t=>`setLimpiezaTab('${t}')`],
  ['economia','gestion',['ventas','fijos','variables','cdr','resultado','tesoreria','pe','capex'],        t=>`GE.tab('${t}')`],
];
const TAMANOS = [{n:'MÓVIL',w:390,h:844},{n:'ESCRITORIO',w:1440,h:900}];

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox'],headless:true});
const hallazgos=[]; const revisadas=[];
const anota=(c,t,d)=>hallazgos.push({clave:c,tipo:t,detalle:d});

for(const T of TAMANOS){
  const page = await browser.newPage();
  await page.setViewport({width:T.w,height:T.h,isMobile:T.w<500,hasTouch:T.w<900});
  await page.setCacheEnabled(false);
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto('http://localhost:8950/index.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{
    localStorage.setItem('gastrogoan_license_v1',JSON.stringify({code:'PESTAN01',tenantId:ggBizTenantId('PESTAN01')}));
    localStorage.setItem('gastrogoan_owner_login',JSON.stringify({user:'x',authKey:'k',pinHash:'h'}));
    localStorage.setItem('gastrogoan_access_session',JSON.stringify({type:'owner',ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  });
  await page.reload({waitUntil:'domcontentloaded'});
  await new Promise(r=>setTimeout(r,2400));
  // Datos en TODAS las pestañas, para que ninguna salga vacía por accidente
  await page.evaluate(()=>{
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
    Object.assign(DB.business,{netlifySetupDone:true,extConnPromptSeen:true,tourSeen:true,categoryIconHintSeen:true,name:'Restaurante de Prueba'});
    const hoy = todayStr();
    const eid=genId(), eid2=genId();
    DB.employees.push({id:eid,name:'Ana Fernández',rol:'Jefa de cocina',area:'cocina',active:true,color:'#DF7039',pin:'H2:x'});
    DB.employees.push({id:eid2,name:'Luis Martín',rol:'Camarero',area:'sala',active:true,color:'#4A5D4E',pin:'H2:y'});
    DB.tables.push({id:1,name:'Mesa 1',zona:'Salón',plazas:4});
    const ing=genId(), ing2=genId();
    DB.ingredients.push({id:ing,name:'Solomillo de ternera',category:'Carnes',area:'cocina',unit:'g',price:0.024,packQty:1000,packPrice:24,supplier:'Prov',activo:true});
    DB.ingredients.push({id:ing2,name:'Vino tinto',category:'Bebidas',area:'sala',unit:'ud',price:6,packQty:1,packPrice:6,supplier:'Prov',activo:true});
    DB.providers.push({id:genId(),nombre:'Distribuciones del Norte',area:'cocina',diasEntrega:[],gastoEnvio:0});
    const rid=genId(), eid3=genId();
    DB.recipes.push({id:rid,name:'Solomillo al PX',area:'cocina',isBase:false,price:22,ivaPct:10,category:'Principales',ingredients:[{type:'ingredient',ingredientId:ing,qty:220,merma:8}]});
    DB.recipes.push({id:eid3,name:'Caldo base',area:'cocina',isBase:true,price:0,category:'Bases',ingredients:[{type:'ingredient',ingredientId:ing,qty:100,merma:0}]});
    DB.elaboraciones.push({id:genId(),nombre:'Caldo base',area:'cocina'});
    const cid=genId(), cid2=genId();
    DB.cartas.push({id:cid,nombre:'CARTA',area:'cocina',horario:defaultItemHorario(),secciones:[{id:genId(),nombre:'Principales',platos:[{id:genId(),recipeId:rid,nombre:'Solomillo al PX',precio:22,ivaPct:10,disponible:true}]}]});
    DB.cartas.push({id:cid2,nombre:'BEBIDAS',area:'sala',horario:defaultItemHorario(),secciones:[{id:genId(),nombre:'Vinos',platos:[{id:genId(),nombre:'Ribera',precio:19,ivaPct:21,disponible:true}]}]});
    DB.activeCartaIds=[cid,cid2];
    DB.menus.push({id:genId(),nombre:'Menú del día',precio:16.5,area:'cocina',disponible:true,grupos:[{id:genId(),nombre:'Primero',opciones:[]}]});
    DB.sales.push({id:genId(),date:hoy,createdAt:new Date().toISOString(),total:22,subtotal:20,propina:0,tipo:'mesa',metodoPago:'Efectivo',items:[{name:'Solomillo al PX',price:22,qty:1,ivaPct:10}]});
    DB.tpvOrders.push({id:genId(),tableId:1,tipo:'mesa',status:'abierta',items:[],tandas:[],createdAt:new Date().toISOString()});
    DB.turnos.push({id:genId(),employeeId:eid,fecha:hoy,tipo:'M',desde:'09:00',hasta:'17:00'});
    DB.fichajes.push({id:genId(),employeeId:eid,fecha:hoy,entrada:new Date().toISOString(),salida:null});
    DB.purchaseOrders.push({id:genId(),supplier:'Distribuciones del Norte',date:hoy,estado:'ENVIADO',items:[{ingredientId:ing,name:'Solomillo de ternera',cantidad:5,precio:24}],notas:'',recepcion:null,comprobacion:'',area:'cocina'});
    // Limpieza: una entrada de CADA pestaña
    DB.limpieza.tareas.push({id:genId(),area:'Campana',producto:'Desengrasante',tipo:'mensual',diaMes:new Date().getDate(),responsableId:eid,zona:'cocina'});
    DB.limpieza.temperaturas = DB.limpieza.temperaturas||[];
    DB.limpieza.temperaturas.push({id:genId(),equipo:'Cámara 1',fecha:hoy,valor:4,responsableId:eid});
    DB.limpieza.alergenos = DB.limpieza.alergenos||[];
    DB.limpieza.alergenos.push({id:genId(),plato:'Solomillo al PX',alergenos:['Gluten'],fecha:hoy});
    DB.limpieza.plagas = DB.limpieza.plagas||[];
    DB.limpieza.plagas.push({id:genId(),fecha:hoy,empresa:'Control S.L.',observaciones:'Revisión trimestral'});
    DB.limpieza.mantenimiento = DB.limpieza.mantenimiento||[];
    DB.limpieza.mantenimiento.push({id:genId(),equipo:'Horno',fecha:hoy,tipo:'preventivo',empresa:'Técnicos S.L.'});
    // Gestión Económica: las 8 pestañas
    DB.ge.fijos.push({id:genId(),concepto:'Alquiler',importe:1850,iva:21,categoria:'ALQUILER'});
    DB.ge.variables.push({id:genId(),concepto:'Compra semanal',importe:640,iva:10,fecha:hoy,categoria:'MATERIA PRIMA'});
    DB.ge.capex = DB.ge.capex||[];
    DB.ge.capex.push({id:genId(),concepto:'Horno nuevo',importe:4200,fecha:hoy,anios:5});
    saveDB();
  });

  for(const [vista, carpeta, tabs, llamada] of PESTANAS){
    for(const tab of tabs){
      const errAntes = errs.length;
      const r = await page.evaluate(({vista,carpeta,codigo})=>{
        currentFolder=carpeta; navigate(vista);
        try{ eval(codigo); }catch(e){ return {error:e.message}; }
        const c=document.getElementById('content');
        if(!c) return {sinContenido:true};
        const out={chicos:[],letra:[],cortados:[],scrollH:0,elementos:c.querySelectorAll('*').length,
                   texto:(c.innerText||'').replace(/\s+/g,' ').trim().length};
        out.scrollH = document.documentElement.scrollWidth - document.documentElement.clientWidth;
        const visible = e => { const rr=e.getBoundingClientRect(); return rr.width>0&&rr.height>0&&getComputedStyle(e).visibility!=='hidden'; };
        c.querySelectorAll('button,a,input,select,[onclick]').forEach(e=>{
          if(!visible(e)) return;
          const rr=e.getBoundingClientRect();
          const esCasilla = e.tagName==='INPUT'&&(e.type==='checkbox'||e.type==='radio');
          // El mínimo de 24 px para una casilla solo tiene sentido con el
          // dedo: con ratón, 22 px es el tamaño estándar de cualquier
          // sistema operativo y se acierta sin problema.
          const tactil = matchMedia('(pointer:coarse)').matches || window.innerWidth < 1024;
          const malo = esCasilla ? (tactil && rr.height<24) : (rr.height<26 || (rr.height<32 && rr.width<140));
          if(malo) out.chicos.push(`${Math.round(rr.width)}×${Math.round(rr.height)} "${(e.textContent||e.tagName).trim().slice(0,24)}"`);
        });
        c.querySelectorAll('*').forEach(e=>{
          if(!visible(e)) return;
          const cs=getComputedStyle(e);
          const tieneTexto=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim().length>2);
          if(tieneTexto){ const fs=parseFloat(cs.fontSize); if(fs&&fs<10.5) out.letra.push(`${fs}px "${e.textContent.trim().slice(0,28)}"`); }
          if(!['auto','scroll'].includes(cs.overflowX) && !(cs.overflow==='visible'&&cs.overflowX==='visible')){
            if(e.scrollWidth>e.clientWidth+3 && e.clientWidth>0){
              const t=(e.textContent||'').trim().replace(/\s+/g,' ').slice(0,34);
              if(t) out.cortados.push(`${e.clientWidth}px de ${e.scrollWidth}px "${t}"`);
            }
          }
        });
        return out;
      }, {vista,carpeta,codigo:llamada(tab)});
      await new Promise(r=>setTimeout(r,260));

      const clave = `${T.n} · ${vista}/${carpeta} → ${tab}`;
      revisadas.push({clave, ok: !(r.error||r.sinContenido), elementos: r.elementos||0, texto: r.texto||0});
      if(errs.length>errAntes) anota(clave,'ERROR JS', errs[errs.length-1].slice(0,90));
      if(r.error){ anota(clave,'LA PESTAÑA NO ABRE', r.error); continue; }
      if(r.sinContenido){ anota(clave,'SIN CONTENIDO','no hay dónde pintar'); continue; }
      if(r.texto < 30) anota(clave,'PANTALLA CASI EN BLANCO', `${r.texto} caracteres`);
      if(r.scrollH>1) anota(clave,'SCROLL HORIZONTAL', `${r.scrollH}px de más`);
      [...new Set(r.chicos)].slice(0,2).forEach(x=>anota(clave,'OBJETIVO PEQUEÑO',x));
      [...new Set(r.letra)].slice(0,2).forEach(x=>anota(clave,'LETRA PEQUEÑA',x));
      [...new Set(r.cortados)].slice(0,2).forEach(x=>anota(clave,'TEXTO CORTADO',x));
    }
  }
  await page.close();
}
await browser.close();

const porTipo={};
hallazgos.forEach(h=>{ (porTipo[h.tipo]=porTipo[h.tipo]||[]).push(h); });
console.log('═'.repeat(66));
if(!hallazgos.length) console.log('✅ las pestañas internas: nada que señalar');
else Object.entries(porTipo).sort((a,b)=>b[1].length-a[1].length).forEach(([tipo,lista])=>{
  console.log(`\n${tipo}  (${lista.length})`);
  lista.slice(0,12).forEach(h=>console.log(`   ${h.clave}\n      ${h.detalle}`));
  if(lista.length>12) console.log(`   … y ${lista.length-12} más`);
});
console.log('\n'+'─'.repeat(66));
console.log(`${revisadas.length} pestañas abiertas · ${hallazgos.length} hallazgos`);
const media=Math.round(revisadas.reduce((s,r)=>s+r.elementos,0)/Math.max(1,revisadas.length));
console.log(`media de ${media} elementos por pestaña`);
