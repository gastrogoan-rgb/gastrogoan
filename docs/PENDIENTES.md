# Pendientes generales del proyecto

Lista maestra de "cosas pendientes fuera del código en sí" (despliegue,
decisiones de negocio, trámites...). Cuando el usuario pregunte "¿qué
pendientes hay?", repasar este archivo entero (y los archivos específicos
enlazados abajo, como `VERIFACTU_PENDIENTE.md`) y responder con todo junto.

Última actualización: 02/08/2026.

## 1. Desplegar la app en un hosting de verdad (Netlify) con dominio propio

**Estado: pendiente, a la espera de que el usuario confirme que la app está
"al 100% segura y definitiva".** No hacer nada de esto hasta que lo pida
explícitamente — es él quien decide cuándo está lista para publicarse.

Contexto: el dominio `gastrogoan.com` está gestionado desde Canva (ahí lo
compró), pero **Canva no puede alojar la app en sí** (solo sirve para su
propio editor de páginas tipo landing). La web actual de gastrogoan.com el
usuario la hizo con "Claude design" y la publicó en **Netlify**, apuntando
el dominio desde Canva — así que Netlify ya es la pieza correcta para alojar
también la app.

Plan acordado con el usuario (ver conversación del 02/08/2026):

1. Crear un **sitio Netlify nuevo** (no reutilizar el de la web de
   marketing) solo para la app — así no se mezcla con la landing de Canva.
2. Subir ahí 3 archivos: `dist/index.html`, `dist/reservagastrogoan.html` y
   un archivo `_redirects` (ya preparado, ver más abajo).
3. Conectar un subdominio, p.ej. `app.gastrogoan.com` para la app en sí
   (Acceso Empleados/Propietarios), gestionando el DNS desde el panel de
   Canva donde está comprado el dominio (apuntando a Netlify).
4. Con el `_redirects` ya preparado, los enlaces públicos de reservas/
   pedidos quedan cortos y fáciles de compartir: en vez del feo
   `reservagastrogoan.html?n=casa-paco`, funciona
   `app.gastrogoan.com/pedir/casa-paco` (o el subdominio que se elija).

El contenido del `_redirects` ya está decidido y probado conceptualmente:
```
/pedir/:slug   /reservagastrogoan.html?n=:slug   200
/   /index.html   200
```

**Importante para el propio asistente**: cada vez que se genere una versión
nueva de `dist/index.html` (tras cualquier cambio de código), habrá que
volver a arrastrar los archivos actualizados a ese mismo sitio Netlify para
que los clientes reales reciban los cambios — el despliegue no es
automático, es manual (arrastrar carpeta) salvo que en su día se conecte
Netlify directamente a este repositorio de Git.

## 2. VeriFactu

Ver `docs/VERIFACTU_PENDIENTE.md` — pendiente de la Declaración Responsable
propia (trámite legal, no de código) antes de activarlo en producción.

## 3. Dashboard de interacción en redes/reseñas (fase futura, aparcado)

**Estado: aparcado, no empezar sin que el usuario lo pida explícitamente.**

Ya está hecho lo fácil: botones directos a Instagram/Facebook/Google Maps en
Promoción (ver commit "Añade accesos directos a Instagram, Facebook y Google
Maps en Promoción", 02/08/2026) — simples enlaces, sin API ni autorización.

Lo que queda aparcado es la idea original más ambiciosa: publicar posts y
responder reseñas *desde dentro* de GastroGoan, más un panel con reseñas del
mes, seguidores nuevos, etc., para poder incentivar al equipo según la
interacción. Motivo para aparcarlo: requiere registrar una app en Meta
(Instagram/Facebook) y pasar su proceso de revisión (App Review, puede
tardar semanas) para permisos de publicar/responder/leer métricas, más que
cada negocio conecte su propia cuenta por OAuth (login + autorización,
almacenar y renovar tokens). Para Google sería la Business Profile API, con
un proceso de acceso similar. El dato de "cuánta gente vino de más por una
promoción" no lo da ninguna de las dos APIs — habría que construirlo con un
código de promoción canjeable en el TPV.

Si se retoma: empezar por panel de reseñas + responder desde la app (más
valor, menos complejidad que publicar posts), y dejar seguidores/métricas
de posts para después.

## 4. Modo offline real del TPV — HECHO (02/08/2026)

Al investigarlo resultó ser mucho más pequeño de lo previsto: todo ya se
guarda primero en local (IndexedDB) sin depender de la red, y Firebase
Realtime Database ya trae de fábrica cola de escritura offline (sincroniza
sola al recuperar conexión). Verificado con la red del navegador cortada
del todo: crear un pedido, calcular el total y guardarlo funciona sin
errores ni bloqueos. Ya existía además un indicador "☁ Sin conexión" en la
cabecera (`updateSyncBadge`). Riesgo residual NO resuelto (bajo, no
abordado): si dos dispositivos editan la MISMA mesa estando ambos sin
conexión a la vez, al reconectar gana el último en sincronizar — solo
relevante en cortes de red largos con varios dispositivos activos a la
vez; arreglarlo del todo requeriría mover la sincronización a rutas por
elemento en vez de por colección entera, cambio más arriesgado que no se
ha hecho por no tocar un motor que ya funciona bien sin poder probarlo
contra un Firebase real en este entorno.

## 5. Comanda por voz en cocina — HECHO (02/08/2026)

Botón de micrófono en Comandas Cocina (Web Speech API — Chrome/Edge/Safari,
no Firefox). Frases tipo "mesa 3 lista" o "mesa 5 plato 2". Se validó a
fondo el "cerebro" de interpretación de frases (`handleVoiceComandaPhrase`)
con casos reales — encuentra la mesa, encuentra el plato, marca servido,
avisa si no encuentra algo. **Lo único que sigue sin poder validarse en
este entorno es el reconocimiento de voz en sí** (hace falta un micrófono
y una cocina real, con su ruido y acentos) — antes de depender de él a
diario, probarlo con calma un servicio tranquilo. Nunca sustituye del todo
poder tocar la pantalla, que sigue funcionando igual.

## 6. Plano de sala visual (arrastrar mesas) — HECHO (02/08/2026)

Nueva vista "Plano" en el TPV: mapa con cada mesa colocada donde está de
verdad en el local, arrastrable con el ratón/dedo (solo en modo edición).
La posición se guarda sola por mesa (`table.x`/`table.y`). Validado que
arrastrar guarda la posición correcta y que un clic normal (sin arrastrar)
sigue abriendo la mesa con normalidad.

## 7. Licencia como suscripción anual (100€/año) en vez de pago único

**Estado: decisión de negocio tomada (02/08/2026), NO implementado — el
usuario confirmó que quiere ir hacia 100€/año en vez de pago único.**

Motivo a favor (mi recomendación cuando se preguntó): un pago único no
encaja con costes recurrentes (nube, mantenimiento, desarrollo continuo);
100€/año es competitivo para lo que hace la app.

Lo que hace falta construir (no es un interruptor, es un proyecto real):
- Añadir fecha de vencimiento a la licencia (`DB.license` no tiene ningún
  concepto de caducidad ahora mismo — se activa una vez y ya vale para
  siempre).
- Aviso de renovación próxima / bloqueo suave si caduca sin renovar.
- Cobro real cada año: necesita un proveedor de pagos (Stripe u otro) —
  infraestructura nueva, no existe nada de cobro automatizado hoy.
- Decidir qué pasa con los datos/acceso si alguien no renueva (¿se
  bloquea la app entera? ¿solo lectura? ¿periodo de gracia?).

## 8. Notificaciones push de verdad (app cerrada del todo / móvil bloqueado)

**Estado: parcialmente hecho (ver "Papelera de reciclaje, registro de
auditoría y avisos del navegador", 02/08/2026) — lo que falta es más
grande y necesita servidor propio.**

Ya está implementado el aviso "mientras el navegador siga abierto" (otra
pestaña, u otra app con el navegador de fondo) para mensajes urgentes de
chat y cierres de caja con avisos. Lo que NO se ha hecho, y necesitaría su
propio proyecto: un aviso real de tipo push que llegue aunque el móvil
esté bloqueado y la app/navegador cerrados del todo. Eso requiere Firebase
Cloud Functions (o un backend propio) desplegado para disparar el push
desde servidor — infraestructura que no existe hoy.

## 9. (añadir aquí lo que vaya surgiendo)

Cuando aparezca un nuevo pendiente "fuera de código" en conversación, se
añade como sección nueva en este archivo, con fecha y contexto suficiente
para retomarlo sin tener que releer toda la conversación original.
