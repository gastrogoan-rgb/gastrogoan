#!/usr/bin/env python3
"""Arreglos técnicos de las 9 páginas interiores de la web comercial.

Las páginas son «bundles» (un HTML que desempaqueta una plantilla). Este script
abre la plantilla de cada una, le pone lo que faltaba y la vuelve a empaquetar:
 - <html lang>, <title> y descripción propios (antes el título salía VACÍO),
   enlace canónico, hreflang entre los tres idiomas y etiquetas Open Graph;
 - el icono de la pestaña y un aviso útil si no hay JavaScript;
 - tamaños de letra grandes reducidos (titulares de hasta 80 px) para que
   nada se vea sobredimensionado; siguen ajustándose solos con el ancho.
Es idempotente: se puede volver a ejecutar. Uso: python3 tools/web-parche/paginas.py
"""
import re, json, os, html
RAIZ = os.path.join(os.path.dirname(__file__), '..', '..', 'deploy', 'web', 'public')
BASE = 'https://gastrogoan.com'
M_INI, M_FIN = '<!--gg:ini-->', '<!--gg:fin-->'

GRUPOS = {
 'asesoria': {'es': 'asesoria', 'ca': 'ca-assessoria', 'en': 'en-advisory'},
 'app': {'es': 'app', 'ca': 'ca-app', 'en': 'en-app'},
 'eventos': {'es': 'eventos', 'ca': 'ca-esdeveniments', 'en': 'en-events'},
}
META = {
 ('asesoria', 'es'): ('Asesoría 360º para restaurantes · GastroGoan', 'Asesoría gastronómica 360º con Marcos González: veo tu local como lo ve tu cliente, te digo la verdad y trabajamos con datos para mejorar tu restaurante, bar o cafetería.'),
 ('asesoria', 'ca'): ('Assessoria 360º per a restaurants · GastroGoan', 'Assessoria gastronòmica 360º amb Marcos González: veig el teu local com el veu el teu client, et dic la veritat i treballem amb dades per millorar el teu restaurant, bar o cafeteria.'),
 ('asesoria', 'en'): ('360º advisory for restaurants · GastroGoan', '360º gastronomic advisory with Marcos González: I see your venue the way your customer does, tell you the truth and work with data to improve your restaurant, bar or café.'),
 ('app', 'es'): ('App de gestión para restaurantes · GastroGoan', 'GastroGoan App reúne la gestión de tu restaurante en un solo lugar y por un solo pago, en lugar de pagar suscripciones mensuales a varias apps.'),
 ('app', 'ca'): ('App de gestió per a restaurants · GastroGoan', 'GastroGoan App reuneix la gestió del teu restaurant en un sol lloc i per un sol pagament, en lloc de pagar subscripcions mensuals a diverses apps.'),
 ('app', 'en'): ('Restaurant management app · GastroGoan', 'GastroGoan App brings your restaurant management together in one place and for one payment, instead of paying monthly subscriptions to several apps.'),
 ('eventos', 'es'): ('Le Petit Comité · Eventos gastronómicos privados', 'Eventos gastronómicos privados, catas guiadas y chef a domicilio. Nos encargamos de todo —menú, compra, montaje, servicio y limpieza— para que tú solo estés en la mesa.'),
 ('eventos', 'ca'): ('Le Petit Comité · Esdeveniments gastronòmics privats', 'Esdeveniments gastronòmics privats, tasts guiats i xef a domicili. Ens n’encarreguem de tot —menú, compra, muntatge, servei i neteja— perquè tu només siguis a taula.'),
 ('eventos', 'en'): ('Le Petit Comité · Private gastronomic events', 'Private gastronomic events, guided tastings and a private chef. We handle everything —menu, shopping, setup, service and cleanup— so you just sit at the table.'),
}
LOC = {'es': 'es_ES', 'ca': 'ca_ES', 'en': 'en_GB'}
SIN_JS = {
 'es': 'Esta página necesita JavaScript para mostrarse. Escríbenos por WhatsApp (+34 622 390 245) o a gastrogoan@gmail.com.',
 'ca': 'Aquesta pàgina necessita JavaScript per mostrar-se. Escriu-nos per WhatsApp (+34 622 390 245) o a gastrogoan@gmail.com.',
 'en': 'This page needs JavaScript to display. Message us on WhatsApp (+34 622 390 245) or at gastrogoan@gmail.com.',
}

def url(arch):
    return BASE + '/' + arch

def cabeza(grupo, l):
    t, d = META[(grupo, l)]; e = html.escape
    alt = ''.join(f'<link rel="alternate" hreflang="{k}" href="{url(GRUPOS[grupo][k])}">' for k in ('es', 'ca', 'en'))
    alt += f'<link rel="alternate" hreflang="x-default" href="{url(GRUPOS[grupo]["es"])}">'
    u = url(GRUPOS[grupo][l])
    return (f'{M_INI}<title>{e(t)}</title><meta name="description" content="{e(d)}">'
            f'<meta name="theme-color" content="#1C1A17"><link rel="canonical" href="{u}">{alt}'
            f'<meta property="og:type" content="website"><meta property="og:site_name" content="GastroGoan">'
            f'<meta property="og:title" content="{e(t)}"><meta property="og:description" content="{e(d)}">'
            f'<meta property="og:url" content="{u}"><meta property="og:locale" content="{LOC[l]}">'
            f'<meta name="twitter:card" content="summary">{M_FIN}')

def reducir(plantilla):
    """Titulares enormes → más contenidos, siempre fluidos con el ancho."""
    def clamp(m):
        a, b, c = m.group(1), m.group(2), int(m.group(3))
        if c < 36: return m.group(0)
        na = max(24, round(int(a) * 0.92)); nc = round(c * 0.72)
        nb = round(float(b) * 0.8, 2)
        return f'font-size:clamp({na}px,{nb:g}vw,{nc}px)'
    plantilla = re.sub(r'font-size:clamp\((\d+)px,([\d.]+)vw,(\d+)px\)', clamp, plantilla)
    return re.sub(r'font-size:(\d+)px', lambda m: f'font-size:{round(int(m.group(1))*0.75)}px' if int(m.group(1)) >= 34 else m.group(0), plantilla)

def quitar_bloque(s):
    return re.sub(re.escape(M_INI) + r'.*?' + re.escape(M_FIN), '', s, flags=re.S)

def procesar(grupo, l):
    arch = GRUPOS[grupo][l]; ruta = os.path.join(RAIZ, arch + '.html')
    s = open(ruta, encoding='utf-8').read()
    m = re.search(r'(<script type="__bundler/template">\s*)(.*?)(\s*</script>)', s, re.S)
    tpl = json.loads(m.group(2))
    # 1) Plantilla. Lo que va en <helmet> lo pasa el ejecutor a la cabecera real;
    #    lo que se pone suelto en <head> se pierde al montar la página.
    tpl = quitar_bloque(tpl)
    tpl = re.sub(r'<html[^>]*>', f'<html lang="{l}">', tpl, count=1)
    tpl = tpl.replace('<helmet>', '<helmet>' + cabeza(grupo, l), 1)
    if 'gg:reducido' not in tpl:
        tpl = reducir(tpl) + '<!--gg:reducido-->'
    nuevo = json.dumps(tpl, ensure_ascii=False).replace('</', '<\\u002F')
    antes, despues = s[:m.start(2)], s[m.end(2):]
    # 2) Cabecera del propio fichero (lo que ven los buscadores antes de ejecutar
    #    nada). Se limpia SOLO fuera de la plantilla.
    antes = quitar_bloque(antes)
    antes = re.sub(r'<html[^>]*>', f'<html lang="{l}">', antes, count=1)
    antes = re.sub(r'<title>[^<]*</title>', '', antes, count=1)
    antes = antes.replace('<meta charset="utf-8">', '<meta charset="utf-8">' + cabeza(grupo, l) + '<link rel="icon" type="image/png" href="favicon.png">', 1)
    antes = re.sub(r'<noscript>.*?</noscript>', f'<noscript><p style="font:16px/1.5 system-ui,sans-serif;padding:24px;max-width:40em">{html.escape(SIN_JS[l])}</p></noscript>', antes, count=1, flags=re.S)
    open(ruta, 'w', encoding='utf-8').write(antes + nuevo + despues)
    print('OK', arch)

for g in GRUPOS:
    for l in ('es', 'ca', 'en'):
        procesar(g, l)
