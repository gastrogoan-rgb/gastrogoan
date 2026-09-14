/* Réplicas de los dos anuncios que funcionan en el mercado, con GastroGoan.
 *
 * No es copiar por copiar: los dos son patrones YA VALIDADOS por gente que
 * se está gastando el dinero en ellos, y ambos siguen la misma lógica —
 * decirle al hostelero "esto va contigo" en la primera décima de segundo.
 *
 *  A) EL DE SEVILLA (naranja). "¿RESTAURANTE O BAR EN SEVILLA?" — pregunta
 *     con la CIUDAD, enorme, arriba; lista de servicios con iconos; botón
 *     DENTRO de la imagen; foto oscura y apetecible al fondo. Dos agencias
 *     distintas (Sevilla y Granada) usan la misma fórmula, así que no es
 *     casualidad: es lo que funciona en servicios locales.
 *
 *  B) EL DE LAST.APP (lima). Titular subrayado con rotulador fosforito,
 *     producto real dentro de una cocina real, precio abajo. Su mensaje
 *     ("cambia sin gastar en dispositivos") delata cuál es la objeción
 *     número uno del mercado: el miedo a tener que comprar cacharros.
 *     Aquí se le da la vuelta, porque GastroGoan no necesita ninguno.
 *
 * ⚠️ Las fotos salen de deploy/web/public/img (las de la web comercial).
 * Si son de banco de imágenes, conviene comprobar que la licencia cubre
 * PUBLICIDAD DE PAGO y no solo uso en web — no es lo mismo y es justo el
 * tipo de detalle que acaba en un susto.
 *
 *   node anuncios/replicas.mjs      (necesita el servidor en :8950)
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const SALIDA = 'anuncios/salida';
const BASE = 'http://localhost:8950';
const FORMATOS = [
  {nombre: 'feed',  w: 1080, h: 1350},
  {nombre: 'story', w: 1080, h: 1920},
];

/* ── 1. La app, dentro de una tablet ──────────────────────────────────
   El anuncio B necesita el producto funcionando, como el de Last.app.
   Se saca del kit de demo (Cal Ramon), así que hay datos creíbles y ni un
   dato de ningún cliente real. */
async function capturarApp(browser){
  const page = await browser.newPage();
  await page.setViewport({width: 980, height: 660, deviceScaleFactor: 3});
  await page.goto(`${BASE}/dist/kit-gastrogoan-DEMO.html`, {waitUntil: 'domcontentloaded'});
  await new Promise(r => setTimeout(r, 3500));            // la siembra del kit
  await page.evaluate(() => window.navigate && navigate('tpv'));
  // El sello DEMO delata que no es un negocio real. En una captura interna
  // da igual; dentro de un anuncio, tira por tierra la credibilidad.
  await page.evaluate(() => {
    for(const el of document.querySelectorAll('div,span')){
      if(el.children.length === 0 && el.textContent.trim() === 'DEMO') el.style.display = 'none';
    }
  });
  await new Promise(r => setTimeout(r, 1800));            // los KPI se animan 600 ms
  const buf = await page.screenshot({encoding: 'base64'});
  await page.close();
  return 'data:image/png;base64,' + buf;
}

const FUENTES = `
  @font-face{font-family:'SG';src:url('/fonts/schibsted-grotesk-700-normal.woff2') format('woff2');font-weight:700}
  @font-face{font-family:'SG';src:url('/fonts/schibsted-grotesk-600-normal.woff2') format('woff2');font-weight:600}
  @font-face{font-family:'SG';src:url('/fonts/schibsted-grotesk-500-normal.woff2') format('woff2');font-weight:500}
  @font-face{font-family:'PM';src:url('/fonts/ibm-plex-mono-500-normal.woff2') format('woff2');font-weight:500}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;overflow:hidden;
    font-family:'SG',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
  .grano{position:absolute;inset:0;z-index:20;pointer-events:none;opacity:.11;
    background-image:var(--ruido);background-size:180px 180px}
`;

/* ══ A · EL DE SEVILLA ════════════════════════════════════════════════
   El naranja: es el color del anuncio, no de la app. La paleta de
   GastroGoan (oliva y crema) está pensada para mirarla ocho horas seguidas
   sin cansarte; un anuncio necesita justo lo contrario — gritar en un feed
   lleno de neón. Se coge el terracota de la marca (#8A4A3B) y se sube de
   saturación hasta que pega el grito, manteniendo el aire de familia. */
const A_CSS = `
  .escena{width:100%;height:100%;position:relative;overflow:hidden;background:#0F0C09}
  .foto{position:absolute;inset:0;background-image:var(--foto);
    background-size:cover;background-position:62% 50%;filter:saturate(1.05) contrast(1.06)}
  /* El degradado es lo que hace legible el texto sobre una foto. Sin esto,
     el titular se pierde en los brillos de las copas. */
  .velo{position:absolute;inset:0;background:
    linear-gradient(100deg, rgba(10,8,6,.985) 0%, rgba(10,8,6,.96) 46%,
                    rgba(10,8,6,.78) 66%, rgba(10,8,6,.4) 100%),
    linear-gradient(0deg, rgba(10,8,6,.9) 0%, transparent 34%)}
  .cont{position:absolute;inset:0;z-index:5;padding:var(--a-pad);
    display:flex;flex-direction:column}

  .marca{display:flex;align-items:center;gap:12px;font-size:var(--a-fmarca);
    font-weight:700;letter-spacing:-.02em;color:#fff}
  .marca i{width:var(--a-punto);height:var(--a-punto);background:#E8541F;
    border-radius:50%;display:block}
  .marca b{font-weight:700}
  .marca span{color:#E8541F}

  h1{margin-top:var(--a-gap);font-size:var(--a-fh1);font-weight:700;
    letter-spacing:-.045em;line-height:.87;color:#fff;text-transform:uppercase}
  h1 em{font-style:normal;color:#E8541F;display:block}

  .claim{margin-top:var(--a-gap);font-size:var(--a-fclaim);font-weight:700;
    letter-spacing:-.01em;line-height:1.1;color:#fff;text-transform:uppercase}
  .claim b{color:#E8541F}

  .lista{margin-top:var(--a-gap);width:var(--a-lista)}
  .lista div{display:flex;align-items:center;gap:var(--a-lgap);
    padding:var(--a-lpad) 0;border-bottom:1px solid rgba(255,255,255,.2)}
  .lista div:last-child{border-bottom:0}
  .lista i{font-size:var(--a-ficon);color:#E8541F;width:var(--a-ficon);
    display:flex;justify-content:center;flex:none}
  .lista span{font-size:var(--a-flista);font-weight:500;color:#F2EFE9;line-height:1.15}

  .cta{margin-top:auto;align-self:flex-start;background:#E8541F;color:#fff;
    font-size:var(--a-fcta);font-weight:700;letter-spacing:.02em;
    padding:var(--a-ctap);text-transform:uppercase;
    box-shadow:0 14px 34px rgba(232,84,31,.42)}
  .pie{margin-top:var(--a-gap2);font-family:'PM',monospace;font-size:var(--a-fpie);
    letter-spacing:.12em;color:#B9B0A2}
`;

const A_HTML = `
<div class="escena">
  <div class="foto"></div><div class="velo"></div>
  <div class="cont">
    <div class="marca"><i></i><b>Gastro<span>Goan</span></b></div>
    <h1>¿Bar o<br>restaurante<br><em>en Barcelona?</em></h1>
    <div class="claim">Deja de pagar <b>cuatro programas</b></div>
    <div class="lista">
      <div><i class="ti ti-device-desktop-analytics"></i><span>TPV, caja y cierre diario</span></div>
      <div><i class="ti ti-calendar-check"></i><span>Reservas y pedidos a domicilio</span></div>
      <div><i class="ti ti-calculator"></i><span>Escandallo y control de stock</span></div>
      <div><i class="ti ti-users"></i><span>Personal, turnos y fichajes</span></div>
      <div><i class="ti ti-chart-histogram"></i><span>Las cuentas de tu negocio</span></div>
    </div>
    <div class="cta">Escríbeme por WhatsApp</div>
    <div class="pie">100 € AL AÑO · SIN CUOTAS · SIN COMISIONES</div>
  </div>
</div>`;

/* ══ B · EL DE LAST.APP ═══════════════════════════════════════════════
   ⚠️ El lima fosforito es LA seña de identidad de Last.app. Copiarlo tal
   cual tiene un coste: a quien conozca la categoría le vas a parecer el
   que va detrás. Se deja porque es lo que se pidió, pero mi consejo es
   quedarse con la ESTRUCTURA (rotulador + producto en cocina real) y
   cambiar el color. */
const B_CSS = `
  .escena{width:100%;height:100%;position:relative;overflow:hidden;background:#14120F}
  .foto{position:absolute;inset:0;background-image:var(--foto2);
    background-size:cover;background-position:50% 42%;filter:brightness(.62) saturate(.95)}
  .velo{position:absolute;inset:0;background:
    linear-gradient(180deg, rgba(12,10,8,.86) 0%, rgba(12,10,8,.3) 36%,
                    rgba(12,10,8,.5) 72%, rgba(12,10,8,.92) 100%)}
  .cont{position:absolute;inset:0;z-index:5;padding:var(--b-pad);
    display:flex;flex-direction:column;align-items:center;text-align:center}

  .marca2{display:flex;align-items:center;gap:10px;font-size:var(--b-fmarca);
    font-weight:700;letter-spacing:-.02em;color:#fff}
  .marca2{display:block}
  .marca2 b{font-weight:700}
  .marca2 span{color:#9DBBA4}

  /* El rotulador: cada línea es su propio bloque de color, con los bordes
     ligeramente desalineados. Un rectángulo perfecto detrás del texto se ve
     hecho con plantilla; un subrayado real nunca sale recto. */
  .rot{margin-top:var(--b-gap);display:flex;flex-direction:column;
    align-items:center;gap:var(--b-rgap)}
  .rot span{background:#D9F24B;color:#14120F;font-size:var(--b-frot);
    font-weight:700;letter-spacing:-.035em;line-height:1.04;
    padding:var(--b-rpad);display:inline-block}
  .rot span:nth-child(1){transform:rotate(-.7deg)}
  .rot span:nth-child(2){transform:rotate(.5deg)}
  .rot span:nth-child(3){transform:rotate(-.35deg)}
  .rot span em{font-style:italic;font-weight:700}

  .sub2{margin-top:var(--b-gap);font-size:var(--b-fsub);font-weight:600;
    color:#F2EFE9;letter-spacing:-.01em}

  /* La tablet: marco oscuro, pantalla dentro, sombra larga. Igual que hace
     Last.app con su TPV — la diferencia es que aquí el aparato es el que el
     hostelero YA tiene, y eso es justo lo que dice el titular. */
  .tablet{margin-top:var(--b-gap);width:var(--b-tab);flex:none;
    background:#1A1A1C;padding:var(--b-marco);border-radius:var(--b-radio);
    box-shadow:0 4px 8px rgba(0,0,0,.5), 0 40px 80px rgba(0,0,0,.7);
    transform:rotate(-1deg)}
  .tablet img{display:block;width:100%;border-radius:calc(var(--b-radio)*.45)}

  .precio{margin-top:auto;display:flex;align-items:baseline;gap:14px;
    background:rgba(255,255,255,.96);color:#14120F;padding:var(--b-ppad)}
  .precio b{font-size:var(--b-fprecio);font-weight:700;letter-spacing:-.04em}
  .precio i{font-style:normal;font-size:var(--b-fpsub);font-weight:600;color:#4A5D4E}
`;

const B_HTML = `
<div class="escena">
  <div class="foto"></div><div class="velo"></div>
  <div class="cont">
    <div class="marca2"><b>Gastro<span>Goan</span></b></div>
    <div class="rot">
      <span>Cambia de software</span>
      <span><em>sin comprar</em> ni un</span>
      <span>aparato nuevo.</span>
    </div>
    <div class="sub2">Se abre en el móvil o la tablet que ya tienes.</div>
    <div class="tablet"><img src="var-app"></div>
    <div class="precio"><b>100 €</b><i>al año · todo incluido</i></div>
  </div>
</div>`;

const VARS = (f) => {
  const s = f.nombre === 'story';
  return `
    --a-pad:${s ? 84 : 70}px; --a-fmarca:${s ? 40 : 36}px; --a-punto:${s ? 16 : 14}px;
    --a-fh1:${s ? 120 : 104}px; --a-fclaim:${s ? 42 : 39}px; --a-gap:${s ? 34 : 24}px;
    --a-gap2:${s ? 24 : 18}px; --a-lista:${s ? 640 : 600}px; --a-lgap:${s ? 20 : 17}px;
    --a-lpad:${s ? 21 : 19}px; --a-ficon:${s ? 42 : 37}px; --a-flista:${s ? 32 : 29}px;
    --a-fcta:${s ? 32 : 29}px; --a-ctap:${s ? '26px 42px' : '22px 36px'};
    --a-fpie:${s ? 21 : 19}px;
    --b-pad:${s ? 78 : 64}px; --b-fmarca:${s ? 38 : 34}px; --b-gap:${s ? 40 : 28}px;
    --b-rgap:${s ? 10 : 8}px; --b-frot:${s ? 74 : 66}px; --b-rpad:${s ? '10px 20px' : '8px 17px'};
    --b-fsub:${s ? 34 : 31}px; --b-tab:${s ? 860 : 840}px; --b-marco:${s ? 18 : 16}px;
    --b-radio:${s ? 26 : 24}px; --b-ppad:${s ? '22px 34px' : '18px 30px'};
    --b-fprecio:${s ? 62 : 56}px; --b-fpsub:${s ? 28 : 25}px;`;
};

const RUIDO = `(() => {
  const c=document.createElement('canvas');c.width=c.height=180;
  const x=c.getContext('2d');const d=x.createImageData(180,180);
  for(let i=0;i<d.data.length;i+=4){const v=118+(Math.random()*90-45);
    d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255;}
  x.putImageData(d,0,0);
  document.documentElement.style.setProperty('--ruido','url('+c.toDataURL()+')');
})()`;

const pagina = (css, html, f, appImg) => `<!doctype html><meta charset="utf-8">
  <link rel="stylesheet" href="/css/tabler-icons.min.css">
  <style>${FUENTES}${css}
    .escena{${VARS(f)}
      --foto:url('/deploy/web/public/img/catas-maridajes.jpg');
      --foto2:url('/deploy/web/public/img/chef-privado.jpg');}
  </style>
  ${html.replace('src="var-app"', `src="${appImg}"`)}
  <div class="grano"></div>`;

fs.mkdirSync(SALIDA, {recursive: true});
const browser = await puppeteer.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'],
  headless: true,
});

const appImg = await capturarApp(browser);
const page = await browser.newPage();
const hechos = [];
for(const f of FORMATOS){
  await page.setViewport({width: f.w, height: f.h});
  for(const [id, css, html] of [['A-barcelona', A_CSS, A_HTML], ['B-sinaparatos', B_CSS, B_HTML]]){
    await page.goto(`${BASE}/dist/index.html`, {waitUntil: 'domcontentloaded'});
    await page.setContent(pagina(css, html, f, appImg), {waitUntil: 'networkidle0'});
    await page.evaluate(RUIDO);
    await page.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 400));
    const archivo = `${SALIDA}/${id}-${f.nombre}.png`;
    await page.screenshot({path: archivo});
    hechos.push(archivo);
  }
}
await browser.close();
console.log(hechos.map(h => '✅ ' + h).join('\n'));
