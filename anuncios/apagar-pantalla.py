#!/usr/bin/env python3
"""Pone GastroGoan dentro de la tablet de la foto, en perspectiva.

Por qué existe: la foto elegida para el segundo anuncio enseñaba el software
de OTRA empresa — "Matcha Latte", precios en dólares, interfaz en inglés.
Publicarla tal cual es pagar por anunciar a un competidor, y Meta puede
tumbar el anuncio por marca ajena.

La primera solución fue apagar el cristal con un desenfoque, y se veía
BORROSO: un anuncio con una pantalla emborronada parece un error, no una
decisión. Así que en vez de tapar, se sustituye — la app se dibuja aquí
mismo y se deforma a las cuatro esquinas del cristal. Queda nítida.

Dos detalles sin los cuales el montaje se delata:

  · LA MANO VA POR ENCIMA. La piel se separa por COLOR (dentro de una
    pantalla oscura es lo único cálido) en vez de recortar la silueta a
    mano, que es donde siempre se nota el pegote. Luego se vuelve a poner
    encima del panel, así que el dedo sigue tocando el cristal.

  · EL CRISTAL REFLEJA. Una pantalla perfectamente plana y mate no existe:
    se le añade el brillo diagonal de la luz de la ventana, cogido de la
    propia foto, y un pelín de grano. Sin eso parece un recorte pegado.

    python3 anuncios/apagar-pantalla.py
"""
from PIL import Image, ImageDraw, ImageFilter, ImageChops, ImageFont
import numpy as np

ENTRADA = 'anuncios/fotos/tpv-a.jpg'
SALIDA  = 'anuncios/fotos/tpv-limpio.jpg'
# Las cuatro esquinas del cristal, medidas sobre la foto a tamaño completo,
# en el orden: arriba-izq, arriba-der, abajo-der, abajo-izq.
QUAD = [(362, 1978), (2716, 1512), (2748, 3462), (1168, 4040)]

TINTA   = (18, 16, 13)
CREMA   = (242, 239, 233)
OLIVA   = (157, 187, 164)
GRIS    = (140, 133, 122)

def panel(w=1600, h=1200):
    """La pantalla de GastroGoan, dibujada a lo grande y de frente.

    Se dibuja SIMPLE a propósito: dentro del anuncio este panel acaba
    midiendo unos 600 px y muy escorado, así que los detalles finos no se
    ven y solo estorban. Lo que tiene que leerse es el dinero."""
    im = Image.new('RGB', (w, h), TINTA)
    d = ImageDraw.Draw(im)
    sg7 = lambda s: ImageFont.truetype('assets/fonts/SchibstedGrotesk-700.ttf', s)
    sg5 = lambda s: ImageFont.truetype('assets/fonts/SchibstedGrotesk-500.ttf', s)
    pm  = lambda s: ImageFont.truetype('assets/fonts/IBMPlexMono-500.ttf', s)

    d.rectangle([0, 0, w, 96], fill=(26, 24, 20))
    d.text((44, 30), 'GastroGoan', font=sg7(44), fill=CREMA)
    d.ellipse([w-92, 38, w-72, 58], fill=OLIVA)
    d.text((w-58, 30), 'TPV', font=sg5(38), fill=GRIS)

    d.text((44, 168), 'VENTAS DE HOY', font=pm(34), fill=GRIS)
    d.text((40, 214), '1.847,50 €', font=sg7(168), fill=CREMA)

    # Cuatro mesas. Dos ocupadas (borde claro y su importe) y dos libres:
    # es lo que hace que se lea como un TPV en pleno servicio y no como
    # una pantalla de inicio.
    mesas = [('1', '32,00 €'), ('2', '30,00 €'), ('3', None), ('4', None)]
    x, y, cw, ch, g = 44, 470, 355, 250, 24
    for i, (num, importe) in enumerate(mesas):
        cx = x + (i % 4) * (cw + g)
        borde = CREMA if importe else (58, 54, 48)
        d.rectangle([cx, y, cx+cw, y+ch], outline=borde, width=5)
        d.text((cx+26, y+24), 'Mesa ' + num, font=sg5(42), fill=CREMA if importe else GRIS)
        if importe:
            d.text((cx+26, y+120), importe, font=sg7(64), fill=CREMA)
        else:
            d.text((cx+26, y+130), 'Libre', font=sg5(40), fill=GRIS)

    d.text((44, 800), 'PARA LLEVAR · DELIVERY', font=pm(32), fill=GRIS)
    d.rectangle([44, 860, 44+430, 860+92], fill=OLIVA)
    d.text((72, 884), 'Pedidos online: ON', font=sg7(44), fill=TINTA)
    return im

def coeffs(destino, origen):
    """Coeficientes de la transformación de perspectiva de PIL.

    PIL va al revés de lo que uno espera: mapea cada píxel de SALIDA a uno
    de ENTRADA, así que hay que darle el sistema en ese sentido."""
    A = []
    for (xd, yd), (xo, yo) in zip(destino, origen):
        A.append([xd, yd, 1, 0, 0, 0, -xo*xd, -xo*yd])
        A.append([0, 0, 0, xd, yd, 1, -yo*xd, -yo*yd])
    A = np.asarray(A, dtype=np.float64)
    B = np.asarray(origen, dtype=np.float64).reshape(8)
    return np.linalg.solve(A, B)

im = Image.open(ENTRADA).convert('RGB')
W, H = im.size

p = panel()
warp = Image.new('RGB', (W, H))
warp.paste(p.transform((W, H), Image.PERSPECTIVE,
                       coeffs(QUAD, [(0,0), (p.width,0), (p.width,p.height), (0,p.height)]),
                       Image.BICUBIC))

# El cristal. El canto va difuminado: un borde recto sobre el marco blanco
# delata el rectángulo pegado.
m_quad = Image.new('L', (W, H), 0)
ImageDraw.Draw(m_quad).polygon(QUAD, fill=255)
m_quad = m_quad.filter(ImageFilter.GaussianBlur(7))

# La piel, para devolver la mano por encima.
a = np.asarray(im).astype(np.int16)
R, G, B = a[:, :, 0], a[:, :, 1], a[:, :, 2]
piel = ((R > 112) & (G > 55) & (B > 30) & (R > G + 18) &
        (G >= B - 6) & ((R - B) > 32)).astype(np.uint8) * 255
m_piel = (Image.fromarray(piel, 'L')
          .filter(ImageFilter.MaxFilter(7))
          .filter(ImageFilter.GaussianBlur(4)))

# El reflejo del cristal, cogido de la luminosidad de la foto original: la
# ventana que se refleja en la pantalla real sigue estando ahí.
#
# ⚠️ La luminosidad hay que DESENFOCARLA fuerte antes de usarla. Sin eso, el
# brillo arrastra el texto de la interfaz vieja y la vuelve a dibujar encima
# del panel: se leía "Matcha Latte" y "MILK CHOOSE UP TO 6" flotando sobre
# las mesas. Desenfocada solo sobreviven las manchas grandes de luz, que es
# lo único que de verdad refleja un cristal.
lum = np.asarray(im.convert('L').filter(ImageFilter.GaussianBlur(70))).astype(np.float32) / 255.0
brillo = np.clip((lum - 0.58) * 1.9, 0, 1)[:, :, None]
wa = np.asarray(warp).astype(np.float32)
wa = wa + brillo * 76                       # el reflejo aclara
wa = wa * 0.93 + 8                          # la pantalla no es un foco
ruido = np.random.normal(0, 3.2, wa.shape)  # grano, como el resto de la foto
warp = Image.fromarray(np.clip(wa + ruido, 0, 255).astype(np.uint8), 'RGB')

out = Image.composite(warp, im, ImageChops.subtract(m_quad, m_piel))
out.save(SALIDA, quality=94)
out.resize((W // 4, H // 4)).save('/tmp/limpio.png')
print(f'✅ {SALIDA}')
