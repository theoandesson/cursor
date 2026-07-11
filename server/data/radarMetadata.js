export const RADAR_PRODUCT = Object.freeze({
  key: "comp",
  label: "Sverigekomposit (QCOMP)",
  crs: "EPSG:3006",
  intervalMinutes: 5,
  retentionHours: 6,
  source: "SMHI opendata-download-radar",
  license: "CC BY 4.0"
});

export const RADAR_SWEREF99_BOUNDS = Object.freeze({
  minX: 126648,
  minY: 5983984,
  maxX: 1075693,
  maxY: 7771252
});

export const RADAR_WGS84_BOUNDS = Object.freeze({
  west: 9.319165,
  south: 53.869605,
  east: 29.799063,
  north: 69.419707
});

export const RADAR_IMAGE_COORDINATES = Object.freeze([
  [5.28499, 69.781092],
  [29.799063, 69.419707],
  [23.727174, 53.685564],
  [9.319165, 53.869605]
]);

export const getRadarMetadata = () => ({
  product: RADAR_PRODUCT,
  bounds: {
    sweref99: RADAR_SWEREF99_BOUNDS,
    wgs84: RADAR_WGS84_BOUNDS
  },
  coordinates: RADAR_IMAGE_COORDINATES,
  formats: ["png"]
});
