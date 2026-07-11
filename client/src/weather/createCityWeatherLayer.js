import { fetchBootstrap, fetchBootstrapWithSwr } from "../api/bootstrapClient.js";
import { saveBootstrapSnapshot } from "../store/weatherStore.js";
import { getWeatherSymbol, getWindDirection } from "./weatherSymbols.js";
import {
  applyWeatherToGeoJson,
  buildGeoJsonFromCities,
  createFeatureUpdater,
  extractBootstrapParts,
  haveSameCityIds
} from "./applyCityWeather.js";

const SOURCE_ID = "city-weather-source";
const CIRCLE_LAYER_ID = "city-weather-circles";
const LABEL_LAYER_ID = "city-weather-labels";
const REFRESH_INTERVAL_MS = 10 * 60 * 1000;
const CITY_MARKER_MAX_ZOOM = 13.8;
const SMOOTH_UPDATE_BATCH_SIZE = 8;
const SMOOTH_UPDATE_DELAY_MS = 40;

const buildHoverHtml = (props) => {
  if (!props.loaded) {
    return `<div class="weather-hover"><p class="weather-hover__loading">Laddar väder…</p></div>`;
  }

  const gustRow = props.gust ? `<tr><td>Vindbyar</td><td>${props.gust} m/s</td></tr>` : "";

  return `
    <div class="weather-hover">
      <div class="weather-hover__header">
        <span class="weather-hover__icon">${props.icon}</span>
        <div>
          <strong class="weather-hover__city">${props.name}</strong>
          <span class="weather-hover__temp">${props.temp}</span>
        </div>
      </div>
      <p class="weather-hover__condition">${props.symbolLabel}</p>
      <table class="weather-hover__table">
        <tr><td>Temperatur</td><td>${props.temp}</td></tr>
        <tr><td>Vind</td><td>${props.windSpeed ?? "?"} m/s ${props.windDirText}</td></tr>
        ${gustRow}
        <tr><td>Luftfuktighet</td><td>${props.humidity ?? "?"}%</td></tr>
        <tr><td>Lufttryck</td><td>${props.pressure ? Math.round(props.pressure) + " hPa" : "?"}</td></tr>
      </table>
    </div>`;
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const createCityWeatherLayer = ({
  map,
  maplibregl,
  perfTracker,
  onTiming,
  fetchFn,
  onBootstrapComplete,
  onCitiesUpdate
}) => {
  let geojson = buildGeoJsonFromCities([]);
  let intervalId = null;
  let isDisposed = false;
  let cityIdToFeatureIndex = new Map();
  let currentCities = [];
  let smoothUpdateToken = 0;
  let weatherVisibleRecorded = false;

  const recordWeatherVisible = (cached) => {
    if (weatherVisibleRecorded) {
      return;
    }
    weatherVisibleRecorded = true;
    perfTracker?.recordMilestone("weather-visible", { cached: Boolean(cached) });
  };

  const updateFeature = createFeatureUpdater(getWeatherSymbol, getWindDirection);

  map.addSource(SOURCE_ID, { type: "geojson", data: geojson });

  map.addLayer({
    id: CIRCLE_LAYER_ID,
    type: "circle",
    source: SOURCE_ID,
    maxzoom: CITY_MARKER_MAX_ZOOM,
    paint: {
      "circle-radius": 18,
      "circle-color": "#ffffffcc",
      "circle-stroke-color": "#5a9fd4",
      "circle-stroke-width": 1.5,
      "circle-blur": 0.15
    }
  });

  map.addLayer({
    id: LABEL_LAYER_ID,
    type: "symbol",
    source: SOURCE_ID,
    maxzoom: CITY_MARKER_MAX_ZOOM,
    layout: {
      "text-field": [
        "format",
        ["get", "temp"], { "font-scale": 0.95 },
        "\n", {},
        ["get", "name"], { "font-scale": 0.7 }
      ],
      "text-font": ["Noto Sans Regular"],
      "text-anchor": "center",
      "text-allow-overlap": true,
      "text-ignore-placement": true,
      "text-size": 13,
      "text-line-height": 1.3
    },
    paint: {
      "text-color": "#1a3a52",
      "text-halo-color": "#ffffffdd",
      "text-halo-width": 1.2
    }
  });

  const hoverPopup = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: false,
    maxWidth: "280px",
    className: "weather-hover-container",
    offset: 20
  });

  map.on("mouseenter", LABEL_LAYER_ID, (e) => {
    map.getCanvas().style.cursor = "pointer";
    const f = e.features?.[0];
    if (!f) return;
    hoverPopup
      .setLngLat(f.geometry.coordinates)
      .setHTML(buildHoverHtml(f.properties))
      .addTo(map);
  });

  map.on("mouseleave", LABEL_LAYER_ID, () => {
    map.getCanvas().style.cursor = "";
    hoverPopup.remove();
  });

  const syncSource = () => {
    map.getSource(SOURCE_ID)?.setData(geojson);
  };

  const applyCities = (cities) => {
    geojson = buildGeoJsonFromCities(cities);
    currentCities = cities;
    cityIdToFeatureIndex = new Map(cities.map((city, index) => [city.id, index]));
    syncSource();
  };

  const applyWeather = (weatherEntries, { smooth = false } = {}) => {
    if (!weatherEntries?.length) {
      return;
    }

    if (!smooth) {
      applyWeatherToGeoJson(geojson, cityIdToFeatureIndex, weatherEntries, updateFeature);
      syncSource();
      return;
    }

    const token = ++smoothUpdateToken;
    const batches = [];
    for (let i = 0; i < weatherEntries.length; i += SMOOTH_UPDATE_BATCH_SIZE) {
      batches.push(weatherEntries.slice(i, i + SMOOTH_UPDATE_BATCH_SIZE));
    }

    const runBatches = async () => {
      for (const batch of batches) {
        if (isDisposed || token !== smoothUpdateToken) {
          return;
        }

        applyWeatherToGeoJson(geojson, cityIdToFeatureIndex, batch, updateFeature);
        syncSource();

        if (batches.length > 1) {
          await wait(SMOOTH_UPDATE_DELAY_MS);
        }
      }
    };

    runBatches().catch(() => undefined);
  };

  const notifyCitiesUpdate = (bootstrapData) => {
    const { cities, weatherEntries } = extractBootstrapParts(bootstrapData);
    if (!cities.length) {
      return;
    }
    onCitiesUpdate?.({ cities, weatherEntries });
  };

  const applyBootstrapPayload = (bootstrapData, { smooth = false, cached = false } = {}) => {
    const { cities, weatherEntries } = extractBootstrapParts(bootstrapData);
    if (!cities.length) {
      return;
    }

    notifyCitiesUpdate(bootstrapData);

    if (!currentCities.length || !haveSameCityIds(currentCities, cities)) {
      applyCities(cities);
      applyWeather(weatherEntries, { smooth: false });
      recordWeatherVisible(cached);
      return;
    }

    applyWeather(weatherEntries, { smooth });
    recordWeatherVisible(cached);
  };

  const refreshWeather = async () => {
    try {
      const freshData = await fetchBootstrap({ onTiming, fetchFn });
      if (!isDisposed) {
        applyBootstrapPayload(freshData, { smooth: true, cached: false });
        await saveBootstrapSnapshot(freshData);
      }
    } catch {
      /* ignore weather refresh failures */
    }
  };

  const bootstrap = async () => {
    try {
      await fetchBootstrapWithSwr({
        fetchFn,
        onTiming,
        onCached: (cachedData) => {
          if (!isDisposed) {
            applyBootstrapPayload(cachedData, { smooth: false, cached: true });
          }
        },
        onFresh: (freshData) => {
          if (!isDisposed) {
            applyBootstrapPayload(freshData, { smooth: true, cached: false });
          }
        }
      });
      onBootstrapComplete?.();
    } catch {
      onBootstrapComplete?.();
      /* ignore initial failures */
    }

    if (!isDisposed) {
      intervalId = setInterval(refreshWeather, REFRESH_INTERVAL_MS);
    }
  };

  bootstrap();

  return () => {
    isDisposed = true;
    if (intervalId) clearInterval(intervalId);
    hoverPopup.remove();
  };
};
