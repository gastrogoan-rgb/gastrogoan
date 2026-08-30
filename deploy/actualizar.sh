#!/bin/bash
# Copia lo recien construido a la carpeta de publicacion.
set -e
cd "$(dirname "$0")/.."
bash build.sh
cp dist/index.html dist/sw.js deploy/app/public/
cp dist/reservagastrogoan.html deploy/reservas/public/index.html

rm -rf deploy/reservas/public/fonts && cp -r dist/fonts deploy/reservas/public/
echo "OK: deploy/ actualizado. Ahora commit y push."
