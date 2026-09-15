/* "¿POR QUÉ PAGAS +2.500 € AL AÑO POR ESTO?" — segunda creatividad.
 *
 * El ángulo es el punto de dolor, no el producto: no le enseñas lo que
 * podría tener, le señalas lo que YA está pagando. La foto es un TPV en una
 * cafetería y el titular apunta a él con un "por esto" — la pregunta pica
 * precisamente porque el que la lee tiene uno igual delante.
 *
 * ⚠️ La foto original enseñaba el software de OTRA empresa ("Matcha Latte",
 * dólares, interfaz en inglés). Publicarla así es pagar por anunciar a un
 * competidor, y Meta puede tumbarlo por marca ajena. La pantalla se apaga
 * con anuncios/apagar-pantalla.py, que respeta la mano — ver ahí el porqué
 * del método. Por eso este anuncio usa tpv-limpio.jpg y no tpv-a.jpg.
 *
 * ⚠️ El "+2.500 €" es el ahorro frente a contratar por separado TPV,
 * reservas, personal y domicilio. Si alguien pregunta, hay que poder
 * sostenerlo; el sitio para explicarlo es el texto del anuncio, no la
 * imagen.
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import {FUENTES, RUIDO} from './tipografia.mjs';

const SALIDA = 'anuncios/salida';
const BASE = 'http://localhost:8950';
// Dos fondos para comparar: la tablet de cafetería (fondo claro, hay que
// fabricar el hueco del texto) y el camarero con las cartas colgadas, que
// tiene MUCHO más contexto de hostelería — que era justo lo que fallaba.
const FONDOS = [
  {id: 'tablet',   foto: '/anuncios/fotos/tpv-limpio.jpg',       foco: ['30%','42%'], pos: '46%'},
  {id: 'camarero', foto: '/anuncios/fotos/camarero-limpio.jpg',  foco: ['50%','50%'], pos: '62%'},
];
const NARANJA = '#FF6B35';
const FORMATOS = [
  {nombre: 'feed',  w: 1080, h: 1350},
  {nombre: 'story', w: 1080, h: 1920},
];

const CSS = (fondo) => `
  ${FUENTES}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;overflow:hidden;-webkit-font-smoothing:antialiased}

  .escena{width:100%;height:100%;position:relative;overflow:hidden;background:#0B0A08}
  .foto{position:absolute;inset:0;background-image:var(--foto);
    background-size:cover;background-position:var(--posx) var(--foco);
    filter:contrast(1.04) saturate(.96) brightness(.98)}
  /* Dos telones oscuros, arriba y abajo. Este fondo es CLARO (mostrador
     blanco), justo lo contrario que el de la cocina: allí la foto traía el
     hueco negro hecho, aquí hay que fabricarlo o el texto no se lee. */
  .velo{position:absolute;inset:0;background:
    linear-gradient(180deg, rgba(8,7,6,.92) 0%, rgba(8,7,6,.66) var(--v1),
                    rgba(8,7,6,.04) var(--v2), rgba(8,7,6,.5) var(--v3),
                    rgba(8,7,6,.95) 100%)}

  .cont{position:absolute;inset:0;z-index:5;padding:var(--pad);
    display:flex;flex-direction:column}

  .marca{font-family:'SG',sans-serif;display:flex;align-items:center;gap:var(--mgap);
    font-size:var(--fmarca);font-weight:700;letter-spacing:-.02em;color:#fff}
  .marca i{width:var(--punto);height:var(--punto);background:${NARANJA};
    border-radius:50%;display:block;flex:none;
    box-shadow:0 0 var(--punto) rgba(255,107,53,.75)}
  .marca span{color:${NARANJA}}

  h1{font-family:'Anton',sans-serif;margin-top:var(--gap);
    font-size:var(--fh1);line-height:.9;letter-spacing:.004em;
    color:#fff;text-transform:uppercase;text-indent:-.055em;
    text-shadow:0 4px 44px rgba(0,0,0,.95)}
  h1 em{font-style:normal;color:${NARANJA};text-indent:0}
  /* "esto" en minúscula y en cursiva con gracias: es la palabra que SEÑALA
     la foto, así que se dice en otro tono de voz, como quien baja la voz
     para apuntar con el dedo. */
  h1 .esto{font-family:'Instr',serif;font-style:italic;font-weight:400;
    text-transform:lowercase;letter-spacing:0;font-size:1.04em}

  .cierre{margin-top:auto}
  .resp{font-family:'ArchivoB',sans-serif;font-weight:800;
    font-size:var(--fresp);letter-spacing:-.03em;line-height:.95;color:#fff;
    text-shadow:0 4px 40px rgba(0,0,0,.95)}
  .resp b{color:${NARANJA};font-weight:900}
  .quien{font-family:'PM',monospace;margin-top:var(--gap3);
    font-size:var(--fquien);letter-spacing:.1em;color:#C0B8AC}
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
  <div class="foto"></div><div class="velo"></div>
  <div class="cont">
    <div class="marca"><i></i><b>Gastro<span>Goan</span></b></div>
    <h1>¿Por qué pagas<br><em>+2.500 € al año</em><br>por <span class="esto">esto</span>?</h1>
    <div class="cierre">
      <div class="resp">Lo mismo.<br><b>Por 100 € al año.</b></div>
      <div class="quien">APP DE GESTIÓN PARA BARES, RESTAURANTES Y CAFETERÍAS</div>
      <div class="cta">¡Descubre cómo!<u>&rarr;</u></div>
    </div>
  </div>
  <div class="grano"></div>
</div>`;

const VARS = (f, fondo) => {
  const s = f.nombre === 'story';
  return `
    --foto:url('${fondo.foto}'); --posx:${fondo.pos};
    --foco:${s ? fondo.foco[1] : fondo.foco[0]};
    --v1:${s ? '27%' : '30%'}; --v2:${s ? '52%' : '52%'}; --v3:${s ? '72%' : '70%'};
    --pad:${s ? 82 : 70}px; --gap:${s ? 32 : 24}px; --gap3:${s ? 16 : 13}px;
    --fmarca:${s ? 40 : 36}px; --punto:${s ? 15 : 13}px; --mgap:${s ? 13 : 11}px;
    --fh1:${s ? 132 : 112}px;
    --fresp:${s ? 76 : 66}px; --fquien:${s ? 20 : 18}px;
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
for(const fondo of FONDOS){
  for(const f of FORMATOS){
    await page.setViewport({width: f.w, height: f.h});
    await page.goto(`${BASE}/dist/index.html`, {waitUntil: 'domcontentloaded'});
    await page.setContent(
      `<!doctype html><meta charset="utf-8"><style>${CSS(fondo)}.escena{${VARS(f, fondo)}}</style>${HTML}`,
      {waitUntil: 'networkidle0'});
    await page.evaluate(RUIDO);
    await page.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 500));
    const archivo = `${SALIDA}/PAGAS-${fondo.id}-${f.nombre}.png`;
    await page.screenshot({path: archivo});
    console.log('✅ ' + archivo);
  }
}
await browser.close();
