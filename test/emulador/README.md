# Banco de pruebas con Firebase de verdad (emulador oficial)

## Por qué existe

Las demás pruebas corren **sin Firebase**. Cubren "¿funciona la app?" pero
no "¿qué pasa cuando la nube contesta?". Por ese hueco se colaron a
producción, en una sola semana:

- El selector de idioma no hacía nada (la nube devolvía el idioma viejo).
- Distribución del Trabajo se quedaba congelada al borrar un empleado
  desde otro dispositivo.
- El móvil del dueño no sincronizaba (no sabía a qué nube conectarse).
- Los avisos push de un dispositivo borraban los de los demás.

Los cuatro **solo aparecen con la nube conectada de verdad y con más de un
dispositivo**. Ninguna prueba local podía verlos.

Esto levanta el emulador oficial de Firebase (Realtime Database + Auth) y
abre **dos navegadores reales** contra él, así que el escenario es el de
verdad, no una simulación.

## Cómo se usa

```bash
bash test/emulador/run.sh
```

Levanta lo que haga falta, corre la prueba y apaga los emuladores.
La primera vez descarga ~35 MB (el emulador de Firebase); después va en
caché.

## Qué comprueba hoy

- Los dos dispositivos llegan a "Nube conectada" de verdad (no simulada).
- Lo creado en uno —empleado y su ficha de trabajo— aparece solo en el otro.
- Un borrado desde un dispositivo no rompe la pantalla del otro.

## Qué falta por cubrir (siguiente paso)

La carrera exacta del bug de Distribución del Trabajo —que el borrado
remoto deje una clave sin valor— **todavía no se reproduce aquí**: hace
falta afinar los tiempos para que el segundo dispositivo dé por
sincronizada la ficha justo antes de que la borren. Ese caso sí está
cubierto por la prueba de `test/audit-active.mjs` (bloque H), que llama a
`mergeStockField` directamente.

Pendientes de añadir, por valor:
1. Cambiar el idioma en un dispositivo y comprobar que la nube no lo pisa.
2. Un dispositivo nuevo del dueño que solo tiene la licencia: debe
   encontrar la nube solo (vía `tenantLookup`).
3. Suscripciones push de dos dispositivos: ninguna debe borrar la otra.
4. Dos dispositivos cobrando la misma mesa a la vez.

## Hallazgo que solo se vio aquí

**Firebase no guarda objetos vacíos.** Una ficha de distribución sin
contenido ni siquiera viaja entre dispositivos. Es la raíz del bug de
Distribución del Trabajo, y no había forma de comprobarlo sin un Firebase
de verdad.

## Nota sobre el SDK

`gstatic.com` puede estar bloqueado en el entorno de pruebas, así que el
SDK se sirve desde `__sdk/`, sacado del paquete npm `firebase` (mismo
código que el de la CDN). Al fichero de Auth se le añade un trozo que
manda la autenticación al emulador: **eso solo existe en pruebas, nunca en
lo que se entrega al cliente**.
