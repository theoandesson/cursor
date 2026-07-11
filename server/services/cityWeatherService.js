import { SWEDISH_CITIES } from "../data/swedishCities.js";
import { fetchWeatherByPoint } from "./smhiWeatherService.js";
import { createFileCache } from "./cache/fileCache.js";
import { cityWeatherCacheKey } from "./cache/cacheKeys.js";

const CITY_WEATHER_CACHE_TTL_MS = 5 * 60 * 1000;
const FILE_CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_PARALLEL_FETCHES = 16;

const cityWeatherCacheByHours = new Map();
const refreshPromisesByHours = new Map();
const fileCache = createFileCache({ directory: ".cache/city-weather" });

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

const refreshCityWeather = async (forecastHours, forceRefresh = false) => {
  const now = Date.now();
  const fileCacheKey = cityWeatherCacheKey(forecastHours);

  if (!forceRefresh) {
    const fileCachedItems = await fileCache.get(fileCacheKey);
    if (fileCachedItems) {
      cityWeatherCacheByHours.set(forecastHours, {
        items: fileCachedItems,
        expiresAt: now + CITY_WEATHER_CACHE_TTL_MS,
        populatedAt: now
      });
      return { cacheHit: true, source: "file" };
    }
  }

  const workers = SWEDISH_CITIES.map((city) => () => withCityWeather(city, { forecastHours }));
  const items = await runWithConcurrency(workers);

  await fileCache.set(fileCacheKey, items, FILE_CACHE_TTL_MS);

  cityWeatherCacheByHours.set(forecastHours, {
    items,
    expiresAt: now + CITY_WEATHER_CACHE_TTL_MS,
    populatedAt: now
  });

  return { cacheHit: false, source: "network" };
};

const ensureCityWeather = async (forecastHours, forceRefresh) => {
  const now = Date.now();
  const cached = getCacheEntry(forecastHours);
  const canUseMemoryCache =
    !forceRefresh &&
    cached &&
    cached.items.length > 0 &&
    cached.expiresAt > now;

  if (canUseMemoryCache) {
    return { cacheHit: true, source: "memory" };
  }

  const existingRefresh = refreshPromisesByHours.get(forecastHours);
  if (existingRefresh) {
    const result = await existingRefresh;
    return { cacheHit: result.cacheHit, source: result.source };
  }

  const refreshPromise = refreshCityWeather(forecastHours, forceRefresh).finally(() => {
    refreshPromisesByHours.delete(forecastHours);
  });

  refreshPromisesByHours.set(forecastHours, refreshPromise);
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
  limit,
  offset
} = {}) => {
  const { cacheHit } = await ensureCityWeather(forecastHours, forceRefresh);

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
