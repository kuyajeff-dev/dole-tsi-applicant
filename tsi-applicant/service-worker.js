/* =========================================================
   SERVICE WORKER — TSI APPLICANT SYSTEM
   Safe caching (NO 206 errors)
========================================================= */

const CACHE_NAME = "tsi-cache-v10"; // ⬅ incremented version

const STATIC_ASSETS = [
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

/* =========================================================
   HELPER: SAFE CACHE PUT (prevents 206 crash)
========================================================= */
async function safeCachePut(cache, request, response) {
  if (
    response &&
    response.status === 200 &&        // ❗ only full responses
    response.type === "basic"         // same-origin only
  ) {
    await cache.put(request, response.clone());
  }
}

/* =========================================================
   INSTALL — CACHE STATIC ASSETS
========================================================= */
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
      await self.skipWaiting();
    })()
  );
});

/* =========================================================
   ACTIVATE — CLEAN OLD CACHES
========================================================= */
self.addEventListener("activate", event => {
  console.log("[SW] Activating...");
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map(key => key !== CACHE_NAME && caches.delete(key))
      );
      await self.clients.claim();

      // Notify pages
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach(client =>
        client.postMessage({ type: "SW_UPDATED" })
      );
    })()
  );
});

/* =========================================================
   FETCH STRATEGY
========================================================= */
self.addEventListener("fetch", event => {
  const req = event.request;

  // Only GET requests
  if (req.method !== "GET") return;

  const reqUrl = new URL(req.url);

  // Skip non-http(s)
  if (!reqUrl.protocol.startsWith("http")) return;

  /* ---------------------------------------------------------
     ❌ NEVER CACHE THESE (prevents 206 + auth issues)
  --------------------------------------------------------- */
  if (
    reqUrl.pathname.startsWith("/api") ||
    reqUrl.pathname.startsWith("/uploads") ||
    reqUrl.pathname.includes("submit-checklist")
  ) {
    return;
  }

  /* ---------------------------------------------------------
     USER PAGES — NETWORK FIRST
  --------------------------------------------------------- */
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
          await safeCachePut(cache, req, networkRes);
          return networkRes;
        } catch (err) {
          const cachedRes = await caches.match(req);
          return cachedRes || caches.match("/tsi-applicant/offline.html");
        }
      })()
    );
    return;
  }

  /* ---------------------------------------------------------
     STATIC ASSETS — CACHE FIRST
  --------------------------------------------------------- */
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
          await safeCachePut(cache, req, networkRes);
          return networkRes;
        } catch (err) {
          if (req.destination === "image") {
            return new Response("", {
              status: 200,
              headers: { "Content-Type": "image/png" }
            });
          }
          return caches.match("/tsi-applicant/offline.html");
        }
      })()
    );
    return;
  }

  /* ---------------------------------------------------------
     DEFAULT — NETWORK WITH FALLBACK
  --------------------------------------------------------- */
  event.respondWith(
    (async () => {
      try {
        const networkRes = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        await safeCachePut(cache, req, networkRes);
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

/* =========================================================
   MESSAGE HANDLER
========================================================= */
self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
