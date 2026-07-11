const VALID_TILE_MODES = new Set(["self-hosted", "external"]);

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

export const isValidBootstrapData = (data) => {
  if (!data || typeof data !== "object") {
    return false;
  }

  const hasCities =
    Array.isArray(data.cities) || Array.isArray(data.cities?.cities);
  const hasWeather =
    Array.isArray(data.weather?.cities) || Array.isArray(data.cityWeather?.cities);
  const hasValidTileMode = VALID_TILE_MODES.has(data.tileMode);
  const hasValidVectorTileJsonUrl = isNonEmptyString(data.vectorTileJsonUrl);
  const hasValidDemTileJsonUrl = isNonEmptyString(data.demTileJsonUrl);
  const hasValidTilesReady = typeof data.tilesReady === "boolean";

  return (
    (hasCities || hasWeather) &&
    hasValidTileMode &&
    hasValidVectorTileJsonUrl &&
    hasValidDemTileJsonUrl &&
    hasValidTilesReady
  );
};
