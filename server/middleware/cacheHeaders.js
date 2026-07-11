const CACHE_POLICIES = {
  "static-cities": "public, max-age=3600",
  weather: "public, max-age=300, stale-while-revalidate=60",
  bootstrap: "public, max-age=300, stale-while-revalidate=60",
  perf: "no-cache"
};

export const setCacheHeaders = (type) => (request, response, next) => {
  const policy = CACHE_POLICIES[type];
  if (policy) {
    response.setHeader("Cache-Control", policy);
  }
  next();
};
