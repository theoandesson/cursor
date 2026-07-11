/**
 * Google Maps–style traffic congestion colors and road hierarchy palette.
 * Congestion levels map to live traffic overlay paint; hierarchy colors drive
 * the base road stack (casing / fill / divider).
 */

/** @typedef {"free"|"moderate"|"heavy"|"severe"} TrafficCongestionLevel */

/** @type {Readonly<Record<TrafficCongestionLevel, string>>} */
export const TRAFFIC_CONGESTION_COLORS = Object.freeze({
  free: "#00c853",
  moderate: "#ffeb3b",
  heavy: "#ff9100",
  severe: "#d50000"
});

const createTrafficRoadHierarchy = ({
  motorwayCasing,
  motorwayFill,
  motorwayDivider,
  primary,
  secondary,
  tertiary,
  local,
  bridge,
  tunnel,
  ramp,
  casingOpacity,
  fillOpacity,
  bridgeOpacity,
  tunnelOpacity
}) =>
  Object.freeze({
    motorwayCasing,
    motorwayFill,
    motorwayDivider,
    primary,
    secondary,
    tertiary,
    local,
    bridge,
    tunnel,
    ramp,
    casingOpacity,
    fillOpacity,
    bridgeOpacity,
    tunnelOpacity
  });

const createTrafficPalette = ({ congestion, roads, trafficFlowOpacity, unknownCongestion }) =>
  Object.freeze({
    congestion,
    roads,
    trafficFlowOpacity,
    unknownCongestion
  });

export const TRAFFIC_ROAD_HIERARCHY = createTrafficRoadHierarchy({
  motorwayCasing: "#ffffff",
  motorwayFill: "#f4a460",
  motorwayDivider: "#ffffff",
  primary: "#fcd670",
  secondary: "#f8e8b8",
  tertiary: "#f0f0e8",
  local: "#ffffff",
  bridge: "#e8eef4",
  tunnel: "#9aa8b8",
  ramp: "#e0c890",
  casingOpacity: 0.9,
  fillOpacity: 0.94,
  bridgeOpacity: 0.88,
  tunnelOpacity: 0.72
});

export const TRAFFIC_ROAD_HIERARCHY_NIGHT = createTrafficRoadHierarchy({
  motorwayCasing: "#1a2838",
  motorwayFill: "#c47830",
  motorwayDivider: "#d8e0ea",
  primary: "#b88840",
  secondary: "#8a7848",
  tertiary: "#4a5e6e",
  local: "#3a4e62",
  bridge: "#4a6070",
  tunnel: "#2a3848",
  ramp: "#9a7840",
  casingOpacity: 0.86,
  fillOpacity: 0.9,
  bridgeOpacity: 0.82,
  tunnelOpacity: 0.65
});

export const TRAFFIC_PALETTE = createTrafficPalette({
  congestion: TRAFFIC_CONGESTION_COLORS,
  roads: TRAFFIC_ROAD_HIERARCHY,
  trafficFlowOpacity: 0.92,
  unknownCongestion: "#78909c"
});

export const TRAFFIC_PALETTE_NIGHT = createTrafficPalette({
  congestion: TRAFFIC_CONGESTION_COLORS,
  roads: TRAFFIC_ROAD_HIERARCHY_NIGHT,
  trafficFlowOpacity: 0.88,
  unknownCongestion: "#546e7a"
});

export const TRAFFIC_PALETTES = Object.freeze({
  day: TRAFFIC_PALETTE,
  night: TRAFFIC_PALETTE_NIGHT
});
