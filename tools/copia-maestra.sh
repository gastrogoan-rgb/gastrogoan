#!/usr/bin/env bash
# Copia maestra de GastroGoan (25/11): todo lo que NO se puede reconstruir de memoria si se pierde el acceso a GitHub,
# a Cloudflare o a este equipo. NO lleva contraseñas ni claves (no las hay en el repositorio): esas van en el gestor
# de contraseñas. Uso:  bash tools/copia-maestra.sh [carpeta-de-destino]
# Resultado: UNA carpeta con fecha que se guarda en 3 sitios (ver docs/GUIA-PARA-EL-DUENO.md, sección 5).
set -euo pipefail
cd "$(dirname "$0")/.."
DESTINO="${1:-$HOME/copias-gastrogoan}"
FECHA="$(date +%Y-%m-%d_%H%M)"
D="$DESTINO/copia-maestra-$FECHA"
mkdir -p "$D"

# Un clon recortado (como el de las sesiones en la nube) daría un paquete que NO se puede restaurar: se completa antes.
if [ "$(git rev-parse --is-shallow-repository)" = "true" ]; then git fetch --unshallow origin >/dev/null 2>&1 || { echo "No se pudo completar el historial: copia NO válida"; exit 1; }; fi

# 1) El repositorio ENTERO con todo su historial, en un solo fichero que se restaura con `git clone`.
git bundle create "$D/gastrogoan.bundle" --all >/dev/null 2>&1

# 2) Los ficheros maestros sueltos, para poder abrirlos sin git: reglas de Firebase (plataforma y negocio),
#    generador de licencias, Worker de pagos, kit de servidor, panel de admin, documentos legales y guías.
tar czf "$D/ficheros-maestros.tgz" \
  reglas database.rules.propuesta.json generador-licencias.html worker servidor admin-panel legal \
  deploy/README.md deploy/actualizar.sh build.sh CLAUDE.md ANALISIS_GENERAL.md docs reports/Plan\ 360\ sublime.md \
  2>/dev/null || true

# 3) Las tres copias de las reglas, fuera de cualquier paquete, a la vista.
mkdir -p "$D/reglas"
cp -f reglas/*.json "$D/reglas/" 2>/dev/null || true
cp -f database.rules.propuesta.json "$D/reglas/" 2>/dev/null || true

# 4) Huellas, para comprobar dentro de un año que la copia no se ha estropeado.
( cd "$D" && sha256sum gastrogoan.bundle ficheros-maestros.tgz > SHA256.txt )

cat > "$D/LEEME.txt" <<TXT
Copia maestra de GastroGoan · $FECHA
Rama y último cambio: $(git rev-parse --abbrev-ref HEAD) · $(git log -1 --format='%h %s' | cut -c1-80)

Cómo restaurar el proyecto entero en otro equipo:
  git clone gastrogoan.bundle gastrogoan
  cd gastrogoan && bash build.sh

Contenido:
  gastrogoan.bundle        repositorio completo con todo su historial
  ficheros-maestros.tgz    reglas, generador de licencias, Worker de pagos, servidor, panel, legal y guías
  reglas/                  las reglas de Firebase, a la vista
  SHA256.txt               huellas para comprobar que nada se ha estropeado

NO está aquí (se guarda aparte, a mano):
  - Contraseñas, claves de Stripe y del Worker, códigos de recuperación -> gestor de contraseñas.
  - El registro de licencias (issuedCodes, ownerNames, codeClaims, adminSalesLog) -> exportar JSON desde la consola de Firebase de la plataforma.
  - La configuración de Cloudflare (proyectos de Pages, DNS, variables del Worker) -> capturas o exportación apuntada.
TXT
echo "Copia creada en: $D"
du -sh "$D" | cut -f1
