/**
 * Offline-capable, but never stale.
 *
 * The first version was cache-first for everything, including the shell, with a
 * fixed cache name. Two things followed. The HTML never refreshed, so it kept
 * pointing at bundle names from the day someone installed. And sw.js itself
 * never changed a byte, so the browser had no reason to look for a new worker.
 * Anyone who added Mull to their home screen was frozen on that build for good,
 * and no fix could ever reach them.
 *
 * So: navigations go to the network first and fall back to cache when offline,
 * because that one request decides which bundles get loaded. Hashed assets stay
 * cache-first, since their names change when they change. And BUILD is stamped
 * at export time, which names the cache and also guarantees this file differs
 * every release, so the update check has something to find.
 */
const BUILD = 'a9b0d8c23a00';
const CACHE = `mull-${BUILD}`;
const SHELL = ['/', '/manifest.json', '/apple-touch-icon.png', '/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // A navigation picks the HTML, and the HTML picks every bundle. This one has
  // to be fresh whenever the network allows it.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put('/', copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match('/').then((hit) => hit ?? Response.error())),
    );
    return;
  }

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
          .catch(() => caches.match('/')),
    ),
  );
});
