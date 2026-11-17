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
#
# Los iconos se RECORTAN a los que la app usa de verdad. Tabler entero son
# 5.147 iconos y aquí se usan unos 230, pero el peso no se notaba en las
# pruebas: la fuente viaja como woff2 en base64, que ya viene comprimido, así
# que gzip no lo tocaba y esos ~600 KB eran un tercio de TODO lo que se
# descarga la primera vez que alguien abre la app. 800 KB → 53 KB.
#
# El juego completo (css/tabler-icons.min.css) sigue siendo la fuente de la
# verdad y no se toca: el recorte se genera aquí, así que un icono nuevo
# entra solo en la siguiente compilación.
echo "✂️  Recortando la fuente de iconos..."
python3 tools/recortar-iconos.py build/tabler-icons.subset.css
CSS_ICONS=$(cat build/tabler-icons.subset.css)
CSS_GG=$(cat css/iconos-gg.css)   # los mismos iconos con trazo fino (tools/generar-iconos-tabler.py): van DESPUÉS de la fuente, que sustituyen
CSS_FONTS=$(cat css/fonts.css)
CSS_APP=$(cat css/styles.css)

# Read all JS in order
JS=""
for f in js/core.js js/qr.js js/i18n.js js/frases.js js/iconos-comida.js js/iconos-comida-uso.js js/ui.js js/finance.js js/panel.js js/motor-fiscal.js js/recipes.js js/menu.js js/tpv.js js/tpv-sala.js js/entregas.js js/operations.js js/hr.js js/idr.js js/novedades.js js/clientes.js js/reservas.js js/manual.js js/polish.js js/app.js; do
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
  echo "$CSS_GG"
  echo "$CSS_FONTS"
  echo "$CSS_APP"
  echo "</style>"

  # Pregunta de versión TEMPRANA (vídeo en un móvil real, 16/11): la que hay en js/polish.js corre cuando la app ya
  # ha arrancado, y en un Android normal eso son ~5 s de pantalla de carga que se tiran a la basura cuando llega la
  # recarga automática: el usuario veía DOS cargas seguidas. Este guion mínimo va ANTES de los 4 MB de JS, pregunta
  # por version.json (29 bytes) y, si hay versión nueva y nadie ha tocado nada, recarga ya: la primera carga dura
  # lo que dura esa petición. Respeta lo mismo que polish.js (sin sesión se pregunta siempre, con sesión cada 6 h,
  # y el freno de 10 min contra el bucle de recargas). Si algo no cuadra, no hace nada: polish.js sigue ahí.
  echo "<script>"
  cat <<EARLY
(function(){try{
var B='$GG_SELLO',LS=window.localStorage,tocado=false;
['pointerdown','keydown','touchstart'].forEach(function(e){window.addEventListener(e,function(){tocado=true;},{once:true,passive:true});});
var ses=null;try{ses=JSON.parse(LS.getItem('gastrogoan_access_session')||'null');}catch(e){}
if(ses&&Date.now()-parseInt(LS.getItem('gastrogoan_version_comprobada')||'0',10)<21600000)return;
fetch('version.json?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(j){
 if(!j||!j.build||j.build===B||tocado)return;
 var x=null;try{x=JSON.parse(LS.getItem('gastrogoan_auto_actualizacion')||'null');}catch(e){}
 if(x&&x.build===j.build&&Date.now()-x.ts<600000)return;
 LS.setItem('gastrogoan_auto_actualizacion',JSON.stringify({build:j.build,ts:Date.now()}));
 LS.setItem('gastrogoan_version_comprobada',String(Date.now()));
 window.__ggActualizandoTemprano=true;
 return fetch('./?gg-actualizar=1',{cache:'reload'}).catch(function(){}).then(function(){location.reload();});
}).catch(function(){});
}catch(e){}})();
EARLY
  echo "</script>"

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
cp sw-reservas.js dist/sw-reservas.js

# Tutorial de autoalojamiento (Netlify): solo lo enseña la app cuando NO se
# abre desde *.gastrogoan.com (ver esKitAutoAlojado, js/core.js), pero tiene
# que estar disponible junto a index.html en cualquier otro sitio donde se
# despliegue — si no, el enlace de dentro de la app da un 404 disfrazado.
cp tutorial-netlify.html dist/tutorial-netlify.html

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
