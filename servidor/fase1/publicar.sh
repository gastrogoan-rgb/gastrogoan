#!/usr/bin/env bash
# Sube la web de reservas al servidor de la fase 1 y la deja en marcha.
# Uso:  bash servidor/fase1/publicar.sh gastro@IP_DEL_SERVIDOR
# Antes: bash deploy/actualizar.sh  (regenera deploy/reservas/public)
set -euo pipefail
DEST="${1:?Falta gastro@IP_DEL_SERVIDOR}"
cd "$(dirname "$0")/../.."
rsync -az --delete deploy/reservas/public/ "$DEST:/srv/gastrogoan/sitios/reservas/"
rsync -az servidor/fase1/Caddyfile servidor/fase1/docker-compose.yml "$DEST:/srv/gastrogoan/"
ssh "$DEST" 'cd /srv/gastrogoan && docker compose up -d && docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile'
echo "OK: web de reservas publicada en $DEST"
echo "Ahora comprueba: bash servidor/fase1/comprobar.sh IP_DEL_SERVIDOR"
