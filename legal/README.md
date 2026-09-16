# Documentos legales que se publican

Lo que hay en esta carpeta se copia a `deploy/app/public/legal/` cada vez
que se ejecuta `bash deploy/actualizar.sh`, y queda accesible en:

    https://app.gastrogoan.com/legal/<archivo>

## Qué tiene que haber aquí

| Archivo | Para qué |
|---|---|
| `declaracion-responsable.pdf` | La Declaración Responsable de GastroGoan como **fabricante** del software, exigida por el Reglamento de VeriFactu |

⚠️ **El nombre del archivo NO se cambia.** La app enlaza a esa dirección
exacta desde `DECLARACION_RESPONSABLE_URL` (js/core.js), y ese enlace es uno
de los seis puntos que comprueba el cumplimiento de VeriFactu: el usuario
tiene que poder llegar al documento desde el propio programa. Si el archivo
cambia de nombre, el enlace se rompe y nadie se entera hasta que alguien lo
pulse.

⚠️ **Nunca se edita `deploy/app/public/legal/` a mano** — igual que el resto
de `deploy/`, se regenera. Se edita aquí.

## Por qué se aloja aquí y no en otro sitio

Cloudflare Pages sirve estos archivos con ancho de banda ilimitado y coste
cero, bajo el dominio propio. Es la misma razón por la que vive ahí la app:
nada de lo que crece con el número de licencias vendidas puede costar dinero.
