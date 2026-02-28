const SMHI_BASE = "https://opendata-download-metfcst.smhi.se/api/category/pmp3g/version/2";

const roundCoord = (v) => Math.round(v * 1e6) / 1e6;

const extractParam = (entry, name) => {
  const param = entry.parameters.find((p) => p.name === name);
  return param?.values?.[0] ?? null;
};

const parseTimeSeries = (entry) => ({
  time: entry.validTime,
  temp: extractParam(entry, "t"),
  windSpeed: extractParam(entry, "ws"),
  windDir: extractParam(entry, "wd"),
  humidity: extractParam(entry, "r"),
  pressure: extractParam(entry, "msl"),
  symbol: extractParam(entry, "Wsymb2"),
  thunder: extractParam(entry, "tstm"),
  gust: extractParam(entry, "gust"),
  visibility: extractParam(entry, "vis"),
  precipCategory: extractParam(entry, "pcat"),
  precipMean: extractParam(entry, "pmean")
});

export const fetchWeatherAtPoint = async (lon, lat) => {
  const url = `${SMHI_BASE}/geotype/point/lon/${roundCoord(lon)}/lat/${roundCoord(lat)}/data.json`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`SMHI API ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  const series = (data.timeSeries ?? []).map(parseTimeSeries);

  return {
    approvedTime: data.approvedTime,
    referenceTime: data.referenceTime,
    lon: data.geometry?.coordinates?.[0]?.[0] ?? lon,
    lat: data.geometry?.coordinates?.[0]?.[1] ?? lat,
    current: series[0] ?? null,
    forecast: series.slice(0, 24)
  };
};
