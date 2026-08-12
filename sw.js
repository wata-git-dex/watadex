// WATADEX Service Worker
// Cache name — bump the version string to force clients to refresh.
const CACHE = "watadex-v2";

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
];

// Install: cache core assets
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
//   • Cloudflare Worker URL → network first (live data), fallback to shell
//   • Everything else → cache first (offline works)
self.addEventListener("fetch", event => {
  if (event.request.url.includes("workers.dev")) {
    // Live data: network first, fall back to cached shell so UI still loads
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match("./index.html")
      )
    );
  } else {
    // Static assets: cache first
    event.respondWith(
      caches.match(event.request).then(cached =>
        cached || fetch(event.request)
      )
    );
  }
});
