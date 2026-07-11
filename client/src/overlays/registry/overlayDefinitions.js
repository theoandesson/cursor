import { OVERLAY_SOURCE_IDS, STYLE_LAYER_IDS } from "../constants/styleLayerIds.js";

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
    sourceId: OVERLAY_SOURCE_IDS.SMHI_RADAR,
    beforeLayerId: STYLE_LAYER_IDS.BUILDINGS,
    opacityProperty: "raster-opacity",
    defaultVisible: false,
    defaultOpacity: 0.78,
    minOpacity: 0.2,
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
  }
];
