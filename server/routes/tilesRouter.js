import { Router } from "express";
import { tileConfig } from "../config/tileConfig.js";
import { createSelfHostedTileService } from "../services/selfHostedTileService.js";

const TILE_SOURCE_VALUES = new Set(["local", "upstream"]);

const parseCoordinate = (value) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const setTileSourceHeader = (response, source) => {
  const tileSource = TILE_SOURCE_VALUES.has(source) ? source : "local";
  response.setHeader("X-Tile-Source", tileSource);
};

const getTileSource = (result) => {
  if (result?.source === "local" || result?.source === "upstream") {
    return result.source;
  }
  if (typeof result?.cache === "string") {
    const normalized = result.cache.trim().toLowerCase();
    if (normalized === "upstream") {
      return "upstream";
    }
    if (normalized === "local") {
      return "local";
    }
  }
  return "local";
};

const callTileGetter = async (service, type, z, x, y) => {
  if (typeof service.fetchWithFallback === "function") {
    return service.fetchWithFallback(type, z, x, y);
  }

  const methodName = type === "vector" ? "getVectorTile" : "getDemTile";
  const method = service[methodName];
  if (typeof method !== "function") {
    return null;
  }

  return method.length >= 3 ? method(z, x, y) : method({ z, x, y });
};

const getErrorMessage = (fallbackMessage, details) => {
  if (!details) {
    return fallbackMessage;
  }
  if (typeof details === "string") {
    return details;
  }
  if (details instanceof Error && details.message) {
    return details.message;
  }
  if (typeof details === "object" && typeof details.error === "string") {
    return details.error;
  }
  if (typeof details === "object" && typeof details.message === "string") {
    return details.message;
  }
  return fallbackMessage;
};

const sendNotFound = (response, message = "Tile hittades inte.") => {
  response.status(404).json({ error: message });
};

const sendServiceFailure = (response, fallbackMessage, result) => {
  const status = Number.isInteger(result?.status) ? result.status : 502;
  const error = getErrorMessage(fallbackMessage, result?.error ?? result?.body ?? result);
  response.status(status).json({ error });
};

const resolveBinaryPayload = (result) => {
  if (!result || typeof result !== "object") {
    return null;
  }

  const buffer =
    result.buffer ??
    result.tile ??
    result.data ??
    (result.body instanceof Buffer ? result.body : null);

  if (!Buffer.isBuffer(buffer)) {
    return null;
  }

  return {
    buffer,
    source: result.source,
    status: Number.isInteger(result.status) ? result.status : 200
  };
};

const resolveTileJsonPayload = (result) => {
  if (!result) {
    return null;
  }
  if (typeof result !== "object") {
    return null;
  }
  if (result.tilejson && typeof result.tilejson === "object") {
    return { payload: result.tilejson, source: result.source };
  }
  if (result.payload && typeof result.payload === "object") {
    return { payload: result.payload, source: result.source };
  }
  if (result.body && typeof result.body === "object" && !Buffer.isBuffer(result.body)) {
    return { payload: result.body, source: result.source };
  }
  return { payload: result, source: result.source };
};

export const createTilesRouter = () => {
  const router = Router();
  const tileService = createSelfHostedTileService(tileConfig);

  router.get("/vector/tilejson.json", async (_request, response) => {
    try {
      const result = await tileService.getVectorTileJson();
      if (result?.ok === false) {
        sendServiceFailure(response, "Kunde inte hämta vector TileJSON.", result);
        return;
      }

      const tileJson = resolveTileJsonPayload(result);
      if (!tileJson) {
        sendNotFound(response, "Vector TileJSON hittades inte.");
        return;
      }

      response.setHeader("Cache-Control", "public, max-age=3600");
      setTileSourceHeader(response, tileJson.source ?? "local");
      response.status(200).json(tileJson.payload);
    } catch (error) {
      response.status(502).json({
        error: getErrorMessage("Kunde inte hämta vector TileJSON.", error)
      });
    }
  });

  router.get("/vector/:z/:x/:y.pbf", async (request, response) => {
    const z = parseCoordinate(request.params.z);
    const x = parseCoordinate(request.params.x);
    const y = parseCoordinate(request.params.y);
    if (z == null || x == null || y == null) {
      response.status(400).json({ error: "Ogiltiga tile-koordinater." });
      return;
    }

    try {
      const result = await callTileGetter(tileService, "vector", z, x, y);
      if (!result || result?.notFound === true || result?.status === 404) {
        sendNotFound(response);
        return;
      }
      if (result?.ok === false) {
        sendServiceFailure(response, "Kunde inte hämta vectortile.", result);
        return;
      }

      const payload = resolveBinaryPayload(result);
      if (!payload) {
        sendNotFound(response);
        return;
      }

      response.setHeader("Content-Type", "application/x-protobuf");
      response.setHeader("Cache-Control", "public, max-age=86400, immutable");
      setTileSourceHeader(response, getTileSource(result) ?? payload.source);
      response.status(payload.status).send(payload.buffer);
    } catch (error) {
      response.status(502).json({
        error: getErrorMessage("Kunde inte hämta vectortile.", error)
      });
    }
  });

  router.get("/dem/tilejson.json", async (_request, response) => {
    try {
      const result = await tileService.getDemTileJson();
      if (result?.ok === false) {
        sendServiceFailure(response, "Kunde inte hämta DEM TileJSON.", result);
        return;
      }

      const tileJson = resolveTileJsonPayload(result);
      if (!tileJson) {
        sendNotFound(response, "DEM TileJSON hittades inte.");
        return;
      }

      response.setHeader("Cache-Control", "public, max-age=3600");
      setTileSourceHeader(response, tileJson.source ?? "local");
      response.status(200).json(tileJson.payload);
    } catch (error) {
      response.status(502).json({
        error: getErrorMessage("Kunde inte hämta DEM TileJSON.", error)
      });
    }
  });

  router.get("/dem/:z/:x/:y.png", async (request, response) => {
    const z = parseCoordinate(request.params.z);
    const x = parseCoordinate(request.params.x);
    const y = parseCoordinate(request.params.y);
    if (z == null || x == null || y == null) {
      response.status(400).json({ error: "Ogiltiga tile-koordinater." });
      return;
    }

    try {
      const result = await callTileGetter(tileService, "dem", z, x, y);
      if (!result || result?.notFound === true || result?.status === 404) {
        sendNotFound(response);
        return;
      }
      if (result?.ok === false) {
        sendServiceFailure(response, "Kunde inte hämta DEM-tile.", result);
        return;
      }

      const payload = resolveBinaryPayload(result);
      if (!payload) {
        sendNotFound(response);
        return;
      }

      response.setHeader("Content-Type", "image/png");
      response.setHeader("Cache-Control", "public, max-age=86400, immutable");
      setTileSourceHeader(response, getTileSource(result) ?? payload.source);
      response.status(payload.status).send(payload.buffer);
    } catch (error) {
      response.status(502).json({
        error: getErrorMessage("Kunde inte hämta DEM-tile.", error)
      });
    }
  });

  router.use((_request, response) => {
    response.status(404).json({ error: "Tile-endpoint hittades inte." });
  });

  return router;
};
