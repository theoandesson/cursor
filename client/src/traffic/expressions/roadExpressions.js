import {
  ROAD_CLASS_FILTERS,
  ROAD_WIDTH_STOPS
} from "../config/trafficLayerConfig.js";

/** Normalized `class` property from the transportation source-layer. */
export const roadClassKey = ["get", "class"];

/** Ramp segments (motorway exits, slip roads). */
export const rampValue = ["to-number", ["get", "ramp"], 0];

export const isRampExpression = ["==", rampValue, 1];

/** One-way segments (OpenMapTiles: -1, 0, 1). */
export const onewayValue = ["to-number", ["get", "oneway"], 0];

export const isOnewayExpression = ["!=", onewayValue, 0];

/** Bridge / tunnel via `brunnel` (OpenMapTiles convention). */
export const brunnelKey = ["get", "brunnel"];

export const isBridgeExpression = ["==", brunnelKey, "bridge"];

export const isTunnelExpression = ["==", brunnelKey, "tunnel"];

const widthStopsToExpression = (stops) => [
  "interpolate",
  ["linear"],
  ["zoom"],
  ...stops.flat()
];

export const createRoadWidthExpression = (roadClass, variant = "fill") => {
  const stops = ROAD_WIDTH_STOPS[roadClass]?.[variant] ?? ROAD_WIDTH_STOPS[roadClass]?.fill;
  if (!stops) {
    return widthStopsToExpression(ROAD_WIDTH_STOPS.local.fill);
  }
  return widthStopsToExpression(stops);
};

/** Ramp segments render slightly narrower than their parent class. */
export const createRampAdjustedWidthExpression = (roadClass, variant = "fill") => [
  "*",
  createRoadWidthExpression(roadClass, variant),
  ["case", isRampExpression, 0.72, 1]
];

export const createRoadHierarchyColorExpression = (palette) => [
  "match",
  roadClassKey,
  ["motorway", "trunk", "motorway_link", "trunk_link"],
  ["case", isRampExpression, palette.roads.ramp, palette.roads.motorwayFill],
  ["primary", "primary_link"],
  palette.roads.primary,
  ["secondary", "secondary_link"],
  palette.roads.secondary,
  ["tertiary", "tertiary_link"],
  palette.roads.tertiary,
  palette.roads.local
];

export const createBridgeColorExpression = (palette) => palette.roads.bridge;

export const createTunnelColorExpression = (palette) => palette.roads.tunnel;

/** Dashed center line for dual carriageway motorways (excludes ramps and tunnels). */
export const createMotorwayDividerDashExpression = () => [
  "case",
  isOnewayExpression,
  ["literal", [1.2, 1.8]],
  ["literal", [2.4, 2.8]]
];

/** Tunnels use a short dash to read as underground passages. */
export const createTunnelDashExpression = () => ["literal", [1.5, 1.2]];

/** Ramp segments use a tighter dash when overlaid on bridge/tunnel styling. */
export const createRampDashExpression = () => ["literal", [1.0, 0.8]];

export const createBridgeLineOpacityExpression = (palette) => [
  "case",
  isRampExpression,
  palette.roads.bridgeOpacity * 0.85,
  palette.roads.bridgeOpacity
];

export const createTunnelLineOpacityExpression = (palette) => palette.roads.tunnelOpacity;

/**
 * Google Maps–style congestion coloring for the traffic-flow overlay.
 * Expects a `congestion` feature property: free | moderate | heavy | severe.
 */
export const createTrafficFlowColorExpression = (palette) => [
  "match",
  ["downcase", ["coalesce", ["get", "congestion"], ["get", "level"], ""]],
  "free",
  palette.congestion.free,
  "moderate",
  palette.congestion.moderate,
  "heavy",
  palette.congestion.heavy,
  "severe",
  palette.congestion.severe,
  palette.unknownCongestion
];

export const createTrafficFlowWidthExpression = () =>
  createRoadWidthExpression("trafficFlow", "fill");

/** Re-export filters for consumers that build custom layers. */
export const ROAD_FILTERS = ROAD_CLASS_FILTERS;
