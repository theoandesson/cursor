export const isValidBootstrapData = (data) => {
  if (!data || typeof data !== "object") {
    return false;
  }

  const hasCities =
    Array.isArray(data.cities) || Array.isArray(data.cities?.cities);
  const hasWeather =
    Array.isArray(data.weather?.cities) || Array.isArray(data.cityWeather?.cities);

  return hasCities || hasWeather;
};
