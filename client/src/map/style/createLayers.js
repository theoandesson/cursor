import { SWEDEN_BOUNDARY_GEOMETRY } from "../../data/swedenBoundary.js";
import { SWEDEN_MAP_PALETTE } from "./palette/swedenPalette.js";

const rawBuildingHeightExpression = [
  "coalesce",
  ["get", "render_height"],
  ["get", "height"],
  0
];

const rawBuildingMinHeightExpression = [
  "coalesce",
  ["get", "render_min_height"],
  ["get", "min_height"],
  0
];

const baseBuildingHeightExpression = [
  "max",
  9,
  ["to-number", rawBuildingHeightExpression, 9]
];

const baseBuildingMinHeightExpression = [
  "max",
  0,
  ["to-number", rawBuildingMinHeightExpression, 0]
];

const visualBuildingHeightExpression = ["*", 1.8, baseBuildingHeightExpression];

const roundedMovingHeightExpression = [
  "*",
  4,
  ["round", ["/", visualBuildingHeightExpression, 4]]
];

const roundedMovingMinHeightExpression = [
  "*",
  4,
  ["round", ["/", baseBuildingMinHeightExpression, 4]]
];

const swedenOnlyFilter = ["within", SWEDEN_BOUNDARY_GEOMETRY];
const swedenUrbanLanduseFilter = [
  "all",
  swedenOnlyFilter,
  [
    "match",
    ["get", "class"],
    ["residential", "commercial", "industrial", "suburb", "neighbourhood"],
    true,
    false
  ]
];

export const createLayers = () => [
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
    filter: swedenOnlyFilter,
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
    filter: swedenUrbanLanduseFilter,
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
    filter: swedenOnlyFilter,
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
    filter: swedenOnlyFilter,
    paint: {
      "line-color": SWEDEN_MAP_PALETTE.waterwayLine,
      "line-width": 1,
      "line-opacity": 0.65
    }
  },
  {
    id: "roads-casing",
    source: "sweden_vector",
    "source-layer": "transportation",
    type: "line",
    filter: swedenOnlyFilter,
    paint: {
      "line-color": SWEDEN_MAP_PALETTE.roadsCasing,
      "line-width": [
        "interpolate",
        ["linear"],
        ["zoom"],
        5,
        1.1,
        10,
        3.2,
        14,
        6.2
      ],
      "line-opacity": SWEDEN_MAP_PALETTE.roadsCasingOpacity,
      "line-blur": 0.35
    }
  },
  {
    id: "roads",
    source: "sweden_vector",
    "source-layer": "transportation",
    type: "line",
    filter: swedenOnlyFilter,
    paint: {
      "line-color": [
        "match",
        ["get", "class"],
        ["motorway", "trunk"],
        SWEDEN_MAP_PALETTE.roadsMotorway,
        ["primary", "secondary"],
        SWEDEN_MAP_PALETTE.roadsPrimary,
        SWEDEN_MAP_PALETTE.roadsLocal
      ],
      "line-width": [
        "interpolate",
        ["linear"],
        ["zoom"],
        5,
        0.45,
        10,
        1.8,
        14,
        3.9
      ],
      "line-opacity": SWEDEN_MAP_PALETTE.roadsOpacity,
      "line-blur": 0.2
    }
  },
  {
    id: "road-labels",
    source: "sweden_vector",
    "source-layer": "transportation_name",
    type: "symbol",
    minzoom: 10,
    filter: swedenOnlyFilter,
    layout: {
      "symbol-placement": "line",
      "text-field": ["coalesce", ["get", "name:sv"], ["get", "name"], ""],
      "text-font": ["Noto Sans Regular"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 10, 10, 13, 12, 16, 14],
      "text-letter-spacing": 0.02
    },
    paint: {
      "text-color": SWEDEN_MAP_PALETTE.roadLabel,
      "text-halo-color": SWEDEN_MAP_PALETTE.roadLabelHalo,
      "text-halo-width": 1.3,
      "text-halo-blur": 0.4
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
  },
  {
    id: "sweden-buildings-low",
    source: "sweden_vector",
    "source-layer": "building",
    type: "fill-extrusion",
    minzoom: 11.5,
    filter: swedenOnlyFilter,
    layout: {
      visibility: "none"
    },
    paint: {
      "fill-extrusion-color": SWEDEN_MAP_PALETTE.buildingsLow,
      "fill-extrusion-height": roundedMovingHeightExpression,
      "fill-extrusion-base": roundedMovingMinHeightExpression,
      "fill-extrusion-opacity": 0.74,
      "fill-extrusion-vertical-gradient": true
    }
  },
  {
    id: "sweden-buildings-high",
    source: "sweden_vector",
    "source-layer": "building",
    type: "fill-extrusion",
    minzoom: 11.5,
    filter: swedenOnlyFilter,
    paint: {
      "fill-extrusion-color": [
        "interpolate",
        ["linear"],
        baseBuildingHeightExpression,
        0,
        SWEDEN_MAP_PALETTE.buildingsHighLow,
        50,
        SWEDEN_MAP_PALETTE.buildingsHighMid,
        180,
        SWEDEN_MAP_PALETTE.buildingsHighTall
      ],
      "fill-extrusion-height": visualBuildingHeightExpression,
      "fill-extrusion-base": baseBuildingMinHeightExpression,
      "fill-extrusion-opacity": 0.93,
      "fill-extrusion-vertical-gradient": true
    }
  }
];
