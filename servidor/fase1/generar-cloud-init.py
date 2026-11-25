#!/usr/bin/env python3
"""Genera cloud-init.yaml (el texto que se pega en «user data» al crear el servidor) a partir de los ficheros de esta
carpeta, para que NUNCA se desincronicen: se edita Caddyfile / gg-actualizar.sh / docker-compose.yml y se regenera.
Uso:  python3 servidor/fase1/generar-cloud-init.py"""
import pathlib
aqui = pathlib.Path(__file__).parent

def bloque(ruta, destino, modo="0644"):
    texto = (aqui / ruta).read_text(encoding="utf-8")
    cuerpo = "\n".join(("      " + l) if l.strip() else "" for l in texto.rstrip("\n").split("\n"))
    return f"  - path: {destino}\n    permissions: '{modo}'\n    content: |\n{cuerpo}\n"

def inline(destino, texto, modo="0644"):
    cuerpo = "\n".join(("      " + l) if l.strip() else "" for l in texto.rstrip("\n").split("\n"))
    return f"  - path: {destino}\n    permissions: '{modo}'\n    content: |\n{cuerpo}\n"

servicio = """[Unit]
Description=GastroGoan: bajar la última web de reservas de GitHub
After=network-online.target
Wants=network-online.target
[Service]
Type=oneshot
ExecStart=/usr/local/bin/gg-actualizar
"""
temporizador = """[Unit]
Description=GastroGoan: comprobar cada 5 minutos si hay web nueva
[Timer]
OnBootSec=1min
OnUnitActiveSec=5min
Persistent=true
[Install]
WantedBy=timers.target
"""
cabecera = """#cloud-config
# GastroGoan · servidor de la FASE 1 (web de reservas en IP propia). Ubuntu 24.04 LTS.
# GENERADO por servidor/fase1/generar-cloud-init.py: no editar a mano.
#
# Se pega en el campo «User data» (Cloud config) al crear el servidor en Hetzner. NO lleva llaves ni contraseñas.
# Qué deja hecho: firewall (solo 80 y 443; el puerto 22 de entrada está CERRADO), actualizaciones de seguridad
# automáticas, Caddy con HTTPS automático y un temporizador que cada 5 minutos baja de GitHub la última web de
# reservas. Sin acceso remoto por SSH: si algún día hiciera falta tocarlo, se borra y se vuelve a crear con este mismo
# texto (tarda unos 3 minutos y no se pierde nada: los datos viven en Firebase, no aquí).
timezone: Europe/Madrid
package_update: true
package_upgrade: true
packages:
  - ufw
  - unattended-upgrades
  - docker.io
  - docker-compose-v2
  - git
  - curl
ssh_pwauth: false
write_files:
"""
arranque = """#!/usr/bin/env bash
# Se ejecuta UNA vez al crear el servidor: pone la dirección de prueba con la IP y arranca todo.
set -eu
mkdir -p /srv/gastrogoan/extra /srv/gastrogoan/sitios
IP="$(curl -fsS --max-time 15 http://169.254.169.254/hetzner/v1/metadata/public-ipv4 || true)"
if [ -n "$IP" ]; then
  printf '%s\\n' "${IP//./-}.sslip.io {" "	import reservas" "}" > /srv/gastrogoan/extra/prueba.caddy
  echo "$IP" > /srv/gastrogoan/IP.txt
fi
/usr/local/bin/gg-actualizar || echo "primera publicación fallida: el temporizador lo reintentará"
cd /srv/gastrogoan && docker compose up -d
systemctl daemon-reload
systemctl enable --now gg-actualizar.timer
"""
salida = cabecera
salida += bloque("Caddyfile", "/srv/gastrogoan/Caddyfile")
salida += bloque("docker-compose.yml", "/srv/gastrogoan/docker-compose.yml")
salida += bloque("gg-actualizar.sh", "/usr/local/bin/gg-actualizar", "0755")
salida += inline("/usr/local/bin/gg-arranque", arranque, "0755")
salida += inline("/etc/systemd/system/gg-actualizar.service", servicio)
salida += inline("/etc/systemd/system/gg-actualizar.timer", temporizador)
salida += inline("/etc/apt/apt.conf.d/20auto-upgrades", 'APT::Periodic::Update-Package-Lists "1";\nAPT::Periodic::Unattended-Upgrade "1";')
salida += """runcmd:
  - [ bash, -c, "ufw default deny incoming && ufw default allow outgoing && ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 443/udp && ufw --force enable" ]
  - [ systemctl, enable, --now, docker ]
  - [ /usr/local/bin/gg-arranque ]
"""
(aqui / "cloud-init.yaml").write_text(salida, encoding="utf-8")
print("cloud-init.yaml generado:", len(salida.encode()), "bytes (el límite de Hetzner es 32.768)")
