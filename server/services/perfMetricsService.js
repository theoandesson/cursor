const MAX_RECENT_REQUESTS = 200;

const recentRequests = [];
const aggregates = {
  totalRequests: 0,
  cacheHits: 0,
  durations: []
};

const percentile = (sortedValues, p) => {
  if (sortedValues.length === 0) {
    return 0;
  }

  const index = Math.ceil((p / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, index)];
};

const buildByEndpoint = (requests) => {
  const byEndpoint = {};

  for (const request of requests) {
    const key = `${request.method} ${request.path}`;
    if (!byEndpoint[key]) {
      byEndpoint[key] = {
        count: 0,
        cacheHits: 0,
        totalDurationMs: 0
      };
    }

    byEndpoint[key].count += 1;
    byEndpoint[key].totalDurationMs += request.durationMs;
    if (request.cacheHit) {
      byEndpoint[key].cacheHits += 1;
    }
  }

  return Object.fromEntries(
    Object.entries(byEndpoint).map(([endpoint, stats]) => [
      endpoint,
      {
        count: stats.count,
        avgDurationMs: stats.count > 0 ? stats.totalDurationMs / stats.count : 0,
        cacheHitRate: stats.count > 0 ? stats.cacheHits / stats.count : 0
      }
    ])
  );
};

export const recordRequest = ({ path, method, durationMs, cacheHit = false, statusCode }) => {
  const entry = {
    path,
    method,
    durationMs,
    cacheHit,
    statusCode,
    recordedAt: new Date().toISOString()
  };

  recentRequests.push(entry);
  if (recentRequests.length > MAX_RECENT_REQUESTS) {
    recentRequests.shift();
  }

  aggregates.totalRequests += 1;
  if (cacheHit) {
    aggregates.cacheHits += 1;
  }
  aggregates.durations.push(durationMs);
  if (aggregates.durations.length > MAX_RECENT_REQUESTS) {
    aggregates.durations.shift();
  }
};

export const getMetrics = () => {
  const sortedDurations = [...aggregates.durations].sort((a, b) => a - b);
  const total = aggregates.totalRequests;

  return {
    recent: [...recentRequests],
    stats: {
      totalRequests: total,
      p50: percentile(sortedDurations, 50),
      p95: percentile(sortedDurations, 95),
      p99: percentile(sortedDurations, 99),
      avg: sortedDurations.length > 0
        ? sortedDurations.reduce((sum, value) => sum + value, 0) / sortedDurations.length
        : 0,
      cacheHitRate: total > 0 ? aggregates.cacheHits / total : 0,
      byEndpoint: buildByEndpoint(recentRequests)
    }
  };
};

export const getMetricsSummary = () => {
  const { stats } = getMetrics();
  return {
    totalRequests: stats.totalRequests,
    p50Ms: Math.round(stats.p50),
    p95Ms: Math.round(stats.p95),
    p99Ms: Math.round(stats.p99),
    avgMs: Math.round(stats.avg),
    cacheHitRate: Number(stats.cacheHitRate.toFixed(3)),
    endpointCount: Object.keys(stats.byEndpoint).length
  };
};

export const resetMetrics = () => {
  recentRequests.length = 0;
  aggregates.totalRequests = 0;
  aggregates.cacheHits = 0;
  aggregates.durations.length = 0;
};
