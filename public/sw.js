const CACHE_NAME = "nutritrack-v2";

// Cache the app shell on install
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Clear old caches
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    ).then(() => clients.claim())
  );
});

// Network-first strategy — skip API routes entirely so they are never intercepted
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never intercept API routes or auth routes
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
