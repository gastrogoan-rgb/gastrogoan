#!/usr/bin/env bash
# Comprueba la web de reservas en el servidor NUEVO antes de tocar el DNS.
# Uso:  bash servidor/fase1/comprobar.sh IP_DEL_SERVIDOR
# Pide la web a la IP nueva fingiendo el nombre (--resolve), sin cambiar nada en DNS.
set -uo pipefail
IP="${1:?Falta la IP del servidor}"
HOST=reservas.gastrogoan.com
fallos=0
ok(){ echo "✅ $1"; }; ko(){ echo "❌ $1"; fallos=$((fallos+1)); }

code=$(curl -s -o /tmp/gg-res.html -w '%{http_code}' --max-time 20 --resolve "$HOST:443:$IP" "https://$HOST/")
[ "$code" = "200" ] && ok "la página principal responde 200" || ko "la página principal responde $code"

grep -q "<html" /tmp/gg-res.html 2>/dev/null && ok "llega HTML de la web de reservas" || ko "no llega HTML"

ruta=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 --resolve "$HOST:443:$IP" "https://$HOST/casapaco")
[ "$ruta" = "200" ] && ok "el enlace corto /casapaco devuelve la web (no un 404)" || ko "enlace corto responde $ruta"

cab=$(curl -sI --max-time 20 --resolve "$HOST:443:$IP" "https://$HOST/" | tr -d '\r')
echo "$cab" | grep -qi "strict-transport-security" && ok "cabecera HSTS presente" || ko "falta HSTS"
echo "$cab" | grep -qi "x-content-type-options: nosniff" && ok "cabecera nosniff presente" || ko "falta nosniff"
echo "$cab" | grep -qi "x-frame-options" && ko "la web NO debe llevar X-Frame-Options (el restaurante la incrusta)" || ok "sin X-Frame-Options (se puede incrustar)"

tls=$(echo | timeout 15 openssl s_client -connect "$IP:443" -servername "$HOST" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null)
[ -n "$tls" ] && ok "certificado HTTPS válido: $tls" || ko "no hay certificado HTTPS válido todavía (¿ya se ha emitido? espera un minuto y repite)"

echo
[ "$fallos" = "0" ] && echo "Todo en orden. Lo siguiente es cambiar el DNS (ver docs/LALIGA-PUESTA-A-PUNTO.md)." || echo "$fallos comprobación(es) fallan: NO cambies el DNS todavía."
exit "$fallos"
