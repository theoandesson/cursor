const SMHI_BASE_URL =
  "https://opendata-download-metfcst.smhi.se/api/category/pmp3g/version/2";

const roundCoord = (value) => Math.round(value * 1e6) / 1e6;

const extractParameter = (entry, name) => {
  const parameter = entry.parameters?.find((item) => item.name === name);
  return parameter?.values?.[0] ?? null;
};

const mapTimeSeriesEntry = (entry) => ({
  time: entry.validTime,
  temp: extractParameter(entry, "t"),
  windSpeed: extractParameter(entry, "ws"),
  windDir: extractParameter(entry, "wd"),
  humidity: extractParameter(entry, "r"),
  pressure: extractParameter(entry, "msl"),
  symbol: extractParameter(entry, "Wsymb2"),
  thunder: extractParameter(entry, "tstm"),
  gust: extractParameter(entry, "gust"),
  visibility: extractParameter(entry, "vis"),
  precipCategory: extractParameter(entry, "pcat"),
  precipMean: extractParameter(entry, "pmean")
});

export const fetchWeatherByPoint = async ({ lon, lat, forecastHours = 24 }) => {
  const url =
    `${SMHI_BASE_URL}/geotype/point/lon/${roundCoord(lon)}/lat/${roundCoord(lat)}/data.json`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`SMHI API ${response.status}: ${response.statusText}`);
  }

  const payload = await response.json();
  const series = (payload.timeSeries ?? []).map(mapTimeSeriesEntry);

  return {
    approvedTime: payload.approvedTime,
    referenceTime: payload.referenceTime,
    lon: payload.geometry?.coordinates?.[0]?.[0] ?? lon,
    lat: payload.geometry?.coordinates?.[0]?.[1] ?? lat,
    current: series[0] ?? null,
    forecast: series.slice(0, Math.max(1, forecastHours))
  };
};
