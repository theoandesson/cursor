export const PERF_BUDGETS = Object.freeze({
  bootToMapVisible: 2000,
  bootToMapVisibleCold: 4500,
  bootToWeatherVisible: { cached: 400, network: 3000 },
  apiBootstrap: { cached: 100, network: 1000 },
  panelSwitch: 16,
  pointWeather: { cached: 100, network: 500 }
});

const resolveBudget = (budget, isCached) => {
  if (typeof budget === "number") {
    return budget;
  }
  return isCached ? budget.cached : budget.network;
};

const findLastMilestone = (milestones, name) => {
  if (typeof milestones.findLast === "function") {
    return milestones.findLast((entry) => entry.name === name);
  }

  for (let index = milestones.length - 1; index >= 0; index -= 1) {
    if (milestones[index].name === name) {
      return milestones[index];
    }
  }

  return undefined;
};

const findMilestoneDelta = (milestones, startName, endName) => {
  const start = findLastMilestone(milestones, startName);
  const end = findLastMilestone(milestones, endName);
  if (!start || !end) {
    return null;
  }
  return end.time - start.time;
};

const findMeasure = (measures, name) =>
  measures.find((entry) => entry.name === name)?.durationMs ?? null;

const findBootstrapApiCall = (apiCallDetails = []) => {
  if (typeof apiCallDetails.findLast === "function") {
    return apiCallDetails.findLast(
      (call) => call.url === "/api/bootstrap" || call.url?.startsWith("/api/bootstrap")
    );
  }

  for (let index = apiCallDetails.length - 1; index >= 0; index -= 1) {
    const call = apiCallDetails[index];
    if (call.url === "/api/bootstrap" || call.url?.startsWith("/api/bootstrap")) {
      return call;
    }
  }

  return undefined;
};

const hasWarmCache = ({ milestones = [], apiCallDetails = [] }) => {
  if (milestones.some((entry) => entry.detail?.cached)) {
    return true;
  }

  return apiCallDetails.some((call) => call.cacheStatus === "HIT");
};

export const checkBudgets = (summary) => {
  const {
    milestones = [],
    measures = [],
    apiCalls = {},
    apiCallDetails = [],
    navigationTiming = null
  } = summary;
  const results = [];

  const bootToMapVisible = findMilestoneDelta(milestones, "main-start", "map-overlay-hidden")
    ?? findMilestoneDelta(milestones, "main-start", "map-idle")
    ?? summary.totalBootMs;

  const isColdNavigate =
    navigationTiming?.type === "navigate" && !hasWarmCache({ milestones, apiCallDetails });
  const bootBudget = isColdNavigate
    ? PERF_BUDGETS.bootToMapVisibleCold
    : PERF_BUDGETS.bootToMapVisible;

  results.push({
    name: "bootToMapVisible",
    actual: bootToMapVisible,
    budget: bootBudget,
    passed: bootToMapVisible <= bootBudget,
    severity:
      bootToMapVisible <= bootBudget
        ? "pass"
        : bootToMapVisible >= bootBudget * 2
          ? "error"
          : "warn"
  });

  const weatherVisible = findMilestoneDelta(milestones, "main-start", "weather-visible");
  if (weatherVisible != null) {
    const weatherCached = findLastMilestone(milestones, "weather-visible")?.detail?.cached;
    const budget = resolveBudget(PERF_BUDGETS.bootToWeatherVisible, Boolean(weatherCached));
    results.push({
      name: "bootToWeatherVisible",
      actual: weatherVisible,
      budget,
      passed: weatherVisible <= budget,
      severity:
        weatherVisible <= budget ? "pass" : weatherVisible >= budget * 2 ? "error" : "warn"
    });
  }

  const bootstrapApi = measures.find((entry) => entry.name === "api-bootstrap");
  if (bootstrapApi) {
    const bootstrapCall = findBootstrapApiCall(apiCallDetails);
    const cached = bootstrapCall?.cacheStatus === "HIT";
    const budget = resolveBudget(PERF_BUDGETS.apiBootstrap, cached);
    results.push({
      name: "apiBootstrap",
      actual: bootstrapApi.durationMs,
      budget,
      passed: bootstrapApi.durationMs <= budget,
      severity:
        bootstrapApi.durationMs <= budget
          ? "pass"
          : bootstrapApi.durationMs >= budget * 2
            ? "error"
            : "warn"
    });
  }

  const panelSwitch = findMeasure(measures, "panel-switch");
  if (panelSwitch != null) {
    results.push({
      name: "panelSwitch",
      actual: panelSwitch,
      budget: PERF_BUDGETS.panelSwitch,
      passed: panelSwitch <= PERF_BUDGETS.panelSwitch,
      severity:
        panelSwitch <= PERF_BUDGETS.panelSwitch
          ? "pass"
          : panelSwitch >= PERF_BUDGETS.panelSwitch * 4
            ? "error"
            : "warn"
    });
  }

  const pointWeather = findMeasure(measures, "point-weather");
  if (pointWeather != null) {
    const cached = findLastMilestone(milestones, "point-weather")?.detail?.cached;
    const budget = resolveBudget(PERF_BUDGETS.pointWeather, Boolean(cached));
    results.push({
      name: "pointWeather",
      actual: pointWeather,
      budget,
      passed: pointWeather <= budget,
      severity: pointWeather <= budget ? "pass" : pointWeather >= budget * 2 ? "error" : "warn"
    });
  }

  return results;
};
