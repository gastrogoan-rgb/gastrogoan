// Escenarios contra un Firebase de VERDAD (emulador oficial), con dos
// navegadores reales. Cada uno reproduce una clase de fallo que solo
// aparece con la nube conectada.
import puppeteer from 'puppeteer-core';

const DBURL = 'http://127.0.0.1:9000/?ns=demo-gastrogoan';
const browser = await puppeteer.launch({
  executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--no-sandbox'], headless:true });

// El emulador conserva los datos entre ejecuciones. Sin vaciarlo, una
// tanda arrastra lo que escribió la anterior y aparecen "fallos" que solo
// son basura vieja (p.ej. un idioma que ya nadie escribe pero sigue en la
// nube de la prueba pasada).
for(const ns of ['demo-gastrogoan','demo-plataforma']){
  const r = await fetch(`http://127.0.0.1:9000/.json?ns=${ns}`, {method:'DELETE'});
  if(!r.ok) console.warn('no se pudo vaciar', ns, r.status);
}
console.log('→ emulador vaciado\n');

const resultados = [];
const ok = (nombre, cond, detalle) => { resultados.push({nombre, ok: !!cond, detalle}); console.log((cond?'✅':'❌')+' '+nombre+(detalle?'  → '+detalle:'')); };

// Cada dispositivo, en su propio contexto de navegador. Con newPage() a
// secas comparten localStorage e IndexedDB: no serían dos aparatos, sino
// dos pestañas del mismo — y entonces "el idioma se le cambió al otro" o
// "se perdió una línea" son artefactos de la prueba, no fallos de la app.
const contextos = [];
async function nuevoDispositivo(){
  const ctx = await browser.createBrowserContext();
  contextos.push(ctx);
  const page = await ctx.newPage();
  await page.setCacheEnabled(false);
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.setRequestInterception(true);
  page.on('request', req => {
    const m = req.url().match(/gstatic\.com\/firebasejs\/[\d.]+\/(firebase-[a-z-]+\.js)/);
    if(m) return req.continue({url: 'http://localhost:8951/__sdk/'+m[1]});
    req.continue();
  });
  // La Firebase COMPARTIDA de la plataforma (licencias, cuentas y la tabla
  // que dice a qué nube conectarse) también al emulador: si no, todo lo que
  // pase por ahí es inalcanzable en pruebas y no se puede comprobar.
  await page.evaluateOnNewDocument(() => {
    const parche = () => {
      try{
        if(typeof PLATFORM_FIREBASE_CONFIG === 'undefined') return false;
        PLATFORM_FIREBASE_CONFIG.databaseURL = 'http://127.0.0.1:9000/?ns=demo-plataforma';
        return true;
      }catch(e){ return false; }
    };
    // La constante nace al cargar core.js, así que se insiste hasta que exista.
    const iv = setInterval(() => { if(parche()) clearInterval(iv); }, 5);
    setTimeout(() => clearInterval(iv), 4000);
    /* Y la guía de la plataforma se desactiva del todo. connectCloud() la
       escribe ANTES de conectar con la nube del negocio, y aquí la plataforma
       no es alcanzable: si esa llamada tarda o lanza, el aparato se queda sin
       conectar y TODOS los escenarios de dos dispositivos fallan sin que se
       vea por qué. Lo que se prueba aquí es la sincronización entre aparatos,
       no la guía — eso lo cubre el escenario 4 aparte. */
    const iv2 = setInterval(() => {
      if(typeof window.publishTenantLookup === 'function' && !window.publishTenantLookup.__mudo){
        const mudo = () => Promise.resolve();
        mudo.__mudo = true;
        window.publishTenantLookup = mudo;
        clearInterval(iv2);
      }
    }, 5);
    setTimeout(() => clearInterval(iv2), 6000);
  });
  return {page, errs};
}

async function arrancar(d, code, opts={}){
  await d.page.goto('http://localhost:8951/index.html',{waitUntil:'domcontentloaded'});
  /* ⚠️ Hay que ESPERAR a que la app termine de cargar su base de datos antes
     de tocarla. loadDB() es asíncrona: escribiendo aquí a pelo se rellena el
     DB por defecto, se guarda, y un instante después loadDB() resuelve y
     REEMPLAZA DB entero con lo que había en IndexedDB — que no tiene nada.
     La nube del negocio desaparecía así, y el aparato se quedaba en local:
     seis de los ocho escenarios fallaban por esto, y el síntoma que se veía
     ("no conecta") apuntaba a la red, que no tenía nada que ver. */
  await d.page.evaluate(() => (typeof dbReadyPromise !== 'undefined') ? dbReadyPromise : null).catch(()=>{});
  await d.page.evaluate(async ({code, dburl, sinNube})=>{
    localStorage.setItem('gastrogoan_license_v1',JSON.stringify({code, tenantId: ggBizTenantId(code)}));
    localStorage.setItem('gastrogoan_owner_pass_prompted','1');
    localStorage.setItem('gastrogoan_owner_login',JSON.stringify({user:'jefe',authKey:'k',pinHash:'h'}));
    localStorage.setItem('gastrogoan_access_session',JSON.stringify({type:'owner',ts:Date.now()}));
    Object.assign(DB.business,{netlifySetupDone:true,extConnPromptSeen:true,tourSeen:true,categoryIconHintSeen:true});
    if(!sinNube) DB.business.ownFirebase = {apiKey:'fake-api-key', databaseURL: dburl};
    await saveDB();
  }, {code, dburl:DBURL, sinNube: !!opts.sinNube});
  await d.page.reload({waitUntil:'domcontentloaded'});
  await new Promise(r=>setTimeout(r,3200));
  await d.page.evaluate(()=>{ ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove()); });
}
/* No basta con un sí/no: cuando esto falla, TODOS los escenarios de dos
   dispositivos fallan detrás y sin decir por qué. Devuelve además en qué
   estado quedó el indicador de nube y el último error registrado, que es lo
   que de verdad explica qué pasó. */
async function conectado(d){
  return await d.page.evaluate(()=>({
    ok: typeof cloudRef !== 'undefined' && !!cloudRef,
    badge: typeof lastSyncBadgeState !== 'undefined' ? lastSyncBadgeState : '(sin badge)',
    cfg: (typeof getCloudConfig === 'function' && getCloudConfig()) ? getCloudConfig().databaseURL : '(sin config)',
    tenant: typeof getTenantId === 'function' ? getTenantId() : '(sin tenant)',
    firebase: typeof firebase !== 'undefined' ? (firebase.apps||[]).map(a=>a.name).join('+') : 'NO CARGÓ',
    ultimoError: (typeof ultimoErrorNube !== 'undefined' && ultimoErrorNube) ? String(ultimoErrorNube).slice(0,90) : null,
    // Lo que de verdad hace falta saber: ¿sobrevivió la nube del negocio a la
    // recarga, o se perdió por el camino? Si se pierde, no es la red: es que
    // la configuración no llega a guardarse — y eso le pasaría igual a un
    // cliente en su primer arranque.
    ownFirebase: (DB.business && DB.business.ownFirebase) ? DB.business.ownFirebase.databaseURL : '(NO ESTÁ en DB.business)',
    negocio: DB.business ? Object.keys(DB.business).length + ' campos' : 'sin business',
  }));
}

/* ═══ 1. IDIOMA: ¿la nube lo pisa al recargar? ═══════════════════════ */
{
  const CODE='ESCEN001';
  const A = await nuevoDispositivo(); await arrancar(A, CODE);
  const B = await nuevoDispositivo(); await arrancar(B, CODE);
  await new Promise(r=>setTimeout(r,2000));
  // A se pone en catalán (setLang recarga la página solo)
  await A.page.evaluate(()=>{ try{ setLang('ca'); }catch(e){} });
  await new Promise(r=>setTimeout(r,3500));
  await A.page.evaluate(()=>{ ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove()); });
  const idiomaA = await A.page.evaluate(()=> getLang());
  ok('1. El idioma aguanta la recarga con la nube conectada', idiomaA==='ca', 'quedó en "'+idiomaA+'"');
  // Y no se le cambia al otro dispositivo (es ajuste de cada aparato)
  await new Promise(r=>setTimeout(r,2500));
  const idiomaB = await B.page.evaluate(()=> getLang());
  ok('2. No le cambia el idioma al otro dispositivo', idiomaB==='es', 'el otro quedó en "'+idiomaB+'"');
  await A.page.close(); await B.page.close();
}

/* ═══ 2. MÓVIL NUEVO DEL DUEÑO: solo licencia, sin saber qué nube ════ */
{
  const CODE='ESCEN002';
  const A = await nuevoDispositivo(); await arrancar(A, CODE);          // configura la nube
  await new Promise(r=>setTimeout(r,2500));
  const diag = await conectado(A);
  ok('3. El primer dispositivo conecta', diag.ok,
     diag.ok ? '' : `badge=${diag.badge} · apps=${diag.firebase} · cfg=${diag.cfg} · ownFirebase=${diag.ownFirebase} · ${diag.negocio}` +
       (diag.ultimoError ? ' · error='+diag.ultimoError : ''));
  const B = await nuevoDispositivo(); await arrancar(B, CODE, {sinNube:true});  // móvil nuevo
  await new Promise(r=>setTimeout(r,5000));
  const cfgB = await B.page.evaluate(()=> getCloudConfig());
  ok('4. El móvil nuevo del dueño encuentra la nube solo', !!cfgB && !!cfgB.databaseURL,
     cfgB ? 'la encontró' : 'se quedó en local sin avisar');
  await A.page.close(); await B.page.close();
}

/* ═══ 3. BORRAR UNA CARPETA: ¿la resucita el otro dispositivo? ═══════
   Las carpetas (ingredientCategories / recipeCategories) son NOMBRES: no
   tienen id, así que mergeArraysById las dejaba pasar de largo y mandaba la
   lista de la nube entera. Con dos aparatos, el que no se había enterado del
   borrado devolvía la carpeta y reaparecía sola.
   Este es el único sitio donde se puede comprobar de verdad: hace falta
   Firebase escribiendo y dos navegadores que no comparten nada. */
{
  const CODE='ESCEN005';
  const A = await nuevoDispositivo(); await arrancar(A, CODE);
  const B = await nuevoDispositivo(); await arrancar(B, CODE);
  await new Promise(r=>setTimeout(r,2500));

  // Los dos parten de las mismas cuatro carpetas.
  await A.page.evaluate(()=>{
    DB.ingredientCategories = ['Pescados','Verduras','Salsas','Congelados'];
    saveDB();
  });
  await new Promise(r=>setTimeout(r,4000));
  const arrancaIgual = await B.page.evaluate(()=> (DB.ingredientCategories||[]).length);

  // A borra una carpeta. B, que todavía no lo sabe, crea otra.
  await A.page.evaluate(()=>{
    DB.ingredientCategories = DB.ingredientCategories.filter(c => c !== 'Salsas');
    saveDB();
  });
  await B.page.evaluate(()=>{
    DB.ingredientCategories = [...DB.ingredientCategories, 'DesdeElMovil'];
    saveDB();
  });
  await new Promise(r=>setTimeout(r,6000));

  const final = await A.page.evaluate(()=> [...(DB.ingredientCategories||[])].sort());
  const finalB = await B.page.evaluate(()=> [...(DB.ingredientCategories||[])].sort());
  ok('5. Una carpeta borrada no vuelve cuando sincroniza el otro aparato',
     arrancaIgual === 4 && !final.includes('Salsas') && !finalB.includes('Salsas'),
     'tablet: '+JSON.stringify(final)+' · móvil: '+JSON.stringify(finalB));
  ok('6. Y la que creó el otro aparato sí llega',
     final.includes('DesdeElMovil'), 'tablet: '+JSON.stringify(final));
  await A.page.close(); await B.page.close();
}

/* ═══ 4. AVISOS PUSH: ¿un dispositivo borra los del otro? ════════════ */
{
  const CODE='ESCEN003';
  const A = await nuevoDispositivo(); await arrancar(A, CODE);
  const B = await nuevoDispositivo(); await arrancar(B, CODE);
  await new Promise(r=>setTimeout(r,2500));
  await A.page.evaluate(()=>{ DB.pushSubscriptions=[{deviceId:'tablet',subscription:{a:1},updatedAt:100}]; saveDB(); });
  await new Promise(r=>setTimeout(r,3000));
  await B.page.evaluate(()=>{
    DB.pushSubscriptions = (DB.pushSubscriptions||[]).concat([{deviceId:'movil',subscription:{b:1},updatedAt:200}]);
    saveDB();
  });
  await new Promise(r=>setTimeout(r,4000));
  const enA = await A.page.evaluate(()=> (DB.pushSubscriptions||[]).map(s=>s.deviceId).sort().join(','));
  ok('5. Las suscripciones de los dos dispositivos conviven', enA==='movil,tablet', 'la tablet ve: '+enA);
  await A.page.close(); await B.page.close();
}

/* ═══ 5. MISMA MESA A LA VEZ: ¿se pierde alguna comanda? ═════════════ */
{
  const CODE='ESCEN004';
  const A = await nuevoDispositivo(); await arrancar(A, CODE);
  const B = await nuevoDispositivo(); await arrancar(B, CODE);
  await new Promise(r=>setTimeout(r,2500));
  await A.page.evaluate(()=>{
    DB.tables=[{id:1,name:'Mesa 1',zona:'Salón',plazas:4}];
    DB.tpvOrders=[{id:5000,tableId:1,tipo:'mesa',status:'abierta',items:[],tandas:[],createdAt:new Date().toISOString()}];
    saveDB();
  });
  await new Promise(r=>setTimeout(r,3500));
  // Los dos camareros añaden a la MISMA comanda casi a la vez
  /* Si la comanda no llegó al otro aparato, este escenario no puede hacer su
     trabajo — pero tampoco puede REVENTAR: hacía caer el proceso entero y los
     escenarios de después ni se ejecutaban, así que un problema de entorno
     escondía todo lo demás. */
  await Promise.all([
    A.page.evaluate(()=>{ const o=(DB.tpvOrders||[]).find(x=>x.id===5000); if(o) o.items.push({lineId:genId(),platoId:1,name:'PLATO_DE_LA_TABLET',qty:1,price:10,tanda:'',notas:''}); saveDB(); }),
    B.page.evaluate(()=>{ const o=(DB.tpvOrders||[]).find(x=>x.id===5000); if(o) o.items.push({lineId:genId(),platoId:2,name:'PLATO_DEL_MOVIL',qty:1,price:8,tanda:'',notas:''}); saveDB(); }),
  ]);
  await new Promise(r=>setTimeout(r,6000));
  const final = await A.page.evaluate(()=>{
    const o=(DB.tpvOrders||[]).find(x=>x.id===5000);
    return o ? o.items.map(i=>i.name).sort() : null;
  });
  ok('6. Dos camareros en la misma mesa: no se pierde ninguna línea',
     final && final.length===2, 'quedó: '+JSON.stringify(final));
  await A.page.close(); await B.page.close();
}

for(const c of contextos){ try{ await c.close(); }catch(e){} }
await browser.close();
console.log('\n'+'─'.repeat(60));
const fallos = resultados.filter(r=>!r.ok);
console.log(fallos.length ? `❌ ${fallos.length} de ${resultados.length} fallaron` : `✅ los ${resultados.length} escenarios pasaron`);
