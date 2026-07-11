export {
  TRAFFIC_CONGESTION_COLORS,
  TRAFFIC_PALETTE,
  TRAFFIC_PALETTE_NIGHT,
  TRAFFIC_PALETTES,
  TRAFFIC_ROAD_HIERARCHY,
  TRAFFIC_ROAD_HIERARCHY_NIGHT
} from "./trafficPalette.js";

export {
  ROAD_CLASS_FILTERS,
  ROAD_WIDTH_STOPS,
  ROAD_ZOOM_THRESHOLDS,
  TRAFFIC_CONGESTION_LEVELS,
  TRAFFIC_FLOW_LAYER_CONFIG,
  TRAFFIC_FLOW_SOURCE,
  TRAFFIC_LAYER_IDS,
  TRAFFIC_VECTOR_SOURCE
} from "./config/trafficLayerConfig.js";

export {
  brunnelKey,
  createBridgeColorExpression,
  createBridgeLineOpacityExpression,
  createMotorwayDividerDashExpression,
  createRampAdjustedWidthExpression,
  createRampDashExpression,
  createRoadHierarchyColorExpression,
  createRoadWidthExpression,
  createTrafficFlowColorExpression,
  createTrafficFlowWidthExpression,
  createTunnelColorExpression,
  createTunnelDashExpression,
  createTunnelLineOpacityExpression,
  isBridgeExpression,
  isOnewayExpression,
  isRampExpression,
  isTunnelExpression,
  onewayValue,
  rampValue,
  roadClassKey,
  ROAD_FILTERS
} from "./expressions/roadExpressions.js";

export {
  createTrafficFlowLayer,
  createTrafficLayers,
  createTrafficRoadLayers,
  TRAFFIC_ROAD_LAYER_IDS
} from "./createTrafficLayers.js";

export { createTrafficController, createTrafficFlowSource } from "./createTrafficController.js";
export { createTrafficPaletteBindings } from "./createTrafficPaletteBindings.js";
export { createTrafficControl, ROAD_LABEL_LAYER_IDS, TRANSIT_LAYER_IDS } from "./createTrafficControl.js";
export { fetchTraffic, fetchTransit } from "./trafficService.js";
