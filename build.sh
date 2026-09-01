#!/bin/bash
# Genera index.html y reservagastrogoan.html listos para entregar al cliente
# Uso: ./build.sh → crea carpeta dist/ con los 2 archivos

set -e
# El sello de versión se calcula UNA sola vez y se usa en dos sitios: dentro
# del HTML (lo que ve el hostelero abajo) y en version.json, un fichero de 50
# bytes que la app consulta al abrirse para saber si hay algo nuevo SIN
# descargarse los 4 MB de la app entera. Es lo que hace que el plan gratuito
# de Render (5 GB de tráfico al mes) dé de sobra.
GG_SELLO="$(TZ=Europe/Madrid date '+%d/%m/%Y %H:%M')"

mkdir -p dist

echo "🔧 Construyendo index.html..."

# Read CSS (icons + fuentes incrustadas + app styles)
CSS_ICONS=$(cat css/tabler-icons.min.css)
CSS_FONTS=$(cat css/fonts.css)
CSS_APP=$(cat css/styles.css)

# Read all JS in order
JS=""
for f in js/core.js js/i18n.js js/ui.js js/finance.js js/recipes.js js/menu.js js/tpv.js js/operations.js js/hr.js js/idr.js js/polish.js js/app.js; do
  JS="$JS
$(cat $f)"
done

# Build: take index.html, replace CSS links with inline, replace JS scripts with inline
{
  # Everything up to the first CSS link (tabler-icons)
  sed -n '1,/link rel="stylesheet" href="css\/tabler-icons.min.css"/p' index.html | head -n -1

  # Inline CSS (iconos + fuentes + estilos)
  echo "<style>"
  echo "$CSS_ICONS"
  echo "$CSS_FONTS"
  echo "$CSS_APP"
  echo "</style>"

  # From </head> to before the JS script tags
  sed -n '/<\/head>/,/<script src="js\/core.js">/p' index.html | head -n -1

  # Inline JS
  echo "<script>"
  # Sello de version: sin esto no habia forma de saber, mirando la app, si lo
  # que se esta viendo es lo ultimo publicado o una copia guardada en el
  # navegador. Se perdieron ratos enteros dudando de eso.
  # Hora de Madrid, no la del servidor donde se compila (que va en UTC): el
  # sello es para que el hostelero compare con SU reloj y sepa si está viendo
  # la versión nueva. Dos horas de desfase convertían esa comprobación en otra
  # duda más.
  echo "const GG_BUILD = '$GG_SELLO';"
  echo "$JS"
  echo "</script>"

  # Closing tags
  echo ""
  echo "</body>"
  echo "</html>"
} > dist/index.html

# El sello, suelto y minúsculo, para poder preguntarlo sin bajarse la app.
echo "{\"build\":\"$GG_SELLO\"}" > dist/version.json

# Copy reservas page (referencia fuentes externas en fonts/, ver más abajo —
# ya no va todo en un solo archivo: al servirse por HTTP, esto cachea mejor
# que llevar las fuentes embebidas en base64 dentro del propio HTML)
cp reservagastrogoan.html dist/reservagastrogoan.html
mkdir -p dist/fonts
cp fonts/*.woff2 dist/fonts/

# Copy the offline app-shell service worker (must sit at the site root next to index.html)
cp sw.js dist/sw.js

# Copy Netlify redirect rules (URL corta para el sitio de reservas: ver _redirects)
cp _redirects dist/_redirects

LINES=$(wc -l < dist/index.html)
SIZE=$(du -h dist/index.html | cut -f1)

echo "✅ dist/index.html ($LINES líneas, $SIZE)"
echo "✅ dist/reservagastrogoan.html copiado"
# La demo sale de la app recién compilada, así que se regenera AQUÍ.
#
# Tres veces se quedó vieja tras un build, y no falla de forma limpia: la app
# detecta que hay versión nueva, se actualiza sola RECARGANDO la página, y eso
# revienta lo que esté corriendo encima. La primera vez tumbó la grabación del
# vídeo ("__cursorA is not a function"); las otras dos dejaron test/demo.mjs
# con cinco fallos que no tenían nada que ver ("DB is not defined"), y se va
# media hora buscando el bug donde no está.
if [ -f demo/generar.sh ]; then
  bash demo/generar.sh > /dev/null 2>&1 && echo "✅ dist/kit-gastrogoan-DEMO.html regenerado" \
    || echo "⚠️  la demo NO se pudo regenerar — corre 'bash demo/generar.sh' y mira el error"
fi

echo ""
echo "📦 Carpeta dist/ lista para entregar al cliente"
