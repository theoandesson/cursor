import { WEATHER_LAYER_IDS } from "./createCityWeatherLayer.js";
import { fetchWeatherAtPoint } from "./smhiWeatherService.js";
import { getWeatherSymbol, getWindDirection } from "./weatherSymbols.js";

const formatTime = (isoString) => {
  if (isoString == null) {
    return "";
  }

  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) {
    return "";
  }

  return d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
};

const buildCurrentHtml = (w) => {
  const sym = getWeatherSymbol(w.symbol);
  const windDir = getWindDirection(w.windDir);

  return `
    <div class="weather-popup__current">
      <span class="weather-popup__icon">${sym.icon}</span>
      <span class="weather-popup__temp">${w.temp != null ? w.temp.toFixed(1) : "?"}°C</span>
    </div>
    <p class="weather-popup__label">${sym.label}</p>
    <div class="weather-popup__details">
      <span>Vind: ${w.windSpeed ?? "?"} m/s ${windDir}</span>
      <span>Fukt: ${w.humidity ?? "?"}%</span>
      <span>Tryck: ${w.pressure != null ? Math.round(w.pressure) : "?"} hPa</span>
      ${w.gust != null ? `<span>Byar: ${w.gust} m/s</span>` : ""}
    </div>`;
};

const buildForecastHtml = (forecast) => {
  const next = forecast.slice(1, 7);
  if (!next.length) return "";

  const items = next.map((f) => {
    const sym = getWeatherSymbol(f.symbol);
    return `<div class="weather-popup__fc-item">
      <span class="weather-popup__fc-time">${formatTime(f.time)}</span>
      <span>${sym.icon}</span>
      <span>${f.temp != null ? f.temp.toFixed(0) : "?"}°</span>
    </div>`;
  }).join("");

  return `<div class="weather-popup__forecast">${items}</div>`;
};

export const createWeatherPopup = ({ map, maplibregl, perfTracker, fetchFn, onShow }) => {
  const popup = new maplibregl.Popup({
    closeButton: true,
    closeOnClick: true,
    maxWidth: "320px",
    className: "weather-popup-container"
  });

  let abortController = null;

  const showWeather = async (lngLat) => {
    if (abortController) {
      abortController.abort();
    }
    abortController = new AbortController();
    const { signal } = abortController;

    onShow?.();

    const endPointWeather = perfTracker?.startSpan("point-weather");

    popup
      .setLngLat(lngLat)
      .setHTML(`<div class="weather-popup"><p class="weather-popup__loading">Hämtar väder…</p></div>`)
      .addTo(map);

    try {
      const data = await fetchWeatherAtPoint(lngLat.lng, lngLat.lat, { signal, fetchFn });
      if (signal.aborted) {
        return;
      }

      if (!data.current) {
        popup.setHTML(`<div class="weather-popup"><p>Ingen väderdata tillgänglig.</p></div>`);
        return;
      }

      const html = `
        <div class="weather-popup">
          <p class="weather-popup__coords">${lngLat.lat.toFixed(2)}°N, ${lngLat.lng.toFixed(2)}°E</p>
          ${buildCurrentHtml(data.current)}
          ${buildForecastHtml(data.forecast)}
        </div>`;
      popup.setHTML(html);
      perfTracker?.recordMilestone("point-weather", {
        cached: false,
        lon: lngLat.lng,
        lat: lngLat.lat
      });
    } catch (err) {
      if (signal.aborted || err?.name === "AbortError") {
        return;
      }
      popup.setHTML(`<div class="weather-popup"><p class="weather-popup__error">Kunde inte hämta väder.</p></div>`);
    } finally {
      endPointWeather?.();
    }
  };

  const onWeatherLayerClick = (event) => {
    showWeather(event.lngLat);
  };

  WEATHER_LAYER_IDS.forEach((layerId) => {
    map.on("click", layerId, onWeatherLayerClick);
  });

  return {
    popup,
    showWeather,
    destroy: () => {
      abortController?.abort();
      abortController = null;
      popup.remove();
      WEATHER_LAYER_IDS.forEach((layerId) => {
        map.off("click", layerId, onWeatherLayerClick);
      });
    }
  };
};
