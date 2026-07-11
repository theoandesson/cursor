import { waitForTileCacheServiceWorker } from "../cache/registerTileCacheServiceWorker.js";
import { startBootstrapPrefetch } from "../map/loading/createBootstrapPrefetch.js";
import { initSwedenMap } from "../map/bootstrap/initSwedenMap.js";
import { createFetchWithTiming } from "../perf/fetchWithTiming.js";
import { createCacheStatusPresenter } from "../ui/createCacheStatusPresenter.js";
import { createLoadingOverlayPresenter } from "../ui/createLoadingOverlayPresenter.js";
import { createMapStatusPresenter } from "../ui/createMapStatusPresenter.js";
import { createAppShell } from "./createAppShell.js";

const MAP_ROOT_ID = "map-root";
const CITY_FLY_ZOOM = 11;

const createBootstrapOnTiming = (perfTracker) => {
  if (!perfTracker) {
    return undefined;
  }

  return ({ phase, durationMs, cacheStatus }) => {
    perfTracker.recordApiCall({
      url: `/api/bootstrap#${phase}`,
      durationMs,
      status: phase === "network-error" ? 0 : 200,
      cacheStatus: cacheStatus?.toUpperCase?.() ?? "NETWORK"
    });
  };
};

const buildWeatherMap = (weatherEntries) => {
  const weatherMap = new Map();
  weatherEntries.forEach((entry) => {
    const cityId = entry.city?.id;
    if (cityId && entry.current) {
      weatherMap.set(cityId, entry.current);
    }
  });
  return weatherMap;
};

export const bootstrapSwedenMapApp = async ({ maplibregl, perfTracker }) => {
  perfTracker?.recordMilestone("bootstrap-start");

  const mapRootElement = document.getElementById(MAP_ROOT_ID);
  if (!mapRootElement) {
    throw new Error("Kartan kunde inte startas: saknar #map-root.");
  }

  const fetchWithTiming = perfTracker ? createFetchWithTiming(perfTracker) : fetch;
  const endBootstrapApi = perfTracker?.startSpan("api-bootstrap");
  const onTiming = createBootstrapOnTiming(perfTracker);

  const bootstrapPrefetch = startBootstrapPrefetch({
    fetchFn: fetchWithTiming,
    onTiming
  });
  perfTracker?.recordMilestone("bootstrap-prefetch-start");

  const appShell = createAppShell({ mapRootElement, perfTracker, fetchFn: fetchWithTiming });
  perfTracker?.recordMilestone("app-shell-ready");

  const setStatus = createMapStatusPresenter({ mapRootElement });
  const setCacheStatus = createCacheStatusPresenter();
  const loadingOverlay = createLoadingOverlayPresenter({ mapRootElement });

  setStatus({
    profile: "settled",
    message: "Laddar kartdata för Sverige…"
  });
  setCacheStatus("Tilecache initieras…");

  perfTracker?.recordMilestone("sw-register-start");

  const endSwRegister = perfTracker?.startSpan("sw-register");
  await waitForTileCacheServiceWorker({
    onStatusChange: setCacheStatus
  }).finally(() => {
    endSwRegister?.();
    perfTracker?.recordMilestone("sw-register-done");
  });

  perfTracker?.recordMilestone("map-init-start");

  const map = initSwedenMap({
    maplibregl,
    container: mapRootElement,
    onStatusChange: setStatus,
    loadingOverlay,
    perfTracker,
    onTiming,
    fetchFn: fetchWithTiming,
    bootstrapPrefetch,
    onBootstrapComplete: () => endBootstrapApi?.(),
    onCitiesUpdate: ({ cities, weatherEntries }) => {
      appShell.setCitiesData(cities, buildWeatherMap(weatherEntries));
    }
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

  perfTracker?.recordMilestone("shell-ready");

  return { map, appShell };
};
