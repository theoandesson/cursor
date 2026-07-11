export const TILE_CACHE_PREFIX = "sweden-map-tiles-v2";
export const TILE_CACHE_RETENTION_VERSIONS = 2;
export const SELF_HOSTED_TILE_PATH_PREFIXES = Object.freeze([
  "/tiles/vector/",
  "/tiles/dem/"
]);

const OPEN_FREE_MAP_HOST = "tiles.openfreemap.org";
const TERRAIN_HOST = "s3.amazonaws.com";
const ESRI_HOST = "server.arcgisonline.com";

const isProxiedTileRequest = (url) =>
  url.pathname.startsWith("/api/tiles/proxy") && url.searchParams.has("url");

const isSelfHostedTile = (url, origin) =>
  url.origin === origin &&
  SELF_HOSTED_TILE_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));

export const getDailyCacheVersion = (date = new Date()) =>
  date.toISOString().slice(0, 10);

export const buildTileCacheName = (date = new Date()) =>
  `${TILE_CACHE_PREFIX}-${getDailyCacheVersion(date)}`;

export const extractVersionFromCacheName = (cacheName) =>
  cacheName.startsWith(`${TILE_CACHE_PREFIX}-`) &&
  /^\d{4}-\d{2}-\d{2}$/.test(cacheName.slice(`${TILE_CACHE_PREFIX}-`.length))
    ? cacheName.slice(`${TILE_CACHE_PREFIX}-`.length)
    : null;

const isOpenFreeMapTile = (url) =>
  url.hostname === OPEN_FREE_MAP_HOST &&
  (url.pathname.startsWith("/planet/") || url.pathname.startsWith("/fonts/"));

const isTerrainTile = (url) =>
  url.hostname === TERRAIN_HOST &&
  url.pathname.startsWith("/elevation-tiles-prod/terrarium/");

const isEsriImageryTile = (url) =>
  url.hostname === ESRI_HOST &&
  url.pathname.startsWith("/ArcGIS/rest/services/World_Imagery/MapServer/tile/");

export const isTileCacheableRequest = (request) => {
  if (!request || request.method !== "GET") {
    return false;
  }

  try {
    const url = new URL(request.url);
    if (isSelfHostedTile(url, url.origin)) {
      return true;
    }

    return (
      isOpenFreeMapTile(url) ||
      isTerrainTile(url) ||
      isEsriImageryTile(url) ||
      isProxiedTileRequest(url)
    );
  } catch {
    return false;
  }
};
