import {
  PRESSURE_LAYER_IDS,
  ROAD_NAME_LABEL_LAYER_IDS,
  STYLE_LAYER_IDS,
  TRAFFIC_FLOW_LAYER_IDS,
  TRANSIT_LAYER_IDS
} from "../constants/styleLayerIds.js";

export const OVERLAY_CONTROL_TYPES = Object.freeze({
  TOGGLE: "toggle",
  RADAR: "radar"
});

export const createOverlayDefinitions = () => [
  {
    id: "smhi-radar",
    label: "Nederbörd",
    section: "Radar",
    description: "SMHI regnradar med animation (senaste timmen).",
    controlType: OVERLAY_CONTROL_TYPES.RADAR,
    layerIds: [STYLE_LAYER_IDS.SMHI_RADAR],
    sourceId: "overlay-smhi-radar-source",
    beforeLayerId: STYLE_LAYER_IDS.BUILDINGS,
    opacityProperty: "raster-opacity",
    defaultVisible: false,
    defaultOpacity: 0.78,
    minOpacity: 0.2,
    maxOpacity: 1
  },
  {
    id: "pressure-systems",
    label: "Tryck & åska",
    section: "Väder",
    description:
      "Animerad karta över hög- och lågtrycksområden samt åskrisk (CAPE) som rör sig över Sverige.",
    controlType: OVERLAY_CONTROL_TYPES.RADAR,
    layerIds: PRESSURE_LAYER_IDS,
    opacityBindings: [
      { layerId: STYLE_LAYER_IDS.PRESSURE_HIGH_FILL, property: "fill-opacity", baseOpacity: 0.34 },
      { layerId: STYLE_LAYER_IDS.PRESSURE_LOW_FILL, property: "fill-opacity", baseOpacity: 0.34 },
      { layerId: STYLE_LAYER_IDS.PRESSURE_STORM_FILL, property: "fill-opacity", baseOpacity: 0.42 },
      { layerId: STYLE_LAYER_IDS.PRESSURE_LABELS, property: "text-opacity", baseOpacity: 1 }
    ],
    defaultVisible: false,
    defaultOpacity: 1,
    minOpacity: 0.15,
    maxOpacity: 1
  },
  {
    id: "city-weather",
    label: "Städer",
    section: "Väder",
    description: "Liveväder för svenska städer.",
    controlType: OVERLAY_CONTROL_TYPES.TOGGLE,
    layerIds: [STYLE_LAYER_IDS.CITY_WEATHER_CIRCLES, STYLE_LAYER_IDS.CITY_WEATHER_LABELS],
    opacityBindings: [
      { layerId: STYLE_LAYER_IDS.CITY_WEATHER_CIRCLES, property: "circle-opacity" },
      { layerId: STYLE_LAYER_IDS.CITY_WEATHER_LABELS, property: "text-opacity" }
    ],
    defaultVisible: true,
    defaultOpacity: 1,
    minOpacity: 0.15,
    maxOpacity: 1
  },
  {
    id: "traffic-flow",
    label: "Trafikflöde",
    section: "Trafik",
    description: "Live trafikflöde med färgkodade vägsegment.",
    controlType: OVERLAY_CONTROL_TYPES.TOGGLE,
    layerIds: TRAFFIC_FLOW_LAYER_IDS,
    opacityBindings: [
      { layerId: STYLE_LAYER_IDS.TRAFFIC_FLOW_CASING, property: "line-opacity", baseOpacity: 0.55 },
      { layerId: STYLE_LAYER_IDS.TRAFFIC_FLOW_LINES, property: "line-opacity", baseOpacity: 0.94 },
      { layerId: STYLE_LAYER_IDS.TRAFFIC_FLOW_ANIMATED, property: "line-opacity", baseOpacity: 0.72 }
    ],
    defaultVisible: false,
    defaultOpacity: 1,
    minOpacity: 0.2,
    maxOpacity: 1
  },
  {
    id: "transit",
    label: "Kollektivtrafik",
    section: "Trafik",
    description: "Linjer och hållplatser i Stockholm, Göteborg och Malmö.",
    controlType: OVERLAY_CONTROL_TYPES.TOGGLE,
    layerIds: TRANSIT_LAYER_IDS,
    opacityBindings: [
      { layerId: STYLE_LAYER_IDS.TRANSIT_LINE_CASING, property: "line-opacity", baseOpacity: 0.35 },
      { layerId: STYLE_LAYER_IDS.TRANSIT_LINES, property: "line-opacity", baseOpacity: 0.88 },
      { layerId: STYLE_LAYER_IDS.TRANSIT_STOP_HALO, property: "circle-opacity", baseOpacity: 0.55 },
      { layerId: STYLE_LAYER_IDS.TRANSIT_STOPS, property: "circle-opacity", baseOpacity: 0.95 },
      { layerId: STYLE_LAYER_IDS.TRANSIT_STOP_LABELS, property: "text-opacity", baseOpacity: 1 }
    ],
    defaultVisible: false,
    defaultOpacity: 1,
    minOpacity: 0.15,
    maxOpacity: 1
  },
  {
    id: "road-labels",
    label: "Vägnamn",
    section: "Trafik",
    description: "Vägnamn längs större vägar (döljs automatiskt vid snabb panorering).",
    controlType: OVERLAY_CONTROL_TYPES.TOGGLE,
    layerIds: ROAD_NAME_LABEL_LAYER_IDS,
    opacityBindings: [
      { layerId: STYLE_LAYER_IDS.ROAD_LABELS, property: "text-opacity" },
      { layerId: STYLE_LAYER_IDS.HYBRID_ROAD_LABELS, property: "text-opacity" }
    ],
    defaultVisible: true,
    defaultOpacity: 1,
    minOpacity: 0.2,
    maxOpacity: 1
  }
];
