// Graba el tour de la app en vídeo.
//
// Puppeteer recorre la DEMO parada a parada, con un rótulo abajo y un cursor
// visible, y ffmpeg junta los fotogramas. Se genera desde la demo, que a su
// vez se genera desde la app recién compilada: así el vídeo enseña siempre lo
// que de verdad se vende, y no una versión de hace tres meses.
//
//   bash build.sh && bash demo/generar.sh && node video/grabar.mjs
import puppeteer from 'puppeteer-core';
import ffmpeg from 'ffmpeg-static';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { GUION } from './guion.js';

const ANCHO = 1920, ALTO = 1080, FPS = 25;
const FOTOGRAMAS = path.join('/tmp', 'gg-video-frames');
const SALIDA = 'dist/gastrogoan-tour.mp4';

fs.rmSync(FOTOGRAMAS, {recursive: true, force: true});
fs.mkdirSync(FOTOGRAMAS, {recursive: true});

const browser = await puppeteer.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', `--window-size=${ANCHO},${ALTO}`, '--hide-scrollbars', '--force-device-scale-factor=1'],
  headless: true,
  defaultViewport: {width: ANCHO, height: ALTO},
});
const page = await browser.newPage();
page.on('pageerror', e => console.error('  ⚠ error en la página:', e.message));
await page.goto('http://localhost:8950/dist/kit-gastrogoan-DEMO.html', {waitUntil: 'domcontentloaded'});
await new Promise(r => setTimeout(r, 3500));

/* El rótulo y el cursor se pintan DENTRO de la página, no con ffmpeg: así se
   ven exactamente igual que el resto (misma tipografía, mismo color) y se
   pueden animar sin recodificar nada. */
await page.evaluate(() => {
  const barra = document.createElement('div');
  barra.id = '__rotulo';
  barra.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:2147483647;'
    + 'background:rgba(26,26,26,.92);color:#fff;padding:22px 40px;text-align:center;'
    + 'font:700 30px/1.3 -apple-system,system-ui,sans-serif;letter-spacing:-.01em;'
    + 'transition:opacity .35s ease;opacity:0';
  document.body.appendChild(barra);

  const cursor = document.createElement('div');
  cursor.id = '__cursor';
  cursor.style.cssText = 'position:fixed;z-index:2147483647;width:22px;height:22px;pointer-events:none;'
    + 'transition:left .5s cubic-bezier(.4,0,.2,1),top .5s cubic-bezier(.4,0,.2,1);left:60%;top:55%';
  cursor.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22">'
    + '<path d="M5 2l14 9-6 1 3.5 7-2.6 1.2L10.4 13 5 17z" fill="#111" stroke="#fff" stroke-width="1.4"/></svg>';
  document.body.appendChild(cursor);

  window.__rotular = (texto) => {
    const b = document.getElementById('__rotulo');
    b.style.opacity = '0';
    setTimeout(() => { b.textContent = texto; b.style.opacity = '1'; }, 200);
  };
  window.__moverCursor = (x, y) => {
    const c = document.getElementById('__cursor');
    c.style.left = x + 'px'; c.style.top = y + 'px';
  };
});

let n = 0;
const capturar = async () => {
  await page.screenshot({path: path.join(FOTOGRAMAS, String(++n).padStart(5,'0') + '.png')});
};

console.log(`Grabando ${GUION.length} paradas…`);
for(const [i, parada] of GUION.entries()){
  await page.evaluate((fn, titulo) => {
    try{ (new Function('return ' + fn))()(); }catch(e){ console.error(e); }
    window.__rotular(titulo);
  }, parada.ir.toString(), parada.titulo);

  // Un movimiento suave del cursor hacia el centro de la zona activa, para
  // que la grabación no parezca una sucesión de capturas fijas.
  await page.evaluate((i) => {
    const destinos = [[62,48],[38,55],[55,42],[45,60],[60,50],[40,45]];
    const [px, py] = destinos[i % destinos.length];
    window.__moverCursor(window.innerWidth*px/100, window.innerHeight*py/100);
  }, i);

  await new Promise(r => setTimeout(r, 700));   // que termine el repintado
  const fotogramas = Math.round(parada.seg * FPS);
  for(let f = 0; f < fotogramas; f++) await capturar();
  process.stdout.write(`  ${i+1}/${GUION.length} · ${parada.titulo.slice(0,44)}\n`);
}
await browser.close();

console.log('Montando el vídeo…');
execFileSync(ffmpeg, [
  '-y', '-v', 'error',
  '-framerate', String(FPS), '-i', path.join(FOTOGRAMAS, '%05d.png'),
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
  SALIDA,
], {stdio: 'inherit'});
fs.rmSync(FOTOGRAMAS, {recursive: true, force: true});

const mb = (fs.statSync(SALIDA).size / 1048576).toFixed(1);
const seg = GUION.reduce((s,p)=>s+p.seg, 0);
console.log(`\n✅ ${SALIDA} · ${Math.floor(seg/60)}m${String(seg%60).padStart(2,'0')}s · ${mb} MB`);
