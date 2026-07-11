export const cityWeatherCacheKey = (forecastHours) => `city-weather:${forecastHours}`;

export const pointWeatherCacheKey = (lon, lat, forecastHours) => {
  const roundedLon = Math.round(lon * 100) / 100;
  const roundedLat = Math.round(lat * 100) / 100;
  return `point-weather:${roundedLon}:${roundedLat}:${forecastHours}`;
};
