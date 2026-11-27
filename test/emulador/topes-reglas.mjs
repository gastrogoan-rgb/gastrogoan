/* Sonda de reglas PERMISIVAS (26/11): detecta que a un negocio le FALTAN los topes de seguridad del aforo y los pedidos, sin tocar `reglasAntiguas`.
 * Se corre contra el emulador con las reglas que se le carguen (run.sh: REGLAS_NEGOCIO=<fichero>) y ESPERADO dice qué debe decir la sonda:
 *   ESPERADO=con (por defecto) = reglas ACTUALES, con topes: sin aviso.   ESPERADO=sin = reglas de antes del endurecimiento: aviso.
 * En los dos casos: ningún residuo en aforoHold/pedidosHold, `reglasAntiguas` no cambia, red caída o fallo que no es permiso = «no se sabe». */
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const ESPERADO = process.env.ESPERADO === 'sin' ? 'sin' : 'con';
const CODE = 'EMUTOPE1', DB_NEGOCIO = 'http://127.0.0.1:9000/?ns=demo-gastrogoan';
const BASE = 'http://app.test:8951';
const browser = await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox', '--host-resolver-rules=MAP app.test 127.0.0.1'], headless:true});
let fallos = 0;
async function caso(n, fn){ try{ await fn(); console.log('✅ [' + ESPERADO + '] ' + n); }catch(e){ fallos++; console.log('❌ [' + ESPERADO + '] ' + n + '\n   ⤷ ' + e.message); } }
const w = ms => new Promise(r => setTimeout(r, ms));
const ctx = await (browser.createBrowserContext ? browser.createBrowserContext() : browser.createIncognitoBrowserContext());
const p = await ctx.newPage(); await p.setViewport({width: 1000, height: 900}); await p.setCacheEnabled(false);
p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
await p.setRequestInterception(true);
p.on('request', req => {
  const m = req.url().match(/gstatic\.com\/firebasejs\/[\d.]+\/(firebase-[a-z-]+\.js)/);
  if(m) return req.continue({url: 'http://localhost:8951/__sdk/' + m[1]});
  let host = ''; try{ host = new URL(req.url()).hostname; }catch(e){}
  if(host !== '127.0.0.1' && host !== 'localhost' && host !== 'app.test' && /googleapis|raw.githubusercontent|qrserver/.test(req.url())) return req.abort();
  req.continue();
});
await p.evaluateOnNewDocument(() => { try{ localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10)); }catch(e){} });
await p.goto(BASE + '/index.html', {waitUntil: 'domcontentloaded'});
await p.evaluate(() => (typeof dbReadyPromise !== 'undefined') ? dbReadyPromise : null).catch(() => {});
await p.evaluate(async ([code, dburl]) => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
  localStorage.setItem('gastrogoan_owner_login', JSON.stringify({user: 'jefe', authKey: 'k'.repeat(20), pinHash: 'h'}));
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type: 'owner', ts: Date.now()}));
  Object.assign(DB.business, {name: 'Casa Paco', netlifySetupDone: true, extConnPromptSeen: true, tourSeen: true, categoryIconHintSeen: true});
  DB.business.ownFirebase = {apiKey: 'fake-api-key', databaseURL: dburl};
  await saveDB();
}, [CODE, DB_NEGOCIO]);
await p.reload({waitUntil: 'domcontentloaded'}); await w(9000);

// Todo lo de sonda que haya quedado en aforoHold / pedidosHold (en cualquier sitio del árbol).
const residuo = () => p.evaluate(async () => {
  const base = firebase.app().database().ref('gastrogoan/public/' + getPublicId());
  const out = [];
  for(const n of ['aforoHold', 'pedidosHold']){ const s = await base.child(n).once('value'); s.forEach(c => { out.push(n + '/' + c.key); }); }
  return out;
});
const estado = () => p.evaluate(() => ({sinTopes: reglasSinTopes, antiguas: reglasAntiguas, propia: espejoEnNubePropia, guardado: topesGuardado()}));
const quitarGuardado = () => p.evaluate(() => { localStorage.removeItem(lsClaveDeNegocio(TOPES_LS)); reglasSinTopes = null; });

await caso('el arranque ya comprobó los topes y dejó el veredicto correcto', async () => {
  const e = await estado();
  assert.equal(e.propia, true, 'el espejo propio debe seguir funcionando: ' + JSON.stringify(e));
  assert.equal(e.antiguas, false, 'reglasAntiguas NO debe cambiar por esto: ' + JSON.stringify(e));
  assert.equal(e.sinTopes, ESPERADO === 'sin', JSON.stringify(e));
  assert.equal(e.guardado && e.guardado.sinTopes, ESPERADO === 'sin');
});
await caso('no queda ningún residuo en aforoHold ni pedidosHold', async () => {
  assert.deepEqual(await residuo(), []);
});
await caso('forzada: el mismo veredicto, sin residuo y sin tocar reglasAntiguas ni el espejo', async () => {
  await quitarGuardado();
  await p.evaluate(() => { topesForzar = true; return comprobarEspejoEnNubePropia(); });
  const e = await estado();
  assert.equal(e.sinTopes, ESPERADO === 'sin'); assert.equal(e.antiguas, false); assert.equal(e.propia, true);
  assert.deepEqual(await residuo(), []);
});
await caso('una vez al día: con el veredicto de hoy guardado NO vuelve a escribir (se lee lo guardado)', async () => {
  const r = await p.evaluate(async () => {
    const hoy = new Date().toISOString().slice(0, 10);
    localStorage.setItem(lsClaveDeNegocio(TOPES_LS), JSON.stringify({dia: hoy, sinTopes: true}));   // guardado a propósito distinto de la realidad si esta es «con»
    reglasSinTopes = null;
    let escrituras = 0;
    const base = {child: () => ({set: () => { escrituras++; return Promise.resolve(); }, remove: () => Promise.resolve()})};
    await ggComprobarTopesDeReglas(base, false);
    return {escrituras, v: reglasSinTopes};
  });
  assert.equal(r.escrituras, 0); assert.equal(r.v, true);
});
await caso('al día siguiente (guardado de ayer) vuelve a comprobar y corrige el aviso', async () => {
  await p.evaluate(sin => { localStorage.setItem(lsClaveDeNegocio(TOPES_LS), JSON.stringify({dia: '2000-01-01', sinTopes: !sin})); reglasSinTopes = null; }, ESPERADO === 'sin');
  await p.evaluate(() => comprobarEspejoEnNubePropia());
  assert.equal((await estado()).sinTopes, ESPERADO === 'sin');
  assert.deepEqual(await residuo(), []);
});
await caso('un fallo que NO es permiso (red, etc.) no activa nada y no guarda el día', async () => {
  await quitarGuardado();
  const r = await p.evaluate(async () => {
    const ref = () => ({set: () => Promise.reject(new Error('network error')), remove: () => Promise.resolve()});
    await ggComprobarTopesDeReglas({child: ref}, true);
    return {v: reglasSinTopes, g: topesGuardado()};
  });
  assert.equal(r.v, null); assert.equal(r.g, null);
});
await caso('un permiso denegado en una prueba y un fallo de red en la otra: no se sabe', async () => {
  await quitarGuardado();
  const r = await p.evaluate(async () => {
    let n = 0;
    const ref = () => ({set: () => (n++ === 0 ? Promise.reject(new Error('PERMISSION_DENIED: x')) : Promise.reject(new Error('network error'))), remove: () => Promise.resolve()});
    await ggComprobarTopesDeReglas({child: ref}, true);
    return reglasSinTopes;
  });
  assert.equal(r, null);
});
await caso('la limpieza ocurre aunque falle algo: los remove se lanzan siempre', async () => {
  await quitarGuardado();
  const r = await p.evaluate(async () => {
    let quitados = 0;
    const ref = () => ({set: () => Promise.resolve(), remove: () => { quitados++; return Promise.reject(new Error('boom')); }});
    await ggComprobarTopesDeReglas({child: ref}, true);
    return {quitados, v: reglasSinTopes};
  });
  assert.equal(r.quitados, 2); assert.equal(r.v, true);   // aceptó las dos escrituras = sin topes (y el fallo al limpiar no rompe nada)
});
await caso('con la red caída: no avisa, no guarda y al volver no queda residuo', async () => {
  await quitarGuardado();
  await p.evaluate(() => { TOPES_ESPERA_MS = 1500; firebase.app().database().goOffline(); });
  await p.evaluate(() => { const base = firebase.app().database().ref('gastrogoan/public/' + getPublicId()); return ggComprobarTopesDeReglas(base, true); });
  const e = await estado();
  assert.equal(e.sinTopes, null, 'sin red no se sabe: ' + JSON.stringify(e)); assert.equal(e.guardado, null);
  await p.evaluate(() => firebase.app().database().goOnline()); await w(4000);
  assert.deepEqual(await residuo(), [], 'lo escrito sin red se envía y se borra al volver');
  await p.evaluate(() => { TOPES_ESPERA_MS = 8000; });
});
await caso('campana: ' + (ESPERADO === 'sin' ? 'sale la fila informativa con su botón, «Visto» la oculta y el aviso rojo de reglas antiguas NO sale' : 'no hay fila de topes'), async () => {
  await quitarGuardado();
  await p.evaluate(() => { topesForzar = true; return comprobarEspejoEnNubePropia(); });
  const f = await p.evaluate(() => avisosLista().filter(x => x.id === 'reglasTopes' || x.id === 'reglas'));
  if(ESPERADO === 'con'){ assert.equal(f.length, 0); return; }
  assert.equal(f.length, 1, JSON.stringify(f)); assert.equal(f[0].id, 'reglasTopes'); assert.equal(f[0].ocultable, true); assert.equal(f[0].warn, false);
  assert.match(f[0].html, /topes de seguridad/); assert.match(f[0].acciones[0][1], /abrirAsistenteReglas/);
  await p.evaluate(f0 => avisosMarcarVisto(f0.id, f0.count), f[0]);
  assert.equal(await p.evaluate(() => avisosLista().filter(x => x.id === 'reglasTopes').length), 0);
  // Es por negocio: la clave de «visto» es la de este negocio, y al cambiar de semana vuelve a salir.
  assert.equal(await p.evaluate(() => { const v = avisosVistosLeer(); v.reglasTopes = v.reglasTopes - 1; localStorage.setItem(AVISOS_VISTOS_LS, JSON.stringify(v)); return avisosLista().filter(x => x.id === 'reglasTopes').length; }), 1);
});
await caso('asistente «Actualizar mis reglas»: ' + (ESPERADO === 'sin' ? 'sin topes NO dice «Listo» (queda en «todavía no»)' : 'con topes dice «Listo» y el aviso desaparece'), async () => {
  await p.evaluate(sin => { reglasSinTopes = sin ? false : true; }, ESPERADO === 'sin');   // al revés de la realidad: el asistente tiene que reevaluar
  await p.evaluate(() => { abrirAsistenteReglas(); return reglasComprobar(false); });
  const v = await p.evaluate(() => ({ver: reglasVeredicto, sinTopes: reglasSinTopes, aviso: avisosLista().filter(x => x.id === 'reglasTopes').length}));
  if(ESPERADO === 'con'){ assert.equal(v.ver, 'ok'); assert.equal(v.sinTopes, false); assert.equal(v.aviso, 0); }
  else { assert.equal(v.ver, 'viejas'); assert.equal(v.sinTopes, true); }
  assert.deepEqual(await residuo(), []);
});
await caso('sin errores de página', async () => { assert.deepEqual(p.errs, []); });

await browser.close();
console.log(fallos ? '\n❌ ' + fallos + ' casos fallan' : '\n✅ topes de reglas [' + ESPERADO + ']: todo bien');
process.exit(fallos ? 1 : 0);
