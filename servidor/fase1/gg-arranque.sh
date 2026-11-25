#!/usr/bin/env bash
# Se ejecuta UNA vez, al crear el servidor. Instala Caddy (descarga oficial con comprobación de huella), pone la
# dirección de prueba con la IP, publica la web y deja el temporizador de actualización en marcha.
# Va contando por la consola de Hetzner (>_) lo que hace y si algo falla, para poder ver dónde se paró.
# No depende de la versión de Ubuntu ni de Docker.
set -u
LOG=/var/log/gg-arranque.log
di(){ echo "GG-ARRANQUE: $*" | tee -a "$LOG" > /dev/console 2>/dev/null || echo "GG-ARRANQUE: $*" >> "$LOG"; }
fallo(){ di "FALLO en el paso: $1. Mira /var/log/gg-arranque.log"; exit 1; }
V=2.8.4
case "$(dpkg --print-architecture)" in
  amd64) ARQ=amd64; SUMA=b8bec15d14fb033562af9f207850027bcbaa1f891edc9efe00d38bf39e1bf9944f8b6b8eba041ddd4c171cd70c905174c704d705be2f23bc678fe1eaf37a2485 ;;
  arm64) ARQ=arm64; SUMA=5466234be3e988071cef937aedbdd94c15b6f75cf7307397e67c2641219ac9bfe2c2bb3b31fc05bc68d3b6398bbe50abfa16ccf3b127318ccac31115ad26507c ;;
  *) fallo "arquitectura no soportada" ;;
esac
di "1/5 descargando Caddy $V"
cd /tmp
curl -fsSL --retry 5 --retry-delay 5 -o caddy.tgz "https://github.com/caddyserver/caddy/releases/download/v$V/caddy_${V}_linux_${ARQ}.tar.gz" >>"$LOG" 2>&1 || fallo "descarga de Caddy"
echo "$SUMA  caddy.tgz" | sha512sum -c - >>"$LOG" 2>&1 || fallo "la huella de Caddy no coincide (descarga alterada)"
tar xzf caddy.tgz caddy >>"$LOG" 2>&1 || fallo "descomprimir Caddy"
install -m 0755 caddy /usr/local/bin/caddy
id caddy >/dev/null 2>&1 || useradd --system --home-dir /var/lib/caddy --create-home --shell /usr/sbin/nologin caddy
mkdir -p /etc/caddy/extra /srv/gastrogoan/sitios
di "2/5 preparando la dirección de prueba"
IP="$(curl -fsS --max-time 15 http://169.254.169.254/hetzner/v1/metadata/public-ipv4 2>>"$LOG" || true)"
if [ -n "$IP" ]; then
  printf '%s\n' "${IP//./-}.sslip.io {" "	import reservas" "}" > /etc/caddy/extra/prueba.caddy
  di "   IP del servidor: $IP -> https://${IP//./-}.sslip.io"
else
  di "   no se pudo leer la IP; la dirección de prueba no se crea (el servidor sigue)"
fi
di "3/5 descargando la web de reservas de GitHub"
/usr/local/bin/gg-actualizar >>"$LOG" 2>&1 || di "   primera descarga fallida: el temporizador lo reintentará cada 5 minutos"
di "4/5 arrancando Caddy"
systemctl daemon-reload
systemctl enable --now caddy >>"$LOG" 2>&1 || fallo "arrancar Caddy"
di "5/5 temporizador de actualización"
systemctl enable --now gg-actualizar.timer >>"$LOG" 2>&1 || fallo "temporizador"
sleep 5
if systemctl is-active --quiet caddy; then di "LISTO: Caddy en marcha. Abre https://${IP//./-}.sslip.io desde el móvil."; else fallo "Caddy no está activo"; fi
