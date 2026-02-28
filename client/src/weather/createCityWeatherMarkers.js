import { SWEDEN_CITIES } from "../data/swedenCities.js";
import { fetchWeatherAtPoint } from "./smhiWeatherService.js";
import { getWeatherSymbol } from "./weatherSymbols.js";

const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

const createMarkerElement = (city) => {
  const el = document.createElement("div");
  el.className = "weather-marker";
  el.dataset.city = city.name;
  el.innerHTML = `
    <span class="weather-marker__icon">…</span>
    <span class="weather-marker__temp"></span>
    <span class="weather-marker__name">${city.name}</span>`;
  return el;
};

const updateMarkerElement = (el, weather) => {
  const sym = getWeatherSymbol(weather.symbol);
  el.querySelector(".weather-marker__icon").textContent = sym.icon;
  el.querySelector(".weather-marker__temp").textContent =
    weather.temp != null ? `${weather.temp.toFixed(0)}°` : "";
  el.title = `${sym.label}, ${weather.temp?.toFixed(1) ?? "?"}°C`;
};

const fetchAndUpdate = async (city, el) => {
  try {
    const data = await fetchWeatherAtPoint(city.lon, city.lat);
    if (data.current) updateMarkerElement(el, data.current);
  } catch {
    el.querySelector(".weather-marker__icon").textContent = "–";
  }
};

export const createCityWeatherMarkers = ({ map, maplibregl }) => {
  const markers = [];
  let intervalId = null;

  const loadAll = () => {
    for (const { city, el } of markers) {
      fetchAndUpdate(city, el);
    }
  };

  for (const city of SWEDEN_CITIES) {
    const el = createMarkerElement(city);
    const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
      .setLngLat([city.lon, city.lat])
      .addTo(map);
    markers.push({ city, el, marker });
  }

  loadAll();
  intervalId = setInterval(loadAll, REFRESH_INTERVAL_MS);

  return () => {
    if (intervalId) clearInterval(intervalId);
    markers.forEach(({ marker }) => marker.remove());
  };
};
