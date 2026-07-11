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
  let refreshIndex = 0;

  const scheduleNext = () => {
    if (stopped) {
      return;
    }

    const staggerMs = Math.max(1, Math.floor(intervalMs / Math.max(1, SWEDISH_CITIES.length)));
    const timer = setTimeout(async () => {
      if (stopped) {
        return;
      }

      const forecastHours = DEFAULT_FORECAST_HOURS;
      refreshIndex = (refreshIndex + 1) % SWEDISH_CITIES.length;

      try {
        console.log(
          `Bakgrundsuppdatering väder (${refreshIndex + 1}/${SWEDISH_CITIES.length})...`
        );
        await getCityWeather({ forecastHours, forceRefresh: true });
      } catch (error) {
        console.error(
          "Bakgrundsuppdatering av vädercache misslyckades.",
          error instanceof Error ? error.message : error
        );
      }

      scheduleNext();
    }, staggerMs);

    timer.unref?.();
  };

  scheduleNext();

  return () => {
    stopped = true;
  };
};
