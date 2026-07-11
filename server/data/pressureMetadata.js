export const PRESSURE_GRID = Object.freeze({
  minLat: 55.0,
  maxLat: 69.0,
  minLon: 11.0,
  maxLon: 24.0,
  latStep: 0.75,
  lonStep: 0.75
});

export const PRESSURE_THRESHOLDS = Object.freeze({
  highDeviationHpa: 1.5,
  lowDeviationHpa: 1.5,
  stormCapeJkg: 500,
  severeStormCapeJkg: 1000
});

export const PRESSURE_LEGEND = Object.freeze({
  high: { label: "Högtryck", color: "#3b82c4" },
  low: { label: "Lågtryck", color: "#c44b3b" },
  storm: { label: "Åskrisk (CAPE)", color: "#9b59b6" },
  severeStorm: { label: "Hög åskrisk", color: "#f39c12" }
});

export const PRESSURE_SWEDEN_BOUNDS = Object.freeze({
  west: 9.5,
  south: 54.8,
  east: 24.8,
  north: 69.7
});

export const getPressureMetadata = () => ({
  source: "Open-Meteo (DWD ICON)",
  grid: PRESSURE_GRID,
  thresholds: PRESSURE_THRESHOLDS,
  legend: PRESSURE_LEGEND,
  bounds: PRESSURE_SWEDEN_BOUNDS,
  intervalHours: 1,
  maxForecastHours: 48
});
