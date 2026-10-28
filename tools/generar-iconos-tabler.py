#!/usr/bin/env python3
"""Genera css/iconos-gg.css: TODOS los iconos que usa la app, con el mismo dibujo de
Tabler pero con trazo fino (1,5 en vez de 2), como máscaras CSS.

Por qué: la fuente Tabler pinta todo con trazo de 2 px y no se puede afinar; mezclarla
con iconos propios dejaba la app con dos estilos. Aquí es el MISMO dibujo en todas
partes, solo más fino y redondeado. Si un icono no está en el juego sigue saliendo de
la fuente (no se pierde ninguno), pero entonces hay que regenerar este fichero.

Uso (hace falta el paquete con los SVG, solo para generar; el resultado se versiona):
    mkdir -p /tmp/tabler && cd /tmp/tabler && npm i @tabler/icons@3.19.0
    python3 tools/generar-iconos-tabler.py [/tmp/tabler/node_modules/@tabler/icons/icons]
"""
import re, sys, glob, os, urllib.parse
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICONOS = sys.argv[1] if len(sys.argv) > 1 else '/tmp/tabler/node_modules/@tabler/icons/icons'
GROSOR = '1.5'
DINAMICOS = ['sunrise', 'sunset', 'chevron-up', 'history']   # se arman en tiempo de ejecución

usados = set(DINAMICOS)
fuentes = glob.glob(f'{RAIZ}/js/*.js') + [f'{RAIZ}/index.html', f'{RAIZ}/reservagastrogoan.html']
for f in fuentes:
    s = open(f, encoding='utf-8').read()
    usados |= set(re.findall(r'\bti-([a-z0-9]+(?:-[a-z0-9]+)*)', s))
usados -= {'spin', 'pulse', 'xs', 'sm', 'lg', 'xl'}

def uri(svg):
    svg = re.sub(r'\s+', ' ', svg).strip()
    return 'url("data:image/svg+xml,' + urllib.parse.quote(svg, safe="/:=' ,.-") .replace('%22', "'") + '")'

def cuerpo(path):
    s = open(path, encoding='utf-8').read()
    m = re.search(r'<svg[^>]*>(.*)</svg>', s, re.S)
    inner = m.group(1)
    inner = re.sub(r'<path stroke="none" d="M0 0h24v24H0z" fill="none"\s*/>', '', inner)
    return inner.strip()

reglas, cubiertos, faltan = [], [], []
for n in sorted(usados):
    p = f'{ICONOS}/outline/{n}.svg'
    relleno = False
    if not os.path.exists(p) and n.endswith('-filled') and os.path.exists(f'{ICONOS}/filled/{n[:-7]}.svg'):
        p = f'{ICONOS}/filled/{n[:-7]}.svg'; relleno = True
    elif not os.path.exists(p) and n.endswith('-filled') and os.path.exists(f'{ICONOS}/outline/{n[:-7]}.svg'):
        p = f'{ICONOS}/outline/{n[:-7]}.svg'
    if not os.path.exists(p):
        faltan.append(n); continue
    inner = cuerpo(p)
    if relleno or 'filled/' in p:
        svg = f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='black'>{inner.replace(chr(34), chr(39))}</svg>"
    else:
        svg = (f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='{GROSOR}' "
               f"stroke-linecap='round' stroke-linejoin='round'>{inner.replace(chr(34), chr(39))}</svg>")
    cubiertos.append(n)
    reglas.append(f'.ti-{n}::before{{--gg-m:{uri(svg)}}}')

base_sel = ','.join(f'.ti-{n}::before' for n in cubiertos)
css = ('/* GENERADO por tools/generar-iconos-tabler.py — no editar a mano.\n'
       f'   Los iconos de Tabler que usa la app, con trazo fino ({GROSOR}) y redondeado, como máscaras: mismo dibujo, un solo estilo.\n'
       '   Los que no estén aquí siguen saliendo de la fuente. */\n'
       f'{base_sel}{{content:"";display:inline-block;width:1em;height:1em;vertical-align:-.15em;background:currentColor;'
       '-webkit-mask:var(--gg-m) center/100% 100% no-repeat;mask:var(--gg-m) center/100% 100% no-repeat}\n'
       + '\n'.join(reglas) + '\n')
open(f'{RAIZ}/css/iconos-gg.css', 'w', encoding='utf-8').write(css)
print(len(cubiertos), 'iconos cubiertos;', len(faltan), 'sin dibujo (se quedan en la fuente):', faltan[:30])
print(round(len(css)/1024), 'KB')
