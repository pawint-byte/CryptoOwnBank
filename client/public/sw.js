// Minimal service worker for CryptoOwnBank PWA.
// Strategy: network-first for HTML/API (always fresh financial data),
// cache-first for static assets (icons, fonts, images).
// Bumping CACHE_VERSION forces all clients to refresh on next load.

const CACHE_VERSION = "cob-v5";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const CORE_ASSETS = [
  "/",
  "/manifest.json",
  "/favicon.png",
  "/apple-touch-icon.svg",
  "/pwa-192x192.svg",
  "/pwa-512x512.svg",
  "/logo.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never cache API calls — financial data must always be fresh.
  if (url.pathname.startsWith("/api/")) return;

  // Never cache cross-origin (analytics, fonts CDN handle their own caching).
  if (url.origin !== self.location.origin) return;

  // Network-first for HTML navigation (so app updates ship instantly when online).
  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/")))
    );
    return;
  }

  // Cache-first for static assets.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok && (req.url.match(/\.(js|css|svg|png|jpg|jpeg|woff2?)$/i))) {
          const copy = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
