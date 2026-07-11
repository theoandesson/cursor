import { URL } from "node:url";

const DEFAULT_CACHE_MAX_ENTRIES = 512;
const DEFAULT_CACHE_TTL_MS = 15 * 60 * 1000;

const ALLOWED_HOSTS = new Set([
  "tiles.openfreemap.org",
  "s3.amazonaws.com",
  "server.arcgisonline.com",
  "download.lantmateriet.se",
  "dl1.lantmateriet.se",
  "api.lantmateriet.se"
]);

const ALLOWED_PATH_PREFIXES = [
  "/planet/",
  "/fonts/",
  "/elevation-tiles-prod/terrarium/",
  "/ArcGIS/rest/services/World_Imagery/MapServer/tile/",
  "/hojdmodell/",
  "/hojd/",
  "/bild/"
];

const CONTENT_TYPE_BY_EXTENSION = {
  ".pbf": "application/x-protobuf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

const inferContentType = (targetUrl, upstreamType) => {
  if (upstreamType && upstreamType !== "application/octet-stream") {
    return upstreamType;
  }

  const extension = targetUrl.pathname
    .slice(targetUrl.pathname.lastIndexOf("."))
    .toLowerCase();
  return CONTENT_TYPE_BY_EXTENSION[extension] ?? "application/octet-stream";
};

const createCacheEntry = (buffer, contentType, status) => ({
  buffer,
  contentType,
  status,
  expiresAt: Date.now() + DEFAULT_CACHE_TTL_MS
});

export const createTileProxyService = ({
  cacheMaxEntries = DEFAULT_CACHE_MAX_ENTRIES,
  cacheTtlMs = DEFAULT_CACHE_TTL_MS,
  fetchImpl = fetch
} = {}) => {
  const cache = new Map();

  const pruneExpired = () => {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (entry.expiresAt <= now) {
        cache.delete(key);
      }
    }
  };

  const touchCacheEntry = (key, entry) => {
    cache.delete(key);
    cache.set(key, entry);
  };

  const setCacheEntry = (key, entry) => {
    pruneExpired();
    cache.set(key, entry);

    while (cache.size > cacheMaxEntries) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey == null) {
        break;
      }
      cache.delete(oldestKey);
    }
  };

  const isAllowedTarget = (targetUrl) => {
    if (!ALLOWED_HOSTS.has(targetUrl.hostname)) {
      return false;
    }

    if (targetUrl.protocol !== "https:") {
      return false;
    }

    return ALLOWED_PATH_PREFIXES.some((prefix) => targetUrl.pathname.startsWith(prefix));
  };

  const proxyTile = async (rawUrl) => {
    if (!rawUrl) {
      return { ok: false, status: 400, body: { error: "Saknar query-parameter url." } };
    }

    let targetUrl;
    try {
      targetUrl = new URL(rawUrl);
    } catch {
      return { ok: false, status: 400, body: { error: "Ogiltig url-parameter." } };
    }

    if (!isAllowedTarget(targetUrl)) {
      return {
        ok: false,
        status: 403,
        body: { error: "Tile-host eller sökväg är inte tillåten för proxy." }
      };
    }

    const cacheKey = targetUrl.toString();
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      touchCacheEntry(cacheKey, cached);
      return {
        ok: true,
        status: cached.status,
        contentType: cached.contentType,
        buffer: cached.buffer,
        cache: "HIT"
      };
    }

    try {
      const upstream = await fetchImpl(targetUrl, {
        headers: {
          Accept: "*/*",
          "User-Agent": "sweden-3d-map-fidelity/1.0 tile-proxy"
        }
      });

      if (!upstream.ok) {
        return {
          ok: false,
          status: upstream.status,
          body: { error: `Upstream svarade ${upstream.status}.` }
        };
      }

      const buffer = Buffer.from(await upstream.arrayBuffer());
      const contentType = inferContentType(
        targetUrl,
        upstream.headers.get("content-type")
      );
      const entry = createCacheEntry(buffer, contentType, upstream.status);
      entry.expiresAt = Date.now() + cacheTtlMs;
      setCacheEntry(cacheKey, entry);

      return {
        ok: true,
        status: upstream.status,
        contentType,
        buffer,
        cache: "MISS"
      };
    } catch (error) {
      return {
        ok: false,
        status: 502,
        body: {
          error: error instanceof Error ? error.message : "Kunde inte hämta tile."
        }
      };
    }
  };

  return {
    proxyTile,
    getCacheStats: () => {
      pruneExpired();
      return {
        entries: cache.size,
        maxEntries: cacheMaxEntries,
        ttlMs: cacheTtlMs
      };
    },
    clearCache: () => {
      cache.clear();
    }
  };
};
