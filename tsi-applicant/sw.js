const CACHE_NAME = "tsi-cache-v1";
const STATIC_ASSETS = [
  "/",                                 // Home
  "/index.html",
  "/manifest.json",
  "/images/image(1).png",              // public images
  "/modules/form.js",
  "/modules/index.js",
  "/modules/login.js",
  "/modules/register.js",
  "/modules/userChat.js",
  "/modules/userChatUI.js",
  "/modules/userChatConnection.js",
  "/tsi-applicant/pages/index",
  "/tsi-applicant/pages/form",
  "/tsi-applicant/pages/contact"
];

// --- Install SW and cache static assets ---
self.addEventListener("install", event => {
  console.log("[SW] Installing Service Worker and caching static assets...");
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// --- Activate SW and cleanup old caches ---
self.addEventListener("activate", event => {
  console.log("[SW] Activating Service Worker...");
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.map(key => key !== CACHE_NAME && caches.delete(key)))
    )
  );
  self.clients.claim();
});

// --- Fetch requests ---
self.addEventListener("fetch", event => {
  const requestUrl = new URL(event.request.url);

  // Only handle GET requests
  if (event.request.method !== "GET") return;

  // --- Dynamic caching for pages ---
  if (requestUrl.pathname.startsWith("/tsi-applicant/pages/")) {
    event.respondWith(
      caches.match(event.request).then(cacheRes => {
        if (cacheRes) return cacheRes;

        return fetch(event.request)
          .then(networkRes => {
            return caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkRes.clone());
              return networkRes;
            });
          })
          .catch(() => {
            // Offline fallback page
            return caches.match("/index.html");
          });
      })
    );
    return;
  }

  // --- Dynamic caching for modules and images ---
  if (requestUrl.pathname.startsWith("/modules/") || requestUrl.pathname.startsWith("/images/")) {
    event.respondWith(
      caches.match(event.request).then(cacheRes => {
        return cacheRes || fetch(event.request).then(networkRes => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkRes.clone());
            return networkRes;
          });
        }).catch(() => {
          // Optional: fallback image for offline
          if (requestUrl.pathname.endsWith(".png")) {
            return new Response("", { status: 200, headers: { "Content-Type": "image/png" } });
          }
        });
      })
    );
    return;
  }

  // --- Default cache-first strategy for other requests ---
  event.respondWith(
    caches.match(event.request).then(cacheRes => cacheRes || fetch(event.request))
  );
});
