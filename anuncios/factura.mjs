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
    background:${CREMA};padding:var(--pad) 0;
    display:flex;flex-direction:column}
  /* Un punto de luz arriba a la izquierda: sin él, un fondo plano de un solo
     color se ve digital. Es el mismo truco que la luz de lámpara en las
     fotos, aplicado a una superficie de papel. */
  .escena::before{content:'';position:absolute;inset:0;
    background:radial-gradient(80% 55% at 18% 6%, rgba(255,255,255,.92), transparent 70%)}
  /* Las dos cajas llevaban flex:1 y se repartían el sobrante a partes
     iguales: la de arriba ya está llena, así que TODO el aire caía debajo de
     la franja y quedaba un agujero de 400 px. Ahora la de arriba mide lo que
     ocupa y solo la de abajo estira. */
  .caja{position:relative;z-index:2;padding:0 var(--pad);
    display:flex;flex-direction:column;flex:none}
  .caja.cierre{flex:1;justify-content:center}

  .marca{font-family:'SG',sans-serif;display:flex;align-items:center;gap:var(--mgap);
    font-size:var(--fmarca);font-weight:700;letter-spacing:-.02em;color:${TINTA}}
  .marca i{width:var(--punto);height:var(--punto);background:${NARANJA};
    border-radius:50%;display:block;flex:none}
  .marca span{color:${NARANJA}}

  /* El gancho local, arriba del todo: es lo primero que tiene que resolver
     el anuncio — "esto va contigo". Va en monoespaciada espaciada, que es
     como se rotula un encabezado de documento, no un titular. */
  .ojo{margin-top:var(--gap);font-family:'PM',monospace;
    font-size:var(--fojo);letter-spacing:.2em;text-transform:uppercase;
    color:${TERRACOTA}}

  h1{margin-top:var(--gap3);
    font-family:'ArchivoB',sans-serif;font-weight:900;
    font-size:var(--fh1);line-height:1;letter-spacing:-.035em;color:${TINTA}}

  /* LA CUENTA. Ficha blanca sobre crema, con sombra mínima: tiene que
     parecer un papel encima de la mesa, no una tarjeta de una web. */
  .cuenta{margin-top:var(--gap);background:#fff;padding:var(--cpad);
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

  /* Los dos totales en UNA línea, como en una factura de verdad: el mes a la
     izquierda y el año a la derecha, alineados por la base. Y el año al
     doble de cuerpo y en terracota, porque 275 al mes suena asumible y
     3.300 al año es el que duele. */
  .totales{margin-top:var(--gap2);padding-top:var(--gap2);
    border-top:3px solid ${TINTA};
    display:flex;align-items:baseline;justify-content:space-between;gap:18px}
  .totales .et{font-family:'SG',sans-serif;font-size:var(--fsuma);font-weight:700;
    color:${TINTA};letter-spacing:-.02em}
  .totales .mes{font-family:'PM',monospace;font-size:var(--fmes);color:#6E675E;
    margin-left:auto}
  .totales .ano{font-family:'ArchivoB',sans-serif;font-weight:900;
    font-size:var(--fano);letter-spacing:-.045em;color:${TERRACOTA};white-space:nowrap}
  .totales .ano u{text-decoration:none;font-size:.42em;letter-spacing:-.01em}

  /* LA FRANJA. Va a SANGRE, de borde a borde: rompe el margen de la página y
     por eso se lee como un sello estampado encima de la cuenta y no como una
     fila más de la tabla. Dentro lleva su propia retícula —etiqueta, nombre,
     promesa y precio— separada por un filete, para que no sea un rectángulo
     de color con texto suelto.

     ⚠️ El sangrado NO se hace con márgenes negativos: la franja es hija
     directa de .escena, que YA tiene el padding horizontal a cero (el margen
     lo pone .caja por dentro). Un calc(-1 * --pad) la sacaba 64 px fuera de
     la pantalla por cada lado y se comía el "/año" del precio. */
  .franja{margin-top:var(--gap);
    background:${NARANJA};padding:var(--spad);
    display:flex;align-items:center;gap:var(--sgap);
    box-shadow:0 16px 44px rgba(255,107,53,.3)}
  .franja .izq{flex:1;color:${TINTA}}
  .franja .et{font-family:'PM',monospace;font-size:var(--fset);
    letter-spacing:.18em;text-transform:uppercase;opacity:.72}
  .franja .nom{font-family:'ArchivoB',sans-serif;font-weight:900;
    font-size:var(--fsnom);letter-spacing:-.03em;line-height:1;margin-top:.18em}
  .franja .sub{font-family:'SG',sans-serif;font-size:var(--fssub);font-weight:500;
    margin-top:.34em;opacity:.82}
  .franja .barra{width:3px;align-self:stretch;background:rgba(28,26,23,.22)}
  .franja .precio{font-family:'Anton',sans-serif;font-size:var(--fsolp);
    line-height:.88;letter-spacing:.006em;color:${TINTA};white-space:nowrap}
  .franja .precio u{text-decoration:none;font-size:.38em;margin-left:.03em}

  /* EL GOLPE. Es el cierre emocional del anuncio, así que es lo más grande
     después del titular: la cifra sola, y debajo qué es. Puesta pequeña, el
     anuncio termina en un dato; puesta así, termina en una promesa. */
  .golpe{padding-top:var(--gap)}
  .golpe .num{font-family:'Anton',sans-serif;font-size:var(--fgolpe);
    line-height:.86;letter-spacing:.004em;color:${TERRACOTA}}
  .golpe .txt{font-family:'ArchivoB',sans-serif;font-weight:900;
    font-size:var(--fgtxt);letter-spacing:-.03em;color:${TINTA};margin-top:.1em}

  /* Grano también aquí: una superficie de color perfectamente limpia es lo
     que delata que algo está generado. */
  .grano{position:absolute;inset:0;z-index:9;pointer-events:none;opacity:.055;
    background-image:var(--ruido);background-size:180px 180px}
`;

const HTML = `
<div class="escena">
  <div class="caja">
    <div class="marca"><i></i><b>Gastro<span>Goan</span> App</b></div>
    <div class="ojo">Para bares y restaurantes de Barcelona</div>
    <h1>Lo que estás pagando ahora</h1>

    <div class="cuenta">
      ${LINEAS.map(([q, v]) => `<div class="fila"><span class="q">${q}</span><span class="p"></span><span class="v">${v}</span></div>`).join('')}
      <div class="totales">
        <span class="et">Total</span>
        <span class="mes">${AL_MES}/mes</span>
        <span class="ano">${AL_ANO}<u>/año</u></span>
      </div>
    </div>
  </div>

  <div class="franja">
    <div class="izq">
      <div class="et">Tu nueva cuenta</div>
      <div class="nom">GastroGoan App</div>
      <div class="sub">Todo esto y mucho más</div>
    </div>
    <div class="barra"></div>
    <div class="precio">100 €<u>/año</u></div>
  </div>

  <div class="caja cierre">
    <div class="golpe">
      <div class="num">${VUELVEN}</div>
      <div class="txt">que vuelven a tu bolsillo</div>
    </div>
  </div>
  <div class="grano"></div>
</div>`;

const VARS = (f) => {
  const s = f.nombre === 'story';
  return `
    --pad:${s ? 76 : 64}px; --gap:${s ? 28 : 22}px; --gap2:${s ? 22 : 18}px;
    --gap3:${s ? 12 : 10}px;
    --fmarca:${s ? 36 : 32}px; --punto:${s ? 13 : 12}px; --mgap:${s ? 11 : 10}px;
    --fojo:${s ? 24 : 21}px; --fh1:${s ? 74 : 62}px;
    --cpad:${s ? '42px 38px' : '34px 32px'}; --ffila:${s ? 34 : 30}px;
    --fpad:${s ? 18 : 15}px;
    --fsuma:${s ? 36 : 31}px; --fmes:${s ? 30 : 26}px; --fano:${s ? 84 : 72}px;
    --spad:${s ? '32px 76px' : '26px 64px'}; --sgap:${s ? 34 : 28}px;
    --fset:${s ? 22 : 19}px; --fsnom:${s ? 46 : 40}px; --fssub:${s ? 28 : 25}px;
    --fsolp:${s ? 104 : 90}px;
    --fgolpe:${s ? 215 : 186}px; --fgtxt:${s ? 50 : 43}px;`;
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
