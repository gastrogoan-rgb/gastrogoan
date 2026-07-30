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

  // El documento principal: red primero, para tener siempre la última
  // versión publicada; si no hay red, se sirve la copia guardada para que
  // la app arranque igualmente sin conexión.
  if(req.mode === 'navigate'){
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(SHELL_URL, copy));
          return res;
        })
        .catch(() => caches.match(SHELL_URL).then(cached => cached || caches.match(req)))
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
