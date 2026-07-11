export const PERF_BUDGETS = Object.freeze({
  bootToMapVisible: 500,
  bootToWeatherVisible: { cached: 200, network: 2000 },
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

const findMilestoneDelta = (milestones, startName, endName) => {
  const start = milestones.find((entry) => entry.name === startName);
  const end = milestones.find((entry) => entry.name === endName);
  if (!start || !end) {
    return null;
  }
  return end.time - start.time;
};

const findMeasure = (measures, name) =>
  measures.find((entry) => entry.name === name)?.durationMs ?? null;

export const checkBudgets = (summary) => {
  const { milestones = [], measures = [], apiCalls = {} } = summary;
  const results = [];

  const bootToMapVisible = findMilestoneDelta(milestones, "main-start", "map-overlay-hidden")
    ?? findMilestoneDelta(milestones, "main-start", "map-idle")
    ?? summary.totalBootMs;

  results.push({
    name: "bootToMapVisible",
    actual: bootToMapVisible,
    budget: PERF_BUDGETS.bootToMapVisible,
    passed: bootToMapVisible <= PERF_BUDGETS.bootToMapVisible,
    severity:
      bootToMapVisible <= PERF_BUDGETS.bootToMapVisible
        ? "pass"
        : bootToMapVisible >= PERF_BUDGETS.bootToMapVisible * 2
          ? "error"
          : "warn"
  });

  const weatherVisible = findMilestoneDelta(milestones, "main-start", "weather-visible");
  if (weatherVisible != null) {
    const weatherCached = milestones.find((entry) => entry.name === "weather-visible")?.detail?.cached;
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
    const cached = apiCalls.cacheHitRate > 0.5;
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
    const cached = milestones.find((entry) => entry.name === "point-weather")?.detail?.cached;
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
