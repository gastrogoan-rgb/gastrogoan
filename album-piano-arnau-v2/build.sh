#!/usr/bin/env bash
# Ensambla el álbum completo en index.html a partir de las piezas.
set -e
cd "$(dirname "$0")"
OUT="index.html"
cat _head.html > "$OUT"
cat _front.html >> "$OUT"
for n in $(seq -w 1 20); do
  f="partials/dia${n}.html"
  if [ -f "$f" ]; then
    cat "$f" >> "$OUT"
  else
    echo "  ⚠️  Falta $f"
  fi
done
cat _tail.html >> "$OUT"
echo "✅ Generado $OUT ($(wc -l < "$OUT") líneas)"
