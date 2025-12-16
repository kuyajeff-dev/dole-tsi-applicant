const CACHE_NAME = "tsi-cache-v6"; // Increment for new deployments
const STATIC_ASSETS = [
  // Static assets only (cache-first)
  "/tsi-applicant/manifest.json",

  // Images
  "/tsi-applicant/images/image(1).png",

  // JS modules
  "/tsi-applicant/modules/form.js",
  "/tsi-applicant/modules/index.js",
  "/tsi-applicant/modules/login.js",
  "/tsi-applicant/modules/register.js",
  "/tsi-applicant/modules/userChat.js",
  "/tsi-applicant/modules/userChatUI.js",
  "/tsi-applicant/modules/userChatConnection.js",

  // Offline fallback
  "/tsi-applicant/offline.html",
];

// ---------------------------
// Install: cache static assets
// ---------------------------
self.addEventListener("install", event => {
  console.log("[SW] Installing...");
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn("[SW] Failed to cache:", asset, err);
        }
      }
      await self.skipWaiting(); // Activate immediately
    })()
  );
});

// ---------------------------
// Activate: clean up old caches
// ---------------------------
self.addEventListener("activate", event => {
  console.log("[SW] Activating...");
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => key !== CACHE_NAME && caches.delete(key)));
      await self.clients.claim();

      // Notify clients to reload for new SW
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach(client => client.postMessage({ type: "SW_UPDATED" }));
    })()
  );
});

// ---------------------------
// Fetch: network-first for user pages, cache-first for static assets
// ---------------------------
self.addEventListener("fetch", event => {
  const req = event.request;

  // Only handle GET requests
  if (req.method !== "GET") return;

  const reqUrl = new URL(req.url);

  // Skip unsupported schemes
  if (!reqUrl.protocol.startsWith("http")) return;

  // ----------------- User pages (network-first) -----------------
  if (
    reqUrl.pathname.startsWith("/tsi-applicant/pages/") ||
    reqUrl.pathname === "/tsi-applicant/index.html" ||
    reqUrl.pathname === "/tsi-applicant/login.html" ||
    reqUrl.pathname === "/tsi-applicant/register.html"
  ) {
    event.respondWith(
      (async () => {
        try {
          const networkRes = await fetch(req);
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, networkRes.clone());
          return networkRes;
        } catch (err) {
          const cachedRes = await caches.match(req);
          return cachedRes || caches.match("/tsi-applicant/offline.html");
        }
      })()
    );
    return;
  }

  // ----------------- Static assets (cache-first) -----------------
  if (
    reqUrl.pathname.startsWith("/tsi-applicant/modules/") ||
    reqUrl.pathname.startsWith("/tsi-applicant/images/") ||
    reqUrl.pathname === "/tsi-applicant/manifest.json" ||
    reqUrl.pathname === "/tsi-applicant/offline.html"
  ) {
    event.respondWith(
      (async () => {
        const cachedRes = await caches.match(req);
        if (cachedRes) return cachedRes;

        try {
          const networkRes = await fetch(req);
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, networkRes.clone());
          return networkRes;
        } catch (err) {
          // Return empty image for images or offline fallback for others
          if (reqUrl.pathname.match(/\.(png|jpg|jpeg|gif)$/i)) {
            return new Response("", { status: 200, headers: { "Content-Type": "image/png" } });
          }
          return caches.match("/tsi-applicant/offline.html");
        }
      })()
    );
    return;
  }

  // ----------------- Default: network with fallback -----------------
  event.respondWith(
    (async () => {
      try {
        const networkRes = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, networkRes.clone());
        return networkRes;
      } catch (err) {
        const cachedRes = await caches.match(req);
        if (cachedRes) return cachedRes;

        if (req.destination === "document") {
          return caches.match("/tsi-applicant/offline.html");
        }

        return new Response("", { status: 504 });
      }
    })()
  );
});

// ---------------------------
// Messages from client (skip waiting)
// ---------------------------
self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
