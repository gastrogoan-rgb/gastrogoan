#!/usr/bin/env bash
# Corre la sonda de reglas permisivas contra tres juegos de reglas del emulador (26/11):
#   actuales (con topes) → sin aviso · 14/09 y 14/11 (antes del endurecimiento del 25/11) → aviso.
# Cada variante levanta su propio emulador; entre una y otra se asegura de que el anterior ha muerto (si sobrevive, mantiene las reglas viejas
# y el resultado depende de la carrera). Las reglas antiguas se sacan de git y se les quitan las claves "//" (el emulador no las admite).
set -uo pipefail
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TMP="$(mktemp -d)"; FALLO=0
limpiar(){ pkill -f "firebase emulators:start" 2>/dev/null; pkill -f "firebase-database-emulator.*--port 9000" 2>/dev/null; pkill -f "http.server 8951" 2>/dev/null; sleep 4; }
antiguas(){ git -C "$RAIZ" show "$1:reglas/reglas-de-cada-negocio.json" | python3 -c "
import json,sys
def q(o):
    if isinstance(o,dict): return {k:q(v) for k,v in o.items() if k!='//'}
    return o
json.dump(q(json.load(sys.stdin)),open('$2','w'))"; }
corre(){ # $1 etiqueta · $2 ESPERADO · $3 fichero de reglas ('' = las actuales)
  limpiar
  echo "== reglas $1"
  if [ -n "$3" ]; then REGLAS_NEGOCIO="$3" ESPERADO="$2" SOLO=topes-reglas.mjs bash "$RAIZ/test/emulador/run.sh"; else ESPERADO="$2" SOLO=topes-reglas.mjs bash "$RAIZ/test/emulador/run.sh"; fi || FALLO=1
}
antiguas d7ec9d59 "$TMP/0914.json"; antiguas f5ac6ab0 "$TMP/1114.json"
corre actuales con ""
corre "14/09" sin "$TMP/0914.json"
corre "antes del 25/11" sin "$TMP/1114.json"
limpiar; rm -rf "$TMP"
[ $FALLO = 0 ] && echo "topes de reglas: las tres variantes en orden" || echo "topes de reglas: FALLA alguna variante"
exit $FALLO
