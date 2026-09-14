# Fotos de los anuncios

Material de ORIGEN, no generado. Va al repositorio a propósito: desde el
contenedor de trabajo no hay acceso a los bancos de imágenes (el proxy los
deniega con 403), así que si estos ficheros no están, los anuncios no se
pueden volver a construir.

| Fichero | Origen | Qué es |
|---|---|---|
| `cocina-pase.jpg` | Pexels · `pexels-paolino96-19553654` | Cocina de pase de noche, 3153×5606 |

## Por qué esta foto y no otra

Tiene **tres franjas naturales** —techo oscuro, barra de pase iluminada,
negro casi puro abajo— y el anuncio las aprovecha en vez de pelearse con
ellas: titular en el techo, precio y botón en el negro, cocina respirando en
el centro. Las que se descartaron obligaban a oscurecer media foto con un
degradado para poder meter texto, y eso siempre se nota.

Además, 3153×5606 es exactamente 9:16, así que en story (1080×1920) encaja
sin recortar ni un píxel.

## Licencia

⚠️ La licencia de Pexels permite uso comercial y publicidad. **Cualquier foto
nueva que se meta aquí tiene que cumplir lo mismo**: una imagen de Getty,
Shutterstock o sacada de una búsqueda de Google NO se puede usar en un
anuncio de pago. Meta retira anuncios por eso y el autor puede reclamar.

| `tpv-a.jpg` | Pexels · `pexels-rdne-4921264` | TPV de tablet en cafetería, 3684×5526 |
| `tpv-limpio.jpg` | derivada de `tpv-a.jpg` | La misma, con la pantalla apagada |

## `tpv-limpio.jpg`: por qué existe

La foto original enseña el software de OTRA empresa ("Matcha Latte", precios
en dólares, interfaz en inglés). Publicarla así es pagar por anunciar a un
competidor, y Meta puede tumbar el anuncio por marca ajena.

`anuncios/apagar-pantalla.py` apaga el cristal **respetando la mano**: la
piel se separa por COLOR, no recortando la silueta a mano — que es donde un
montaje siempre se delata. Se guardan las dos: la original porque es el
material de partida, y la limpia porque es la que va al anuncio.

Se descartaron otras dos fotos de TPV que subió el dueño (una horizontal con
la tablet muy escorada, y otra donde la mano tapaba media pantalla). No se
guardan: siguen en su Drive y ocupaban 4,5 MB para nada.
