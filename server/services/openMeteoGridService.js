import { fetchWithTimeout } from "../lib/fetchWithTimeout.js";
import { PRESSURE_GRID } from "../data/pressureMetadata.js";

const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const FETCH_TIMEOUT_MS = 25_000;
const GRID_CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_LOCATIONS_PER_REQUEST = 200;

let gridCache = null;

const buildAxis = ({ min, max, step }) => {
  const values = [];
  for (let value = min; value <= max + step / 2; value += step) {
    values.push(Number(value.toFixed(4)));
  }
  return values;
};

const buildGridAxes = () => ({
  latitudes: buildAxis({
    min: PRESSURE_GRID.minLat,
    max: PRESSURE_GRID.maxLat,
    step: PRESSURE_GRID.latStep
  }),
  longitudes: buildAxis({
    min: PRESSURE_GRID.minLon,
    max: PRESSURE_GRID.maxLon,
    step: PRESSURE_GRID.lonStep
  })
});

const buildCoordinatePairs = ({ latitudes, longitudes }) => {
  const pairs = [];

  latitudes.forEach((latitude) => {
    longitudes.forEach((longitude) => {
      pairs.push({ latitude, longitude });
    });
  });

  return pairs;
};

const chunkArray = (items, chunkSize) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
};

const fetchCoordinateBatch = async ({ pairs, forecastDays }) => {
  const params = new URLSearchParams({
    latitude: pairs.map((pair) => pair.latitude).join(","),
    longitude: pairs.map((pair) => pair.longitude).join(","),
    hourly: "pressure_msl,cape",
    forecast_days: String(forecastDays),
    timezone: "UTC",
    cell_selection: "nearest"
  });

  const response = await fetchWithTimeout(`${OPEN_METEO_FORECAST_URL}?${params.toString()}`, {
    timeoutMs: FETCH_TIMEOUT_MS
  });

  if (!response.ok) {
    throw new Error(`Open-Meteo API ${response.status}: ${response.statusText}`);
  }

  const payload = await response.json();
  return Array.isArray(payload) ? payload : [payload];
};

const fetchGridForecast = async ({ forecastHours = 48 } = {}) => {
  const { latitudes, longitudes } = buildGridAxes();
  const coordinatePairs = buildCoordinatePairs({ latitudes, longitudes });
  const forecastDays = Math.min(16, Math.ceil(forecastHours / 24));
  const batches = chunkArray(coordinatePairs, MAX_LOCATIONS_PER_REQUEST);
  const locations = [];

  for (const batch of batches) {
    const batchLocations = await fetchCoordinateBatch({ pairs: batch, forecastDays });
    locations.push(...batchLocations);
  }

  if (!locations.length) {
    throw new Error("Open-Meteo returnerade inga prognospunkter.");
  }

  const times = locations[0].hourly?.time ?? [];
  const rowCount = latitudes.length;
  const colCount = longitudes.length;
  const pressures = Array.from({ length: times.length }, () =>
    Array.from({ length: rowCount }, () => Array(colCount).fill(null))
  );
  const capes = Array.from({ length: times.length }, () =>
    Array.from({ length: rowCount }, () => Array(colCount).fill(null))
  );

  locations.forEach((location) => {
    const latIndex = latitudes.findIndex(
      (latitude) => Math.abs(latitude - location.latitude) < PRESSURE_GRID.latStep / 2
    );
    const lonIndex = longitudes.findIndex(
      (longitude) => Math.abs(longitude - location.longitude) < PRESSURE_GRID.lonStep / 2
    );

    if (latIndex < 0 || lonIndex < 0) {
      return;
    }

    const pressureSeries = location.hourly?.pressure_msl ?? [];
    const capeSeries = location.hourly?.cape ?? [];

    for (let timeIndex = 0; timeIndex < times.length; timeIndex += 1) {
      pressures[timeIndex][latIndex][lonIndex] = pressureSeries[timeIndex] ?? null;
      capes[timeIndex][latIndex][lonIndex] = capeSeries[timeIndex] ?? null;
    }
  });

  return {
    fetchedAt: new Date().toISOString(),
    forecastHours,
    times,
    latitudes,
    longitudes,
    pressures,
    capes
  };
};

export const getSwedenGridForecast = async ({ forecastHours = 48, forceRefresh = false } = {}) => {
  const now = Date.now();
  if (!forceRefresh && gridCache && gridCache.expiresAt > now) {
    return gridCache.payload;
  }

  const payload = await fetchGridForecast({ forecastHours });
  gridCache = {
    expiresAt: now + GRID_CACHE_TTL_MS,
    payload
  };

  return payload;
};

export const clearSwedenGridForecastCache = () => {
  gridCache = null;
};
