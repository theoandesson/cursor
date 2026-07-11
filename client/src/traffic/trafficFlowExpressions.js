/**
 * MapLibre paint expressions for the live traffic-flow overlay.
 */
export const createTrafficFlowColorExpression = (palette) => [
  "match",
  [
    "downcase",
    ["coalesce", ["get", "congestion"], ["get", "trafficLevel"], ["get", "level"], ""]
  ],
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
