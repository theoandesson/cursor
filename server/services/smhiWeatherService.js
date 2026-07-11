import { fetchWithTimeout } from "../lib/fetchWithTimeout.js";

const SMHI_BASE_URL =
  "https://opendata-download-metfcst.smhi.se/api/category/snow1g/version/1";

const MISSING_VALUE = 9999;
const FETCH_TIMEOUT_MS = 12_000;

const roundCoord = (value) => Math.round(value * 1e6) / 1e6;

const cleanValue = (value) => {
  if (value == null || value === MISSING_VALUE || value < -9000) {
    return null;
  }
  return value;
};

const mapTimeSeriesEntry = (entry) => {
  const data = entry.data ?? {};

  return {
    time: entry.time,
    temp: cleanValue(data.air_temperature),
    windSpeed: cleanValue(data.wind_speed),
    windDir: cleanValue(data.wind_from_direction),
    humidity: cleanValue(data.relative_humidity),
    pressure: cleanValue(data.air_pressure_at_mean_sea_level),
    symbol: cleanValue(data.symbol_code),
    thunder: cleanValue(data.thunderstorm_probability),
    gust: cleanValue(data.wind_speed_of_gust),
    visibility: cleanValue(data.visibility_in_air),
    precipCategory: cleanValue(data.predominant_precipitation_type_at_surface),
    precipMean: cleanValue(data.precipitation_amount_mean)
  };
};

const readCoordinates = (geometry, fallbackLon, fallbackLat) => {
  const coords = geometry?.coordinates;
  if (!Array.isArray(coords)) {
    return { lon: fallbackLon, lat: fallbackLat };
  }

  if (Array.isArray(coords[0])) {
    return { lon: coords[0][0], lat: coords[0][1] };
  }

  return { lon: coords[0], lat: coords[1] };
};

const sliceForecastByHours = (series, forecastHours, referenceTime) => {
  if (!series.length) {
    return [];
  }

  const refMs = referenceTime ? Date.parse(referenceTime) : Date.parse(series[0].time);
  if (!Number.isFinite(refMs)) {
    return series.slice(0, Math.max(1, forecastHours));
  }

  const cutoffMs = refMs + forecastHours * 60 * 60 * 1000;
  const withinWindow = series.filter((entry) => {
    const entryMs = Date.parse(entry.time);
    return Number.isFinite(entryMs) && entryMs <= cutoffMs;
  });

  return withinWindow.length > 0 ? withinWindow : series.slice(0, 1);
};

export const fetchWeatherByPoint = async ({ lon, lat, forecastHours = 24 }) => {
  const url =
    `${SMHI_BASE_URL}/geotype/point/lon/${roundCoord(lon)}/lat/${roundCoord(lat)}/data.json`;
  const response = await fetchWithTimeout(url, { timeoutMs: FETCH_TIMEOUT_MS });

  if (!response.ok) {
    throw new Error(`SMHI API ${response.status}: ${response.statusText}`);
  }

  const payload = await response.json();
  const series = (payload.timeSeries ?? []).map(mapTimeSeriesEntry);
  const { lon: resolvedLon, lat: resolvedLat } = readCoordinates(payload.geometry, lon, lat);
  const forecast = sliceForecastByHours(series, forecastHours, payload.referenceTime);

  return {
    approvedTime: payload.createdTime ?? payload.referenceTime,
    referenceTime: payload.referenceTime,
    lon: resolvedLon,
    lat: resolvedLat,
    current: series[0] ?? null,
    forecast
  };
};
