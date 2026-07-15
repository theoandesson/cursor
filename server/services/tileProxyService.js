import { URL } from "node:url";

const DEFAULT_CACHE_MAX_ENTRIES = 256;
const DEFAULT_CACHE_MAX_BYTES = 64 * 1024 * 1024;
const DEFAULT_CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_TILE_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 12_000;

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

const SAFE_CONTENT_TYPES = new Set([
  "application/x-protobuf",
  "application/octet-stream",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif"
]);

const CONTENT_TYPE_BY_EXTENSION = {
  ".pbf": "application/x-protobuf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

const normalizeContentType = (value) => {
  if (!value) {
    return null;
  }
  return String(value).split(";")[0].trim().toLowerCase();
};

const inferContentType = (targetUrl, upstreamType) => {
  const normalizedUpstream = normalizeContentType(upstreamType);
  if (normalizedUpstream && SAFE_CONTENT_TYPES.has(normalizedUpstream)) {
    return normalizedUpstream;
  }

  const pathname = targetUrl.pathname;
  const lastDot = pathname.lastIndexOf(".");
  const lastSlash = pathname.lastIndexOf("/");
  if (lastDot <= lastSlash) {
    return "application/octet-stream";
  }

  const extension = pathname.slice(lastDot).toLowerCase();
  return CONTENT_TYPE_BY_EXTENSION[extension] ?? "application/octet-stream";
};

const createCacheEntry = (buffer, contentType, status, ttlMs) => ({
  buffer,
  contentType,
  status,
  byteLength: buffer.byteLength,
  expiresAt: Date.now() + ttlMs
});

const readBodyWithLimit = async (response, maxBytes) => {
  if (!response.body || typeof response.body.getReader !== "function") {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > maxBytes) {
      const error = new Error("Tile-svaret är för stort.");
      error.statusCode = 413;
      throw error;
    }
    return buffer;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (!value) {
      continue;
    }

    total += value.byteLength;
    if (total > maxBytes) {
      try {
        await reader.cancel();
      } catch {
        // Ignore cancel errors; size limit already enforced.
      }
      const error = new Error("Tile-svaret är för stort.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(Buffer.from(value));
  }

  return chunks.length === 1 ? chunks[0] : Buffer.concat(chunks, total);
};

export const createTileProxyService = ({
  cacheMaxEntries = DEFAULT_CACHE_MAX_ENTRIES,
  cacheMaxBytes = DEFAULT_CACHE_MAX_BYTES,
  cacheTtlMs = DEFAULT_CACHE_TTL_MS,
  maxTileBytes = MAX_TILE_BYTES,
  fetchImpl = fetch
} = {}) => {
  const cache = new Map();
  let cacheBytes = 0;

  const pruneExpired = () => {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (entry.expiresAt <= now) {
        cacheBytes -= entry.byteLength ?? entry.buffer.byteLength;
        cache.delete(key);
      }
    }
    if (cacheBytes < 0) {
      cacheBytes = 0;
    }
  };

  const touchCacheEntry = (key, entry) => {
    cache.delete(key);
    cache.set(key, entry);
  };

  const deleteCacheEntry = (key) => {
    const existing = cache.get(key);
    if (!existing) {
      return;
    }
    cacheBytes -= existing.byteLength ?? existing.buffer.byteLength;
    cache.delete(key);
    if (cacheBytes < 0) {
      cacheBytes = 0;
    }
  };

  const setCacheEntry = (key, entry) => {
    pruneExpired();
    deleteCacheEntry(key);
    cache.set(key, entry);
    cacheBytes += entry.byteLength ?? entry.buffer.byteLength;

    while (cache.size > cacheMaxEntries || cacheBytes > cacheMaxBytes) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey == null) {
        break;
      }
      deleteCacheEntry(oldestKey);
    }
  };

  const fetchWithTimeout = async (url, options = {}) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      return await fetchImpl(url, { ...options, signal: controller.signal });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Tidsgräns överskreds vid hämtning av tile.");
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  };

  const isAllowedTarget = (targetUrl) => {
    if (targetUrl.username || targetUrl.password) {
      return false;
    }

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

    if (targetUrl.username || targetUrl.password) {
      return {
        ok: false,
        status: 400,
        body: { error: "URL får inte innehålla inloggningsuppgifter." }
      };
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

    if (cached) {
      deleteCacheEntry(cacheKey);
    }

    try {
      const upstream = await fetchWithTimeout(targetUrl, {
        redirect: "manual",
        headers: {
          Accept: "image/*,application/x-protobuf,application/octet-stream",
          "User-Agent": "sweden-3d-map-fidelity/1.0 tile-proxy"
        }
      });

      if (upstream.status >= 300 && upstream.status < 400) {
        return {
          ok: false,
          status: 502,
          body: { error: "Upstream-omdirigering blockerades av säkerhetsskäl." }
        };
      }

      if (!upstream.ok) {
        return {
          ok: false,
          status: upstream.status,
          body: { error: `Upstream svarade ${upstream.status}.` }
        };
      }

      const contentLength = Number(upstream.headers.get("content-length"));
      if (Number.isFinite(contentLength) && contentLength > maxTileBytes) {
        return {
          ok: false,
          status: 413,
          body: { error: "Tile-svaret är för stort." }
        };
      }

      let buffer;
      try {
        buffer = await readBodyWithLimit(upstream, maxTileBytes);
      } catch (error) {
        if (error?.statusCode === 413) {
          return {
            ok: false,
            status: 413,
            body: { error: "Tile-svaret är för stort." }
          };
        }
        throw error;
      }

      const contentType = inferContentType(
        targetUrl,
        upstream.headers.get("content-type")
      );

      if (!SAFE_CONTENT_TYPES.has(contentType)) {
        return {
          ok: false,
          status: 502,
          body: { error: "Upstream returnerade otillåten content-type." }
        };
      }

      const entry = createCacheEntry(buffer, contentType, upstream.status, cacheTtlMs);
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
        bytes: cacheBytes,
        maxBytes: cacheMaxBytes,
        ttlMs: cacheTtlMs
      };
    },
    clearCache: () => {
      cache.clear();
      cacheBytes = 0;
    }
  };
};
