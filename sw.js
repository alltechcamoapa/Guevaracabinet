const CACHE_NAME = 'guevara-pwa-v9';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/db.js',
  '/app.js',
  '/clientes.js',
  '/productos.js',
  '/proformas.js',
  '/facturas.js',
  '/configuracion.js',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => k !== CACHE_NAME ? caches.delete(k) : null));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});
