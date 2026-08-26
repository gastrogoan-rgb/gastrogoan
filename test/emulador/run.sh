#!/usr/bin/env bash
# Levanta el emulador oficial de Firebase y corre la prueba de dos
# dispositivos sincronizando de verdad. Ver README.md de esta carpeta.
set -uo pipefail
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TRABAJO="${TMPDIR:-/tmp}/gg_emulador"
PUERTO_WEB=8951

limpiar(){
  [ -n "${PID_EMU:-}" ] && kill "$PID_EMU" 2>/dev/null
  [ -n "${PID_WEB:-}" ] && kill "$PID_WEB" 2>/dev/null
}
trap limpiar EXIT

mkdir -p "$TRABAJO"

# 1. Herramientas (se cachean entre ejecuciones)
if [ ! -x "$TRABAJO/fbtools/node_modules/.bin/firebase" ]; then
  echo "→ instalando firebase-tools…"
  mkdir -p "$TRABAJO/fbtools"
  echo '{"name":"fbtools","private":true,"version":"1.0.0"}' > "$TRABAJO/fbtools/package.json"
  (cd "$TRABAJO/fbtools" && npm install firebase-tools >/dev/null 2>&1)
fi
if [ ! -f "$TRABAJO/sdk/node_modules/firebase/firebase-app-compat.js" ]; then
  echo "→ bajando el SDK de Firebase desde npm…"
  mkdir -p "$TRABAJO/sdk"
  echo '{"name":"sdk","private":true,"version":"1.0.0"}' > "$TRABAJO/sdk/package.json"
  (cd "$TRABAJO/sdk" && npm install firebase@10.14.1 >/dev/null 2>&1)
fi

# 2. El SDK, servido en local. gstatic puede estar bloqueado; y al fichero
#    de Auth se le añade el enganche al emulador (solo en pruebas).
SDK="$TRABAJO/sdk/node_modules/firebase"
mkdir -p "$RAIZ/__sdk"
cp "$SDK/firebase-app-compat.js" "$SDK/firebase-database-compat.js" "$RAIZ/__sdk/"
cat "$SDK/firebase-auth-compat.js" > "$RAIZ/__sdk/firebase-auth-compat.js"
cat >> "$RAIZ/__sdk/firebase-auth-compat.js" <<'PATCH'

/* Solo para pruebas: manda la autenticación al emulador local. */
;(function(){
  try{
    var ns = (typeof firebase !== 'undefined') ? firebase : window.firebase;
    if(!ns || typeof ns.auth !== 'function') return;
    var orig = ns.auth;
    var wrapped = function(){
      var au = orig.apply(this, arguments);
      if(au && !au.__emu){ au.__emu = true; try{ au.useEmulator('http://127.0.0.1:9099', {disableWarnings:true}); }catch(e){} }
      return au;
    };
    for(var k in orig){ try{ wrapped[k] = orig[k]; }catch(e){} }
    Object.setPrototypeOf(wrapped, orig);
    ns.auth = wrapped;
  }catch(e){}
})();
PATCH

# 3. Configuración del emulador
mkdir -p "$TRABAJO/emu"
cat > "$TRABAJO/emu/firebase.json" <<'JSON'
{
  "database": { "rules": "database.rules.json" },
  "emulators": {
    "database": { "port": 9000, "host": "127.0.0.1" },
    "auth":     { "port": 9099, "host": "127.0.0.1" },
    "ui":       { "enabled": false }
  }
}
JSON
echo '{"rules":{".read":true,".write":true}}' > "$TRABAJO/emu/database.rules.json"

# 4. Arrancar. Se quita el proxy: el CLI habla con su propio emulador por
#    localhost y un proxy por medio le corta esa llamada.
echo "→ levantando los emuladores…"
( cd "$TRABAJO/emu" && env -u JAVA_TOOL_OPTIONS -u HTTPS_PROXY -u HTTP_PROXY \
    -u https_proxy -u http_proxy -u ALL_PROXY -u all_proxy \
    "$TRABAJO/fbtools/node_modules/.bin/firebase" emulators:start \
    --only database,auth --project demo-gastrogoan > "$TRABAJO/emu.log" 2>&1 ) &
PID_EMU=$!

( cd "$RAIZ" && python3 -m http.server "$PUERTO_WEB" >/dev/null 2>&1 ) &
PID_WEB=$!

for i in $(seq 1 30); do
  db=$(curl -s --noproxy '*' -o /dev/null -w '%{http_code}' "http://127.0.0.1:9000/.json?ns=demo-gastrogoan" 2>/dev/null)
  au=$(curl -s --noproxy '*' -o /dev/null -w '%{http_code}' "http://127.0.0.1:9099/" 2>/dev/null)
  [ "$db" = "200" ] && [ "$au" = "200" ] && break
  sleep 3
done
if [ "${db:-}" != "200" ] || [ "${au:-}" != "200" ]; then
  echo "❌ los emuladores no arrancaron. Log en $TRABAJO/emu.log"; tail -20 "$TRABAJO/emu.log"; exit 1
fi
echo "→ emuladores listos (database:9000, auth:9099)"

node "$RAIZ/test/emulador/sync-real.mjs"
SALIDA=$?
rm -rf "$RAIZ/__sdk"
exit $SALIDA
