// R10 — Lo que está en TODAS las pantallas: cabecera, chat interno y
// centro de ayuda. Un fallo aquí se multiplica por toda la app.
import puppeteer from 'puppeteer-core';
const TAMANOS=[{n:'MÓVIL',w:390,h:844},{n:'PEQUEÑO',w:320,h:568},{n:'ESCRITORIO',w:1440,h:900}];
const IDIOMAS=['es','en'];

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox'],headless:true});
const hallazgos=[]; let paradas=0;
const anota=(c,t,d)=>hallazgos.push({clave:c,tipo:t,detalle:d});

const MEDIR=`(function(raiz,tactil){
  const out={chicos:[],letra:[],cortados:[],elementos:raiz.querySelectorAll('*').length};
  const visible=e=>{const r=e.getBoundingClientRect(); return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden';};
  raiz.querySelectorAll('button,a,input,select,[onclick]').forEach(e=>{
    if(!visible(e)) return; const r=e.getBoundingClientRect();
    const casilla=e.tagName==='INPUT'&&(e.type==='checkbox'||e.type==='radio');
    const malo = casilla ? (tactil&&r.height<24) : (r.height<26 || (r.height<32 && r.width<140));
    if(malo) out.chicos.push(Math.round(r.width)+'×'+Math.round(r.height)+' "'+(e.textContent||e.tagName).trim().slice(0,22)+'"');
  });
  raiz.querySelectorAll('*').forEach(e=>{
    if(!visible(e)) return; const cs=getComputedStyle(e);
    const txt=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim().length>2);
    // Un emoji es un dibujo: su "tamaño de letra" no dice nada de si se
    // lee. La bandera del selector de idioma salía como letra ilegible.
    const soloSimbolos = !/[\p{L}\p{N}]/u.test(e.textContent||'');
    if(txt && !soloSimbolos){const fs=parseFloat(cs.fontSize); if(fs&&fs<10.5) out.letra.push(fs+'px "'+e.textContent.trim().slice(0,26)+'"');}
    if(!['auto','scroll'].includes(cs.overflowX) && !(cs.overflow==='visible'&&cs.overflowX==='visible')){
      if(e.scrollWidth>e.clientWidth+3&&e.clientWidth>0){
        const t=(e.textContent||'').trim().replace(/\\s+/g,' ').slice(0,40);
        if(t) out.cortados.push(e.clientWidth+'px de '+e.scrollWidth+'px "'+t+'"');
      }
    }
  });
  return out;
})`;

for(const lang of IDIOMAS){
  for(const T of TAMANOS){
    const ctx=await browser.createBrowserContext();
    const page=await ctx.newPage();
    await page.setViewport({width:T.w,height:T.h,isMobile:T.w<500,hasTouch:T.w<900});
    await page.setCacheEnabled(false);
    const errs=[]; page.on('pageerror',e=>errs.push(e.message));
    await page.goto('http://localhost:8950/index.html',{waitUntil:'domcontentloaded'});
    await page.evaluate(l=>{
      localStorage.setItem('gastrogoan_lang',l);
      localStorage.setItem('gastrogoan_license_v1',JSON.stringify({code:'TRANSV01',tenantId:ggBizTenantId('TRANSV01')}));
      localStorage.setItem('gastrogoan_owner_login',JSON.stringify({user:'x',authKey:'k',pinHash:'h'}));
      localStorage.setItem('gastrogoan_access_session',JSON.stringify({type:'owner',ts:Date.now()}));
      localStorage.setItem('gastrogoan_owner_pass_prompted','1');
    },lang);
    await page.reload({waitUntil:'domcontentloaded'});
    await new Promise(r=>setTimeout(r,2400));
    await page.evaluate(()=>{
      ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
      Object.assign(DB.business,{netlifySetupDone:true,extConnPromptSeen:true,tourSeen:true,categoryIconHintSeen:true,name:'Restaurante de Prueba'});
      DB.employees.push({id:1,name:'Ana Fernández',rol:'Jefa de cocina',area:'cocina',active:true,color:'#DF7039'});
      // Chat con conversación de verdad, incluido un mensaje largo
      DB.chatMessages = [];
      for(let i=0;i<12;i++) DB.chatMessages.push({id:genId(),channel:'cocina',authorId:1,authorName:'Ana Fernández',
        text: i%4===0 ? 'Recordad que mañana entra el pedido de Distribuciones del Norte a primera hora y hay que dejar sitio en la cámara 2' : 'Mensaje '+i,
        ts:new Date(Date.now()-i*60000).toISOString(), urgent: i===3});
      currentFolder='cocina'; navigate('comandascocina');
      saveDB();
    });

    const PARADAS = [
      ['Cabecera',        `1`,                                  'header'],
      ['Menú de idioma',  `document.getElementById('lang-btn').click()`, '#lang-menu'],
      ['Chat interno',    `closeLangMenuOnce&&closeLangMenuOnce(); toggleChatPanel()`, '#chat-panel'],
      ['Centro de ayuda', `toggleChatPanel(); toggleHelpPanel()`, '#help-panel'],
    ];
    for(const [nombre, codigo, selector] of PARADAS){
      const errAntes=errs.length;
      const r = await page.evaluate(({codigo,selector,medirSrc,tactil})=>{
        try{ eval(codigo); }catch(e){ return {error:e.message}; }
        const raiz=document.querySelector(selector);
        if(!raiz) return {noExiste:true};
        const cs=getComputedStyle(raiz);
        if(cs.display==='none'||cs.visibility==='hidden') return {oculto:true};
        return eval(medirSrc)(raiz,tactil);
      }, {codigo,selector,medirSrc:MEDIR,tactil:T.w<1024});
      await new Promise(r=>setTimeout(r,400));
      paradas++;
      const clave=`${lang.toUpperCase()} ${T.n} · ${nombre}`;
      if(errs.length>errAntes) anota(clave,'ERROR JS',errs[errs.length-1].slice(0,90));
      if(r.error){ anota(clave,'NO ABRE',r.error); continue; }
      if(r.noExiste){ anota(clave,'NO EXISTE','no se encontró el elemento'); continue; }
      if(r.oculto){ anota(clave,'QUEDA OCULTO','se pidió abrir y no se ve'); continue; }
      [...new Set(r.chicos||[])].slice(0,3).forEach(x=>anota(clave,'OBJETIVO PEQUEÑO',x));
      [...new Set(r.letra||[])].slice(0,2).forEach(x=>anota(clave,'LETRA PEQUEÑA',x));
      [...new Set(r.cortados||[])].slice(0,2).forEach(x=>anota(clave,'TEXTO CORTADO',x));
    }
    await ctx.close();
  }
}
await browser.close();
const porTipo={}; hallazgos.forEach(h=>{(porTipo[h.tipo]=porTipo[h.tipo]||[]).push(h);});
console.log('═'.repeat(66));
if(!hallazgos.length) console.log('✅ transversales: nada que señalar');
else Object.entries(porTipo).sort((a,b)=>b[1].length-a[1].length).forEach(([tipo,lista])=>{
  console.log(`\n${tipo}  (${lista.length})`);
  lista.slice(0,10).forEach(h=>console.log(`   ${h.clave}\n      ${h.detalle}`));
  if(lista.length>10) console.log(`   … y ${lista.length-10} más`);
});
console.log('\n'+'─'.repeat(66)); console.log(`${paradas} paradas · ${hallazgos.length} hallazgos`);
