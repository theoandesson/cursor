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

export const createVisualBuildingHeightExpression = (heightScale) => [
  "*",
  heightScale,
  baseBuildingHeightExpression
];
