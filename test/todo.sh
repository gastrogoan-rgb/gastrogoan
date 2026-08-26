#!/usr/bin/env bash
# Toda la batería, EN PARALELO. Las cuatro pruebas grandes son
# independientes entre sí, así que encadenarlas solo servía para esperar:
# unos 20 minutos en serie contra el tiempo de la más lenta en paralelo.
set -uo pipefail
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RAIZ"
SALIDA="${TMPDIR:-/tmp}/gg_bateria"
rm -rf "$SALIDA"; mkdir -p "$SALIDA"

limpiar(){ [ -n "${PID_WEB:-}" ] && kill "$PID_WEB" 2>/dev/null; }
trap limpiar EXIT

# 1. Sintaxis: instantáneo, y si falla no merece la pena seguir.
for f in js/*.js; do
  node -c "$f" || { echo "❌ sintaxis en $f"; exit 1; }
done
echo "✅ sintaxis (todos los ficheros)"

# 2. Servidor para las pruebas de navegador
( python3 -m http.server 8950 >/dev/null 2>&1 ) & PID_WEB=$!
sleep 2

# 3. Las cuatro grandes, a la vez
node test/smoke.test.mjs           > "$SALIDA/smoke.txt"   2>&1 & P1=$!
node test/audit-active.mjs         > "$SALIDA/sync.txt"    2>&1 & P2=$!
node test/click-audit.mjs          > "$SALIDA/botones.txt" 2>&1 & P3=$!
node test/visual-audit.mjs         > "$SALIDA/visual.txt"  2>&1 & P4=$!

echo "→ 4 pruebas corriendo a la vez…"
FALLOS=0
espera(){ # pid, nombre, fichero, patrón de éxito
  wait "$1"
  if grep -qE "$4" "$3" 2>/dev/null; then echo "✅ $2"
  else echo "❌ $2 — ver $3"; tail -6 "$3"; FALLOS=1; fi
}
espera $P1 "cálculos (dinero, IVA, stock, recetas)" "$SALIDA/smoke.txt"   "✅ Todo OK"
espera $P2 "sincronización"                          "$SALIDA/sync.txt"    "Todas las pruebas activas"
espera $P3 "botones (248 en 30 pantallas)"           "$SALIDA/botones.txt" "Ninguno lanzó un error"
espera $P4 "responsive (6 tamaños × 24 vistas)"      "$SALIDA/visual.txt"  "Sin desbordamientos"

exit $FALLOS
