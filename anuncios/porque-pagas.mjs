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
    linear-gradient(0deg, rgba(9,8,6,.97) 0%, rgba(9,8,6,.93) 24%,
                    rgba(9,8,6,.7) 40%, rgba(9,8,6,.24) 55%, transparent 70%),
    linear-gradient(180deg, rgba(9,8,6,.68) 0%, rgba(9,8,6,.34) 8%, transparent 18%)}

  .cont{position:absolute;inset:0;z-index:5;padding:var(--pad);
    display:flex;flex-direction:column;justify-content:space-between;align-items:flex-start}

  .marca{font-family:'SG',sans-serif;display:flex;align-items:center;gap:var(--mgap);
    font-size:var(--fmarca);font-weight:700;letter-spacing:-.02em;color:#fff;
    text-shadow:0 2px 20px rgba(0,0,0,.9)}
  .marca i{width:var(--punto);height:var(--punto);background:${NARANJA};
    border-radius:50%;display:block;flex:none;
    box-shadow:0 0 var(--punto) rgba(255,107,53,.8)}
  .marca span{color:${NARANJA}}
  .categoria{font-family:'PM',monospace;margin-top:var(--gap3);
    margin-left:calc(var(--punto) + var(--mgap));
    font-size:var(--fcat);letter-spacing:.2em;color:#E4DCD0;text-transform:uppercase;
    text-shadow:0 2px 18px rgba(0,0,0,.95)}

  .marca{font-family:'SG',sans-serif;display:flex;align-items:center;gap:var(--mgap);
    font-size:var(--fmarca);font-weight:700;letter-spacing:-.02em;color:#fff}
  .marca i{width:var(--punto);height:var(--punto);background:${NARANJA};
    border-radius:50%;display:block;flex:none;
    box-shadow:0 0 var(--punto) rgba(255,107,53,.75)}
  .marca span{color:${NARANJA}}
  .categoria{font-family:'PM',monospace;margin-top:var(--gap3);
    margin-left:calc(var(--punto) + var(--mgap));
    font-size:var(--fcat);letter-spacing:.2em;color:#E4DCD0;text-transform:uppercase;
    text-shadow:0 2px 18px rgba(0,0,0,.95)}

  /* ── LA VENTAJA COMPETITIVA, EN TRES ESCALONES ────────────────────────
     La versión anterior tenía las tres líneas al MISMO cuerpo y el naranja
     reducido a dos palabras: el argumento se leía, pero no se veía. Aquí la
     diferencia de precio se cuenta con el TAMAÑO, que es lo que el ojo pilla
     antes que ninguna palabra.

       1. La pregunta, mediana y en blanco.
       2. El precio viejo, TACHADO en naranja.
       3. El precio nuestro, en un tarjetón naranja macizo y enorme.

     El tarjetón es lo que da el tono autoritario: un bloque de color sólido
     se lee como un sello, como un veredicto, no como una frase más. Y de
     paso devuelve el naranja a la imagen, que era lo que se había perdido. */
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

  /* El remate: lo que se ahorra, dicho como dinero que VUELVE, no como
     descuento. Va pequeño y debajo del precio a propósito — es el premio,
     no el titular, y puesto grande competiría con la cifra del tarjetón. */
  .bolsillo{font-family:'ArchivoB',sans-serif;font-weight:800;margin-top:var(--gap2);
    font-size:var(--fbols);letter-spacing:-.02em;color:#F0EAE0;
    text-shadow:0 3px 26px rgba(0,0,0,.95)}
  .bolsillo b{color:${NARANJA};font-weight:900}

  .solo{display:inline-block;margin-top:var(--gap2);
    font-family:'Anton',sans-serif;font-size:var(--fsolo);line-height:.98;
    letter-spacing:.006em;text-transform:uppercase;
    background:${NARANJA};color:#14120F;padding:var(--solop);
    box-shadow:0 18px 50px rgba(255,107,53,.42)}
  .solo b{display:block;font-weight:400;font-size:.34em;letter-spacing:.05em;
    margin-bottom:.12em}
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
  <div class="foto"></div><div class="velo"></div>
  <div class="cont">
    <div class="cabecera">
      <div class="marca"><i></i><b>Gastro<span>Goan</span> App</b></div>
    </div>
    <div class="cierre">
    <div class="pregunta">Deja de pagar<br><span class="tachado">+2.500 € al año</span></div>
    <div class="solo"><b>Software GastroGoan</b>100 €</div>
    <div class="bolsillo"><b>2.400 €</b> que vuelven a tu bolsillo</div>
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
    --pad:${s ? 78 : 66}px; --gap:${s ? 30 : 23}px;
    --fmarca:${s ? 38 : 34}px; --punto:${s ? 14 : 12}px; --mgap:${s ? 12 : 10}px;
    --fcat:${s ? 22 : 19}px;
    --fpreg:${s ? 104 : 88}px; --tach:${s ? 10 : 9}px;
    --fbols:${s ? 38 : 33}px; --fsolo:${s ? 140 : 120}px;
    --fmarca:${s ? 38 : 34}px; --punto:${s ? 14 : 12}px; --mgap:${s ? 12 : 10}px;
    --fcat:${s ? 22 : 19}px;
    --solop:${s ? '22px 34px 26px' : '18px 28px 22px'};
    --gap2:${s ? 26 : 20}px; --gap3:${s ? 16 : 13}px;
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
