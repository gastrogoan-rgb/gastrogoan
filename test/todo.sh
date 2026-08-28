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
node test/visual-defectos.mjs      > "$SALIDA/defectos.txt" 2>&1 & P5=$!
node test/contraste.mjs            > "$SALIDA/contraste.txt" 2>&1 & P6=$!
node test/publica-visual.mjs       > "$SALIDA/publica.txt"  2>&1 & P7=$!
node test/extremos.mjs             > "$SALIDA/extremos.txt" 2>&1 & P8=$!
node test/recorridos.mjs           > "$SALIDA/recorridos.txt" 2>&1 & P9=$!
node test/pestanas.mjs             > "$SALIDA/pestanas.txt"  2>&1 & P10=$!
node test/acceso-alta.mjs          > "$SALIDA/acceso.txt"    2>&1 & P11=$!
node test/idiomas.mjs              > "$SALIDA/idiomas.txt"   2>&1 & P12=$!
node test/transversales.mjs        > "$SALIDA/transv.txt"    2>&1 & P13=$!
node test/modales.mjs              > "$SALIDA/modales.txt"   2>&1 & P14=$!
node test/pantallas-vacias.mjs     > "$SALIDA/vacias.txt"    2>&1 & P15=$!
node test/publica-volumen.mjs      > "$SALIDA/volumen.txt"   2>&1 & P16=$!
node test/formularios.mjs          > "$SALIDA/formularios.txt" 2>&1 & P17=$!
node test/errores.mjs             > "$SALIDA/errores.txt"     2>&1 & P18=$!
node test/bebidas.mjs             > "$SALIDA/bebidas.txt"     2>&1 & P19=$!
node test/idr.mjs                 > "$SALIDA/idr.txt"         2>&1 & P20=$!

echo "→ 20 pruebas corriendo a la vez…"
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
espera $P5 "defectos visuales (móvil/tablet/escritorio)" "$SALIDA/defectos.txt"  "nada que señalar"
espera $P6 "contraste del texto"                      "$SALIDA/contraste.txt" "contraste suficiente"
espera $P7 "web pública (3 pantallas)"                "$SALIDA/publica.txt"   "se ve bien"
espera $P8 "contenido extremo"                        "$SALIDA/extremos.txt"  "aguanta contenido largo"
espera $P9  "recorridos completos (de ingrediente a factura)" "$SALIDA/recorridos.txt" "recorridos completos pasaron"
espera $P10 "84 pestañas internas"                    "$SALIDA/pestanas.txt"  "nada que señalar"
espera $P11 "acceso y alta del negocio"               "$SALIDA/acceso.txt"    "nada que señalar"
espera $P12 "catalán e inglés"                        "$SALIDA/idiomas.txt"   "nada que señalar"
espera $P13 "cabecera, chat y ayuda"                  "$SALIDA/transv.txt"    "nada que señalar"
espera $P14 "ventanas emergentes"                     "$SALIDA/modales.txt"   "se comportan bien"
espera $P15 "pantallas vacías"                        "$SALIDA/vacias.txt"    "se comportan bien"
espera $P16 "web pública con carta grande"            "$SALIDA/volumen.txt"   "aguanta una carta grande"
espera $P17 "formularios: rellenar y guardar de verdad" "$SALIDA/formularios.txt" "casos pasaron"
espera $P18 "caminos de error (lo que debe rechazar)"    "$SALIDA/errores.txt"     "casos pasaron"
espera $P19 "fichas de bebida (sala)"                  "$SALIDA/bebidas.txt"     "casos pasaron"
espera $P20 "I+D (platos, menús y cartas)"             "$SALIDA/idr.txt"         "casos pasaron"

exit $FALLOS
