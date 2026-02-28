import { Router } from "express";
import { parseBoolean, parseFloatInRange, parseIntegerInRange } from "../lib/parseQuery.js";
import { getCityById, getCityWeather, listCities, toCityDto } from "../services/cityWeatherService.js";
import { fetchWeatherByPoint } from "../services/smhiWeatherService.js";

const MAX_PAGE_SIZE = 300;
const MAX_FORECAST_HOURS = 48;

const parsePageQuery = (request) => {
  const limit = parseIntegerInRange(request.query.limit, { min: 1, max: MAX_PAGE_SIZE });
  const offset = parseIntegerInRange(request.query.offset, { min: 0 });
  return {
    limit: limit ?? undefined,
    offset: offset ?? 0
  };
};

const parseForecastHours = (request) =>
  parseIntegerInRange(request.query.hours, {
    min: 1,
    max: MAX_FORECAST_HOURS
  }) ?? 24;

export const createApiRouter = () => {
  const router = Router();

  router.get("/healthz", (_request, response) => {
    response.status(200).json({ ok: true, service: "api" });
  });

  router.get("/endpoints", (_request, response) => {
    response.status(200).json({
      endpoints: [
        { method: "GET", path: "/api/healthz", description: "API healthcheck" },
        { method: "GET", path: "/api/endpoints", description: "Lista alla API-endpoints" },
        { method: "GET", path: "/api/cities", description: "Lista städer (sökbar + pagination)" },
        { method: "GET", path: "/api/cities/:cityId", description: "Hämta en stad via id" },
        { method: "GET", path: "/api/weather/point?lon=&lat=&hours=", description: "Väder för valfri punkt" },
        { method: "GET", path: "/api/weather/cities", description: "Väder för alla städer i listan" },
        { method: "GET", path: "/api/weather/cities/:cityId", description: "Väder för en specifik stad" }
      ]
    });
  });

  router.get("/cities", (request, response) => {
    const { limit, offset } = parsePageQuery(request);
    const search = String(request.query.search ?? "").trim();

    response.status(200).json(listCities({ search, limit, offset }));
  });

  router.get("/cities/:cityId", (request, response) => {
    const city = getCityById(request.params.cityId);
    if (!city) {
      response.status(404).json({ error: `Okänd stad: ${request.params.cityId}` });
      return;
    }

    response.status(200).json({ city: toCityDto(city) });
  });

  router.get("/weather/point", async (request, response) => {
    const lon = parseFloatInRange(request.query.lon, { min: -180, max: 180 });
    const lat = parseFloatInRange(request.query.lat, { min: -90, max: 90 });
    const forecastHours = parseForecastHours(request);

    if (lon == null || lat == null) {
      response.status(400).json({
        error: "Ogiltiga koordinater. Ange query-parametrar lon och lat."
      });
      return;
    }

    try {
      const weather = await fetchWeatherByPoint({ lon, lat, forecastHours });
      response.status(200).json(weather);
    } catch (error) {
      response.status(502).json({
        error: error instanceof Error ? error.message : "Kunde inte hämta väderdata."
      });
    }
  });

  router.get("/weather/cities", async (request, response) => {
    const { limit, offset } = parsePageQuery(request);
    const forecastHours = parseForecastHours(request);
    const forceRefresh = parseBoolean(request.query.refresh, false);

    try {
      const payload = await getCityWeather({
        forecastHours,
        forceRefresh,
        limit,
        offset
      });

      response.status(200).json(payload);
    } catch (error) {
      response.status(502).json({
        error: error instanceof Error ? error.message : "Kunde inte hämta stadsväder."
      });
    }
  });

  router.get("/weather/cities/:cityId", async (request, response) => {
    const city = getCityById(request.params.cityId);
    if (!city) {
      response.status(404).json({ error: `Okänd stad: ${request.params.cityId}` });
      return;
    }

    try {
      const weather = await fetchWeatherByPoint({
        lon: city.lon,
        lat: city.lat,
        forecastHours: parseForecastHours(request)
      });

      response.status(200).json({
        city: toCityDto(city),
        approvedTime: weather.approvedTime,
        current: weather.current,
        forecast: weather.forecast
      });
    } catch (error) {
      response.status(502).json({
        error: error instanceof Error ? error.message : "Kunde inte hämta stadsväder."
      });
    }
  });

  return router;
};
