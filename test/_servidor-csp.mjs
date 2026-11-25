// Servidor de pruebas que sirve cada sitio CON LAS CABECERAS DE VERDAD (las de su `_headers`), para que un Chromium real aplique la
// Content-Security-Policy que se publica. Lo usan test/csp.mjs y test/emulador/csp-nube.mjs.
//
// Qué sirve (la raíz de cada sitio): app = deploy/app/public · reservas = deploy/reservas/public · admin = el panel de ADMIN desde sus FUENTES
// (admin-panel/index.html, admin-panel/plan360.html y generador-licencias.html como app.html: lo de deploy/admin se regenera con
// deploy/actualizar.sh y puede ir por detrás de las fuentes) con las cabeceras de deploy/admin/public/_headers.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const TIPOS = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'};
const SITIOS = {app: 'deploy/app/public', reservas: 'deploy/reservas/public', admin: 'deploy/admin/public'};
const FUENTES_ADMIN = {'/index.html': 'admin-panel/index.html', '/plan360.html': 'admin-panel/plan360.html', '/app.html': 'generador-licencias.html'};

// Las cabeceras del bloque «/*» de un _headers de Cloudflare Pages.
export function cabecerasDe(sitio){
  const txt = fs.readFileSync(path.join(RAIZ, SITIOS[sitio], '_headers'), 'utf8');
  const out = {}; let dentro = false;
  for(const l of txt.split('\n')){
    if(!l.trim() || l.trim().startsWith('#')) continue;
    if(!/^\s/.test(l)){ dentro = l.trim() === '/*'; continue; }
    if(!dentro) continue;
    const i = l.indexOf(':'); out[l.slice(0, i).trim()] = l.slice(i + 1).trim();
  }
  return out;
}

// extraConnect: orígenes SOLO de prueba que se añaden a connect-src (el emulador de Firebase en 127.0.0.1); el resto de la política es la publicada.
export async function servir(sitio, {extraConnect = '', puerto = 0} = {}){
  const cab = cabecerasDe(sitio);
  if(extraConnect && cab['Content-Security-Policy']) cab['Content-Security-Policy'] = cab['Content-Security-Policy'].replace(/connect-src /, 'connect-src ' + extraConnect + ' ');
  const raiz = path.join(RAIZ, SITIOS[sitio]);
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if(p === '/') p = '/index.html';
    let fichero = (sitio === 'admin' && FUENTES_ADMIN[p]) ? path.join(RAIZ, FUENTES_ADMIN[p]) : path.join(raiz, p);
    if(!fichero.startsWith(RAIZ) || !fs.existsSync(fichero) || fs.statSync(fichero).isDirectory()){
      // Como hace Pages con single-page-application: el enlace corto de reservas (/casapaco) devuelve la página.
      if(sitio === 'reservas') fichero = path.join(raiz, 'index.html'); else { res.writeHead(404); return res.end('no'); }
    }
    res.writeHead(200, Object.assign({'Content-Type': TIPOS[path.extname(fichero)] || 'application/octet-stream'}, cab));
    fs.createReadStream(fichero).pipe(res);
  });
  await new Promise(r => srv.listen(puerto, '0.0.0.0', r));
  // 127.0.0.2, no localhost/127.0.0.1: la app y la web de reservas NO registran su service worker en esos dos nombres (a propósito), y la CSP
  // tiene que probarse también con el worker de verdad (worker-src).
  const url = 'http://127.0.0.2:' + srv.address().port;
  return {url, csp: cab['Content-Security-Policy'] || '', cabeceras: cab, close: () => new Promise(r => srv.close(r))};
}

// Pone en la página un registro de TODAS las violaciones de la CSP (el navegador las anuncia con este evento aunque la causa sea un script,
// un estilo, una imagen, una conexión o un marco).
export async function vigilarCsp(page){
  page.violaciones = [];
  await page.evaluateOnNewDocument(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', e => window.__csp.push(e.violatedDirective + ' ← ' + (e.blockedURI || '(en línea)') + ' · ' + (e.sourceFile || '') + ':' + (e.lineNumber || '')));
  });
  page.on('console', m => { const t = m.text(); if(/Content Security Policy|Refused to (load|connect|execute|frame|apply|create|evaluate)/i.test(t)) page.violaciones.push('consola: ' + t.slice(0, 260)); });
}
export async function leerViolaciones(page){
  const dentro = await page.evaluate(() => window.__csp || []).catch(() => []);
  return [...new Set([...page.violaciones, ...dentro])];
}
