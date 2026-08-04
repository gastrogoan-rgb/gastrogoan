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

## 4. Modo offline real del TPV

**Estado: aparcado, no empezar sin que el usuario lo pida explícitamente.**

Que el TPV siga funcionando (cobrar, comandar) si se cae la conexión a
mitad de servicio, guardando todo en una cola local y sincronizando solo
al recuperar internet. Es un cambio de fondo en el motor de sincronización
con la nube (colas, resolución de conflictos si dos dispositivos cobraron
la misma mesa offline, etc.) — merece su propia sesión centrada solo en
esto, no meterlo de pasada junto con otras features.

## 5. Comanda por voz en cocina

**Estado: aparcado, no empezar sin que el usuario lo pida explícitamente.**

Reconocimiento de voz (Web Speech API) para marcar platos como marchados
sin tocar la pantalla. Técnicamente viable, pero hay que probarlo en una
cocina de verdad (ruido, acentos, manos libres) antes de darlo por
terminado — no se puede validar solo con pruebas automatizadas de texto.

## 6. Plano de sala visual (arrastrar mesas)

**Estado: aparcado, no empezar sin que el usuario lo pida explícitamente.**

Un editor visual tipo mapa/canvas donde se vea la disposición real del
local y se puedan arrastrar mesas/reservas, en vez de la lista/grid actual
de mesas. Es un subsistema de UI nuevo entero (editor de layout, guardar
posiciones, distintas vistas por zona) — proyecto propio, no un añadido
rápido.

## 7. (añadir aquí lo que vaya surgiendo)

Cuando aparezca un nuevo pendiente "fuera de código" en conversación, se
añade como sección nueva en este archivo, con fecha y contexto suficiente
para retomarlo sin tener que releer toda la conversación original.
