#!/bin/bash
# Genera dist/kit-gastrogoan-DEMO.html a partir de la app RECIÉN COMPILADA.
#
# La demo anterior era una copia suelta del HTML, congelada en junio: tres
# meses después enseñaba una app que ya no existía. Esto la reconstruye desde
# dist/index.html cada vez, así que nunca puede quedarse vieja.
#
# Uso:  bash build.sh && bash demo/generar.sh
set -e

[ -f dist/index.html ] || { echo "Falta dist/index.html — ejecuta antes: bash build.sh"; exit 1; }

DATOS=$(cat demo/datos.js)
SIEMBRA=$(cat demo/sembrar.js)

# Se inyecta justo antes de </body>: así todo el código de la app ya está
# cargado y basta con rellenar la base de datos y quitar los asistentes del
# alta, sin tocar ni una línea de la app real.
python3 - "$DATOS" "$SIEMBRA" <<'PY'
import sys
datos, siembra = sys.argv[1], sys.argv[2]
html = open('dist/index.html', encoding='utf-8').read()
bloque = "<script>\n" + datos + "\n" + siembra + "\n</script>\n</body>"
# ⚠️ El ÚLTIMO </body>, no el primero: dentro del JavaScript de la app hay
# plantillas de impresión que contienen "</body>" en una cadena de texto.
# Cortando por el primero se parte el script en dos y la app entera deja de
# cargar — con el agravante de que la demo "abre" y parece medio bien.
i = html.rindex('</body>')
html = html[:i] + bloque + html[i + len('</body>'):]
html = html.replace('<title>', '<title>DEMO · ', 1)
open('dist/kit-gastrogoan-DEMO.html', 'w', encoding='utf-8').write(html)
PY

TAM=$(du -h dist/kit-gastrogoan-DEMO.html | cut -f1)
echo "✅ dist/kit-gastrogoan-DEMO.html ($TAM)"
echo "   Versión: $(grep -o "GG_BUILD = '[^']*'" dist/kit-gastrogoan-DEMO.html | head -1)"
