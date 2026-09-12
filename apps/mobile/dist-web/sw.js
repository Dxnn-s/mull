/**
 * Cache-first for the app shell so Mull opens with no network, which matters
 * because the whole point is that it launches the instant a blocked app bounces
 * you here. Network-first for provider calls, which are never cached.
 */
const CACHE = 'mull-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(['/', '/manifest.json', '/apple-touch-icon.png', '/icon-192.png'])).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request).then(
      (hit) =>
        hit ??
        fetch(e.request)
          .then((res) => {
            // Only bank same-origin successes; a 404 in the cache is worse than none.
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
            }
            return res;
          })
          // Offline and not cached: fall back to the shell so routes still open.
          .catch(() => caches.match('/')),
    ),
  );
});
