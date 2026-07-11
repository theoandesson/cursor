/** OpenMapTiles transportation class hierarchy (low → high render priority). */
export const ROAD_CLASSES = Object.freeze([
  "service",
  "minor",
  "tertiary",
  "secondary",
  "primary",
  "trunk",
  "motorway"
]);

/** Subclass values that denote link / ramp roads. */
export const LINK_SUBCLASSES = Object.freeze([
  "motorway_link",
  "trunk_link",
  "primary_link",
  "secondary_link",
  "tertiary_link"
]);

/** Road classes that receive a painted center divider. */
export const DIVIDED_ROAD_CLASSES = Object.freeze(["motorway", "trunk"]);

/** Classes shown in hybrid satellite overlay (excludes minor/service). */
export const HYBRID_ROAD_CLASSES = Object.freeze([
  "motorway",
  "trunk",
  "primary",
  "secondary",
  "tertiary"
]);

const ROAD_CLASS_RANK = Object.freeze(
  Object.fromEntries(ROAD_CLASSES.map((roadClass, index) => [roadClass, index + 1]))
);

const ROAD_CLASS_LITERAL = ["literal", [...ROAD_CLASSES]];

/** MapLibre line-sort-key: higher rank draws above lower at intersections. */
export const createRoadClassSortKeyExpression = () => [
  "match",
  ["get", "class"],
  ...ROAD_CLASSES.flatMap((roadClass) => [roadClass, ROAD_CLASS_RANK[roadClass]]),
  0
];

/** True when feature is a link / ramp (thinner width). */
export const createIsLinkRoadExpression = () => [
  "any",
  ["==", ["get", "ramp"], 1],
  ["in", ["get", "subclass"], ["literal", [...LINK_SUBCLASSES]]]
];

/** Filter: only rendered road classes (excludes path, track, etc.). */
export const createDrivableRoadFilter = (allowedClasses = ROAD_CLASSES) => {
  const classList = [
    ...allowedClasses,
    ...LINK_SUBCLASSES.filter((linkClass) => {
      const parent = linkClass.replace(/_link$/, "");
      return allowedClasses.includes(parent);
    })
  ];
  return ["match", ["get", "class"], classList, true, false];
};

export const createRoadClassFilter = (roadClass) => ["==", ["get", "class"], roadClass];

export const createDividedRoadFilter = () => [
  "match",
  ["get", "class"],
  DIVIDED_ROAD_CLASSES,
  true,
  false
];

export const createTunnelFilter = () => ["==", ["get", "brunnel"], "tunnel"];

export const createBridgeFilter = () => ["==", ["get", "brunnel"], "bridge"];

export const createGroundRoadFilter = () => [
  "!",
  ["in", ["get", "brunnel"], ["literal", ["bridge", "tunnel"]]]
];

export const createOnewayArrowFilter = () => [
  "all",
  createDrivableRoadFilter(),
  ["==", ["get", "oneway"], 1],
  ["!", createIsLinkRoadExpression()]
];

export const ROAD_CLASS_SET = ROAD_CLASS_LITERAL;
