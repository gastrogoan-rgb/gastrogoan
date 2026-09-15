/* "¿BAR O RESTAURANTE EN BARCELONA?" — la creatividad de la ciudad.
 *
 * Réplica del patrón que usan dos agencias distintas (Sevilla y Granada) en
 * la biblioteca de Meta: pregunta + CIUDAD enorme arriba. Funciona porque el
 * que lo ve siente que le hablan a él, no a "los hosteleros" en abstracto.
 *
 * ── Mismo sistema gráfico que la otra creatividad ────────────────────────
 * Las dos comparten lenguaje —Anton para el titular, precio viejo TACHADO,
 * tarjetón naranja macizo con el precio, y el remate del dinero que vuelve
 * al bolsillo— y se diferencian SOLO en el gancho: aquí la ciudad, allí la
 * orden. Así, si una funciona mejor que la otra, se sabe por qué.
 *
 * ── Por qué la foto va así colocada ──────────────────────────────────────
 * Tiene tres franjas naturales: techo oscuro arriba, la barra de pase
 * iluminada en el medio, y negro casi puro abajo. No se toca esa estructura,
 * se APROVECHA: la pregunta cae en el techo, el precio en el negro, y la
 * cocina se queda respirando en el centro. Es lo contrario de oscurecer
 * media foto con un degradado para meter texto encima, que siempre se nota.
 *
 * ⚠️ En vertical (1080×1920) la foto encaja exacta: 3153×5606 es la misma
 * proporción. En 1080×1350 hay que recortar 570 px, y se recortan del techo
 * — no de abajo, porque abajo está el negro que necesitamos.
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
  .velo{position:absolute;inset:0;background:
    linear-gradient(180deg, rgba(7,6,5,.94) 0%, rgba(7,6,5,.74) var(--v1),
                    rgba(7,6,5,.12) var(--v2), rgba(7,6,5,.8) var(--v3),
                    rgba(7,6,5,.98) 100%)}

  .cont{position:absolute;inset:0;z-index:5;padding:var(--pad);
    display:flex;flex-direction:column;justify-content:space-between;align-items:flex-start}

  .marca{font-family:'SG',sans-serif;display:flex;align-items:center;gap:var(--mgap);
    font-size:var(--fmarca);font-weight:700;letter-spacing:-.02em;color:#fff;
    text-shadow:0 2px 20px rgba(0,0,0,.9)}
  .marca i{width:var(--punto);height:var(--punto);background:${NARANJA};
    border-radius:50%;display:block;flex:none;
    box-shadow:0 0 var(--punto) rgba(255,107,53,.8)}
  .marca span{color:${NARANJA}}

  /* LA PREGUNTA — Anton. text-indent negativo = puntuación colgada: el "¿"
     sale de la caja y la "B" alinea a plomo con la marca y con el tarjetón.
     Es el detalle que más se nota cuando falta, aunque nadie sepa nombrarlo. */
  h1{font-family:'Anton',sans-serif;margin-top:var(--gap);
    font-size:var(--fh1);line-height:.9;letter-spacing:.004em;
    color:#fff;text-transform:uppercase;text-indent:-.055em;
    text-shadow:0 4px 44px rgba(0,0,0,.92)}
  h1 em{font-style:normal;color:${NARANJA};display:block;text-indent:0}
  /* La "o" en minúscula rompe el bloque de versalitas y le quita el tono de
     cartel de rebajas. */
  h1 .min{text-transform:lowercase}

  .pregunta{font-family:'Anton',sans-serif;
    font-size:var(--fpreg);line-height:.92;letter-spacing:.004em;
    color:#fff;text-transform:uppercase;text-indent:-.05em;
    text-shadow:0 4px 40px rgba(0,0,0,.95)}
  /* El tachón va dibujado, no con text-decoration: así se le puede dar
     grosor, color e inclinación — y una raya perfectamente recta sobre una
     cifra parece un error de imprenta, no una decisión. */
  .pregunta .tachado{position:relative;white-space:nowrap}
  .pregunta .tachado::after{content:'';position:absolute;
    left:-2%;right:-2%;top:48%;height:var(--tach);
    background:${NARANJA};transform:rotate(-1.8deg);
    box-shadow:0 2px 14px rgba(255,107,53,.5)}

  /* El tarjetón naranja macizo: un bloque de color sólido se lee como un
     sello, como un veredicto, no como otra frase más. */
  .solo{display:inline-block;margin-top:var(--gap2);
    font-family:'Anton',sans-serif;font-size:var(--fsolo);line-height:.98;
    letter-spacing:.006em;text-transform:uppercase;
    background:${NARANJA};color:#14120F;padding:var(--solop);
    box-shadow:0 18px 50px rgba(255,107,53,.42)}
  .solo b{display:block;font-weight:400;font-size:.34em;letter-spacing:.05em;
    margin-bottom:.12em}
  .solo u{text-decoration:none;font-size:.46em;letter-spacing:-.01em;margin-left:.04em}

  /* El remate: lo que se ahorra, dicho como dinero que VUELVE, no como
     descuento. Pequeño y debajo — es el premio, no el titular. */
  .bolsillo{font-family:'ArchivoB',sans-serif;font-weight:800;margin-top:var(--gap2);
    font-size:var(--fbols);letter-spacing:-.02em;color:#F0EAE0;
    text-shadow:0 3px 26px rgba(0,0,0,.95)}
  .bolsillo b{color:${NARANJA};font-weight:900}

  .grano{position:absolute;inset:0;z-index:9;pointer-events:none;opacity:.1;
    background-image:var(--ruido);background-size:180px 180px}
`;

const HTML = `
<div class="escena">
  <div class="foto"></div><div class="velo"></div>
  <div class="cont">
    <div>
      <div class="marca"><i></i><b>Gastro<span>Goan</span> App</b></div>
      <h1>¿Bar <span class="min">o</span><br>restaurante<br><em>en Barcelona?</em></h1>
    </div>
    <div>
      <div class="pregunta">Deja de pagar<br><span class="tachado">+2.500 € al año</span></div>
      <div class="solo"><b>Software GastroGoan</b>100 €<u>/año</u></div>
      <div class="bolsillo"><b>2.400 €</b> que vuelven a tu bolsillo</div>
    </div>
  </div>
  <div class="grano"></div>
</div>`;

const VARS = (f) => {
  const s = f.nombre === 'story';
  // En feed hay que recortar 570 px: se quitan del techo (foco al 62%), que
  // es lo prescindible. Abajo no se toca, ahí va el precio.
  return `
    --foco:${s ? '50%' : '62%'};
    --v1:${s ? '22%' : '24%'}; --v2:${s ? '42%' : '44%'}; --v3:${s ? '62%' : '60%'};
    --pad:${s ? 78 : 66}px; --gap:${s ? 26 : 20}px; --gap2:${s ? 20 : 16}px;
    --fmarca:${s ? 38 : 34}px; --punto:${s ? 14 : 12}px; --mgap:${s ? 12 : 10}px;
    --fh1:${s ? 132 : 112}px;
    --fpreg:${s ? 92 : 78}px; --tach:${s ? 9 : 8}px;
    --fsolo:${s ? 124 : 106}px; --solop:${s ? '20px 32px 24px' : '17px 26px 20px'};
    --fbols:${s ? 36 : 31}px;`;
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
