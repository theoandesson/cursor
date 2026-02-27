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

const roundedMovingHeightExpression = [
  "*",
  4,
  ["round", ["/", baseBuildingHeightExpression, 4]]
];

const roundedMovingMinHeightExpression = [
  "*",
  4,
  ["round", ["/", baseBuildingMinHeightExpression, 4]]
];

const swedenOnlyFilter = ["within", SWEDEN_BOUNDARY_GEOMETRY];

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
        0.4,
        10,
        1.3,
        14,
        2.2
      ],
      "line-opacity": SWEDEN_MAP_PALETTE.roadsOpacity,
      "line-blur": 0.3
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
      "fill-extrusion-opacity": 0.55,
      "fill-extrusion-vertical-gradient": false
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
      "fill-extrusion-height": baseBuildingHeightExpression,
      "fill-extrusion-base": baseBuildingMinHeightExpression,
      "fill-extrusion-opacity": 0.82,
      "fill-extrusion-vertical-gradient": true
    }
  }
];
