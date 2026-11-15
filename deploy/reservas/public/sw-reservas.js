// Service Worker de la web pública de reservas y pedidos (14/11).
// Por qué: en los partidos de LaLiga algunos operadores bloquean IP de Cloudflare y un cliente que ya había abierto la web
// se quedaba sin ella. Con esto, la segunda visita en adelante carga desde el propio móvil, sin red.
// Los datos (carta, aforo, reservas) NUNCA pasan por aquí: son llamadas a Firebase de otro origen y se hacen siempre en vivo.
// El HTML es el mismo para todas las direcciones (?neg=…, /slug…), así que se guarda UNA copia bajo '/' y se actualiza en segundo plano:
// el cliente ve al instante lo último que tenía y la siguiente visita ya trae la versión nueva.
const CACHE = 'gg-reservas-v1';
const SHELL = '/';

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(c => c.add(SHELL)).catch(() => {}));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;

  if(req.mode === 'navigate'){
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(SHELL);
      const red = fetch(SHELL, {cache: 'no-cache'}).then(res => {
        if(res && res.ok){ const copia = res.clone(); cache.put(SHELL, copia); }
        return res;
      }).catch(() => null);
      if(cached){ event.waitUntil(red); return cached; }
      const res = await red;
      return res || new Response('Sin conexión', {status: 503, headers: {'Content-Type': 'text/plain; charset=utf-8'}});
    })());
    return;
  }

  // Tipografías y logo de la propia web: caché primero.
  if(/^\/fonts\//.test(url.pathname)){
    event.respondWith(caches.match(req).then(c => c || fetch(req).then(res => {
      if(res && res.ok){ const copia = res.clone(); caches.open(CACHE).then(ca => ca.put(req, copia)); }
      return res;
    })));
  }
});
