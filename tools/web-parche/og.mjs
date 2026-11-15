// Imágenes para compartir (1200×630) de la web comercial: tinta, luz cálida y el título de cada página.
// Uso: (servidor en 8957 sobre deploy/web/public) node tools/web-parche/og.mjs
import puppeteer from 'puppeteer-core';
import { execSync } from 'child_process';
const OUT = new URL('../../deploy/web/public/img/', import.meta.url).pathname;
const tarjetas = [
  ['og-gastrogoan', 'Asesoría · App · Eventos', 'Asesoramos, gestionamos y creamos <em>experiencias gastronómicas</em>.', 'sans'],
  ['og-asesoria', '01 · Asesoría 360º', 'Creando estrategias con <em>sabor a éxito</em>.', 'sans'],
  ['og-app', '02 · App GastroGoan', 'Todo tu restaurante en <em>una sola app</em>.', 'sans'],
  ['og-lpc', '03 · Le Petit Comité', 'Una mesa, <em>muchas historias</em>.', 'serif'],
];
const b = await puppeteer.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await b.newPage(); await p.setViewport({ width: 1200, height: 630 });
for (const [n, et, h, f] of tarjetas) {
  await p.goto('http://127.0.0.1:8957/index.html');
  await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><base href="http://127.0.0.1:8957/">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,500&display=swap" rel="stylesheet">
<style>
@font-face{font-family:S;font-weight:400;src:url(fonts/schibsted-grotesk-400-normal.woff2)}
@font-face{font-family:S;font-weight:600;src:url(fonts/schibsted-grotesk-600-normal.woff2)}
@font-face{font-family:M;src:url(fonts/ibm-plex-mono-400-normal.woff2)}
html,body{margin:0;width:1200px;height:630px}
body{background:radial-gradient(ellipse at 50% -10%,rgba(231,214,180,.22),transparent 60%),linear-gradient(#1C1A17,#24221D);color:#FAF8F4;font-family:S,sans-serif;display:flex;flex-direction:column;justify-content:space-between;padding:72px 84px;box-sizing:border-box}
.et{font-family:M,monospace;font-size:22px;letter-spacing:.2em;text-transform:uppercase;color:#7E9B84;display:flex;align-items:center;gap:18px}
.et::before{content:"";width:46px;height:3px;background:#7E9B84}
h1{margin:0;font-size:${f === 'serif' ? 88 : 74}px;line-height:1.08;font-weight:600;letter-spacing:-.03em;max-width:1000px;${f === 'serif' ? "font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:500;letter-spacing:0" : ''}}
em{font-style:inherit;background:linear-gradient(transparent 60%,#4A5D4E 60%,#4A5D4E 94%,transparent 94%);padding:0 .08em}
.pie{display:flex;justify-content:space-between;align-items:baseline}
.logo{font-size:44px;letter-spacing:-.03em}.logo b{font-weight:600}.logo i{font-style:normal;color:#7E9B84}
.web{font-family:M,monospace;font-size:20px;letter-spacing:.14em;color:#C9C2B6;text-transform:uppercase}
</style></head><body><span class="et">${et}</span><h1>${h}</h1><div class="pie"><span class="logo">gastro<b>goan</b><i>.</i></span><span class="web">gastrogoan.com</span></div></body></html>`, { waitUntil: 'networkidle0' });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: `/tmp/${n}.png` });
  execSync(`ffmpeg -loglevel error -y -i /tmp/${n}.png -q:v 3 ${OUT}${n}.jpg`);
  console.log('OK', n);
}
await b.close();
