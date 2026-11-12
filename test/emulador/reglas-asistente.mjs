// ASISTENTE «ACTUALIZAR MIS REGLAS» CONTRA FIREBASE DE VERDAD (12/11). Se arranca con las reglas VIEJAS de un negocio (las de antes de la carta por QR) cargadas en el
// emulador; la app las detecta sola con su sonda real; el asistente, en su último paso, dice «todavía no están publicadas»; y cuando «se publican» las reglas nuevas
// en el emulador (lo que haría el cliente pulsando Publicar en Firebase) el asistente lo detecta SOLO y pasa a «¡Listo!». Se ejecuta desde run.sh.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';

const CODE = 'EMUREG01', DB_NEGOCIO = 'http://127.0.0.1:9000/?ns=demo-gastrogoan';
const BASE = 'http://app.test:8951';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox', '--host-resolver-rules=MAP app.test 127.0.0.1'], headless:true});
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const w = ms => new Promise(r => setTimeout(r, ms));
const poner = async reglas => { const r = await fetch('http://127.0.0.1:9000/.settings/rules.json?ns=demo-gastrogoan', {method: 'PUT', headers: {Authorization: 'Bearer owner'}, body: typeof reglas === 'string' ? reglas : JSON.stringify(reglas)}); if(!r.ok) throw new Error('no se pudieron cargar las reglas: ' + r.status + ' ' + await r.text()); };

// Las reglas VIEJAS: la última versión del fichero ANTES de añadir la carta por QR en la mesa (mesaQr), que es lo que la sonda comprueba.
const viejas = execSync('git show 262c5ed:reglas/reglas-de-cada-negocio.json', {cwd: process.cwd()}).toString();
assert.ok(!/mesaQr/.test(viejas), 'estas reglas ya llevan mesaQr: no son las viejas');
await poner(viejas);

const ctx = await (browser.createBrowserContext ? browser.createBrowserContext() : browser.createIncognitoBrowserContext());
const page = await ctx.newPage(); await page.setViewport({width: 1280, height: 900}); await page.setCacheEnabled(false);
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.setRequestInterception(true);
page.on('request', req => {
  const m = req.url().match(/gstatic\.com\/firebasejs\/[\d.]+\/(firebase-[a-z-]+\.js)/);
  if(m) return req.continue({url: 'http://localhost:8951/__sdk/' + m[1]});
  let host = ''; try{ host = new URL(req.url()).hostname; }catch(e){}
  if(host !== '127.0.0.1' && host !== 'localhost' && /googleapis|raw.githubusercontent|qrserver/.test(req.url())) return req.abort();
  req.continue();
});
await page.evaluateOnNewDocument(() => { try{ localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10)); }catch(e){} });
await page.goto(BASE + '/index.html', {waitUntil: 'domcontentloaded'});
await page.evaluate(() => (typeof dbReadyPromise !== 'undefined') ? dbReadyPromise : null).catch(() => {});
await page.evaluate(async ([code, dburl]) => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
  localStorage.setItem('gastrogoan_owner_login', JSON.stringify({user: 'jefe', authKey: 'k'.repeat(20), pinHash: 'h'}));
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type: 'owner', ts: Date.now()}));
  Object.assign(DB.business, {name: 'Casa Paco', netlifySetupDone: true, extConnPromptSeen: true, tourSeen: true, categoryIconHintSeen: true});
  DB.business.ownFirebase = {apiKey: 'fake-api-key', databaseURL: dburl};
  await saveDB();
}, [CODE, DB_NEGOCIO]);
await page.reload({waitUntil: 'domcontentloaded'}); await w(9000);

console.log('DEBUG', JSON.stringify(await page.evaluate(async () => { let r = {}; try{ r.publicId = getPublicId(); r.cfg = !!getCloudConfig(); r.app = !!firebase.app(); r.badge = lastSyncBadgeState; r.err = String(lastSyncErrorCode || ''); r.sonda = await comprobarEspejoEnNubePropia(); }catch(e){ r.excepcion = String(e); } r.viejas = reglasAntiguas; r.espejo = espejoEnNubePropia; return r; })));
await caso('Con las reglas VIEJAS en Firebase, la app lo detecta SOLA (sonda real) y la campana avisa al propietario', async () => {
  const r = await page.evaluate(() => ({viejas: reglasAntiguas, espejo: espejoEnNubePropia}));
  assert.equal(r.viejas, true, 'no detectó las reglas viejas: ' + JSON.stringify(r));
  await page.evaluate(() => avisosPintar()); await w(300);
  await page.evaluate(() => toggleAvisosPanel()); await w(300);
  assert.match(await page.evaluate(() => document.getElementById('avisos-cuerpo').innerText), /reglas de seguridad de tu Firebase/);
});
await caso('El asistente (desde el botón de la campana) llega al último paso y, con las reglas todavía viejas, dice «Todavía no están publicadas»', async () => {
  await page.evaluate(() => [...document.querySelectorAll('#avisos-cuerpo .av-fila button')].find(b => /Actualizar/.test(b.textContent)).click()); await w(500);
  await page.evaluate(() => { reglasCopiado = true; reglasIr(6); });
  let t = ''; for(let i = 0; i < 12; i++){ await w(1000); t = await page.evaluate(() => document.getElementById('reglas-wiz').innerText); if(/Todav/.test(t)) break; }
  assert.match(t, /Todavía no están publicadas/, 'texto del último paso: ' + t.slice(0, 120));
});
await caso('«Publicar» las reglas nuevas en Firebase (lo que hace el cliente): el asistente lo detecta SOLO, pasa a «¡Listo!» y el aviso desaparece', async () => {
  const nuevas = await page.evaluate(() => FIREBASE_RULES_JSON);
  await poner(nuevas);
  let ok = false, t = ''; for(let i = 0; i < 25 && !ok; i++){ await w(1000); t = await page.evaluate(() => document.getElementById('reglas-wiz') ? document.getElementById('reglas-wiz').innerText : ''); ok = /¡Listo!/.test(t); }
  assert.equal(ok, true, 'no detectó la publicación: ' + t.slice(0, 160));
  const r = await page.evaluate(() => ({viejas: reglasAntiguas, espejo: espejoEnNubePropia}));
  assert.deepEqual(r, {viejas: false, espejo: true});
});
await caso('Sin errores de JavaScript', async () => { assert.deepEqual(errs.filter(e => !/network|offline/i.test(e)), []); });
await browser.close();
// Se dejan las reglas reales cargadas para las demás pruebas del banco.
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ el asistente funciona contra Firebase de verdad');
process.exit(fallos ? 1 : 0);
