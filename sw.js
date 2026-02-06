const CACHE_VERSION = 'trail-coach-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// Install: cache all assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: Network-first for HTML (to get updates), cache-first for others
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // For navigation requests (HTML pages): network first, fallback to cache
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Update cache with fresh version
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // For other assets: cache first, fallback to network
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // Also fetch fresh version in background
        fetch(event.request).then(response => {
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, response));
        }).catch(() => {});
        return cached;
      }
      return fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
