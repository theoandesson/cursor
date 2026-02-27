import {
  TILE_CACHE_PREFIX,
  buildTileCacheName,
  getDailyCacheVersion,
  isTileCacheableRequest
} from "./src/cache/tileCachePolicy.js";

const cacheableResponse = (response) =>
  response && (response.ok || response.type === "opaque");

const deleteOutdatedTileCaches = async (activeCacheName) => {
  const cacheNames = await caches.keys();
  const outdated = cacheNames.filter(
    (cacheName) =>
      cacheName.startsWith(TILE_CACHE_PREFIX) && cacheName !== activeCacheName
  );
  await Promise.all(outdated.map((cacheName) => caches.delete(cacheName)));
};

const getCachedResponseOrFetch = async (request, cacheName) => {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request).then((response) => {
    if (cacheableResponse(response)) {
      cache.put(request, response.clone());
    }
    return response;
  });

  if (cached) {
    networkPromise.catch(() => undefined);
    return cached;
  }

  return networkPromise;
};

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  const activeCacheName = buildTileCacheName();
  event.waitUntil(
    deleteOutdatedTileCaches(activeCacheName).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (!isTileCacheableRequest(event.request)) {
    return;
  }

  const activeCacheName = buildTileCacheName();
  event.respondWith(getCachedResponseOrFetch(event.request, activeCacheName));
  event.waitUntil(deleteOutdatedTileCaches(activeCacheName));
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "REQUEST_TILE_CACHE_VERSION") {
    return;
  }

  event.source?.postMessage({
    type: "TILE_CACHE_VERSION",
    version: getDailyCacheVersion(),
    cacheName: buildTileCacheName()
  });
});
