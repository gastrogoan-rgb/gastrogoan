#!/bin/bash
# Copia lo recien construido a la carpeta de publicacion.
set -e
cd "$(dirname "$0")/.."
bash build.sh
cp dist/index.html dist/sw.js deploy/app/
cp dist/reservagastrogoan.html deploy/reservas/index.html
cp dist/_redirects deploy/reservas/
rm -rf deploy/reservas/fonts && cp -r dist/fonts deploy/reservas/
echo "OK: deploy/ actualizado. Ahora commit y push."
