import {
  DEFAULT_SATELLITE_SOURCE,
  DEM_TILE_SOURCE,
  GLYPHS_URL,
  SWEDEN_TILE_BOUNDS,
  VECTOR_TILE_SOURCE
} from "../tiles/swedenTileSources.js";
import { SWEDEN_BOUNDARY_FEATURE } from "../../data/swedenBoundary.js";
import { TERRAIN_CONFIG } from "../../config/swedenMapConfig.js";
import { SWEDEN_MAP_PALETTE } from "../style/palette/swedenPalette.js";

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
  [DEM_TILE_SOURCE.id]: {
    type: DEM_TILE_SOURCE.type,
    tiles: DEM_TILE_SOURCE.tiles,
    encoding: DEM_TILE_SOURCE.encoding,
    tileSize: DEM_TILE_SOURCE.tileSize,
    bounds: SWEDEN_TILE_BOUNDS,
    minzoom: DEM_TILE_SOURCE.minzoom,
    maxzoom: DEM_TILE_SOURCE.maxzoom
  },
  ...(includeVector
    ? {
        [VECTOR_TILE_SOURCE.id]: {
          type: VECTOR_TILE_SOURCE.type,
          url: VECTOR_TILE_SOURCE.tileJsonUrl,
          bounds: SWEDEN_TILE_BOUNDS,
          minzoom: VECTOR_TILE_SOURCE.minzoom,
          maxzoom: VECTOR_TILE_SOURCE.maxzoom
        }
      }
    : {})
});

const createSky = () => ({
  "sky-color": SWEDEN_MAP_PALETTE.skyColor,
  "sky-horizon-blend": 0.3,
  "horizon-color": SWEDEN_MAP_PALETTE.skyHorizonColor,
  "horizon-fog-blend": 0.3,
  "fog-color": SWEDEN_MAP_PALETTE.fogColor,
  "fog-ground-blend": 0.3,
  "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 4, 0.08, 9, 0.2]
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

const createHybridOverlayLayers = () => [
  {
    id: "hybrid-roads-casing",
    source: "sweden_vector",
    "source-layer": "transportation",
    type: "line",
    paint: {
      "line-color": "#ffffff",
      "line-width": [
        "interpolate",
        ["linear"],
        ["zoom"],
        5,
        1.2,
        10,
        3.4,
        14,
        6.4
      ],
      "line-opacity": 0.82,
      "line-blur": 0.35
    }
  },
  {
    id: "hybrid-roads",
    source: "sweden_vector",
    "source-layer": "transportation",
    type: "line",
    paint: {
      "line-color": [
        "match",
        ["get", "class"],
        ["motorway", "trunk"],
        "#ffd166",
        ["primary", "secondary"],
        "#ffe08a",
        "#f4f7fb"
      ],
      "line-width": [
        "interpolate",
        ["linear"],
        ["zoom"],
        5,
        0.5,
        10,
        1.9,
        14,
        4.1
      ],
      "line-opacity": 0.94,
      "line-blur": 0.15
    }
  },
  {
    id: "hybrid-road-labels",
    source: "sweden_vector",
    "source-layer": "transportation_name",
    type: "symbol",
    minzoom: 10,
    layout: {
      "symbol-placement": "line",
      "text-field": ["coalesce", ["get", "name:sv"], ["get", "name"], ""],
      "text-font": ["Noto Sans Regular"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 10, 10, 13, 12, 16, 14],
      "text-letter-spacing": 0.02
    },
    paint: {
      "text-color": "#ffffff",
      "text-halo-color": "#1a2d42cc",
      "text-halo-width": 1.5,
      "text-halo-blur": 0.35
    }
  },
  {
    id: "hybrid-place-labels",
    source: "sweden_vector",
    "source-layer": "place",
    type: "symbol",
    filter: ["match", ["get", "class"], ["city", "town", "village"], true, false],
    layout: {
      "text-field": ["coalesce", ["get", "name:sv"], ["get", "name"], ""],
      "text-font": ["Noto Sans Regular"],
      "text-size": [
        "interpolate",
        ["linear"],
        ["zoom"],
        4,
        10,
        8,
        12,
        12,
        15
      ],
      "text-anchor": "center",
      "text-allow-overlap": false
    },
    paint: {
      "text-color": "#ffffff",
      "text-halo-color": "#1a2d42d9",
      "text-halo-width": 1.6,
      "text-halo-blur": 0.4
    }
  }
];

export const createSatelliteStyle = () => ({
  version: 8,
  name: "sweden-satellite",
  glyphs: GLYPHS_URL,
  sources: createSatelliteSources(),
  layers: [createSatelliteRasterLayer(), createSwedenBorderLayer()],
  terrain: {
    source: TERRAIN_CONFIG.source,
    exaggeration: TERRAIN_CONFIG.exaggeration
  },
  sky: createSky()
});

export const createHybridStyle = () => ({
  version: 8,
  name: "sweden-hybrid",
  glyphs: GLYPHS_URL,
  sources: createSatelliteSources({ includeVector: true }),
  layers: [
    createSatelliteRasterLayer(),
    ...createHybridOverlayLayers(),
    createSwedenBorderLayer()
  ],
  terrain: {
    source: TERRAIN_CONFIG.source,
    exaggeration: TERRAIN_CONFIG.exaggeration
  },
  sky: createSky()
});
