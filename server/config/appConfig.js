import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  tileConfig,
  SWEDEN_TILE_BOUNDS,
  VECTOR_TILE_LIMITS,
  DEM_TILE_LIMITS
} from "./tileConfig.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..", "..");
const distClientDirectory = path.join(workspaceRoot, "dist", "client");
const sourceClientDirectory = path.join(workspaceRoot, "client");
const staticDirectory = fs.existsSync(distClientDirectory)
  ? distClientDirectory
  : sourceClientDirectory;

const parsePort = (value, fallback) => {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 65535) {
    return fallback;
  }
  return parsed;
};

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

const { tilesDataDirectory, useSelfHostedTiles, fallbackToUpstream } = tileConfig;

export {
  tileConfig,
  SWEDEN_TILE_BOUNDS,
  VECTOR_TILE_LIMITS,
  DEM_TILE_LIMITS,
  tilesDataDirectory,
  useSelfHostedTiles,
  fallbackToUpstream
};

export const appConfig = Object.freeze({
  host: process.env.HOST ?? "127.0.0.1",
  port: parsePort(process.env.PORT, 4173),
  staticDirectory,
  autoOpenBrowser: parseBoolean(process.env.AUTO_OPEN_BROWSER, false),
  SWEDEN_TILE_BOUNDS,
  vectorTileLimits: VECTOR_TILE_LIMITS,
  demTileLimits: DEM_TILE_LIMITS,
  tilesDataDirectory,
  useSelfHostedTiles,
  fallbackToUpstream
});
