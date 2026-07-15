import assert from "node:assert/strict";
import test from "node:test";
import { createSingleFlight } from "../../lib/singleFlight.js";
import { allowPerfAdmin } from "../../lib/adminAuth.js";
import { createTileProxyService } from "../tileProxyService.js";

test("singleFlight coalesces concurrent calls for the same key", async () => {
  const flight = createSingleFlight();
  let runs = 0;

  const task = () =>
    flight.doOnce("grid", async () => {
      runs += 1;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return "ok";
    });

  const [a, b, c] = await Promise.all([task(), task(), task()]);
  assert.equal(a, "ok");
  assert.equal(b, "ok");
  assert.equal(c, "ok");
  assert.equal(runs, 1);
});

test("allowPerfAdmin denies remote clients without token", () => {
  const previousEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  delete process.env.PERF_ADMIN_TOKEN;
  delete process.env.ALLOW_LOCAL_PERF_ADMIN;

  try {
    const denied = allowPerfAdmin({
      socket: { remoteAddress: "203.0.113.10" },
      get: () => null,
      headers: {}
    });
    assert.equal(denied, false);

    const loopbackDeniedInProd = allowPerfAdmin({
      socket: { remoteAddress: "127.0.0.1" },
      get: () => null,
      headers: {}
    });
    assert.equal(loopbackDeniedInProd, false);
  } finally {
    process.env.NODE_ENV = previousEnv;
  }
});

test("allowPerfAdmin accepts matching token from remote client", () => {
  const previousToken = process.env.PERF_ADMIN_TOKEN;
  process.env.PERF_ADMIN_TOKEN = "secret-token";

  try {
    const allowed = allowPerfAdmin({
      socket: { remoteAddress: "203.0.113.10" },
      get: (name) => (name === "x-perf-admin-token" ? "secret-token" : null),
      headers: { "x-perf-admin-token": "secret-token" }
    });
    assert.equal(allowed, true);
  } finally {
    if (previousToken == null) {
      delete process.env.PERF_ADMIN_TOKEN;
    } else {
      process.env.PERF_ADMIN_TOKEN = previousToken;
    }
  }
});

test("tile proxy rejects oversized bodies and caps cache bytes", async () => {
  const huge = Buffer.alloc(3 * 1024 * 1024, 1);
  let fetches = 0;

  const service = createTileProxyService({
    cacheMaxEntries: 10,
    cacheMaxBytes: 1024 * 1024,
    maxTileBytes: 2 * 1024 * 1024,
    fetchImpl: async () => {
      fetches += 1;
      return {
        ok: true,
        status: 200,
        headers: {
          get: (name) => (name === "content-type" ? "image/png" : null)
        },
        arrayBuffer: async () => huge.buffer.slice(huge.byteOffset, huge.byteOffset + huge.byteLength)
      };
    }
  });

  const result = await service.proxyTile(
    "https://tiles.openfreemap.org/planet/1/2/3.png"
  );
  assert.equal(result.ok, false);
  assert.equal(result.status, 413);
  assert.equal(fetches, 1);
  assert.equal(service.getCacheStats().entries, 0);
});

test("tile proxy forces safe content-type and tracks byte budget", async () => {
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 1, 2, 3]);
  const service = createTileProxyService({
    cacheMaxEntries: 10,
    cacheMaxBytes: 1024,
    maxTileBytes: 1024,
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      headers: {
        get: (name) => (name === "content-type" ? "text/html; charset=utf-8" : null)
      },
      arrayBuffer: async () =>
        png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength)
    })
  });

  const result = await service.proxyTile(
    "https://tiles.openfreemap.org/planet/1/2/3.png"
  );
  assert.equal(result.ok, true);
  assert.equal(result.contentType, "image/png");
  assert.equal(service.getCacheStats().bytes, png.byteLength);
});
