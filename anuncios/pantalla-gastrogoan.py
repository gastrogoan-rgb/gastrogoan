#!/usr/bin/env python3
"""Pone GastroGoan dentro de la pantalla de un TPV de una foto real.

Por qué existe: las fotos de TPV que se encuentran enseñan SIEMPRE el
software de otra empresa. Publicarlas tal cual es pagar por anunciar a un
competidor, y Meta puede tumbar el anuncio por marca ajena.

La primera idea fue apagar el cristal con un desenfoque y se veía BORROSO:
una pantalla emborronada en un anuncio parece un error, no una decisión. Así
que en vez de tapar, se SUSTITUYE — la app se dibuja aquí y se deforma a las
cuatro esquinas del cristal. Queda nítida, y el anuncio pasa de esconder el
producto de otro a enseñar el tuyo.

Tres detalles sin los cuales el montaje se delata:

  · LA MANO VA POR ENCIMA. Se separa por COLOR, no recortando la silueta a
    mano. Cada foto necesita su regla: con una pantalla azul basta con
    "más rojo que azul", y sirve para cualquier tono de piel; con una
    pantalla clara hay que afinar más.
  · EL CRISTAL REFLEJA. Se le devuelve el brillo de la luz de la sala,
    cogido de la propia foto y MUY desenfocado — sin desenfocar, el brillo
    arrastra el texto de la interfaz vieja y la vuelve a dibujar encima.
  · GRANO. Una capa limpia sobre una foto con grano se lee como pegada.

    python3 anuncios/pantalla-gastrogoan.py
"""
from PIL import Image, ImageDraw, ImageFilter, ImageChops, ImageFont
import numpy as np

TINTA, CREMA, OLIVA, GRIS = (18,16,13), (242,239,233), (157,187,164), (140,133,122)

FOTOS = [
    dict(nombre='tablet de cafetería',
         entrada='anuncios/fotos/tpv-a.jpg',
         salida='anuncios/fotos/tpv-limpio.jpg',
         quad=[(362,1978), (2716,1512), (2748,3462), (1168,4040)],
         # Pantalla clara y cian: la piel se separa por tono cálido.
         piel='calida'),
    dict(nombre='camarero con las cartas',
         entrada='anuncios/fotos/camarero.jpg',
         salida='anuncios/fotos/camarero-limpio.jpg',
         quad=[(1909,1317), (2528,1309), (2519,1785), (1900,1796)],
         # Pantalla AZUL: "más rojo que azul" aísla la mano sola, y funciona
         # con cualquier tono de piel — la regla cálida fallaba aquí.
         piel='rojo>azul',
         # ⚠️ Aquí el color no basta ni con limpieza por tamaño: la carta
         # tiene FILAS de fotos de platos, y juntas forman una mancha tan
         # grande como el brazo. Se acota a mano la zona por donde entra el
         # brazo; fuera de ahí, nada se salva. Es lo único que funciona
         # cuando la pantalla que se sustituye está llena de comida.
         zona_mano=[(1249,2057), (1249,1793), (1837,1712), (1973,1651),
                    (2094,1614), (2189,1608), (2221,1664), (2182,1752),
                    (2094,1828), (1973,1925), (1837,2057)],
         # La impresora lleva la marca SpotOn bien legible. Fuera.
         tapar=[(2557, 1811, 2726, 1895)]),
]

def panel(w=1600, h=1200):
    """La pantalla de GastroGoan, de frente y a lo grande.

    Se dibuja SIMPLE a propósito: dentro del anuncio acaba midiendo unos
    600 px y escorada, así que el detalle fino no se ve y solo ensucia. Lo
    que tiene que leerse es el dinero."""
    im = Image.new('RGB', (w, h), TINTA)
    d = ImageDraw.Draw(im)
    sg7 = lambda s: ImageFont.truetype('assets/fonts/SchibstedGrotesk-700.ttf', s)
    sg5 = lambda s: ImageFont.truetype('assets/fonts/SchibstedGrotesk-500.ttf', s)
    pm  = lambda s: ImageFont.truetype('assets/fonts/IBMPlexMono-500.ttf', s)

    d.rectangle([0,0,w,96], fill=(26,24,20))
    d.text((44,30), 'GastroGoan', font=sg7(44), fill=CREMA)
    d.ellipse([w-92,38,w-72,58], fill=OLIVA)
    d.text((w-58,30), 'TPV', font=sg5(38), fill=GRIS)

    d.text((44,168), 'VENTAS DE HOY', font=pm(34), fill=GRIS)
    d.text((40,214), '1.847,50 €', font=sg7(168), fill=CREMA)

    # Dos mesas abiertas con su importe y dos libres: así se lee como un TPV
    # en pleno servicio y no como una pantalla de inicio.
    x, y, cw, ch, g = 44, 470, 355, 250, 24
    for i, (num, importe) in enumerate([('1','32,00 €'), ('2','30,00 €'), ('3',None), ('4',None)]):
        cx = x + i*(cw+g)
        d.rectangle([cx,y,cx+cw,y+ch], outline=CREMA if importe else (58,54,48), width=5)
        d.text((cx+26,y+24), 'Mesa '+num, font=sg5(42), fill=CREMA if importe else GRIS)
        d.text((cx+26, y+120 if importe else y+130),
               importe or 'Libre', font=(sg7(64) if importe else sg5(40)),
               fill=CREMA if importe else GRIS)

    d.text((44,800), 'PARA LLEVAR · DELIVERY', font=pm(32), fill=GRIS)
    d.rectangle([44,860,474,952], fill=OLIVA)
    d.text((72,884), 'Pedidos online: ON', font=sg7(44), fill=TINTA)
    return im

def coeffs(destino, origen):
    """PIL mapea cada píxel de SALIDA a uno de ENTRADA, así que el sistema
    va en ese sentido — al revés de lo que uno esperaría."""
    A, B = [], []
    for (xd,yd), (xo,yo) in zip(destino, origen):
        A += [[xd,yd,1,0,0,0,-xo*xd,-xo*yd], [0,0,0,xd,yd,1,-yo*xd,-yo*yd]]
        B += [xo, yo]
    return np.linalg.solve(np.asarray(A,float), np.asarray(B,float))

for cfg in FOTOS:
    im = Image.open(cfg['entrada']).convert('RGB')
    W, H = im.size
    p = panel()
    warp = Image.new('RGB', (W,H))
    warp.paste(p.transform((W,H), Image.PERSPECTIVE,
               coeffs(cfg['quad'], [(0,0),(p.width,0),(p.width,p.height),(0,p.height)]),
               Image.BICUBIC))

    m_quad = Image.new('L', (W,H), 0)
    ImageDraw.Draw(m_quad).polygon(cfg['quad'], fill=255)
    m_quad = m_quad.filter(ImageFilter.GaussianBlur(max(6, W//500)))

    a = np.asarray(im).astype(np.int16)
    R, G, B = a[:,:,0], a[:,:,1], a[:,:,2]
    if cfg['piel'] == 'rojo>azul':
        piel = (R > B + 10)
    else:
        piel = (R>112) & (G>55) & (B>30) & (R>G+18) & (G>=B-6) & ((R-B)>32)
    if cfg.get('zona_mano'):
        zona = Image.new('L', (W,H), 0)
        ImageDraw.Draw(zona).polygon(cfg['zona_mano'], fill=255)
        piel = piel & (np.asarray(zona) > 0)
    m_piel = Image.fromarray((piel.astype(np.uint8)*255), 'L')
    # ⚠️ El color por sí solo no basta: en una pantalla con FOTOS DE COMIDA,
    # los platos también son cálidos y se salvaban como si fueran piel — el
    # panel salía con hamburguesas encima. Lo que de verdad distingue la mano
    # es que es una masa GRANDE y continua, mientras que los platos son
    # manchas pequeñas. Se limpia por tamaño: erosionar mata lo pequeño, y
    # dilatar después devuelve a la mano su silueta. Se hace en miniatura
    # porque a 10.000 px un filtro de ese radio tarda una eternidad.
    chico = (m_piel.resize((W//8, H//8), Image.BILINEAR)
             .filter(ImageFilter.MinFilter(9))
             .filter(ImageFilter.MaxFilter(13)))
    m_piel = (chico.resize((W, H), Image.BILINEAR)
              .filter(ImageFilter.GaussianBlur(max(4, W//900))))

    lum = np.asarray(im.convert('L').filter(
        ImageFilter.GaussianBlur(max(40, W//50)))).astype(np.float32)/255.0
    brillo = np.clip((lum-0.58)*1.9, 0, 1)[:,:,None]
    wa = np.asarray(warp).astype(np.float32)
    wa = wa + brillo*76
    wa = wa*0.93 + 8
    wa = wa + np.random.normal(0, 3.2, wa.shape)
    warp = Image.fromarray(np.clip(wa,0,255).astype(np.uint8), 'RGB')

    out = Image.composite(warp, im, ImageChops.subtract(m_quad, m_piel))

    # Marcas de terceros que quedan a la vista fuera de la pantalla.
    for (x0,y0,x1,y1) in cfg.get('tapar', []):
        trozo = out.crop((x0,y0,x1,y1)).filter(ImageFilter.GaussianBlur((x1-x0)//6))
        ta = np.asarray(trozo).astype(np.float32)*0.82
        out.paste(Image.fromarray(np.clip(ta,0,255).astype(np.uint8),'RGB'), (x0,y0))

    out.save(cfg['salida'], quality=93)
    print(f"✅ {cfg['salida']}  ({cfg['nombre']})")
