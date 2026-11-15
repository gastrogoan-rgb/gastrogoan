#!/usr/bin/env python3
"""Botón «Volver» de las páginas interiores de la web comercial (Asesoría, App, Le Petit Comité ×
es/ca/en). Ya existía como texto gris de 13 px y el dueño no lo encontraba (16/11): ahora es un
botón como los de la página (borde fino, mono en mayúsculas, 44 px de alto) y siempre a la derecha
del menú. En móvil estrecho queda solo la flecha, con su nombre para lectores de pantalla.
Idempotente. asesoria.py lo aplica al regenerar Asesoría; para App y Le Petit Comité se ejecuta:
  python3 tools/web-parche/volver.py
"""
import re, json, os

RAIZ = os.path.join(os.path.dirname(__file__), '..', '..', 'deploy', 'web', 'public')
OTRAS = ['app.html', 'ca-app.html', 'en-app.html', 'eventos.html', 'ca-esdeveniments.html', 'en-events.html']

CSS = '''<style data-gg="volver">
.gg-volver{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 16px;box-sizing:border-box;border:1px solid #D5CFC4;border-radius:3px;background:#fff;color:#1C1A17;font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:.12em;text-transform:uppercase;white-space:nowrap;text-decoration:none;transition:background .25s,color .25s,border-color .25s}
.gg-volver-f{display:inline-block;transition:transform .3s cubic-bezier(.2,.7,.2,1)}
.gg-volver:hover,.gg-volver:focus-visible{background:#4A5D4E;border-color:#4A5D4E;color:#FAF8F4}
.gg-volver:hover .gg-volver-f{transform:translateX(-4px)}
.gg-volver:focus-visible{outline:2px solid #4A5D4E;outline-offset:2px}
@media (max-width:359px){.gg-volver{padding:0;width:44px;justify-content:center}.gg-volver-t{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}}
</style>'''


def aplicar(t):
    if 'class="gg-volver"' in t:
        return t
    m = re.search(r'<a href="([^"]+)" style="font-size:13px;font-weight:500;color:#8A857C;white-space:nowrap;">←\s*([^<]+)</a>', t)
    assert m, 'no encuentro el «Volver»'
    href, txt = m.group(1), m.group(2).strip()
    boton = f'<a class="gg-volver" href="{href}" aria-label="{txt}"><span class="gg-volver-f" aria-hidden="true">←</span><span class="gg-volver-t">{txt}</span></a>'
    t = t[:m.start()] + boton + t[m.end():]
    # Le Petit Comité tenía el menú pegado a la izquierda: el botón va siempre al otro lado
    t = t.replace('<nav style="display:flex;justify-content:flex-start;', '<nav style="display:flex;justify-content:space-between;', 1)
    return t.replace('</helmet>', CSS + '\n</helmet>', 1)


def procesar(arch):
    ruta = os.path.join(RAIZ, arch)
    s = open(ruta, encoding='utf-8').read()
    m = re.search(r'(<script type="__bundler/template">\s*)(.*?)(\s*</script>)', s, re.S)
    t = aplicar(json.loads(m.group(2)))
    nuevo = json.dumps(t, ensure_ascii=False).replace('</', '<\\u002F')
    open(ruta, 'w', encoding='utf-8').write(s[:m.start(2)] + nuevo + s[m.end(2):])
    print('OK', arch)


if __name__ == '__main__':
    for a in OTRAS:
        procesar(a)
