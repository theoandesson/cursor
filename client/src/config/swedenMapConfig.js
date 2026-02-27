export const SWEDEN_VIEW_BOUNDS = Object.freeze([
  [9.5, 54.8],
  [24.8, 69.7]
]);

export const SWEDEN_SOURCE_BOUNDS = Object.freeze([
  SWEDEN_VIEW_BOUNDS[0][0],
  SWEDEN_VIEW_BOUNDS[0][1],
  SWEDEN_VIEW_BOUNDS[1][0],
  SWEDEN_VIEW_BOUNDS[1][1]
]);

export const SWEDEN_MAP_CONFIG = Object.freeze({
  center: [16.5, 62.1],
  zoom: 5.3,
  minZoom: 4.2,
  maxZoom: 17.5,
  pitch: 55,
  bearing: 0,
  maxBounds: SWEDEN_VIEW_BOUNDS,
  hash: true
});

export const SWEDEN_DATA_SOURCES = Object.freeze({
  vectorTileJsonUrl: "https://tiles.openfreemap.org/planet",
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  terrainTiles: [
    "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
  ]
});

export const LOD_CONFIG = Object.freeze({
  idleDelayMs: 400,
  settledTerrainSource: "sweden-dem",
  settledTerrainExaggeration: 1.05
});
