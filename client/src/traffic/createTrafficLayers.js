import { createRoadLayers } from "./createRoadLayers.js";
import { SWEDEN_MAP_PALETTE } from "../map/style/palette/swedenPalette.js";
import {
  TRAFFIC_FLOW_LAYER_CONFIG,
  TRAFFIC_LAYER_IDS
} from "./config/trafficLayerConfig.js";
import {
  createTrafficFlowColorExpression,
  createTrafficFlowWidthExpression
} from "./expressions/roadExpressions.js";
import { TRAFFIC_PALETTE } from "./trafficPalette.js";

/**
 * Live traffic overlay — expects `traffic_flow` GeoJSON source with
 * a `congestion` property (free | moderate | heavy | severe).
 */
export const createTrafficFlowLayer = ({ palette = TRAFFIC_PALETTE, visible = false } = {}) => ({
  id: TRAFFIC_FLOW_LAYER_CONFIG.id,
  source: TRAFFIC_FLOW_LAYER_CONFIG.source,
  type: "line",
  minzoom: TRAFFIC_FLOW_LAYER_CONFIG.minzoom,
  layout: {
    ...TRAFFIC_FLOW_LAYER_CONFIG.layout,
    visibility: visible ? "visible" : "none"
  },
  paint: {
    "line-color": createTrafficFlowColorExpression(palette),
    "line-width": createTrafficFlowWidthExpression(),
    "line-opacity": palette.trafficFlowOpacity,
    "line-blur": 0.25
  }
});

/**
 * Google Maps–quality road stack (tunnel → ground → bridge, casing → fill → divider).
 * Uses swedenPalette traffic tokens for day/night parity.
 */
export const createTrafficRoadLayers = ({ palette = SWEDEN_MAP_PALETTE } = {}) =>
  createRoadLayers({ palette, variant: "vector", includeLabels: true });

export const createTrafficLayers = ({
  palette = SWEDEN_MAP_PALETTE,
  trafficPalette = TRAFFIC_PALETTE
} = {}) => [
  ...createTrafficRoadLayers({ palette }),
  createTrafficFlowLayer({ palette: trafficPalette })
];

export const TRAFFIC_ROAD_LAYER_IDS = Object.freeze([
  ...createRoadLayers({ palette: SWEDEN_MAP_PALETTE, includeLabels: true }).map((layer) => layer.id),
  TRAFFIC_LAYER_IDS.trafficFlow
]);
