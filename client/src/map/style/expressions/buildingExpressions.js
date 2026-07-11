const LEVELS_PER_FLOOR_METERS = 3.2;

const buildingLevelsValue = [
  "coalesce",
  ["to-number", ["get", "building:levels"], 0],
  ["to-number", ["get", "levels"], 0],
  0
];

export const baseBuildingHeightExpression = [
  "max",
  9,
  [
    "to-number",
    ["coalesce", ["get", "render_height"], ["get", "height"], 0],
    9
  ]
];

export const baseBuildingMinHeightExpression = [
  "max",
  0,
  [
    "to-number",
    ["coalesce", ["get", "render_min_height"], ["get", "min_height"], 0],
    0
  ]
];

export const buildingHeightFromLevelsExpression = [
  "case",
  [">", buildingLevelsValue, 0],
  ["max", 6, ["*", buildingLevelsValue, LEVELS_PER_FLOOR_METERS]],
  baseBuildingHeightExpression
];

export const createVisualBuildingHeightExpression = (heightScale) => [
  "*",
  heightScale,
  buildingHeightFromLevelsExpression
];

const buildingTypeKey = [
  "downcase",
  [
    "coalesce",
    ["get", "class"],
    ["get", "type"],
    ["get", "building"],
    "residential"
  ]
];

export const createBuildingTypeColorExpression = (palette) => [
  "match",
  buildingTypeKey,
  [
    "residential",
    "apartments",
    "apartment",
    "house",
    "detached",
    "terrace",
    "dormitory",
    "bungalow"
  ],
  palette.buildingsResidential,
  ["commercial", "retail", "office", "shop", "mall", "hotel", "supermarket"],
  palette.buildingsCommercial,
  ["industrial", "warehouse", "factory", "manufacture", "storage", "garage"],
  palette.buildingsIndustrial,
  [
    "public",
    "school",
    "university",
    "college",
    "hospital",
    "civic",
    "government",
    "church",
    "cathedral",
    "mosque",
    "synagogue",
    "chapel",
    "museum",
    "library",
    "theatre",
    "stadium"
  ],
  palette.buildingsPublic,
  palette.buildingsResidential
];
