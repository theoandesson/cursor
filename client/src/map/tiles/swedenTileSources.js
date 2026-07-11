/**
 * Centralized tile source configuration for Sweden-focused map rendering.
 *
 * Bounds clamp all raster/vector tile requests to Sweden's geographic extent so
 * clients do not waste bandwidth on tiles outside the area of interest.
 */

/** [west, south, east, north] — Sweden including Gotland and border buffer. */
export const SWEDEN_TILE_BOUNDS = Object.freeze([9.5, 54.8, 24.8, 69.7]);

const SWEDEN_TILE_LIMITS = Object.freeze({
  vector: { minzoom: 0, maxzoom: 14 },
  dem: { minzoom: 0, maxzoom: 12 },
  satellite: { minzoom: 0, maxzoom: 18 }
});

/**
 * Primary vector tiles via OpenFreeMap (planet extract, Sweden-clamped).
 *
 * Self-hosted fallback (Phase 2+): serve a Sweden MBTiles/PMTiles extract from
 * your own origin and point `vectorTileJsonUrl` at `/tiles/vector/tilejson.json`.
 * Keep the same source-layer names (building, landuse, water, …) for style parity.
 */
export const VECTOR_TILE_SOURCE = Object.freeze({
  id: "sweden_vector",
  type: "vector",
  tileJsonUrl: "https://tiles.openfreemap.org/planet",
  /** Resolved TileJSON `tiles` entry — used by the viewport prefetcher. */
  tileUrlTemplate: "https://tiles.openfreemap.org/planet/{z}/{x}/{y}.pbf",
  selfHostedTileJsonUrl: "/tiles/vector/tilejson.json",
  selfHostedTileUrlTemplate: "/tiles/vector/{z}/{x}/{y}.pbf",
  bounds: SWEDEN_TILE_BOUNDS,
  ...SWEDEN_TILE_LIMITS.vector
});

export const GLYPHS_URL =
  "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";

const SELF_HOSTED_GLYPHS_URL = "/tiles/fonts/{fontstack}/{range}.pbf";

const SELF_HOSTED_DEM_TILE_URL_TEMPLATE = "/tiles/dem/{z}/{x}/{y}.png";

const TILE_MODES = Object.freeze({
  external: "external",
  selfHosted: "self-hosted"
});

const resolveTileMode = () => {
  const mode =
    typeof window !== "undefined" &&
    typeof window.__SWEDEN_MAP_TILE_MODE__ === "string"
      ? window.__SWEDEN_MAP_TILE_MODE__.trim().toLowerCase()
      : null;
  return mode === TILE_MODES.selfHosted ? TILE_MODES.selfHosted : TILE_MODES.external;
};

export const isSelfHostedTileMode = (tileMode = resolveTileMode()) =>
  tileMode === TILE_MODES.selfHosted;

export const getActiveGlyphsUrl = (tileMode = resolveTileMode()) =>
  isSelfHostedTileMode(tileMode) ? SELF_HOSTED_GLYPHS_URL : GLYPHS_URL;

export const getActiveVectorTileTemplate = ({
  tileMode = resolveTileMode(),
  useSelfHostedVector = isSelfHostedTileMode(tileMode)
} = {}) =>
  useSelfHostedVector
    ? VECTOR_TILE_SOURCE.selfHostedTileUrlTemplate
    : VECTOR_TILE_SOURCE.tileUrlTemplate;

const getActiveDemTileTemplates = ({
  tileMode = resolveTileMode(),
  useSelfHostedVector
} = {}) => {
  const useSelfHostedDem =
    typeof useSelfHostedVector === "boolean"
      ? useSelfHostedVector
      : isSelfHostedTileMode(tileMode);
  return useSelfHostedDem
    ? [SELF_HOSTED_DEM_TILE_URL_TEMPLATE]
    : [...DEM_TILE_SOURCE.tiles];
};

/**
 * Primary DEM: Mapzen Terrarium tiles (global, terrarium encoding).
 *
 * Documented Sweden alternative — Lantmäteriet Markhöjdmodell via STAC Höjd API.
 * STAC returns GeoTIFF assets (not XYZ); wire through a tile server or WCS gateway
 * before swapping into MapLibre. Requires Geotorget credentials.
 *
 * @see https://api.lantmateriet.se/stac-hojd/v1/
 * @see https://download.lantmateriet.se/hojdmodell/wcs/v1 (WCS GetCoverage)
 */
export const DEM_TILE_SOURCE = Object.freeze({
  id: "sweden-dem",
  type: "raster-dem",
  encoding: "terrarium",
  tileSize: 256,
  tiles: [
    "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
  ],
  lantmaterietStac: Object.freeze({
    apiRoot: "https://api.lantmateriet.se/stac-hojd/v1",
    collectionsPath: "/collections",
    searchPath: "/search",
    downloadBase: "https://dl1.lantmateriet.se/hojd/data",
    wcsCapabilities: "https://download.lantmateriet.se/hojdmodell/wcs/v1?service=WCS&request=GetCapabilities",
    note:
      "STAC assets are GeoTIFF grids — reproject to WebMercator XYZ or proxy via /api/tiles/proxy."
  }),
  bounds: SWEDEN_TILE_BOUNDS,
  ...SWEDEN_TILE_LIMITS.dem
});

/** Basemap modes that can be toggled in later UI work. */
export const SWEDEN_MAP_MODES = Object.freeze({
  vector: "vector",
  satellite: "satellite",
  hybrid: "hybrid"
});

/**
 * Satellite / orthophoto raster sources for map mode switching.
 *
 * Lantmäteriet Ortofoto Nedladdning is available via STAC Bild — same auth model as DEM.
 * @see https://api.lantmateriet.se/stac-bild/v1/
 */
const SATELLITE_TILE_SOURCES = Object.freeze({
  esriWorldImagery: Object.freeze({
    id: "sweden-satellite-esri",
    type: "raster",
    tiles: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    ],
    tileSize: 256,
    attribution: "Esri, Maxar, Earthstar Geographics",
    bounds: SWEDEN_TILE_BOUNDS,
    ...SWEDEN_TILE_LIMITS.satellite
  }),
  lantmaterietOrtofoto: Object.freeze({
    id: "sweden-satellite-lmv",
    type: "raster",
    stacApiRoot: "https://api.lantmateriet.se/stac-bild/v1",
    downloadBase: "https://dl1.lantmateriet.se/bild/data/orto",
    note: "Requires Geotorget token — serve via self-hosted tile pyramid or /api/tiles/proxy.",
    bounds: SWEDEN_TILE_BOUNDS,
    ...SWEDEN_TILE_LIMITS.satellite
  })
});

/** Default satellite layer used when `SWEDEN_MAP_MODES.satellite` is active. */
export const DEFAULT_SATELLITE_SOURCE = SATELLITE_TILE_SOURCES.esriWorldImagery;

/** Tile URL templates the viewport prefetcher may warm-cache. */
export const PREFETCHABLE_TILE_TEMPLATES = Object.freeze([
  getActiveVectorTileTemplate(),
  ...getActiveDemTileTemplates()
]);

/** Prefetch templates scoped to the active basemap mode. */
export const getPrefetchableTileTemplatesForMode = (
  mode,
  { tileMode = resolveTileMode(), useSelfHostedVector } = {}
) => {
  const resolvedUseSelfHostedVector =
    typeof useSelfHostedVector === "boolean"
      ? useSelfHostedVector
      : isSelfHostedTileMode(tileMode);
  const templates = [
    getActiveVectorTileTemplate({
      tileMode,
      useSelfHostedVector: resolvedUseSelfHostedVector
    }),
    ...getActiveDemTileTemplates({
      tileMode,
      useSelfHostedVector: resolvedUseSelfHostedVector
    })
  ];
  if (mode === "satellite" || mode === "hybrid") {
    templates.push(...DEFAULT_SATELLITE_SOURCE.tiles);
  }
  return templates;
};

const lngLatToTile = (lng, lat, zoom) => {
  const scale = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * scale);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale
  );
  return { x, y, z: zoom };
};

const tileToLngLatBounds = (x, y, z) => {
  const n = 2 ** z;
  const west = (x / n) * 360 - 180;
  const east = ((x + 1) / n) * 360 - 180;
  const northRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  const southRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n)));
  return {
    west,
    south: (southRad * 180) / Math.PI,
    east,
    north: (northRad * 180) / Math.PI
  };
};

/** True when a tile index intersects Sweden bounds. */
const isTileWithinSwedenBounds = (x, y, z) => {
  const tileBounds = tileToLngLatBounds(x, y, z);
  const [west, south, east, north] = SWEDEN_TILE_BOUNDS;
  return !(
    tileBounds.east < west ||
    tileBounds.west > east ||
    tileBounds.north < south ||
    tileBounds.south > north
  );
};

/** Enumerate XYZ tile indices covering a lng/lat bounds box at a zoom level. */
export const enumerateTilesForBounds = (bounds, zoom) => {
  const [west, south, east, north] = bounds;
  const topLeft = lngLatToTile(west, north, zoom);
  const bottomRight = lngLatToTile(east, south, zoom);
  const minX = Math.min(topLeft.x, bottomRight.x);
  const maxX = Math.max(topLeft.x, bottomRight.x);
  const minY = Math.min(topLeft.y, bottomRight.y);
  const maxY = Math.max(topLeft.y, bottomRight.y);
  const tiles = [];

  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      if (isTileWithinSwedenBounds(x, y, zoom)) {
        tiles.push({ x, y, z: zoom });
      }
    }
  }

  return tiles;
};

export const resolveTileUrl = (template, { x, y, z }) =>
  template.replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y));

/**
 * MapLibre `sources` entries derived from this module.
 * Pass `mode` to include satellite raster for hybrid/satellite basemaps.
 */
export const createSwedenTileSources = ({
  mode = SWEDEN_MAP_MODES.vector,
  tileMode = resolveTileMode(),
  useSelfHostedVector
} = {}) => {
  const resolvedUseSelfHostedVector =
    typeof useSelfHostedVector === "boolean"
      ? useSelfHostedVector
      : isSelfHostedTileMode(tileMode);
  const vectorTiles = [
    getActiveVectorTileTemplate({
      tileMode,
      useSelfHostedVector: resolvedUseSelfHostedVector
    })
  ];
  const demTiles = getActiveDemTileTemplates({
    tileMode,
    useSelfHostedVector: resolvedUseSelfHostedVector
  });

  const sources = {
    [VECTOR_TILE_SOURCE.id]: {
      type: VECTOR_TILE_SOURCE.type,
      tiles: vectorTiles,
      bounds: VECTOR_TILE_SOURCE.bounds,
      minzoom: VECTOR_TILE_SOURCE.minzoom,
      maxzoom: VECTOR_TILE_SOURCE.maxzoom
    },
    [DEM_TILE_SOURCE.id]: {
      type: DEM_TILE_SOURCE.type,
      tiles: demTiles,
      encoding: DEM_TILE_SOURCE.encoding,
      tileSize: DEM_TILE_SOURCE.tileSize,
      bounds: DEM_TILE_SOURCE.bounds,
      minzoom: DEM_TILE_SOURCE.minzoom,
      maxzoom: DEM_TILE_SOURCE.maxzoom
    }
  };

  if (mode === SWEDEN_MAP_MODES.satellite || mode === SWEDEN_MAP_MODES.hybrid) {
    const satellite = DEFAULT_SATELLITE_SOURCE;
    sources[satellite.id] = {
      type: satellite.type,
      tiles: satellite.tiles,
      tileSize: satellite.tileSize,
      bounds: satellite.bounds,
      minzoom: satellite.minzoom,
      maxzoom: satellite.maxzoom
    };
  }

  return sources;
};
