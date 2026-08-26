// La web pública de reservas y pedidos: la que ven los CLIENTES del
// restaurante. Defectos visuales en las tres pantallas.
import puppeteer from 'puppeteer-core';
const IDIOMAS = ['es','ca','en'];
const TAMANOS = [
  {n:'MÓVIL', w:390, h:844},
  {n:'MÓVIL PEQUEÑO', w:320, h:568},
  {n:'TABLET', w:768, h:1024},
];
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox'],headless:true});
const hallazgos=[]; let paradas=0;
for(const lang of IDIOMAS){
for(const T of TAMANOS){
  const page = await browser.newPage();
  await page.setViewport({width:T.w,height:T.h,isMobile:T.w<500,hasTouch:true});
  await page.setCacheEnabled(false);
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.setRequestInterception(true);
  page.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver/.test(r.url()) ? r.abort() : r.continue());
  await page.goto('http://localhost:8950/reservagastrogoan.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(l=>{ localStorage.setItem('gastrogoan_lang', l); }, lang);
  await page.reload({waitUntil:'domcontentloaded'});
  await new Promise(r=>setTimeout(r,900));
  await new Promise(r=>setTimeout(r,1200));

  const idiomaReal = await page.evaluate(()=>currentLang);
  if(idiomaReal !== lang) throw new Error(`idioma no aplicado: pedí ${lang} y quedó ${idiomaReal}`);
  for(const pestana of ['reserva','takeaway','delivery']){
    const r = await page.evaluate(({pestana})=>{
      window.DB = DB = {};
      DB.business = {name:'Restaurante Casa Manolo y Hermanos', tiposServicio:{takeaway:true,delivery:true},
                     };
      const p=(id,n,pr)=>({id,nombre:n,precio:pr,disponible:true});
      DB.cartas=[
        {id:1,nombre:'Carta de comida',secciones:[
          {id:11,nombre:'Entrantes para compartir',icono:'🫒',platos:[p(1,'Croquetas caseras de jamón ibérico de bellota',9.5),p(2,'Anchoas del Cantábrico en salazón',14)]},
          {id:12,nombre:'Principales de carne y caza',icono:'🥩',platos:[p(3,'Solomillo de ternera al Pedro Ximénez con puré trufado',28.5)]},
          {id:13,nombre:'Postres caseros',icono:'🍰',platos:[p(4,'Tarta de queso al horno con frutos rojos',7.5)]},
        ]},
        {id:2,nombre:'Carta de bebidas',secciones:[
          {id:21,nombre:'Vinos de la Ribera del Duero',icono:'🍷',platos:[p(5,'Ribera del Duero Crianza',19)]},
        ]},
      ];
      DB.menus=[{id:99,nombre:'Menú degustación del chef',precio:46.5,disponible:true,grupos:[{id:1,nombre:'Primero',opciones:[]}]}];
      DB.activeCartaIds=[1,2]; DB.activeMenuIds=[99];
      currentTab = pestana; renderApp();
      const out={cortados:[], chicos:[], letra:[]};
      out.scrollH = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      const raiz = document.body;
      raiz.querySelectorAll('*').forEach(e=>{
        const rr=e.getBoundingClientRect(); if(!rr.width||!rr.height) return;
        const cs=getComputedStyle(e);
        if(cs.visibility==='hidden') return;
        // texto cortado
        if(!(cs.overflowX==='auto'||cs.overflowX==='scroll') && !(cs.overflow==='visible'&&cs.overflowX==='visible')){
          if(e.scrollWidth>e.clientWidth+3 && e.clientWidth>0){
            const t=(e.textContent||'').trim().replace(/\s+/g,' ').slice(0,42);
            if(t) out.cortados.push(`${e.clientWidth}px de ${e.scrollWidth}px  "${t}"`);
          }
        }
        // letra ilegible
        const tieneTexto=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim().length>2);
        if(tieneTexto){ const fs=parseFloat(cs.fontSize); if(fs&&fs<10.5) out.letra.push(`${fs}px  "${e.textContent.trim().slice(0,32)}"`); }
      });
      raiz.querySelectorAll('button,a,input,select,[onclick]').forEach(e=>{
        const rr=e.getBoundingClientRect(); if(!rr.width||!rr.height) return;
        const esCasilla = e.tagName==='INPUT'&&(e.type==='checkbox'||e.type==='radio');
        const malo = esCasilla ? rr.height<24 : (rr.height<26 || (rr.height<32 && rr.width<140));
        if(malo) out.chicos.push(`${Math.round(rr.width)}×${Math.round(rr.height)} "${(e.textContent||e.tagName).trim().slice(0,24)}"`);
      });
      return out;
    }, {pestana});
    await new Promise(r=>setTimeout(r,300));
    paradas++;
    const clave=`${lang.toUpperCase()} ${T.n} · ${pestana}`;
    if(r.scrollH>1) hallazgos.push([clave,'SCROLL HORIZONTAL',`${r.scrollH}px de más`]);
    [...new Set(r.cortados)].slice(0,3).forEach(x=>hallazgos.push([clave,'TEXTO CORTADO',x]));
    [...new Set(r.chicos)].slice(0,3).forEach(x=>hallazgos.push([clave,'OBJETIVO PEQUEÑO',x]));
    [...new Set(r.letra)].slice(0,3).forEach(x=>hallazgos.push([clave,'LETRA PEQUEÑA',x]));
  }
  if(errs.length) hallazgos.push([T.n,'ERROR JS',errs[0].slice(0,90)]);
  await page.close();
}
}
await browser.close();
console.log('═'.repeat(64));
if(!hallazgos.length) console.log('✅ la web pública se ve bien en las tres pantallas');
else hallazgos.forEach(([c,t,d])=>console.log(`❌ ${c}\n     ${t}: ${d}`));
console.log('─'.repeat(64)); console.log(`${paradas} paradas revisadas · ${hallazgos.length} hallazgos`);
