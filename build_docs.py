#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Genera los PDF de GastroGoan a partir de sus .md, con el diseño de la app.

Sustituye a build_pdf.py y build_docs_pdf.py, que dibujaban el PDF a mano con
fpdf: aquello obligaba a reimplementar en Python cada decisión de diseño, y
aun así el resultado no se parecía a la app -paleta naranja y esquinas
redondeadas, de una versión anterior de la marca-. Aquí el documento se
maqueta en HTML/CSS reutilizando el MISMO sistema de diseño que css/styles.css
(negro humo, verde oliva, esquinas rectas, Schibsted Grotesk + IBM Plex Mono)
y lo imprime Chromium, que ya sabe paginar, cortar y componer tipografía.

Las tipografías van incrustadas en base64: el PDF tiene que verse igual en el
ordenador del cliente, y el HTML intermedio no puede depender de que haya red
al generarlo.

    python3 build_docs.py                 # todos
    python3 build_docs.py MENSAJE-VENTA.md
    python3 build_docs.py --html          # deja también el .html (para depurar)
"""
import base64
import re
import subprocess
import sys
from pathlib import Path

import markdown

RAIZ = Path(__file__).parent
FUENTES = RAIZ / "assets" / "fonts"

DOCUMENTOS = [
    "DOCS-CLIENTE-puesta-en-marcha.md",
    "DOCS-CLIENTE-bienvenida.md",
    "DOCS-INTERNO-vender.md",
    "MENSAJE-VENTA.md",
]

# Tomados tal cual de css/styles.css — si allí cambia la marca, cambiarlos aquí.
PALETA = {
    "negro": "#1C1A17",
    "oliva": "#4A5D4E",
    "oliva_claro": "#7E9B84",
    "crema": "#F1EFE9",
    "fondo": "#FAF8F4",
    "borde": "#E7E2D9",
    "cuerpo": "#3D3A34",
    "apagado": "#8A857C",
    "rojo": "#8A4A3B",
    "rojo_claro": "#F5EBE7",
}


def fuentes_css():
    """@font-face con los .ttf incrustados, para no depender de la red."""
    piezas = []
    for archivo, familia, peso in [
        ("SchibstedGrotesk-400.ttf", "Schibsted Grotesk", 400),
        ("SchibstedGrotesk-500.ttf", "Schibsted Grotesk", 500),
        ("SchibstedGrotesk-600.ttf", "Schibsted Grotesk", 600),
        ("SchibstedGrotesk-700.ttf", "Schibsted Grotesk", 700),
        ("IBMPlexMono-400.ttf", "IBM Plex Mono", 400),
        ("IBMPlexMono-500.ttf", "IBM Plex Mono", 500),
    ]:
        ruta = FUENTES / archivo
        if not ruta.exists():
            continue
        b64 = base64.b64encode(ruta.read_bytes()).decode()
        piezas.append(
            f"@font-face{{font-family:'{familia}';font-style:normal;font-weight:{peso};"
            f"src:url(data:font/ttf;base64,{b64}) format('truetype')}}"
        )
    return "\n".join(piezas)


def leer_meta(texto):
    """Metadatos del comentario HTML de cabecera (titulo, subtitulo, kicker...)."""
    meta = {}
    m = re.match(r"\s*<!--(.*?)-->", texto, re.S)
    if m:
        for linea in m.group(1).strip().split("\n"):
            if ":" in linea:
                k, v = linea.split(":", 1)
                meta[k.strip()] = v.strip()
        texto = texto[m.end():]
    return meta, texto


def clasificar_avisos(html):
    """Marca como aviso las citas que empiezan por 'Importante' o similar.

    En el Markdown todo son blockquotes, que es lo natural de escribir; la
    distinción visual entre "consejo" y "advertencia" se deduce aquí en vez de
    obligar a inventar una sintaxis rara al redactar.
    """
    def sustituir(m):
        interior = m.group(1)
        plano = re.sub(r"<[^>]+>", "", interior).strip().lower()
        clase = "aviso" if plano.startswith(("importante", "ojo", "cuidado", "atención", "nunca")) else "nota"
        return f'<blockquote class="{clase}">{interior}</blockquote>'
    return re.sub(r"<blockquote>(.*?)</blockquote>", sustituir, html, flags=re.S)


def numerar_pasos(html):
    """Da a los <h2> de tipo 'Paso N — Título' su número como elemento propio."""
    def sustituir(m):
        cuerpo = m.group(1)
        mp = re.match(r"Paso\s+(\d+)\s*[—-]\s*(.*)", cuerpo)
        if mp:
            return f'<h2 class="con-paso"><span class="paso-num">{mp.group(1)}</span>{mp.group(2)}</h2>'
        return f"<h2>{cuerpo}</h2>"
    return re.sub(r"<h2>(.*?)</h2>", sustituir, html, flags=re.S)


def plantilla(meta, cuerpo, privado):
    acento = PALETA["rojo"] if privado else PALETA["oliva"]
    titulo = meta.get("titulo", "GastroGoan")
    subtitulo = meta.get("subtitulo", "")
    kicker = meta.get("kicker", "GastroGoan")
    resumen = meta.get("resumen", "")

    aviso_privado = (
        f'<div class="sello-privado">Documento privado · no lo compartas con ningún cliente</div>'
        if privado else ""
    )

    return f"""<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>{titulo}</title><style>
{fuentes_css()}
*{{margin:0;padding:0;box-sizing:border-box}}
@page{{size:A4;margin:18mm 0 20mm 0}}
@page portada{{margin:0}}
html{{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
body{{
  font-family:'Schibsted Grotesk',system-ui,sans-serif;
  font-size:10.5pt;line-height:1.62;color:{PALETA['cuerpo']};
  background:#fff;
}}
.hoja{{padding:0 20mm}}
.hoja>*:first-child{{margin-top:0}}

/* ---------- Portada ---------- */
.portada{{
  page:portada;break-after:page;
  background:{PALETA['negro']};color:{PALETA['crema']};
  height:277mm;padding:0 20mm 42mm 20mm;
  display:flex;flex-direction:column;justify-content:flex-end;
}}
.kicker{{
  font-family:'IBM Plex Mono',monospace;font-size:8pt;font-weight:500;
  letter-spacing:.22em;text-transform:uppercase;color:{PALETA['oliva_claro']};
  margin-bottom:11mm;
}}
.portada h1{{
  font-size:31pt;font-weight:700;line-height:1.08;letter-spacing:-.022em;
  color:#fff;max-width:19cm;
}}
.regla{{width:26mm;height:2.5px;background:{acento};margin:8mm 0 6mm 0}}
.portada .sub{{font-size:12pt;font-weight:400;color:#CFCBC2;max-width:14cm;line-height:1.5}}
.portada .resumen{{
  font-family:'IBM Plex Mono',monospace;font-size:8.5pt;color:{PALETA['oliva_claro']};
  margin-top:9mm;letter-spacing:.01em;
}}
.sello-privado{{
  display:inline-block;margin-top:9mm;padding:2.5mm 4mm;
  background:{PALETA['rojo']};color:#fff;
  font-family:'IBM Plex Mono',monospace;font-size:8pt;font-weight:500;
  letter-spacing:.1em;text-transform:uppercase;
}}

/* ---------- Jerarquía ---------- */
h2{{
  font-size:16.5pt;font-weight:700;color:{PALETA['negro']};letter-spacing:-.015em;
  margin:12mm 0 1mm 0;line-height:1.2;break-after:avoid;
}}
h2:first-of-type{{margin-top:2mm}}
h2.con-paso{{padding-left:16mm;position:relative;min-height:11mm}}
h2 .paso-num{{
  position:absolute;left:0;top:-1mm;
  width:11mm;height:11mm;background:{acento};color:#fff;
  display:flex;align-items:center;justify-content:center;
  font-family:'IBM Plex Mono',monospace;font-size:13pt;font-weight:500;
}}
h2 + p em:first-child{{
  font-family:'IBM Plex Mono',monospace;font-style:normal;font-size:8.5pt;
  letter-spacing:.14em;text-transform:uppercase;color:{PALETA['apagado']};
}}
h2 + p:has(em:only-child){{margin:0 0 6mm 0}}
h3{{
  font-size:11.5pt;font-weight:600;color:{PALETA['negro']};
  margin:8mm 0 2.5mm 0;break-after:avoid;
}}
p{{margin:0 0 3.2mm 0}}
strong{{font-weight:600;color:{PALETA['negro']}}}
a{{color:{PALETA['oliva']};text-decoration:none;border-bottom:1px solid {PALETA['borde']}}}
code{{
  font-family:'IBM Plex Mono',monospace;font-size:9pt;
  background:{PALETA['crema']};color:{PALETA['negro']};padding:.3mm .9mm;
}}
hr{{border:0;border-top:1px solid {PALETA['borde']};margin:10mm 0}}

/* ---------- Listas ---------- */
ul,ol{{margin:0 0 4mm 0;padding:0;list-style:none}}
li{{position:relative;padding-left:8mm;margin-bottom:2.6mm;break-inside:avoid}}
ul>li::before{{
  content:'';position:absolute;left:1.5mm;top:2.2mm;
  width:2mm;height:2mm;background:{acento};
}}
ol{{counter-reset:paso}}
ol>li{{counter-increment:paso;padding-left:9mm}}
ol>li::before{{
  content:counter(paso);position:absolute;left:0;top:.1mm;
  font-family:'IBM Plex Mono',monospace;font-size:9pt;font-weight:500;
  color:{acento};
}}

/* ---------- Avisos ---------- */
blockquote{{
  margin:5mm 0;padding:4mm 5mm;background:{PALETA['crema']};
  border-left:2.5px solid {acento};break-inside:avoid;
  font-size:10pt;color:{PALETA['cuerpo']};
}}
blockquote.aviso{{background:{PALETA['rojo_claro']};border-left-color:{PALETA['rojo']}}}
blockquote p:last-child{{margin-bottom:0}}

/* ---------- Tablas ---------- */
table{{
  width:100%;border-collapse:collapse;margin:5mm 0 7mm 0;
  font-size:9.5pt;break-inside:avoid;
}}
th{{
  background:{PALETA['negro']};color:{PALETA['crema']};
  font-family:'IBM Plex Mono',monospace;font-weight:500;font-size:8pt;
  letter-spacing:.11em;text-transform:uppercase;
  text-align:left;padding:3mm 3.5mm;
}}
td{{padding:3mm 3.5mm;border-bottom:1px solid {PALETA['borde']};vertical-align:top}}
tbody tr:nth-child(even){{background:{PALETA['fondo']}}}
td:first-child{{color:{PALETA['negro']};font-weight:500}}

</style></head><body>
<div class="portada">
  <div class="kicker">{kicker}</div>
  <h1>{titulo}</h1>
  <div class="regla"></div>
  {f'<div class="sub">{subtitulo}</div>' if subtitulo else ''}
  {f'<div class="resumen">{resumen}</div>' if resumen else ''}
  {aviso_privado}
</div>
<div class="hoja">
{cuerpo}
</div>
</body></html>"""


def render(md_path, guardar_html=False):
    texto = md_path.read_text(encoding="utf-8")
    meta, cuerpo_md = leer_meta(texto)

    # Si no hay metadatos, se deducen del primer # del documento
    lineas = cuerpo_md.strip().split("\n")
    if "titulo" not in meta and lineas and lineas[0].startswith("# "):
        meta["titulo"] = quitar_emoji(lineas[0][2:].strip())
        cuerpo_md = "\n".join(lineas[1:])

    privado = "PRIVADO" in texto[:500].upper()

    html_cuerpo = markdown.markdown(
        quitar_emoji(cuerpo_md),
        extensions=["tables", "sane_lists", "attr_list"],
    )
    html_cuerpo = clasificar_avisos(html_cuerpo)
    html_cuerpo = numerar_pasos(html_cuerpo)

    html = plantilla(meta, html_cuerpo, privado)
    # La extensión TIENE que ser .html: con cualquier otra, Chromium abre el
    # archivo como texto plano y "imprime" el código fuente del documento.
    html_path = md_path.with_name(md_path.stem + ".__tmp__.html")
    html_path.write_text(html, encoding="utf-8")

    pdf_path = RAIZ / meta["archivo"] if meta.get("archivo") else md_path.with_suffix(".pdf")
    subprocess.run(
        ["node", str(RAIZ / "tools" / "html2pdf.mjs"), str(html_path), str(pdf_path),
         meta.get("titulo", md_path.stem), "privado" if privado else "normal"],
        check=True,
    )
    if guardar_html:
        html_path.rename(md_path.with_suffix(".preview.html"))
    else:
        html_path.unlink()
    return pdf_path


EMOJI = re.compile(
    "[\U0001F000-\U0001FAFF\U00002600-\U000027BF\U0001F1E6-\U0001F1FF️‍]+"
)


def quitar_emoji(texto):
    """Los emoji de los .md no encajan con el diseño y no están en las fuentes."""
    texto = EMOJI.sub("", texto)
    # Limpia los espacios que dejan al desaparecer de un encabezado o celda
    texto = re.sub(r"(^|\n)(#{1,4})\s+", r"\1\2 ", texto)
    texto = re.sub(r"\|\s{2,}", "| ", texto)
    return texto


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    guardar_html = "--html" in sys.argv
    for nombre in (args or DOCUMENTOS):
        md = RAIZ / nombre
        if not md.exists():
            print(f"  No existe {nombre}")
            continue
        salida = render(md, guardar_html)
        kb = salida.stat().st_size // 1024
        print(f"OK  {salida.name}  ({kb} KB)")
