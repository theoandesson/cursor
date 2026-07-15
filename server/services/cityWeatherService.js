import { SWEDISH_CITIES } from "../data/swedishCities.js";
import { fetchWeatherByPoint } from "./smhiWeatherService.js";
import { createFileCache } from "./cache/fileCache.js";
import { cityWeatherCacheKey } from "./cache/cacheKeys.js";

const CITY_WEATHER_CACHE_TTL_MS = 5 * 60 * 1000;
const FILE_CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_PARALLEL_FETCHES = 16;

const cityWeatherCacheByHours = new Map();
const refreshPromisesByKey = new Map();
const staleRefreshCursorByHours = new Map();
const fileCache = createFileCache({ directory: ".cache/city-weather" });
const CITY_INDEX_BY_ID = new Map(SWEDISH_CITIES.map((city, index) => [city.id, index]));

const buildRefreshKey = (forecastHours, { forceRefresh = false, refreshStaleOnly = false } = {}) => {
  if (forceRefresh) {
    return `${forecastHours}:force`;
  }
  if (refreshStaleOnly) {
    return `${forecastHours}:stale`;
  }
  return `${forecastHours}:read`;
};

export const toCityDto = ({ id, name, lon, lat, county }) => ({
  id,
  name,
  lon,
  lat,
  county
});

const runWithConcurrency = async (workers, maxParallel = MAX_PARALLEL_FETCHES) => {
  const results = new Array(workers.length);
  const parallelCount = Math.max(1, Math.min(maxParallel, workers.length));
  let cursor = 0;

  const pool = Array.from({ length: parallelCount }, async () => {
    while (cursor < workers.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await workers[index]();
    }
  });

  await Promise.all(pool);
  return results;
};

const withCityWeather = async (city, { forecastHours }) => {
  try {
    const weather = await fetchWeatherByPoint({
      lon: city.lon,
      lat: city.lat,
      forecastHours
    });

    return {
      city: toCityDto(city),
      approvedTime: weather.approvedTime,
      current: weather.current,
      forecast: weather.forecast,
      error: null
    };
  } catch (error) {
    return {
      city: toCityDto(city),
      approvedTime: null,
      current: null,
      forecast: [],
      error: error instanceof Error ? error.message : "Okänt fel"
    };
  }
};

const getCacheEntry = (forecastHours) => cityWeatherCacheByHours.get(forecastHours) ?? null;

const createEmptyCacheEntry = () => ({
  items: [],
  expiresAt: 0,
  populatedAt: null,
  fetchedAtByCityId: new Map()
});

const normalizeItemsByCityOrder = (items) => {
  const itemByCityId = new Map(
    (items ?? [])
      .filter((item) => item?.city?.id)
      .map((item) => [item.city.id, item])
  );
  return SWEDISH_CITIES.map((city) => itemByCityId.get(city.id)).filter(Boolean);
};

const normalizeFetchedAtByCityId = ({ items, fetchedAtByCityId, fallbackFetchedAt }) => {
  const normalized = new Map();
  if (fetchedAtByCityId && typeof fetchedAtByCityId === "object") {
    for (const [cityId, timestamp] of Object.entries(fetchedAtByCityId)) {
      if (Number.isFinite(timestamp)) {
        normalized.set(cityId, timestamp);
      }
    }
  }

  for (const item of items) {
    const cityId = item.city.id;
    if (!normalized.has(cityId)) {
      normalized.set(cityId, fallbackFetchedAt);
    }
  }

  return normalized;
};

const normalizeFileCacheEntry = (rawValue, now) => {
  if (!rawValue) {
    return null;
  }

  if (Array.isArray(rawValue)) {
    const items = normalizeItemsByCityOrder(rawValue);
    const fetchedAtByCityId = normalizeFetchedAtByCityId({
      items,
      fetchedAtByCityId: null,
      fallbackFetchedAt: now
    });
    return {
      items,
      expiresAt: now + CITY_WEATHER_CACHE_TTL_MS,
      populatedAt: now,
      fetchedAtByCityId
    };
  }

  if (!Array.isArray(rawValue.items)) {
    return null;
  }

  const fallbackFetchedAt = Number.isFinite(rawValue.populatedAt) ? rawValue.populatedAt : now;
  const items = normalizeItemsByCityOrder(rawValue.items);
  const fetchedAtByCityId = normalizeFetchedAtByCityId({
    items,
    fetchedAtByCityId: rawValue.fetchedAtByCityId,
    fallbackFetchedAt
  });

  return {
    items,
    expiresAt: now + CITY_WEATHER_CACHE_TTL_MS,
    populatedAt: fallbackFetchedAt,
    fetchedAtByCityId
  };
};

const serializeCacheEntry = (entry) => ({
  items: entry.items,
  populatedAt: entry.populatedAt,
  fetchedAtByCityId: Object.fromEntries(entry.fetchedAtByCityId)
});

const listStaleCities = (entry, now) => {
  if (!entry || entry.items.length === 0) {
    return [...SWEDISH_CITIES];
  }

  const cachedCityIds = new Set(entry.items.map((item) => item.city.id));
  return SWEDISH_CITIES.filter((city) => {
    if (!cachedCityIds.has(city.id)) {
      return true;
    }

    const fetchedAt = entry.fetchedAtByCityId.get(city.id);
    return !Number.isFinite(fetchedAt) || now - fetchedAt >= CITY_WEATHER_CACHE_TTL_MS;
  });
};

const pickStaleRefreshBatch = ({ forecastHours, staleCities, refreshLimit }) => {
  if (!Number.isFinite(refreshLimit) || refreshLimit <= 0 || refreshLimit >= staleCities.length) {
    return staleCities;
  }

  const cursor = staleRefreshCursorByHours.get(forecastHours) ?? 0;
  const staleAfterCursor = [];
  const staleBeforeCursor = [];

  for (const city of staleCities) {
    const cityIndex = CITY_INDEX_BY_ID.get(city.id) ?? 0;
    if (cityIndex >= cursor) {
      staleAfterCursor.push(city);
    } else {
      staleBeforeCursor.push(city);
    }
  }

  const selectedCities = [...staleAfterCursor, ...staleBeforeCursor].slice(0, refreshLimit);
  if (selectedCities.length > 0) {
    const lastCity = selectedCities[selectedCities.length - 1];
    const nextCursor = ((CITY_INDEX_BY_ID.get(lastCity.id) ?? 0) + 1) % SWEDISH_CITIES.length;
    staleRefreshCursorByHours.set(forecastHours, nextCursor);
  }

  return selectedCities;
};

const refreshCityWeather = async (
  forecastHours,
  { forceRefresh = false, refreshStaleOnly = false, refreshLimit } = {}
) => {
  const now = Date.now();
  const fileCacheKey = cityWeatherCacheKey(forecastHours);
  let entry = getCacheEntry(forecastHours);
  let cacheSource = entry ? "memory" : null;

  if (!entry && !forceRefresh) {
    const fileCachedPayload = await fileCache.get(fileCacheKey);
    const normalizedEntry = normalizeFileCacheEntry(fileCachedPayload, now);
    if (normalizedEntry) {
      entry = normalizedEntry;
      cacheSource = "file";
      cityWeatherCacheByHours.set(forecastHours, normalizedEntry);
    }
  }

  entry ??= createEmptyCacheEntry();

  const staleCities = forceRefresh ? [...SWEDISH_CITIES] : listStaleCities(entry, now);
  const citiesToRefresh = forceRefresh
    ? staleCities
    : refreshStaleOnly
      ? pickStaleRefreshBatch({ forecastHours, staleCities, refreshLimit })
      : staleCities;

  if (citiesToRefresh.length === 0) {
    return { cacheHit: true, source: cacheSource ?? "memory" };
  }

  const workers = citiesToRefresh.map((city) => () => withCityWeather(city, { forecastHours }));
  const refreshedItems = await runWithConcurrency(workers);
  const refreshedAt = Date.now();

  const mergedItemsByCityId = new Map(entry.items.map((item) => [item.city.id, item]));
  for (const refreshedItem of refreshedItems) {
    const cityId = refreshedItem.city.id;
    mergedItemsByCityId.set(cityId, refreshedItem);
    entry.fetchedAtByCityId.set(cityId, refreshedAt);
  }

  entry.items = SWEDISH_CITIES.map((city) => mergedItemsByCityId.get(city.id)).filter(Boolean);
  entry.expiresAt = refreshedAt + CITY_WEATHER_CACHE_TTL_MS;
  entry.populatedAt = refreshedAt;

  await fileCache.set(fileCacheKey, serializeCacheEntry(entry), FILE_CACHE_TTL_MS);

  cityWeatherCacheByHours.set(forecastHours, entry);

  return { cacheHit: false, source: "network" };
};

const ensureCityWeather = async (
  forecastHours,
  { forceRefresh = false, refreshStaleOnly = false, refreshLimit } = {}
) => {
  const now = Date.now();
  const cached = getCacheEntry(forecastHours);
  const staleCities = listStaleCities(cached, now);
  const canUseMemoryCache =
    !forceRefresh &&
    cached &&
    cached.items.length > 0 &&
    staleCities.length === 0;

  if (canUseMemoryCache) {
    return { cacheHit: true, source: "memory" };
  }

  const refreshKey = buildRefreshKey(forecastHours, { forceRefresh, refreshStaleOnly });
  const existingRefresh = refreshPromisesByKey.get(refreshKey);
  if (existingRefresh) {
    const result = await existingRefresh;
    return { cacheHit: result.cacheHit, source: result.source };
  }

  // Never attach a force/full refresh to an in-flight stale-only warmer batch.
  if (forceRefresh) {
    const staleOnlyKey = buildRefreshKey(forecastHours, { refreshStaleOnly: true });
    const staleOnlyInFlight = refreshPromisesByKey.get(staleOnlyKey);
    if (staleOnlyInFlight) {
      await staleOnlyInFlight.catch(() => undefined);
    }
  }

  const refreshPromise = refreshCityWeather(forecastHours, {
    forceRefresh,
    refreshStaleOnly,
    refreshLimit
  }).finally(() => {
    refreshPromisesByKey.delete(refreshKey);
  });

  refreshPromisesByKey.set(refreshKey, refreshPromise);
  return refreshPromise;
};

export const listCities = ({ search, limit, offset } = {}) => {
  const normalizedSearch = (search ?? "").trim().toLowerCase();

  const filtered = SWEDISH_CITIES.filter((city) => {
    if (!normalizedSearch) {
      return true;
    }

    return (
      city.name.toLowerCase().includes(normalizedSearch) ||
      city.id.includes(normalizedSearch) ||
      city.county.toLowerCase().includes(normalizedSearch)
    );
  });

  const safeOffset = Math.max(0, offset ?? 0);
  const safeLimit = Math.max(1, limit ?? filtered.length);
  const page = filtered.slice(safeOffset, safeOffset + safeLimit).map(toCityDto);

  return {
    total: filtered.length,
    limit: safeLimit,
    offset: safeOffset,
    cities: page
  };
};

export const getCityById = (cityId) => SWEDISH_CITIES.find((city) => city.id === cityId) ?? null;

export const isCacheWarm = (forecastHours = 24) => {
  const entry = getCacheEntry(forecastHours);
  return Boolean(entry && entry.expiresAt > Date.now() && entry.items.length > 0);
};

export const getCityWeatherCacheAge = (forecastHours = 24) => {
  const entry = getCacheEntry(forecastHours);
  if (!entry?.populatedAt) {
    return null;
  }

  return Date.now() - entry.populatedAt;
};

export const getCityWeatherCacheStats = () => {
  const now = Date.now();
  const entries = [];

  for (const [forecastHours, entry] of cityWeatherCacheByHours) {
    entries.push({
      forecastHours,
      size: entry.items.length,
      isWarm: entry.expiresAt > now && entry.items.length > 0,
      staleCities: listStaleCities(entry, now).length,
      cacheAge: entry.populatedAt ? now - entry.populatedAt : null,
      expiresAt: new Date(entry.expiresAt).toISOString()
    });
  }

  return {
    entryCount: entries.length,
    entries
  };
};

export const getCityWeather = async ({
  forecastHours = 24,
  forceRefresh = false,
  refreshStaleOnly = false,
  refreshLimit,
  limit,
  offset
} = {}) => {
  // Strategy:
  // - Normal reads refresh only stale city entries (incremental refresh).
  // - `forceRefresh` keeps explicit full-refresh semantics.
  // - `refreshStaleOnly` lets background warmer update stale cities in smaller batches.
  const { cacheHit } = await ensureCityWeather(forecastHours, {
    forceRefresh,
    refreshStaleOnly,
    refreshLimit
  });

  const cacheEntry = getCacheEntry(forecastHours);
  const safeOffset = Math.max(0, offset ?? 0);
  const safeLimit = Math.max(1, limit ?? cacheEntry.items.length);

  return {
    total: cacheEntry.items.length,
    limit: safeLimit,
    offset: safeOffset,
    cachedUntil: new Date(cacheEntry.expiresAt).toISOString(),
    cacheHit,
    cities: cacheEntry.items.slice(safeOffset, safeOffset + safeLimit)
  };
};
