const CACHE_NAME = 'bingo-cache-v1';
// Archivos mínimos para que funcione offline si se cae el internet
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/client.js',
  '/socket.io/socket.io.js',
  '/icon-192.png',
  '/icon-512.png'
];

// 1. Instalación: Guarda lo básico
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// 2. Activación: Borra cachés viejas (Para que no se acumule basura)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 3. Peticiones: ESTRATEGIA RED PRIMERO (Network First)
// Intenta ir a internet. Si falla (sin conexión), usa el caché.
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});