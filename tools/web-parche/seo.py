#!/usr/bin/env python3
"""SEO de la web comercial (revisión final, 16/11). Se ejecuta DESPUÉS de los generadores
(asesoria.py, app.py, eventos.py, inicio.py) y es idempotente.

Las páginas interiores son «bundles»: el HTML de fuera solo trae «Bundled Page» y la página de verdad
se monta con JavaScript desde una plantilla. Google ejecuta JavaScript, pero un buscador o una red
social que no lo haga veía una página sin título. Por eso los datos van en LOS DOS sitios:
 - el <head> de fuera (lo que lee quien no ejecuta JavaScript), y
 - el <head> de la plantilla (lo que queda tras el montaje; si no, el título se quedaba vacío).
Cada página lleva: idioma, título, descripción, canónica, alternativas por idioma (hreflang),
Open Graph/Twitter con su imagen y datos estructurados (schema.org).
Además genera robots.txt y sitemap.xml (con las alternativas de idioma de cada página).
Uso: python3 tools/web-parche/seo.py
"""
import re, json, os, html, sys
sys.path.insert(0, os.path.dirname(__file__))
import legal
from urllib.parse import quote
RAIZ = os.path.join(os.path.dirname(__file__), '..', '..', 'deploy', 'web', 'public')
BASE = 'https://gastrogoan.com'
e = lambda x: html.escape(x, quote=True)

GRUPOS = {
 'inicio': {'es': ('index', '/'), 'ca': ('ca-inici', '/ca-inici'), 'en': ('en-home', '/en-home')},
 'asesoria': {'es': ('asesoria', '/asesoria'), 'ca': ('ca-assessoria', '/ca-assessoria'), 'en': ('en-advisory', '/en-advisory')},
 'app': {'es': ('app', '/app'), 'ca': ('ca-app', '/ca-app'), 'en': ('en-app', '/en-app')},
 'eventos': {'es': ('eventos', '/eventos'), 'ca': ('ca-esdeveniments', '/ca-esdeveniments'), 'en': ('en-events', '/en-events')},
}
LOC = {'es': 'es_ES', 'ca': 'ca_ES', 'en': 'en_GB'}
META = {
 'asesoria': {
  'es': ('Asesoría gastronómica 360º para restaurantes | GastroGoan',
         'Consultoría para restaurantes, bares y cafeterías: concepto, carta, escandallos, equipo, sala, captación y números. Método 360º con Marcos González. Primera conversación sin compromiso.'),
  'ca': ('Assessoria gastronòmica 360º per a restaurants | GastroGoan',
         'Consultoria per a restaurants, bars i cafeteries: concepte, carta, escandalls, equip, sala, captació i números. Mètode 360º amb Marcos González. Primera conversa sense compromís.'),
  'en': ('360º restaurant consultancy | GastroGoan',
         'Consultancy for restaurants, bars and cafés: concept, menu, food costing, team, floor, marketing and numbers. The 360º method with Marcos González. First conversation with no commitment.')},
 'app': {
  'es': ('App de gestión para restaurantes: TPV, reservas y cocina | GastroGoan',
         'TPV, reservas online, pedidos, escandallos, stock, APPCC, personal y cuenta de resultados en una sola app para tu restaurante. Sin comisiones por reserva ni por pedido. 240 € + IVA al año.'),
  'ca': ('App de gestió per a restaurants: TPV, reserves i cuina | GastroGoan',
         'TPV, reserves en línia, comandes, escandalls, estoc, APPCC, personal i compte de resultats en una sola app per al teu restaurant. Sense comissions per reserva ni per comanda. 240 € + IVA l’any.'),
  'en': ('Restaurant management app: POS, bookings and kitchen | GastroGoan',
         'POS, online bookings, orders, food costing, stock, HACCP, staff and profit & loss in one app for your restaurant. No fees per booking or order. €240 + VAT per year.')},
 'eventos': {
  'es': ('Le Petit Comité · Eventos gastronómicos, catas y chef privado',
         'Eventos gastronómicos privados, catas y maridajes y chef privado a domicilio en Cataluña, de 2 a 50 personas. Menú a medida y propuesta en 48 horas.'),
  'ca': ('Le Petit Comité · Esdeveniments gastronòmics, tasts i xef privat',
         'Esdeveniments gastronòmics privats, tasts i maridatges i xef privat a domicili a Catalunya, de 2 a 50 persones. Menú a mida i proposta en 48 hores.'),
  'en': ('Le Petit Comité · Gastronomic events, tastings and private chef',
         'Private gastronomic events, tastings and pairings and a private chef at home in Catalonia, for 2 to 50 guests. Bespoke menu and a proposal within 48 hours.')},
}
OG = {'inicio': 'og-gastrogoan.jpg', 'asesoria': 'og-asesoria.jpg', 'app': 'og-app.jpg', 'eventos': 'og-lpc.jpg'}
APERTURAS = {'es': 'Hola Marcos, voy a abrir un local y me interesa el programa de 30 días para aperturas.',
             'ca': "Hola Marcos, obriré un local i m'interessa el programa de 30 dies per a obertures.",
             'en': "Hi Marcos, I'm opening a venue and I'm interested in the 30-day opening programme."}


def ld(grupo, l):
    url = BASE + GRUPOS[grupo][l][1]
    org = {"@type": "Organization", "name": "GastroGoan", "url": BASE + "/", "logo": BASE + "/favicon.png",
           "telephone": "+34622390245", "sameAs": ["https://instagram.com/gastrogoan"]}
    t, d = META[grupo][l]
    if grupo == 'asesoria':
        dat = {"@context": "https://schema.org", "@type": "ProfessionalService", "name": "GastroGoan · Asesoría 360º", "url": url,
               "description": d, "image": BASE + "/img/" + OG[grupo], "telephone": "+34622390245",
               "founder": {"@type": "Person", "name": "Marcos González"}, "parentOrganization": org, "inLanguage": l}
    elif grupo == 'app':
        dat = {"@context": "https://schema.org", "@type": "SoftwareApplication", "name": "GastroGoan App", "url": url,
               "applicationCategory": "BusinessApplication", "operatingSystem": "Web, Android, iOS, Windows, macOS",
               "description": d, "image": BASE + "/img/" + OG[grupo], "inLanguage": l, "publisher": org,
               "offers": {"@type": "Offer", "price": "240", "priceCurrency": "EUR", "url": url,
                          "priceSpecification": {"@type": "UnitPriceSpecification", "price": "240", "priceCurrency": "EUR",
                                                 "valueAddedTaxIncluded": False, "unitText": "YEAR"}}}
    else:
        dat = {"@context": "https://schema.org", "@type": "Service", "name": "Le Petit Comité", "url": url, "description": d,
               "serviceType": t.split('·')[1].strip() if '·' in t else t, "areaServed": {"@type": "AdministrativeArea", "name": "Cataluña"},
               "image": BASE + "/img/" + OG[grupo], "provider": dict(org, sameAs=["https://instagram.com/lepetitcomite_gastro"]), "inLanguage": l}
    return json.dumps(dat, ensure_ascii=False).replace('</', '<\\/')


def bloque(grupo, l):
    t, d = META[grupo][l]
    url = BASE + GRUPOS[grupo][l][1]
    alt = ''.join(f'<link rel="alternate" hreflang="{k}" href="{BASE + v[1]}">' for k, v in GRUPOS[grupo].items())
    alt += f'<link rel="alternate" hreflang="x-default" href="{BASE + GRUPOS[grupo]["es"][1]}">'
    img = BASE + '/img/' + OG[grupo]
    return (f'<!-- gg-seo --><title>{e(t)}</title>'
            f'<meta name="description" content="{e(d)}"><meta name="robots" content="index,follow,max-image-preview:large">'
            f'<link rel="canonical" href="{url}">{alt}<meta name="theme-color" content="#1C1A17">'
            f'<meta property="og:type" content="website"><meta property="og:site_name" content="GastroGoan">'
            f'<meta property="og:title" content="{e(t)}"><meta property="og:description" content="{e(d)}">'
            f'<meta property="og:url" content="{url}"><meta property="og:locale" content="{LOC[l]}"><meta property="og:image" content="{img}">'
            f'<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">'
            f'<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{e(t)}">'
            f'<meta name="twitter:description" content="{e(d)}"><meta name="twitter:image" content="{img}">'
            f'<script type="application/ld+json">{ld(grupo, l)}</script><!-- /gg-seo -->')


def limpia(s):
    s = re.sub(r'<!-- gg-seo -->.*?<!-- /gg-seo -->', '', s, flags=re.S)
    s = re.sub(r'<!-- gg-legal -->.*?<!-- /gg-legal -->', '', s, flags=re.S)
    # Las tipografías ya van dentro de la página: avisar a Google de antemano mandaba la IP del visitante
    # a Google sin necesidad (privacidad, 16/11)
    return re.sub(r'\s*<link rel="preconnect" href="https://fonts\.(?:googleapis|gstatic)\.com"[^>]*>', '', s)


LEGAL_CSS = ('.gg-legal{display:flex;flex-wrap:wrap;justify-content:center;gap:0 18px;padding:14px clamp(20px,6vw,64px) calc(14px + env(safe-area-inset-bottom,0px));'
             "border-top:1px solid #E7E2D9;background:#FAF8F4;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.06em}"
             '.gg-legal a,.gg-legal span{display:inline-flex;align-items:center;min-height:44px;white-space:nowrap;color:#716C65;text-decoration:none}.gg-legal a:hover{color:#4A5D4E;text-decoration:underline}'
             '@media (pointer:coarse){.gg-legal{padding-bottom:calc(14px + env(safe-area-inset-bottom,0px) + 72px)}}')


def legal_pie(l):
    enl = ''.join(f'<a href="{legal.PAGS[k][l]}">{legal.NOMBRES[k][l]}</a>' for k in legal.PAGS)
    return f'<!-- gg-legal --><style>{LEGAL_CSS}</style><nav class="gg-legal" aria-label="Legal"><span>© 2026 GastroGoan</span>{enl}</nav><!-- /gg-legal -->'


def procesar(grupo, l):
    arch = GRUPOS[grupo][l][0] + '.html'; ruta = os.path.join(RAIZ, arch)
    s = open(ruta, encoding='utf-8').read()
    m = re.search(r'(<script type="__bundler/template">\s*)(.*?)(\s*</script>)', s, re.S)
    t = json.loads(m.group(2))
    # plantilla: idioma, datos y el enlace de aperturas con su mensaje
    t = limpia(t)
    t = re.sub(r'<html[^>]*>', f'<html lang="{l}">', t, count=1)
    t = t.replace('</head>', bloque(grupo, l) + '</head>', 1)
    t = t.replace('</x-dc>', legal_pie(l) + '</x-dc>', 1)   # enlaces legales al pie de cada página
    if grupo == 'asesoria':
        t = t.replace('href="https://wa.me/34622390245"', f'href="https://wa.me/34622390245?text={quote(APERTURAS[l])}" target="_blank" rel="noopener"')
    nuevo = json.dumps(t, ensure_ascii=False).replace('</', '<\\u002F')
    s = s[:m.start(2)] + nuevo + s[m.end(2):]
    # HTML de fuera: lo que lee quien no ejecuta JavaScript
    corte = s.index('</head>') + len('</head>')
    cab, resto = s[:corte], s[corte:]
    cab = limpia(cab)
    cab = re.sub(r'<html[^>]*>', f'<html lang="{l}">', cab, count=1)
    cab = re.sub(r'<title>[^<]*</title>', '', cab, count=1)
    extra = '' if 'name="viewport"' in cab else '<meta name="viewport" content="width=device-width, initial-scale=1">'
    extra += '' if 'favicon.png' in cab else '<link rel="icon" type="image/png" href="favicon.png">'
    cab = cab.replace('</head>', extra + bloque(grupo, l) + '</head>', 1)
    open(ruta, 'w', encoding='utf-8').write(cab + resto)
    print('OK SEO', arch)


def sitemap():
    filas = []
    for grupo, idiomas in GRUPOS.items():
        alt = ''.join(f'\n    <xhtml:link rel="alternate" hreflang="{k}" href="{BASE + v[1]}"/>' for k, v in idiomas.items())
        alt += f'\n    <xhtml:link rel="alternate" hreflang="x-default" href="{BASE + idiomas["es"][1]}"/>'
        for l, (_, ruta) in idiomas.items():
            pr = '1.0' if (grupo == 'inicio' and l == 'es') else ('0.9' if l == 'es' else '0.7')
            filas.append(f'  <url>\n    <loc>{BASE + ruta}</loc>{alt}\n    <changefreq>monthly</changefreq>\n    <priority>{pr}</priority>\n  </url>')
    for pag, idi in legal.PAGS.items():
        for l, slug in idi.items():
            filas.append(f'  <url>\n    <loc>{BASE}/{slug}</loc>\n    <changefreq>yearly</changefreq>\n    <priority>0.2</priority>\n  </url>')
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
           'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + '\n'.join(filas) + '\n</urlset>\n')
    open(os.path.join(RAIZ, 'sitemap.xml'), 'w').write(xml)
    open(os.path.join(RAIZ, 'robots.txt'), 'w').write(f'User-agent: *\nAllow: /\nDisallow: /gracias\nDisallow: /gracias.html\n\nSitemap: {BASE}/sitemap.xml\n')
    print('OK sitemap.xml + robots.txt')


if __name__ == '__main__':
    for g in ('asesoria', 'app', 'eventos'):
        for l in ('es', 'ca', 'en'):
            procesar(g, l)
    sitemap()
