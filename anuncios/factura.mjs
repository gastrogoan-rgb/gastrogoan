/* "LO QUE ESTÁS PAGANDO AHORA" — la tercera creatividad, en formato factura.
 *
 * La idea es del dueño, a partir de un anuncio de otro sector: una tabla de
 * precios con el total abajo. Pero con una vuelta que lo mejora — el
 * original enseña lo que ELLOS incluyen; este enseña lo que le están
 * COBRANDO a él. La misma tabla, y duele el triple.
 *
 * ── Por qué esta versión es TAN estricta ─────────────────────────────────
 * La primera tuvo un veredicto de una sola palabra: «dispar». Y era exacto.
 * Llevaba CINCO tipografías (Anton, Archivo, Schibsted, Plex Mono y el peso
 * fino de Schibsted), DOS rojos y tres alineaciones distintas. Cada elemento
 * estaba bien resuelto por separado y el conjunto parecía un collage.
 *
 * Un anuncio que tiene que venderse en un feed, entre cien piezas más, no se
 * gana por variedad: se gana por SISTEMA. Así que esta versión se somete a
 * cuatro reglas y no se salta ninguna:
 *
 *  1. DOS VOCES. Archivo Black para todo lo que es cifra o titular;
 *     Schibsted para todo lo que es texto. Se acabaron Anton y la
 *     monoespaciada — eran justamente lo que hacía ruido.
 *  2. UN ACENTO. Naranja, y nada más. El terracota era un segundo rojo que
 *     competía con él y ensuciaba la lectura.
 *  3. UNA RETÍCULA. Absolutamente todo —marca, titular, filas, franja y
 *     cierre— nace en el mismo margen izquierdo y muere en el mismo margen
 *     derecho. Es lo único que hace que una composición se lea «uniforme».
 *  4. UNA ESCALA. Cinco cuerpos de letra, no catorce. Cada uno con un
 *     trabajo asignado, y ninguno a medio camino entre dos.
 *
 * ── Y por qué ahora va en oscuro ─────────────────────────────────────────
 * La versión clara era crema con serif y terracota: hoy es, literalmente, el
 * aspecto por defecto de lo generado a máquina, y se nota. Sobre tinta el
 * papel blanco de la factura FLOTA, el naranja quema de verdad y la pieza
 * para el pulgar en el feed — que es el único trabajo que tiene.
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
const NARANJA = '#FF6B35';   // el único acento
const TINTA   = '#14120F';   // el fondo
const PAPEL   = '#FBFAF7';   // la factura
const FORMATOS = [
  {nombre: 'feed',  w: 1080, h: 1350},
  {nombre: 'story', w: 1080, h: 1920},
];

/* Las cuatro herramientas que un hostelero paga por separado, y lo que
   suman. La cuenta tiene que cuadrar si alguien la comprueba:
   275 €/mes × 12 = 3.300 €/año. Menos los 100 de GastroGoan, vuelven 3.200. */
const LINEAS = [
  ['Software de TPV y caja',    '100 €'],
  ['Gestión de personal',        '50 €'],
  ['Control de costes',          '50 €'],
  ['Reservas y pedidos online',  '75 €'],
];
const AL_MES  = '275 €';
const AL_ANO  = '3.300 €';
const VUELVEN = '3.200 €';

const CSS = `
  ${FUENTES}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;overflow:hidden;-webkit-font-smoothing:antialiased}

  /* LA RETÍCULA. Una sola columna, un solo padding, y el hueco entre bloques
     SIEMPRE el mismo (gap del flex, no márgenes sueltos por elemento: son
     los márgenes sueltos los que descuadran una composición sin que se vea
     de dónde viene). */
  .escena{width:100%;height:100%;position:relative;overflow:hidden;
    background:${TINTA};padding:var(--pad);
    display:flex;flex-direction:column;gap:var(--gap)}
  /* Un halo naranja muy abierto detrás de la factura: da profundidad sin
     dibujar nada. Un fondo de un solo plano es lo que hace que una pieza
     parezca una diapositiva. */
  .escena::before{content:'';position:absolute;inset:0;
    background:radial-gradient(70% 45% at 50% 30%, rgba(255,107,53,.16), transparent 72%)}

  /* ── CABECERA ───────────────────────────────────────────────────────── */
  .cab{position:relative;z-index:2;display:flex;flex-direction:column;gap:var(--gapc)}
  .marca{font-family:'SG',sans-serif;display:flex;align-items:center;gap:var(--mgap);
    font-size:var(--f-marca);font-weight:700;letter-spacing:-.02em;color:${PAPEL}}
  .marca i{width:var(--punto);height:var(--punto);background:${NARANJA};
    border-radius:50%;display:block;flex:none}
  .marca span{color:${NARANJA}}
  /* El gancho local. Va en Schibsted, no en monoespaciada: una quinta
     tipografía por una sola línea es exactamente el ruido que sobraba. */
  .ojo{font-family:'SG',sans-serif;font-size:var(--f-ojo);font-weight:700;
    letter-spacing:.16em;text-transform:uppercase;color:${NARANJA}}
  h1{font-family:'ArchivoB',sans-serif;font-weight:900;
    font-size:var(--f-h1);line-height:.98;letter-spacing:-.04em;color:${PAPEL}}

  /* ── LA FACTURA ─────────────────────────────────────────────────────── */
  .cuenta{position:relative;z-index:2;background:${PAPEL};padding:var(--cpad);
    box-shadow:0 30px 70px rgba(0,0,0,.45)}
  /* Las filas se separan con gap, todas iguales, y los conceptos y los
     precios caen en DOS columnas fijas: los precios alineados a la derecha
     y a la misma anchura, que es lo que hace que una tabla se lea como una
     cuenta y no como una lista. */
  .filas{display:flex;flex-direction:column;gap:var(--fgap)}
  .fila{display:flex;align-items:baseline;gap:16px;
    font-family:'SG',sans-serif;font-size:var(--f-fila);font-weight:500;color:${TINTA}}
  /* Un concepto NUNCA parte en dos líneas: en vertical, "Software de TPV y
     caja" caía en dos renglones y rompía el ritmo de la tabla, que es
     justamente lo que hace que se lea uniforme. Lo que cede es la fila de
     puntitos, que para eso está. */
  .fila .q{white-space:nowrap}
  .fila .p{flex:1;min-width:24px;border-bottom:2px dotted #CFC8BB;transform:translateY(-.28em)}
  /* La cifra y su unidad van en DOS columnas fijas: la cifra acaba siempre
     en la misma x y la unidad empieza siempre en la misma x. Metiendo el
     "/mes" dentro de la caja alineada a la derecha, lo que cuadraba era el
     final del "/mes" y los símbolos de euro quedaban en escalera — que es
     justo lo que se leía como descuadre. */
  /* La columna se dimensiona para la cifra MÁS ANCHA (3.300 € en cuerpo de
     total). Estaba cortada a la medida de las filas y el total se salía por
     la derecha, encima de su propia unidad. */
  .v{font-family:'ArchivoB',sans-serif;font-weight:800;
    font-size:var(--f-val);letter-spacing:-.03em;color:${TINTA};
    width:var(--colv);text-align:right;white-space:nowrap}
  .u{font-family:'SG',sans-serif;font-weight:500;font-size:var(--f-uni);
    color:#7A7268;width:var(--colu);white-space:nowrap}

  /* El total repite EXACTAMENTE la retícula de las filas —mismo concepto a
     la izquierda, misma columna de cifra a la derecha— y solo cambia de
     cuerpo. Un total que se sale de la rejilla de su propia tabla es el
     fallo que hacía que esto pareciera dos diseños pegados. */
  .total{margin-top:var(--fgap);padding-top:var(--fgap);border-top:3px solid ${TINTA};
    display:flex;align-items:baseline;gap:16px}
  .total .q{font-family:'SG',sans-serif;font-size:var(--f-fila);font-weight:700;
    color:${TINTA}}
  .total .mes{font-family:'SG',sans-serif;font-size:var(--f-mes);font-weight:500;
    color:#7A7268;margin-left:auto}
  .total .v{font-weight:900;font-size:var(--f-total);letter-spacing:-.045em}

  /* ── LA FRANJA ──────────────────────────────────────────────────────── */
  /* Mismo ancho que la factura, mismo padding lateral por dentro, y el
     precio en la MISMA columna de la derecha que los de arriba. Así el ojo
     compara las dos cifras sin moverse: es el argumento entero del anuncio
     y estaba desalineado. */
  .franja{position:relative;z-index:2;background:${NARANJA};padding:var(--cpad);
    display:flex;align-items:center;gap:16px;
    box-shadow:0 24px 60px rgba(255,107,53,.34)}
  .franja .izq{display:flex;flex-direction:column;gap:.24em}
  .franja .et{font-family:'SG',sans-serif;font-size:var(--f-ojo);font-weight:700;
    letter-spacing:.16em;text-transform:uppercase;color:rgba(20,18,15,.6)}
  .franja .nom{font-family:'ArchivoB',sans-serif;font-weight:900;
    font-size:var(--f-nom);letter-spacing:-.035em;line-height:1;color:${TINTA}}
  .franja .sub{font-family:'SG',sans-serif;font-size:var(--f-mes);font-weight:500;
    color:rgba(20,18,15,.78)}
  .franja .v{font-weight:900;font-size:var(--f-total);letter-spacing:-.045em;
    margin-left:auto}
  .franja .u{color:rgba(20,18,15,.6)}

  /* ── EL CIERRE ──────────────────────────────────────────────────────── */
  /* Una sola línea, del mismo cuerpo que el titular y en el mismo margen:
     abre y cierra el anuncio con la misma voz. La cifra en naranja porque es
     el único sitio donde el acento significa «esto es tuyo». */
  .cierre{position:relative;z-index:2;margin-top:auto;
    font-family:'ArchivoB',sans-serif;font-weight:900;
    font-size:var(--f-cierre);line-height:.98;letter-spacing:-.04em;color:${PAPEL}}
  .cierre b{color:${NARANJA};font-weight:900}

  /* Grano encima de todo: una superficie de color perfectamente limpia es lo
     que delata que algo está generado. */
  .grano{position:absolute;inset:0;z-index:9;pointer-events:none;opacity:.07;
    background-image:var(--ruido);background-size:180px 180px}
`;

const HTML = `
<div class="escena">
  <div class="cab">
    <div class="marca"><i></i><b>Gastro<span>Goan</span> App</b></div>
    <div class="ojo">Bares y restaurantes de Barcelona</div>
    <h1>Lo que estás<br>pagando ahora</h1>
  </div>

  <div class="cuenta">
    <div class="filas">
      ${LINEAS.map(([q, v]) => `<div class="fila"><span class="q">${q}</span><span class="p"></span><span class="v">${v}</span><span class="u">/mes</span></div>`).join('')}
    </div>
    <div class="total">
      <span class="q">Total</span>
      <span class="mes">${AL_MES} al mes</span>
      <span class="v">${AL_ANO}</span><span class="u">/año</span>
    </div>
  </div>

  <div class="franja">
    <div class="izq">
      <div class="et">Tu nueva cuenta</div>
      <div class="nom">GastroGoan App</div>
      <div class="sub">Todo esto y mucho más</div>
    </div>
    <span class="v">100 €</span><span class="u">/año</span>
  </div>

  <div class="cierre"><b>${VUELVEN}</b> que vuelven<br>a tu bolsillo</div>
  <div class="grano"></div>
</div>`;

/* LA ESCALA. Cinco cuerpos y ni uno más, cada uno con su trabajo:
   titular · cifra grande · fila · dato menor · etiqueta. --colv es la
   columna de precios, la misma para la factura y para la franja. */
const VARS = (f) => {
  const s = f.nombre === 'story';
  return `
    --pad:${s ? 74 : 62}px; --gap:${s ? 40 : 32}px; --gapc:${s ? 16 : 13}px;
    --mgap:${s ? 12 : 10}px; --punto:${s ? 13 : 12}px;
    --cpad:${s ? '42px 44px' : '34px 36px'}; --fgap:${s ? 26 : 21}px;
    --colv:${s ? 306 : 298}px; --colu:${s ? 78 : 66}px;
    --f-uni:${s ? 24 : 20}px;
    --f-marca:${s ? 36 : 32}px;
    --f-ojo:${s ? 23 : 20}px;
    --f-h1:${s ? 88 : 74}px;
    --f-fila:${s ? 31 : 29}px;
    --f-val:${s ? 40 : 34}px;
    --f-mes:${s ? 28 : 24}px;
    --f-total:${s ? 78 : 66}px;
    --f-nom:${s ? 46 : 39}px;
    --f-cierre:${s ? 86 : 82}px;`;
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
