#!/usr/bin/env python3
"""Genera las tres páginas iniciales (es/ca/en) de la web comercial.

Mismo formato de siempre (cabecera con idiomas, franja oscura, tres puertas,
pie) con el diseño de la app: Schibsted Grotesk + IBM Plex Mono, crema/tinta/
oliva, esquinas rectas, grano de papel y luz cálida, y tamaños que se ajustan
solos al ancho. El contenido va en el HTML (se ve y se indexa sin JavaScript).
Uso: python3 tools/web-parche/inicio.py
"""
import html, os, json, sys
sys.path.insert(0, os.path.dirname(__file__))
import legal
LEGAL = {k: ''.join(f'<a href="{legal.PAGS[p][k]}">{legal.NOMBRES[p][k]}</a>' for p in legal.PAGS) for k in ('es', 'ca', 'en')}
from urllib.parse import quote
# Contacto con el mensaje ya escrito (revisión final, 16/11)
MSGI = {'es': 'Hola, me gustaría información sobre GastroGoan.', 'ca': "Hola, m'agradaria informació sobre GastroGoan.", 'en': "Hi, I'd like some information about GastroGoan."}
ASUI = {'es': 'Información sobre GastroGoan', 'ca': 'Informació sobre GastroGoan', 'en': 'Information about GastroGoan'}
RAIZ = os.path.join(os.path.dirname(__file__), '..', '..', 'deploy', 'web', 'public')
BASE = 'https://gastrogoan.com'

FLAGS = {
 'es': '<svg width="16" height="11" viewBox="0 0 3 2" aria-hidden="true"><rect width="3" height="2" fill="#c60b1e"/><rect y=".5" width="3" height="1" fill="#ffc400"/></svg>',
 'ca': '<svg width="16" height="11" viewBox="0 0 9 6" aria-hidden="true"><rect width="9" height="6" fill="#FCDD09"/>' + ''.join(f'<rect y="{y}" width="9" height=".55" fill="#DA121A"/>' for y in (1, 2.33, 3.66, 5)) + '</svg>',
 'en': '<svg width="16" height="11" viewBox="0 0 60 30" aria-hidden="true"><rect width="60" height="30" fill="#012169"/><path d="M0,0L60,30M60,0L0,30" stroke="#fff" stroke-width="6"/><path d="M30,0V30M0,15H60" stroke="#fff" stroke-width="10"/><path d="M30,0V30M0,15H60" stroke="#C8102E" stroke-width="6"/></svg>',
}
FILES = {'es': 'index.html', 'ca': 'ca-inici.html', 'en': 'en-home.html'}
URLS = {'es': BASE + '/', 'ca': BASE + '/ca-inici', 'en': BASE + '/en-home'}

TXT = {
 'es': dict(lang='es', loc='es_ES', title='GastroGoan · Asesoría, app y eventos gastronómicos',
   desc='Asesoramos, gestionamos y creamos experiencias gastronómicas: asesoría 360º para restaurantes, la app de gestión GastroGoan y los eventos de Le Petit Comité.',
   h1='Bienvenido a', sub='Asesoramos, gestionamos y creamos experiencias gastronómicas.', ask='¿Por dónde empezamos?',
   idioma='Idioma', ir='Ir a', kit='Asesoría · App · Eventos',
   rows=[('asesoria.html','01','Asesoría','Para restaurantes, bares y cafeterías que necesitan un cambio real'),
         ('app.html','02','App','La app que usan los restaurantes que de verdad quieren ganar dinero'),
         ('eventos.html','03','Le Petit Comité','Eventos gastronómicos que no te dejarán indiferente')],
   wa='WhatsApp', noscript=''),
 'ca': dict(lang='ca', loc='ca_ES', title='GastroGoan · Assessoria, app i esdeveniments gastronòmics',
   desc='Assessorem, gestionem i creem experiències gastronòmiques: assessoria 360º per a restaurants, l’app de gestió GastroGoan i els esdeveniments de Le Petit Comité.',
   h1='Benvingut a', sub='Assessorem, gestionem i creem experiències gastronòmiques.', ask='Per on comencem?',
   idioma='Idioma', ir='Anar a', kit='Assessoria · App · Esdeveniments',
   rows=[('ca-assessoria.html','01','Assessoria','Per a restaurants, bars i cafeteries que necessiten un canvi real'),
         ('ca-app.html','02','App','L’app que fan servir els restaurants que de veritat volen guanyar diners'),
         ('ca-esdeveniments.html','03','Le Petit Comité','Esdeveniments gastronòmics que no et deixaran indiferent')],
   wa='WhatsApp', noscript=''),
 'en': dict(lang='en', loc='en_GB', title='GastroGoan · Advisory, app and gastronomic events',
   desc='We advise, manage and create gastronomic experiences: 360º advisory for restaurants, the GastroGoan management app and Le Petit Comité events.',
   h1='Welcome to', sub='We advise, manage and create gastronomic experiences.', ask='Where do we start?',
   idioma='Language', ir='Go to', kit='Advisory · App · Events',
   rows=[('en-advisory.html','01','Advisory','For restaurants, bars and cafés that need real change'),
         ('en-app.html','02','App','The app used by restaurants that truly want to make money'),
         ('en-events.html','03','Le Petit Comité','Gastronomic events that won’t leave you indifferent')],
   wa='WhatsApp', noscript=''),
}

CSS = r'''
@font-face{font-family:"Schibsted Grotesk";font-weight:400;font-display:swap;src:url(fonts/schibsted-grotesk-400-normal.woff2) format("woff2")}
@font-face{font-family:"Schibsted Grotesk";font-weight:600;font-display:swap;src:url(fonts/schibsted-grotesk-600-normal.woff2) format("woff2")}
@font-face{font-family:"IBM Plex Mono";font-weight:400;font-display:swap;src:url(fonts/ibm-plex-mono-400-normal.woff2) format("woff2")}
:root{--crema:#FAF8F4;--tinta:#1C1A17;--oliva:#4A5D4E;--oliva-claro:#7C9480;--linea:#E7E2D9;--muted:#716C65;--cuerpo:#3D3A34;--blanco:#fff;
  --sans:"Schibsted Grotesk",system-ui,-apple-system,"Segoe UI",sans-serif;--mono:"IBM Plex Mono",ui-monospace,Menlo,monospace;
  --lado:clamp(20px,5vw,64px);--ease:cubic-bezier(.22,1,.36,1)}
*{box-sizing:border-box}
html{background:var(--crema);-webkit-text-size-adjust:100%}
body{margin:0;min-height:100vh;display:flex;flex-direction:column;background:var(--crema);color:var(--tinta);font-family:var(--sans);font-size:clamp(15px,.9rem + .2vw,17px);line-height:1.5;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
:focus-visible{outline:2px solid var(--oliva);outline-offset:3px}
::selection{background:var(--tinta);color:var(--crema)}
.logo{font-size:clamp(19px,1.1rem + .4vw,22px);letter-spacing:-.03em;font-weight:400;white-space:nowrap}
.logo b{font-weight:600}.logo i{font-style:normal;color:var(--oliva)}
a.logo{display:inline-flex;align-items:center;min-height:44px}
/* cabecera */
.cab{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:clamp(14px,2.2vw,22px) var(--lado);border-bottom:1px solid var(--linea)}
.idiomas{display:flex;align-items:center;gap:4px;font-family:var(--mono);font-size:12px;letter-spacing:.08em}
.idiomas a,.idiomas span{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 8px;color:var(--muted);transition:color .25s}
.idiomas a:hover{color:var(--oliva)}
.idiomas [aria-current]{color:var(--tinta)}
.idiomas svg{border-radius:1px;flex:none}
/* Franja oscura = la pantalla de entrada de la app, con sus mismos efectos (css/styles.css,
   «Fondo de entrada» y «Movimiento de la entrada»): luz cálida de lámpara sobre el pase y grano
   finísimo de papel (--entry-bg), la lámpara que respira, las gg en su caja blanca flotando, el
   logotipo con sus pesos, la etiqueta mono en verde y la frase con su raya, que llega la última. */
.hero{position:relative;overflow:hidden;color:#F1EFE9;text-align:center;padding:clamp(26px,3.6vw,46px) var(--lado);
  background:radial-gradient(ellipse 46% 52% at 50% -8%,rgba(241,232,210,.13),rgba(241,232,210,.04) 45%,transparent 72%),url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .07 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E") 0 0/220px 220px,linear-gradient(180deg,#1C1A17,#24221D)}
.hero::before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 55% 60% at 50% 0%,rgba(255,224,170,.09),transparent 70%)}
.hero>*{position:relative}
h1{margin:0;white-space:nowrap;font-size:clamp(1.3rem,6.3vw,3.4rem);line-height:1;font-weight:600;letter-spacing:-.03em;color:#fff}
h1 b{font-weight:600}h1 i{font-style:normal;color:#8FA593}
.sub{display:flex;flex-direction:column;align-items:center;gap:10px;margin:clamp(16px,2.2vw,24px) auto 0;max-width:34em;font-size:clamp(1rem,.92rem + .4vw,1.2rem);line-height:1.5;color:#F1EFE9;text-wrap:balance}
.sub::before{content:"";width:28px;height:2px;background:#6F8A74}
/* puertas */
main{flex:1}
.pregunta{display:flex;justify-content:center;padding:clamp(14px,2vw,22px) var(--lado)}
.pregunta h2{margin:0;font:400 12px/1 var(--mono);letter-spacing:.16em;text-transform:uppercase;color:var(--crema);background:var(--oliva);padding:8px 12px;border-radius:3px}
.puertas{border-top:1px solid var(--linea)}
.puerta{position:relative;display:grid;grid-template-columns:auto 1fr auto;align-items:baseline;column-gap:clamp(12px,2vw,24px);row-gap:6px;padding:clamp(20px,3vw,34px) var(--lado);border-bottom:1px solid var(--linea);transition:background .3s ease}
.puerta::before{content:"";position:absolute;left:0;top:0;bottom:0;width:0;background:var(--oliva);transition:width .38s var(--ease)}
.puerta:hover,.puerta:focus-visible{background:var(--blanco)}
.puerta:hover::before,.puerta:focus-visible::before{width:5px}
/* el mono en mayúsculas ES parte de la tipografía de GastroGoan: también en las descripciones */
.puerta .n{font:400 12px/1 var(--mono);letter-spacing:.1em;color:var(--muted);transition:color .25s}
.puerta h3{margin:0;font-size:clamp(1.6rem,1.05rem + 2vw,2.5rem);line-height:1.1;font-weight:600;letter-spacing:-.035em;justify-self:start;padding-bottom:3px;background:linear-gradient(var(--oliva),var(--oliva)) 0 100%/0 2px no-repeat;transition:background-size .45s var(--ease)}
.puerta p{grid-column:2;margin:0;font:400 12px/1.6 var(--mono);letter-spacing:.06em;text-transform:uppercase;color:#3D3A34}
.puerta .fl{grid-column:3;grid-row:1;font-size:clamp(1.3rem,1rem + 1vw,1.8rem);color:var(--muted);transition:transform .38s var(--ease),color .25s}
.puerta:hover h3,.puerta:focus-visible h3{background-size:100% 2px}
.puerta:hover .fl,.puerta:focus-visible .fl{transform:translateX(9px);color:var(--oliva)}
.puerta:hover .n,.puerta:focus-visible .n{color:var(--oliva)}
/* En pantalla ancha la frase va a la derecha del título: se acaba el hueco vacío de la fila */
@media (min-width:1100px){
  /* Las tres filas comparten columnas (subgrid): la columna del título mide lo que el título más
     largo y la descripción usa todo lo demás, así cabe en una línea siempre que se pueda. */
  .puerta{grid-template-columns:auto minmax(0,1fr) minmax(0,1.15fr) auto;align-items:center}
  .puerta p{grid-column:3;grid-row:1;justify-self:start}
  .puerta .fl{grid-column:4}
  @supports (grid-template-columns:subgrid){
    .puertas{display:grid;grid-template-columns:auto max-content minmax(0,1fr) auto}
    .puerta{grid-column:1/-1;grid-template-columns:subgrid}
  }
}
/* pie */
.pie{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:6px 24px;background:var(--tinta);color:#B7AFA0;padding:clamp(16px,2.4vw,26px) var(--lado) calc(clamp(16px,2.4vw,26px) + env(safe-area-inset-bottom,0px));font:400 12px/1.4 var(--mono);letter-spacing:.04em}
/* Tablet y móvil: la barra del sistema (p. ej. la de tareas de Samsung) puede tapar el final de la página.
   Aire bajo el pie para que siempre se pueda subir y leer entero (lo vio el dueño, 16/11). */
@media (pointer:coarse){.pie{padding-bottom:calc(clamp(16px,2.4vw,26px) + env(safe-area-inset-bottom,0px) + 20px)}}
.pie .logo{color:var(--crema)}.pie .logo i{color:var(--oliva-claro)}
.pie nav{display:flex;flex-wrap:wrap;gap:0 18px}
.pie nav a{display:inline-flex;align-items:center;min-height:44px;transition:color .25s}
.pie nav a:hover{color:var(--crema)}
.pie .legal{flex-basis:100%;gap:0 18px;white-space:nowrap;border-top:1px solid rgba(250,248,244,.1);font-size:11px}
@media (max-width:560px){
  .puerta{grid-template-columns:auto 1fr}
  .puerta .fl{grid-column:2;grid-row:auto;justify-self:end;margin-top:-2.2em}
  .pie{flex-direction:column;align-items:flex-start}
}
/* movimiento: solo si la persona no ha pedido reducirlo */
@media (prefers-reduced-motion:no-preference){
  @keyframes gg-rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
  @keyframes gg-flotar{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
  @keyframes gg-lampara{0%,100%{opacity:.55}50%{opacity:1}}
  .hero::before{animation:gg-lampara 8s ease-in-out infinite}
  .hero h1{animation:gg-rise .55s .12s cubic-bezier(.2,.7,.2,1) backwards}
  .sub{animation:gg-rise .7s .3s cubic-bezier(.2,.7,.2,1) backwards}
  .pregunta{animation:gg-rise .6s .6s cubic-bezier(.2,.7,.2,1) backwards}
  .puerta{animation:gg-rise .5s cubic-bezier(.2,.7,.2,1) backwards}
  .puerta:nth-child(1){animation-delay:.68s}.puerta:nth-child(2){animation-delay:.74s}.puerta:nth-child(3){animation-delay:.8s}
}
'''

def pagina(l):
    t = TXT[l]; e = html.escape
    alt = ''.join(f'<link rel="alternate" hreflang="{k}" href="{URLS[k]}">' for k in ('es', 'ca', 'en')) + f'<link rel="alternate" hreflang="x-default" href="{URLS["es"]}">'
    idi = ''.join(
        (f'<span aria-current="true">{FLAGS[k]}{k.upper()}</span>' if k == l else
         f'<a href="{FILES[k]}" hreflang="{k}" lang="{k}" aria-label="{e({"es":"Español","ca":"Català","en":"English"}[k])}">{FLAGS[k]}{k.upper()}</a>')
        for k in ('es', 'ca', 'en'))
    filas = ''.join(
        f'<a class="puerta" href="{h}"><span class="n">{n}</span><h3>{e(ti)}</h3><span class="fl" aria-hidden="true">→</span><p>{e(d)}</p></a>'
        for h, n, ti, d in t['rows'])
    return f'''<!DOCTYPE html>
<html lang="{t['lang']}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(t['title'])}</title>
<meta name="description" content="{e(t['desc'])}">
<meta name="theme-color" content="#1C1A17">
<link rel="canonical" href="{URLS[l]}">
{alt}
<link rel="icon" type="image/png" href="favicon.png">
<meta property="og:type" content="website"><meta property="og:site_name" content="GastroGoan">
<meta property="og:title" content="{e(t['title'])}"><meta property="og:description" content="{e(t['desc'])}">
<meta property="og:url" content="{URLS[l]}"><meta property="og:locale" content="{t['loc']}">
<meta property="og:image" content="{BASE}/img/og-gastrogoan.jpg"><meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{json.dumps({"@context":"https://schema.org","@type":"Organization","name":"GastroGoan","url":BASE+"/","logo":BASE+"/favicon.png","telephone":"+34622390245","sameAs":["https://instagram.com/gastrogoan"],"founder":{"@type":"Person","name":"Marcos González"}}, ensure_ascii=False)}</script>
<style>{CSS}{legal.INFO_CSS}</style>
</head>
<body>
<header class="cab">
  <a class="logo" href="{FILES[l]}" aria-label="GastroGoan">gastro<b>goan</b><i>.</i></a>
  <nav class="idiomas" aria-label="{t['idioma']}">{idi}</nav>
</header>
<section class="hero">
  <h1>{e(t['h1'])} GastroGoan<i>.</i></h1>
  <p class="sub">{e(t['sub'])}</p>
</section>
<main>
  <div class="pregunta"><h2>{e(t['ask'])}</h2></div>
  <div class="puertas">{filas}</div>
</main>
<footer class="pie">
  <span class="gg-logo-info"><span class="logo">gastro<b>goan</b><i>.</i></span>{legal.info_html(l)}</span>
  <nav aria-label="Contacto"><a href="https://wa.me/34622390245?text={quote(MSGI[l])}" target="_blank" rel="noopener">{t['wa']} · +34 622 390 245</a><a href="mailto:gastrogoan@gmail.com?subject={quote(ASUI[l])}&amp;body={quote(MSGI[l])}">gastrogoan@gmail.com</a><a href="https://ig.me/m/gastrogoan" target="_blank" rel="noopener">@gastrogoan</a></nav>
</footer>
{legal.INFO_JS}
</body>
</html>
'''

for l in ('es', 'ca', 'en'):
    open(os.path.join(RAIZ, FILES[l]), 'w', encoding='utf-8').write(pagina(l))
    print('OK', FILES[l])
