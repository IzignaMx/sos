const PRECACHE = 'sos-precache-v2';
const RUNTIME = 'sos-runtime-v1';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/i18n/es.json',
  '/i18n/en.json',
  '/i18n/pt.json',
  '/i18n/fr.json',
  '/i18n/de.json',
  '/i18n/it.json',
  '/i18n/ja.json',
  '/i18n/zh.json',
  '/i18n/ar.json',
  '/i18n/ru.json',
  '/i18n/tr.json',
  '/i18n/hi.json',
  '/i18n/ko.json',
  '/i18n/la.json',
  '/i18n/eo.json',
  '/i18n/nl.json',
  '/i18n/sv.json',
  '/i18n/pl.json',
  '/i18n/uk.json',
  '/i18n/vi.json',
  '/assets/img/og-izigna-sos.png',
  '/assets/img/pwa-screenshot-mobile.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (![PRECACHE, RUNTIME].includes(cacheName)) {
              return caches.delete(cacheName);
            }
            return undefined;
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const requestURL = new URL(request.url);

  // Handle navigation requests with offline fallback
  if (request.mode === 'navigate' && requestURL.origin === self.location.origin) {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Cache-first strategy for precached assets
  if (requestURL.origin === self.location.origin && PRECACHE_URLS.includes(requestURL.pathname)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          return caches.open(PRECACHE).then((cache) => {
            cache.put(request, response.clone());
            return response;
          });
        });
      })
    );
    return;
  }

  // Stale-while-revalidate for translation catalogs
  if (requestURL.origin === self.location.origin && requestURL.pathname.startsWith('/i18n/')) {
    event.respondWith(
      caches.open(RUNTIME).then((cache) =>
        cache.match(request).then((cachedResponse) => {
          const networkFetch = fetch(request)
            .then((response) => {
              if (response && response.status === 200) {
                cache.put(request, response.clone());
              }
              return response;
            })
            .catch(() => cachedResponse);
          return cachedResponse || networkFetch;
        })
      )
    );
    return;
  }

  // Google Fonts stylesheet -> stale-while-revalidate
  if (requestURL.origin === 'https://fonts.googleapis.com') {
    event.respondWith(
      caches.open(RUNTIME).then((cache) =>
        cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          });
          return cachedResponse || fetchPromise;
        })
      )
    );
    return;
  }

  // Google Fonts files -> cache-first
  if (requestURL.origin === 'https://fonts.gstatic.com') {
    event.respondWith(
      caches.open(RUNTIME).then((cache) =>
        cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request).then((response) => {
            cache.put(request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // Default: try network, fall back to runtime cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(RUNTIME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return response;
      })
      .catch(() => caches.match(request))
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
