// Un negocio RECIÉN dado de alta, sin un solo dato. Es lo primero que ve
// cada cliente nuevo: si una pantalla sale en blanco o con un hueco raro,
// la primera impresión es que la app está rota.
import puppeteer from 'puppeteer-core';
const VISTAS = [
  ['comandascocina','cocina'],['carta','cocina'],['idr','cocina'],['megalista','cocina'],['escandallo','cocina'],
  ['fichas','cocina'],['pedidos','cocina'],['stock','cocina'],['horarios','cocina'],
  ['distribucion','cocina'],['limpieza','cocina'],['proveedores','cocina'],
  ['tpv','sala'],['reservas','sala'],['clientes','sala'],['promocion','sala'],
  // 'togo' NO es una pantalla: es una sección dentro del TPV (#tpv-togo-section).
  ['dashboard','gestion'],['economia','gestion'],['minegocio','gestion'],
];
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox'],headless:true});
const hallazgos=[];
for(const ancho of [390, 1440]){
  const page = await browser.newPage();
  await page.setViewport({width:ancho,height:844,isMobile:ancho<500,hasTouch:ancho<500});
  await page.setCacheEnabled(false);
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto('http://localhost:8950/index.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{
    localStorage.setItem('gastrogoan_license_v1',JSON.stringify({code:'VACIO001',tenantId:ggBizTenantId('VACIO001')}));
    localStorage.setItem('gastrogoan_owner_login',JSON.stringify({user:'x',authKey:'k',pinHash:'h'}));
    localStorage.setItem('gastrogoan_access_session',JSON.stringify({type:'owner',ts:Date.now()}));
    localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  });
  await page.reload({waitUntil:'domcontentloaded'}); await new Promise(r=>setTimeout(r,2400));
  await page.evaluate(()=>{
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
    // Solo lo mínimo del alta: ni un dato de trabajo.
    Object.assign(DB.business,{netlifySetupDone:true,extConnPromptSeen:true,tourSeen:true,categoryIconHintSeen:true});
    saveDB();
  });
  for(const [vista, carpeta] of VISTAS){
    const errAntes = errs.length;
    const r = await page.evaluate(({vista,carpeta})=>{
      currentFolder=carpeta; navigate(vista);
      const c = document.getElementById('content');
      const txt = (c ? c.innerText : '').replace(/\s+/g,' ').trim();
      const activa = document.querySelector('.view.active');
      return {
        largo: txt.length,
        texto: txt.slice(0,110),
        vistaCorrecta: activa ? activa.id : '(ninguna)',
        // ¿Hay un mensaje de "aún no hay nada" que oriente?
        tieneMensajeVacio: !!(c && c.querySelector('.empty')),
        altoContenido: c ? c.scrollHeight : 0,
      };
    }, {vista,carpeta});
    await new Promise(r=>setTimeout(r,220));
    const clave = `${ancho<500?'MÓVIL':'ESCRITORIO'} · ${vista}/${carpeta}`;
    if(errs.length > errAntes) hallazgos.push([clave,'ERROR JS', errs[errs.length-1].slice(0,90)]);
    if(r.vistaCorrecta !== 'view-'+vista) hallazgos.push([clave,'NO NAVEGA', 'quedó en '+r.vistaCorrecta]);
    else if(r.largo < 40) hallazgos.push([clave,'PANTALLA CASI EN BLANCO', `${r.largo} caracteres: "${r.texto}"`]);
    else if(!r.tieneMensajeVacio && r.largo < 130) hallazgos.push([clave,'SIN MENSAJE QUE ORIENTE', `"${r.texto}"`]);
  }
  await page.close();
}
await browser.close();
console.log('═'.repeat(64));
if(!hallazgos.length) console.log('✅ todas las pantallas vacías se comportan bien');
else hallazgos.forEach(([c,t,d])=>console.log(`❌ ${c}\n     ${t}\n     ${d}`));
console.log('─'.repeat(64)); console.log(hallazgos.length+' hallazgos');
