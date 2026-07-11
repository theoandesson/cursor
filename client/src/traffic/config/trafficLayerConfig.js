/**
 * Layer IDs, zoom thresholds, and per-class filters for the modular road stack.
 * Filters target OpenMapTiles / OpenFreeMap `transportation` source-layer fields.
 */

export const TRAFFIC_VECTOR_SOURCE = Object.freeze({
  id: "sweden_vector",
  sourceLayer: "transportation"
});

/** @typedef {"free"|"moderate"|"heavy"|"severe"} TrafficCongestionLevel */

export const TRAFFIC_LAYER_IDS = Object.freeze({
  motorwayCasing: "roads-motorway-casing",
  motorwayFill: "roads-motorway-fill",
  motorwayDivider: "roads-motorway-divider",
  primary: "roads-primary",
  secondary: "roads-secondary",
  tertiary: "roads-tertiary",
  local: "roads-local",
  bridge: "roads-bridge",
  tunnel: "roads-tunnel",
  trafficFlow: "traffic-flow",
  labels: "road-labels"
});

export const TRAFFIC_FLOW_SOURCE = Object.freeze({
  id: "traffic_flow",
  /** Set when backed by a vector tile layer; omit for GeoJSON. */
  sourceLayer: null
});

/** Minimum zoom at which each road class becomes visible. */
export const ROAD_ZOOM_THRESHOLDS = Object.freeze({
  motorway: 4,
  primary: 6,
  secondary: 8,
  tertiary: 10,
  local: 11,
  bridge: 10,
  tunnel: 9,
  motorwayDivider: 10,
  trafficFlow: 8
});

const surfaceRoadFilter = (extra = ["all"]) => [
  "all",
  ...extra,
  ["!=", ["get", "brunnel"], "tunnel"]
];

export const ROAD_CLASS_FILTERS = Object.freeze({
  motorway: surfaceRoadFilter([
    ["match", ["get", "class"], ["motorway", "trunk", "motorway_link", "trunk_link"], true, false]
  ]),
  primary: surfaceRoadFilter([
    ["match", ["get", "class"], ["primary", "primary_link"], true, false]
  ]),
  secondary: surfaceRoadFilter([
    ["match", ["get", "class"], ["secondary", "secondary_link"], true, false]
  ]),
  tertiary: surfaceRoadFilter([
    ["match", ["get", "class"], ["tertiary", "tertiary_link"], true, false]
  ]),
  local: surfaceRoadFilter([
    [
      "match",
      ["get", "class"],
      ["minor", "service", "track", "path", "pedestrian", "living_street", "unclassified"],
      true,
      false
    ]
  ]),
  bridge: ["==", ["get", "brunnel"], "bridge"],
  tunnel: ["==", ["get", "brunnel"], "tunnel"],
  motorwayDivider: [
    "all",
    ["match", ["get", "class"], ["motorway", "trunk"], true, false],
    ["!=", ["get", "ramp"], 1],
    ["!=", ["get", "brunnel"], "tunnel"]
  ],
  ramp: ["==", ["get", "ramp"], 1],
  oneway: ["==", ["to-number", ["get", "oneway"], 0], 1]
});

export const TRAFFIC_CONGESTION_LEVELS = Object.freeze([
  "free",
  "moderate",
  "heavy",
  "severe"
]);

export const TRAFFIC_FLOW_LAYER_CONFIG = Object.freeze({
  id: TRAFFIC_LAYER_IDS.trafficFlow,
  source: TRAFFIC_FLOW_SOURCE.id,
  sourceLayer: TRAFFIC_FLOW_SOURCE.sourceLayer,
  minzoom: ROAD_ZOOM_THRESHOLDS.trafficFlow,
  layout: {
    "line-cap": "round",
    "line-join": "round"
  }
});

/** Width interpolation stops keyed by road class (zoom → width). */
export const ROAD_WIDTH_STOPS = Object.freeze({
  motorway: Object.freeze({
    casing: Object.freeze([
      [5, 1.4],
      [10, 4.2],
      [14, 8.2]
    ]),
    fill: Object.freeze([
      [5, 0.6],
      [10, 2.4],
      [14, 5.4]
    ]),
    divider: Object.freeze([
      [10, 0.35],
      [14, 0.65],
      [16, 0.85]
    ])
  }),
  primary: Object.freeze({
    fill: Object.freeze([
      [6, 0.5],
      [10, 1.8],
      [14, 3.8]
    ])
  }),
  secondary: Object.freeze({
    fill: Object.freeze([
      [8, 0.4],
      [10, 1.4],
      [14, 3.0]
    ])
  }),
  tertiary: Object.freeze({
    fill: Object.freeze([
      [10, 0.35],
      [12, 1.1],
      [14, 2.4]
    ])
  }),
  local: Object.freeze({
    fill: Object.freeze([
      [11, 0.3],
      [13, 0.9],
      [15, 1.8]
    ])
  }),
  bridge: Object.freeze({
    fill: Object.freeze([
      [10, 0.5],
      [14, 2.2]
    ])
  }),
  tunnel: Object.freeze({
    fill: Object.freeze([
      [9, 0.45],
      [14, 2.0]
    ])
  }),
  trafficFlow: Object.freeze({
    fill: Object.freeze([
      [8, 1.6],
      [12, 3.2],
      [14, 5.0]
    ])
  })
});
