// ¿La web pública de reservas hace caso a los datos REALES del negocio
// (horario, mesas, aforo) y a lo que YA está reservado, sincronizado desde
// la nube de verdad del negocio — no a una copia simulada a mano?
//
// Esto encontró un fallo real: loadBusinessInfo() (reservagastrogoan.html)
// nunca copiaba `val.mesasOcupadas` a `DB.mesasOcupadas`, aunque el negocio
// SÍ lo publicaba (syncPublicMirror, js/core.js). Sin ese dato, cualquier
// mesa parecía libre a cualquier hora en el calendario y en getBestFitTable,
// por muy reservada que estuviera de verdad — solo la transacción atómica
// de mesaHold, ya en el último paso al enviar, evitaba el choque real.
//
// Dos navegadores reales contra el emulador oficial: uno hace de negocio
// (index.html, con su propia nube), otro de cliente en la web pública
// (reservagastrogoan.html), conectado a la MISMA nube — como en producción.
import puppeteer from 'puppeteer-core';

const DBURL_NEGOCIO = 'http://127.0.0.1:9000/?ns=demo-gastrogoan';
const browser = await puppeteer.launch({
  executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--no-sandbox'], headless:true });

for(const ns of ['demo-gastrogoan','demo-plataforma']){
  const r = await fetch(`http://127.0.0.1:9000/.json?ns=${ns}`, {method:'DELETE'});
  if(!r.ok) console.warn('no se pudo vaciar', ns, r.status);
}

const resultados = [];
const ok = (nombre, cond, detalle) => { resultados.push({nombre, ok: !!cond, detalle}); console.log((cond?'✅':'❌')+' '+nombre+(detalle?'  → '+detalle:'')); };

async function nuevoNegocio(){
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setCacheEnabled(false);
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.setRequestInterception(true);
  page.on('request', req => {
    const m = req.url().match(/gstatic\.com\/firebasejs\/[\d.]+\/(firebase-[a-z-]+\.js)/);
    if(m) return req.continue({url: 'http://localhost:8951/__sdk/'+m[1]});
    req.continue();
  });
  await page.evaluateOnNewDocument(() => {
    const parche = () => {
      try{
        if(typeof PLATFORM_FIREBASE_CONFIG === 'undefined') return false;
        PLATFORM_FIREBASE_CONFIG.databaseURL = 'http://127.0.0.1:9000/?ns=demo-plataforma';
        return true;
      }catch(e){ return false; }
    };
    const iv = setInterval(() => { if(parche()) clearInterval(iv); }, 5);
    setTimeout(() => clearInterval(iv), 4000);
  });
  return {ctx, page, errs};
}
async function nuevoCliente(){
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setCacheEnabled(false);
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.setRequestInterception(true);
  page.on('request', req => {
    const m = req.url().match(/gstatic\.com\/firebasejs\/[\d.]+\/(firebase-[a-z-]+\.js)/);
    if(m) return req.continue({url: 'http://localhost:8951/__sdk/'+m[1]});
    req.continue();
  });
  // La web pública apunta la PLATAFORMA (FIREBASE_CONFIG) al emulador. El
  // primer intento (REST directo) fallará contra el formato de namespace
  // del emulador y caerá sola al camino de siempre, por SDK — que sí
  // entiende el ?ns= — exactamente el mismo "por si las reglas de la
  // plataforma no dejan la lectura abierta" que ya tenía previsto el código.
  await page.evaluateOnNewDocument(() => {
    const parche = () => {
      try{
        if(typeof FIREBASE_CONFIG === 'undefined') return false;
        FIREBASE_CONFIG.databaseURL = 'http://127.0.0.1:9000/?ns=demo-plataforma';
        return true;
      }catch(e){ return false; }
    };
    const iv = setInterval(() => { if(parche()) clearInterval(iv); }, 5);
    setTimeout(() => clearInterval(iv), 4000);
  });
  return {ctx, page, errs};
}

async function arrancarNegocio(d, code){
  await d.page.goto('http://localhost:8951/index.html',{waitUntil:'domcontentloaded'});
  await d.page.evaluate(() => (typeof dbReadyPromise !== 'undefined') ? dbReadyPromise : null).catch(()=>{});
  await d.page.evaluate(async ({code, dburl})=>{
    localStorage.setItem('gastrogoan_license_v1',JSON.stringify({code, tenantId: ggBizTenantId(code)}));
    localStorage.setItem('gastrogoan_owner_pass_prompted','1');
    localStorage.setItem('gastrogoan_owner_login',JSON.stringify({user:'jefe',authKey:'k',pinHash:'h'}));
    localStorage.setItem('gastrogoan_access_session',JSON.stringify({type:'owner',ts:Date.now()}));
    Object.assign(DB.business,{netlifySetupDone:true,extConnPromptSeen:true,tourSeen:true,categoryIconHintSeen:true});
    DB.business.ownFirebase = {apiKey:'fake-api-key', databaseURL: dburl};
    await saveDB();
  }, {code, dburl:DBURL_NEGOCIO});
  await d.page.reload({waitUntil:'domcontentloaded'});
  await new Promise(r=>setTimeout(r,3200));
  await d.page.evaluate(()=>{ ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove()); });
}

const CODE = 'RESPUB01';
const negocio = await nuevoNegocio();
await arrancarNegocio(negocio, CODE);
await new Promise(r=>setTimeout(r,2000));

// Mañana, dentro del horario configurado, para no chocar con "antelación
// mínima" ni con que hoy ya haya pasado la hora.
const manana = new Date(Date.now() + 24*60*60*1000);
const fecha = manana.getFullYear() + '-' + String(manana.getMonth()+1).padStart(2,'0') + '-' + String(manana.getDate()).padStart(2,'0');

const publicId = await negocio.page.evaluate(async ({fecha}) => {
  DB.business.horario = Array.from({length:7}, () => ({abierto:true, modo:'seguido', seguido:{ini:'13:00', fin:'23:00'}}));
  DB.business.aforo = 0; // sin límite de aforo total: lo que manda aquí es la mesa
  DB.tables = [{id:1, name:'Mesa única', plazas:4}];
  DB.reservations = [{
    id: genId(), clientId:null, clientName:'Cliente de prueba', clientPhone:'600000000', clientEmail:'',
    date: fecha, time:'14:00', people:4, tableId:1, notes:'', status:'confirmada', origen:'manual', createdAt:new Date().toISOString()
  }];
  await saveDB();
  await comprobarEspejoEnNubePropia();
  return getPublicId();
}, {fecha});
ok('El negocio conecta y publica su publicId', !!publicId, 'publicId='+publicId);

// Dar tiempo a que el sync del espejo público (mesasOcupadas incluido)
// llegue de verdad a la nube, no asumirlo.
await new Promise(r=>setTimeout(r,5000));

const cliente = await nuevoCliente();
await cliente.page.goto(`http://localhost:8951/reservagastrogoan.html?neg=${publicId}`, {waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,4000));

const estado = await cliente.page.evaluate(({fecha}) => {
  return {
    tieneMesasOcupadas: !!(DB.mesasOcupadas && Object.keys(DB.mesasOcupadas).length),
    ocupadoA_las_14: !!((DB.mesasOcupadas||{})[fecha]||{})[1]?.['14:00'],
    aforoConfigurado: DB.business ? DB.business.aforo : 'sin business',
    mesas: DB.tables,
  };
}, {fecha});
ok('La web pública recibe DB.mesasOcupadas de verdad (no queda vacío)', estado.tieneMesasOcupadas, JSON.stringify(estado));
ok('La mesa reservada a las 14:00 aparece como ocupada A ESA HORA en la web pública', estado.ocupadoA_las_14,
   'mesasOcupadas del día: ' + JSON.stringify(estado));

// El calendario, con la mesa ya ocupada: un grupo de 4 (cabe justo en la
// única mesa, que ya está cogida a esa hora) debe verla como NO disponible;
// un grupo de 2 en un horario SIN ninguna reserva ese mismo día sí debe
// poder, porque la mesa cabe y está libre a otras horas.
const calc = await cliente.page.evaluate(({fecha}) => ({
  ocupadaA14: checkSlotFree(fecha, '14:00', 4),
  libreA20: checkSlotFree(fecha, '20:00', 2),
  diaEstadoGrupo4: computeDayStatus(fecha, 4),
}), {fecha});
ok('checkSlotFree dice NO a las 14:00 para un grupo que llenaría la única mesa, ya ocupada esa hora', calc.ocupadaA14 === false, JSON.stringify(calc));
ok('checkSlotFree dice SÍ a las 20:00 (misma mesa, libre a esa hora) para un grupo de 2', calc.libreA20 === true, JSON.stringify(calc));
ok('El día entero no sale "lleno" solo porque las 14:00 estén cogidas (hay más huecos libres)', calc.diaEstadoGrupo4 === 'libre', JSON.stringify(calc));

console.log('\nERRORES JS:', JSON.stringify([...negocio.errs, ...cliente.errs]));

await negocio.ctx.close(); await cliente.ctx.close();
await browser.close();

console.log('\n'+'─'.repeat(60));
const fallos = resultados.filter(r=>!r.ok);
console.log(fallos.length ? `❌ ${fallos.length} de ${resultados.length} fallaron` : `✅ los ${resultados.length} escenarios pasaron`);
process.exit(fallos.length ? 1 : 0);
