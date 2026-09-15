# Fotos de los anuncios

Material de ORIGEN, no generado. Va al repositorio a propósito: desde el
contenedor de trabajo no hay acceso a los bancos de imágenes (el proxy los
deniega con 403), así que si estos ficheros no están, los anuncios no se
pueden volver a construir.

| Fichero | Origen | Qué es |
|---|---|---|
| `cocina-pase.jpg` | Pexels · `pexels-paolino96-19553654` | Cocina de pase de noche, 3153×5606 |
| `camarero.jpg` | Pexels · `pexels-spoton-pos-2160258094` | Camarero en el TPV con las cartas colgadas, 4000×3000 |
| `camarero-limpio.jpg` | derivada de `camarero.jpg` | La misma, con la marca SpotOn tapada |

## Por qué esta cocina y no otra

Tiene **tres franjas naturales** —techo oscuro, barra de pase iluminada,
negro casi puro abajo— y el anuncio las aprovecha en vez de pelearse con
ellas: titular en el techo, precio y botón en el negro, cocina respirando en
el centro. Las que se descartaron obligaban a oscurecer media foto con un
degradado para poder meter texto, y eso siempre se nota.

Además, 3153×5606 es exactamente 9:16, así que en story (1080×1920) encaja
sin recortar ni un píxel.

## Por qué la del camarero

Es la que resuelve el problema del CONTEXTO: delantal, polo de servicio,
cartas colgadas en pinzas, carriles de latón, impresora de tickets. Con las
otras no se veía que el anuncio iba dirigido a hostelería.

⚠️ Se probó a sustituir la pantalla del TPV por la de GastroGoan en
perspectiva, para no enseñar el software de otra empresa. Salía bien, pero
el dueño prefirió el original: la pantalla va tal cual. Lo único que se toca
es el LOGO de SpotOn grabado en la impresora (`tapar-marcas.py`), porque una
marca ajena bien legible dentro de un anuncio es lo que Meta revisa. El
código de la sustitución está en el historial de git si alguna vez hace falta.

## Tamaño

⚠️ Las fotos se guardan a **4000 px de ancho como mucho**. La del camarero
venía a 10.889 px y son 4,6 MB para un anuncio de 1080: bajarla a 4000
ahorra dos tercios del peso sin que se note nada. Si se vuelve a bajar una
foto de Drive, reducirla ANTES de medir cualquier coordenada — van en
píxeles de la foto y no sobreviven a un reescalado.

## Licencia

⚠️ La licencia de Pexels permite uso comercial y publicidad. **Cualquier foto
nueva que se meta aquí tiene que cumplir lo mismo**: una imagen de Getty,
Shutterstock o sacada de una búsqueda de Google NO se puede usar en un
anuncio de pago. Meta retira anuncios por eso y el autor puede reclamar.
