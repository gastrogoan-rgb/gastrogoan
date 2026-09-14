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
 * titular cae en el techo, el precio y el botón en el negro de abajo, y la
 * cocina se queda respirando en el centro.
 *
 * Es justo lo contrario de lo que hacíamos antes: en vez de oscurecer media
 * foto con un degradado para meter texto encima (que siempre se nota), se
 * elige una foto que YA tiene el hueco. Por eso esta y no otra.
 *
 * ⚠️ En vertical (1080×1920) la foto encaja exacta: 3153×5606 es la misma
 * proporción. En 1080×1350 hay que recortar 570 px, y se recortan del
 * techo — no de abajo, porque abajo está el negro que necesitamos.
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const SALIDA = 'anuncios/salida';
const BASE = 'http://localhost:8950';
const FOTO = '/anuncios/fotos/cocina-pase.jpg';
const FORMATOS = [
  {nombre: 'feed',  w: 1080, h: 1350},
  {nombre: 'story', w: 1080, h: 1920},
];

const CSS = `
  @font-face{font-family:'SG';src:url('/fonts/schibsted-grotesk-700-normal.woff2') format('woff2');font-weight:700}
  @font-face{font-family:'SG';src:url('/fonts/schibsted-grotesk-500-normal.woff2') format('woff2');font-weight:500}
  @font-face{font-family:'PM';src:url('/fonts/ibm-plex-mono-500-normal.woff2') format('woff2');font-weight:500}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;overflow:hidden;
    font-family:'SG',system-ui,sans-serif;-webkit-font-smoothing:antialiased}

  .escena{width:100%;height:100%;position:relative;overflow:hidden;background:#070605}
  .foto{position:absolute;inset:0;background-image:url('${FOTO}');
    background-size:cover;background-position:50% var(--foco);
    filter:contrast(1.06) saturate(1.06) brightness(1.12)}
  /* Dos velos, cada uno con su trabajo: el de arriba asienta el titular
     sobre el techo (que tiene dos tiras de luz que si no se comen la letra);
     el de abajo funde la cocina con el negro donde va el precio. */
  .velo{position:absolute;inset:0;background:
    linear-gradient(180deg, rgba(7,6,5,.93) 0%, rgba(7,6,5,.72) var(--v1),
                    rgba(7,6,5,.12) var(--v2), rgba(7,6,5,.72) var(--v3),
                    rgba(7,6,5,.97) 100%)}

  .cont{position:absolute;inset:0;z-index:5;padding:var(--pad);
    display:flex;flex-direction:column}

  .marca{display:flex;align-items:center;gap:var(--mgap);
    font-size:var(--fmarca);font-weight:700;letter-spacing:-.02em;color:#fff}
  .marca i{width:var(--punto);height:var(--punto);background:#FF6B35;
    border-radius:50%;display:block;flex:none;
    box-shadow:0 0 var(--punto) rgba(255,107,53,.75)}
  .marca b{font-weight:700}
  .marca span{color:#FF6B35}

  h1{margin-top:var(--gap);font-size:var(--fh1);font-weight:700;
    letter-spacing:-.05em;line-height:.85;color:#fff;text-transform:uppercase;
    text-shadow:0 4px 40px rgba(0,0,0,.9)}
  h1 em{font-style:normal;color:#FF6B35;display:block}

  /* El bloque de abajo: es el que cierra la venta, así que va todo junto y
     pegado, sin aire entre el número y el botón. */
  .cierre{margin-top:auto}
  .ahorra{font-size:var(--fahorra);font-weight:700;letter-spacing:-.03em;
    color:#fff;text-transform:uppercase;line-height:.9;
    text-shadow:0 4px 40px rgba(0,0,0,.9)}
  .cifra{margin-top:var(--gap3);font-size:var(--fcifra);font-weight:700;
    letter-spacing:-.06em;line-height:.82;color:#FF6B35;
    display:flex;align-items:baseline;gap:var(--gap3);
    text-shadow:0 4px 50px rgba(0,0,0,.95)}
  .cifra small{font-size:.3em;letter-spacing:-.02em;color:#fff;white-space:nowrap}
  .soft{margin-top:var(--gapbaja);font-size:var(--fsoft);font-weight:500;
    color:#fff;letter-spacing:-.01em}
  .soft b{font-weight:700}
  .soft b span{color:#FF6B35}

  .cta{margin-top:var(--gap);display:inline-block;background:#FF6B35;color:#fff;
    font-size:var(--fcta);font-weight:700;letter-spacing:.01em;
    padding:var(--ctap);box-shadow:0 16px 44px rgba(255,107,53,.38)}


  .grano{position:absolute;inset:0;z-index:9;pointer-events:none;opacity:.1;
    background-image:var(--ruido);background-size:180px 180px}
`;

const HTML = `
<div class="escena">
  <div class="foto"></div><div class="velo"></div>
  <div class="cont">
    <div class="marca"><i></i><b>Gastro<span>Goan</span></b></div>
    <h1>¿Bar o<br>restaurante<br><em>en Barcelona?</em></h1>
    <div class="cierre">
      <div class="ahorra">Ahorra</div>
      <div class="cifra">+2.500 €<small>al año</small></div>
      <div class="soft">Software <b>Gastro<span>Goan</span></b></div>
      <div class="cta">¡Descubre cómo!</div>
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
    --v1:${s ? '24%' : '26%'}; --v2:${s ? '46%' : '48%'}; --v3:${s ? '68%' : '66%'};
    --pad:${s ? 82 : 70}px; --gap:${s ? 34 : 26}px; --gap2:${s ? 20 : 15}px;
    --gap3:${s ? 14 : 11}px;
    --fmarca:${s ? 40 : 36}px; --punto:${s ? 15 : 13}px; --mgap:${s ? 13 : 11}px;
    --fh1:${s ? 128 : 112}px;
    --fahorra:${s ? 78 : 68}px; --fcifra:${s ? 170 : 148}px;
    --gapbaja:${s ? 52 : 40}px;
    --fsoft:${s ? 40 : 35}px;
    --fcta:${s ? 36 : 32}px; --ctap:${s ? '28px 46px' : '24px 40px'};
`;
};

const RUIDO = `(() => {
  const c=document.createElement('canvas');c.width=c.height=180;
  const x=c.getContext('2d');const d=x.createImageData(180,180);
  for(let i=0;i<d.data.length;i+=4){const v=118+(Math.random()*90-45);
    d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255;}
  x.putImageData(d,0,0);
  document.documentElement.style.setProperty('--ruido','url('+c.toDataURL()+')');
})()`;

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
  await new Promise(r => setTimeout(r, 400));
  const archivo = `${SALIDA}/BCN-${f.nombre}.png`;
  await page.screenshot({path: archivo});
  console.log('✅ ' + archivo);
}
await browser.close();
