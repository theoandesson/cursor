import { fetchCities, fetchCityWeather } from "./smhiWeatherService.js";
import { getWeatherSymbol, getWindDirection } from "./weatherSymbols.js";

const SOURCE_ID = "city-weather-source";
const CIRCLE_LAYER_ID = "city-weather-circles";
const GLOW_LAYER_ID = "city-weather-glow";
const LABEL_LAYER_ID = "city-weather-labels";
const REFRESH_INTERVAL_MS = 10 * 60 * 1000;
const CITY_MARKER_MAX_ZOOM = 13.8;

const buildGeoJson = (cities) => ({
  type: "FeatureCollection",
  features: cities.map((c) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [c.lon, c.lat] },
    properties: {
      cityId: c.id,
      name: c.name,
      icon: "",
      temp: "",
      label: "",
      windSpeed: null,
      windDir: null,
      windDirText: "",
      humidity: null,
      pressure: null,
      gust: null,
      symbolLabel: "",
      loaded: false
    }
  }))
});

const buildHoverHtml = (props) => {
  if (!props.loaded) {
    return `<div class="weather-hover"><p class="weather-hover__loading">Laddar väder…</p></div>`;
  }

  const gustStat = props.gust
    ? `<div class="weather-hover__stat">
        <span class="weather-hover__stat-label">Vindbyar</span>
        <span class="weather-hover__stat-value">${props.gust} m/s</span>
      </div>`
    : "";

  return `
    <div class="weather-hover">
      <div class="weather-hover__top">
        <div class="weather-hover__header">
          <span class="weather-hover__icon">${props.icon}</span>
          <div>
            <strong class="weather-hover__city">${props.name}</strong>
            <span class="weather-hover__temp">${props.temp}</span>
          </div>
        </div>
        <p class="weather-hover__condition">${props.symbolLabel}</p>
      </div>
      <div class="weather-hover__stats">
        <div class="weather-hover__stat">
          <span class="weather-hover__stat-label">Vind</span>
          <span class="weather-hover__stat-value">${props.windSpeed ?? "?"} m/s ${props.windDirText}</span>
        </div>
        <div class="weather-hover__stat">
          <span class="weather-hover__stat-label">Fuktighet</span>
          <span class="weather-hover__stat-value">${props.humidity ?? "?"}%</span>
        </div>
        ${gustStat}
        <div class="weather-hover__stat">
          <span class="weather-hover__stat-label">Lufttryck</span>
          <span class="weather-hover__stat-value">${props.pressure ? Math.round(props.pressure) + " hPa" : "?"}</span>
        </div>
      </div>
    </div>`;
};

export const createCityWeatherLayer = ({ map, maplibregl }) => {
  let geojson = buildGeoJson([]);
  let intervalId = null;
  let isDisposed = false;
  let cityIdToFeatureIndex = new Map();

  map.addSource(SOURCE_ID, { type: "geojson", data: geojson });

  map.addLayer({
    id: GLOW_LAYER_ID,
    type: "circle",
    source: SOURCE_ID,
    maxzoom: CITY_MARKER_MAX_ZOOM,
    paint: {
      "circle-radius": 26,
      "circle-color": "#667eea",
      "circle-opacity": 0.15,
      "circle-blur": 0.8
    }
  });

  map.addLayer({
    id: CIRCLE_LAYER_ID,
    type: "circle",
    source: SOURCE_ID,
    maxzoom: CITY_MARKER_MAX_ZOOM,
    paint: {
      "circle-radius": 20,
      "circle-color": "#ffffff",
      "circle-stroke-color": "#667eea",
      "circle-stroke-width": 2.5,
      "circle-blur": 0
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
        ["get", "name"], { "font-scale": 0.68 }
      ],
      "text-font": ["Noto Sans Bold"],
      "text-anchor": "center",
      "text-allow-overlap": true,
      "text-ignore-placement": true,
      "text-size": 13,
      "text-line-height": 1.3
    },
    paint: {
      "text-color": "#4a2d7a",
      "text-halo-color": "#ffffffee",
      "text-halo-width": 1.4
    }
  });

  const hoverPopup = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: false,
    maxWidth: "300px",
    className: "weather-hover-container",
    offset: 24
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

  const updateFeature = (idx, weather) => {
    if (idx == null || !weather) {
      return;
    }

    const sym = getWeatherSymbol(weather.symbol);
    const f = geojson.features[idx];
    if (!f) {
      return;
    }

    f.properties.icon = sym.icon;
    f.properties.temp = weather.temp != null ? `${Number(weather.temp).toFixed(1)}°` : "?";
    f.properties.label = sym.label;
    f.properties.symbolLabel = sym.label;
    f.properties.windSpeed = weather.windSpeed;
    f.properties.windDir = weather.windDir;
    f.properties.windDirText = getWindDirection(weather.windDir);
    f.properties.humidity = weather.humidity;
    f.properties.pressure = weather.pressure;
    f.properties.gust = weather.gust;
    f.properties.loaded = true;
  };

  const applyCities = (cities) => {
    geojson = buildGeoJson(cities);
    cityIdToFeatureIndex = new Map(
      cities.map((city, index) => [city.id, index])
    );
    map.getSource(SOURCE_ID)?.setData(geojson);
  };

  const loadAll = async () => {
    try {
      const cityWeather = await fetchCityWeather();
      cityWeather.forEach((entry) => {
        const cityId = entry.city?.id;
        if (!cityId) {
          return;
        }
        const idx = cityIdToFeatureIndex.get(cityId);
        if (entry.current) {
          updateFeature(idx, entry.current);
        }
      });
      map.getSource(SOURCE_ID)?.setData(geojson);
    } catch {
      /* ignore weather refresh failures */
    }
  };

  const bootstrap = async () => {
    try {
      const cities = await fetchCities();
      if (isDisposed) {
        return;
      }

      applyCities(cities);
      await loadAll();
    } catch {
      /* ignore initial failures */
    }

    if (!isDisposed) {
      intervalId = setInterval(loadAll, REFRESH_INTERVAL_MS);
    }
  };

  bootstrap();

  return () => {
    isDisposed = true;
    if (intervalId) clearInterval(intervalId);
    hoverPopup.remove();
  };
};
