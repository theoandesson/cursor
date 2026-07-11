export const TILE_CACHE_PREFIX = "sweden-map-tiles";
export const TILE_CACHE_RETENTION_VERSIONS = 2;

const OPEN_FREE_MAP_HOST = "tiles.openfreemap.org";
const TERRAIN_HOST = "s3.amazonaws.com";
const ESRI_HOST = "server.arcgisonline.com";

const isProxiedTileRequest = (url) =>
  url.pathname.startsWith("/api/tiles/proxy") && url.searchParams.has("url");

const isSelfHostedVectorTile = (url, origin) =>
  url.origin === origin && url.pathname.startsWith("/tiles/vector/");

export const getDailyCacheVersion = (date = new Date()) =>
  date.toISOString().slice(0, 10);

export const buildTileCacheName = (date = new Date()) =>
  `${TILE_CACHE_PREFIX}-${getDailyCacheVersion(date)}`;

export const extractVersionFromCacheName = (cacheName) =>
  cacheName.startsWith(`${TILE_CACHE_PREFIX}-`)
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
    return (
      isOpenFreeMapTile(url) ||
      isTerrainTile(url) ||
      isEsriImageryTile(url) ||
      isProxiedTileRequest(url) ||
      isSelfHostedVectorTile(url, url.origin)
    );
  } catch {
    return false;
  }
};
