
/* Training Log service worker
   HTML is network-first so updates appear immediately.
   Icons and fonts are cache-first for speed and offline use. */
const CACHE = 'training-log-v3';
const SHELL = ['./manifest.webmanifest', './icon-192.png', './icon-512.png', './maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(SHELL.map(a => c.add(a))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // never touch API traffic
  if (url.hostname === 'api.anthropic.com') return;

  const isDoc = e.request.mode === 'navigate'
             || e.request.destination === 'document'
             || url.pathname.endsWith('.html')
             || url.pathname.endsWith('/');

  // the app itself: always try the network first, fall back to cache offline
  if (isDoc) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // everything else: cache first
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => hit))
  );
});
