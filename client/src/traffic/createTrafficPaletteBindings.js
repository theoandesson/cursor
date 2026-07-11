import { TRAFFIC_LAYER_IDS } from "./config/trafficLayerConfig.js";
import { SWEDISH_TRANSIT_LAYER_IDS } from "./createTransitLayer.js";
import {
  createBridgeCasingColorExpression,
  createOnewayArrowColorExpression,
  createRoadCasingColorExpression,
  createRoadDividerColorExpression,
  createRoadFillColorExpression,
  createTunnelCasingColorExpression,
  createTunnelFillColorExpression
} from "./roadExpressions.js";
import { createTrafficFlowColorExpression } from "./expressions/roadExpressions.js";

const TRAFFIC_FLOW_SEGMENT_LAYER_IDS = Object.freeze([
  "traffic-flow-segment-casing",
  "traffic-flow-segment-lines",
  "traffic-flow-segment-animated"
]);

const RUNTIME_TRAFFIC_LAYER_IDS = Object.freeze({
  flowCasing: TRAFFIC_FLOW_SEGMENT_LAYER_IDS[0],
  transitRoutes: SWEDISH_TRANSIT_LAYER_IDS[1],
  transitStops: SWEDISH_TRANSIT_LAYER_IDS[3]
});

const ROAD_LINE_COLOR_BINDINGS = [
  ["roads-tunnel-casing", createTunnelCasingColorExpression],
  ["roads-tunnel-fill", createTunnelFillColorExpression],
  ["roads-casing", createRoadCasingColorExpression],
  ["roads-fill", createRoadFillColorExpression],
  ["roads-bridge-casing", createBridgeCasingColorExpression],
  ["roads-bridge-fill", createRoadFillColorExpression],
  ["roads-divider", createRoadDividerColorExpression],
  ["roads-bridge-divider", createRoadDividerColorExpression]
];

const HYBRID_ROAD_LINE_COLOR_BINDINGS = ROAD_LINE_COLOR_BINDINGS.map(([layerId, resolve]) => [
  `hybrid-${layerId}`,
  resolve
]);

const createLineColorBinding = (layerId, resolve, options = {}) => ({
  layerId,
  property: "line-color",
  resolve,
  ...options
});

const createTextColorBinding = (layerId, property, resolve, options = {}) => ({
  layerId,
  property,
  resolve,
  ...options
});

const createTransitRouteColorExpression = () => ["coalesce", ["get", "color"], "#1e88e5"];

/**
 * Paint bindings consumed by createDayNightController.applyMapPalette.
 */
export const createTrafficPaletteBindings = () => [
  ...ROAD_LINE_COLOR_BINDINGS.map(([layerId, resolve]) => createLineColorBinding(layerId, resolve)),
  ...HYBRID_ROAD_LINE_COLOR_BINDINGS.map(([layerId, resolve]) =>
    createLineColorBinding(layerId, resolve)
  ),
  createTextColorBinding("roads-oneway", "text-color", createOnewayArrowColorExpression),
  createTextColorBinding("roads-oneway", "text-halo-color", createRoadCasingColorExpression),
  createTextColorBinding("hybrid-roads-oneway", "text-color", createOnewayArrowColorExpression),
  createTextColorBinding("hybrid-roads-oneway", "text-halo-color", createRoadCasingColorExpression),
  {
    layerId: TRAFFIC_LAYER_IDS.trafficFlow,
    property: "line-color",
    resolve: (palette) => createTrafficFlowColorExpression(palette),
    useTrafficPalette: true
  },
  {
    layerId: TRAFFIC_LAYER_IDS.trafficFlow,
    property: "line-opacity",
    resolve: (palette) => palette.trafficFlowOpacity,
    useTrafficPalette: true
  },
  {
    layerId: RUNTIME_TRAFFIC_LAYER_IDS.flowCasing,
    property: "line-color",
    resolve: (palette) => palette.trafficFlowCasing
  },
  {
    layerId: RUNTIME_TRAFFIC_LAYER_IDS.transitRoutes,
    property: "line-color",
    resolve: () => createTransitRouteColorExpression()
  },
  {
    layerId: RUNTIME_TRAFFIC_LAYER_IDS.transitStops,
    property: "circle-color",
    resolve: (palette) => palette.transitStop
  },
  {
    layerId: RUNTIME_TRAFFIC_LAYER_IDS.transitStops,
    property: "circle-stroke-color",
    resolve: (palette) => palette.transitStopStroke
  },
  {
    layerId: TRAFFIC_FLOW_SEGMENT_LAYER_IDS[0],
    property: "line-color",
    resolve: (palette) => palette.trafficFlowCasing
  },
  {
    layerId: TRAFFIC_FLOW_SEGMENT_LAYER_IDS[1],
    property: "line-color",
    resolve: (palette) => createTrafficFlowColorExpression(palette),
    useTrafficPalette: true
  },
  {
    layerId: SWEDISH_TRANSIT_LAYER_IDS[0],
    property: "line-color",
    resolve: (palette) => palette.trafficFlowCasing
  },
  {
    layerId: SWEDISH_TRANSIT_LAYER_IDS[4],
    property: "text-color",
    resolve: (palette) => palette.roadLabel
  },
  {
    layerId: SWEDISH_TRANSIT_LAYER_IDS[4],
    property: "text-halo-color",
    resolve: (palette) => palette.roadLabelHalo
  }
];

export const TRAFFIC_LABEL_LAYER_IDS = Object.freeze([
  "road-labels",
  "hybrid-road-labels",
  "swedish-transit-stops-labels"
]);
