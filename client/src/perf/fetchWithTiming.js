const normalizeCacheStatus = (value) => {
  const normalized = String(value ?? "").toUpperCase();
  if (normalized.includes("HIT")) {
    return "HIT";
  }
  if (normalized.includes("MISS")) {
    return "MISS";
  }
  if (normalized.includes("NETWORK") || normalized.includes("BYPASS")) {
    return "NETWORK";
  }
  return "NETWORK";
};

const detectCacheStatus = (response, init) => {
  if (init?.cacheStatus) {
    return normalizeCacheStatus(init.cacheStatus);
  }

  const xCache = response.headers.get("X-Cache");
  if (xCache) {
    return normalizeCacheStatus(xCache);
  }

  const xCacheStatus = response.headers.get("x-cache-status");
  if (xCacheStatus) {
    return normalizeCacheStatus(xCacheStatus);
  }

  const cacheControl = response.headers.get("Cache-Control") ?? "";
  if (/\bmax-age=\d+/i.test(cacheControl) && response.headers.get("Age")) {
    return "HIT";
  }

  return "NETWORK";
};

const parseServerTiming = (headerValue) => {
  if (!headerValue) {
    return [];
  }

  return headerValue.split(",").map((part) => {
    const [namePart, ...params] = part.trim().split(";");
    const metric = { name: namePart.trim() };
    params.forEach((param) => {
      const [key, value] = param.trim().split("=");
      if (key === "dur" && value) {
        metric.durationMs = Number.parseFloat(value);
      } else if (key === "desc" && value) {
        metric.description = value.replace(/^"|"$/g, "");
      }
    });
    return metric;
  });
};

export const createFetchWithTiming = (perfTracker) => {
  const timedFetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input.url;
    const startedAt = performance.now();

    let response;
    try {
      response = await fetch(input, init);
    } catch (error) {
      perfTracker.recordApiCall({
        url,
        durationMs: performance.now() - startedAt,
        status: 0,
        cacheStatus: "NETWORK"
      });
      throw error;
    }

    const durationMs = performance.now() - startedAt;
    const cacheStatus = detectCacheStatus(response, init);
    const contentLength = response.headers.get("Content-Length");
    const sizeBytes = contentLength ? Number.parseInt(contentLength, 10) : undefined;
    const serverTiming = parseServerTiming(response.headers.get("Server-Timing"));
    const responseTime = response.headers.get("X-Response-Time");

    perfTracker.recordApiCall({
      url,
      durationMs,
      status: response.status,
      cacheStatus,
      sizeBytes: Number.isFinite(sizeBytes) ? sizeBytes : undefined,
      serverTiming,
      responseTime
    });

    return response;
  };

  return timedFetch;
};
