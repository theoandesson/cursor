const LEVELS_PER_FLOOR_METERS = 3.1;
const MIN_FALLBACK_HEIGHT_METERS = 4.5;
const MIN_LEVEL_HEIGHT_METERS = 4;

const buildingLevelsValue = [
  "coalesce",
  [
    "case",
    ["has", "building:levels"],
    ["to-number", ["get", "building:levels"], 0],
    ["has", "levels"],
    ["to-number", ["get", "levels"], 0],
    0
  ],
  0
];

export const buildingHeightValue = [
  "to-number",
  ["coalesce", ["get", "render_height"], ["get", "height"], 0],
  0
];

export const baseBuildingHeightExpression = [
  "max",
  MIN_FALLBACK_HEIGHT_METERS,
  buildingHeightValue
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
  ["max", MIN_LEVEL_HEIGHT_METERS, ["*", buildingLevelsValue, LEVELS_PER_FLOOR_METERS]],
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

const isBuildingType = (types) => ["match", buildingTypeKey, types, true, false];

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

const createResidentialHeightColorExpression = (palette) => [
  "interpolate",
  ["linear"],
  buildingHeightFromLevelsExpression,
  4,
  palette.buildingsLow,
  14,
  palette.buildingsHighLow,
  28,
  palette.buildingsHighMid,
  55,
  palette.buildingsHighTall
];

export const createBuildingVisualColorExpression = (palette) => [
  "case",
  isBuildingType(["industrial", "warehouse", "factory", "manufacture", "storage", "garage"]),
  palette.buildingsIndustrial,
  isBuildingType(["commercial", "retail", "office", "shop", "mall", "hotel", "supermarket"]),
  palette.buildingsCommercial,
  isBuildingType([
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
  ]),
  palette.buildingsPublic,
  createResidentialHeightColorExpression(palette)
];
