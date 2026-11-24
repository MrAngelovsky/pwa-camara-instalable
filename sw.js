'use strict';

const NOMBRE_CACHE = 'inspeccion-visual-v1';
const RECURSOS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(NOMBRE_CACHE)
      .then(function (cache) {
        return cache.addAll(RECURSOS);
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (nombres) {
        return Promise.all(
          nombres
            .filter(function (nombre) {
              return nombre !== NOMBRE_CACHE;
            })
            .map(function (nombre) {
              return caches.delete(nombre);
            })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(function (respuestaCache) {
        if (respuestaCache) return respuestaCache;

        return fetch(event.request)
          .then(function (respuestaRed) {
            if (!respuestaRed || respuestaRed.status !== 200 || respuestaRed.type === 'opaque') {
              return respuestaRed;
            }

            const copia = respuestaRed.clone();
            caches.open(NOMBRE_CACHE).then(function (cache) {
              cache.put(event.request, copia);
            });

            return respuestaRed;
          });
      })
  );
});
