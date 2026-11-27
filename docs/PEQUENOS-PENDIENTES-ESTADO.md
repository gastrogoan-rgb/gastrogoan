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

## 4-5. En curso
