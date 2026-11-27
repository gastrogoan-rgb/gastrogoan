// Capturas NUEVAS de la app para el tríptico (a doble resolución, para imprimir).
// Usa la demo recién generada (dist/kit-gastrogoan-DEMO.html): bash build.sh && bash demo/generar.sh
// Uso: node tools/triptico/capturar.mjs   → deja los JPG en tools/triptico/img/
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const SALIDA = path.join(path.dirname(new URL(import.meta.url).pathname), 'img');
fs.mkdirSync(SALIDA, {recursive: true});

// Vista interna (id que usa navigate) → nombre del fichero. Ids reales: ver test/visual-real.mjs.
const VISTAS = [
  ['cocina',         "currentFolder='cocina'; navigate('folder')"],
  ['escandallo',     "navigate('escandallo')"],
  ['tpv',            "navigate('tpv')"],
  ['reservas',       "navigate('reservas')"],
  ['clientes',       "navigate('clientes')"],
  ['panel',          "navigate('dashboard')"],
  ['economia',       "navigate('economia')"],
  ['minegocio',      "navigate('minegocio')"],
  ['stock',          "navigate('stock')"],
  ['horarios',       "navigate('horarios')"],
  ['comandascocina', "navigate('comandascocina')"],
  ['promocion',      "navigate('promocion')"],
];

// Recorte en píxeles CSS (1440x900) para el tríptico: quita la barra superior y deja la zona de trabajo.
const RECORTE = {
  cocina: {x: 0, y: 84, width: 1440, height: 620},
  tpv:    {x: 0, y: 84, width: 1440, height: 760},
  panel:  {x: 0, y: 84, width: 1440, height: 640},
};

const browser = await puppeteer.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'], headless: true});
const page = await browser.newPage();
await page.setViewport({width: 1440, height: 900, deviceScaleFactor: 2});
await page.setRequestInterception(true);
page.on('request', r => /firebase|gstatic|googleapis|qrserver|nominatim/.test(r.url()) ? r.abort() : r.continue());
await page.goto('http://localhost:8950/dist/kit-gastrogoan-DEMO.html', {waitUntil: 'domcontentloaded'});
await new Promise(r => setTimeout(r, 3500));

for (const [nombre, js] of VISTAS) {
  await page.evaluate(() => {
    ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate','app-splash','tour-overlay'].forEach(id => document.getElementById(id)?.remove());
    document.querySelectorAll('.tour-bubble,.tour-overlay,.toast').forEach(e => e.remove());
    // La marca «DEMO» de la esquina: el tríptico es para enseñar la app, no para llevar la marca de demo.
    [...document.querySelectorAll('div')].filter(d => d.textContent === 'DEMO' && getComputedStyle(d).position === 'fixed').forEach(d => d.remove());
  });
  await page.evaluate(js => { try { eval(js); } catch (e) {} }, js);
  await new Promise(r => setTimeout(r, 1800));
  const ruta = path.join(SALIDA, nombre + '.jpg');
  await page.screenshot({path: ruta, type: 'jpeg', quality: 92, ...(RECORTE[nombre] ? {clip: RECORTE[nombre]} : {})});
  console.log('ok', nombre, fs.statSync(ruta).size >> 10, 'KB');
}
await browser.close();
