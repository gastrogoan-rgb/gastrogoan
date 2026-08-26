// R7 — Zonas 1 y 2: acceso y alta de un negocio.
//
// Son las DOS PRIMERAS pantallas que ve quien compra la app, y hasta ahora
// ninguna prueba las miraba: todas empezaban saltándose el acceso para
// llegar rápido a los módulos. Un fallo aquí no se arregla después, se
// pierde la venta.
import puppeteer from 'puppeteer-core';

const TAMANOS = [
  {n:'MÓVIL',    w:390,  h:844},
  {n:'PEQUEÑO',  w:320,  h:568},
  {n:'TABLET',   w:768,  h:1024},
];
const IDIOMAS = ['es','ca','en'];

// Cada parada: cómo se muestra y en qué elemento vive.
const PANTALLAS = [
  ['Elegir acceso',        `accessScreenMode='choice';   renderAccessScreen(); document.getElementById('access-select-screen').classList.remove('hide')`, '#access-select-screen'],
  ['Acceso empleado',      `accessScreenMode='employee'; renderAccessScreen(); document.getElementById('access-select-screen').classList.remove('hide')`, '#access-select-screen'],
  ['Acceso propietario',   `accessScreenMode='owner';    renderAccessScreen(); document.getElementById('access-select-screen').classList.remove('hide')`, '#access-select-screen'],
  ['Canjear licencia',     `showActivationGate()`,        '#license-gate'],
  ['Guía de la nube',      `showFirebaseSetupGate()`,     '#firebase-gate'],
  ['Conexiones externas',  `showExternalConnectionsPrompt()`, '#extconn-gate'],
  ['Selector de negocios', `showBusinessSelectScreen()`,  '#business-select-screen'],
  ['Licencia revocada',    `showRevokedGate()`,           '#revoked-gate'],
];

const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox'],headless:true});
const hallazgos=[];
const revisadas=[];
const anota=(c,t,d)=>hallazgos.push({clave:c,tipo:t,detalle:d});

for(const T of TAMANOS){
  for(const lang of IDIOMAS){
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport({width:T.w,height:T.h,isMobile:T.w<500,hasTouch:T.w<900});
    await page.setCacheEnabled(false);
    const errs=[]; page.on('pageerror',e=>errs.push(e.message));
    await page.goto('http://localhost:8950/index.html',{waitUntil:'domcontentloaded'});
    await page.evaluate(l=>localStorage.setItem('gastrogoan_lang', l), lang);
    await page.reload({waitUntil:'domcontentloaded'});
    await new Promise(r=>setTimeout(r,2200));

    for(const [nombre, comoMostrar, selector] of PANTALLAS){
      const errAntes = errs.length;
      const r = await page.evaluate(({comoMostrar, selector})=>{
        // Se limpia lo de la parada anterior
        ['license-gate','firebase-gate','extconn-gate','netlify-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
        document.getElementById('access-select-screen')?.classList.add('hide');
        document.getElementById('business-select-screen')?.classList.add('hide');
        try{ eval(comoMostrar); }catch(e){ return {error:e.message}; }
        const raiz = document.querySelector(selector);
        if(!raiz) return {noAparece:true};
        const cs0 = getComputedStyle(raiz);
        if(cs0.display==='none' || raiz.classList.contains('hide')) return {oculta:true};

        const out = {chicos:[], letra:[], cortados:[], flojos:[], scrollH:0, alto:0, cabe:true,
                     elementos: raiz.querySelectorAll('*').length};
        out.scrollH = document.documentElement.scrollWidth - document.documentElement.clientWidth;
        out.alto = raiz.scrollHeight;
        // ¿Se puede llegar al final? (o cabe, o la pantalla se desplaza)
        out.cabe = raiz.scrollHeight <= window.innerHeight + 2 ||
                   ['auto','scroll'].includes(cs0.overflowY) || ['auto','scroll'].includes(cs0.overflow);

        const visible = e => { const rr=e.getBoundingClientRect();
          return rr.width>0 && rr.height>0 && getComputedStyle(e).visibility!=='hidden'; };

        // Objetivos táctiles
        raiz.querySelectorAll('button,a,input,select,[onclick]').forEach(e=>{
          if(!visible(e)) return;
          const rr=e.getBoundingClientRect();
          const esCasilla = e.tagName==='INPUT' && (e.type==='checkbox'||e.type==='radio');
          const malo = esCasilla ? rr.height<24 : (rr.height<26 || (rr.height<32 && rr.width<140));
          if(malo) out.chicos.push(`${Math.round(rr.width)}×${Math.round(rr.height)} "${(e.textContent||e.tagName).trim().slice(0,24)}"`);
        });

        // Letra y contraste
        const lum = c => { const [r,g,b]=c.map(v=>{v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4);}); return 0.2126*r+0.7152*g+0.0722*b; };
        const parse = s => { const m=String(s).match(/rgba?\(([^)]+)\)/); if(!m) return null;
          const p=m[1].split(',').map(x=>parseFloat(x)); return {rgb:[p[0],p[1],p[2]], a:p.length>3?p[3]:1}; };
        // Un fondo puede ser un DEGRADADO (background-image), no un color
        // plano. Leyendo solo backgroundColor no se encontraba nada, se
        // asumía blanco, y el texto blanco de la pantalla de acceso —que
        // va sobre un degradado oscuro— salía como "1.06:1, ilegible".
        // Falsa alarma clásica: se avisaba de un problema inexistente.
        const colorDeDegradado = s => {
          if(!s || s==='none') return null;
          const m = s.match(/rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}/g);
          if(!m) return null;
          for(const c of m){
            if(c.startsWith('#')){
              let h=c.slice(1); if(h.length===3) h=h.split('').map(x=>x+x).join('');
              return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
            }
            const p=parse(c); if(p && p.a>0.5) return p.rgb;
          }
          return null;
        };
        const fondoDe = e => { let n=e; while(n && n!==document.documentElement){
            const cs=getComputedStyle(n);
            const b=parse(cs.backgroundColor);
            if(b && b.a>0.5) return b.rgb;
            const g=colorDeDegradado(cs.backgroundImage);
            if(g) return g;
            n=n.parentElement; } return [255,255,255]; };

        raiz.querySelectorAll('*').forEach(e=>{
          if(!visible(e)) return;
          const cs=getComputedStyle(e);
          const tieneTexto=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim().length>2);
          if(tieneTexto){
            const fs=parseFloat(cs.fontSize);
            if(fs && fs<10.5) out.letra.push(`${fs}px "${e.textContent.trim().slice(0,30)}"`);
            // Un emoji es un dibujo con sus propios colores: medir el
            // "color de texto" del elemento que lo contiene no dice nada.
            // Otra falsa alarma: las banderas del selector de idioma
            // salían como "1.21:1, ilegible".
            const soloSimbolos = !/[\p{L}\p{N}]/u.test(e.textContent||'');
            const fg = soloSimbolos ? null : parse(cs.color);
            if(fg){
              const bg=fondoDe(e), l1=lum(fg.rgb), l2=lum(bg);
              const ratio=(Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
              const grande = fs>=24 || (fs>=18.66 && parseInt(cs.fontWeight)>=700);
              if(ratio < (grande?3:4.5)) out.flojos.push(`${ratio.toFixed(2)}:1 ${fs}px "${e.textContent.trim().slice(0,28)}"`);
            }
          }
          // Texto cortado
          if(!['auto','scroll'].includes(cs.overflowX) && !(cs.overflow==='visible'&&cs.overflowX==='visible')){
            if(e.scrollWidth>e.clientWidth+3 && e.clientWidth>0){
              const t=(e.textContent||'').trim().replace(/\s+/g,' ').slice(0,36);
              if(t) out.cortados.push(`${e.clientWidth}px de ${e.scrollWidth}px "${t}"`);
            }
          }
        });
        return out;
      }, {comoMostrar, selector});

      await new Promise(r=>setTimeout(r,150));
      const clave = `${T.n}/${lang} · ${nombre}`;
      // Contabilidad honesta: una prueba que no encuentra nada porque no
      // está mirando nada es peor que no tener prueba.
      revisadas.push({clave, ok: !(r.error||r.noAparece||r.oculta),
                      elementos: r.elementos||0, alto: r.alto||0});
      if(errs.length>errAntes) anota(clave,'ERROR JS', errs[errs.length-1].slice(0,90));
      if(r.error){ anota(clave,'NO SE PUEDE MOSTRAR', r.error); continue; }
      if(r.noAparece){ anota(clave,'NO APARECE','el elemento no existe'); continue; }
      if(r.oculta){ anota(clave,'QUEDA OCULTA','se mostró pero no se ve'); continue; }
      if(r.scrollH>1) anota(clave,'SCROLL HORIZONTAL', `${r.scrollH}px de más`);
      if(!r.cabe) anota(clave,'NO SE LLEGA AL FINAL', `${r.alto}px de alto y no se desplaza`);
      [...new Set(r.chicos)].slice(0,3).forEach(x=>anota(clave,'OBJETIVO PEQUEÑO',x));
      [...new Set(r.letra)].slice(0,2).forEach(x=>anota(clave,'LETRA PEQUEÑA',x));
      [...new Set(r.flojos)].slice(0,2).forEach(x=>anota(clave,'CONTRASTE FLOJO',x));
      [...new Set(r.cortados)].slice(0,2).forEach(x=>anota(clave,'TEXTO CORTADO',x));
    }
    await ctx.close();
  }
}
await browser.close();

const porTipo={};
hallazgos.forEach(h=>{ (porTipo[h.tipo]=porTipo[h.tipo]||[]).push(h); });
console.log('═'.repeat(66));
if(!hallazgos.length) console.log('✅ acceso y alta: nada que señalar');
else Object.entries(porTipo).sort((a,b)=>b[1].length-a[1].length).forEach(([tipo,lista])=>{
  console.log(`\n${tipo}  (${lista.length})`);
  lista.slice(0,10).forEach(h=>console.log(`   ${h.clave}\n      ${h.detalle}`));
  if(lista.length>10) console.log(`   … y ${lista.length-10} más`);
});
console.log('\n'+'─'.repeat(66));
const vacias = revisadas.filter(r=>!r.ok);
const flojas = revisadas.filter(r=>r.ok && r.elementos < 8);
console.log(`${revisadas.length} paradas revisadas · ${hallazgos.length} hallazgos`);
if(vacias.length) console.log(`⚠️  ${vacias.length} no se pudieron mostrar: ${[...new Set(vacias.map(v=>v.clave.split(' · ')[1]))].join(', ')}`);
if(flojas.length) console.log(`⚠️  ${flojas.length} con muy pocos elementos (¿se pintó de verdad?): ${[...new Set(flojas.map(v=>v.clave.split(' · ')[1]))].join(', ')}`);
const media = Math.round(revisadas.filter(r=>r.ok).reduce((s,r)=>s+r.elementos,0)/Math.max(1,revisadas.filter(r=>r.ok).length));
console.log(`media de ${media} elementos por pantalla revisada`);
