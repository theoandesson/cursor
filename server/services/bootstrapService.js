import {
  getCityWeather,
  getCityWeatherCacheAge,
  isCacheWarm,
  listCities
} from "./cityWeatherService.js";
import { tileConfig } from "../config/tileConfig.js";
import { getTilesReadyStatus } from "./selfHostedTileService.js";

const TILE_MODE_SELF_HOSTED = "self-hosted";
const TILE_MODE_EXTERNAL = "external";

const SELF_HOSTED_VECTOR_TILE_JSON_URL = "/tiles/vector/tilejson.json";
const SELF_HOSTED_DEM_TILE_JSON_URL = "/tiles/dem/tilejson.json";
const EXTERNAL_VECTOR_TILE_JSON_URL = "https://tiles.openfreemap.org/planet";
const EXTERNAL_DEM_TILE_JSON_URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium.json";

export const createBootstrapPayload = async ({ forecastHours = 24, forceRefresh = false } = {}) => {
  const cities = listCities();
  const cacheAlreadyWarm = isCacheWarm(forecastHours);
  const shouldForceRefresh = forceRefresh && !cacheAlreadyWarm;

  // Bootstrap should re-use warm cache data and only force full network refresh
  // when there is no usable baseline yet.
  const weather = await getCityWeather({
    forecastHours,
    forceRefresh: shouldForceRefresh,
    refreshStaleOnly: forceRefresh && cacheAlreadyWarm
  });
  const tilesReady = await getTilesReadyStatus({ tilesDataDirectory: tileConfig.tilesDataDirectory });
  const useSelfHostedTiles = tileConfig.useSelfHostedTiles === true && tilesReady;
  const tileMode = useSelfHostedTiles ? TILE_MODE_SELF_HOSTED : TILE_MODE_EXTERNAL;
  const vectorTileJsonUrl = useSelfHostedTiles
    ? SELF_HOSTED_VECTOR_TILE_JSON_URL
    : EXTERNAL_VECTOR_TILE_JSON_URL;
  const demTileJsonUrl = useSelfHostedTiles
    ? SELF_HOSTED_DEM_TILE_JSON_URL
    : EXTERNAL_DEM_TILE_JSON_URL;

  return {
    payload: {
      cities,
      weather,
      tileMode,
      vectorTileJsonUrl,
      demTileJsonUrl,
      tilesReady,
      serverTime: new Date().toISOString(),
      cacheAge: getCityWeatherCacheAge(forecastHours),
      version: "1"
    },
    cacheHit: Boolean(weather.cacheHit) && !shouldForceRefresh
  };
};
