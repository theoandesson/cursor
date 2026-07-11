import assert from "node:assert/strict";
import { once } from "node:events";
import http from "node:http";
import { after, describe, test } from "node:test";
import express from "express";
import { createTilesRouter } from "../tilesRouter.js";

let server;
let baseUrl;

const request = async (requestPath) => {
  const response = await fetch(`${baseUrl}${requestPath}`);
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : Buffer.from(await response.arrayBuffer());
  return { response, body };
};

const startServer = async () => {
  const app = express();
  app.use(createTilesRouter());

  server = http.createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
};

await startServer();

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error && error.code !== "ERR_SERVER_NOT_RUNNING") {
        reject(error);
        return;
      }
      resolve();
    });
  });
});

describe("tilesRouter", () => {
  test("GET /tiles/vector/tilejson.json returns vector tilejson payload", async () => {
    const { response, body } = await request("/tiles/vector/tilejson.json");

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-tile-source"), "local");
    assert.equal(body.tilejson, "2.2.0");
    assert.ok(Array.isArray(body.tiles));
    assert.ok(body.tiles.includes("/tiles/vector/{z}/{x}/{y}.pbf"));
  });

  test("GET /tiles/vector/:z/:x/:y.pbf returns 400 for invalid coordinates", async () => {
    const { response, body } = await request("/tiles/vector/not-a-z/1/2.pbf");

    assert.equal(response.status, 400);
    assert.equal(typeof body.error, "string");
    assert.match(body.error, /Ogiltiga tile-koordinater/i);
  });

  test("GET /tiles/vector/:z/:x/:y.pbf returns 404 for missing tile", async () => {
    const { response, body } = await request("/tiles/vector/14/0/0.pbf");

    assert.equal(response.status, 404);
    assert.equal(typeof body.error, "string");
    assert.match(body.error, /Tile hittades inte/i);
  });
});
