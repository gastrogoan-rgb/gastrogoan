/* ¿La app sube a la nube MÁS DE LA CUENTA? (13/09)
 *
 * El dueño contó que desde hacía dos o tres días la app iba lenta y se le
 * quedaba congelada. Los renders no habían cambiado (medido), así que la
 * sospecha era el otro sitio donde la app puede quedarse dando vueltas:
 * el bucle de sincronización.
 *
 * El patrón, que ya mordió antes: `applyRemoteBlock` fusiona lo remoto con
 * lo local; si el resultado NO coincide con lo que la nube tiene, se vuelve a
 * subir; la nube dispara el listener otra vez; y si esa fusión nunca
 * converge, el aparato se pasa la vida subiendo, repintando la pantalla en
 * cada vuelta. Desde fuera: "va lenta y se congela".
 *
 * Esto mide exactamente eso: se cuentan las escrituras reales a Firebase
 * (envolviendo `update`/`set` del propio SDK en la página) mientras se hace
 * UN cambio pequeño y se espera. Un cambio = una subida (o dos, contando el
 * espejo público). Decenas = bucle.
 */
import puppeteer from 'puppeteer-core';

const CODE = 'EMUBUCLE';
const DBURL = 'http://127.0.0.1:9000/?ns=demo-gastrogoan';
const browser = await puppeteer.launch({
  executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--no-sandbox'], headless:true});

const page = await browser.newPage();
await page.setCacheEnabled(false);
const errores = [];
page.on('pageerror', e => errores.push(e.message));
await page.setRequestInterception(true);
page.on('request', req => {
  const m = req.url().match(/gstatic\.com\/firebasejs\/[\d.]+\/(firebase-[a-z-]+\.js)/);
  if(m) return req.continue({url: 'http://localhost:8951/__sdk/'+m[1]});
  req.continue();
});

await page.goto('http://localhost:8951/index.html', {waitUntil:'domcontentloaded'});
await page.evaluate(() => (typeof dbReadyPromise !== 'undefined') ? dbReadyPromise : null).catch(()=>{});
await page.evaluate(async ({code, dburl}) => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  localStorage.setItem('gastrogoan_owner_login', JSON.stringify({user:'jefe', authKey:'k', pinHash:'h'}));
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  Object.assign(DB.business, {netlifySetupDone:true, extConnPromptSeen:true, tourSeen:true, categoryIconHintSeen:true});
  DB.business.ownFirebase = {apiKey:'fake-api-key', databaseURL: dburl};
  await saveDB();
}, {code: CODE, dburl: DBURL});
await page.reload({waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r,3500));
await page.evaluate(()=>{
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate'].forEach(id=>document.getElementById(id)?.remove());
});

// Contador de escrituras reales: se envuelve el prototipo del SDK, así que
// cuenta lo que de verdad sale hacia Firebase, no lo que la app cree enviar.
await page.evaluate(() => {
  window.__subidas = [];
  const Ref = firebase.database.Reference.prototype;
  ['update','set'].forEach(metodo => {
    const orig = Ref[metodo];
    Ref[metodo] = function(valor){
      const ruta = String(this.toString()).replace(/^https?:\/\/[^/]+/, '');
      const claves = (metodo === 'update' && valor && typeof valor === 'object') ? Object.keys(valor) : [];
      window.__subidas.push({metodo, ruta, claves});
      return orig.apply(this, arguments);
    };
  });
});

let fallos = 0;
const caso = async (nombre, fn) => {
  try{ await fn(); console.log('✅ ' + nombre); }
  catch(e){ fallos++; console.log('❌ ' + nombre + '\n   ⤷ ' + e.message); }
};

// Cuenta las subidas provocadas por `accion`, esperando a que todo se calme.
async function subidasDe(accion, esperaMs = 9000){
  await page.evaluate(()=>{ window.__subidas = []; });
  await page.evaluate(accion);
  await new Promise(r=>setTimeout(r, esperaMs));
  return page.evaluate(()=> window.__subidas.slice());
}

const resumen = subidas => {
  const porBloque = {};
  subidas.forEach(s => s.claves.forEach(k => porBloque[k] = (porBloque[k]||0) + 1));
  return Object.entries(porBloque).sort((a,b)=>b[1]-a[1]).map(([k,n])=>`${k}×${n}`).join(', ') || '(ninguna)';
};

await caso('Estar quieto no sube nada a la nube', async () => {
  const subidas = await subidasDe(()=>{}, 9000);
  const alTenant = subidas.filter(s => /tenants/.test(s.ruta));
  if(alTenant.length) throw new Error(`sin tocar nada se subieron ${alTenant.length}: ${resumen(alTenant)}`);
});

await caso('Un cambio pequeño sube UNA vez y se queda quieto', async () => {
  const subidas = await subidasDe(async ()=>{
    DB.business.name = 'Bar del Bucle ' + Date.now();
    await saveDB();
  });
  const alTenant = subidas.filter(s => /tenants/.test(s.ruta));
  // Margen generoso: la subida del bloque + el espejo público + algún
  // retoque. Lo que se busca aquí es el bucle, no la perfección.
  if(alTenant.length > 6) throw new Error(`${alTenant.length} subidas para un solo cambio — huele a bucle: ${resumen(alTenant)}`);
  console.log(`   · ${alTenant.length} subida(s): ${resumen(alTenant)}`);
});

await caso('Un gasto nuevo en Gestión Económica no deja la nube dando vueltas', async () => {
  const subidas = await subidasDe(async ()=>{
    DB.ge = DB.ge || {};
    DB.ge.variables = DB.ge.variables || [];
    DB.ge.variables.push({id: Date.now(), fecha: todayStr(), proveedor:'Prueba', concepto:'Caja de prueba',
      importe: 12.5, iva: 10, categoria:'MATERIA PRIMA'});
    await saveDB();
  });
  const alTenant = subidas.filter(s => /tenants/.test(s.ruta));
  if(alTenant.length > 6) throw new Error(`${alTenant.length} subidas — el bloque ge no converge: ${resumen(alTenant)}`);
  console.log(`   · ${alTenant.length} subida(s): ${resumen(alTenant)}`);
});

await caso('Borrar algo (que deja lápida) tampoco entra en bucle', async () => {
  const subidas = await subidasDe(async ()=>{
    DB.ingredientCategories = DB.ingredientCategories || [];
    DB.ingredientCategories.push('CategoriaDePrueba');
    await saveDB();
    await new Promise(r=>setTimeout(r,1500));
    DB.ingredientCategories = DB.ingredientCategories.filter(c => c !== 'CategoriaDePrueba');
    await saveDB();
  }, 11000);
  const alTenant = subidas.filter(s => /tenants/.test(s.ruta));
  if(alTenant.length > 10) throw new Error(`${alTenant.length} subidas para crear+borrar: ${resumen(alTenant)}`);
  console.log(`   · ${alTenant.length} subida(s): ${resumen(alTenant)}`);
});

await caso('Y después de todo eso, la nube queda en reposo', async () => {
  const subidas = await subidasDe(()=>{}, 10000);
  const alTenant = subidas.filter(s => /tenants/.test(s.ruta));
  if(alTenant.length) throw new Error(`sigue subiendo sola: ${alTenant.length} — ${resumen(alTenant)}`);
});

await caso('Ningún error de JavaScript', async () => {
  if(errores.length) throw new Error(errores.join(' | '));
});

console.log('\n' + '─'.repeat(60));
if(fallos) console.log(`❌ ${fallos} escenario(s) fallaron`);
else console.log('✅ la sincronización no da vueltas de más');
await browser.close();
process.exit(fallos ? 1 : 0);
