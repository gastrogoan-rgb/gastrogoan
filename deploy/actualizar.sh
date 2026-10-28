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
# /legal/ NO es el HTML unico de la app -que lleva las fuentes incrustadas
# en base64- y pide estos .woff2 como fichero externo. Sin esto,
# app.gastrogoan.com/legal/... cargaba con la tipografia del sistema en vez
# de la de marca, y nadie lo notaba hasta mirarlo de cerca.
rm -rf deploy/app/public/fonts && cp -r fonts deploy/app/public/fonts
# Panel privado del dueño (admin.gastrogoan.com, nunca enlazado desde ningún
# sitio público — ni buscado en Google, ni citado en la app). Emite
# licencias (app.html) y gestiona el Plan 360º de cada cliente (plan360.html).
cp -f admin-panel/*.html deploy/admin/public/
rm -rf deploy/admin/public/fonts && cp -r fonts deploy/admin/public/fonts
mkdir -p deploy/admin/public/css
cp -f css/tabler-icons.min.css deploy/admin/public/css/
echo "OK: deploy/ actualizado. Ahora commit y push."
