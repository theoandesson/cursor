import { createSingleFlight } from "../lib/singleFlight.js";
import { pointWeatherCacheKey } from "./cache/cacheKeys.js";
import { createMemoryCache } from "./cache/memoryCache.js";
import { fetchWeatherByPoint } from "./smhiWeatherService.js";

const POINT_WEATHER_CACHE_MAX_ENTRIES = 500;
const POINT_WEATHER_CACHE_TTL_MS = 10 * 60 * 1000;

const pointWeatherCache = createMemoryCache({
  maxEntries: POINT_WEATHER_CACHE_MAX_ENTRIES,
  defaultTtlMs: POINT_WEATHER_CACHE_TTL_MS
});
const pointWeatherFlight = createSingleFlight();

export const getPointWeather = async ({ lon, lat, forecastHours }) => {
  const cacheKey = pointWeatherCacheKey(lon, lat, forecastHours);
  const cached = pointWeatherCache.get(cacheKey);

  if (cached) {
    return { weather: cached, cacheHit: true };
  }

  return pointWeatherFlight.doOnce(cacheKey, async () => {
    const cachedAfterWait = pointWeatherCache.get(cacheKey);
    if (cachedAfterWait) {
      return { weather: cachedAfterWait, cacheHit: true };
    }

    const weather = await fetchWeatherByPoint({ lon, lat, forecastHours });
    pointWeatherCache.set(cacheKey, weather);

    return { weather, cacheHit: false };
  });
};

export const getPointWeatherCacheStats = () => pointWeatherCache.stats();
