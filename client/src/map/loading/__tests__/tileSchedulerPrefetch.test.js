/**
 * Unit tests for scheduler-prefetch integration helpers.
 * Run with: node --test client/src/map/loading/__tests__/tileSchedulerPrefetch.test.js
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { createViewportPrefetcher, parseTileKey } from "../../tiles/createViewportPrefetcher.js";

const createMockMap = () => ({
  getCenter: () => ({ lng: 18, lat: 59 }),
  getZoom: () => 6,
  getBounds: () => ({
    getWest: () => 17,
    getSouth: () => 58,
    getEast: () => 19,
    getNorth: () => 60,
    getSouthWest: () => ({ lng: 17, lat: 58 }),
    getNorthEast: () => ({ lng: 19, lat: 60 })
  }),
  on: () => {},
  off: () => {}
});

const waitFor = async (predicate, { timeoutMs = 1000, intervalMs = 10 } = {}) => {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) {
      throw new Error("Timed out waiting for condition");
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
};

describe("parseTileKey", () => {
  test("parses valid z/x/y keys", () => {
    assert.deepEqual(parseTileKey("7/42/83"), { z: 7, x: 42, y: 83 });
  });

  test("returns null for invalid key formats", () => {
    assert.strictEqual(parseTileKey("7/42"), null);
    assert.strictEqual(parseTileKey("7/a/83"), null);
    assert.strictEqual(parseTileKey("7/42/-1"), null);
    assert.strictEqual(parseTileKey(""), null);
    assert.strictEqual(parseTileKey(null), null);
  });
});

describe("createViewportPrefetcher.applyPrioritizedTileKeys", () => {
  test("fetches tiles in the same order as prioritized keys", async () => {
    const map = createMockMap();
    const requestedUrls = [];
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async (url) => {
      requestedUrls.push(url);
      return { ok: true };
    };

    const prefetcher = createViewportPrefetcher(map, {
      deferInitialPrefetch: true,
      maxConcurrent: 1,
      tileTemplates: ["https://tiles.test/{z}/{x}/{y}.pbf"]
    });

    try {
      prefetcher.applyPrioritizedTileKeys(["6/3/7", "6/1/4", "6/2/5"]);
      await waitFor(() => requestedUrls.length === 3);
      assert.deepEqual(requestedUrls, [
        "https://tiles.test/6/3/7.pbf",
        "https://tiles.test/6/1/4.pbf",
        "https://tiles.test/6/2/5.pbf"
      ]);
    } finally {
      prefetcher.destroy();
      globalThis.fetch = originalFetch;
    }
  });
});
