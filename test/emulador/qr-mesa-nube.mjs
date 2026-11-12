/* QR de la mesa contra Firebase de verdad (12/11). El dueño escanea el QR y sale «este código QR ya no es válido, pide al camarero el nuevo».
 * La web pública lee `mesaQr/{token}`: si ese nodo no está en la nube, dice eso. Aquí se comprueba la cadena ENTERA con las reglas reales:
 * activar el QR → cada mesa recibe su token → el token llega a la nube → la web pública lo lee. Y los casos que lo rompían:
 * una mesa creada DESPUÉS de activar, un QR mostrado o impreso al momento, y varios cambios seguidos. Se ejecuta desde run.sh. */
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const CODE = 'EMUQR001', DB_NEGOCIO = 'http://127.0.0.1:9000/?ns=demo-gastrogoan';
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
  DB.tables = [{id: 1, name: 'Mesa 1', zona: 'Salón', plazas: 4}, {id: 2, name: 'Mesa 2', zona: 'Salón', plazas: 4}];
  await saveDB();
}, [CODE, DB_NEGOCIO]);
await app.reload({waitUntil: 'domcontentloaded'}); await w(9000);
const publicId = await app.evaluate(() => getPublicId());

// Lo que hay en la nube, leído con el admin del emulador (sin pasar por las reglas)
const nube = async () => {
  const r = await fetch(`http://127.0.0.1:9000/gastrogoan/public/${publicId}/mesaQr.json?ns=demo-gastrogoan`, {headers: {Authorization: 'Bearer owner'}});
  return (await r.json()) || {};
};
const tokens = () => app.evaluate(() => (DB.tables || []).map(t => t.qrToken || null));

await caso('La app usa la nube del negocio como espejo', async () => {
  assert.equal(await app.evaluate(() => espejoEnNubePropia), true);
});
await caso('Activar el QR da token a cada mesa y los dos llegan a la nube', async () => {
  await app.evaluate(() => { const c = document.createElement('input'); c.type = 'checkbox'; c.id = 'mn-qrmesa-activo'; c.checked = true; document.body.appendChild(c); saveQrMesaConfig(); });
  await w(4000);
  const tk = await tokens(), n = await nube();
  assert.ok(tk.every(Boolean), 'todas las mesas tienen token: ' + JSON.stringify(tk));
  for(const t of tk) assert.ok(n[t], 'falta en la nube el token ' + t + ' · nube: ' + JSON.stringify(Object.keys(n)));
});
await caso('Una mesa creada DESPUÉS de activar el QR: al mostrar su QR, el nodo está en la nube enseguida', async () => {
  await app.evaluate(() => { DB.tables.push({id: 3, name: 'Mesa 3', zona: 'Terraza', plazas: 2}); saveDB(); showTableQr(3); });
  await w(3500);
  const t3 = await app.evaluate(() => DB.tables.find(t => t.id === 3).qrToken);
  assert.ok(t3, 'la mesa 3 no tiene token');
  assert.ok((await nube())[t3], 'el QR de la mesa 3 se mostró pero su nodo NO está en la nube (así sale «QR no válido»)');
});
await caso('Imprimir los QR de todas las mesas deja todos los nodos publicados', async () => {
  await app.evaluate(() => { window.__ggSinImprimir = true; DB.tables.push({id: 4, name: 'Mesa 4', zona: 'Terraza', plazas: 2}); saveDB(); imprimirQrMesas(); });
  await w(3500);
  const tk = await tokens(), n = await nube();
  for(const t of tk) assert.ok(n[t], 'falta en la nube ' + t);
});
await caso('«Comprobar que los QR funcionan»: detecta un QR que falta en la nube, lo publica y lo dice', async () => {
  const tk = await app.evaluate(() => DB.tables.find(t => t.id === 1).qrToken);
  const r = await fetch(`http://127.0.0.1:9000/gastrogoan/public/${publicId}/mesaQr/${tk}.json?ns=demo-gastrogoan`, {method: 'DELETE', headers: {Authorization: 'Bearer owner'}});
  assert.ok(r.ok, 'no se pudo borrar el nodo de prueba');
  assert.ok(!(await nube())[tk], 'el nodo sigue en la nube');
  await app.evaluate(() => { comprobarQrMesas(); }); await w(5000);
  const modal = await app.evaluate(() => (document.getElementById('modal-box') || {}).innerText || '');
  assert.match(modal, /publicado ahora|published now|publicat ara/i, 'el aviso no dice que lo ha reparado: ' + modal.slice(0, 200));
  assert.ok((await nube())[tk], 'tras comprobar, el QR de la mesa 1 sigue sin estar en la nube');
  assert.ok(!/NO funciona|does NOT work/i.test(modal), 'dice que algún QR no funciona: ' + modal.slice(0, 300));
});
await caso('La web pública, abierta con el QR de esa mesa, muestra la carta/cuenta y NO «QR no válido»', async () => {
  const tk = await app.evaluate(() => DB.tables.find(t => t.id === 4).qrToken);
  const web = await nueva();
  await web.goto(`${BASE}/reservagastrogoan.html?id=${publicId}&mesa=${tk}`, {waitUntil: 'domcontentloaded'});
  await w(8000);
  const txt = await web.evaluate(() => document.body.innerText);
  assert.ok(!/ya no es v[aá]lido|no longer valid|ja no és vàlid/i.test(txt), 'la web dice que el QR no vale: ' + txt.slice(0, 300).replace(/\n/g, ' | '));
  await web.close();
});
await caso('Sin errores de JavaScript', async () => { assert.deepEqual(app.errs.filter(e => !/network|offline/i.test(e)), []); });
await browser.close();
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ el QR de la mesa llega a la nube y la web lo lee');
process.exit(fallos ? 1 : 0);
