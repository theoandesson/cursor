export const SWEDEN_VIEW_BOUNDS = Object.freeze([
  [9.5, 54.8],
  [24.8, 69.7]
]);

export const SWEDEN_MAP_CONFIG = Object.freeze({
  center: [16.5, 62.1],
  zoom: 5.3,
  minZoom: 4.2,
  maxZoom: 17.5,
  pitch: 64,
  bearing: 0,
  maxBounds: SWEDEN_VIEW_BOUNDS,
  antialias: true,
  hash: true
});

export const SWEDEN_DATA_SOURCES = Object.freeze({
  vectorTiles: ["https://demotiles.maplibre.org/tiles/{z}/{x}/{y}.pbf"],
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  terrainTiles: [
    "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
  ]
});

export const LOD_CONFIG = Object.freeze({
  idleDelayMs: 550,
  movingTerrainSource: "sweden-dem-low",
  settledTerrainSource: "sweden-dem-high",
  movingTerrainExaggeration: 1,
  settledTerrainExaggeration: 1.08
});
