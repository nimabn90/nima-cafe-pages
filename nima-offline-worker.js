// Update the version when either offline asset changes.
const scope = new URL(self.registration.scope);
const cachePrefix = `nima-cafe-offline-${scope.pathname}:`;
const cacheName = `${cachePrefix}3`;
const offlinePage = new URL("offline.html", scope).pathname;
const offlineStyles = new URL("recovery.css", scope).pathname;

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll([offlinePage, offlineStyles].map(path => new Request(path, { cache: "reload" })));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => (key.startsWith(cachePrefix) && key !== cacheName) || (scope.pathname === "/" && key === "nima-cafe-offline-2")).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function navigate(request) {
  try {
    return await fetch(request);
  } catch {
    const fallback = await caches.match(offlinePage, { cacheName });
    if (!fallback) return Response.error();
    const html = (await fallback.text()).replace('href="recovery.css"', 'href="' + offlineStyles + '"');
    return new Response(html, {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
}

self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(navigate(request));
  } else if (url.pathname === offlineStyles) {
    event.respondWith(caches.match(request, { cacheName }).then(cached => cached || fetch(request)));
  }
});
