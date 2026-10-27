const CACHE_NAME = 'al-miqyas-v32';
const SHELL = ['./index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // satu kali unduh untuk halaman utama, disimpan untuk './' dan './index.html'
    const res = await fetch('./index.html', { cache: 'no-store' });
    if (!res.ok) throw new Error('index.html ' + res.status);
    await cache.put('./index.html', res.clone());
    await cache.put('./', res);
    // berkas pendukung: kegagalan salah satunya tidak membatalkan pemasangan
    await Promise.all(SHELL.slice(1).map((u) => cache.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const req = event.request;
  event.respondWith(
    caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then((cached) => {
      const fetchPromise = fetch(req, { cache: 'no-store' })
        .then((response) => {
          if (response && response.ok && new URL(req.url).origin === location.origin) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return response;
        })
        .catch(() => cached || (req.mode === 'navigate' ? caches.match('./index.html') : undefined));
      return cached || fetchPromise;
    })
  );
});
