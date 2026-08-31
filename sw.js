// Service Worker de GastroGoan: cachea el "app shell" (el propio documento,
// que build.sh deja como un único HTML autocontenido con todo el CSS/JS
// incrustado) para que la app pueda seguir cargando aunque falle la conexión
// a mitad de servicio. Los datos de negocio en sí NUNCA pasan por aquí: se
// guardan en IndexedDB local y eso ya funciona sin conexión de por sí.
const CACHE_NAME = 'gastrogoan-shell-v1';
const SHELL_URL = './';

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.add(SHELL_URL).catch(() => {}))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);

  /* El documento principal: CACHÉ PRIMERO.

     Antes era al revés —red primero— y era lo correcto sobre el papel: así
     siempre se veía la última versión. El problema es que la app pesa 4 MB y
     eso significaba descargarlos ENTEROS cada vez que alguien la abre. Un
     solo negocio abriéndola veinte veces al día son 2,4 GB al mes; el plan
     gratuito de Render trae 5 GB. Con dos clientes se acababa el cupo, y al
     tercero la app deja de cargar para todos.

     Ahora se sirve la copia guardada (arranque instantáneo y cero tráfico) y
     quien comprueba si hay versión nueva es la propia app, preguntando por
     `version.json`: 50 bytes en vez de 4 MB. Cuando la hay, avisa al
     hostelero y él decide cuándo actualizar (ver comprobarVersionPublicada
     en js/polish.js). */
  if(req.mode === 'navigate'){
    event.respondWith(
      caches.match(SHELL_URL).then(cached => cached || fetch(req).then(res => {
        // Primera visita en este dispositivo: se guarda para las siguientes.
        if(res && res.ok){
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(SHELL_URL, copy));
        }
        return res;
      }))
    );
    return;
  }

  // El sello de versión NUNCA se sirve de caché: es justo lo que se pregunta
  // para saber si la copia guardada se ha quedado vieja.
  if(url.pathname.endsWith('/version.json')){
    event.respondWith(fetch(req, {cache: 'no-store'}).catch(() => new Response('{}', {headers:{'content-type':'application/json'}})));
    return;
  }

  // Traerse la versión nueva y guardarla, a petición de la app.
  if(url.searchParams.has('gg-actualizar')){
    event.respondWith(
      fetch(SHELL_URL, {cache: 'reload'}).then(res => {
        if(res && res.ok){
          const copy = res.clone();
          return caches.open(CACHE_NAME).then(cache => cache.put(SHELL_URL, copy)).then(() => res);
        }
        return res;
      })
    );
    return;
  }

  // Recursos externos (p.ej. el SDK de Firebase vía CDN): red con
  // actualización en segundo plano, cayendo a caché si no hay conexión.
  event.respondWith(
    caches.match(req).then(cached => {
      const fetchPromise = fetch(req)
        .then(res => {
          if(res && res.ok){
            const copy = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

/* ============================================================
   AVISOS PUSH (mensaje urgente de chat, cierre de caja con avisos)
   Esto es lo que hace que el aviso llegue aunque la app/pestaña esté
   cerrada del todo (mientras el sistema operativo no haya matado el
   navegador de fondo del todo, ver netlify/functions/send-push.js del
   otro lado que dispara este evento). Con la app solo abierta en otra
   pestaña, el aviso ya llega directo desde el propio JS de la app
   (ver notifyDesktop en js/core.js) — este bloque es el que cubre el
   caso "app cerrada del todo".
   ============================================================ */
self.addEventListener('push', event => {
  let data = {title: 'GastroGoan', body: ''};
  try{ if(event.data) data = event.data.json(); }catch(e){}
  event.waitUntil(
    self.registration.showNotification(data.title || 'GastroGoan', {
      body: data.body || '',
      icon: 'icon-192.png',
      tag: data.tag || data.title || 'gastrogoan'
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({type:'window', includeUncontrolled:true}).then(clientList => {
      for(const c of clientList){ if('focus' in c) return c.focus(); }
      if(self.clients.openWindow) return self.clients.openWindow('./');
    })
  );
});
