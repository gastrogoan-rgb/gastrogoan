# Pequeños pendientes (26/11) · estado

Rama: worktree-agent-afed6c7629bea4722 (sin publicar, sin merge).

## 1. «Atrás» desde ventanas y paneles
- HECHO (REAL, arreglado). Las ventanas (`#modal-overlay`) y las hojas de Escandallo/Fichas ya eran entradas de historial o se cerraban (`test/atras.mjs`, `test/atras-hojas.mjs`). Lo que faltaba: chat, ayuda, campana de avisos y menú «⋯» NO se cerraban con «atrás» (sacaban de la pantalla). `ggRutaCerrarCapaAbierta` (js/ui.js, popstate). Prueba que falla antes: `test/atras-paneles.mjs`.
- Sin tocar openModal/closeModal. Visita guiada: no cubierta.

## 2. Ajustes por aparato
Inventario de `localStorage` (todo es del aparato; nada de esto viaja a la nube):
- Ya lo dicen en pantalla: clave de IA (`ia.cfg.whyLocal`), clave y serie de VeriFactu, «Cómo imprime este aparato» (modo e impresora Bluetooth), idioma (selector del aparato).
- Engañaba, ARREGLADO (textos es/ca/en; `test/ajustes-por-aparato.mjs`): botón «Alarma apagada/activa» de pedidos (ahora «(este aparato)»); tarjeta «Avisos del navegador» (ahora dice que se activa en cada aparato); «Falta emparejar por Bluetooth» (ahora «en ESTE aparato»).
- Claves secretas: comprobado que IA y VeriFactu solo se escriben en localStorage, nunca en `DB.business` (la prueba lo vigila).
- NO tocado, a propósito: «Visto» de avisos (por aparato y negocio, cosmético; llevarlo a la nube exige fusión y no aporta riesgo); `gg_last_area`, `gastrogoan_instalar`, puesta a punto abierta/oculta, ancho de ticket y codepage (propios del hardware de cada aparato).
- Hallazgo menor SIN arreglar: `chatLastRead_<canal>` no lleva el negocio en la clave, así que con varios negocios en un aparato se comparte la marca de «leído».

## 3. Versión vieja del programa escribiendo sobre campos nuevos
`test/emulador/version-vieja.mjs` (emulador real, reglas reales; dos navegadores: la versión actual y una COMPILACIÓN ANTIGUA, `VIEJA_DIR`). Se corre con puertos propios para no chocar con otras sesiones: `VN_OLD=8963 VN_TEST=version-vieja.mjs VIEJA_DIR=<dist antiguo> bash test/emulador/run-ventas.sh` (no está en todo.sh: ninguna prueba de emulador lo está).
- Versión de antes del 26/11 (commit anterior a 08576d58): conectada y SIN conexión, NO pisa `pin3`/`pin3De` de empleados, claves nuevas de `business` ni lápidas `borrados`. NO REAL en el código actual.
- Versión del 16/11 (anterior a la subida por claves de `business`, 17/11): al volver de estar sin conexión SÍ borra claves nuevas de `business` (sube el bloque entero en cola). Es el fallo ya corregido el 17/11 y vive en el código viejo: ninguna versión nueva puede protegerse de él. Solo afecta a aparatos sin abrir desde hace más de 10 días.
- Las ediciones concurrentes del MISMO empleado (otro teléfono vs otro pin3) las gana un objeto entero, igual que entre dos aparatos nuevos; el H3 no desaparece.

## 4. Herramientas de seguridad (27/11)
- gitleaks 8.28.0: binario oficial de GitHub, SHA-256 comprobado contra su `checksums.txt` (a65b5253…). `gitleaks detect` con historial (2.289 commits, 175 MB): 41 hallazgos, TODOS falsos positivos: 31 `gcp-api-key` = la MISMA clave web de Firebase (`AIzaSy…`, pública por diseño, 20 apariciones distintas en copias de la app/panel/kit); 10 `generic-api-key` = `key === 'plan360Pruebas'`, `REVOKED_CACHE_KEY` (nombre de un localStorage) y tokens falsos de pruebas (`resToken`, `trackToken`). Sin claves privadas, `sk_live_`, `whsec_` ni cuentas de servicio en el repositorio (los `sk_test_X`/`whsec_…` son marcadores de las pruebas del Worker). No hay secreto real en el historial.
- Semgrep 1.187.0 (`pip install semgrep`, reglas `p/secrets` + `p/javascript`, 84 ficheros de js/, worker/, admin-panel/, servidor/, tools/, las dos web y los sw; sin deploy/dist/kit/video): 0 hallazgos, 0 errores. Limitación honesta: una muestra con `exec()`+`innerHTML` tampoco saltó (sin taint real), así que 0 no prueba ausencia de fallos.
- `npm audit`: 4 «high» (puppeteer, puppeteer-core, chromium-bidi, zod): todo de pruebas (devDependencies de facto), no viaja al cliente. Se arregla con `npm audit fix` cuando salga puppeteer 25.13+; no se tocó (el repositorio fija la 25.x para las pruebas).
- Cabeceras (curl -I, 27/11): app y admin: HSTS, nosniff, referrer strict-origin-when-cross-origin, CSP con `frame-ancestors 'none'` y X-Frame-Options DENY. reservas: HSTS, nosniff, referrer y CSP con `frame-ancestors https:` y SIN X-Frame-Options (se puede incrustar, como debe). Observación: app y admin devuelven `access-control-allow-origin: *` (lo añade Cloudflare Pages por defecto a los estáticos; no hay datos privados en esos ficheros, así que no es un riesgo, pero se puede quitar en `_headers`).

## 5. Fiscal con fuente oficial (27/11)
- HECHO a medias: País Vasco 2025 comprobado en Álava y Gipuzkoa (fuentes oficiales, columna de cuota íntegra repetida en `test/fiscal-motor.mjs`), regla en `FISCAL_REGLAS` con fuente y fecha; sigue «pendiente» por Bizkaia (503). Texto de la regla advierte de que el «mínimo» foral no existe como tal (minoración 1.583 € + deducciones).
- NO hecho: ejercicios 2022 y anteriores (haría falta cargar y comprobar 15 escalas autonómicas + IS de cada año con el Manual de Renta/Sociedades correspondiente; es trabajo grande); mínimos de ascendientes/discapacidad/>65 (la app no recoge esos datos del titular: pide formulario nuevo, no solo cifras); resultados extracooperativos (necesitan separación contable). Finiquito: DESCARTADO por el dueño.
