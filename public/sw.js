// Service Worker — Diretor Musical PWA
const CACHE = 'dm-shell-v1';
const SHELL = ['/', '/index.html', '/static/js/main.chunk.js', '/static/js/bundle.js', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-first para o shell, network-first para a API
self.addEventListener('fetch', e => {
  if (e.request.url.includes('/api/')) return; // API sempre vai para a rede
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
