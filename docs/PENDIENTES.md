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

## 3. (añadir aquí lo que vaya surgiendo)

Cuando aparezca un nuevo pendiente "fuera de código" en conversación, se
añade como sección nueva en este archivo, con fecha y contexto suficiente
para retomarlo sin tener que releer toda la conversación original.
