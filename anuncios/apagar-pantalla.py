#!/usr/bin/env python3
"""Apaga la interfaz ajena de la foto del TPV, dejando la mano intacta.

Por qué existe: la foto elegida para el segundo anuncio enseña el software
de OTRA empresa — "Matcha Latte", precios en dólares, interfaz en inglés.
Publicarla tal cual es pagar por anunciar a un competidor, y Meta puede
tumbar el anuncio por marca ajena.

Cómo lo resuelve, y por qué así: en vez de recortar la silueta de la mano a
mano (que es donde un montaje siempre se delata), la piel se separa POR
COLOR. Dentro de una pantalla cian y negra, el dedo es lo único cálido, así
que un filtro de tono lo aísla solo y con el borde natural de la foto.

La pantalla no se deja negra del todo: un cristal liso y apagado parece un
aparato desenchufado y rompe la escena. Se deja encendida pero ilegible.

    python3 anuncios/apagar-pantalla.py
"""
from PIL import Image, ImageDraw, ImageFilter, ImageChops
import numpy as np

ENTRADA = 'anuncios/fotos/tpv-a.jpg'
SALIDA  = 'anuncios/fotos/tpv-limpio.jpg'
# Las cuatro esquinas del cristal, medidas sobre la foto a tamaño completo.
# Van un pelín por fuera del borde visible: si se quedan cortas asoma la
# interfaz por los cantos, que es peor que pisar un poco el marco.
QUAD = [(362, 1978), (2716, 1512), (2748, 3462), (1168, 4040)]

im = Image.open(ENTRADA).convert('RGB')

m_quad = Image.new('L', im.size, 0)
ImageDraw.Draw(m_quad).polygon(QUAD, fill=255)
m_quad = m_quad.filter(ImageFilter.GaussianBlur(9))

a = np.asarray(im).astype(np.int16)
R, G, B = a[:, :, 0], a[:, :, 1], a[:, :, 2]
piel = ((R > 112) & (G > 55) & (B > 30) & (R > G + 18) &
        (G >= B - 6) & ((R - B) > 32)).astype(np.uint8) * 255
# Se engorda y se difumina: así el recorte no deja un filo duro alrededor
# del dedo, que es lo primero que delata un montaje.
m_piel = (Image.fromarray(piel, 'L')
          .filter(ImageFilter.MaxFilter(9))
          .filter(ImageFilter.GaussianBlur(6)))

m = ImageChops.subtract(m_quad, m_piel)

scr = im.filter(ImageFilter.GaussianBlur(34))
s = np.asarray(scr).astype(np.float32)
s = s.mean(axis=2, keepdims=True) * 0.74 + s * 0.26   # desatura
s *= 0.5                                              # oscurece
s[:, :, 2] *= 1.25                                    # tono frío de pantalla
s[:, :, 1] *= 1.08
scr = Image.fromarray(np.clip(s, 0, 255).astype(np.uint8), 'RGB')

out = Image.composite(scr, im, m)
out.save(SALIDA, quality=93)
out.resize((out.width // 4, out.height // 4)).save('/tmp/limpio.png')
print(f'✅ {SALIDA}')
