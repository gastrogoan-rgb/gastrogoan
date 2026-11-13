/* QR de la mesa contra Firebase de verdad (12/11). El dueño escanea el QR y sale «este código QR ya no es válido, pide al camarero el nuevo».
 * La web pública lee `mesaQr/{token}`: si ese nodo no está en la nube, dice eso. Aquí se comprueba la cadena ENTERA con las reglas reales:
 * activar el QR → cada mesa recibe su token → el token llega a la nube → la web pública lo lee. Y los casos que lo rompían:
 * una mesa creada DESPUÉS de activar, un QR mostrado o impreso al momento, y varios cambios seguidos. Se ejecuta desde run.sh. */
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const CODE = 'EMUSOND2', DB_NEGOCIO = 'http://127.0.0.1:9000/?ns=demo-gastrogoan';
const BASE = 'http://app.test:8951';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox', '--host-resolver-rules=MAP app.test 127.0.0.1'], headless:true});
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ ' + n); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + e.message); } }
const w = ms => new Promise(r => setTimeout(r, ms));
const ctx = await (browser.createBrowserContext ? browser.createBrowserContext() : browser.createIncognitoBrowserContext());
async function nueva(){
  const p = await ctx.newPage(); await p.setViewport({width: 1000, height: 900}); await p.setCacheEnabled(false);
  p.errs = []; p.avisos = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if(m.type() === 'warning' || m.type() === 'error') p.avisos.push(m.text()); });
  await p.setRequestInterception(true);
  p.on('request', req => {
    const m = req.url().match(/gstatic\.com\/firebasejs\/[\d.]+\/(firebase-[a-z-]+\.js)/);
    if(m) return req.continue({url: 'http://localhost:8951/__sdk/' + m[1]});
    let host = ''; try{ host = new URL(req.url()).hostname; }catch(e){}
    if(host !== '127.0.0.1' && host !== 'localhost' && host !== 'app.test' && /googleapis|raw.githubusercontent|qrserver/.test(req.url())) return req.abort();
    req.continue();
  });
  await p.evaluateOnNewDocument(() => { try{ localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10)); }catch(e){} });
  return p;
}
const app = await nueva();
await app.goto(BASE + '/index.html', {waitUntil: 'domcontentloaded'});
await app.evaluate(() => (typeof dbReadyPromise !== 'undefined') ? dbReadyPromise : null).catch(() => {});
await app.evaluate(async ([code, dburl]) => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
  localStorage.setItem('gastrogoan_owner_login', JSON.stringify({user: 'jefe', authKey: 'k'.repeat(20), pinHash: 'h'}));
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type: 'owner', ts: Date.now()}));
  Object.assign(DB.business, {name: 'Casa Paco', netlifySetupDone: true, extConnPromptSeen: true, tourSeen: true, categoryIconHintSeen: true});
  DB.business.ownFirebase = {apiKey: 'fake-api-key', databaseURL: dburl};
  DB.tables = [{id: 1, name: 'Mesa 1', zona: 'Salón', plazas: 4}]; DB.business.qrMesa = {activo: true, aceptaCamarero: true};
  await saveDB();
}, [CODE, DB_NEGOCIO]);
await app.reload({waitUntil: 'domcontentloaded'}); await w(9000);
const publicId = await app.evaluate(() => getPublicId());


const pasos = await app.evaluate(async () => {
  const base = firebase.app().database().ref('gastrogoan/public/' + getPublicId());
  const id = '_prueba_' + getOrCreateDeviceId();
  const lista = [
    ['aforoHold set', () => base.child('aforoHold/' + id + '/_prueba').set(0)],
    ['aforoHold remove', () => base.child('aforoHold/' + id + '/_prueba').remove()],
    ['orderStatus set', () => base.child('orderStatus/' + id).set({status: '_prueba', updatedAt: Date.now()})],
    ['orderStatus remove', () => base.child('orderStatus/' + id).remove()],
    ['requests set', () => base.child('requests/_sonda_' + id).set({type: 'reserva', createdAt: Date.now(), _sonda: true})],
    ['requests claim', () => base.child('requests/_sonda_' + id + '/_claimedAt').set(Date.now())],
    ['requests remove', () => base.child('requests/_sonda_' + id).remove()],
    ['reservationLookup set', () => base.child('reservationLookup/_sonda_' + id + '/_prueba_de_sonda').set(true)],
    ['reservationLookup remove', () => base.child('reservationLookup/_sonda_' + id + '/_prueba_de_sonda').remove()],
    ['mesaQr set', () => base.child('mesaQr/_sonda_' + id.padEnd(16, '_')).set({mesa: '_prueba', updatedAt: Date.now()})],
    ['mesaQr remove', () => base.child('mesaQr/_sonda_' + id.padEnd(16, '_')).remove()],
    ['pedido_mesa set', () => base.child('requests/_sondamesa_' + id).set({type: 'pedido_mesa', createdAt: Date.now(), _sonda: true})],
    ['pedido_mesa claim', () => base.child('requests/_sondamesa_' + id + '/_claimedAt').set(Date.now())],
    ['pedido_mesa remove', () => base.child('requests/_sondamesa_' + id).remove()],
  ];
  const out = [];
  for(const [n, f] of lista){ try{ await f(); out.push(n + ': ok'); }catch(e){ out.push(n + ': FALLA ' + (e.code || e.message)); } }
  return out;
});
pasos.forEach(p => console.log((/FALLA/.test(p) ? '❌ ' : '✅ ') + p));
const v = await app.evaluate(async () => { reglasAntiguas = null; await comprobarEspejoEnNubePropia(); return {viejas: reglasAntiguas, propia: espejoEnNubePropia}; });
console.log('veredicto de la sonda de la app:', JSON.stringify(v));
await browser.close();
// Con las reglas REALES pegadas, la app tiene que decir que están al día (antes decía «antiguas» por un paso mal escrito de la sonda).
const fallosPasos = pasos.filter(p => /FALLA/.test(p));
const bien = fallosPasos.length === 0 && v.viejas === false && v.propia === true;
console.log(bien ? '\n✅ la sonda reconoce unas reglas nuevas como nuevas' : '\n❌ la sonda se equivoca con las reglas reales: ' + JSON.stringify({fallosPasos, v}));
process.exit(bien ? 0 : 1);
