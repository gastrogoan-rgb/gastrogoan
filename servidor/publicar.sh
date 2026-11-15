#!/bin/bash
# Sube al servidor lo que hay en deploy/ y el Worker de pagos, y reinicia pagos.
# Uso:  bash servidor/publicar.sh usuario@IP_DEL_SERVIDOR
# Antes: bash deploy/actualizar.sh  (regenera deploy/)
set -e
DEST="${1:?Falta usuario@servidor}"
cd "$(dirname "$0")/.."
for s in app reservas admin web; do
  rsync -az --delete "deploy/$s/public/" "$DEST:/srv/gastrogoan/sitios/$s/"
done
rsync -az servidor/Caddyfile servidor/docker-compose.yml "$DEST:/srv/gastrogoan/"
rsync -az servidor/pagos/servidor.mjs worker/pagos-worker.js worker/package.json "$DEST:/srv/gastrogoan/pagos/"
ssh "$DEST" 'cd /srv/gastrogoan && docker compose up -d && docker compose restart pagos && docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile'
echo "OK: publicado en $DEST"
