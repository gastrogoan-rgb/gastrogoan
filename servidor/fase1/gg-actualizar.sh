#!/usr/bin/env bash
# Baja de GitHub la última web de reservas y la deja en el sitio. Lo ejecuta el servidor solo, cada 5 minutos.
# NO usa llaves ni contraseñas: el repositorio es público y solo se LEE (nunca escribe en GitHub).
# Cada versión se guarda en su carpeta y «reservas» es un enlace que cambia de golpe a la nueva: nadie ve la web
# a medias, y volver atrás es cambiar el enlace. Si algo falla (sin red, GitHub caído, versión rota) NO se toca
# lo que ya estaba publicado.
set -euo pipefail
BASE="${GG_BASE:-/srv/gastrogoan}"
REPO="${GG_REPO:-https://github.com/gastrogoan-rgb/gastrogoan.git}"
RAMA="${GG_RAMA:-main}"
mkdir -p "$BASE/sitios/versiones" "$BASE/repo"
cd "$BASE/repo"
if [ ! -d .git ]; then
  git init -q
  git remote add origin "$REPO"
  git config core.sparseCheckout true
  printf 'deploy/reservas/public/\n' > .git/info/sparse-checkout   # solo esa carpeta, no el repositorio entero
fi
git fetch -q --depth 1 origin "$RAMA"
git reset -q --hard FETCH_HEAD
ORIGEN="$BASE/repo/deploy/reservas/public"
# Red de seguridad: sin la página principal no se publica nada.
[ -s "$ORIGEN/index.html" ] || { echo "gg-actualizar: falta index.html en $RAMA, no se publica" >&2; exit 1; }
HASH="$(git rev-parse --short HEAD)"
DEST="$BASE/sitios/versiones/$HASH"
if [ ! -s "$DEST/index.html" ]; then
  rm -rf "$DEST.tmp"; mkdir -p "$DEST.tmp"
  cp -a "$ORIGEN/." "$DEST.tmp/"
  rm -rf "$DEST"; mv "$DEST.tmp" "$DEST"
fi
# Cambio de golpe: el enlace nuevo se crea aparte y sustituye al anterior en un solo paso.
ln -sfn "versiones/$HASH" "$BASE/sitios/reservas.nuevo"
mv -T "$BASE/sitios/reservas.nuevo" "$BASE/sitios/reservas"
# Se guardan las 3 últimas versiones (para volver atrás) y se borra el resto.
ls -1dt "$BASE"/sitios/versiones/*/ 2>/dev/null | tail -n +4 | xargs -r rm -rf
echo "gg-actualizar: publicado $HASH $(date -Is)"
