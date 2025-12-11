const CACHE_NAME = "tsi-cache-v1";
const urlsToCache = [
  "/",
  "index.html",
  "manifest.json",
  "./public/images/image(1).png",
  "./public/images/image(1).png",
  "./modules/form.js",
  "./modules/index.js",
  "./modules/login.js",
  "./modules/register.js",
];

// Install SW and cache files
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Activate SW and cleanup old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => key !== CACHE_NAME && caches.delete(key)))
    )
  );
});

// Fetch requests
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
