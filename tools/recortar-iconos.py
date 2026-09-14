#!/usr/bin/env python3
"""Recorta la fuente de iconos a los que la app usa de verdad.

Por qué existe: `css/tabler-icons.min.css` trae Tabler Icons entero —5.147
iconos— y la app usa unos 230. Eso no sería grave si comprimiera, pero la
fuente viaja como woff2 en base64 DENTRO del CSS, y woff2 ya viene
comprimido: gzip no puede reducirlo. O sea que esos ~600 KB eran un tercio
de todo lo que se descarga la primera vez que alguien abre la app, y el 96%
eran iconos que nadie mira.

Una auditoría externa dijo "el HTML pesa 4,8 MB, partidlo en módulos". El
peso era real, pero la causa no era el fichero único (que es el producto:
dos HTML sueltos que el cliente abre) sino esto.

Cómo se usa: lo llama `build.sh`. El fichero grande SIGUE SIENDO la fuente
de la verdad y no se toca; aquí solo se genera el recorte para `dist/`. Así,
el día que alguien use un icono nuevo, la siguiente compilación lo incluye
sola, sin que nadie tenga que acordarse de nada.

    python3 tools/recortar-iconos.py [salida.css]
"""
import base64
import io
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
COMPLETO = RAIZ / 'css' / 'tabler-icons.min.css'

# Dónde puede aparecer el nombre de un icono. Se rastrea en bruto, sin
# suponer la forma exacta: hay sitios con `class="ti ti-x"`, otros con
# mapas tipo {manos: 'ti-droplet'} y otros donde se arma al vuelo.
FUENTES = ['js/*.js', 'index.html', 'reservagastrogoan.html',
           'css/styles.css', 'generador-licencias.html', 'catalogo.html']

# Los que se construyen en tiempo de ejecución y por tanto NO aparecen
# escritos enteros en ningún sitio. Si se añade otro `ti-${...}`, va aquí.
#   js/app.js  renderBlock(...,'sunrise'|'sunset',...)
#   js/app.js  `ti-${... ? 'chevron-up' : 'history'}`
DINAMICOS = {'sunrise', 'sunset', 'chevron-up', 'history'}


def iconos_disponibles(css):
    """{nombre: codepoint} de todo lo que trae la fuente completa."""
    return {n: int(cp, 16)
            for n, cp in re.findall(r'\.ti-([a-z0-9-]+):before\{content:"\\([0-9a-f]+)"\}', css)}


def iconos_usados(disponibles):
    vistos = set(DINAMICOS)
    for patron in FUENTES:
        for ruta in RAIZ.glob(patron):
            texto = ruta.read_text(encoding='utf-8', errors='ignore')
            # Cualquier cosa con pinta de nombre de icono. Es a propósito
            # generoso: colar uno de más cuesta 150 bytes, y que falte uno
            # deja un cuadrado vacío en la cara del hostelero.
            vistos.update(re.findall(r'\bti-([a-z0-9-]+)\b', texto))
    return {n for n in vistos if n in disponibles}


def main():
    salida = Path(sys.argv[1]) if len(sys.argv) > 1 else RAIZ / 'build' / 'tabler-icons.subset.css'
    css = COMPLETO.read_text(encoding='utf-8')

    disponibles = iconos_disponibles(css)
    usados = iconos_usados(disponibles)
    if not usados:
        sys.exit('❌ No se ha reconocido ningún icono: no se recorta nada (mejor gordo que roto).')

    # La fuente completa, sacada del propio CSS.
    b64 = re.search(r'src:url\(data:font/woff2;base64,([A-Za-z0-9+/=]+)\)', css).group(1)
    woff2 = base64.b64decode(b64)

    from fontTools import subset
    from fontTools.ttLib import TTFont

    fuente = TTFont(io.BytesIO(woff2))
    opciones = subset.Options()
    opciones.flavor = 'woff2'
    opciones.desubroutinize = True
    opciones.layout_features = []           # los iconos no ligan ni componen
    opciones.notdef_outline = True          # deja ver el hueco si falta uno
    opciones.drop_tables += ['GSUB', 'GPOS']
    recortador = subset.Subsetter(options=opciones)
    recortador.populate(unicodes=[disponibles[n] for n in usados])
    recortador.subset(fuente)

    # Que la fuente recortada contenga DE VERDAD cada icono pedido. Sin esto,
    # un fallo del recortador se vería como cuadraditos vacíos en la pantalla
    # de un hostelero, y solo si alguien abría esa pantalla concreta.
    cmap = set()
    for tabla in fuente['cmap'].tables:
        cmap.update(tabla.cmap.keys())
    faltan = sorted(n for n in usados if disponibles[n] not in cmap)
    if faltan:
        sys.exit(f'❌ El recorte ha perdido {len(faltan)} iconos: {", ".join(faltan[:10])}')

    buf = io.BytesIO()
    fuente.flavor = 'woff2'
    fuente.save(buf)
    nuevo_b64 = base64.b64encode(buf.getvalue()).decode('ascii')

    # El bloque `.ti{...}` se copia tal cual del original: es el que hace
    # que el icono se pinte, y reescribirlo a mano solo sirve para que un
    # día deje de coincidir con el que trae Tabler.
    base = re.search(r'(\.ti\{[^}]+\})', css).group(1)
    clases = ''.join(f'.ti-{n}:before{{content:"\\{disponibles[n]:x}"}}'
                     for n in sorted(usados))

    cabecera = (f'/*! Tabler Icons, recortado a los {len(usados)} iconos que usa GastroGoan.\n'
                f' * Generado por tools/recortar-iconos.py — NO editar a mano.\n'
                f' * El juego completo sigue en css/tabler-icons.min.css. */\n')
    contenido = (f'{cabecera}@font-face{{font-family:"tabler-icons";font-style:normal;'
                 f'font-weight:400;src:url(data:font/woff2;base64,{nuevo_b64}) format("woff2")}}'
                 f'{base}{clases}')

    salida.parent.mkdir(parents=True, exist_ok=True)
    salida.write_text(contenido, encoding='utf-8')

    antes, despues = len(css), len(contenido)
    try:
        mostrar = salida.resolve().relative_to(RAIZ)
    except ValueError:
        mostrar = salida
    print(f'✅ {mostrar}')
    print(f'   {len(usados)} iconos de {len(disponibles)} · '
          f'{antes/1024:.0f} KB → {despues/1024:.0f} KB '
          f'({100 - despues*100/antes:.0f}% menos)')


if __name__ == '__main__':
    main()
