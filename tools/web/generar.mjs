// Genera la web comercial (deploy/web/public) en es / ca / en desde tools/web/contenido.mjs y web.css/web.js.
// Uso:  node tools/web/generar.mjs
// ⚠️ NO editar a mano los .html de deploy/web/public que salen de aquí: se regeneran. Se edita el contenido, el CSS o esta plantilla.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {C, RUTAS, STRIPE, WA, MAIL, IG, MAIL_PC, IG_PC, BASE, wa} from './contenido.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(AQUI, '../../deploy/web/public');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const CALENDARIO = 'https://calendar.app.google/QShhWZbiJg97SntA6';

const IC = {
  flecha: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
  offline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h.01M8.5 16.43a5 5 0 0 1 7 0M5 12.86a10 10 0 0 1 5.17-2.69M19 12.86a10 10 0 0 0-2-1.52M2 8.82a15 15 0 0 1 4.18-2.64M22 8.82a15 15 0 0 0-11.29-3.76M2 2l20 20"/></svg>',
  nube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>',
  equipo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  actualiza: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16M8 16H3v5"/></svg>',
};

const LANGS = ['es', 'ca', 'en'];
const hreflang = {es: 'es', ca: 'ca', en: 'en'};

function head(t, page, key) {
  const alt = LANGS.map(l => `<link rel="alternate" hreflang="${hreflang[l]}" href="${BASE}${RUTAS[l][key]}">`).join('\n');
  const canon = BASE + RUTAS[t.lang][key];
  return `<!DOCTYPE html>
<html lang="${t.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.desc)}">
<meta name="theme-color" content="#FAF8F4">
<link rel="canonical" href="${canon}">
${alt}
<link rel="alternate" hreflang="x-default" href="${BASE}${RUTAS.es[key]}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="GastroGoan">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.desc)}">
<meta property="og:url" content="${canon}">
<meta property="og:locale" content="${t.ogLocale}">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="preload" href="fonts/schibsted-grotesk-600-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="fonts/schibsted-grotesk-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="web.css">
<script src="web.js" defer></script>
</head>`;
}

function cab(t, key, actual) {
  const idiomas = LANGS.map(l => `<a href="${RUTAS[l][key]}" hreflang="${l}" lang="${l}"${l === t.lang ? ' aria-current="true"' : ''} aria-label="${{es: 'Castellano', ca: 'Català', en: 'English'}[l]}">${l.toUpperCase()}</a>`).join('');
  const link = (k, txt) => `<a href="${RUTAS[t.lang][k]}"${actual === k ? ' aria-current="page"' : ''}>${esc(txt)}</a>`;
  return `<body>
<a class="saltar" href="#contenido">${esc(t.skip)}</a>
<header class="cab"><div class="wrap">
  <a class="marca" href="${RUTAS[t.lang].home}" aria-label="GastroGoan"><span>gastro</span><b>goan</b><i>.</i></a>
  <nav class="nav" aria-label="Principal">${link('asesoria', t.nav.asesoria)}${link('app', t.nav.app)}${link('eventos', t.nav.eventos)}</nav>
  <div class="cab-der"><div class="idiomas" role="group" aria-label="${esc(t.idioma)}">${idiomas}</div><a class="btn btn-primario btn-peq" href="${STRIPE}" rel="noopener">${esc(t.comprar)}</a></div>
</div></header>
<main id="contenido">`;
}

function pie(t, opts = {}) {
  const r = RUTAS[t.lang];
  const mail = opts.mail || MAIL, ig = opts.ig || IG;
  return `</main>
<footer class="pie"><div class="wrap">
  <div class="pie-g">
    <div><a class="marca" href="${r.home}" aria-label="GastroGoan"><span>gastro</span><b>goan</b><i>.</i></a><p class="lema">${esc(t.pie.lema)}</p></div>
    <div><h4>${esc(t.pie.secciones)}</h4><ul><li><a href="${r.home}">${esc(t.pie.home)}</a></li><li><a href="${r.asesoria}">${esc(t.nav.asesoria)}</a></li><li><a href="${r.app}">${esc(t.nav.app)}</a></li><li><a href="${r.eventos}">${esc(t.nav.eventos)}</a></li></ul></div>
    <div><h4>${esc(t.pie.contacto)}</h4><ul><li><a href="${WA}" rel="noopener">WhatsApp · +34 622 390 245</a></li><li><a href="mailto:${mail}">${esc(mail)}</a></li><li><a href="${ig}" rel="noopener">${esc('@' + ig.split('/').pop())}</a></li></ul></div>
  </div>
  <div class="pie-fin"><span>© 2026 ${esc(t.pie.fin)}</span><span>${esc(t.pie.lema)}</span></div>
</div></footer>
</body>
</html>
`;
}

const rv = (i = 0) => ` class="rv" style="--d:${(i * 0.08).toFixed(2)}s"`;
const btn = (href, txt, cls = '', extra = '') => `<a class="btn ${cls}" href="${href}"${extra}>${esc(txt)} ${IC.flecha}</a>`;
const ext = ' rel="noopener"';

function secCab(eyebrow, h2, lead) {
  return `<div class="sec-cab rv"><p class="eyebrow">${esc(eyebrow)}</p><h2>${esc(h2)}</h2>${lead ? `<p class="lead">${esc(lead)}</p>` : ''}</div>`;
}

/* ───────────────────────── PORTADA ───────────────────────── */
function home(t) {
  const h = t.home, r = RUTAS[t.lang];
  return head(t, h, 'home') + cab(t, 'home', null) + `
<section class="ink hero"><div class="wrap hero-g">
  <div>
    <p class="eyebrow">${esc(h.eyebrow)}</p>
    <h1>${esc(h.h1)}<span class="punto">.</span></h1>
    <p class="lead">${esc(h.lead)}</p>
    <div class="ctas">${btn(r.app, h.cta1, 'btn-claro brillo')}${btn(WA, h.cta2, 'btn-linea', ext)}</div>
  </div>
  <div class="escaparate rv" style="--d:.15s"><div class="ventana"><img src="img/hero-panel.webp" width="1462" height="952" alt="GastroGoan" fetchpriority="high"></div><div class="movil" aria-hidden="true"><img src="img/app-tpv-m.webp" width="780" height="1520" alt=""></div></div>
</div></section>
<section class="sec" style="padding-top:clamp(40px,5vw,64px);padding-bottom:0"><div class="wrap">
  <div class="kpis rv" style="--n:3">${h.kpis.map(k => `<div class="kpi"><div class="k">${esc(k.k)}</div><div class="v">${esc(k.v)}</div><div class="d">${esc(k.d)}</div></div>`).join('')}</div>
</div></section>
<section class="sec"><div class="wrap">
  ${secCab(h.cab.eyebrow, h.cab.h2)}
  <div class="caminos">${h.caminos.map((c, i) => `<a class="camino rv" style="--d:${(i * 0.08).toFixed(2)}s" href="${r[c.k]}"><span class="num">${c.n}</span><div><h2>${esc(c.h)}</h2><p>${esc(c.p)}</p></div><span class="flecha">${IC.flecha}</span></a>`).join('')}</div>
</div></section>
<section class="sec cream cierre"><div class="wrap rv">
  <h2>${esc(h.cierre.h2)}</h2><p class="lead">${esc(h.cierre.p)}</p>
  <div class="ctas">${btn(wa(t.wasaludo), h.cierre.cta, 'btn-primario', ext)}</div>
</div></section>
<script type="application/ld+json">${JSON.stringify({'@context': 'https://schema.org', '@type': 'Organization', name: 'GastroGoan', url: BASE, email: MAIL, telephone: '+34622390245', sameAs: [IG]})}</script>
` + pie(t);
}

/* ───────────────────────── APP ───────────────────────── */
function app(t) {
  const a = t.app, r = RUTAS[t.lang];
  const heroImg = `<div class="escaparate rv"><div class="ventana"><img src="img/hero-tpv.webp" width="1462" height="952" alt="${esc(a.escaparate.tabs[0].label)} · GastroGoan" fetchpriority="high"></div><div class="movil" aria-hidden="true"><img src="img/app-tpv-m.webp" width="780" height="1520" alt=""></div></div>`;
  const tabs = a.escaparate.tabs;
  const paneles = tabs.map((x, i) => `<div class="panel-esc" id="esc-${x.id}" role="tabpanel" aria-labelledby="tab-${x.id}"><div class="escaparate"><div class="ventana"><img src="img/app-${x.id}-d.webp" width="1870" height="1030" alt="${esc(x.label)} · GastroGoan" loading="${i === 0 ? 'eager' : 'lazy'}"></div><div class="movil" aria-hidden="true"><img src="img/app-${x.id}-m.webp" width="780" height="1520" alt="" loading="lazy"></div></div><div class="pie-esc"><p>${esc(x.cap)}</p></div></div>`).join('');
  const p = a.problema;
  return head(t, a, 'app') + cab(t, 'app', 'app') + `
<section class="ink hero"><div class="wrap hero-g">
  <div>
    <p class="eyebrow">${esc(a.eyebrow)}</p>
    <h1>${esc(a.h1)}<span class="punto">.</span></h1>
    <p class="lead">${esc(a.lead)}</p>
    <div class="ctas">${btn(STRIPE, a.comprar, 'btn-claro brillo', ext)}${btn('#incluye', a.ver, 'btn-linea')}</div>
    <p class="nota" style="color:var(--on-ink-mut);margin-top:22px;font-family:var(--mono);font-size:13px;letter-spacing:.02em">${esc(a.mini)}</p>
  </div>
  ${heroImg}
</div></section>

<section class="sec" id="app-dentro"><div class="wrap">
  ${secCab(a.escaparate.eyebrow, a.escaparate.h2, a.escaparate.lead)}
  <div data-tabs>
    <div class="pestanas" role="tablist" aria-label="${esc(a.escaparate.h2)}">${tabs.map(x => `<button type="button" role="tab" id="tab-${x.id}" aria-controls="esc-${x.id}" aria-selected="false">${esc(x.label)}</button>`).join('')}</div>
    ${paneles}
  </div>
</div></section>

<section class="sec cream"><div class="wrap">
  <div class="split">
    <div class="rv"><p class="eyebrow">${esc(p.eyebrow)}</p><h2>${esc(p.h2)}</h2><p class="lead" style="margin-top:20px">${esc(p.lead)}</p><p class="nota">${esc(p.nota)}</p></div>
    <div class="cuenta rv" style="--d:.1s">${p.filas.map(f => `<div class="cuenta-fila"><span>${esc(f[0])}</span><span class="imp">${esc(f[1])}</span></div>`).join('')}<div class="cuenta-total"><b>${esc(p.total[0])}</b><span>${esc(p.total[1])}</span></div></div>
  </div>
  <div class="vs">${p.vs.map((v, i) => `<div class="tarj${v.bueno ? ' bueno' : ''} rv" style="--d:${(i * 0.1).toFixed(2)}s"><span class="eyebrow" style="margin:0;${v.bueno ? 'color:#fff;opacity:.85' : ''}">${esc(v.k)}</span><div class="gran">${esc(v.gran)}</div><p>${esc(v.p)}</p></div>`).join('')}</div>
  <p class="mono rv" style="margin-top:22px;font-size:14px;letter-spacing:.04em;color:var(--olive)">${esc(p.ahorro)}</p>
</div></section>

<section class="sec" id="incluye"><div class="wrap">
  ${secCab(a.incluye.eyebrow, a.incluye.h2, a.incluye.lead)}
  <div class="zonas rv">${a.incluye.zonas.map(z => `<div class="zona"><h3>${esc(z.t)}</h3><ul>${z.items.map(i => `<li><strong>${esc(i[0])}</strong><span>${esc(i[1])}</span></li>`).join('')}</ul></div>`).join('')}</div>
</div></section>

<section class="sec surf linea-t"><div class="wrap">
  ${secCab(a.pasos.eyebrow, a.pasos.h2)}
  <div class="pasos">${a.pasos.items.map((s, i) => `<div class="paso rv" style="--d:${(i * 0.1).toFixed(2)}s"><span class="n">${String(i + 1).padStart(2, '0')}</span><h3>${esc(s.t)}</h3><p>${esc(s.p)}</p></div>`).join('')}</div>
</div></section>

<section class="sec"><div class="wrap">
  ${secCab(a.garantias.eyebrow, a.garantias.h2)}
  <div class="garan">${a.garantias.items.map((g, i) => `<div class="garan-i rv" style="--d:${(i * 0.07).toFixed(2)}s"><div class="ic">${IC[g.icon]}</div><div><h3>${esc(g.t)}</h3><p>${esc(g.p)}</p></div></div>`).join('')}</div>
</div></section>

<section class="sec ink" id="precio"><div class="wrap precio">
  <div class="rv"><p class="eyebrow">${esc(a.precio.eyebrow)}</p><h2>${esc(a.precio.h2)}</h2><p class="lead" style="margin-top:20px">${esc(a.precio.p)}</p>
    <ul class="incluye">${a.precio.incluye.map(i => `<li>${IC.check}<span>${esc(i)}</span></li>`).join('')}</ul></div>
  <div class="precio-caja rv" style="--d:.1s"><div class="rot">${esc(a.precio.rot)}</div>
    <div class="cifra">${esc(a.precio.cifra)}<small>${esc(a.precio.peque)}</small></div><p class="sub">${esc(a.precio.sub)}</p>
    <div class="precio-lin">${a.precio.lin.map(l => `<div><span>${esc(l[0])}</span><span>${esc(l[1])}</span></div>`).join('')}</div>
    <a class="btn btn-claro brillo" href="${STRIPE}" rel="noopener">${esc(a.precio.cta)} ${IC.flecha}</a>
    <p class="peq">${esc(a.precio.peq)}</p></div>
</div></section>

<section class="sec"><div class="wrap faq-g">
  <div class="faq-lado rv"><p class="eyebrow">${esc(a.faq.eyebrow)}</p><h2>${esc(a.faq.h2)}</h2><p class="lead" style="margin-top:20px;font-size:18px">${esc(a.faq.mas)}</p><div class="ctas" style="margin-top:22px">${btn(wa(t.wasaludo), a.faq.masCta, '', ext)}</div></div>
  <div class="faq rv" style="--d:.08s">${a.faq.items.map(q => `<details><summary>${esc(q[0])}</summary><div class="resp"><p>${esc(q[1])}</p></div></details>`).join('')}</div>
</div></section>

<section class="sec cream cierre"><div class="wrap rv">
  <h2>${esc(a.cierre.h2)}</h2><p class="lead">${esc(a.cierre.p)}</p>
  <div class="ctas">${btn(STRIPE, a.cierre.cta, 'btn-primario brillo', ext)}${btn(wa(t.wasaludo), a.cierre.cta2, '', ext)}</div>
</div></section>
<div class="barra-compra" id="barra-compra" aria-hidden="true"><div class="t">${esc(a.precio.cifra)} ${esc(a.precio.peque)}<small>${esc(a.precio.rot)}</small></div><a class="btn btn-primario" href="${STRIPE}" rel="noopener" tabindex="-1">${esc(t.comprar)}</a></div>
<script type="application/ld+json">${JSON.stringify({'@context': 'https://schema.org', '@type': 'Product', name: 'GastroGoan App', description: a.desc, brand: {'@type': 'Brand', name: 'GastroGoan'}, offers: {'@type': 'Offer', priceCurrency: 'EUR', price: '300', url: STRIPE, availability: 'https://schema.org/InStock'}})}</script>
` + pie(t);
}

/* ───────────────────────── ASESORÍA ───────────────────────── */
function asesoria(t) {
  const a = t.asesoria;
  return head(t, a, 'asesoria') + cab(t, 'asesoria', 'asesoria') + `
<section class="ink hero hero-mini"><div class="wrap">
  <p class="eyebrow">${esc(a.eyebrow)}</p>
  <h1>${esc(a.h1)}</h1>
  <p class="lead">${esc(a.lead)}</p>
  <div class="ctas">${btn(wa(t.wasaludo), a.cta, 'btn-claro brillo', ext)}${btn('#ruta', a.cta2, 'btn-linea')}</div>
</div></section>

<section class="sec"><div class="wrap">
  <div class="retrato">
    <img class="rv" src="img/marcos-retrato.webp" width="431" height="580" alt="Marcos González" loading="lazy">
    <div class="rv" style="--d:.1s"><p class="eyebrow">${esc(a.sobre.eyebrow)}</p><blockquote>${esc(a.sobre.q)}</blockquote><p class="lead" style="margin-top:26px;font-size:18px">${esc(a.sobre.p)}</p><p class="firma">${esc(a.sobre.firma)}</p></div>
  </div>
</div></section>

<section class="sec cream" id="ruta"><div class="wrap">
  ${secCab(a.ruta.eyebrow, a.ruta.h2, a.ruta.lead)}
  <div class="areas rv" style="margin-bottom:28px">${a.ruta.areas.map((x, i) => `<span><i>${String(i + 1).padStart(2, '0')}</i>${esc(x)}</span>`).join('')}</div>
  <div class="fases rv">${a.ruta.fases.map(f => `<div class="fase"><span class="f">${esc(f[0])}</span><h3>${esc(f[1])}</h3><p>${esc(f[2])}</p></div>`).join('')}</div>
  <div class="rv aperturas"><img src="img/apertura-locales.jpg" alt="" width="800" height="445" loading="lazy"><p>${esc(a.ruta.aperturas)}</p>${btn(wa('Hola Marcos, quiero información sobre el programa de aperturas'), a.ruta.aperturasCta, 'btn-peq', ext)}</div>
</div></section>

<section class="sec"><div class="wrap">
  ${secCab(a.extras.eyebrow, a.extras.h2)}
  <div class="rej rej-4">${a.extras.items.map((x, i) => `<div class="tarj extra rv" style="--d:${((i % 4) * 0.07).toFixed(2)}s"><div><span class="n">${String(i + 1).padStart(2, '0')}</span><h3>${esc(x[0])}</h3><p>${esc(x[1])}</p></div><a class="enlace" href="${wa('Hola Marcos, me interesa: ' + x[0])}" rel="noopener">${esc(a.extras.cta)} →</a></div>`).join('')}</div>
</div></section>

<section class="sec surf linea-t"><div class="wrap split">
  <div class="rv"><p class="eyebrow">${esc(a.dif.eyebrow)}</p><h2>${esc(a.dif.h2)}</h2></div>
  <ul class="lista-dif rv" style="--d:.1s;grid-template-columns:1fr">${a.dif.items.map(i => `<li>${IC.check}<span>${esc(i)}</span></li>`).join('')}</ul>
</div></section>

<section class="sec cream cierre"><div class="wrap rv">
  <h2>${esc(a.cierre.h2)}</h2><p class="lead">${esc(a.cierre.p)}</p>
  <div class="ctas">${btn(wa(t.wasaludo), a.cierre.cta, 'btn-primario brillo', ext)}<a class="btn" href="mailto:${MAIL}">${esc(MAIL)}</a></div>
</div></section>
` + pie(t);
}

/* ───────────────────────── EVENTOS ───────────────────────── */
function eventos(t) {
  const e = t.eventos, r = RUTAS[t.lang];
  const wapc = txt => wa(txt);
  return head(t, e, 'eventos') + cab(t, 'eventos', 'eventos') + `
<section class="ink hero hero-mini"><div class="wrap">
  <p class="eyebrow">${esc(e.eyebrow)}</p>
  <h1>${esc(e.h1)}</h1>
  <p class="lead">${esc(e.lead)}</p>
  <div class="ctas">${btn(wapc(t.wasaludo), e.cta, 'btn-claro brillo', ext)}</div>
</div></section>

<section class="sec"><div class="wrap">
  ${secCab(e.serv.eyebrow, e.serv.h2)}
  <div class="rej">${e.serv.items.map((s, i) => `<div class="tarj rv" style="--d:${(i * 0.08).toFixed(2)}s"><span class="n">${esc(s[0])}</span><h3>${esc(s[1])}</h3><p>${esc(s[2])}</p></div>`).join('')}</div>
</div></section>

<section class="sec" style="padding-top:0"><div class="wrap">
  <div class="fotos rv"><img src="img/chef-privado.jpg" alt="" width="1024" height="683" loading="lazy"><img src="img/catas-maridajes.jpg" alt="" width="1200" height="628" loading="lazy"></div>
</div></section>

<section class="sec surf linea-t"><div class="wrap">
  ${secCab(e.como.eyebrow, e.como.h2)}
  <div class="pasos">${e.como.items.map((s, i) => `<div class="paso rv" style="--d:${(i * 0.1).toFixed(2)}s"><span class="n">${String(i + 1).padStart(2, '0')}</span><h3>${esc(s.t)}</h3><p>${esc(s.p)}</p></div>`).join('')}</div>
  <div class="datos rv" style="margin-top:clamp(40px,5vw,64px)">${e.datos.map(d => `<div><div class="k">${esc(d.k)}</div><div class="v">${esc(d.v)}</div><div class="d">${esc(d.d)}</div></div>`).join('')}</div>
</div></section>

<section class="sec cream"><div class="wrap">
  ${secCab(e.menus.eyebrow, e.menus.h2)}
  <div class="menus" data-tabs>
    <div class="pestanas" role="tablist" aria-label="${esc(e.menus.h2)}">${e.menus.lista.map((m, i) => `<button type="button" role="tab" id="mt-${i}" aria-controls="mp-${i}" aria-selected="false">${esc(m.tab)} <i>${String(i + 1).padStart(2, '0')}</i></button>`).join('')}</div>
    <div>${e.menus.lista.map((m, i) => `<div class="carta panel-esc" id="mp-${i}" role="tabpanel" aria-labelledby="mt-${i}"><div class="tit"><p class="eyebrow">${esc(m.k)}</p><h3>${esc(m.t)}</h3></div><dl>${m.filas.map(f => `<div><dt>${esc(f[0])}</dt><dd>${esc(f[1])}</dd></div>`).join('')}</dl><p class="cierre-c">${esc(m.cierre)}</p></div>`).join('')}
    <p class="nota">${esc(e.menus.nota)}</p></div>
  </div>
</div></section>

<section class="sec"><div class="wrap">
  ${secCab(e.oca.eyebrow, e.oca.h2)}
  <div class="ocasiones rv">${e.oca.items.map(o => `<a href="${wapc(e.oca.msg(o))}" rel="noopener">${esc(o)}</a>`).join('')}</div>
  <p class="nota rv" style="font-size:16px;margin-top:22px">${esc(e.oca.otra)}</p>
</div></section>

<section class="sec cream cierre"><div class="wrap rv">
  <h2>${esc(e.cierre.h2)}</h2><p class="lead">${esc(e.cierre.p)}</p>
  <div class="ctas">${btn(wapc(t.wasaludo), e.cierre.cta, 'btn-primario brillo', ext)}<a class="btn" href="mailto:${MAIL_PC}">${esc(MAIL_PC)}</a></div>
</div></section>
` + pie(t, {mail: MAIL_PC, ig: IG_PC});
}

/* ───────────────────────── GRACIAS (tras pagar) ───────────────────────── */
function gracias() {
  const t = C.es, g = t.gracias;
  const page = {title: g.title, desc: g.lead};
  let h = head(t, page, 'home').replace(/<link rel="canonical"[^>]*>\n/, '').replace(/<link rel="alternate"[^>]*>\n/g, '').replace(/<meta property="og:url"[^>]*>\n/, '');
  h = h.replace('<meta name="viewport"', '<meta name="robots" content="noindex">\n<meta name="viewport"');
  return h + cab(t, 'home', null).replace(/<nav class="nav"[\s\S]*?<\/nav>/, '<nav class="nav" aria-label="Principal"></nav>').replace(/<div class="idiomas"[\s\S]*?<\/div><a class="btn[^>]*>[^<]*<\/a>/, '') + `
<section class="sec" style="padding-top:clamp(40px,6vw,80px)"><div class="wrap" style="max-width:760px">
  <ol class="gracias-pasos" aria-label="Progreso">${g.pasos.map((p, i) => `<li class="${i === 0 ? 'hecho' : i === 1 ? 'ahora' : ''}"><span class="n">${esc(p[0])}</span>${esc(p[1])}</li>`).join('')}</ol>
  <h1 style="font-size:clamp(32px,6vw,52px);margin-bottom:16px">${esc(g.h1)}</h1>
  <p class="lead" style="margin-bottom:30px">${esc(g.lead)}</p>
  <div class="reserva-caja"><p class="rot">${esc(g.rot)}</p><h2>${esc(g.caja)}</h2><p>${esc(g.cajaP)}</p><a class="btn btn-claro brillo" href="${CALENDARIO}" target="_blank" rel="noopener">${esc(g.cta)} ${IC.flecha}</a><p class="nota" style="margin-top:14px">${esc(g.nota)}</p></div>
  <div style="margin-top:40px;display:grid;gap:30px">
    <div><h3 class="h-mono">${esc(g.hacemos)}</h3><ul class="mini-lista">${g.hacemosL.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div><h3 class="h-mono">${esc(g.mano)}</h3><ul class="mini-lista">${g.manoL.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div><h3 class="h-mono">${esc(g.factura)}</h3><p style="color:var(--muted)">${esc(g.facturaP)}</p></div>
  </div>
  <p class="nota" style="margin-top:36px">${esc(g.pie)}</p>
</div></section>
` + pie(t);
}

/* ───────────────────────── Escribir ───────────────────────── */
const paginas = {home, app, asesoria, eventos};
const hechos = [];
for (const l of LANGS) for (const [k, fn] of Object.entries(paginas)) {
  const f = path.join(OUT, RUTAS[l][k]);
  fs.writeFileSync(f, fn(C[l])); hechos.push(RUTAS[l][k]);
}
fs.writeFileSync(path.join(OUT, 'gracias.html'), gracias()); hechos.push('gracias.html');
// El CSS y el JS se publican tal cual desde su fuente (un solo sitio donde editarlos).
fs.copyFileSync(path.join(AQUI, 'web.css'), path.join(OUT, 'web.css'));
fs.copyFileSync(path.join(AQUI, 'web.js'), path.join(OUT, 'web.js'));
console.log('✅ web generada:', hechos.join(', '));
