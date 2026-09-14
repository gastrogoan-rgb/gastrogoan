/* "¿BAR O RESTAURANTE EN BARCELONA?" — el anuncio principal de la campaña.
 *
 * Réplica del patrón que usan dos agencias distintas (Sevilla y Granada) en
 * la biblioteca de Meta: pregunta + CIUDAD enorme arriba, y el botón DENTRO
 * de la imagen. Funciona porque el que lo ve siente que le hablan a él, no
 * a "los hosteleros" en abstracto.
 *
 * ── Por qué la foto va así colocada ──────────────────────────────────────
 * La foto (Pexels, licencia que permite publicidad) tiene tres franjas
 * naturales: techo oscuro arriba, la barra de pase iluminada en el medio, y
 * negro casi puro abajo. No se toca esa estructura — se APROVECHA: el
 * titular cae en el techo, la cifra y el botón en el negro, y la cocina se
 * queda respirando en el centro.
 *
 * Es justo lo contrario de lo que hacíamos antes: en vez de oscurecer media
 * foto con un degradado para meter texto encima (que siempre se nota), se
 * elige una foto que YA tiene el hueco. Por eso esta y no otra.
 *
 * ⚠️ En vertical (1080×1920) la foto encaja exacta: 3153×5606 es la misma
 * proporción. En 1080×1350 hay que recortar 570 px, y se recortan del
 * techo — no de abajo, porque abajo está el negro que necesitamos.
 *
 * La tipografía, y por qué son cuatro familias, en anuncios/tipografia.mjs.
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import {FUENTES, RUIDO} from './tipografia.mjs';

const SALIDA = 'anuncios/salida';
const BASE = 'http://localhost:8950';
const FOTO = '/anuncios/fotos/cocina-pase.jpg';
const NARANJA = '#FF6B35';
const FORMATOS = [
  {nombre: 'feed',  w: 1080, h: 1350},
  {nombre: 'story', w: 1080, h: 1920},
];

const CSS = `
  ${FUENTES}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;overflow:hidden;-webkit-font-smoothing:antialiased}

  .escena{width:100%;height:100%;position:relative;overflow:hidden;background:#070605}
  .foto{position:absolute;inset:0;background-image:url('${FOTO}');
    background-size:cover;background-position:50% var(--foco);
    filter:contrast(1.06) saturate(1.06) brightness(1.12)}
  /* Cinco paradas de velo: asienta el titular sobre el techo (que tiene dos
     tiras de luz), deja respirar la cocina en el centro, y funde el pase
     con el negro donde va la cifra. */
  .velo{position:absolute;inset:0;background:
    linear-gradient(180deg, rgba(7,6,5,.93) 0%, rgba(7,6,5,.72) var(--v1),
                    rgba(7,6,5,.12) var(--v2), rgba(7,6,5,.74) var(--v3),
                    rgba(7,6,5,.98) 100%)}

  .cont{position:absolute;inset:0;z-index:5;padding:var(--pad);
    display:flex;flex-direction:column}

  .marca{font-family:'SG',sans-serif;display:flex;align-items:center;gap:var(--mgap);
    font-size:var(--fmarca);font-weight:700;letter-spacing:-.02em;color:#fff}
  .marca i{width:var(--punto);height:var(--punto);background:${NARANJA};
    border-radius:50%;display:block;flex:none;
    box-shadow:0 0 var(--punto) rgba(255,107,53,.75)}
  .marca span{color:${NARANJA}}

  /* LA PREGUNTA — Anton. text-indent negativo = puntuación colgada: el "¿"
     sale de la caja y la "B" alinea a plomo con la marca y con la cifra.
     Es el detalle que más se nota cuando falta, aunque nadie sepa nombrarlo. */
  h1{font-family:'Anton',sans-serif;margin-top:var(--gap);
    font-size:var(--fh1);line-height:.9;letter-spacing:.004em;
    color:#fff;text-transform:uppercase;text-indent:-.055em;
    text-shadow:0 4px 44px rgba(0,0,0,.92)}
  h1 em{font-style:normal;color:${NARANJA};display:block;text-indent:0}
  /* La "o" en minúscula. Un detalle pequeño que hace mucho: rompe el bloque
     de versalitas y le quita el tono de cartel de rebajas. */
  h1 .min{text-transform:lowercase}

  .cierre{margin-top:auto}

  /* EL AHORRO — Archivo Black. Ancha y pesada: el esqueleto contrario al de
     Anton. Ese salto es lo que crea dos zonas en vez de una masa uniforme. */
  .ahorra{font-family:'ArchivoB',sans-serif;font-weight:800;
    font-size:var(--fahorra);letter-spacing:-.02em;line-height:.9;
    color:#fff;text-transform:uppercase;display:inline-block;
    border-bottom:var(--subr) solid ${NARANJA};padding-bottom:var(--subrp);
    text-shadow:0 4px 40px rgba(0,0,0,.9)}

  .cifra{margin-top:var(--gap3);display:flex;align-items:baseline;
    gap:var(--cgap);font-family:'ArchivoB',sans-serif;font-weight:900;
    font-size:var(--fcifra);letter-spacing:-.045em;line-height:.85;
    color:${NARANJA};text-shadow:0 4px 50px rgba(0,0,0,.95)}
  /* El "+" como en una tabla de resultados: menor cuerpo y colgado arriba,
     no una letra más del mismo tamaño. */
  .cifra u{text-decoration:none;font-size:.52em;align-self:flex-start;
    margin-top:.12em;letter-spacing:-.02em}
  /* "al año" en itálica con gracias. Es el único sitio donde aparece: un
     golpe, no un recurso. Repetida dejaría de sorprender. */
  .cifra i{font-family:'Instr',serif;font-style:italic;font-weight:400;
    font-size:.34em;letter-spacing:0;color:#fff;white-space:nowrap;
    margin-left:-.04em}

  .soft{font-family:'SG',sans-serif;margin-top:var(--gap2);
    font-size:var(--fsoft);font-weight:500;color:#EFE9E1;letter-spacing:-.01em}
  .soft b{font-weight:700;color:#fff}
  .soft b span{color:${NARANJA}}

  .cta{font-family:'SG',sans-serif;margin-top:var(--gap);display:inline-flex;
    align-items:center;gap:var(--ctagap);background:${NARANJA};color:#fff;
    font-size:var(--fcta);font-weight:700;letter-spacing:-.01em;
    padding:var(--ctap);box-shadow:0 16px 44px rgba(255,107,53,.4)}
  .cta u{text-decoration:none;font-family:'PM',monospace;font-weight:500}

  /* El grano va por encima de la tipografía también: una letra de filo
     perfecto sobre una foto con grano se lee como pegada, no como impresa. */
  .grano{position:absolute;inset:0;z-index:9;pointer-events:none;opacity:.1;
    background-image:var(--ruido);background-size:180px 180px}
`;

const HTML = `
<div class="escena">
  <div class="foto"></div><div class="velo"></div>
  <div class="cont">
    <div class="marca"><i></i><b>Gastro<span>Goan</span></b></div>
    <h1>¿Bar <span class="min">o</span><br>restaurante<br><em>en Barcelona?</em></h1>
    <div class="cierre">
      <div class="ahorra">Ahorra</div>
      <div class="cifra"><u>+</u>2.500 €<i>al año</i></div>
      <div class="soft">Software <b>Gastro<span>Goan</span></b></div>
      <div class="cta">¡Descubre cómo!<u>&rarr;</u></div>
    </div>
  </div>
  <div class="grano"></div>
</div>`;

const VARS = (f) => {
  const s = f.nombre === 'story';
  // En feed hay que recortar 570 px: se quitan del techo (foco al 62%), que
  // es lo prescindible. Abajo no se toca, ahí va la cifra.
  return `
    --foco:${s ? '50%' : '62%'};
    --v1:${s ? '24%' : '26%'}; --v2:${s ? '46%' : '48%'}; --v3:${s ? '68%' : '66%'};
    --pad:${s ? 82 : 70}px; --gap:${s ? 34 : 26}px; --gap2:${s ? 26 : 20}px;
    --gap3:${s ? 12 : 9}px;
    --fmarca:${s ? 40 : 36}px; --punto:${s ? 15 : 13}px; --mgap:${s ? 13 : 11}px;
    --fh1:${s ? 148 : 130}px;
    --fahorra:${s ? 82 : 72}px; --fcifra:${s ? 176 : 152}px; --cgap:${s ? 18 : 14}px;
    --subr:${s ? 10 : 9}px; --subrp:${s ? 12 : 10}px;
    --fsoft:${s ? 38 : 33}px;
    --fcta:${s ? 36 : 32}px; --ctap:${s ? '26px 44px' : '22px 38px'};
    --ctagap:${s ? 18 : 15}px;`;
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
  const archivo = `${SALIDA}/BCN-${f.nombre}.png`;
  await page.screenshot({path: archivo});
  console.log('✅ ' + archivo);
}
await browser.close();
