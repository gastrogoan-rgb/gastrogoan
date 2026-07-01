#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Genera pentagramas grabados (Verovio) a PNG para el dosier:
escala+arpegio por tonalidad (con digitacion) e incipits de piezas."""
import verovio, cairosvg, io, os
from PIL import Image

os.makedirs("notation", exist_ok=True)
tk = verovio.toolkit()

def render(abc, name, w=1600, scale=42):
    tk.setOptions({"inputFrom":"abc","adjustPageHeight":True,"pageWidth":w,"scale":scale,
        "footer":"none","header":"none","pageMarginTop":6,"pageMarginBottom":6,
        "pageMarginLeft":6,"pageMarginRight":6})
    tk.loadData(abc); svg=tk.renderToSVG(1)
    png=cairosvg.svg2png(bytestring=svg.encode(), output_width=int(w*1.35))
    im=Image.open(io.BytesIO(png)).convert("RGBA")
    gray=Image.alpha_composite(Image.new("RGBA",im.size,(255,255,255,0)),im).convert("L")
    bbox=gray.point(lambda p:0 if p>245 else 255).getbbox()
    if bbox:
        m=12; b=(max(0,bbox[0]-m),max(0,bbox[1]-m),min(im.size[0],bbox[2]+m),min(im.size[1],bbox[3]+m)); im=im.crop(b)
    out=Image.new("RGB",im.size,(255,255,255)); out.paste(im,mask=im.split()[3])
    out.save("notation/"+name); return out.size

# ---- Escala (2 compases) + arpegio de tónica (1 compás), con digitación ----
# clave: (nombre_archivo, K, notas_escala8, notas_arpegio4, digitacion12)
SCALES = {
 "C":  ("C","C D E F G A B c","C E G c","1 2 3 1 2 3 4 5 1 2 3 5"),
 "G":  ("G","G A B c d e ^f g","G B d g","1 2 3 1 2 3 4 5 1 2 3 5"),
 "F":  ("F","F G A B c d e f","F A c f","1 2 3 4 1 2 3 4 1 2 3 5"),
 "Am": ("Am","A B c d e f g a","A c e a","1 2 3 1 2 3 4 5 1 2 3 5"),
 "E":  ("E","E F G A B c d e","E G B e","1 2 3 1 2 3 4 5 1 2 3 5"),
 "Fm": ("Fm","F G A B c d e f","F A c f","1 2 3 4 1 2 3 4 1 2 3 5"),
}
for key,(K,sc,arp,fing) in SCALES.items():
    abc=f"""X:1
M:C
L:1/4
K:{K}
{sc} | {arp} |]
w: {fing}"""
    print("escala", key, render(abc, f"scale_{key}.png"))

# ---- Incipits reales (comprobados) ----
INCIPITS = {
 "ode":     ("C","E E F G | G F E D | C C D E | E3/2 D/ D2 |]"),     # Himno de la Alegría
 "furelise":("Am","e ^d e ^d e B d c | A2 z2 |]"),                    # Para Elisa
 "jingle":  ("G","B B B2 | B B B2 | B d G A | B4 |]"),                # Jingle Bells
 "yankee":  ("C","C C D E | C E D2 |]"),                              # Yankee Doodle
 "tetris":  ("Em","e2 B c | d2 c B | A2 A c | e2 d c | B4 |]"),       # Tetris (Korobéiniki)
}
for name,(K,mel) in INCIPITS.items():
    abc=f"""X:1
M:C
L:1/4
K:{K}
{mel}"""
    print("incipit", name, render(abc, f"incipit_{name}.png", scale=40))

# ---- Patrón de cinco dedos (sube y baja) por tonalidad, con digitación ----
FIVE = {
 "C":  ("C","C D E F G F E D C"),
 "G":  ("G","G A B c d c B A G"),
 "F":  ("F","F G A B c B A G F"),
 "Am": ("Am","A B c d e d c B A"),
 "E":  ("E","E F G A B A G F E"),
 "Fm": ("Fm","F G A B c B A G F"),
}
for key,(K,mel) in FIVE.items():
    abc=f"""X:1
M:C
L:1/4
K:{K}
{mel} |]
w: 1 2 3 4 5 4 3 2 1"""
    print("cinco", key, render(abc, f"five_{key}.png"))

print("LISTO")
