import { fetchCities, fetchCityWeather } from "./smhiWeatherService.js";
import { getWeatherSymbol, getWindDirection } from "./weatherSymbols.js";

const SOURCE_ID = "city-weather-source";
const CIRCLE_LAYER_ID = "city-weather-circles";
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

export const createCityWeatherLayer = ({ map, maplibregl }) => {
  let geojson = buildGeoJson([]);
  let intervalId = null;
  let isDisposed = false;
  let cityIdToFeatureIndex = new Map();

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
    f.properties.temp = weather.temp != null ? `${Number(weather.temp).toFixed(1)}°C` : "?";
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
