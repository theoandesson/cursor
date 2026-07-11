import { fetchWithTimeout } from "../lib/fetchWithTimeout.js";

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";
const USER_AGENT = "sweden-3d-map-fidelity/1.0.0 (https://github.com/sverige-3d-karta)";
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES = 256;
const MIN_REQUEST_INTERVAL_MS = 1000;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_SEARCH_QUERY_LENGTH = 200;

export class GeocodeNotFoundError extends Error {
  constructor(message = "Ingen plats hittades för koordinaterna.") {
    super(message);
    this.name = "GeocodeNotFoundError";
  }
}

const SWEDEN_VIEWBOX = {
  minLon: 9.5,
  minLat: 54.8,
  maxLon: 24.8,
  maxLat: 69.7
};

const nominatimViewbox = [
  SWEDEN_VIEWBOX.minLon,
  SWEDEN_VIEWBOX.maxLat,
  SWEDEN_VIEWBOX.maxLon,
  SWEDEN_VIEWBOX.minLat
].join(",");

const cache = new Map();
let lastRequestAt = 0;
let requestQueue = Promise.resolve();

const enqueueNominatimRequest = (task) => {
  const run = requestQueue.then(async () => {
    const now = Date.now();
    const waitMs = Math.max(0, MIN_REQUEST_INTERVAL_MS - (now - lastRequestAt));
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    lastRequestAt = Date.now();
    return task();
  });

  requestQueue = run.catch(() => {});
  return run;
};

const getCached = (key) => {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return entry.data;
};

const setCached = (key, data) => {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey != null) {
      cache.delete(oldestKey);
    }
  }

  cache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS
  });
};

const nominatimFetch = async (path, searchParams) => {
  const url = new URL(path, NOMINATIM_BASE_URL);
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, String(value));
  }

  const response = await fetchWithTimeout(url, {
    timeoutMs: FETCH_TIMEOUT_MS,
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json"
    }
  });

  if (response.status === 429) {
    throw new Error("Nominatim rate limit överskreds. Försök igen om en stund.");
  }

  if (!response.ok) {
    throw new Error(`Nominatim svarade med fel ${response.status}. Försök igen om en stund.`);
  }

  return response.json();
};

const mapSearchResult = (item) => ({
  placeId: item.place_id,
  osmType: item.osm_type ?? null,
  osmId: item.osm_id ?? null,
  name: item.name ?? item.display_name?.split(",")[0] ?? null,
  displayName: item.display_name,
  lon: Number.parseFloat(item.lon),
  lat: Number.parseFloat(item.lat),
  type: item.type ?? null,
  category: item.category ?? item.class ?? null,
  importance: item.importance ?? null
});

const mapReverseResult = (item) => ({
  placeId: item.place_id ?? null,
  osmType: item.osm_type ?? null,
  osmId: item.osm_id ?? null,
  name: item.name ?? item.address?.city ?? item.address?.town ?? item.address?.village ?? null,
  displayName: item.display_name,
  lon: Number.parseFloat(item.lon),
  lat: Number.parseFloat(item.lat),
  type: item.type ?? null,
  category: item.category ?? item.class ?? null,
  address: item.address ?? null
});

export const searchPlaces = async ({ query, limit = 8 }) => {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    throw new Error("Sökfrågan får inte vara tom.");
  }
  if (normalizedQuery.length > MAX_SEARCH_QUERY_LENGTH) {
    throw new Error(`Sökfrågan får vara högst ${MAX_SEARCH_QUERY_LENGTH} tecken.`);
  }

  const cacheKey = `search:${normalizedQuery.toLowerCase()}:${limit}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  const payload = await enqueueNominatimRequest(async () => {
    const recheck = getCached(cacheKey);
    if (recheck) {
      return recheck;
    }

    return nominatimFetch("/search", {
      q: normalizedQuery,
      format: "json",
      addressdetails: 1,
      countrycodes: "se",
      viewbox: nominatimViewbox,
      bounded: 1,
      limit
    });
  });

  const results = {
    query: normalizedQuery,
    limit,
    count: Array.isArray(payload) ? payload.length : 0,
    results: Array.isArray(payload) ? payload.map(mapSearchResult) : []
  };

  setCached(cacheKey, results);
  return results;
};

export const reverseGeocode = async ({ lon, lat }) => {
  const roundedLon = Math.round(lon * 1e6) / 1e6;
  const roundedLat = Math.round(lat * 1e6) / 1e6;
  const cacheKey = `reverse:${roundedLon},${roundedLat}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  const payload = await enqueueNominatimRequest(async () => {
    const recheck = getCached(cacheKey);
    if (recheck) {
      return recheck;
    }

    return nominatimFetch("/reverse", {
      lon: roundedLon,
      lat: roundedLat,
      format: "json",
      addressdetails: 1,
      countrycodes: "se"
    });
  });

  if (!payload || payload.error) {
    throw new GeocodeNotFoundError(payload?.error ?? undefined);
  }

  const result = {
    lon: roundedLon,
    lat: roundedLat,
    place: mapReverseResult(payload)
  };

  setCached(cacheKey, result);
  return result;
};
