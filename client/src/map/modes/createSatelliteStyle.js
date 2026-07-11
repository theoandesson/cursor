import {
  DEFAULT_SATELLITE_SOURCE,
  SWEDEN_TILE_BOUNDS,
  VECTOR_TILE_SOURCE,
  getActiveGlyphsUrl,
  getActiveVectorTileTemplate
} from "../tiles/swedenTileSources.js";
import { SWEDEN_BOUNDARY_FEATURE } from "../../data/swedenBoundary.js";
import { SWEDEN_MAP_PALETTE } from "../style/palette/swedenPalette.js";
import { createHybridRoadLayers } from "../../traffic/createRoadLayers.js";

const createSatelliteSources = ({ includeVector = false } = {}) => ({
  [DEFAULT_SATELLITE_SOURCE.id]: {
    type: DEFAULT_SATELLITE_SOURCE.type,
    tiles: [...DEFAULT_SATELLITE_SOURCE.tiles],
    tileSize: DEFAULT_SATELLITE_SOURCE.tileSize,
    bounds: SWEDEN_TILE_BOUNDS,
    minzoom: DEFAULT_SATELLITE_SOURCE.minzoom,
    maxzoom: DEFAULT_SATELLITE_SOURCE.maxzoom,
    attribution: DEFAULT_SATELLITE_SOURCE.attribution
  },
  sweden_boundary: {
    type: "geojson",
    data: SWEDEN_BOUNDARY_FEATURE
  },
  ...(includeVector
    ? {
        [VECTOR_TILE_SOURCE.id]: {
          type: VECTOR_TILE_SOURCE.type,
          tiles: [getActiveVectorTileTemplate()],
          bounds: SWEDEN_TILE_BOUNDS,
          minzoom: VECTOR_TILE_SOURCE.minzoom,
          maxzoom: VECTOR_TILE_SOURCE.maxzoom
        }
      }
    : {})
});

const createSky = () => ({
  "sky-color": SWEDEN_MAP_PALETTE.skyColor,
  "sky-horizon-blend": 0.42,
  "horizon-color": SWEDEN_MAP_PALETTE.skyHorizonColor,
  "horizon-fog-blend": 0.42,
  "fog-color": SWEDEN_MAP_PALETTE.fogColor,
  "fog-ground-blend": 0.48,
  "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 4, 0.1, 9, 0.28, 14, 0.36]
});

const createSatelliteRasterLayer = () => ({
  id: "satellite-imagery",
  type: "raster",
  source: DEFAULT_SATELLITE_SOURCE.id,
  paint: {
    "raster-opacity": 1,
    "raster-fade-duration": 180
  }
});

const createSwedenBorderLayer = () => ({
  id: "sweden-border",
  source: "sweden_boundary",
  type: "line",
  paint: {
    "line-color": "#ffffff",
    "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.8, 10, 1.6, 15, 2.4],
    "line-opacity": 0.72
  }
});

const createHybridPlaceLabelsLayer = () => ({
  id: "hybrid-place-labels",
  source: "sweden_vector",
  "source-layer": "place",
  type: "symbol",
  filter: ["match", ["get", "class"], ["city", "town", "village"], true, false],
  layout: {
    "text-field": ["coalesce", ["get", "name:sv"], ["get", "name"], ""],
    "text-font": ["Noto Sans Regular"],
    "text-size": ["interpolate", ["linear"], ["zoom"], 4, 10, 8, 12, 12, 15],
    "text-anchor": "center",
    "text-allow-overlap": false
  },
  paint: {
    "text-color": "#ffffff",
    "text-halo-color": "#1a2d42d9",
    "text-halo-width": 1.6,
    "text-halo-blur": 0.4
  }
});

const createHybridOverlayLayers = () => [
  ...createHybridRoadLayers(SWEDEN_MAP_PALETTE),
  createHybridPlaceLabelsLayer()
];

export const createSatelliteStyle = () => ({
  version: 8,
  name: "sweden-satellite",
  glyphs: getActiveGlyphsUrl(),
  sources: createSatelliteSources(),
  layers: [createSatelliteRasterLayer(), createSwedenBorderLayer()],
  sky: createSky()
});

export const createHybridStyle = () => ({
  version: 8,
  name: "sweden-hybrid",
  glyphs: getActiveGlyphsUrl(),
  sources: createSatelliteSources({ includeVector: true }),
  layers: [
    createSatelliteRasterLayer(),
    ...createHybridOverlayLayers(),
    createSwedenBorderLayer()
  ],
  sky: createSky()
});
