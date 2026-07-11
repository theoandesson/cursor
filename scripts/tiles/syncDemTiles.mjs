import { constants as fsConstants } from "node:fs";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SWEDEN_BOUNDS, TILE_SYNC_ZOOMS, enumerateTilesForZoom } from "./tileBounds.js";

const DEM_TILE_TEMPLATE = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
const MAX_CONCURRENCY = 8;
const RETRY_ATTEMPTS = 3;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "../..");
const demOutputRoot = path.join(workspaceRoot, "data/tiles/dem");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseCliArgs = (argv) => {
  const parsed = {};

  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [rawKey, rawValue] = arg.slice(2).split("=");
    parsed[rawKey] = rawValue ?? "true";
  }

  return parsed;
};

const parseInteger = (value, fallback) => {
  if (value == null) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toTileUrl = ({ x, y, z }) =>
  DEM_TILE_TEMPLATE.replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y));

const fileExists = async (filePath) => {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
};

const fetchTileBuffer = async (url) => {
  let lastError = null;

  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
      if (attempt < RETRY_ATTEMPTS) {
        await sleep(200 * attempt);
      }
    }
  }

  throw lastError ?? new Error(`Unknown fetch error for ${url}`);
};

const runWithConcurrency = async (items, concurrency, worker) => {
  let currentIndex = 0;

  const workers = Array.from({ length: concurrency }, async () => {
    while (true) {
      const itemIndex = currentIndex;
      currentIndex += 1;
      if (itemIndex >= items.length) {
        return;
      }
      await worker(items[itemIndex], itemIndex);
    }
  });

  await Promise.all(workers);
};

export const syncDemTiles = async (options = {}) => {
  const cliArgs = parseCliArgs(process.argv.slice(2));
  const minZoom = parseInteger(options.minZoom ?? cliArgs["min-zoom"], TILE_SYNC_ZOOMS.dem.min);
  const maxZoom = parseInteger(options.maxZoom ?? cliArgs["max-zoom"], TILE_SYNC_ZOOMS.dem.max);
  const concurrency = Math.min(
    MAX_CONCURRENCY,
    Math.max(
      1,
      parseInteger(options.concurrency ?? cliArgs.concurrency, MAX_CONCURRENCY)
    )
  );

  if (maxZoom < minZoom) {
    throw new Error(`Invalid zoom range: min (${minZoom}) is greater than max (${maxZoom}).`);
  }

  const tiles = [];
  for (let z = minZoom; z <= maxZoom; z += 1) {
    const zoomTiles = enumerateTilesForZoom(SWEDEN_BOUNDS, z);
    tiles.push(...zoomTiles);
    console.log(`DEM z${z}: ${zoomTiles.length} tiles`);
  }

  console.log(
    `Syncing DEM tiles for Sweden bounds ${SWEDEN_BOUNDS.join(", ")} at zoom ${minZoom}-${maxZoom} (total ${tiles.length}, concurrency ${concurrency})`
  );

  await mkdir(demOutputRoot, { recursive: true });

  const stats = {
    downloaded: 0,
    skipped: 0,
    failed: 0
  };
  const failures = [];

  await runWithConcurrency(tiles, concurrency, async (tile, index) => {
    const destinationPath = path.join(
      demOutputRoot,
      String(tile.z),
      String(tile.x),
      `${tile.y}.png`
    );

    if (await fileExists(destinationPath)) {
      stats.skipped += 1;
      if ((index + 1) % 100 === 0 || index + 1 === tiles.length) {
        console.log(`DEM progress ${index + 1}/${tiles.length}`);
      }
      return;
    }

    try {
      const tileBuffer = await fetchTileBuffer(toTileUrl(tile));
      await mkdir(path.dirname(destinationPath), { recursive: true });
      await writeFile(destinationPath, tileBuffer);
      stats.downloaded += 1;
    } catch (error) {
      stats.failed += 1;
      failures.push({
        tile,
        message: error instanceof Error ? error.message : String(error)
      });
    }

    if ((index + 1) % 100 === 0 || index + 1 === tiles.length) {
      console.log(`DEM progress ${index + 1}/${tiles.length}`);
    }
  });

  console.log(
    `DEM tile sync complete. downloaded=${stats.downloaded}, skipped=${stats.skipped}, failed=${stats.failed}`
  );

  if (failures.length > 0) {
    const firstFailure = failures[0];
    throw new Error(
      `DEM tile sync had ${failures.length} failures. First: z${firstFailure.tile.z}/${firstFailure.tile.x}/${firstFailure.tile.y} - ${firstFailure.message}`
    );
  }

  return stats;
};

const isMain = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isMain) {
  syncDemTiles().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
