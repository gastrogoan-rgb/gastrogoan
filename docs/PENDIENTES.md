# Pendientes generales del proyecto

Lista maestra de "cosas pendientes fuera del código en sí" (despliegue,
decisiones de negocio, trámites...). Cuando el usuario pregunte "¿qué
pendientes hay?", repasar este archivo entero (y los archivos específicos
enlazados abajo, como `VERIFACTU_PENDIENTE.md`) y responder con todo junto.

Última actualización: 02/08/2026.

## 1. Desplegar la app en un hosting de verdad (Netlify) con dominio propio

**Estado: pendiente, a la espera de que el usuario confirme que la app está
en su versión final.** Confirmado otra vez el 04/08/2026: quiere esperar a
la versión final antes de subirla, aunque sabe que técnicamente podría
hacerlo ya (redesplegar es tan simple como volver a arrastrar la carpeta).
No hacer nada de esto hasta que lo pida explícitamente — es él quien decide
cuándo está lista para publicarse.

**Recordatorio permanente para el propio asistente** (el usuario pidió
explícitamente no olvidar esto): cada vez que se entregue una versión
nueva de la app, tener preparado un paquete de despliegue actualizado
(`dist/index.html`, `dist/reservagastrogoan.html`, `sw.js`, `_redirects`,
y si aplica `netlify/functions/send-push.js` + `package.json` +
`node_modules` + `README-PUSH.md` para los avisos push) — así, en cuanto
el usuario diga "ya está, súbela", solo hay que entregarle la carpeta ya
lista, sin tener que reconstruirla de cero en ese momento.

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

## 8. Notificaciones push de verdad (app cerrada del todo / móvil bloqueado) — HECHO en código (04/08/2026), pendiente de desplegar

Construido con el estándar Web Push (no ha hecho falta Firebase Cloud
Functions al final — una función serverless de Netlify basta):
- Cliente: `subscribeToPush()`/`sendPushToAll()` en `js/core.js`, guardan
  la suscripción de cada dispositivo junto al resto de datos del negocio
  (se sincroniza sola) y llaman a la función al disparar un aviso urgente
  de chat o un cierre de caja con avisos.
- Service Worker (`sw.js`): ya sabe recibir el push y mostrar el aviso del
  sistema operativo, y al tocarlo abre/enfoca la app.
- Función serverless (`netlify/functions/send-push.js`, con `web-push` ya
  instalado en el paquete que se entregó): reenvía el aviso de verdad a
  los demás dispositivos suscritos.
- Claves VAPID ya generadas (públicas, en el código; la privada se pasó
  solo por `README-PUSH.md`, no vive en el repo).

**Pendiente de que el usuario lo despliegue** (no se puede hacer desde
aquí, hace falta su cuenta de Netlify): seguir los 3 pasos de
`README-PUSH.md` (poner las dos variables de entorno en Netlify y subir
la carpeta con `node_modules` incluido). Sin desplegar la función, todo
sigue funcionando igual que antes (avisos solo con el navegador abierto)
— no rompe nada, es un añadido opcional.

Validado con pruebas: la lógica de "nunca avisarme a mí mismo" y la
llamada a la función con los destinatarios correctos. Lo que NO se puede
probar desde aquí es la entrega real del push (necesita la función
desplegada de verdad + un dispositivo real).

## 9. Ronda de 9 funcionalidades nuevas (04/08/2026) — HECHO, todo en código

El usuario pidió una reflexión exhaustiva de qué faltaba de verdad, y tras
varias rondas se cerró en 9 puntos, todos implementados, validados con
Puppeteer y subidos a la rama:

1. RGPD/derecho al olvido — borrado real e inmediato de datos personales de
   un cliente, más consentimiento obligatorio en la reserva pública.
2. Juntar mesas en el TPV.
3. Reserva con señal/depósito (confirmación manual, sin pasarela de pago).
4. Onboarding ligero (mini-tour) para empleado nuevo en su primer acceso.
5. Lista de espera para walk-ins sin mesa libre.
6. Solicitud de vacaciones del empleado con aprobación del propietario.
7. Encuesta de satisfacción privada (NPS) tras la visita.
8. Recordatorio de copia de seguridad periódica (sin backend propio, es un
   aviso activo, no un backup automático real).
9. Adjuntar foto/PDF real de factura/albarán a cada pedido a proveedor.

Nada de esto queda pendiente de decisión de negocio ni de despliegue
externo — es funcionalidad normal, ya incluida en el próximo paquete que
se entregue.

## 10. Auditoría exhaustiva + 4 funcionalidades más (04/08/2026) — HECHO, todo en código

Tras cerrar la ronda anterior, el usuario pidió una auditoría exhaustiva y
honesta de qué más faltaba de verdad (repasando el código real, no por
intuición) antes de seguir añadiendo. Se verificó línea a línea todo
`js/*.js` y se identificaron 4 huecos reales de valor (y se descartaron
expresamente varias ideas que ya existían: fidelización, propinas,
previsión financiera, menu engineering, autopedido QR). Los 4 se
implementaron y validaron con Puppeteer:

1. **Impresión térmica real por Bluetooth (ESC/POS)** — alternativa al
   diálogo de imprimir del navegador; conecta una impresora térmica de
   58/80mm por Web Bluetooth. Solo Chrome/Edge (no Safari/Firefox) — sin
   soporte, el "Imprimir" de siempre sigue funcionando igual.
2. **Tarjetas/bonos regalo prepago** — emitir código con importe/saldo,
   nuevo método de pago que descuenta del saldo real al cobrar.
3. **Cupones/códigos promocionales canjeables por el cliente** — a
   diferencia del descuento manual (PIN+motivo, lo decide el personal),
   este lo trae el cliente; funciona tanto en el TPV como en la web
   pública de pedidos, con límite de usos opcional y canjes reales
   medibles (no solo "vistas" de una campaña).
4. **Conciliación bancaria manual** — compara lo cobrado por tarjeta
   según el TPV con el extracto real del banco (introducido a mano, sin
   integración bancaria real que no existe hoy).

Nada de esto queda pendiente de decisión de negocio ni de despliegue
externo tampoco.

**Nota importante para el propio asistente**: cuando el usuario pregunte
de nuevo "¿qué más falta?", NO se le puede prometer un "no hay nada más"
absoluto — eso no es honesto en una app viva. Lo correcto es repetir una
auditoría real del código (no una opinión rápida) cada vez que lo pida.

## 11. (añadir aquí lo que vaya surgiendo)

Cuando aparezca un nuevo pendiente "fuera de código" en conversación, se
añade como sección nueva en este archivo, con fecha y contexto suficiente
para retomarlo sin tener que releer toda la conversación original.
