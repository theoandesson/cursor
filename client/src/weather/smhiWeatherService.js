const API_BASE = "/api";

const fetchJson = async (url, { signal } = {}) => {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`API ${response.status}: ${response.statusText}`);
  }
  return response.json();
};

export const fetchCities = async () => {
  const payload = await fetchJson(`${API_BASE}/cities`);
  return payload.cities ?? [];
};

export const fetchCityWeather = async () => {
  const payload = await fetchJson(`${API_BASE}/weather/cities`);
  return payload.cities ?? [];
};

export const fetchWeatherAtPoint = async (lon, lat, { signal } = {}) => {
  const params = new URLSearchParams({
    lon: String(lon),
    lat: String(lat)
  });
  return fetchJson(`${API_BASE}/weather/point?${params.toString()}`, { signal });
};
