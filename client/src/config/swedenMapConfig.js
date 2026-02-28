export const SWEDEN_SOURCE_BOUNDS = Object.freeze([9.5, 54.8, 24.8, 69.7]);

export const SWEDEN_MAP_CONFIG = Object.freeze({
  center: [16.5, 62.1],
  zoom: 5.3,
  minZoom: 3,
  maxZoom: 17.5,
  maxPitch: 85,
  pitch: 55,
  bearing: 0,
  hash: true
});

export const NAVIGATION_CONTROL_CONFIG = Object.freeze({
  panStepPixels: 160,
  rotateStepDegrees: 16,
  pitchStepDegrees: 8,
  minPanStepPixels: 56,
  mediumZoomThreshold: 11.5,
  mediumZoomPanFactor: 0.74,
  nearZoomThreshold: 14.8,
  nearZoomPanFactor: 0.46,
  animationMs: 170,
  defaultInverted: true
});

export const SWEDEN_DATA_SOURCES = Object.freeze({
  vectorTileJsonUrl: "https://tiles.openfreemap.org/planet",
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  terrainTiles: [
    "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
  ]
});

export const TERRAIN_CONFIG = Object.freeze({
  source: "sweden-dem",
  exaggeration: 1.05
});

export const LOD_CONFIG = Object.freeze({
  idleDelayMs: 280,
  closeRangeZoomThreshold: 14.8,
  defaultBuildingHeightScale: 1.78,
  closeRangeBuildingHeightScale: 1.58,
  closeRangeMovingPixelRatio: 1.1,
  maxPixelRatio: 2
});
