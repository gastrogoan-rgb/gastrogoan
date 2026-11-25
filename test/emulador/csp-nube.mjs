/* La Content-Security-Policy publicada (deploy/{app,reservas}/public/_headers) con FIREBASE DE VERDAD (emulador oficial): lo que test/csp.mjs no puede ver.
 *
 * La CSP de connect-src/script-src/frame-src se decide por lo que el SDK de Firebase de verdad intenta: cargar sus scripts de gstatic, abrir el socket
 * a la base, iniciar sesión anónima, y quizá un marco de autenticación. Aquí la app del negocio y la web de reservas se sirven CON SU CABECERA a un
 * Chromium real conectado al emulador, se hace una reserva de punta a punta (web → buzón → app) y se exige CERO violaciones.
 * Único cambio respecto a la política publicada: se AÑADEN a connect-src los puertos locales del emulador (el resto, tal cual).
 * Se ejecuta desde run.sh. */
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { servir, vigilarCsp, leerViolaciones } from '../_servidor-csp.mjs';

const EMU = 'http://127.0.0.1:9000 ws://127.0.0.1:9000 http://127.0.0.1:9099';
const DB_NEGOCIO = 'http://127.0.0.1:9000/?ns=demo-gastrogoan';
let fallos = 0;
async function caso(n, fn){ try{ const d = await fn(); console.log('✅ ' + n + (d ? '  → ' + d : '')); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + (e.message || e)); } }
const w = ms => new Promise(r => setTimeout(r, ms));
for(const ns of ['demo-gastrogoan', 'demo-plataforma']) await fetch(`http://127.0.0.1:9000/.json?ns=${ns}`, {method: 'DELETE', headers: {Authorization: 'Bearer owner'}});

const sApp = await servir('app', {extraConnect: EMU}), sRes = await servir('reservas', {extraConnect: EMU});
const browser = await puppeteer.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'], headless: true});
const externos = new Set();
async function pagina(origen){
  const ctx = await (browser.createBrowserContext ? browser.createBrowserContext() : browser.createIncognitoBrowserContext());
  const p = await ctx.newPage(); await p.setViewport({width: 1100, height: 900}); await p.setCacheEnabled(false);
  p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await vigilarCsp(p);
  await p.setRequestInterception(true);
  p.on('request', req => {
    const m = req.url().match(/gstatic\.com\/firebasejs\/[\d.]+\/(firebase-[a-z-]+\.js)/);
    if(m){ externos.add('https://www.gstatic.com'); return req.continue({url: 'http://localhost:8951/__sdk/' + m[1]}); }
    let o = ''; try{ o = new URL(req.url()).origin; }catch(e){}
    if(o && o !== origen && !/^http:\/\/(127\.0\.0\.1|localhost):/.test(o) && !/^(data|blob):/.test(req.url())){ externos.add(o); return req.abort(); }
    req.continue();
  });
  await p.evaluateOnNewDocument(() => { try{ localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0, 10)); }catch(e){} });
  return p;
}
const neg = await pagina(sApp.url);
await neg.goto(sApp.url + '/index.html', {waitUntil: 'domcontentloaded'});
await neg.evaluate(() => (typeof dbReadyPromise !== 'undefined') ? dbReadyPromise : null).catch(() => {});
await neg.evaluate(async ([code, dburl]) => {
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
  localStorage.setItem('gastrogoan_owner_login', JSON.stringify({user: 'jefe', authKey: 'k'.repeat(20), pinHash: 'h'}));
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type: 'owner', ts: Date.now()}));
  Object.assign(DB.business, {name: 'Casa Paco', netlifySetupDone: true, extConnPromptSeen: true, tourSeen: true, categoryIconHintSeen: true, aforo: 60});
  DB.business.ownFirebase = {apiKey: 'fake-api-key', databaseURL: dburl};
  DB.business.horario = Array.from({length: 7}, () => ({abierto: true, modo: 'seguido', seguido: {ini: '13:00', fin: '23:00'}}));
  DB.tables = [{id: 1, name: 'Mesa 1', zona: 'Salón', plazas: 4}];
  await saveDB();
}, ['CSPNUB01', DB_NEGOCIO]);
await neg.reload({waitUntil: 'domcontentloaded'}); await w(9000);
const publicId = await neg.evaluate(() => getPublicId());

await caso('La app del negocio con la CSP: el SDK de Firebase carga, inicia sesión y conecta con la nube sin ninguna violación', async () => {
  assert.equal(await neg.evaluate(() => espejoEnNubePropia), true, 'no usa la nube propia: la CSP puede estar cortando la conexión');
  const v = await leerViolaciones(neg);
  assert.deepEqual(v, [], 'violaciones en la app del negocio:\n   ' + v.join('\n   '));
});
await caso('Reserva de punta a punta con la CSP: la web de reservas lee el negocio, escribe la solicitud y la app del negocio la recibe', async () => {
  await neg.evaluate(async () => { await comprobarEspejoEnNubePropia(); }); await w(5000);
  const cli = await pagina(sRes.url);
  await cli.addScriptTag; // (la página se crea vacía)
  await cli.evaluateOnNewDocument(() => {
    const parche = () => { try{ if(typeof FIREBASE_CONFIG === 'undefined') return false; FIREBASE_CONFIG.databaseURL = 'http://127.0.0.1:9000/?ns=demo-plataforma'; return true; }catch(e){ return false; } };
    const iv = setInterval(() => { if(parche()) clearInterval(iv); }, 5); setTimeout(() => clearInterval(iv), 4000);
  });
  await cli.goto(`${sRes.url}/?neg=${publicId}`, {waitUntil: 'domcontentloaded'});
  await w(5000);
  const nombre = await cli.evaluate(() => (DB.business || {}).name);
  assert.equal(nombre, 'Casa Paco', 'la web de reservas no leyó el negocio de la nube (¿connect-src?): ' + nombre);
  const man = new Date(Date.now() + 86400000), fecha = `${man.getFullYear()}-${String(man.getMonth() + 1).padStart(2, '0')}-${String(man.getDate()).padStart(2, '0')}`;
  await cli.evaluate(async fecha => { await pushSolicitud({type: 'reserva', createdAt: Date.now(), date: fecha, time: '14:00', people: 2, clientName: 'Cliente CSP', clientPhone: '600111222', resToken: 'tokencsp1234567890'}); }, fecha);
  let llego = false;
  for(let i = 0; i < 20 && !llego; i++){ await w(1000); llego = await neg.evaluate(() => (DB.reservations || []).some(r => r.clientName === 'Cliente CSP')); }
  assert.ok(llego, 'la reserva hecha en la web no llegó a la app del negocio');
  const vc = await leerViolaciones(cli), vn = await leerViolaciones(neg);
  assert.deepEqual(vc, [], 'violaciones en la web de reservas:\n   ' + vc.join('\n   '));
  assert.deepEqual(vn, [], 'violaciones en la app tras recibir la reserva:\n   ' + vn.join('\n   '));
  assert.deepEqual([...cli.errs, ...neg.errs].filter(e => !/network|offline|Failed to fetch/i.test(e)), [], 'errores de JavaScript');
  await cli.close();
});
await caso('Lo externo que el SDK intentó alcanzar está en la política (lo anotado, no lo supuesto)', async () => {
  const lista = [...externos];
  const csp = sApp.csp;
  for(const o of lista){
    const h = new URL(o).hostname;
    const ok = csp.split(/\s+/).some(v => { const m = v.match(/^(?:https|wss):\/\/(.+?);?$/); if(!m) return false; return m[1].startsWith('*.') ? h.endsWith(m[1].slice(1)) : h === m[1]; });
    assert.ok(ok, 'el SDK intenta salir a ' + o + ' y la CSP no lo permite');
  }
  return lista.join(', ') || 'solo gstatic';
});
await browser.close(); await sApp.close(); await sRes.close();
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ la CSP deja trabajar a Firebase de verdad: sesión, nube y una reserva de punta a punta');
process.exit(fallos ? 1 : 0);
