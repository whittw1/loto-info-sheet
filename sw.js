const CACHE_NAME = 'loto-collector-v7.92';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './FingerLakes_Information_Sheet.html',
  './manifest.json',
  './manifest_fl.json',
  // Bundled export libraries (build 93 — no longer CDN): without them an
  // offline export stops.
  './vendor/jszip-3.10.1.min.js',
  './vendor/exceljs-4.4.0.min.js'
];

// Install — cache the app. Each URL on its own: one CDN hiccup must not stop
// the whole app from being cached.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(URLS_TO_CACHE.map(u => cache.add(u).catch(err => console.warn('precache miss', u, err))))
    )
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network first, fall back to cache (ensures updates are always picked up).
// Only GOOD answers are cached: a 404/500 — or a Wi-Fi captive-portal page — must
// never replace the app's cached copy.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).then(response => {
      if (response && (response.ok || response.type === 'opaque')) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone)).catch(() => {});
      }
      return response;
    }).catch(() =>
      caches.match(event.request, { ignoreSearch: true }).then(r =>
        r || (event.request.mode === 'navigate' ? caches.match('./index.html') : undefined))
    )
  );
});
