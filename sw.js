// Mantener esta versión sincronizada con data-release del HTML.
const RELEASE = "20261104-izigna-flow-1";
const PRECACHE = "sos-precache-" + RELEASE;
const RUNTIME = "sos-runtime-" + RELEASE;
const versionedUrl = (path) => path + "?v=" + RELEASE;

const PRECACHE_URLS = [
  "/",
  "/assets/css/editorial.css",
  "/assets/css/language-flags.css",
  "/assets/js/main.js",
  "/assets/js/service-guide.js",
  "/assets/fonts/Aileron-Regular.woff2",
  "/assets/fonts/Aileron-Bold.woff2",
  "/assets/img/izignamx-mark.svg",
  "/assets/js/editorial.js",
  "/assets/js/laboratory.js",
  "/assets/img/flow-sculpture-640.webp",
  "/assets/img/flow-sculpture-1024.webp",
  "/index.html",
  "/privacy.html",
  "/security.html",
  "/manifest.webmanifest",
  "/i18n/es.json",
  "/i18n/en.json",
  "/i18n/pt.json",
  "/i18n/fr.json",
  "/i18n/de.json",
  "/i18n/it.json",
  "/i18n/ja.json",
  "/i18n/zh.json",
  "/i18n/ar.json",
  "/i18n/ru.json",
  "/i18n/tr.json",
  "/i18n/hi.json",
  "/i18n/ko.json",
  "/i18n/la.json",
  "/i18n/eo.json",
  "/i18n/nl.json",
  "/i18n/sv.json",
  "/i18n/pl.json",
  "/i18n/uk.json",
  "/i18n/vi.json",
  "/assets/img/og-izigna-sos@1200.png",
  "/assets/img/pwa-screenshot-mobile.png",
].map(versionedUrl);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
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
          }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const requestURL = new URL(request.url);

  // Avoid caching non-HTTP requests (like chrome-extension://)
  if (!requestURL.protocol.startsWith("http")) {
    return;
  }

  // Handle navigation requests with offline fallback
  if (
    request.mode === "navigate" &&
    requestURL.origin === self.location.origin
  ) {
    event.respondWith(
      fetch(request).catch(() =>
        caches
          .match(versionedUrl("/"))
          .then((cached) => cached || Response.error()),
      ),
    );
    return;
  }

  // Cache-first strategy for precached assets
  if (
    requestURL.origin === self.location.origin &&
    PRECACHE_URLS.includes(requestURL.pathname + requestURL.search)
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request)
          .then((response) => {
            return caches.open(PRECACHE).then((cache) => {
              if (response.ok) cache.put(request, response.clone());
              return response;
            });
          })
          .catch(() => Response.error());
      }),
    );
    return;
  }

  // Stale-while-revalidate for translation catalogs
  if (
    requestURL.origin === self.location.origin &&
    requestURL.pathname.startsWith("/i18n/")
  ) {
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
            .catch(() => cachedResponse || Response.error());
          return cachedResponse || networkFetch;
        }),
      ),
    );
    return;
  }

  // Google Fonts stylesheet -> stale-while-revalidate
  if (requestURL.origin === "https://fonts.googleapis.com") {
    event.respondWith(
      caches.open(RUNTIME).then((cache) =>
        cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              cache.put(request, networkResponse.clone());
              return networkResponse;
            })
            .catch(() => cachedResponse || Response.error());
          return cachedResponse || fetchPromise;
        }),
      ),
    );
    return;
  }

  // Google Fonts files -> cache-first
  if (requestURL.origin === "https://fonts.gstatic.com") {
    event.respondWith(
      caches.open(RUNTIME).then((cache) =>
        cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request)
            .then((response) => {
              cache.put(request, response.clone());
              return response;
            })
            .catch(() => Response.error());
        }),
      ),
    );
    return;
  }

  // Analytics or external tracking requests shouldn't be cached, just pass through
  if (
    requestURL.hostname.includes("analytics") ||
    requestURL.hostname.includes("cloudflareinsights")
  ) {
    event.respondWith(fetch(request).catch(() => Response.error()));
    return;
  }

  // Default: try network, fall back to runtime cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(RUNTIME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || Response.error()),
      ),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
