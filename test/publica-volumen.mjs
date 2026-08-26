// R11 — La web pública con una carta de verdad: 8 secciones, 120 platos,
// nombres largos, alérgenos, extras y un menú con varios grupos. Es la
// cara del negocio ante sus clientes; si con carta grande se atasca o se
// rompe, el cliente se va.
import puppeteer from 'puppeteer-core';
const TAMANOS=[{n:'MÓVIL',w:390,h:844},{n:'PEQUEÑO',w:320,h:568},{n:'TABLET',w:768,h:1024}];
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox'],headless:true});
const hallazgos=[]; let paradas=0;
const anota=(c,t,d)=>hallazgos.push({clave:c,tipo:t,detalle:d});

for(const T of TAMANOS){
  const ctx=await browser.createBrowserContext();
  const page=await ctx.newPage();
  await page.setViewport({width:T.w,height:T.h,isMobile:T.w<500,hasTouch:true});
  await page.setCacheEnabled(false);
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.setRequestInterception(true);
  page.on('request',r=>/firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url())?r.abort():r.continue());
  await page.goto('http://localhost:8950/reservagastrogoan.html',{waitUntil:'domcontentloaded'});
  await new Promise(r=>setTimeout(r,1200));

  for(const pestana of ['reserva','takeaway','delivery']){
    const t0=Date.now();
    const r = await page.evaluate((pestana)=>{
      window.DB = DB = {};
      DB.business={name:'Restaurante Casa Manolo y Hermanos', tiposServicio:{takeaway:true,delivery:true}};
      const SECCIONES=[
        ['Entrantes para compartir','🫒'],['Ensaladas y verduras de temporada','🥗'],
        ['Arroces y fideuás (mínimo 2 personas)','🍚'],['Pescados del día según lonja','🐟'],
        ['Carnes a la brasa de encina','🥩'],['Postres caseros de la abuela','🍰'],
        ['Vinos de la Ribera del Duero','🍷'],['Cafés, infusiones y licores','☕'],
      ];
      let id=1;
      DB.cartas=[{id:1,nombre:'Carta de temporada otoño-invierno',secciones:SECCIONES.map((s,si)=>({
        id:100+si, nombre:s[0], icono:s[1],
        platos:Array.from({length:15},(_,i)=>({
          id:id++, nombre:`${s[0].split(' ')[0]} de la casa con guarnición especial número ${i+1}`,
          precio: 8.5 + i*1.35, disponible:true,
          modificadores: i%3===0 ? [{id:1,nombre:'Sin gluten',precio:0},{id:2,nombre:'Ración extra',precio:3.5}] : [],
        }))
      }))}];
      DB.activeCartaIds=[1];
      DB.menus=[{id:99,nombre:'Menú degustación del chef (8 pases)',precio:64.5,disponible:true,
        grupos:[{id:1,nombre:'Entrantes',opciones:[]},{id:2,nombre:'Principal',opciones:[]},{id:3,nombre:'Postre',opciones:[]}]}];
      DB.activeMenuIds=[99];
      DB.allergens={1:['Gluten','Lactosa'],2:['Frutos secos']};
      currentTab=pestana; renderApp();

      const out={cortados:[],chicos:[],scrollH:0,platos:document.querySelectorAll('.menu-folder-card').length};
      out.scrollH=document.documentElement.scrollWidth-document.documentElement.clientWidth;
      const visible=e=>{const rr=e.getBoundingClientRect(); return rr.width>0&&rr.height>0&&getComputedStyle(e).visibility!=='hidden';};
      document.body.querySelectorAll('*').forEach(e=>{
        if(!visible(e)) return;
        const cs=getComputedStyle(e);
        if(['auto','scroll'].includes(cs.overflowX)) return;
        if(cs.overflow==='visible'&&cs.overflowX==='visible') return;
        if(e.scrollWidth>e.clientWidth+3&&e.clientWidth>0){
          const t=(e.textContent||'').trim().replace(/\s+/g,' ').slice(0,44);
          if(t) out.cortados.push(`${e.clientWidth}px de ${e.scrollWidth}px "${t}"`);
        }
      });
      document.body.querySelectorAll('button,a,input,select,[onclick]').forEach(e=>{
        if(!visible(e)) return; const rr=e.getBoundingClientRect();
        const casilla=e.tagName==='INPUT'&&(e.type==='checkbox'||e.type==='radio');
        const malo=casilla?rr.height<24:(rr.height<26||(rr.height<32&&rr.width<140));
        if(malo) out.chicos.push(`${Math.round(rr.width)}×${Math.round(rr.height)} "${(e.textContent||e.tagName).trim().slice(0,22)}"`);
      });
      return out;
    }, pestana);
    const ms=Date.now()-t0;
    // Contabilidad honesta: si no se pintaron las carpetas, "0 hallazgos"
    // no significa nada.
    console.log(`  [${T.n}/${pestana}] ${r.platos} carpetas · ${ms}ms`);
    await new Promise(r=>setTimeout(r,300));
    paradas++;
    const clave=`${T.n} · ${pestana}`;
    if(errs.length) anota(clave,'ERROR JS',errs[errs.length-1].slice(0,90));
    if(ms>2500) anota(clave,'LENTO AL PINTAR',`${ms}ms con 120 platos`);
    if(r.scrollH>1) anota(clave,'SCROLL HORIZONTAL',`${r.scrollH}px de más`);
    [...new Set(r.cortados)].slice(0,3).forEach(x=>anota(clave,'TEXTO CORTADO',x));
    [...new Set(r.chicos)].slice(0,3).forEach(x=>anota(clave,'OBJETIVO PEQUEÑO',x));
  }

  // Y dentro de una carpeta, con 15 platos de nombre largo
  const dentro = await page.evaluate(()=>{
    const c=document.querySelector('.menu-folder-card');
    if(!c) return {sinCarpetas:true};
    c.click();
    const platosDentro = document.querySelectorAll('.menu-item, .dish-row, [onclick^="changeCartQty"]').length;
    const out={cortados:[],chicos:[],scrollH:document.documentElement.scrollWidth-document.documentElement.clientWidth};
    const visible=e=>{const rr=e.getBoundingClientRect(); return rr.width>0&&rr.height>0;};
    document.body.querySelectorAll('*').forEach(e=>{
      if(!visible(e)) return; const cs=getComputedStyle(e);
      if(['auto','scroll'].includes(cs.overflowX)) return;
      if(cs.overflow==='visible'&&cs.overflowX==='visible') return;
      if(e.scrollWidth>e.clientWidth+3&&e.clientWidth>0){
        const t=(e.textContent||'').trim().replace(/\s+/g,' ').slice(0,44);
        if(t) out.cortados.push(`${e.clientWidth}px de ${e.scrollWidth}px "${t}"`);
      }
    });
    document.body.querySelectorAll('button,[onclick]').forEach(e=>{
      if(!visible(e)) return; const rr=e.getBoundingClientRect();
      if(rr.height<26||(rr.height<32&&rr.width<140)) out.chicos.push(`${Math.round(rr.width)}×${Math.round(rr.height)} "${(e.textContent||'').trim().slice(0,22)}"`);
    });
    out.platosDentro = platosDentro;
    return out;
  });
  console.log(`  [${T.n}/carpeta abierta] ${dentro.platosDentro||0} platos dentro`);
  paradas++;
  const clave2=`${T.n} · dentro de una carpeta`;
  if(dentro.sinCarpetas) anota(clave2,'NO HAY CARPETAS','no se pudo entrar');
  else{
    if(dentro.scrollH>1) anota(clave2,'SCROLL HORIZONTAL',`${dentro.scrollH}px de más`);
    [...new Set(dentro.cortados)].slice(0,3).forEach(x=>anota(clave2,'TEXTO CORTADO',x));
    [...new Set(dentro.chicos)].slice(0,3).forEach(x=>anota(clave2,'OBJETIVO PEQUEÑO',x));
  }
  await ctx.close();
}
await browser.close();
const porTipo={}; hallazgos.forEach(h=>{(porTipo[h.tipo]=porTipo[h.tipo]||[]).push(h);});
console.log('═'.repeat(66));
if(!hallazgos.length) console.log('✅ la web pública aguanta una carta grande');
else Object.entries(porTipo).sort((a,b)=>b[1].length-a[1].length).forEach(([tipo,lista])=>{
  console.log(`\n${tipo}  (${lista.length})`);
  lista.slice(0,10).forEach(h=>console.log(`   ${h.clave}\n      ${h.detalle}`));
  if(lista.length>10) console.log(`   … y ${lista.length-10} más`);
});
console.log('\n'+'─'.repeat(66)); console.log(`${paradas} paradas · ${hallazgos.length} hallazgos`);
