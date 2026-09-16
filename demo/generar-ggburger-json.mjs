/* Genera dist/ggburger.json: un volcado de DB tras sembrar el negocio de
 * ejemplo GG Burger (demo/datos-ggburger.js), listo para que test/movil.mjs
 * y video/grabar-recorrido.mjs lo carguen de golpe con idbSet en vez de
 * tener que re-sembrar la app entera cada vez que se prueba un ancho.
 *
 * ── Por qué existe este script (16/09/2026) ──────────────────────────────
 * El fichero llevaba semanas en dist/ (fecha 12/09, el día que se creó
 * GG Burger) SIN NINGÚN GENERADOR: alguien lo produjo una vez a mano —
 * sembrando la app y volcando DB— y se quedó ahí, en el disco de ESTE
 * contenedor de desarrollo. Un checkout limpio (como el de GitHub Actions)
 * nunca lo tiene, así que `fetch('/dist/ggburger.json')` devolvía un 404, y
 * `.json()` sobre esa respuesta reventaba con una excepción sin capturar
 * que mataba test/movil.mjs entero — el CI nunca había llegado tan lejos
 * como para verlo hasta que se arregló el paso anterior (fontTools/brotli).
 *
 * Se genera reutilizando EXACTAMENTE la siembra que ya usa demo/generar.sh
 * para el kit de demostración (demo/datos-ggburger.js + demo/sembrar.js):
 * misma app, mismo camino, cero código de siembra duplicado.
 *
 * Uso:  bash build.sh && node demo/generar-ggburger-json.mjs
 *       (necesita el servidor de pruebas en :8950 — test/todo.sh ya lo
 *        levanta antes de la batería)
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const BASE = 'http://localhost:8950';
const DATOS = fs.readFileSync('demo/datos-ggburger.js', 'utf-8');
const SIEMBRA = fs.readFileSync('demo/sembrar.js', 'utf-8');

if(!fs.existsSync('dist/index.html')){
  console.error('Falta dist/index.html — ejecuta antes: bash build.sh');
  process.exit(1);
}

const browser = await puppeteer.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
  headless: true,
});
const page = await browser.newPage();
// Firebase real bloqueado a propósito: es una demo, no debe escribir en
// ninguna nube (mismo motivo que documenta demo/sembrar.js sobre el
// indicador de sincronización).
await page.setRequestInterception(true);
page.on('request', r => /firebaseio|firebasedatabase|googleapis/.test(r.url()) ? r.abort() : r.continue());

await page.goto(`${BASE}/dist/index.html`, {waitUntil: 'domcontentloaded'});
// La misma inyección que demo/generar.sh hace por texto en el HTML, aquí
// como evaluate: define window.GG_DEMO_DATOS y siembra DB con él.
await page.evaluate(DATOS);
await page.evaluate(SIEMBRA);
await new Promise(r => setTimeout(r, 800)); // saveDB() es async; margen de sobra

const volcado = await page.evaluate(async () => {
  const db = await idbGet('gastrogoan_data_v1');
  // movil.mjs y grabar-recorrido.mjs leen d.license para poner la licencia
  // ANTES de volcar db a IndexedDB — sembrar.js la deja en localStorage,
  // no dentro de DB, así que se adjunta aquí para que el fixture traiga
  // todo lo que hace falta en un solo fetch.
  const lic = localStorage.getItem('gastrogoan_license_v1');
  return {...db, license: lic ? JSON.parse(lic) : null};
});
await browser.close();

if(!volcado || !volcado.sales){
  console.error('La siembra no dejó nada en IndexedDB — algo falló antes de saveDB()');
  process.exit(1);
}

fs.writeFileSync('dist/ggburger.json', JSON.stringify(volcado));
const tam = (fs.statSync('dist/ggburger.json').size / 1024 / 1024).toFixed(1);
console.log(`✅ dist/ggburger.json (${tam} MB)`);
