// WATADEX 1.3.0 — static shell only; live data remains network-owned.
const CACHE = 'watadex-v1.3.0';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './catalog-home.css', './artwork.js'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('watadex-') && key !== CACHE).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const scope = new URL(self.registration.scope);
  if (event.request.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(event.request);
    if (cached) return cached;
    const response = await fetch(event.request);
    // Load large region art on demand, then retain it for offline revisits.
    if (response.ok && /\.(png|webp|css|js)$/.test(url.pathname)) {
      await cache.put(event.request, response.clone());
    }
    return response;
  }));
});
