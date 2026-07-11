import { LINK_SUBCLASSES } from "./roadClasses.js";

const ROAD_CLASS_COLOR_KEYS = Object.freeze({
  motorway: "roadsMotorway",
  trunk: "roadsTrunk",
  primary: "roadsPrimary",
  secondary: "roadsSecondary",
  tertiary: "roadsTertiary",
  minor: "roadsMinor",
  service: "roadsService"
});

const buildRoadClassColorMatch = (palette, { fallbackKey = "roadsMinor" } = {}) => {
  const entries = Object.entries(ROAD_CLASS_COLOR_KEYS);
  const linkEntries = LINK_SUBCLASSES.map((linkClass) => {
    const parent = linkClass.replace(/_link$/, "");
    const paletteKey = ROAD_CLASS_COLOR_KEYS[parent];
    return paletteKey ? [linkClass, palette[paletteKey]] : null;
  }).filter(Boolean);

  return [
    "match",
    ["get", "class"],
    ...entries.flatMap(([roadClass, paletteKey]) => [roadClass, palette[paletteKey]]),
    ...linkEntries.flat(),
    palette[fallbackKey]
  ];
};

/** Fill color by road class. */
export const createRoadFillColorExpression = (palette) =>
  buildRoadClassColorMatch(palette);

/** Standard ground casing color. */
export const createRoadCasingColorExpression = (palette) => palette.roadsCasing;

/** Lighter casing for bridge segments (elevated appearance). */
export const createBridgeCasingColorExpression = (palette) => palette.roadsCasingBridge;

/** Slightly muted fill inside tunnels. */
export const createTunnelFillColorExpression = (palette) => buildRoadClassColorMatch(palette);

export const createTunnelCasingColorExpression = (palette) => palette.roadsCasingTunnel;

export const createRoadDividerColorExpression = (palette) => palette.roadsDivider;

export const createOnewayArrowColorExpression = (palette) => palette.roadsOnewayArrow;

/** Dashed pattern for tunnel segments. */
export const TUNNEL_DASHARRAY = Object.freeze([1.8, 1.4]);

export const ROUND_LINE_LAYOUT = Object.freeze({
  "line-cap": "round",
  "line-join": "round"
});
