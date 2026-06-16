const CACHE_NAME = 'ce-game-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './project.json',
  './js/scripts.js',
  './translations/engine.lang'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
