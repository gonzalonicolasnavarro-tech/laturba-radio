const CACHE_NAME = 'laturba-v1';
const SHELL = [
  '/laturba-radio/',
  '/laturba-radio/index.html',
  '/laturba-radio/manifest.json',
  '/laturba-radio/icons/icon-192.png',
  '/laturba-radio/icons/icon-512.png'
];

// Install: cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: shell from cache, stream always from network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // El stream de audio siempre va directo a red — nunca cachear
  if (url.hostname === 'tus.radios.ar') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Para el resto: cache-first (app shell)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        // No cachear recursos de terceros ni respuestas inválidas
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      });
    }).catch(() => {
      // Offline fallback: servir index.html para cualquier navegación
      if (event.request.mode === 'navigate') {
        return caches.match('/laturba-radio/index.html');
      }
    })
  );
});
