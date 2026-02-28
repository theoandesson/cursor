import { fetchWeatherAtPoint } from "./smhiWeatherService.js";
import { getWeatherSymbol, getWindDirection } from "./weatherSymbols.js";

const formatTime = (isoString) => {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
};

const buildCurrentHtml = (w) => {
  const sym = getWeatherSymbol(w.symbol);
  const windDir = getWindDirection(w.windDir);

  return `
    <div class="weather-popup__hero">
      <div class="weather-popup__current">
        <span class="weather-popup__icon">${sym.icon}</span>
        <span class="weather-popup__temp">${w.temp != null ? w.temp.toFixed(1) : "?"}°</span>
      </div>
      <p class="weather-popup__label">${sym.label}</p>
    </div>
    <div class="weather-popup__body">
      <div class="weather-popup__details">
        <div class="weather-popup__detail-item">
          <span class="weather-popup__detail-label">Vind</span>
          <span class="weather-popup__detail-value">${w.windSpeed ?? "?"} m/s ${windDir}</span>
        </div>
        <div class="weather-popup__detail-item">
          <span class="weather-popup__detail-label">Fuktighet</span>
          <span class="weather-popup__detail-value">${w.humidity ?? "?"}%</span>
        </div>
        <div class="weather-popup__detail-item">
          <span class="weather-popup__detail-label">Lufttryck</span>
          <span class="weather-popup__detail-value">${w.pressure ? Math.round(w.pressure) + " hPa" : "?"}</span>
        </div>
        <div class="weather-popup__detail-item">
          <span class="weather-popup__detail-label">Vindbyar</span>
          <span class="weather-popup__detail-value">${w.gust ? w.gust + " m/s" : "—"}</span>
        </div>
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
      <span class="weather-popup__fc-temp">${f.temp != null ? f.temp.toFixed(0) : "?"}°</span>
    </div>`;
  }).join("");

  return `<div class="weather-popup__forecast">${items}</div>`;
};

export const createWeatherPopup = ({ map, maplibregl }) => {
  const popup = new maplibregl.Popup({
    closeButton: true,
    closeOnClick: true,
    maxWidth: "320px",
    className: "weather-popup-container"
  });

  let abortController = null;

  const showWeather = async (lngLat) => {
    if (abortController) abortController.abort();
    abortController = new AbortController();

    popup
      .setLngLat(lngLat)
      .setHTML(`<div class="weather-popup"><p class="weather-popup__loading">Hämtar väder…</p></div>`)
      .addTo(map);

    try {
      const data = await fetchWeatherAtPoint(lngLat.lng, lngLat.lat);
      if (abortController.signal.aborted) return;

      if (!data.current) {
        popup.setHTML(`<div class="weather-popup"><p class="weather-popup__error">Ingen väderdata tillgänglig.</p></div>`);
        return;
      }

      const html = `
        <div class="weather-popup">
          ${buildCurrentHtml(data.current)}
          ${buildForecastHtml(data.forecast)}
          </div>
        </div>`;
      popup.setHTML(html);
    } catch (err) {
      if (abortController.signal.aborted) return;
      popup.setHTML(`<div class="weather-popup"><p class="weather-popup__error">Kunde inte hämta väder.</p></div>`);
    }
  };

  map.on("click", (e) => {
    if (e.originalEvent.target.closest(".maplibregl-ctrl, .weather-marker")) return;
    showWeather(e.lngLat);
  });

  return { popup };
};
