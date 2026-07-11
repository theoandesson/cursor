import path from "node:path";
import { fileURLToPath } from "node:url";
import { syncVectorTiles } from "./syncVectorTiles.mjs";
import { syncDemTiles } from "./syncDemTiles.mjs";

const __filename = fileURLToPath(import.meta.url);

const parseCliArgs = (argv) => {
  const parsed = {};

  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [rawKey, rawValue] = arg.slice(2).split("=");
    parsed[rawKey] = rawValue ?? "true";
  }

  return parsed;
};

const parseOptionalInteger = (value) => {
  if (value == null) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const syncAllTiles = async (options = {}) => {
  const cliArgs = parseCliArgs(process.argv.slice(2));
  const vectorOptions = {
    minZoom: parseOptionalInteger(options.vectorMinZoom ?? cliArgs["vector-min-zoom"]),
    maxZoom: parseOptionalInteger(options.vectorMaxZoom ?? cliArgs["vector-max-zoom"]),
    concurrency: parseOptionalInteger(options.vectorConcurrency ?? cliArgs["vector-concurrency"])
  };
  const demOptions = {
    minZoom: parseOptionalInteger(options.demMinZoom ?? cliArgs["dem-min-zoom"]),
    maxZoom: parseOptionalInteger(options.demMaxZoom ?? cliArgs["dem-max-zoom"]),
    concurrency: parseOptionalInteger(options.demConcurrency ?? cliArgs["dem-concurrency"])
  };

  console.log("Starting vector tile sync...");
  await syncVectorTiles(vectorOptions);

  console.log("Starting DEM tile sync...");
  await syncDemTiles(demOptions);

  console.log("All tile sync tasks completed.");
};

const isMain = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isMain) {
  syncAllTiles().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
