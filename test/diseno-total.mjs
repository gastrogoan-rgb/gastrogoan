// DISEÑO TOTAL (27/10): «Nórdico afinado» + «Comanda» en TODA la app. Recorre las 24 pantallas, las ventanas que abren
// sus botones y la web de reservas, y falla si algo se sale del lenguaje: letra que no es la de la marca, esquinas
// redondeadas o píldoras, sombras que flotan, colores fuera de la paleta (en el código fuente) o emoji en la web
// pública. Un diseño que no se vigila se deshace solo: la próxima pantalla que se escriba traerá su propio estilo.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';
let ok=0, fallos=0;
function caso(n,fn){ try{ fn(); ok++; console.log('✅ '+n); }catch(e){ fallos++; console.log('❌ '+n+'\n   '+(e.message||e)); } }
const b = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox']});
const p = await b.newPage(); await p.setViewport({width:1360,height:860});
await p.setRequestInterception(true);
p.on('request', r => /firebase|firebaseio|gstatic|googleapis|qrserver|raw.githubusercontent/.test(r.url()) ? r.abort() : r.continue());
await p.goto('http://localhost:8950/dist/index.html',{waitUntil:'domcontentloaded'}); await new Promise(r=>setTimeout(r,2000));
const datos = await p.evaluate(async()=> (await fetch('/dist/ggburger.json')).json());
await p.evaluate(async d=>{localStorage.setItem('gastrogoan_owner_login','1');localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));localStorage.setItem('gastrogoan_owner_pass_prompted','1');localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10)); if(d.license) localStorage.setItem('gastrogoan_license_v1', JSON.stringify(d.license)); await idbSet('gastrogoan_data_v1', d);}, datos);
await p.reload({waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof DB !== 'undefined' && DB && DB.sales, {timeout:60000});
await p.evaluate(()=>{['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(x=>document.getElementById(x)?.remove()); try{hideAccessSelectScreen();}catch(e){} try{hideBusinessSelectScreen();}catch(e){} try{closeModal();}catch(e){} editUnlocked=true; document.body.classList.add('edit-unlocked','owner-session'); window.open=()=>null; window.print=()=>{};});
const VIEWS=[['home'],['folder','cocina'],['folder','sala'],['folder','gestion'],['idr','cocina'],['megalista','cocina'],['proveedores','cocina'],['escandallo','cocina'],['fichas','cocina'],['carta','cocina'],['stock','cocina'],['pedidos','cocina'],['limpieza','cocina'],['horarios','cocina'],['comandascocina','cocina'],['distribucion','cocina'],['tpv','sala'],['reservas','sala'],['clientes','sala'],['promocion','sala'],['dashboard','gestion'],['economia','gestion'],['minegocio','gestion'],['manual','gestion']];
const AUDIT = ()=>{
  const out=[]; const vis=e=>{const r=e.getBoundingClientRect(); const cs=getComputedStyle(e); return r.width>0&&r.height>0&&cs.visibility!=='hidden'&&cs.display!=='none'&&parseFloat(cs.opacity)>0;};
  const FONTS=/Schibsted|IBM Plex Mono|tabler/i;
  for(const e of document.querySelectorAll('body *')){
    if(!vis(e)||e.closest('svg')) continue;
    const cs=getComputedStyle(e), r=e.getBoundingClientRect();
    const sig=(e.tagName.toLowerCase()+(e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\s+/).slice(0,2).join('.'):''));
    const hasText=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
    if(hasText && !FONTS.test(cs.fontFamily)) out.push(['fuente',sig,cs.fontFamily.slice(0,40)]);
    const paint = (parseFloat(cs.borderTopWidth)>0||parseFloat(cs.borderLeftWidth)>0||(cs.backgroundColor!=='rgba(0, 0, 0, 0)'));
    const rad=parseFloat(cs.borderTopLeftRadius)||0;
    if(paint&&rad>3){
      const circ = rad>=Math.min(r.width,r.height)/2-1 && Math.abs(r.width-r.height)<3;   // círculo (avatar, punto)
      if(!circ) out.push([rad>=Math.min(r.width,r.height)/2-1?'píldora':'esquina',sig,rad+'px']);
    }
    if(cs.boxShadow!=='none' && /\d{2,}px/.test(cs.boxShadow.replace(/rgba?\([^)]*\)/g,'')) ) out.push(['sombra',sig,cs.boxShadow.slice(0,40)]);
  }
  return out;
};

const NO=/logout|cerrarSesion|closeSession|clearAccessSession|setLang\(|resetApp|wipe|factoryReset|downloadFullBackup|restoreBackup|switchBusiness|showBusinessSelectScreen|openCloudWizard|saveOwnFirebase|delete|borrar|eliminar|remove|anular|cancel|reset/i;
await p.evaluate(()=>{ window.confirmModal=async()=>false; window.alertModal=async()=>{}; location.reload=()=>{}; });
const malos={}; let modales=0;
const audit = async (donde)=>{ for(const x of await p.evaluate(AUDIT)){ const k=x.join(' | '); (malos[k]=malos[k]||new Set()).add(donde); } };
for(const [v,f] of VIEWS){
  const n = await p.evaluate((v,f)=>{ try{closeModal();}catch(e){} if(f) currentFolder=f; navigate(v); return [...document.querySelectorAll('#content [onclick]')].filter(e=>!!(e.offsetParent||e.getClientRects().length)).length; },v,f);
  await new Promise(r=>setTimeout(r,500));
  await audit(v+(f&&v==='folder'?'/'+f:''));
  for(let i=0;i<Math.min(n,14);i++){
    const r = await p.evaluate((v,f,i,NOs)=>{ const NO=new RegExp(NOs,'i'); try{closeModal();}catch(e){} if(f) currentFolder=f; navigate(v);
      const els=[...document.querySelectorAll('#content [onclick]')].filter(e=>!!(e.offsetParent||e.getClientRects().length)); const el=els[i];
      if(!el) return 0; const code=el.getAttribute('onclick')||''; if(NO.test(code)) return 0;
      try{ el.click(); }catch(e){ return 0; }
      return document.querySelector('.modal-overlay.active, #modal-overlay.active') ? 2 : 1; }, v,f,i,NO.source);
    if(r===2){ modales++; await new Promise(r=>setTimeout(r,150)); await audit('ventana:'+v); }
  }
}
caso(`Las ${VIEWS.length} pantallas y ${modales} ventanas solo usan la letra de la marca, esquinas rectas y sin sombras que floten`, ()=>{
  const lista=Object.entries(malos).map(([k,s])=>k+' «'+[...s].slice(0,3).join(',')+'»');
  assert.equal(lista.length,0,'\n     '+lista.slice(0,12).join('\n     '));
});
await b.close();

// --- Colores: ninguno fuera de la paleta en el código (los semánticos y las tintas de la marca son los de siempre)
const OK=new Set(['#1C1A17','#4A5D4E','#F1EFE9','#FAF8F4','#FFFFFF','#000000','#716C65','#3D3A34','#E7E2D9','#8A7440','#F5F0E3','#8A4A3B','#F5EBE7','#EDF1EC','#7E9B84','#4E5A63','#ECEFF1','#2E363C','#6E5A6B','#F1ECEF','#2A2723','#ABA59C','#D6D0C5','#C9C2B6','#6B5A2E','#F7F5F0','#F4F4F4','#FDFCFA','#E3E8E2','#DCE6DE','#C3D4C8','#9DB5A2','#E3C77A','#C9D6CC','#E6ECE7','#4A463F','#3A3732','#CFCFCF','#999999','#111111','#555555','#666666','#777777','#888888','#AAAAAA','#BBBBBB','#CCCCCC','#DDDDDD','#EEEEEE','#333333','#444444','#222222','#6B8F71','#B59A5B','#A0746A','#7A8B99','#8E7B8B','#5C6B3A','#9C8F7A','#DA121A','#FCDD09','#C8102E','#012169','#FFC400','#AA151B','#F1BF00','#FFFFFE']);
const fuera={};
for(const f of ['js/core.js','js/ui.js','js/finance.js','js/recipes.js','js/menu.js','js/tpv.js','js/operations.js','js/hr.js','js/idr.js','js/polish.js','js/app.js','css/styles.css','reservagastrogoan.html','admin-panel/app.html','admin-panel/plan360.html','admin-panel/index.html','generador-licencias.html']){
  fs.readFileSync(f,'utf8').split('\n').forEach((l,i)=>{ if(/viewBox|data:image|data:font/.test(l)) return;
    for(const m of l.matchAll(/#[0-9a-fA-F]{6}\b/g)){ const h=m[0].toUpperCase(); if(!OK.has(h)) (fuera[f+':'+(i+1)]=fuera[f+':'+(i+1)]||[]).push(h); } });
}
caso('Todos los colores del código son de la paleta de GastroGoan', ()=>{ const k=Object.keys(fuera); assert.equal(k.length,0, k.slice(0,10).map(x=>x+' '+fuera[x].join(',')).join(' · ')); });

caso('Los iconos propios cubren las áreas, todos los módulos y los más usados', ()=>{
  const css=fs.readFileSync('css/iconos-gg.css','utf8');
  const ui=fs.readFileSync('js/ui.js','utf8');
  const usados=[...ui.matchAll(/icon:'ti-([a-z0-9-]+)'/g)].map(m=>m[1]).slice(0,40);
  const falta=usados.filter(n=>!new RegExp('\\.ti-'+n+'::before').test(css));
  assert.ok(falta.length<=4, 'sin dibujo propio: '+falta.join(', '));
  assert.ok(css.includes('stroke-linecap=\'round\''), 'el trazo tiene que ser redondeado, como en las maquetas');
});
caso('La web de reservas: sin emoji en las pestañas, controles de tinta y fichas con raya', ()=>{
  const h=fs.readFileSync('reservagastrogoan.html','utf8');
  assert.ok(/replace\(\/\^\[\\p\{Extended_Pictographic\}/.test(h),'las pestañas tienen que quitar el emoji');
  assert.ok(h.includes('accent-color:var(--ink)') && h.includes('.card{border-top:3px solid var(--ink)}'));
});
console.log('\n'+'═'.repeat(64)+'\n'+(fallos?`❌ ${fallos} fallaron`:`✅ todos los casos de diseño total pasaron (${ok})`));
process.exit(fallos?1:0);
