const baseBuildingHeightExpression = [
  "coalesce",
  ["get", "render_height"],
  ["get", "height"],
  6
];

const baseBuildingMinHeightExpression = [
  "coalesce",
  ["get", "render_min_height"],
  ["get", "min_height"],
  0
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

export const createLayers = () => [
  {
    id: "bg",
    type: "background",
    paint: {
      "background-color": "#1b2435"
    }
  },
  {
    id: "raster-base",
    source: "sweden_raster",
    type: "raster",
    paint: {
      "raster-opacity": 0.95,
      "raster-saturation": -0.18,
      "raster-contrast": 0.2
    }
  },
  {
    id: "landcover",
    source: "sweden_vector",
    "source-layer": "landcover",
    type: "fill",
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
    id: "sweden-buildings-low",
    source: "sweden_vector",
    "source-layer": "building",
    type: "fill-extrusion",
    minzoom: 12,
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
    minzoom: 12,
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
