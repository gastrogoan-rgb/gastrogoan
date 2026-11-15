#!/usr/bin/env bash
# Regenera TODA la web comercial en orden. seo.py va el último: los generadores parten de git y
# dejarían las páginas sin título ni datos para Google.
set -e
cd "$(dirname "$0")/../.."
python3 tools/web-parche/inicio.py
python3 tools/web-parche/asesoria.py
python3 tools/web-parche/app.py
python3 tools/web-parche/eventos.py
python3 tools/web-parche/legal.py
python3 tools/web-parche/seo.py
