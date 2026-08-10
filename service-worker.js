const CACHE_NAME = "church-music-library-v1-1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/music-library.js",
  "./js/app.js",
  "./manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        /*
          Cache only same-origin files. PDF.js currently comes from a CDN;
          we'll bring it local when we finish the full offline PWA version.
        */
        if (new URL(event.request.url).origin === self.location.origin) {
          const copy = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, copy);
          });
        }

        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
