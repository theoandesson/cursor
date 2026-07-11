import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..", "..");

const parseBoolean = (value, fallback) => {
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

export const tileConfig = Object.freeze({
  tilesDataDirectory: path.resolve(
    workspaceRoot,
    process.env.TILES_DATA_DIRECTORY ?? "data/tiles"
  ),
  useSelfHostedTiles: parseBoolean(process.env.SELF_HOSTED_TILES, false),
  fallbackToUpstream: parseBoolean(process.env.TILE_FALLBACK_UPSTREAM, true),
  SWEDEN_TILE_BOUNDS: Object.freeze([9.5, 54.8, 24.8, 69.7]),
  vectorTileLimits: Object.freeze({ minzoom: 0, maxzoom: 14 }),
  demTileLimits: Object.freeze({ minzoom: 0, maxzoom: 12 }),
  glyphsUpstreamUrl: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf"
});
