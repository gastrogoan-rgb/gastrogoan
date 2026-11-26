#!/usr/bin/env bash
# Corre SOLO test/emulador/ventas-nube.mjs con su PROPIO emulador, en otros puertos (db 9100, auth 9199, web 8961) y su propia
# carpeta de trabajo: así no choca con `run.sh` (que usa 9000/9099/8951 y borra `__sdk` al terminar) si dos sesiones lo lanzan a la vez.
set -uo pipefail
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BASE="${TMPDIR:-/tmp}/gg_emulador"        # firebase-tools y SDK ya instalados por run.sh
TRABAJO="${TMPDIR:-/tmp}/gg_emulador_vn"
export VN_DB=9100 VN_AUTH=9199 VN_WEB=8961
SDKDIR="__sdk_vn"
limpiar(){ [ -n "${PID_EMU:-}" ] && kill "$PID_EMU" 2>/dev/null; [ -n "${PID_WEB:-}" ] && kill "$PID_WEB" 2>/dev/null; pkill -f "port=$VN_DB" 2>/dev/null; rm -rf "$RAIZ/$SDKDIR"; }
trap limpiar EXIT
[ -x "$BASE/fbtools/node_modules/.bin/firebase" ] || { echo "❌ falta $BASE (corre una vez test/emulador/run.sh)"; exit 1; }
SDK="$BASE/sdk/node_modules/firebase"
mkdir -p "$RAIZ/$SDKDIR"
cp "$SDK/firebase-app-compat.js" "$SDK/firebase-database-compat.js" "$RAIZ/$SDKDIR/"
{ cat "$SDK/firebase-auth-compat.js"; echo
  sed -n "/<<'PATCH'/,/^PATCH\$/p" "$RAIZ/test/emulador/run.sh" | sed '1d;$d' | sed "s/9099/$VN_AUTH/g; s/127.0.0.1:9000/127.0.0.1:$VN_DB/g"
} > "$RAIZ/$SDKDIR/firebase-auth-compat.js"
mkdir -p "$TRABAJO/emu"
cat > "$TRABAJO/emu/firebase.json" <<JSON
{ "database": [ {"instance":"demo-gastrogoan","rules":"database.rules.json"}, {"instance":"demo-plataforma","rules":"plataforma.rules.json"} ],
  "emulators": { "database": {"port": $VN_DB, "host":"127.0.0.1"}, "auth": {"port": $VN_AUTH, "host":"127.0.0.1"}, "hub": {"port": 4410, "host":"127.0.0.1"}, "logging": {"port": 4510, "host":"127.0.0.1"}, "ui": {"enabled": false} } }
JSON
cp "$RAIZ/reglas/reglas-de-cada-negocio.json" "$TRABAJO/emu/database.rules.json"
cp "$RAIZ/reglas/reglas-de-la-plataforma.json" "$TRABAJO/emu/plataforma.rules.json"
( cd "$TRABAJO/emu" && env -u JAVA_TOOL_OPTIONS -u HTTPS_PROXY -u HTTP_PROXY -u https_proxy -u http_proxy "$BASE/fbtools/node_modules/.bin/firebase" emulators:start --only database,auth --project demo-gastrogoan > "$TRABAJO/emu.log" 2>&1 ) &
PID_EMU=$!
( cd "$RAIZ" && python3 -m http.server "$VN_WEB" >/dev/null 2>&1 ) & PID_WEB=$!
for i in $(seq 1 30); do
  db=$(curl -s --noproxy '*' -o /dev/null -w '%{http_code}' "http://127.0.0.1:$VN_DB/.json?ns=demo-gastrogoan"); au=$(curl -s --noproxy '*' -o /dev/null -w '%{http_code}' "http://127.0.0.1:$VN_AUTH/")
  { [ "$db" = "200" ] || [ "$db" = "401" ]; } && [ "$au" = "200" ] && break; sleep 2
done
[ "$au" = "200" ] || { echo "❌ el emulador no arrancó"; strings "$TRABAJO/emu.log" | tail; exit 1; }
node "$RAIZ/test/emulador/ventas-nube.mjs" "$@"; exit $?
