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
      "background-color": "#0d1423"
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
        "#213628",
        ["grass", "park"],
        "#2a3f2d",
        "#1a2335"
      ],
      "fill-opacity": 0.7
    }
  },
  {
    id: "water",
    source: "sweden_vector",
    "source-layer": "water",
    type: "fill",
    paint: {
      "fill-color": "#17416c"
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
