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
  const linkEntries = LINK_SUBCLASSES.flatMap((linkClass) => {
    const parent = linkClass.replace(/_link$/, "");
    const stops = widthTable[parent];
    return stops ? [linkClass, buildZoomInterpolation(stops)] : [];
  });

  return [
    "match",
    ["get", property],
    ...entries.flatMap(([roadClass, stops]) => [roadClass, buildZoomInterpolation(stops)]),
    ...linkEntries,
    buildZoomInterpolation(widthTable.minor)
  ];
};

const applyLinkWidthScale = (widthExpression) => [
  "*",
  widthExpression,
  ["case", createIsLinkRoadExpression(), LINK_WIDTH_FACTOR, 1]
];

/** Data-driven fill width for all road classes. */
export const createRoadFillWidthExpression = () =>
  applyLinkWidthScale(buildClassWidthMatch(ROAD_FILL_WIDTH_STOPS));

/** Casing width = fill + padding, slightly wider for bridges. */
export const createRoadCasingWidthExpression = ({ bridge = false } = {}) => {
  const fillWidth = buildClassWidthMatch(ROAD_FILL_WIDTH_STOPS);
  const padding = buildZoomInterpolation(CASING_PADDING_STOPS);
  const base = ["+", fillWidth, padding];
  const scaled = bridge ? ["*", base, 1.06] : base;
  return applyLinkWidthScale(scaled);
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
