# Carpeta de publicacion

Los dos sitios, ya construidos y listos para que un hosting los lea DIRECTO
del repositorio, sin pasar por ningun subidor de archivos:

    deploy/app        -> app.gastrogoan.com       (index.html + sw.js)
    deploy/reservas   -> reservas.gastrogoan.com  (index.html + _redirects + fonts)

Excepcion consciente a la regla de no commitear lo construido (dist/ sigue
ignorado): el subidor manual de Cloudflare se colgaba a media subida y no
habia forma de averiguar por que. Leyendo del repositorio no hay subida que
se cuelgue, y ademas cada version queda con su commit.

Se regeneran con:  bash build.sh && bash deploy/actualizar.sh
