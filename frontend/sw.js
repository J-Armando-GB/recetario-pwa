const CACHE_NAME = 'recetario-v2';
const STATIC_ASSETS = [
  '/frontend/index.html',
  '/frontend/styles.css',
  '/frontend/app.js',
  '/frontend/manifest.json',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
  '/frontend/assets/icons/icon-1.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Cacheando recursos estáticos');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Estrategia: Red primero con fallback a caché
  if (event.request.url.startsWith('http://localhost:3000/')) {
    // Para llamadas a la API
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  } else {
    // Para recursos estáticos
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => cachedResponse || fetch(event.request))
    );
  }
});