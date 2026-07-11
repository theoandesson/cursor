import {
  fetchBootstrap,
  fetchBootstrapWithSwr
} from "../api/bootstrapClient.js";

const API_BASE = "/api";

const fetchJson = async (url, { signal, fetchFn = fetch } = {}) => {
  const response = await fetchFn(url, { signal });
  if (!response.ok) {
    throw new Error(`API ${response.status}: ${response.statusText}`);
  }
  return response.json();
};

export { fetchBootstrap, fetchBootstrapWithSwr };

export const fetchCities = async (options = {}) => {
  const payload = await fetchJson(`${API_BASE}/cities`, options);
  return payload.cities ?? [];
};

export const fetchCityWeather = async (options = {}) => {
  const payload = await fetchJson(`${API_BASE}/weather/cities`, options);
  return payload.cities ?? [];
};

export const fetchWeatherAtPoint = async (lon, lat, options = {}) => {
  const params = new URLSearchParams({
    lon: String(lon),
    lat: String(lat)
  });
  return fetchJson(`${API_BASE}/weather/point?${params.toString()}`, options);
};

const emitTiming = (perfTracker, phase, startedAt, cacheStatus = null) => {
  perfTracker?.onTiming?.({
    phase,
    durationMs: Math.max(0, performance.now() - startedAt),
    cacheStatus
  });
};

export const fetchBootstrapWithPerf = async ({ perfTracker, signal } = {}) => {
  const startedAt = performance.now();
  const data = await fetchBootstrap({ signal, onTiming: perfTracker?.onTiming });
  emitTiming(perfTracker, "bootstrap-complete", startedAt);
  return data;
};
