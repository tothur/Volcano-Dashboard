const CACHE_NAME = "volcano-dashboard-v1";

function appBasePath() {
  return new URL(self.registration.scope).pathname;
}

function appUrl(path) {
  return `${appBasePath()}${path}`;
}

const APP_SHELL = [
  "",
  "site.webmanifest",
  "data/volcanoes.json",
  "icons/favicon-16.png",
  "icons/favicon-32.png",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "images/region-globes/africa.png",
  "images/region-globes/asia.png",
  "images/region-globes/europe.png",
  "images/region-globes/north-america.png",
  "images/region-globes/oceania.png",
  "images/region-globes/other.png",
  "images/region-globes/south-america.png",
].map(appUrl);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(appUrl(""))));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        const copy = response.clone();
        if (response.ok) {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
