/* Los rótulos, la portada y el cierre del vídeo de demo.
 *
 * Se dibujan con Chromium y la tipografía de verdad de la app (los .woff2 de
 * fonts/), no con el drawtext de ffmpeg: ffmpeg no sabe leer woff2 y con una
 * fuente del sistema el vídeo deja de parecer de GastroGoan y parece de
 * cualquiera. Cada rótulo sale como PNG con transparencia y luego se
 * superpone sobre el metraje.
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

export const ANCHO = 1600, ALTO = 900;

const CSS = `
  @font-face{font-family:'Schibsted Grotesk';src:url('/fonts/schibsted-grotesk-700-normal.woff2') format('woff2');font-weight:700}
  @font-face{font-family:'Schibsted Grotesk';src:url('/fonts/schibsted-grotesk-500-normal.woff2') format('woff2');font-weight:500}
  @font-face{font-family:'IBM Plex Mono';src:url('/fonts/ibm-plex-mono-500-normal.woff2') format('woff2');font-weight:500}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${ANCHO}px;height:${ALTO}px;background:transparent;
    font-family:'Schibsted Grotesk',system-ui,sans-serif;color:#1C1A17}
  .wrap{width:100%;height:100%;display:flex;align-items:flex-end;justify-content:center;padding-bottom:52px}
  /* Banda inferior: fondo sólido del negro de la app. Sobre una captura con
     tablas y números, un rótulo translúcido no se lee. */
  .rotulo{background:#1C1A17;color:#fff;font-size:34px;font-weight:700;
    padding:16px 30px;letter-spacing:-.4px;line-height:1.15;max-width:1180px;text-align:center;
    box-shadow:0 10px 40px rgba(0,0,0,.35)}
  .rotulo b{color:#9DBBA4}

  /* Portada y cierre: a pantalla completa, sin transparencia. */
  .card{width:100%;height:100%;background:#1C1A17;color:#fff;
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;text-align:center}
  .card .kicker{font-family:'IBM Plex Mono',monospace;font-weight:500;font-size:19px;
    letter-spacing:4px;text-transform:uppercase;color:#9DBBA4}
  .card h1{font-size:82px;font-weight:700;letter-spacing:-2.5px;line-height:1.02}
  .card h2{font-size:40px;font-weight:500;letter-spacing:-.8px;color:#EDEAE3;line-height:1.25;max-width:1150px}
  .card .precio{font-size:120px;font-weight:700;letter-spacing:-4px;line-height:1}
  .card .precio small{font-size:38px;font-weight:500;letter-spacing:-1px;color:#EDEAE3}
  .card .linea{width:92px;height:5px;background:#9DBBA4}
  .card .url{font-family:'IBM Plex Mono',monospace;font-size:34px;letter-spacing:2px;color:#fff;
    border:2px solid #4A5D4E;padding:14px 34px}
  .card .pie{font-size:23px;color:#B9B4AC;font-weight:500}
  .lista{display:flex;gap:14px;flex-wrap:wrap;justify-content:center;max-width:1240px}
  .lista span{font-size:22px;font-weight:500;border:1.5px solid #4A5D4E;color:#EDEAE3;padding:9px 20px}
`;

const pagina = cuerpo => `<!doctype html><meta charset="utf-8"><style>${CSS}</style>${cuerpo}`;

export const PORTADA = pagina(`<div class="card">
  <div class="kicker">Kit de gestión hostelera</div>
  <h1>Todo tu restaurante<br>en una sola app</h1>
  <div class="linea"></div>
  <h2>Escandallo, TPV, reservas, personal, APPCC y contabilidad.<br>Sin instalar nada.</h2>
</div>`);

export const CIERRE = pagina(`<div class="card">
  <div class="kicker">Sin cuotas · Sin comisiones · Sin sorpresas</div>
  <div class="precio">100 €<small> / año</small></div>
  <h2>Un restaurante entero, por lo que cuesta una cena.</h2>
  <div class="lista">
    <span>Tus datos son tuyos</span><span>Funciona sin internet</span>
    <span>Tu web de reservas incluida</span><span>Hasta 3 idiomas</span>
  </div>
  <div class="url">gastrogoan.com</div>
  <div class="pie">Pruébalo hoy en tu propio negocio</div>
</div>`);

export const rotulo = texto => pagina(`<div class="wrap"><div class="rotulo">${texto}</div></div>`);

/* Dibuja una lista de {archivo, html} en PNG. Con `transparente`, el PNG
   guarda el canal alfa: es lo que permite que el rótulo flote sobre el vídeo
   sin una caja gris alrededor. */
export async function dibujar(piezas, {base = 'http://localhost:8950'} = {}){
  const browser = await puppeteer.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'],
    headless: true,
    defaultViewport: {width: ANCHO, height: ALTO},
  });
  const page = await browser.newPage();
  for(const {archivo, html, transparente} of piezas){
    await page.goto(base + '/dist/index.html', {waitUntil: 'domcontentloaded'});  // para que /fonts resuelva
    await page.setContent(html, {waitUntil: 'domcontentloaded'});
    await page.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 250));
    await page.screenshot({path: archivo, omitBackground: !!transparente});
  }
  await browser.close();
  return piezas.map(p => p.archivo);
}

if(import.meta.url === `file://${process.argv[1]}`){
  fs.mkdirSync('/tmp/rotulos', {recursive: true});
  await dibujar([
    {archivo:'/tmp/rotulos/portada.png', html: PORTADA},
    {archivo:'/tmp/rotulos/cierre.png', html: CIERRE},
    {archivo:'/tmp/rotulos/ejemplo.png', html: rotulo('¿Sabes lo que te cuesta <b>cada plato</b>?'), transparente:true},
  ]);
  console.log('PNG en /tmp/rotulos');
}
