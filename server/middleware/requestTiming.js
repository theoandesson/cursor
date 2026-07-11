import { recordRequest } from "../services/perfMetricsService.js";

export const requestTiming = (request, response, next) => {
  const startedAt = process.hrtime.bigint();
  const originalEnd = response.end.bind(response);

  response.end = (chunk, encoding, callback) => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const roundedDurationMs = Math.round(durationMs * 100) / 100;

    if (!response.headersSent) {
      response.setHeader("X-Response-Time", `${roundedDurationMs}ms`);
      response.setHeader("Server-Timing", `total;dur=${roundedDurationMs}`);
      if (response.locals.cacheHit === true) {
        response.setHeader("X-Cache-Status", "HIT");
      } else if (response.locals.cacheHit === false) {
        response.setHeader("X-Cache-Status", "MISS");
      }
    }

    recordRequest({
      path: request.path,
      method: request.method,
      durationMs: roundedDurationMs,
      cacheHit: response.locals.cacheHit === true,
      statusCode: response.statusCode
    });

    return originalEnd(chunk, encoding, callback);
  };

  next();
};
