import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SWEDEN_BOUNDS, TILE_SYNC_ZOOMS } from "./tileBounds.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "../..");

const vectorTileJsonPath = path.join(workspaceRoot, "data/tiles/vector/tilejson.json");
const demTileJsonPath = path.join(workspaceRoot, "data/tiles/dem/tilejson.json");

export const generateTileJson = async () => {
  const vectorTileJson = {
    tilejson: "3.0.0",
    name: "sweden-vector-local",
    description: "OpenFreeMap vector tiles synced for Sweden bbox",
    scheme: "xyz",
    format: "pbf",
    minzoom: TILE_SYNC_ZOOMS.vector.min,
    maxzoom: TILE_SYNC_ZOOMS.vector.max,
    bounds: SWEDEN_BOUNDS,
    tiles: ["/tiles/vector/{z}/{x}/{y}.pbf"]
  };

  const demTileJson = {
    tilejson: "3.0.0",
    name: "sweden-dem-local",
    description: "Terrarium DEM tiles synced for Sweden bbox",
    scheme: "xyz",
    format: "png",
    encoding: "terrarium",
    minzoom: TILE_SYNC_ZOOMS.dem.min,
    maxzoom: TILE_SYNC_ZOOMS.dem.max,
    bounds: SWEDEN_BOUNDS,
    tiles: ["/tiles/dem/{z}/{x}/{y}.png"]
  };

  await mkdir(path.dirname(vectorTileJsonPath), { recursive: true });
  await mkdir(path.dirname(demTileJsonPath), { recursive: true });

  await writeFile(vectorTileJsonPath, `${JSON.stringify(vectorTileJson, null, 2)}\n`, "utf8");
  await writeFile(demTileJsonPath, `${JSON.stringify(demTileJson, null, 2)}\n`, "utf8");

  console.log(`Wrote ${vectorTileJsonPath}`);
  console.log(`Wrote ${demTileJsonPath}`);
};

const isMain = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isMain) {
  generateTileJson().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
