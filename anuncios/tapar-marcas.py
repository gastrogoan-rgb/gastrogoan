#!/usr/bin/env python3
"""Tapa las marcas de terceros que quedan legibles en la foto del anuncio.

La foto del camarero es de Pexels y la subió la propia SpotOn, así que la
licencia cubre el uso comercial. Pero su LOGO sale grabado y legible en la
impresora de tickets, y una marca ajena bien leída dentro de un anuncio es
justo lo que Meta revisa.

El dueño decidió dejar la pantalla como venía —se probó a sustituirla por la
de GastroGoan en perspectiva y prefirió el original—, así que aquí solo se
tapa el logo. El parche va difuminado y algo más oscuro que el entorno: un
rectángulo liso se ve antes que la marca que oculta.

    python3 anuncios/tapar-marcas.py
"""
from PIL import Image, ImageFilter
import numpy as np

ENTRADA = 'anuncios/fotos/camarero.jpg'
SALIDA  = 'anuncios/fotos/camarero-limpio.jpg'
# Coordenadas sobre la foto a 4000 px de ancho.
MARCAS = [(2557, 1811, 2726, 1895)]   # "SpotOn" en la impresora

im = Image.open(ENTRADA).convert('RGB')
for (x0, y0, x1, y1) in MARCAS:
    trozo = im.crop((x0, y0, x1, y1)).filter(ImageFilter.GaussianBlur((x1-x0)//5))
    a = np.asarray(trozo).astype(np.float32) * 0.8
    im.paste(Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGB'), (x0, y0))
im.save(SALIDA, quality=93)
print(f'✅ {SALIDA}')
