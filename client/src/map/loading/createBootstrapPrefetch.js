import { fetchBootstrapWithSwr } from "../../api/bootstrapClient.js";

/**
 * Extracts { cities, weatherEntries } from a raw bootstrap API response.
 * Mirrors the logic in applyCityWeather.js without importing from the weather module.
 */
const extractBootstrapParts = (data) => {
  const weatherEntries =
    data?.weather?.cities ??
    data?.cityWeather?.cities ??
    [];

  const rawCities = data?.cities;
  const cities = Array.isArray(rawCities)
    ? rawCities
    : Array.isArray(rawCities?.cities)
      ? rawCities.cities
      : weatherEntries.map((entry) => entry.city).filter(Boolean);

  return { cities, weatherEntries };
};

/**
 * Fires fetchBootstrapWithSwr immediately at app start and stores the result in a
 * shared promise. Call this as early as possible so the network round-trip is
 * already in-flight (or finished) by the time the weather layer needs the data.
 *
 * @param {object} options
 * @param {Function} [options.fetchFn] - Fetch implementation (defaults to window.fetch).
 * @param {Function} [options.onTiming] - Timing callback forwarded to fetchBootstrapWithSwr.
 * @returns {object} Opaque handle to pass to consumeBootstrapPrefetch.
 */
export const startBootstrapPrefetch = ({ fetchFn, onTiming } = {}) => {
  const fetchPromise = fetchBootstrapWithSwr({ fetchFn, onTiming })
    .then((result) => result?.data ?? null)
    .catch(() => null);

  return { fetchPromise };
};

/**
 * Awaits the result of a previously started bootstrap prefetch.
 *
 * @param {object|null} handle - Value returned by startBootstrapPrefetch.
 * @returns {Promise<{cities: Array, weatherEntries: Array}|null>}
 */
export const consumeBootstrapPrefetch = (handle) => {
  if (!handle?.fetchPromise) {
    return Promise.resolve(null);
  }

  return handle.fetchPromise.then((data) => {
    if (!data) {
      return null;
    }
    return extractBootstrapParts(data);
  });
};
