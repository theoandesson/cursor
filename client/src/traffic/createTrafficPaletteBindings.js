import {
  STYLE_LAYER_IDS,
  TRAFFIC_FLOW_LAYER_IDS,
  TRANSIT_LAYER_IDS
} from "../overlays/constants/styleLayerIds.js";
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
    layerId: TRAFFIC_FLOW_LAYER_IDS[2],
    property: "line-color",
    resolve: (palette) => palette.trafficFlowCasing
  },
  {
    layerId: TRAFFIC_FLOW_LAYER_IDS[1],
    property: "line-color",
    resolve: (palette) => createTrafficFlowColorExpression(palette),
    useTrafficPalette: true
  },
  {
    layerId: TRANSIT_LAYER_IDS[1],
    property: "line-color",
    resolve: () => createTransitRouteColorExpression()
  },
  {
    layerId: TRANSIT_LAYER_IDS[0],
    property: "line-color",
    resolve: (palette) => palette.trafficFlowCasing
  },
  {
    layerId: TRANSIT_LAYER_IDS[4],
    property: "text-color",
    resolve: (palette) => palette.roadLabel
  },
  {
    layerId: TRANSIT_LAYER_IDS[4],
    property: "text-halo-color",
    resolve: (palette) => palette.roadLabelHalo
  },
  {
    layerId: TRANSIT_LAYER_IDS[3],
    property: "circle-color",
    resolve: (palette) => palette.transitStop
  },
  {
    layerId: TRANSIT_LAYER_IDS[3],
    property: "circle-stroke-color",
    resolve: (palette) => palette.transitStopStroke
  }
];

export const TRAFFIC_LABEL_LAYER_IDS = Object.freeze([
  STYLE_LAYER_IDS.ROAD_LABELS,
  STYLE_LAYER_IDS.HYBRID_ROAD_LABELS,
  STYLE_LAYER_IDS.TRANSIT_STOP_LABELS
]);

export { SWEDISH_TRANSIT_LAYER_IDS };
