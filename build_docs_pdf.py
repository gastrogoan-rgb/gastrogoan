#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Convierte a PDF los documentos en Markdown del proyecto.

La Guía de puesta en marcha tiene su propio script (build_pdf.py) porque su
maquetación está escrita a mano paso a paso. Este de aquí es para los que sí
nacen de un .md y hay que mantener al día cuando cambia el texto:

    DOCS-CLIENTE-bienvenida.md   → se entrega al cliente
    DOCS-INTERNO-vender.md       → PRIVADO, manual de venta
    MENSAJE-VENTA.md             → material comercial

Antes no había forma de regenerarlos: los .pdf estaban en el repositorio pero
no el script que los hacía, así que al cambiar el texto se quedaban atrás sin
que nada avisara. Uso:

    python3 build_docs_pdf.py            # todos
    python3 build_docs_pdf.py MENSAJE-VENTA.md
"""
import re
import sys
import unicodedata
from pathlib import Path

from fpdf import FPDF
from fpdf.enums import XPos, YPos

RAIZ = Path(__file__).parent
FONT_DIR = "/usr/share/fonts/truetype/dejavu"

ORANGE = (223, 112, 57)
CREAM = (246, 237, 213)
DARK = (40, 40, 40)
MUTED = (110, 110, 110)
RED = (192, 57, 43)

MARGEN = 16
DOCUMENTOS = [
    "DOCS-CLIENTE-bienvenida.md",
    "DOCS-INTERNO-vender.md",
    "MENSAJE-VENTA.md",
]


# DejaVu no trae emoji: si se cuelan, fpdf falla o pinta cuadros vacíos. Se
# quitan (más los selectores de variación y los espacios de ancho cero que
# suelen venir pegados a ellos), pero se respetan los símbolos que la fuente
# SÍ tiene y que dan significado al texto: €, ·, flechas, comillas...
CONSERVAR = set("€·—–…«»“”‘’→←↑↓✓×≥≤≈")


def limpiar(texto):
    salida = []
    for ch in texto:
        if ch in CONSERVAR or ch in "\n\t":
            salida.append(ch)
            continue
        cat = unicodedata.category(ch)
        # Símbolos "otros" (So) y de formato (Cf) es donde caen los emoji
        if cat in ("So", "Cf") or ord(ch) > 0x2500:
            continue
        salida.append(ch)
    return "".join(salida).strip()


class PDF(FPDF):
    def __init__(self, titulo, privado):
        super().__init__()
        self.titulo = titulo
        self.privado = privado

    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("DejaVu", "B", 9)
        self.set_text_color(*(RED if self.privado else ORANGE))
        etiqueta = f"{self.titulo}  ·  PRIVADO" if self.privado else self.titulo
        self.cell(0, 8, etiqueta, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_draw_color(*CREAM)
        self.set_line_width(0.5)
        self.line(MARGEN, self.get_y(), self.w - MARGEN, self.get_y())
        self.ln(3)

    def footer(self):
        self.set_y(-14)
        self.set_font("DejaVu", "", 8)
        self.set_text_color(*MUTED)
        self.cell(0, 10, f"Página {self.page_no()}", align="C")


def escribir_richtext(pdf, texto, alto=6, tam=11):
    """Pinta una línea respetando **negrita** y `código`."""
    partes = re.split(r"(\*\*.+?\*\*|`.+?`)", texto)
    for parte in partes:
        if not parte:
            continue
        if parte.startswith("**") and parte.endswith("**"):
            pdf.set_font("DejaVu", "B", tam)
            pdf.write(alto, parte[2:-2])
        elif parte.startswith("`") and parte.endswith("`"):
            pdf.set_font("DejaVu", "", tam)
            pdf.set_text_color(*ORANGE)
            pdf.write(alto, parte[1:-1])
            pdf.set_text_color(*DARK)
        else:
            pdf.set_font("DejaVu", "", tam)
            pdf.write(alto, parte)
    pdf.ln(alto)


def ancho_util(pdf):
    return pdf.w - 2 * MARGEN


def tabla(pdf, filas):
    """Tabla simple: primera fila es la cabecera."""
    if not filas:
        return
    ncols = max(len(f) for f in filas)
    # La primera columna suele llevar la etiqueta corta; se le da menos sitio.
    if ncols == 2:
        anchos = [ancho_util(pdf) * 0.34, ancho_util(pdf) * 0.66]
    else:
        anchos = [ancho_util(pdf) / ncols] * ncols

    pdf.ln(1)
    for i, fila in enumerate(filas):
        cabecera = i == 0
        celdas = list(fila) + [""] * (ncols - len(fila))
        # Altura necesaria = la de la celda que más líneas ocupe
        pdf.set_font("DejaVu", "B" if cabecera else "", 9.5)
        lineas = 1
        for c, celda in enumerate(celdas):
            txt = re.sub(r"\*\*|`", "", celda)
            lineas = max(lineas, len(pdf.multi_cell(anchos[c] - 3, 5, txt,
                                                    dry_run=True, output="LINES")))
        alto = 5 * lineas + 3
        if pdf.get_y() + alto > pdf.h - 20:
            pdf.add_page()
        y0 = pdf.get_y()
        x = MARGEN
        for c, celda in enumerate(celdas):
            txt = re.sub(r"\*\*|`", "", celda)
            if cabecera:
                pdf.set_fill_color(*ORANGE)
                pdf.set_text_color(255, 255, 255)
            else:
                pdf.set_fill_color(255, 255, 255) if i % 2 else pdf.set_fill_color(250, 246, 238)
                pdf.set_text_color(*DARK)
            pdf.set_xy(x, y0)
            pdf.multi_cell(anchos[c], alto, "", border=0, fill=True)
            pdf.set_xy(x + 1.5, y0 + 1.5)
            pdf.multi_cell(anchos[c] - 3, 5, txt, border=0, align="L")
            x += anchos[c]
        pdf.set_y(y0 + alto)
        pdf.set_draw_color(*CREAM)
        pdf.line(MARGEN, pdf.get_y(), pdf.w - MARGEN, pdf.get_y())
    pdf.set_text_color(*DARK)
    pdf.ln(3)


def cita(pdf, lineas):
    texto = " ".join(lineas)
    pdf.set_font("DejaVu", "", 10)
    alto_linea = 5.5
    n = len(pdf.multi_cell(ancho_util(pdf) - 8, alto_linea, re.sub(r"\*\*|`", "", texto),
                           dry_run=True, output="LINES"))
    h = alto_linea * n + 5
    if pdf.get_y() + h > pdf.h - 20:
        pdf.add_page()
    y0 = pdf.get_y()
    pdf.set_fill_color(*CREAM)
    pdf.rect(MARGEN, y0, ancho_util(pdf), h, style="F")
    pdf.set_draw_color(*ORANGE)
    pdf.set_line_width(1.2)
    pdf.line(MARGEN + 0.6, y0, MARGEN + 0.6, y0 + h)
    pdf.set_xy(MARGEN + 4, y0 + 2.5)
    pdf.set_text_color(*DARK)
    pdf.multi_cell(ancho_util(pdf) - 8, alto_linea, re.sub(r"\*\*|`", "", texto))
    pdf.set_y(y0 + h + 3)


def render(md_path, out_path):
    texto = md_path.read_text(encoding="utf-8")
    lineas = texto.split("\n")

    privado = "PRIVADO" in texto[:400].upper()
    titulo = limpiar(re.sub(r"^#\s*", "", lineas[0])) if lineas[0].startswith("#") else md_path.stem

    pdf = PDF(titulo, privado)
    pdf.add_font("DejaVu", "", f"{FONT_DIR}/DejaVuSans.ttf")
    pdf.add_font("DejaVu", "B", f"{FONT_DIR}/DejaVuSans-Bold.ttf")
    pdf.add_font("DejaVu", "I", f"{FONT_DIR}/DejaVuSans.ttf")  # no hay cursiva de DejaVuSans en el sistema
    pdf.set_margins(MARGEN, MARGEN, MARGEN)
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()

    # ---- Portada compacta (no una página entera: son documentos cortos).
    # La banda se dimensiona según lo que ocupe el título: con uno largo, a
    # altura fija el aviso de PRIVADO se montaba encima de la segunda línea.
    pdf.set_font("DejaVu", "B", 19)
    n_lineas = len(pdf.multi_cell(ancho_util(pdf), 9, titulo, dry_run=True, output="LINES"))
    alto_banda = 9 + 9 * n_lineas + (9 if privado else 6)
    pdf.set_fill_color(*(RED if privado else ORANGE))
    pdf.rect(0, 0, pdf.w, alto_banda, style="F")
    pdf.set_xy(MARGEN, 9)
    pdf.set_text_color(255, 255, 255)
    pdf.multi_cell(ancho_util(pdf), 9, titulo)
    if privado:
        pdf.set_x(MARGEN)
        pdf.set_font("DejaVu", "B", 9)
        pdf.cell(0, 6, "DOCUMENTO PRIVADO — no lo compartas con ningún cliente")
    pdf.set_y(alto_banda + 8)
    pdf.set_text_color(*DARK)

    i = 1
    buffer_tabla = []

    def volcar_tabla():
        nonlocal buffer_tabla
        if buffer_tabla:
            tabla(pdf, buffer_tabla)
            buffer_tabla = []

    while i < len(lineas):
        linea = lineas[i]
        cruda = limpiar(linea.rstrip())
        i += 1

        # --- tabla
        if cruda.startswith("|"):
            celdas = [c.strip() for c in cruda.strip("|").split("|")]
            if all(re.fullmatch(r":?-{2,}:?", c) for c in celdas if c):
                continue  # la fila de guiones que separa la cabecera
            buffer_tabla.append(celdas)
            continue
        volcar_tabla()

        if not cruda:
            continue

        # --- separador
        if re.fullmatch(r"-{3,}", cruda):
            pdf.ln(2)
            pdf.set_draw_color(*CREAM)
            pdf.set_line_width(0.5)
            pdf.line(MARGEN, pdf.get_y(), pdf.w - MARGEN, pdf.get_y())
            pdf.ln(4)
            continue

        # --- cita / aviso
        if cruda.startswith(">"):
            bloque = [cruda.lstrip("> ").strip()]
            while i < len(lineas) and lineas[i].strip().startswith(">"):
                bloque.append(limpiar(lineas[i]).lstrip("> ").strip())
                i += 1
            cita(pdf, bloque)
            continue

        # --- encabezados
        m = re.match(r"^(#{1,4})\s+(.*)", cruda)
        if m:
            nivel, txt = len(m.group(1)), m.group(2)
            if pdf.get_y() > pdf.h - 40:
                pdf.add_page()
            pdf.ln(3 if nivel > 2 else 5)
            if nivel == 2:
                pdf.set_draw_color(*ORANGE)
                pdf.set_line_width(0.8)
                y = pdf.get_y()
                pdf.line(MARGEN, y, MARGEN + 14, y)
                pdf.ln(2)
            pdf.set_font("DejaVu", "B", {1: 16, 2: 13.5, 3: 11.5, 4: 11}[nivel])
            pdf.set_text_color(*(ORANGE if nivel <= 2 else DARK))
            pdf.set_x(MARGEN)
            pdf.multi_cell(ancho_util(pdf), 7, re.sub(r"\*\*|`", "", txt))
            pdf.set_text_color(*DARK)
            pdf.ln(1.5)
            continue

        # --- lista numerada
        m = re.match(r"^(\d+)\.\s+(.*)", cruda)
        if m:
            pdf.set_x(MARGEN + 2)
            pdf.set_font("DejaVu", "B", 11)
            pdf.set_text_color(*ORANGE)
            pdf.cell(7, 6, m.group(1) + ".")
            pdf.set_text_color(*DARK)
            pdf.set_x(MARGEN + 9)
            escribir_richtext(pdf, m.group(2))
            continue

        # --- lista con viñetas
        m = re.match(r"^[-*]\s+(.*)", cruda)
        if m:
            pdf.set_x(MARGEN + 3)
            pdf.set_font("DejaVu", "B", 11)
            pdf.set_text_color(*ORANGE)
            pdf.cell(5, 6, "·")
            pdf.set_text_color(*DARK)
            pdf.set_x(MARGEN + 8)
            escribir_richtext(pdf, m.group(1))
            continue

        # --- párrafo normal
        pdf.set_x(MARGEN)
        escribir_richtext(pdf, cruda)
        pdf.ln(1.5)

    volcar_tabla()
    pdf.output(str(out_path))
    return pdf.page_no()


if __name__ == "__main__":
    objetivos = sys.argv[1:] or DOCUMENTOS
    for nombre in objetivos:
        md = RAIZ / nombre
        if not md.exists():
            print(f"⚠️  No existe {nombre}")
            continue
        salida = md.with_suffix(".pdf")
        paginas = render(md, salida)
        print(f"✅ {salida.name} ({paginas} pág.)")
