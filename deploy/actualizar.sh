#!/bin/bash
# Copia lo recien construido a la carpeta de publicacion.
set -e
cd "$(dirname "$0")/.."
bash build.sh
cp dist/index.html dist/sw.js dist/version.json dist/tutorial-netlify.html deploy/app/public/
cp dist/reservagastrogoan.html deploy/reservas/public/index.html
# La misma pagina como 404: el hosting la sirve cuando la direccion no es un
# archivo, y asi el enlace corto (reservas.gastrogoan.com/casapaco) funciona
# sin depender de reglas de redireccion, que cada proveedor entiende a su
# manera -o directamente rechaza-.
cp dist/reservagastrogoan.html deploy/reservas/public/404.html
rm -rf deploy/reservas/public/fonts && cp -r dist/fonts deploy/reservas/public/
# Documentos legales (declaracion responsable de VeriFactu). Ver legal/README.md:
# la app enlaza a app.gastrogoan.com/legal/<archivo> con una direccion fija.
mkdir -p deploy/app/public/legal
cp -f legal/*.pdf legal/*.html deploy/app/public/legal/ 2>/dev/null || true
# El Plan 360º (coaching). UN solo enlace para recordar: /360. Ver plan/README.md.
mkdir -p deploy/app/public/360
cp -f plan/comun.js deploy/app/public/
cp -f plan/360/index.html deploy/app/public/360/
# /legal/ y /360/ NO son el HTML unico de la app -que lleva las fuentes
# incrustadas en base64- y piden estos .woff2 como fichero externo. Sin
# esto, app.gastrogoan.com/360/... cargaba con la tipografia del sistema
# en vez de la de marca, y nadie lo notaba hasta mirarlo de cerca.
rm -rf deploy/app/public/fonts && cp -r fonts deploy/app/public/fonts
echo "OK: deploy/ actualizado. Ahora commit y push."
