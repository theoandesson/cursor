import { Router } from "express";
import { parseBoolean, parseIntegerInRange } from "../lib/parseQuery.js";
import { setCacheHeaders } from "../middleware/cacheHeaders.js";
import { createBootstrapPayload } from "../services/bootstrapService.js";
import {
  getMetrics,
  getMetricsSummary,
  resetMetrics
} from "../services/perfMetricsService.js";

const MAX_FORECAST_HOURS = 48;
const isProduction = process.env.NODE_ENV === "production";

const allowPerfAdmin = (request) => {
  if (!isProduction) {
    return true;
  }

  const ip = request.ip ?? "";
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
};

const parseForecastHours = (request) =>
  parseIntegerInRange(request.query.hours, {
    min: 1,
    max: MAX_FORECAST_HOURS
  }) ?? 24;

export const createBootstrapRouter = () => {
  const router = Router();

  router.get("/bootstrap", setCacheHeaders("bootstrap"), async (request, response) => {
    const forecastHours = parseForecastHours(request);
    const forceRefresh = parseBoolean(request.query.refresh, false);

    try {
      const { payload, cacheHit } = await createBootstrapPayload({ forecastHours, forceRefresh });
      response.locals.cacheHit = cacheHit;
      response.status(200).json(payload);
    } catch {
      response.status(502).json({
        error: "Kunde inte skapa bootstrap-payload."
      });
    }
  });

  router.get("/perf", setCacheHeaders("perf"), (request, response) => {
    if (!allowPerfAdmin(request)) {
      response.status(403).json({ error: "Förbjuden." });
      return;
    }
    response.status(200).json(getMetrics());
  });

  router.get("/perf/summary", setCacheHeaders("perf"), (request, response) => {
    if (!allowPerfAdmin(request)) {
      response.status(403).json({ error: "Förbjuden." });
      return;
    }
    response.status(200).json(getMetricsSummary());
  });

  router.post("/perf/reset", setCacheHeaders("perf"), (request, response) => {
    if (!allowPerfAdmin(request)) {
      response.status(403).json({ error: "Förbjuden." });
      return;
    }
    resetMetrics();
    response.status(200).json({ ok: true });
  });

  return router;
};
