import fs from "node:fs/promises";
import path from "node:path";
import { tileConfig } from "../config/tileConfig.js";

const DEFAULT_BOUNDS = Object.freeze([9.5, 54.8, 24.8, 69.7]);
const DEFAULT_VECTOR_LIMITS = Object.freeze({ minzoom: 0, maxzoom: 14 });
const DEFAULT_DEM_LIMITS = Object.freeze({ minzoom: 0, maxzoom: 12 });

const DEFAULT_VECTOR_TILE_TEMPLATE = "/tiles/vector/{z}/{x}/{y}.pbf";
const DEFAULT_DEM_TILE_TEMPLATE = "/tiles/dem/{z}/{x}/{y}.png";
const DEFAULT_VECTOR_UPSTREAM_TEMPLATE = "https://tiles.openfreemap.org/planet/{z}/{x}/{y}.pbf";
const DEFAULT_DEM_UPSTREAM_TEMPLATE =
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";

const VECTOR_CONTENT_TYPE = "application/x-protobuf";
const DEM_CONTENT_TYPE = "image/png";
const FETCH_TIMEOUT_MS = 12_000;

const parseBoolean = (value, fallback = false) => {
  if (value == null) {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (normalized === "true" || normalized === "1") {
    return true;
  }
  if (normalized === "false" || normalized === "0") {
    return false;
  }
  return fallback;
};

const asInteger = (value) => {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    return Number.parseInt(value, 10);
  }

  return null;
};

const clampTileIndex = (value, zoom) => {
  const maxIndex = 2 ** zoom - 1;
  return Math.max(0, Math.min(maxIndex, value));
};

const lonToTileX = (lon, zoom) =>
  clampTileIndex(Math.floor(((lon + 180) / 360) * 2 ** zoom), zoom);

const latToTileY = (lat, zoom) => {
  const clampedLat = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const latRad = (clampedLat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * 2 ** zoom
  );
  return clampTileIndex(y, zoom);
};

const getTileRangeForBounds = (bounds, zoom) => {
  const [west, south, east, north] = bounds;
  const xWest = lonToTileX(west, zoom);
  const xEast = lonToTileX(east, zoom);
  const yNorth = latToTileY(north, zoom);
  const ySouth = latToTileY(south, zoom);

  return {
    minX: Math.min(xWest, xEast),
    maxX: Math.max(xWest, xEast),
    minY: Math.min(yNorth, ySouth),
    maxY: Math.max(yNorth, ySouth)
  };
};

const formatTileUrl = (template, z, x, y) =>
  template.replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y));

const buildTilePath = ({ rootDirectory, type, z, x, y }) => {
  const extension = type === "vector" ? "pbf" : "png";
  const typeDirectory = path.resolve(rootDirectory, type);
  const filePath = path.resolve(typeDirectory, String(z), String(x), `${y}.${extension}`);

  if (!filePath.startsWith(`${typeDirectory}${path.sep}`)) {
    return null;
  }

  return filePath;
};

const contentTypeForType = (type) => (type === "vector" ? VECTOR_CONTENT_TYPE : DEM_CONTENT_TYPE);

const inferUpstreamContentType = (type, upstreamContentType) => {
  if (upstreamContentType && upstreamContentType !== "application/octet-stream") {
    return upstreamContentType;
  }
  return contentTypeForType(type);
};

const fetchWithTimeout = async (fetchImpl, url, options = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Timeout vid hämtning av tile: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

export const createSelfHostedTileService = (config = {}) => {
  const rootDirectory = path.resolve(
    config.tilesDataDirectory ?? tileConfig.tilesDataDirectory ?? path.resolve("data", "tiles")
  );
  const bounds = config.bounds ?? tileConfig.SWEDEN_TILE_BOUNDS ?? DEFAULT_BOUNDS;
  const vectorLimits = config.vectorTileLimits ?? tileConfig.vectorTileLimits ?? DEFAULT_VECTOR_LIMITS;
  const demLimits = config.demTileLimits ?? tileConfig.demTileLimits ?? DEFAULT_DEM_LIMITS;
  const vectorTileTemplate = config.vectorTileTemplate ?? DEFAULT_VECTOR_TILE_TEMPLATE;
  const demTileTemplate = config.demTileTemplate ?? DEFAULT_DEM_TILE_TEMPLATE;
  const vectorUpstreamTemplate = config.vectorUpstreamTemplate ?? DEFAULT_VECTOR_UPSTREAM_TEMPLATE;
  const demUpstreamTemplate = config.demUpstreamTemplate ?? DEFAULT_DEM_UPSTREAM_TEMPLATE;
  const fallbackToUpstream =
    config.fallbackToUpstream ??
    parseBoolean(process.env.TILE_FALLBACK_UPSTREAM, tileConfig.fallbackToUpstream ?? false);
  const fetchImpl = config.fetchImpl ?? fetch;

  const getTileSpec = (type) =>
    type === "vector"
      ? {
          limits: vectorLimits,
          contentType: VECTOR_CONTENT_TYPE,
          tileTemplate: vectorTileTemplate,
          upstreamTemplate: vectorUpstreamTemplate
        }
      : {
          limits: demLimits,
          contentType: DEM_CONTENT_TYPE,
          tileTemplate: demTileTemplate,
          upstreamTemplate: demUpstreamTemplate
        };

  const validateCoordinates = (type, rawZ, rawX, rawY) => {
    const z = asInteger(rawZ);
    const x = asInteger(rawX);
    const y = asInteger(rawY);
    if (z == null || x == null || y == null) {
      return null;
    }

    const { limits } = getTileSpec(type);
    if (z < limits.minzoom || z > limits.maxzoom) {
      return null;
    }

    const maxIndex = 2 ** z - 1;
    if (x < 0 || x > maxIndex || y < 0 || y > maxIndex) {
      return null;
    }

    const range = getTileRangeForBounds(bounds, z);
    if (x < range.minX || x > range.maxX || y < range.minY || y > range.maxY) {
      return null;
    }

    return { z, x, y };
  };

  const getTileFromDisk = async (type, z, x, y) => {
    const coordinates = validateCoordinates(type, z, x, y);
    if (!coordinates) {
      return { ok: false, status: 404 };
    }

    const filePath = buildTilePath({
      rootDirectory,
      type,
      z: coordinates.z,
      x: coordinates.x,
      y: coordinates.y
    });
    if (!filePath) {
      return { ok: false, status: 404 };
    }

    try {
      const buffer = await fs.readFile(filePath);
      return {
        ok: true,
        buffer,
        contentType: contentTypeForType(type),
        cache: "LOCAL"
      };
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error.code === "ENOENT" || error.code === "ENOTDIR")
      ) {
        return { ok: false, status: 404 };
      }
      throw error;
    }
  };

  const fetchWithFallback = async (type, z, x, y) => {
    if (type !== "vector" && type !== "dem") {
      return { ok: false, status: 404 };
    }

    const coordinates = validateCoordinates(type, z, x, y);
    if (!coordinates) {
      return { ok: false, status: 404 };
    }

    const localTile = await getTileFromDisk(type, coordinates.z, coordinates.x, coordinates.y);
    if (localTile.ok || !fallbackToUpstream) {
      return localTile;
    }

    try {
      const { upstreamTemplate, contentType } = getTileSpec(type);
      const upstreamUrl = formatTileUrl(
        upstreamTemplate,
        coordinates.z,
        coordinates.x,
        coordinates.y
      );
      const response = await fetchWithTimeout(fetchImpl, upstreamUrl, {
        headers: {
          Accept: "*/*",
          "User-Agent": "sweden-3d-map-fidelity/1.0 self-hosted-tiles"
        }
      });

      if (!response.ok) {
        return {
          ok: false,
          status: response.status === 404 ? 404 : 502
        };
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      return {
        ok: true,
        buffer,
        contentType: inferUpstreamContentType(type, response.headers.get("content-type")) || contentType,
        cache: "UPSTREAM"
      };
    } catch {
      return { ok: false, status: 502 };
    }
  };

  const getVectorTileJson = () => ({
    tilejson: "2.2.0",
    name: "sweden-self-hosted-vector",
    scheme: "xyz",
    format: "pbf",
    tiles: [vectorTileTemplate],
    bounds,
    minzoom: vectorLimits.minzoom,
    maxzoom: vectorLimits.maxzoom
  });

  const getDemTileJson = () => ({
    tilejson: "2.2.0",
    name: "sweden-self-hosted-dem",
    type: "raster-dem",
    encoding: "terrarium",
    scheme: "xyz",
    format: "png",
    tiles: [demTileTemplate],
    bounds,
    minzoom: demLimits.minzoom,
    maxzoom: demLimits.maxzoom
  });

  return {
    getVectorTileJson,
    getDemTileJson,
    getVectorTile: (z, x, y) => getTileFromDisk("vector", z, x, y),
    getDemTile: (z, x, y) => getTileFromDisk("dem", z, x, y),
    fetchWithFallback
  };
};
