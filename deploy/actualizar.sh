#!/bin/bash
# Copia lo recien construido a la carpeta de publicacion.
set -e
cd "$(dirname "$0")/.."
bash build.sh
cp dist/index.html dist/sw.js dist/version.json deploy/app/public/
cp dist/reservagastrogoan.html deploy/reservas/public/index.html
# El _redirects de la web de reservas se mantiene a mano en deploy/ (no sale
# de dist/): es configuración del hosting, no del producto.
# La misma pagina como 404: el hosting la sirve cuando la direccion no es un
# archivo, y asi el enlace corto (reservas.gastrogoan.com/casapaco) funciona
# sin depender de reglas de redireccion, que cada proveedor entiende a su
# manera -o directamente rechaza-.
cp dist/reservagastrogoan.html deploy/reservas/public/404.html
rm -rf deploy/reservas/public/fonts && cp -r dist/fonts deploy/reservas/public/
echo "OK: deploy/ actualizado. Ahora commit y push."
