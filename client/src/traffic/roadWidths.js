import { createIsLinkRoadExpression, LINK_SUBCLASSES } from "./roadClasses.js";

/**
 * Fill widths per road class at zoom stops [5, 8, 10, 12, 14, 16].
 * Tuned for Google Maps–style thin overview → thick street-level detail.
 */
const ROAD_FILL_WIDTH_STOPS = Object.freeze({
  motorway: [0.4, 0.9, 1.6, 2.8, 4.8, 7.5],
  trunk: [0.35, 0.8, 1.4, 2.4, 4.2, 6.5],
  primary: [0.3, 0.65, 1.15, 2.0, 3.5, 5.5],
  secondary: [0.25, 0.55, 0.95, 1.7, 2.9, 4.5],
  tertiary: [0.2, 0.45, 0.8, 1.4, 2.4, 3.8],
  minor: [0.15, 0.35, 0.6, 1.1, 1.9, 3.2],
  service: [0.1, 0.25, 0.45, 0.8, 1.4, 2.5]
});

/** Extra casing padding added on top of fill width at each zoom stop. */
const CASING_PADDING_STOPS = [0.35, 0.55, 0.75, 1.0, 1.35, 1.75];

const ZOOM_STOPS = [5, 8, 10, 12, 14, 16];

const LINK_WIDTH_FACTOR = 0.65;

const buildZoomInterpolation = (widthStops) => [
  "interpolate",
  ["linear"],
  ["zoom"],
  ...ZOOM_STOPS.flatMap((zoom, index) => [zoom, widthStops[index]])
];

const buildClassWidthMatch = (widthTable, property = "class") => {
  const entries = Object.entries(widthTable);
  
  // Build a flat interpolation with match expressions at each zoom level
  const zoomLevels = ZOOM_STOPS.flatMap((zoom, index) => {
    const widthAtZoom = [
      "match",
      ["get", property],
      ...entries.flatMap(([roadClass, stops]) => [roadClass, stops[index]]),
      ...LINK_SUBCLASSES.flatMap((linkClass) => {
        const parent = linkClass.replace(/_link$/, "");
        const stops = widthTable[parent];
        return stops ? [linkClass, stops[index] * LINK_WIDTH_FACTOR] : [];
      }),
      widthTable.minor[index] // default
    ];
    return [zoom, widthAtZoom];
  });

  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    ...zoomLevels
  ];
};

/** Data-driven fill width for all road classes. */
export const createRoadFillWidthExpression = () =>
  buildClassWidthMatch(ROAD_FILL_WIDTH_STOPS);

/** Casing width = fill + padding, slightly wider for bridges. */
export const createRoadCasingWidthExpression = ({ bridge = false } = {}) => {
  const entries = Object.entries(ROAD_FILL_WIDTH_STOPS);
  const scale = bridge ? 1.06 : 1;
  
  const zoomLevels = ZOOM_STOPS.flatMap((zoom, index) => {
    const widthAtZoom = [
      "match",
      ["get", "class"],
      ...entries.flatMap(([roadClass, stops]) => [
        roadClass,
        (stops[index] + CASING_PADDING_STOPS[index]) * scale
      ]),
      ...LINK_SUBCLASSES.flatMap((linkClass) => {
        const parent = linkClass.replace(/_link$/, "");
        const stops = ROAD_FILL_WIDTH_STOPS[parent];
        return stops ? [
          linkClass,
          (stops[index] * LINK_WIDTH_FACTOR + CASING_PADDING_STOPS[index]) * scale
        ] : [];
      }),
      (ROAD_FILL_WIDTH_STOPS.minor[index] + CASING_PADDING_STOPS[index]) * scale
    ];
    return [zoom, widthAtZoom];
  });

  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    ...zoomLevels
  ];
};

/** Center divider width for motorways and trunk roads. */
export const createRoadDividerWidthExpression = () => [
  "interpolate",
  ["linear"],
  ["zoom"],
  11,
  0,
  12,
  0.25,
  14,
  0.55,
  16,
  0.85
];
