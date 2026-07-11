import {
  TILE_CACHE_PREFIX,
  TILE_CACHE_RETENTION_VERSIONS,
  buildTileCacheName,
  extractVersionFromCacheName,
  getDailyCacheVersion,
  isTileCacheableRequest
} from "./src/cache/tileCachePolicy.js";

const API_CACHE_NAME = "sweden-map-api-v1";
const API_SWR_PATHS = new Set(["/api/bootstrap", "/api/weather/cities"]);
const DELETE_OUTDATED_DEBOUNCE_MS = 60000;

let lastDeleteOutdatedAt = 0;
let deleteOutdatedInFlight = null;

const cacheableResponse = (response) =>
  response && (response.ok || response.type === "opaque");

const isApiCacheableRequest = (request) => {
  if (!request || request.method !== "GET") {
    return false;
  }

  try {
    const url = new URL(request.url);
    return url.origin === self.location.origin && API_SWR_PATHS.has(url.pathname);
  } catch {
    return false;
  }
};

const putInCache = async (cache, request, response) => {
  try {
    await cache.put(request, response.clone());
  } catch (error) {
    console.warn("Tilecache put failed.", error);
  }
};

const staleWhileRevalidateApi = async (request) => {
  const cache = await caches.open(API_CACHE_NAME);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (cacheableResponse(response)) {
        return putInCache(cache, request, response).then(() => response);
      }
      return response;
    })
    .catch((error) => {
      if (cached) {
        return cached;
      }
      throw error;
    });

  if (cached) {
    networkPromise.catch(() => undefined);
    return cached;
  }

  return networkPromise;
};

const getTileCacheNamesByFreshness = async () => {
  const cacheNames = await caches.keys();
  return cacheNames
    .filter((cacheName) => cacheName.startsWith(TILE_CACHE_PREFIX))
    .sort((left, right) => right.localeCompare(left));
};

const getRetainedCacheNames = async (activeCacheName) => {
  const namesByFreshness = await getTileCacheNamesByFreshness();
  const retained = [activeCacheName];

  namesByFreshness.forEach((cacheName) => {
    if (cacheName === activeCacheName) {
      return;
    }

    if (retained.length >= TILE_CACHE_RETENTION_VERSIONS) {
      return;
    }

    retained.push(cacheName);
  });

  return retained;
};

const deleteOutdatedTileCaches = async (activeCacheName) => {
  const retainedNames = await getRetainedCacheNames(activeCacheName);
  const retainedSet = new Set(retainedNames);
  const cacheNames = await caches.keys();
  const outdated = cacheNames.filter(
    (cacheName) =>
      cacheName.startsWith(TILE_CACHE_PREFIX) && !retainedSet.has(cacheName)
  );
  await Promise.all(outdated.map((cacheName) => caches.delete(cacheName)));
};

const debouncedDeleteOutdatedTileCaches = (activeCacheName) => {
  const now = Date.now();
  if (deleteOutdatedInFlight && now - lastDeleteOutdatedAt < DELETE_OUTDATED_DEBOUNCE_MS) {
    return deleteOutdatedInFlight;
  }

  lastDeleteOutdatedAt = now;
  deleteOutdatedInFlight = deleteOutdatedTileCaches(activeCacheName)
    .catch((error) => {
      console.warn("Tilecache cleanup failed.", error);
    })
    .finally(() => {
      deleteOutdatedInFlight = null;
    });

  return deleteOutdatedInFlight;
};

const findCachedInNamedCaches = async (request, cacheNames) => {
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
  }
  return null;
};

const getCacheHealthPayload = async () => {
  const activeCacheName = buildTileCacheName();
  const activeCache = await caches.open(activeCacheName);
  const entries = (await activeCache.keys()).length;
  const retainedCaches = await getRetainedCacheNames(activeCacheName);

  return {
    type: "TILE_CACHE_HEALTH",
    version: extractVersionFromCacheName(activeCacheName) ?? getDailyCacheVersion(),
    cacheName: activeCacheName,
    entries,
    retainedCaches
  };
};

const getCachedResponseOrFetch = async (request, cacheName) => {
  const cache = await caches.open(cacheName);
  const cachedInActive = await cache.match(request);

  const networkPromise = fetch(request).then((response) => {
    if (cacheableResponse(response)) {
      return putInCache(cache, request, response).then(() => response);
    }
    return response;
  });

  if (cachedInActive) {
    networkPromise.catch(() => undefined);
    return cachedInActive;
  }

  const retainedCaches = await getRetainedCacheNames(cacheName);
  const fallbackCaches = retainedCaches.filter((name) => name !== cacheName);
  const cachedFallback = await findCachedInNamedCaches(request, fallbackCaches);

  if (cachedFallback) {
    networkPromise.catch(() => undefined);
    return cachedFallback;
  }

  return networkPromise;
};

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  const activeCacheName = buildTileCacheName();
  event.waitUntil(
    debouncedDeleteOutdatedTileCaches(activeCacheName).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (isApiCacheableRequest(event.request)) {
    event.respondWith(staleWhileRevalidateApi(event.request));
    return;
  }

  if (!isTileCacheableRequest(event.request)) {
    return;
  }

  const activeCacheName = buildTileCacheName();
  event.respondWith(getCachedResponseOrFetch(event.request, activeCacheName));
  event.waitUntil(debouncedDeleteOutdatedTileCaches(activeCacheName));
});

self.addEventListener("message", (event) => {
  const messageType = event.data?.type;
  if (messageType === "REQUEST_TILE_CACHE_VERSION") {
    event.source?.postMessage({
      type: "TILE_CACHE_VERSION",
      version: getDailyCacheVersion(),
      cacheName: buildTileCacheName()
    });
    return;
  }

  if (messageType === "REQUEST_TILE_CACHE_HEALTH") {
    event.waitUntil(
      getCacheHealthPayload().then((payload) => {
        event.source?.postMessage(payload);
      })
    );
  }
});
