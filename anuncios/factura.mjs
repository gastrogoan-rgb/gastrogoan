/* "LO QUE ESTÁS PAGANDO AHORA" — la tercera creatividad, en formato factura.
 *
 * La idea es del dueño, a partir de un anuncio de otro sector: una tabla de
 * precios con el total abajo. Pero con una vuelta que lo mejora — el
 * original enseña lo que ELLOS incluyen; este enseña lo que le están
 * COBRANDO a él. La misma tabla, y duele el triple.
 *
 * ── Por qué en claro y no en oscuro como las otras dos ───────────────────
 * Las otras dos son fotografía oscura con naranja: gritan. Esta no tiene que
 * gritar, tiene que LEERSE — es una cuenta, y una cuenta se lee en papel
 * blanco. Además, en un feed donde todo el mundo satura el color, una pieza
 * clara y ordenada destaca justamente por no competir.
 *
 * Y de paso usa la paleta de verdad de la app (crema, tinta, terracota) en
 * vez de los colores de anuncio. Así el que hace clic se encuentra un
 * producto que se parece a lo que le prometieron.
 *
 * ── El reparto de color, que es el argumento entero ──────────────────────
 * El dolor va en TERRACOTA (el total que paga ahora) y la solución en
 * NARANJA (el tarjetón de GastroGoan). Dos rojos distintos: uno apagado que
 * incomoda, otro encendido que alivia. El ojo entiende cuál es cuál antes de
 * leer las cifras.
 *
 * ⚠️ Las cifras de las herramientas son PRECIOS DE MERCADO estimados, no la
 * tarifa de ninguna empresa concreta. Van sin nombres a propósito: poner
 * "Last.app 46 €" sería señalar a un competidor con su precio, y eso ni se
 * sostiene ni conviene.
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import {FUENTES, RUIDO} from './tipografia.mjs';

const SALIDA = 'anuncios/salida';
const BASE = 'http://localhost:8950';
const NARANJA   = '#FF6B35';   // la solución
const TERRACOTA = '#8A4A3B';   // el dolor
const CREMA     = '#F1EFE9';
const TINTA     = '#1C1A17';
const FORMATOS = [
  {nombre: 'feed',  w: 1080, h: 1350},
  {nombre: 'story', w: 1080, h: 1920},
];

/* Las cuatro herramientas que un hostelero paga por separado, y lo que
   suman. La cuenta tiene que cuadrar si alguien la comprueba:
   275 €/mes × 12 = 3.300 €/año. Menos los 100 de GastroGoan, vuelven 3.200. */
const LINEAS = [
  ['Software de TPV y caja',      '100 €/mes'],
  ['Gestión de personal',          '50 €/mes'],
  ['Control de costes',            '50 €/mes'],
  ['Reservas y pedidos online',    '75 €/mes'],
];
const AL_MES = '275 €';
const AL_ANO = '3.300 €';
const VUELVEN = '3.200 €';

const CSS = `
  ${FUENTES}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;overflow:hidden;-webkit-font-smoothing:antialiased}

  .escena{width:100%;height:100%;position:relative;overflow:hidden;
    background:${CREMA};padding:var(--pad);
    display:flex;flex-direction:column}
  /* Un punto de luz arriba a la izquierda: sin él, un fondo plano de un solo
     color se ve digital. Es el mismo truco que la luz de lámpara en las
     fotos, aplicado a una superficie de papel. */
  .escena::before{content:'';position:absolute;inset:0;
    background:radial-gradient(80% 55% at 18% 6%, rgba(255,255,255,.9), transparent 70%)}

  .marca{position:relative;z-index:2;font-family:'SG',sans-serif;
    display:flex;align-items:center;gap:var(--mgap);
    font-size:var(--fmarca);font-weight:700;letter-spacing:-.02em;color:${TINTA}}
  .marca i{width:var(--punto);height:var(--punto);background:${NARANJA};
    border-radius:50%;display:block;flex:none}
  .marca span{color:${NARANJA}}

  h1{position:relative;z-index:2;margin-top:var(--gap);
    font-family:'ArchivoB',sans-serif;font-weight:900;
    font-size:var(--fh1);line-height:.98;letter-spacing:-.035em;color:${TINTA}}

  /* LA CUENTA. Ficha blanca sobre crema, con sombra mínima: tiene que
     parecer un papel encima de la mesa, no una tarjeta de una web. */
  .cuenta{position:relative;z-index:2;margin-top:var(--gap);
    background:#fff;padding:var(--cpad);
    box-shadow:0 2px 3px rgba(28,26,23,.05), 0 18px 44px rgba(28,26,23,.1)}
  .fila{display:flex;align-items:baseline;gap:14px;
    font-family:'SG',sans-serif;font-size:var(--ffila);font-weight:500;color:${TINTA};
    padding:var(--fpad) 0}
  .fila + .fila{border-top:1px solid #EAE5DC}
  .fila .q{white-space:nowrap}
  /* Los puntitos que llevan del concepto al precio. Es lo que convierte una
     lista en una CUENTA — sin ellos son dos columnas sueltas. */
  .fila .p{flex:1;border-bottom:2px dotted #D6CFC3;transform:translateY(-.3em)}
  .fila .v{font-family:'PM',monospace;font-weight:500;white-space:nowrap;color:${TINTA}}

  .suma{margin-top:var(--gap2);padding-top:var(--gap2);border-top:3px solid ${TINTA};
    display:flex;align-items:baseline;justify-content:space-between;gap:16px;
    font-family:'SG',sans-serif;font-size:var(--fsuma);font-weight:700;color:${TINTA}}
  .suma .v{font-family:'PM',monospace;font-weight:500}

  /* El golpe: el total ANUAL, en terracota. El mes suena asumible; el año es
     el que duele, y por eso va aparte y al triple de cuerpo. */
  .ano{margin-top:var(--gap3);display:flex;align-items:baseline;
    justify-content:space-between;gap:16px}
  .ano .et{font-family:'SG',sans-serif;font-size:var(--fsuma);font-weight:700;
    color:${TERRACOTA}}
  .ano .v{font-family:'ArchivoB',sans-serif;font-weight:900;
    font-size:var(--fano);letter-spacing:-.045em;color:${TERRACOTA}}

  .flecha{position:relative;z-index:2;align-self:center;
    font-family:'Anton',sans-serif;font-size:var(--fflecha);line-height:1;
    color:${NARANJA};margin-top:var(--gap2)}

  /* LA SOLUCIÓN. Tarjetón naranja, el mismo recurso que en los otros dos
     anuncios: un bloque de color macizo se lee como un veredicto. */
  .sol{position:relative;z-index:2;margin-top:var(--gap2);background:${NARANJA};
    padding:var(--spad);display:flex;align-items:flex-end;justify-content:space-between;
    gap:20px;box-shadow:0 16px 44px rgba(255,107,53,.34)}
  .sol .izq{color:${TINTA}}
  .sol .t{font-family:'SG',sans-serif;font-size:var(--fsolt);font-weight:700;
    letter-spacing:-.02em;line-height:1.1}
  .sol .t b{display:block;font-family:'ArchivoB',sans-serif;font-weight:900;
    font-size:1.24em;letter-spacing:-.03em}
  .sol .precio{font-family:'Anton',sans-serif;font-size:var(--fsolp);
    line-height:.9;letter-spacing:.006em;color:${TINTA};white-space:nowrap}
  .sol .precio u{text-decoration:none;font-size:.4em;margin-left:.03em}

  .bolsillo{position:relative;z-index:2;margin-top:auto;padding-top:var(--gap2);
    font-family:'ArchivoB',sans-serif;font-weight:800;
    font-size:var(--fbols);letter-spacing:-.02em;color:${TINTA};text-align:center}
  .bolsillo b{color:${TERRACOTA};font-weight:900}

  /* Grano también aquí: una superficie de color perfectamente limpia es lo
     que delata que algo está generado. */
  .grano{position:absolute;inset:0;z-index:9;pointer-events:none;opacity:.055;
    background-image:var(--ruido);background-size:180px 180px}
`;

const HTML = `
<div class="escena">
  <div class="marca"><i></i><b>Gastro<span>Goan</span> App</b></div>
  <h1>Lo que estás<br>pagando ahora</h1>

  <div class="cuenta">
    ${LINEAS.map(([q, v]) => `<div class="fila"><span class="q">${q}</span><span class="p"></span><span class="v">${v}</span></div>`).join('')}
    <div class="suma"><span>Total al mes</span><span class="v">${AL_MES}</span></div>
    <div class="ano"><span class="et">Al año</span><span class="v">${AL_ANO}</span></div>
  </div>

  <div class="flecha">&darr;</div>
  <div class="sol">
    <div class="izq"><div class="t">Todo esto y mucho más<b>GastroGoan App</b></div></div>
    <div class="precio">100 €<u>/año</u></div>
  </div>
  <div class="bolsillo"><b>${VUELVEN}</b> que vuelven a tu bolsillo</div>
  <div class="grano"></div>
</div>`;

const VARS = (f) => {
  const s = f.nombre === 'story';
  return `
    --pad:${s ? 76 : 64}px; --gap:${s ? 28 : 22}px; --gap2:${s ? 22 : 17}px;
    --gap3:${s ? 14 : 11}px;
    --fmarca:${s ? 36 : 32}px; --punto:${s ? 13 : 12}px; --mgap:${s ? 11 : 10}px;
    --fh1:${s ? 108 : 92}px;
    --cpad:${s ? '46px 42px' : '38px 34px'}; --ffila:${s ? 38 : 33}px;
    --fpad:${s ? 20 : 17}px; --fsuma:${s ? 42 : 37}px; --fano:${s ? 98 : 86}px;
    --spad:${s ? '34px 38px' : '28px 32px'}; --fsolt:${s ? 34 : 30}px;
    --fsolp:${s ? 118 : 102}px; --fflecha:${s ? 70 : 60}px;
    --fbols:${s ? 38 : 33}px;`;
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
  const archivo = `${SALIDA}/FACTURA-${f.nombre}.png`;
  await page.screenshot({path: archivo});
  console.log('✅ ' + archivo);
}
await browser.close();
