/* Espejo público y sesión lenta (17/11). La sonda de reglas escribe en la nube del negocio, que solo deja escribir a una sesión
 * iniciada. Si corría ANTES de que terminara el inicio de sesión anónimo, Firebase decía «permiso denegado», la app lo leía como
 * «reglas antiguas» y el negocio se quedaba en la nube compartida —con el aviso rojo de «actualiza tus reglas»— hasta el siguiente
 * arranque, aunque las tuviera bien pegadas. Se prueba contra las reglas REALES: se cierra la sesión, se lanza la sonda y la sesión
 * vuelve medio segundo después. Debe esperar y dar «reglas nuevas». Se ejecuta desde run.sh. */
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const CODE = 'EMUSES001', DB_NEGOCIO = 'http://127.0.0.1:9000/?ns=demo-gastrogoan', BASE = 'http://app.test:8951';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox', '--host-resolver-rules=MAP app.test 127.0.0.1'], headless:true});
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const ctx = await (browser.createBrowserContext ? browser.createBrowserContext() : browser.createIncognitoBrowserContext());
const p = await ctx.newPage(); await p.setCacheEnabled(false);
await p.setRequestInterception(true);
p.on('request', req => {
  const m = req.url().match(/gstatic\.com\/firebasejs\/[\d.]+\/(firebase-[a-z-]+\.js)/);
  if(m) return req.continue({url: 'http://localhost:8951/__sdk/' + m[1]});
  let h = ''; try{ h = new URL(req.url()).hostname; }catch(e){}
  if(h !== '127.0.0.1' && h !== 'localhost' && h !== 'app.test' && /googleapis|raw.githubusercontent|qrserver/.test(req.url())) return req.abort();
  req.continue();
});
await p.goto(BASE + '/index.html', {waitUntil: 'domcontentloaded'});
await p.evaluate(async ([code, dburl]) => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
  localStorage.setItem('gastrogoan_owner_login', JSON.stringify({user: 'jefe', authKey: 'k'.repeat(20), pinHash: 'h'}));
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type: 'owner', ts: Date.now()}));
  Object.assign(DB.business, {name: 'Casa Sesion', netlifySetupDone: true, extConnPromptSeen: true, tourSeen: true, categoryIconHintSeen: true});
  DB.business.ownFirebase = {apiKey: 'fake-api-key', databaseURL: dburl};
  await saveDB();
}, [CODE, DB_NEGOCIO]);
await p.reload({waitUntil: 'domcontentloaded'}); await new Promise(r => setTimeout(r, 9000));
const r = await p.evaluate(async () => {
  const app = firebase.app();
  await app.auth().signOut();                                  // la sesión se cae…
  espejoEnNubePropia = null; reglasAntiguas = false; reglasFallo = null;
  const sonda = comprobarEspejoEnNubePropia();                 // …la sonda arranca SIN sesión…
  await new Promise(r => setTimeout(r, 600));
  await app.auth().signInAnonymously();                         // …y la sesión vuelve medio segundo después
  const ret = await sonda;
  return {ret, espejo: espejoEnNubePropia, antiguas: reglasAntiguas, fallo: reglasFallo};
});
await caso('La sonda espera a la sesión: con las reglas reales sale «nube propia» y NO «reglas antiguas»', async () => {
  assert.equal(r.espejo, true, JSON.stringify(r)); assert.equal(r.antiguas, false, JSON.stringify(r)); assert.equal(r.fallo, null);
});
const r2 = await p.evaluate(async () => {
  const app = firebase.app();
  await app.auth().signOut();
  espejoEnNubePropia = null; reglasAntiguas = false; reglasFallo = null;
  const t0 = Date.now();
  // Sin sesión y sin que vuelva: no se puede saber nada → no se dice «reglas antiguas». (Se acorta la espera para no tardar 20 s.)
  const original = ggEsperarSesionNegocio; window.ggEsperarSesionNegocio = (a) => original(a, 1500);
  const ret = await comprobarEspejoEnNubePropia();
  window.ggEsperarSesionNegocio = original;
  return {ret, espejo: espejoEnNubePropia, antiguas: reglasAntiguas, ms: Date.now() - t0};
});
await caso('Sin sesión no se condena a nadie: ni «reglas antiguas» ni «nube compartida» para siempre', async () => {
  assert.equal(r2.antiguas, false, JSON.stringify(r2)); assert.notEqual(r2.espejo, false, JSON.stringify(r2));
});
await browser.close();
console.log(fallos ? '\n❌ ' + fallos + ' fallo(s)' : '\n✅ el espejo no se condena por una sesión lenta');
process.exit(fallos ? 1 : 0);
