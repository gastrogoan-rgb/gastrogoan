#!/bin/bash
# Genera index.html y reservagastrogoan.html listos para entregar al cliente
# Uso: ./build.sh → crea carpeta dist/ con los 2 archivos

set -e
mkdir -p dist

echo "🔧 Construyendo index.html..."

# Read CSS
CSS=$(cat css/styles.css)

# Read all JS in order
JS=""
for f in js/core.js js/i18n.js js/ui.js js/finance.js js/recipes.js js/menu.js js/tpv.js js/operations.js js/hr.js js/app.js; do
  JS="$JS
$(cat $f)"
done

# Build: take index.html, replace CSS link with inline, replace JS scripts with inline
{
  # Everything up to the CSS link
  sed -n '1,/link rel="stylesheet" href="css\/styles.css"/p' index.html | head -n -1

  # Inline CSS
  echo "<style>"
  echo "$CSS"
  echo "</style>"

  # From </head> to before the JS script tags
  sed -n '/<\/head>/,/<script src="js\/core.js">/p' index.html | head -n -1

  # Inline JS
  echo "<script>"
  echo "$JS"
  echo "</script>"

  # Closing tags
  echo ""
  echo "</body>"
  echo "</html>"
} > dist/index.html

# Copy reservas page as-is (it's already a single file)
cp reservagastrogoan.html dist/reservagastrogoan.html

LINES=$(wc -l < dist/index.html)
SIZE=$(du -h dist/index.html | cut -f1)

echo "✅ dist/index.html ($LINES líneas, $SIZE)"
echo "✅ dist/reservagastrogoan.html copiado"
echo ""
echo "📦 Carpeta dist/ lista para entregar al cliente"
