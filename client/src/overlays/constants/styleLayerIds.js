export const STYLE_LAYER_IDS = Object.freeze({
  BUILDINGS: "sweden-buildings",
  CITY_WEATHER_CIRCLES: "city-weather-circles",
  CITY_WEATHER_LABELS: "city-weather-labels",
  SMHI_RADAR: "overlay-smhi-radar",
  PRESSURE_HIGH_FILL: "overlay-pressure-high-fill",
  PRESSURE_LOW_FILL: "overlay-pressure-low-fill",
  PRESSURE_STORM_FILL: "overlay-pressure-storm-fill",
  PRESSURE_LABELS: "overlay-pressure-labels",
  TRAFFIC_FLOW_CASING: "traffic-flow-segment-casing",
  TRAFFIC_FLOW_LINES: "traffic-flow-segment-lines",
  TRAFFIC_FLOW_ANIMATED: "traffic-flow-segment-animated",
  ROAD_LABELS: "road-labels",
  HYBRID_ROAD_LABELS: "hybrid-road-labels",
  TRANSIT_LINE_CASING: "swedish-transit-lines-casing",
  TRANSIT_LINES: "swedish-transit-lines",
  TRANSIT_STOP_HALO: "swedish-transit-stops-halo",
  TRANSIT_STOPS: "swedish-transit-stops",
  TRANSIT_STOP_LABELS: "swedish-transit-stops-labels"
});

export const OVERLAY_SOURCE_IDS = Object.freeze({
  SMHI_RADAR: "overlay-smhi-radar-source",
  PRESSURE_SYSTEMS: "overlay-pressure-systems-source",
  TRAFFIC_FLOW: "traffic-flow-segments-source",
  TRANSIT_LINES: "swedish-transit-lines-source",
  TRANSIT_STOPS: "swedish-transit-stops-source"
});

export const ROAD_NAME_LABEL_LAYER_IDS = Object.freeze([
  STYLE_LAYER_IDS.ROAD_LABELS,
  STYLE_LAYER_IDS.HYBRID_ROAD_LABELS
]);

export const TRANSIT_LAYER_IDS = Object.freeze([
  STYLE_LAYER_IDS.TRANSIT_LINE_CASING,
  STYLE_LAYER_IDS.TRANSIT_LINES,
  STYLE_LAYER_IDS.TRANSIT_STOP_HALO,
  STYLE_LAYER_IDS.TRANSIT_STOPS,
  STYLE_LAYER_IDS.TRANSIT_STOP_LABELS
]);

export const PRESSURE_LAYER_IDS = Object.freeze([
  STYLE_LAYER_IDS.PRESSURE_HIGH_FILL,
  STYLE_LAYER_IDS.PRESSURE_LOW_FILL,
  STYLE_LAYER_IDS.PRESSURE_STORM_FILL,
  STYLE_LAYER_IDS.PRESSURE_LABELS
]);

export const TRAFFIC_FLOW_LAYER_IDS = Object.freeze([
  STYLE_LAYER_IDS.TRAFFIC_FLOW_ANIMATED,
  STYLE_LAYER_IDS.TRAFFIC_FLOW_LINES,
  STYLE_LAYER_IDS.TRAFFIC_FLOW_CASING
]);
