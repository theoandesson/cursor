import { SWEDISH_CITIES } from "../data/swedishCities.js";
import { getCityWeather } from "./cityWeatherService.js";

const DEFAULT_FORECAST_HOURS = 24;
const DEFAULT_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export const warmWeatherCache = async ({ forecastHours = DEFAULT_FORECAST_HOURS } = {}) => {
  console.log(`Värmar vädercache för ${SWEDISH_CITIES.length} städer (${forecastHours}h prognos)...`);
  const startedAt = Date.now();

  await getCityWeather({ forecastHours, forceRefresh: true });

  const elapsedMs = Date.now() - startedAt;
  console.log(`Vädercache klar på ${elapsedMs}ms.`);
};

export const startBackgroundRefresh = ({ intervalMs = DEFAULT_REFRESH_INTERVAL_MS } = {}) => {
  let stopped = false;
  let timer = null;

  const runRefresh = async () => {
    if (stopped) {
      return;
    }

    try {
      console.log("Bakgrundsuppdatering väder (full refresh)...");
      await getCityWeather({ forecastHours: DEFAULT_FORECAST_HOURS, forceRefresh: true });
    } catch (error) {
      console.error(
        "Bakgrundsuppdatering av vädercache misslyckades.",
        error instanceof Error ? error.message : error
      );
    }

    if (!stopped) {
      timer = setTimeout(runRefresh, intervalMs);
      timer.unref?.();
    }
  };

  timer = setTimeout(runRefresh, intervalMs);
  timer.unref?.();

  return () => {
    stopped = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
};
