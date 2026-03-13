const CACHE_NAME = "web-acceso-static-v1";
const PRECACHE_URLS = [
    "/manifest.webmanifest",
    "/pwa-icons/192",
    "/pwa-icons/512",
    "/apple-icon",
    "/logo/cosayach.png",
];

self.addEventListener("install", (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(PRECACHE_URLS))
            .catch(() => undefined),
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => Promise.all(
                cacheNames
                    .filter((cacheName) => cacheName !== CACHE_NAME)
                    .map((cacheName) => caches.delete(cacheName)),
            ))
            .then(() => self.clients.claim()),
    );
});

self.addEventListener("fetch", (event) => {
    const { request } = event;

    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);

    if (url.origin !== self.location.origin) {
        return;
    }

    const isStaticAsset = url.pathname.startsWith("/_next/static/")
        || url.pathname.startsWith("/logo/")
        || url.pathname.startsWith("/pwa-icons/")
        || url.pathname === "/manifest.webmanifest"
        || url.pathname === "/apple-icon"
        || request.destination === "style"
        || request.destination === "script"
        || request.destination === "font"
        || request.destination === "image";

    if (!isStaticAsset) {
        return;
    }

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(request)
                .then((networkResponse) => {
                    if (networkResponse.ok) {
                        const responseClone = networkResponse.clone();

                        void caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
                    }

                    return networkResponse;
                })
                .catch(() => cachedResponse);
        }),
    );
});