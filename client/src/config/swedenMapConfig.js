import {
  DEM_TILE_SOURCE,
  GLYPHS_URL,
  SWEDEN_TILE_BOUNDS,
  VECTOR_TILE_SOURCE
} from "../map/tiles/swedenTileSources.js";

export const SWEDEN_SOURCE_BOUNDS = SWEDEN_TILE_BOUNDS;

export const SWEDEN_MAP_CONFIG = Object.freeze({
  center: [16.5, 62.1],
  zoom: 5.3,
  minZoom: 3,
  maxZoom: 17.5,
  maxPitch: 85,
  pitch: 55,
  bearing: 0,
  hash: false
});

export const NAVIGATION_CONTROL_CONFIG = Object.freeze({
  panStepPixels: 160,
  rotateStepDegrees: 16,
  pitchStepDegrees: 8,
  minPanStepPixels: 56,
  mediumZoomThreshold: 11.5,
  mediumZoomPanFactor: 0.74,
  nearZoomThreshold: 14.2,
  nearZoomPanFactor: 0.46,
  animationMs: 170,
  defaultInverted: true
});

export const SWEDEN_DATA_SOURCES = Object.freeze({
  vectorTileJsonUrl: VECTOR_TILE_SOURCE.tileJsonUrl,
  glyphs: GLYPHS_URL,
  terrainTiles: DEM_TILE_SOURCE.tiles
});

export const TERRAIN_CONFIG = Object.freeze({
  source: "sweden-dem",
  exaggeration: 1.05
});

export const LOD_CONFIG = Object.freeze({
  idleDelayMs: 220,
  mediumZoomThreshold: 10,
  closeZoomThreshold: 14,
  defaultBuildingHeightScale: 1.72,
  closeRangeBuildingHeightScale: 1.58,
  settledBuildingOpacity: 0.9,
  movingBuildingOpacity: 0.76,
  closeRangeMovingPixelRatio: 1.35,
  maxPixelRatio: 2,
  zoomTierProfiles: Object.freeze({
    far: Object.freeze({
      buildingHeightScale: 1.35,
      settledBuildingOpacity: 0.82,
      movingBuildingOpacity: 0.68,
      hideRoadLabelsWhileMoving: true
    }),
    medium: Object.freeze({
      buildingHeightScale: 1.55,
      settledBuildingOpacity: 0.88,
      movingBuildingOpacity: 0.74,
      hideRoadLabelsWhileMoving: true
    }),
    close: Object.freeze({
      buildingHeightScale: 1.72,
      settledBuildingOpacity: 0.92,
      movingBuildingOpacity: 0.78,
      hideRoadLabelsWhileMoving: true
    })
  })
});
