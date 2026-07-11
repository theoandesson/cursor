import { SWEDEN_MAP_PALETTE } from "./palette/swedenPalette.js";
import { LOD_CONFIG } from "../../config/swedenMapConfig.js";
import { createRoadLayers } from "../../traffic/createRoadLayers.js";
import {
  DEFAULT_SATELLITE_SOURCE,
  SWEDEN_MAP_MODES
} from "../tiles/swedenTileSources.js";
import {
  baseBuildingMinHeightExpression,
  createBuildingVisualColorExpression,
  createVisualBuildingHeightExpression
} from "./expressions/buildingExpressions.js";

const urbanLanduseFilter = [
  "match",
  ["get", "class"],
  ["residential", "commercial", "industrial", "suburb", "neighbourhood"],
  true,
  false
];

const ROAD_LABEL_LAYER_ID = "road-labels";

const createBaseTierLayers = ({ satelliteActive, mode }) => {
  const layers = [];

  if (satelliteActive) {
    layers.push({
      id: "satellite-base",
      type: "raster",
      source: DEFAULT_SATELLITE_SOURCE.id,
      paint: {
        "raster-opacity": mode === SWEDEN_MAP_MODES.hybrid ? 0.92 : 1
      }
    });
  }

  layers.push(
    {
      id: "bg",
      type: "background",
      paint: {
        "background-color": SWEDEN_MAP_PALETTE.background
      }
    },
    {
      id: "sweden-area",
      source: "sweden_boundary",
      type: "fill",
      paint: {
        "fill-color": SWEDEN_MAP_PALETTE.swedenAreaFill,
        "fill-opacity": SWEDEN_MAP_PALETTE.swedenAreaFillOpacity
      }
    },
    {
      id: "landcover",
      source: "sweden_vector",
      "source-layer": "landcover",
      type: "fill",
      layout: {
        visibility: satelliteActive && mode === SWEDEN_MAP_MODES.satellite ? "none" : "visible"
      },
      paint: {
        "fill-color": [
          "match",
          ["get", "class"],
          ["wood", "forest"],
          SWEDEN_MAP_PALETTE.landcoverForest,
          ["grass", "park"],
          SWEDEN_MAP_PALETTE.landcoverPark,
          SWEDEN_MAP_PALETTE.landcoverBase
        ],
        "fill-opacity": SWEDEN_MAP_PALETTE.landcoverOpacity
      }
    },
    {
      id: "landuse-urban",
      source: "sweden_vector",
      "source-layer": "landuse",
      type: "fill",
      filter: urbanLanduseFilter,
      paint: {
        "fill-color": SWEDEN_MAP_PALETTE.landuseUrban,
        "fill-opacity": SWEDEN_MAP_PALETTE.landuseUrbanOpacity
      }
    },
    {
      id: "water",
      source: "sweden_vector",
      "source-layer": "water",
      type: "fill",
      paint: {
        "fill-color": SWEDEN_MAP_PALETTE.waterFill,
        "fill-opacity": SWEDEN_MAP_PALETTE.waterFillOpacity
      }
    },
    {
      id: "waterway",
      source: "sweden_vector",
      "source-layer": "waterway",
      type: "line",
      paint: {
        "line-color": SWEDEN_MAP_PALETTE.waterwayLine,
        "line-width": 1,
        "line-opacity": 0.65
      }
    },
    {
      id: "sweden-border",
      source: "sweden_boundary",
      type: "line",
      paint: {
        "line-color": SWEDEN_MAP_PALETTE.swedenBorder,
        "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.8, 10, 1.6, 15, 3],
        "line-opacity": SWEDEN_MAP_PALETTE.swedenBorderOpacity
      }
    }
  );

  return layers;
};

const createDetailAndLabelLayers = () => {
  const roadLayers = createRoadLayers({ palette: SWEDEN_MAP_PALETTE });
  const detailRoadLayers = roadLayers.filter((layer) => layer.id !== ROAD_LABEL_LAYER_ID);
  const labelLayers = roadLayers.filter((layer) => layer.id === ROAD_LABEL_LAYER_ID);

  return {
    // Live traffic overlays are mounted dynamically after style load in initSwedenMap.
    detailLayers: detailRoadLayers,
    labelLayers
  };
};

const createBuildingLayers = () => [
  {
    id: "sweden-buildings",
    source: "sweden_vector",
    "source-layer": "building",
    type: "fill-extrusion",
    minzoom: 13,
    paint: {
      "fill-extrusion-color": createBuildingVisualColorExpression(SWEDEN_MAP_PALETTE),
      "fill-extrusion-height": createVisualBuildingHeightExpression(
        LOD_CONFIG.defaultBuildingHeightScale
      ),
      "fill-extrusion-base": baseBuildingMinHeightExpression,
      "fill-extrusion-opacity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        13,
        0.74,
        15,
        0.9,
        17,
        0.94
      ],
      "fill-extrusion-vertical-gradient": true
    }
  }
];

export const createLayerTiers = ({ mode = SWEDEN_MAP_MODES.vector } = {}) => {
  const satelliteActive =
    mode === SWEDEN_MAP_MODES.satellite || mode === SWEDEN_MAP_MODES.hybrid;
  const { detailLayers, labelLayers } = createDetailAndLabelLayers();

  return {
    base: {
      minZoom: 0,
      layers: createBaseTierLayers({ satelliteActive, mode })
    },
    detail: {
      minZoom: 8,
      layers: detailLayers
    },
    labels: {
      minZoom: 10,
      layers: labelLayers
    },
    buildings: {
      minZoom: 13,
      layers: createBuildingLayers()
    }
  };
};

export const createLayersByZoom = ({ mode = SWEDEN_MAP_MODES.vector } = {}) => {
  const tiers = createLayerTiers({ mode });
  return [
    { id: "base", minZoom: tiers.base.minZoom, layers: tiers.base.layers },
    { id: "detail", minZoom: tiers.detail.minZoom, layers: tiers.detail.layers },
    { id: "labels", minZoom: tiers.labels.minZoom, layers: tiers.labels.layers },
    { id: "buildings", minZoom: tiers.buildings.minZoom, layers: tiers.buildings.layers }
  ];
};

export const createLayers = ({ mode = SWEDEN_MAP_MODES.vector } = {}) => {
  const tiers = createLayerTiers({ mode });
  return [...tiers.base.layers, ...tiers.detail.layers, ...tiers.labels.layers, ...tiers.buildings.layers];
};
