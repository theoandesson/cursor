import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, test } from "node:test";
import { createSelfHostedTileService } from "../selfHostedTileService.js";

const temporaryDirectories = [];

const createService = async (overrides = {}) => {
  const tilesDataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "self-hosted-tiles-"));
  temporaryDirectories.push(tilesDataDirectory);
  return createSelfHostedTileService({
    tilesDataDirectory,
    fallbackToUpstream: false,
    ...overrides
  });
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directoryPath) =>
      fs.rm(directoryPath, { recursive: true, force: true })
    )
  );
});

describe("selfHostedTileService", () => {
  test("validates tile coordinates and rejects path-like input", async () => {
    const service = await createService();
    const invalidCoordinateCases = [
      ["../../etc/passwd", "0", "0"],
      ["1", "../2", "3"],
      ["1", "2", "3/../../4"],
      [14, -1, 0],
      [14, 0, -1]
    ];

    for (const [z, x, y] of invalidCoordinateCases) {
      const result = await service.getVectorTile(z, x, y);
      assert.equal(result.ok, false);
      assert.equal(result.status, 404);
    }
  });

  test("generates vector tilejson payload with configured template", async () => {
    const customBounds = [10, 55, 24, 69];
    const vectorTileLimits = { minzoom: 2, maxzoom: 12 };
    const service = await createService({
      bounds: customBounds,
      vectorTileTemplate: "/tiles/vector/{z}/{x}/{y}.pbf",
      vectorTileLimits
    });

    const tileJson = service.getVectorTileJson();
    assert.equal(tileJson.tilejson, "2.2.0");
    assert.equal(tileJson.scheme, "xyz");
    assert.equal(tileJson.format, "pbf");
    assert.deepEqual(tileJson.tiles, ["/tiles/vector/{z}/{x}/{y}.pbf"]);
    assert.deepEqual(tileJson.bounds, customBounds);
    assert.equal(tileJson.minzoom, vectorTileLimits.minzoom);
    assert.equal(tileJson.maxzoom, vectorTileLimits.maxzoom);
  });

  test("returns 404 when requested local vector tile is missing", async () => {
    const service = await createService();

    const result = await service.getVectorTile(0, 0, 0);
    assert.equal(result.ok, false);
    assert.equal(result.status, 404);
  });
});
