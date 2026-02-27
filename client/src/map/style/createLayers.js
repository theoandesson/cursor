import { SWEDEN_BOUNDARY_GEOMETRY } from "../../data/swedenBoundary.js";

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
      "background-color": "#1b2435"
    }
  },
  {
    id: "sweden-area",
    source: "sweden_boundary",
    type: "fill",
    paint: {
      "fill-color": "#192a3d",
      "fill-opacity": 0.28
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
        "#264431",
        ["grass", "park"],
        "#335236",
        "#24384a"
      ],
      "fill-opacity": 0.22
    }
  },
  {
    id: "water",
    source: "sweden_vector",
    "source-layer": "water",
    type: "fill",
    filter: swedenOnlyFilter,
    paint: {
      "fill-color": "#2d5f91",
      "fill-opacity": 0.3
    }
  },
  {
    id: "waterway",
    source: "sweden_vector",
    "source-layer": "waterway",
    type: "line",
    filter: swedenOnlyFilter,
    paint: {
      "line-color": "#2a6ca6",
      "line-width": 1
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
        "#f6b054",
        ["primary", "secondary"],
        "#dca06a",
        "#9192a8"
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
      "line-opacity": 0.85
    }
  },
  {
    id: "sweden-border",
    source: "sweden_boundary",
    type: "line",
    paint: {
      "line-color": "#87b5ff",
      "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.8, 10, 1.6, 15, 3],
      "line-opacity": 0.95
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
      "fill-extrusion-color": "#90a2bb",
      "fill-extrusion-height": roundedMovingHeightExpression,
      "fill-extrusion-base": roundedMovingMinHeightExpression,
      "fill-extrusion-opacity": 0.62,
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
        "#7e95b1",
        50,
        "#9ab6d6",
        180,
        "#c3dbef"
      ],
      "fill-extrusion-height": baseBuildingHeightExpression,
      "fill-extrusion-base": baseBuildingMinHeightExpression,
      "fill-extrusion-opacity": 0.9,
      "fill-extrusion-vertical-gradient": true
    }
  }
];
