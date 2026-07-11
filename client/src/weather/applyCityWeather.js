export const buildGeoJsonFromCities = (cities) => ({
  type: "FeatureCollection",
  features: cities.map((c) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [c.lon, c.lat] },
    properties: {
      cityId: c.id,
      name: c.name,
      icon: "",
      temp: "",
      label: "",
      windSpeed: null,
      windDir: null,
      windDirText: "",
      humidity: null,
      pressure: null,
      gust: null,
      symbolLabel: "",
      loaded: false
    }
  }))
});

export const createFeatureUpdater = (getWeatherSymbol, getWindDirection) => {
  return (geojson, idx, weather) => {
    if (idx == null || !weather) {
      return false;
    }

    const sym = getWeatherSymbol(weather.symbol);
    const feature = geojson.features[idx];
    if (!feature) {
      return false;
    }

    feature.properties.icon = sym.icon;
    feature.properties.temp =
      weather.temp != null ? `${Number(weather.temp).toFixed(1)}°C` : "?";
    feature.properties.label = sym.label;
    feature.properties.symbolLabel = sym.label;
    feature.properties.windSpeed = weather.windSpeed;
    feature.properties.windDir = weather.windDir;
    feature.properties.windDirText = getWindDirection(weather.windDir);
    feature.properties.humidity = weather.humidity;
    feature.properties.pressure = weather.pressure;
    feature.properties.gust = weather.gust;
    feature.properties.loaded = true;
    return true;
  };
};

export const applyWeatherToGeoJson = (
  geojson,
  cityIdToFeatureIndex,
  cityWeatherEntries,
  updateFeatureFn
) => {
  let updatedCount = 0;

  cityWeatherEntries.forEach((entry) => {
    const cityId = entry.city?.id;
    if (!cityId) {
      return;
    }

    const idx = cityIdToFeatureIndex.get(cityId);
    if (entry.current && updateFeatureFn(geojson, idx, entry.current)) {
      updatedCount += 1;
    }
  });

  return updatedCount;
};

export const extractBootstrapParts = (bootstrapData) => {
  const weatherEntries =
    bootstrapData?.weather?.cities ??
    bootstrapData?.cityWeather?.cities ??
    [];

  const cities =
    bootstrapData?.cities ??
    weatherEntries.map((entry) => entry.city).filter(Boolean);

  return { cities, weatherEntries };
};

export const haveSameCityIds = (leftCities, rightCities) => {
  if (leftCities.length !== rightCities.length) {
    return false;
  }

  const rightIds = new Set(rightCities.map((city) => city.id));
  return leftCities.every((city) => rightIds.has(city.id));
};
