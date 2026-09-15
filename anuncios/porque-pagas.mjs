/* "¿POR QUÉ PAGAS +2.500 € AL AÑO POR ESTO?" — segunda creatividad.
 *
 * El ángulo es el punto de dolor, no el producto: no le enseñas lo que
 * podría tener, le señalas lo que YA está pagando. El "por esto" funciona
 * porque el que lo lee tiene un cacharro igual a metro y medio.
 *
 * ── La composición, y por qué va TODO a la derecha ───────────────────────
 * La primera versión ponía el titular arriba a la izquierda, como en el
 * anuncio de Barcelona, y le CORTABA LA CABEZA al camarero. En una foto con
 * una persona no se puede colocar el texto "donde hay hueco": hay que mirar
 * dónde está la cara y apartarse.
 *
 * Aquí el camarero ocupa el tercio izquierdo y la pared de cartas colgadas
 * llena todo el lado derecho de arriba abajo. Esa pared es el sitio: no tapa
 * a nadie, y oscurecida da un fondo uniforme donde la letra se lee sola.
 * Por eso el texto va alineado a la derecha y el velo entra por ese lado en
 * vez de por arriba.
 *
 * ⚠️ La foto enseñaba el software de SpotOn y su marca en la impresora. Las
 * dos fuera — ver anuncios/pantalla-gastrogoan.py.
 *
 * ⚠️ El "+2.500 €" es el ahorro frente a contratar por separado TPV,
 * reservas, personal y domicilio. Si alguien pregunta, hay que poder
 * sostenerlo; el sitio para explicarlo es el texto del anuncio.
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import {FUENTES, RUIDO} from './tipografia.mjs';

const SALIDA = 'anuncios/salida';
const BASE = 'http://localhost:8950';
const FOTO = '/anuncios/fotos/camarero-limpio.jpg';
const NARANJA = '#FF6B35';
const FORMATOS = [
  {nombre: 'feed',  w: 1080, h: 1350},
  {nombre: 'story', w: 1080, h: 1920},
];

const CSS = `
  ${FUENTES}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;overflow:hidden;-webkit-font-smoothing:antialiased}

  .escena{width:100%;height:100%;position:relative;overflow:hidden;background:#0B0A08}
  .foto{position:absolute;inset:0;background-image:url('${FOTO}');
    background-size:cover;background-position:var(--posx) var(--posy);
    filter:contrast(1.05) saturate(1.0) brightness(1.0)}
  /* El velo entra por la DERECHA, no por arriba: es donde está la pared de
     cartas y donde no hay nadie a quien tapar. A la izquierda se deja la
     foto limpia para que el camarero se vea entero. */
  .velo{position:absolute;inset:0;background:
    linear-gradient(270deg, rgba(9,8,6,.94) 0%, rgba(9,8,6,.9) 34%,
                    rgba(9,8,6,.6) 58%, rgba(9,8,6,.1) 82%, transparent 100%),
    linear-gradient(0deg, rgba(9,8,6,.96) 0%, rgba(9,8,6,.6) 16%, transparent 34%)}

  /* Un hueco en el velo, justo sobre la pantalla. El velo de la derecha es
     lo que hace legible el titular, pero de paso apagaba el TPV — y la
     pantalla es la PRUEBA del producto, no puede quedar a oscuras. Esto
     vuelve a pintar la foto solo ahí, con el borde difuminado para que no
     se vea el recorte. */
  .rescate{position:absolute;inset:0;z-index:4;background-image:url('${FOTO}');
    background-size:cover;background-position:var(--posx) var(--posy);
    filter:contrast(1.05) brightness(1.06);
    -webkit-mask-image:radial-gradient(ellipse var(--rw) var(--rh) at var(--rx) var(--ry),
      #000 40%, rgba(0,0,0,.55) 66%, transparent 86%);
    mask-image:radial-gradient(ellipse var(--rw) var(--rh) at var(--rx) var(--ry),
      #000 40%, rgba(0,0,0,.55) 66%, transparent 86%)}

  .cont{position:absolute;inset:0;z-index:5;padding:var(--pad);
    display:flex;flex-direction:column;align-items:flex-end;text-align:right}

  .marca{font-family:'SG',sans-serif;display:flex;align-items:center;gap:var(--mgap);
    font-size:var(--fmarca);font-weight:700;letter-spacing:-.02em;color:#fff}
  .marca i{width:var(--punto);height:var(--punto);background:${NARANJA};
    border-radius:50%;display:block;flex:none;
    box-shadow:0 0 var(--punto) rgba(255,107,53,.75)}
  .marca span{color:${NARANJA}}

  h1{font-family:'Anton',sans-serif;margin-top:var(--gap);
    font-size:var(--fh1);line-height:.9;letter-spacing:.004em;
    color:#fff;text-transform:uppercase;
    text-shadow:0 4px 44px rgba(0,0,0,.95)}
  h1 em{font-style:normal;color:${NARANJA}}
  /* "esto" en minúscula y en cursiva con gracias: es la palabra que SEÑALA
     la foto, así que se dice en otro tono de voz. */
  h1 .esto{font-family:'Instr',serif;font-style:italic;font-weight:400;
    text-transform:lowercase;letter-spacing:0;font-size:1.04em}

  .cierre{margin-top:auto}
  /* Abajo, directo y sin adornos: el nombre y el precio. La versión anterior
     decía "Lo mismo. Por 100 € al año." y encima una línea larga con los
     tres públicos; demasiado para el renglón que cierra la venta. */
  .oferta{font-family:'ArchivoB',sans-serif;font-weight:800;
    font-size:var(--foferta);letter-spacing:-.03em;line-height:1;color:#fff;
    text-shadow:0 4px 40px rgba(0,0,0,.95)}
  .oferta b{color:${NARANJA};font-weight:900}
  .cta{font-family:'SG',sans-serif;margin-top:var(--gap);display:inline-flex;
    align-items:center;gap:var(--ctagap);background:${NARANJA};color:#fff;
    font-size:var(--fcta);font-weight:700;letter-spacing:-.01em;
    padding:var(--ctap);box-shadow:0 16px 44px rgba(255,107,53,.4)}
  .cta u{text-decoration:none;font-family:'PM',monospace;font-weight:500}

  .grano{position:absolute;inset:0;z-index:9;pointer-events:none;opacity:.1;
    background-image:var(--ruido);background-size:180px 180px}
`;

const HTML = `
<div class="escena">
  <div class="foto"></div><div class="velo"></div><div class="rescate"></div>
  <div class="cont">
    <div class="marca"><i></i><b>Gastro<span>Goan</span></b></div>
    <h1>¿Por qué pagas<br><em>+2.500 € al año</em><br>por <span class="esto">esto</span>?</h1>
    <div class="cierre">
      <div class="oferta">App GastroGoan<br><b>100 € al año</b></div>
      <div class="cta">¡Descubre cómo!<u>&rarr;</u></div>
    </div>
  </div>
  <div class="grano"></div>
</div>`;

const VARS = (f) => {
  const s = f.nombre === 'story';
  // El encuadre deja al camarero pegado al borde izquierdo y toda la pared
  // de cartas a la derecha, que es donde cae el texto.
  return `
    --posx:${s ? '34%' : '38%'}; --posy:${s ? '46%' : '50%'};
    --rx:${s ? '64%' : '67%'}; --ry:${s ? '49%' : '51%'};
    --rw:${s ? 250 : 235}px; --rh:${s ? 210 : 195}px;
    --pad:${s ? 78 : 66}px; --gap:${s ? 30 : 23}px;
    --fmarca:${s ? 38 : 34}px; --punto:${s ? 14 : 12}px; --mgap:${s ? 12 : 10}px;
    --fh1:${s ? 118 : 100}px;
    --foferta:${s ? 66 : 57}px;
    --fcta:${s ? 34 : 30}px; --ctap:${s ? '24px 40px' : '20px 34px'};
    --ctagap:${s ? 16 : 14}px;`;
};

fs.mkdirSync(SALIDA, {recursive: true});
const browser = await puppeteer.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'],
  headless: true,
});
const page = await browser.newPage();
for(const f of FORMATOS){
  await page.setViewport({width: f.w, height: f.h});
  await page.goto(`${BASE}/dist/index.html`, {waitUntil: 'domcontentloaded'});
  await page.setContent(
    `<!doctype html><meta charset="utf-8"><style>${CSS}.escena{${VARS(f)}}</style>${HTML}`,
    {waitUntil: 'networkidle0'});
  await page.evaluate(RUIDO);
  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 500));
  const archivo = `${SALIDA}/PAGAS-${f.nombre}.png`;
  await page.screenshot({path: archivo});
  console.log('✅ ' + archivo);
}
await browser.close();
