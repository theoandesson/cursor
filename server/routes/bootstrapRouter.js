import { Router } from "express";
import { parseBoolean, parseIntegerInRange } from "../lib/parseQuery.js";
import { isCacheWarm } from "../services/cityWeatherService.js";
import { setCacheHeaders } from "../middleware/cacheHeaders.js";
import { createBootstrapPayload } from "../services/bootstrapService.js";
import {
  getMetrics,
  getMetricsSummary,
  resetMetrics
} from "../services/perfMetricsService.js";

const MAX_FORECAST_HOURS = 48;

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
      const cacheHit = !forceRefresh && isCacheWarm(forecastHours);
      const payload = await createBootstrapPayload({ forecastHours, forceRefresh });
      response.locals.cacheHit = cacheHit;
      response.status(200).json(payload);
    } catch (error) {
      response.status(502).json({
        error: error instanceof Error ? error.message : "Kunde inte skapa bootstrap-payload."
      });
    }
  });

  router.get("/perf", setCacheHeaders("perf"), (_request, response) => {
    response.status(200).json(getMetrics());
  });

  router.get("/perf/summary", setCacheHeaders("perf"), (_request, response) => {
    response.status(200).json(getMetricsSummary());
  });

  router.post("/perf/reset", setCacheHeaders("perf"), (_request, response) => {
    resetMetrics();
    response.status(200).json({ ok: true });
  });

  return router;
};
