import {
  getCityWeather,
  getCityWeatherCacheAge,
  listCities
} from "./cityWeatherService.js";

export const createBootstrapPayload = async ({ forecastHours = 24, forceRefresh = false } = {}) => {
  const cities = listCities();
  const weather = await getCityWeather({ forecastHours, forceRefresh });

  return {
    cities,
    weather,
    serverTime: new Date().toISOString(),
    cacheAge: getCityWeatherCacheAge(forecastHours),
    version: "1"
  };
};
