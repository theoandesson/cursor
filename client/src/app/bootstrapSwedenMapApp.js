import { registerTileCacheServiceWorker } from "../cache/registerTileCacheServiceWorker.js";
import { initSwedenMap } from "../map/bootstrap/initSwedenMap.js";
import { createCacheStatusPresenter } from "../ui/createCacheStatusPresenter.js";
import { createLoadingOverlayPresenter } from "../ui/createLoadingOverlayPresenter.js";
import { createMapStatusPresenter } from "../ui/createMapStatusPresenter.js";
import { fetchCities, fetchCityWeather } from "../weather/smhiWeatherService.js";
import { createAppShell } from "./createAppShell.js";

const MAP_ROOT_ID = "map-root";
const CITY_FLY_ZOOM = 11;

const buildWeatherMap = (cityWeather) => {
  const weatherMap = new Map();
  cityWeather.forEach((entry) => {
    const cityId = entry.city?.id;
    if (cityId && entry.current) {
      weatherMap.set(cityId, entry.current);
    }
  });
  return weatherMap;
};

export const bootstrapSwedenMapApp = ({ maplibregl }) => {
  const mapRootElement = document.getElementById(MAP_ROOT_ID);
  if (!mapRootElement) {
    throw new Error("Kartan kunde inte startas: saknar #map-root.");
  }

  const setStatus = createMapStatusPresenter({ mapRootElement });
  const setCacheStatus = createCacheStatusPresenter();
  const loadingOverlay = createLoadingOverlayPresenter({ mapRootElement });
  const appShell = createAppShell({ mapRootElement });

  setStatus({
    profile: "settled",
    message: "Laddar terräng- och byggnadsdata för Sverige…"
  });
  setCacheStatus("Tilecache initieras…");

  registerTileCacheServiceWorker({
    onStatusChange: setCacheStatus
  });

  const map = initSwedenMap({
    maplibregl,
    container: mapRootElement,
    onStatusChange: setStatus,
    loadingOverlay
  });

  mapRootElement.addEventListener("city:select", (event) => {
    const city = event.detail?.city;
    if (!city || city.lon == null || city.lat == null) {
      return;
    }

    map.flyTo({
      center: [city.lon, city.lat],
      zoom: CITY_FLY_ZOOM,
      pitch: 55,
      duration: 1700,
      essential: true
    });
  });

  Promise.all([fetchCities(), fetchCityWeather()])
    .then(([cities, cityWeather]) => {
      appShell.setCitiesData(cities, buildWeatherMap(cityWeather));
    })
    .catch(() => {
      /* panelen visar tomt tillstånd vid fel */
    });

  return { map, appShell };
};
