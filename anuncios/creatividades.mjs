/* Las CINCO creatividades de la campaña de Meta.
 *
 * ── Por qué están hechas así ─────────────────────────────────────────────
 * Saqué de la biblioteca de anuncios de Meta los 59 que corren ahora mismo
 * en España para hostelería: Ágora, Last.app, Numier, Qamarero, Makro,
 * Mahou... y son TODOS el mismo folleto. Fondo claro, "SOFTWARE PARA
 * HOSTELERÍA 🚀", un camarero sonriendo, un móvil flotando.
 *
 * Para cortar ahí no vale hacerlo más bonito. Hay que hacer algo que NO
 * parezca un anuncio. Así que ninguna de estas cinco enseña la app: enseñan
 * OBJETOS del oficio — un ticket térmico, una comanda, la pizarra del bar,
 * un cartel pegado con celo. Un hostelero los reconoce antes de leer.
 *
 * ── Lo que hace que no parezca hecho con IA ──────────────────────────────
 * Nada está recto, centrado ni limpio. Hay grano de foto encima de todo,
 * sombras blandas, tinta que se come letras, papel rasgado de verdad y
 * luz de lámpara. Un degradado limpio y un texto centrado es la firma del
 * "generado automáticamente"; esto es lo contrario, a propósito.
 *
 *   node anuncios/creatividades.mjs      (necesita el servidor en :8950)
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import {TICKET_CSS, ticketHtml} from './ticket.mjs';
import {PLATO_CSS, PLATO_HTML} from './plato.mjs';

const SALIDA = 'anuncios/salida';
const FORMATOS = [
  {nombre: 'feed',  w: 1080, h: 1350},   // 4:5, el que más pantalla ocupa
  {nombre: 'story', w: 1080, h: 1920},   // stories y reels
];

const FUENTES = `
  @font-face{font-family:'SG';src:url('/fonts/schibsted-grotesk-700-normal.woff2') format('woff2');font-weight:700}
  @font-face{font-family:'SG';src:url('/fonts/schibsted-grotesk-500-normal.woff2') format('woff2');font-weight:500}
  @font-face{font-family:'PM';src:url('/fonts/ibm-plex-mono-500-normal.woff2') format('woff2');font-weight:500}
  @font-face{font-family:'PM';src:url('/fonts/ibm-plex-mono-400-normal.woff2') format('woff2');font-weight:400}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;overflow:hidden;
    font-family:'SG',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
  .grano{position:absolute;inset:0;z-index:9;pointer-events:none;opacity:.16;
    background-image:var(--ruido);background-size:180px 180px}
  /* La firma, abajo. Discreta: el anuncio ya lleva la marca en el sello o
     en el cartel; repetirla grande lo convierte en folleto. */
  .firma{position:absolute;left:var(--fpad);bottom:var(--fpad);z-index:10;
    font-size:var(--f-firma);font-weight:700;letter-spacing:-.02em;
    color:#fff;text-shadow:0 2px 14px rgba(0,0,0,.75)}
  .firma span{color:#9DBBA4}
  .firma.oscura{color:#1C1A17;text-shadow:0 1px 10px rgba(255,255,255,.5)}
  .firma.oscura span{color:#4A5D4E}
`;

/* ══ 1. EL TICKET ══════════════════════════════════════════════════════
   Le facturamos su propio software como si fuera una cuenta de restaurante.
   Las cifras van como "desde": son precios de mercado de herramientas de
   hostelería, no la tarifa concreta de nadie — decir "Ágora: 80 €" sería
   inventarse la factura de un competidor. */
const TICKET = {
  css: TICKET_CSS + `
    .escena{--ancho:var(--t-ancho);--giro:-2.4deg;--tpad:var(--t-tpad);--tlado:var(--t-tlado);
      --sep:var(--t-sep);--f-cab:var(--t-fcab);--f-peq:var(--t-fpeq);--f-lin:var(--t-flin);
      --f-tot:var(--t-ftot);--sello-r:var(--t-sr);--sello-b:var(--t-sb);--sello-p:var(--t-sp);--tbajo:var(--t-tbajo);
      --f-sello:var(--t-fs);--f-sellop:var(--t-fsp)}`,
  html: ticketHtml({
    cabecera: {titulo: 'TU SOFTWARE', sub: 'RESUMEN ANUAL · MESA 1'},
    lineas: [
      ['TPV / caja',        'desde  960 €'],
      ['Reservas',          'desde  720 €'],
      ['Personal',          'desde  480 €'],
      ['Domicilio (30%)',   '     ¿cuánto?'],
      ['Escandallo',        '  una libreta'],
    ],
    total: ['TOTAL', 'más de 3.600 €'],
    nota: 'GRACIAS POR SU VISITA<br>VUELVA EL AÑO QUE VIENE',
    sello: {grande: '100 €', peque: 'AL AÑO · TODO'},
  }),
  firma: null,   // el sello ya hace de marca
};

/* ══ 2. LA COMANDA ════════════════════════════════════════════════════
   El precio, impreso como la comanda que sale por la impresora de cocina.
   Papel más pequeño, tinta más sucia, y la mesa de acero de la cocina. */
const COMANDA = {
  css: `
    .escena{width:100%;height:100%;position:relative;overflow:hidden;
      background:linear-gradient(160deg,#4A4F52 0%,#31363A 45%,#1E2225 100%)}
    /* Acero cepillado. */
    .escena::before{content:'';position:absolute;inset:-20%;opacity:.5;
      background:repeating-linear-gradient(88deg,
        rgba(255,255,255,.05) 0 1px, rgba(0,0,0,.05) 1px 4px);
      transform:rotate(.6deg)}
    .escena::after{content:'';position:absolute;inset:0;
      background:radial-gradient(58% 42% at 52% 40%, rgba(255,255,255,.14), transparent 72%)}
    .pinza{position:absolute;left:50%;top:calc(50% - var(--c-alto)*.52);
      width:var(--c-pinza);height:calc(var(--c-pinza)*.42);
      transform:translateX(-50%) rotate(-2deg);z-index:4;
      background:linear-gradient(180deg,#C7CCD0,#8B9297 60%,#6A7176);
      box-shadow:0 8px 22px rgba(0,0,0,.6)}
    .com{position:absolute;left:50%;top:50%;width:var(--c-ancho);
      transform:translate(-50%,-50%) rotate(-2deg);z-index:3;
      background:linear-gradient(178deg,#FDFCF7,#F3F0E6 60%,#EAE6DA);
      padding:var(--c-pad);font-family:'PM',monospace;color:#23201C;
      box-shadow:0 3px 4px rgba(0,0,0,.4),0 30px 60px rgba(0,0,0,.6)}
    .com::after{content:'';position:absolute;left:-1px;right:-1px;bottom:-15px;height:16px;
      background:
        linear-gradient(-45deg,transparent 0 9px,#EAE6DA 9px) 0 0/17px 100% repeat-x,
        linear-gradient(45deg,transparent 0 9px,#EAE6DA 9px) 0 0/17px 100% repeat-x;
      transform:scaleY(-1)}
    .com .top{display:flex;justify-content:space-between;font-size:var(--c-fpeq);
      letter-spacing:.14em;color:#6B6358;border-bottom:2px solid #23201C;padding-bottom:10px}
    .com h2{font-family:'SG',sans-serif;font-weight:700;font-size:var(--c-fbig);
      letter-spacing:-.035em;line-height:.95;margin:var(--c-gap) 0}
    .com h2 em{font-style:normal;display:block;font-size:.44em;letter-spacing:.02em;
      margin-top:.35em;color:#4A5D4E}
    .com .items{font-size:var(--c-flin);line-height:2;letter-spacing:.02em}
    .com .items div{display:flex;gap:14px}
    .com .items b{font-weight:500}
    .com .pie2{margin-top:var(--c-gap);border-top:2px dashed #B9B0A2;padding-top:14px;
      font-size:var(--c-fpeq);letter-spacing:.1em;color:#6B6358;text-align:center}
    .gastado{position:absolute;inset:0;z-index:5;pointer-events:none;
      background:linear-gradient(93deg,rgba(253,252,247,.5) 0 5%,transparent 5% 12%),
                 linear-gradient(-88deg,rgba(253,252,247,.38) 0 4%,transparent 4% 10%)}`,
  html: `<div class="escena">
    <div class="pinza"></div>
    <div class="com">
      <div class="top"><span>COMANDA</span><span>MESA 12</span></div>
      <h2>TODO<em>por 100 € al año</em></h2>
      <div class="items">
        <div><b>1×</b><span>TPV y caja</span></div>
        <div><b>1×</b><span>Reservas y domicilio</span></div>
        <div><b>1×</b><span>Escandallo y stock</span></div>
        <div><b>1×</b><span>Personal y horarios</span></div>
        <div><b>1×</b><span>Cuentas del negocio</span></div>
      </div>
      <div class="pie2">SIN CUOTA MENSUAL · SIN COMISIONES</div>
      <div class="gastado"></div>
    </div>
  </div>`,
  firma: 'clara',
};

/* ══ 3. LA PIZARRA ════════════════════════════════════════════════════
   La pizarra del bar. Es SU superficie: la miran todos los días para
   escribir el menú. Aquí escribimos otra cosa. */
const PIZARRA = {
  css: `
    .escena{width:100%;height:100%;position:relative;overflow:hidden;
      background:#17140F;display:flex;align-items:center;justify-content:center;
      padding:var(--p-pad)}
    .marco{position:absolute;inset:var(--p-marco);
      background:linear-gradient(150deg,#6B4E2E,#4A351E 45%,#2E2013);
      box-shadow:0 30px 70px rgba(0,0,0,.7), inset 0 2px 0 rgba(255,255,255,.12)}
    .pizarra{position:absolute;inset:calc(var(--p-marco) + var(--p-borde));
      background:
        radial-gradient(70% 55% at 42% 34%, #34383A 0%, #24282A 58%, #191C1E 100%);
      box-shadow:inset 0 0 90px rgba(0,0,0,.8)}
    /* Restos de tiza: nubes irregulares y rayas de trapo. */
    .pizarra::before{content:'';position:absolute;inset:0;opacity:.16;
      background:
        radial-gradient(40% 22% at 22% 72%, rgba(255,255,255,.5), transparent 70%),
        radial-gradient(34% 18% at 78% 26%, rgba(255,255,255,.4), transparent 70%),
        repeating-linear-gradient(102deg, rgba(255,255,255,.07) 0 3px, transparent 3px 26px)}
    .texto{position:relative;z-index:3;text-align:center;color:#F2EDE0;
      transform:rotate(-1.1deg)}
    .texto .arriba{font-family:'PM',monospace;font-size:var(--p-fpeq);
      letter-spacing:.3em;color:#9DBBA4;margin-bottom:var(--p-gap)}
    .texto h2{font-size:var(--p-fbig);font-weight:700;letter-spacing:-.045em;line-height:.9;
      position:relative;
      text-shadow:0 0 26px rgba(242,237,224,.3), 0 0 2px rgba(242,237,224,.6)}
    /* La tiza no cubre uniforme: deja el trazo comido por dentro. Se hace
       recortando ruido con el propio texto, no pintando encima. */
    .texto h2::after{content:attr(data-t);position:absolute;inset:0;
      background-image:var(--ruido);background-size:90px 90px;
      -webkit-background-clip:text;background-clip:text;color:transparent;
      opacity:.5;mix-blend-mode:overlay;pointer-events:none}
    .texto h2 s{color:#8A8377;text-decoration-thickness:.05em}
    .texto h2 em{font-style:normal;color:#9DBBA4}
    .texto .abajo{font-size:var(--p-fsub);font-weight:500;color:#CFC8B8;
      margin-top:var(--p-gap);line-height:1.3}
    /* Tiza: bordes ligeramente comidos y grano encima del texto. */
    .tiza{position:absolute;inset:0;z-index:4;pointer-events:none;opacity:.5;
      background-image:var(--ruido);background-size:120px 120px;mix-blend-mode:overlay}`,
  html: `<div class="escena">
    <div class="marco"></div>
    <div class="pizarra"></div>
    <div class="texto">
      <div class="arriba">HOY EN LA CARTA</div>
      <h2><s>300 €</s> al mes<br>en programas.<br><em>Se acabó.</em></h2>
      <div class="abajo">Todo tu negocio por 100 € al año.</div>
    </div>
    <div class="tiza"></div>
  </div>`,
  firma: 'clara',
};

/* ══ 4. EL CARTEL PEGADO ══════════════════════════════════════════════
   Papel barato pegado con celo en un azulejo de cocina. La pregunta que
   ningún proveedor le hace, en el sitio donde se cuelgan los avisos. */
const CARTEL = {
  css: `
    .escena{width:100%;height:100%;position:relative;overflow:hidden;
      background:#D8D3C8;display:flex;align-items:center;justify-content:center}
    /* Azulejo blanco de cocina, con junta. */
    .escena::before{content:'';position:absolute;inset:0;
      background:
        linear-gradient(#0000,#0000) ,
        repeating-linear-gradient(0deg,#C9C3B6 0 3px,#EFEBE2 3px 148px),
        repeating-linear-gradient(90deg,#C9C3B6 0 3px,#EFEBE2 3px 148px)}
    .escena::after{content:'';position:absolute;inset:0;
      background:radial-gradient(60% 48% at 46% 36%, rgba(255,255,255,.55), rgba(0,0,0,.22) 100%)}
    .hoja{position:relative;z-index:3;width:var(--k-ancho);
      background:linear-gradient(175deg,#FCFBF6,#F4F1E7 70%,#ECE8DC);
      padding:var(--k-pad);transform:rotate(1.6deg);
      box-shadow:0 2px 3px rgba(0,0,0,.25),0 24px 48px rgba(0,0,0,.34)}
    /* Cuatro trozos de celo. Translúcidos y torcidos, cada uno distinto. */
    .celo{position:absolute;width:var(--k-celo);height:calc(var(--k-celo)*.34);
      background:linear-gradient(150deg,rgba(255,255,255,.62),rgba(226,226,214,.42));
      box-shadow:0 2px 6px rgba(0,0,0,.18);z-index:5}
    .celo.a{top:calc(var(--k-celo)*-.16);left:calc(var(--k-celo)*-.2);transform:rotate(-38deg)}
    .celo.b{top:calc(var(--k-celo)*-.18);right:calc(var(--k-celo)*-.2);transform:rotate(36deg)}
    .celo.c{bottom:calc(var(--k-celo)*-.16);left:calc(var(--k-celo)*-.22);transform:rotate(41deg)}
    .celo.d{bottom:calc(var(--k-celo)*-.17);right:calc(var(--k-celo)*-.19);transform:rotate(-34deg)}
    .hoja .ojo{font-family:'PM',monospace;font-size:var(--k-fpeq);letter-spacing:.2em;
      color:#8A4A3B;margin-bottom:var(--k-gap)}
    .hoja h2{font-size:var(--k-fbig);font-weight:700;letter-spacing:-.04em;line-height:.95;
      color:#1C1A17}
    .hoja h2 em{font-style:normal;
      background:linear-gradient(transparent 58%, #9DBBA4 58% 92%, transparent 92%)}
    .hoja p{font-size:var(--k-fsub);font-weight:500;color:#3D3A34;line-height:1.32;
      margin-top:var(--k-gap)}
    .hoja .sello2{margin-top:var(--k-gap);display:inline-block;
      font-family:'PM',monospace;font-size:var(--k-fpeq);letter-spacing:.14em;
      border:3px solid #1C1A17;padding:10px 18px;transform:rotate(-1.4deg)}`,
  html: `<div class="escena">
    <div class="hoja">
      <span class="celo a"></span><span class="celo b"></span>
      <span class="celo c"></span><span class="celo d"></span>
      <div class="ojo">PREGUNTA INCÓMODA</div>
      <h2>¿Cuánto ganas con <em>cada plato</em>?</h2>
      <p>Si la respuesta es "más o menos", hay un plato de tu carta
         que te está costando dinero cada vez que sale.</p>
      <div class="sello2">GASTROGOAN · 100 €/AÑO</div>
    </div>
  </div>`,
  firma: null,
};

/* ══ 5. LA CUENTA A SANGRE ════════════════════════════════════════════
   La única tipográfica, y hecha como se hace en respuesta directa: la letra
   OCUPA el marco, no flota en el centro con aire alrededor. Va en crema de
   la app, no en negro, para que no se confunda con las otras cuatro y para
   destacar en un feed que es mayoritariamente claro. */
const CIFRA = {
  css: `
    .escena{width:100%;height:100%;position:relative;overflow:hidden;
      background:#F1EFE9;display:flex;flex-direction:column;justify-content:center;
      padding:var(--n-pad)}
    .escena::before{content:'';position:absolute;inset:0;
      background:radial-gradient(75% 50% at 20% 12%, rgba(255,255,255,.9), transparent 70%)}
    .banda{position:absolute;left:0;right:0;top:0;height:var(--n-banda);background:#1C1A17}
    .cont{position:relative;z-index:3}
    .cont .ojo{font-family:'PM',monospace;font-size:var(--n-fpeq);letter-spacing:.24em;
      color:#8A4A3B;margin-bottom:var(--n-gap)}
    .cont .gigante{font-size:var(--n-fgig);font-weight:700;letter-spacing:-.06em;
      line-height:.78;color:#1C1A17}
    .cont .gigante small{font-size:.3em;letter-spacing:-.02em}
    .cont .bajo{font-size:var(--n-fsub);font-weight:700;letter-spacing:-.03em;
      line-height:1.02;margin-top:var(--n-gap);color:#1C1A17}
    .cont .bajo em{font-style:normal;color:#4A5D4E}
    .cont .lista{margin-top:var(--n-gap);display:flex;flex-wrap:wrap;gap:10px}
    .cont .lista span{font-family:'PM',monospace;font-size:var(--n-fchip);
      border:2px solid #1C1A17;padding:8px 14px;letter-spacing:.04em;color:#1C1A17}
    .tachon{position:absolute;left:var(--n-pad);right:var(--n-pad);
      top:var(--n-tach);height:var(--n-tachh);background:#8A4A3B;
      transform:rotate(-2.4deg);z-index:4;opacity:.92}`,
  html: `<div class="escena">
    <div class="banda"></div>
    <div class="cont">
      <div class="ojo">BARES Y RESTAURANTES</div>
      <div class="gigante">100 €<small> al año</small></div>
      <div class="bajo">No al mes.<br><em>No por local al mes.</em><br>Al año.</div>
      <div class="lista">
        <span>TPV</span><span>RESERVAS</span><span>DOMICILIO</span>
        <span>ESCANDALLO</span><span>STOCK</span><span>PERSONAL</span>
      </div>
    </div>
  </div>`,
  firma: 'oscura',
};

const PLATO = {css: PLATO_CSS, html: PLATO_HTML, firma: null};

const IDEAS = {
  '1-ticket': TICKET,
  '2-plato':  PLATO,
};

/* Las medidas, por formato. Story tiene 570 px más de alto, así que todo
   respira; feed hay que apretarlo o se sale del marco. */
const VARS = (f) => {
  const s = f.nombre === 'story';
  return `
    --fpad:${s ? 70 : 58}px; --f-firma:${s ? 44 : 38}px;
    --t-ancho:${s ? 840 : 830}px; --t-tpad:${s ? 74 : 62}px; --t-tlado:${s ? 60 : 56}px;
    --t-tbajo:${s ? 250 : 230}px;
    --t-sep:${s ? 26 : 20}px; --t-fcab:${s ? 40 : 36}px; --t-fpeq:${s ? 24 : 21}px;
    --t-flin:${s ? 34 : 33}px; --t-ftot:${s ? 50 : 47}px;
    --t-sr:${s ? 46 : 40}px; --t-sb:${s ? 56 : 48}px; --t-sp:${s ? '22px 30px' : '18px 26px'};
    --t-fs:${s ? 86 : 80}px; --t-fsp:${s ? 22 : 21}px;
    --c-ancho:${s ? 720 : 660}px; --c-alto:${s ? 980 : 900}px; --c-pad:${s ? 60 : 50}px;
    --c-pinza:${s ? 190 : 170}px; --c-fpeq:${s ? 24 : 21}px; --c-fbig:${s ? 150 : 132}px;
    --c-flin:${s ? 32 : 29}px; --c-gap:${s ? 34 : 26}px;
    --p-pad:${s ? 70 : 58}px; --p-marco:${s ? 56 : 46}px; --p-borde:${s ? 34 : 28}px;
    --p-fpeq:${s ? 28 : 25}px; --p-fbig:${s ? 168 : 150}px; --p-fsub:${s ? 48 : 43}px;
    --p-gap:${s ? 36 : 28}px;
    --k-ancho:${s ? 820 : 780}px; --k-pad:${s ? 76 : 64}px; --k-celo:${s ? 190 : 170}px;
    --k-fpeq:${s ? 25 : 22}px; --k-fbig:${s ? 124 : 108}px; --k-fsub:${s ? 40 : 35}px;
    --k-gap:${s ? 32 : 25}px;
    --n-pad:${s ? 84 : 70}px; --n-banda:${s ? 26 : 22}px; --n-fpeq:${s ? 27 : 24}px;
    --n-fgig:${s ? 300 : 250}px; --n-fsub:${s ? 76 : 66}px; --n-fchip:${s ? 25 : 22}px;
    --n-gap:${s ? 34 : 26}px; --n-tach:${s ? 1180 : 800}px; --n-tachh:${s ? 0 : 0}px;
    --pl-ojo:${s ? 118 : 86}px; --pl-fojo:${s ? 27 : 24}px;
    --pl-top:${s ? 300 : 210}px; --pl-plato:${s ? 760 : 730}px; --pl-cub:${s ? 46 : 44}px;
    --pl-tick:${s ? 400 : 386}px; --pl-tpad:${s ? '30px 26px' : '28px 24px'};
    --pl-ft1:${s ? 19 : 18}px; --pl-ft2:${s ? 60 : 58}px; --pl-ft3:${s ? 17 : 16}px;
    --pl-tgap:${s ? 16 : 14}px;
    --pl-taza:${s ? 300 : 280}px; --pl-taza-r:${s ? -80 : -74}px; --pl-taza-b:${s ? 420 : 296}px;
    --pl-pie:${s ? 150 : 104}px; --pl-fpie:${s ? 84 : 76}px; --pl-fmarca:${s ? 38 : 34}px;`;
};

/* El ruido, generado en el propio navegador. Es lo que quita el acabado
   "digital limpio" que delata una imagen hecha por una máquina. */
const RUIDO = `(() => {
  const c = document.createElement('canvas'); c.width = c.height = 180;
  const x = c.getContext('2d'); const d = x.createImageData(180, 180);
  for(let i = 0; i < d.data.length; i += 4){
    const v = 118 + (Math.random() * 90 - 45);
    d.data[i] = d.data[i+1] = d.data[i+2] = v; d.data[i+3] = 255;
  }
  x.putImageData(d, 0, 0);
  document.documentElement.style.setProperty('--ruido', 'url(' + c.toDataURL() + ')');
})()`;

const pagina = (idea, f) => `<!doctype html><meta charset="utf-8">
  <style>${FUENTES}${idea.css}
    .escena{${VARS(f)}}
  </style>
  ${idea.html}
  ${idea.firma ? `<div class="firma ${idea.firma === 'oscura' ? 'oscura' : ''}" style="${VARS(f)}">Gastro<span>Goan</span></div>` : ''}
  <div class="grano" style="${VARS(f)}"></div>`;

fs.mkdirSync(SALIDA, {recursive: true});
// La tanda anterior (fondos oscuros con texto flotando) se borra: eran
// diapositivas, no anuncios, y dejarlas al lado solo confunde al elegir.
for(const f of fs.readdirSync(SALIDA)) fs.unlinkSync(`${SALIDA}/${f}`);

const browser = await puppeteer.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'],
  headless: true,
});
const page = await browser.newPage();
const hechos = [];
for(const f of FORMATOS){
  await page.setViewport({width: f.w, height: f.h});
  for(const [id, idea] of Object.entries(IDEAS)){
    await page.goto('http://localhost:8950/dist/index.html', {waitUntil: 'domcontentloaded'});
    await page.setContent(pagina(idea, f), {waitUntil: 'domcontentloaded'});
    await page.evaluate(RUIDO);
    await page.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 250));
    const archivo = `${SALIDA}/${id}-${f.nombre}.png`;
    await page.screenshot({path: archivo});
    hechos.push(archivo);
  }
}
await browser.close();
console.log(hechos.map(h => '✅ ' + h).join('\n'));
