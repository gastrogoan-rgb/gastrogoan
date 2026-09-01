/* Los rótulos y los cartones del vídeo, dibujados con Chromium.
 *
 * El ffmpeg que trae el proyecto viene SIN drawtext (sin libfreetype), así que
 * no puede escribir texto. Lejos de ser un problema, sale ganando: dibujando
 * los rótulos en una página se usan la tipografía y los colores REALES de la
 * app —Schibsted Grotesk, el verde de la cabecera, el naranja de marca— en vez
 * de una fuente del sistema que no se parece a nada. El vídeo acaba pareciendo
 * de la misma casa que el producto.
 *
 * Devuelve PNG con transparencia; ffmpeg solo tiene que superponerlos.
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const W = 1920, H = 1080;

// La tipografía va incrustada en base64: Chromium no carga fuentes de disco
// por file:// de forma fiable, y sin ella el rótulo saldría en Times.
function fuenteIncrustada(fichero, peso){
  const b64 = fs.readFileSync(path.join('fonts', fichero)).toString('base64');
  return `@font-face{font-family:'GG';font-weight:${peso};font-style:normal;
    src:url(data:font/woff2;base64,${b64}) format('woff2')}`;
}

const CSS_BASE = `
  ${fuenteIncrustada('schibsted-grotesk-400-normal.woff2', 400)}
  ${fuenteIncrustada('schibsted-grotesk-600-normal.woff2', 600)}
  ${fuenteIncrustada('schibsted-grotesk-700-normal.woff2', 700)}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${W}px;height:${H}px;background:transparent;
    font-family:'GG',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
`;

const FONDO = '#16150F', CREMA = '#FAF8F4', NARANJA = '#DF7039', VERDE = '#8FA68E';

export async function dibujarRotulos(destino){
  fs.mkdirSync(destino, {recursive: true});
  const browser = await puppeteer.launch({
    executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--no-sandbox','--force-device-scale-factor=1'], headless:true});
  const page = await browser.newPage();
  await page.setViewport({width:W, height:H, deviceScaleFactor:1});

  const pintar = async (html, fichero, transparente = true) => {
    await page.setContent(`<style>${CSS_BASE}</style>${html}`, {waitUntil:'load'});
    await page.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 120));
    await page.screenshot({path: path.join(destino, fichero), omitBackground: transparente});
  };

  /* El rótulo de cada trozo. Va en una banda de abajo con degradado: sobre el
     blanco de la app un texto claro no se leería, y una banda opaca taparía
     demasiado. El degradado oscurece solo lo justo. */
  const bandaHtml = texto => `
    <div style="position:absolute;left:0;right:0;bottom:0;height:230px;
      background:linear-gradient(to top,rgba(22,21,15,.96) 0%,rgba(22,21,15,.90) 45%,rgba(22,21,15,0) 100%);
      display:flex;align-items:flex-end;justify-content:center;padding-bottom:44px">
      <p style="color:${CREMA};font-size:44px;font-weight:600;letter-spacing:-.01em;
        text-align:center;max-width:1500px;line-height:1.25">${texto}</p>
    </div>`;

  return {
    async banda(texto, fichero){ await pintar(bandaHtml(texto), fichero); return fichero; },

    async portada(fichero){
      await pintar(`
        <div style="width:${W}px;height:${H}px;background:${FONDO};
          display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px">
          <div style="border:2px solid rgba(250,248,244,.28);border-radius:10px;
            padding:11px 26px;color:${VERDE};font-size:22px;font-weight:600;
            letter-spacing:.22em;text-transform:uppercase">Kit de gestión gastronómico</div>
          <h1 style="color:${CREMA};font-size:132px;font-weight:700;letter-spacing:-.035em">GastroGoan</h1>
          <p style="color:rgba(250,248,244,.72);font-size:46px;font-weight:400">
            Todo tu restaurante, en una sola app</p>
        </div>`, fichero, false);
      return fichero;
    },

    /* El cierre. Es lo único que se queda en la cabeza del que lo ve, así que
       no dice "gracias por su atención": dice el problema, lo que resuelve, y
       dónde se compra. */
    async cierre(fichero){
      await pintar(`
        <div style="width:${W}px;height:${H}px;background:${FONDO};
          display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0">
          <h2 style="color:${CREMA};font-size:74px;font-weight:700;letter-spacing:-.03em;
            text-align:center;line-height:1.15;margin-bottom:34px">
            Deja de llevar tu restaurante<br>a ojo</h2>
          <p style="color:rgba(250,248,244,.78);font-size:40px;font-weight:400;
            text-align:center;line-height:1.5;max-width:1250px">
            Escandallo, TPV, reservas, personal y los papeles de sanidad.<br>
            En una sola app — y los datos son tuyos.</p>
          <div style="display:flex;gap:14px;margin:48px 0 54px;flex-wrap:wrap;justify-content:center">
            ${['Sin cuotas mensuales','Funciona sin internet','Se paga una vez']
              .map(x => `<span style="border:1.5px solid ${NARANJA};color:${NARANJA};
                border-radius:99px;padding:13px 28px;font-size:30px;font-weight:600">${x}</span>`).join('')}
          </div>
          <div style="background:${CREMA};color:${FONDO};border-radius:16px;
            padding:26px 62px;font-size:56px;font-weight:700;letter-spacing:-.02em">
            gastrogoan.com</div>
        </div>`, fichero, false);
      return fichero;
    },

    async cerrar(){ await browser.close(); },
  };
}
