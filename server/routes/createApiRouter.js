import { Router } from "express";
import { parseBoolean, parseFloatInRange, parseIntegerInRange } from "../lib/parseQuery.js";
import { getCityById, getCityWeather, listCities, toCityDto } from "../services/cityWeatherService.js";
import { reverseGeocode, searchPlaces } from "../services/geocodingService.js";
import { getPoiById, getPoisNearPoint, listPois, toPoiDto } from "../services/poiService.js";
import { fetchWeatherByPoint } from "../services/smhiWeatherService.js";
import { createTileProxyService } from "../services/tileProxyService.js";

const tileProxy = createTileProxyService();

const MAX_PAGE_SIZE = 300;
const MAX_FORECAST_HOURS = 48;
const MAX_POI_RADIUS_KM = 100;
const DEFAULT_POI_RADIUS_KM = 5;
const DEFAULT_NEAR_POI_LIMIT = 20;
const MAX_SEARCH_LIMIT = 20;
const DEFAULT_SEARCH_LIMIT = 8;
const SWEDEN_BOUNDS = {
  minLon: 9.5,
  minLat: 54.8,
  maxLon: 24.8,
  maxLat: 69.7
};

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

const parseSearchLimit = (request) =>
  parseIntegerInRange(request.query.limit, {
    min: 1,
    max: MAX_SEARCH_LIMIT
  }) ?? DEFAULT_SEARCH_LIMIT;

const parseSearchQuery = (request) => String(request.query.q ?? "").trim();

const parseSwedenCoordinates = (request) => {
  const lon = parseFloatInRange(request.query.lon, {
    min: SWEDEN_BOUNDS.minLon,
    max: SWEDEN_BOUNDS.maxLon
  });
  const lat = parseFloatInRange(request.query.lat, {
    min: SWEDEN_BOUNDS.minLat,
    max: SWEDEN_BOUNDS.maxLat
  });

  return { lon, lat };
};

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
        { method: "GET", path: "/api/weather/cities/:cityId", description: "Väder för en specifik stad" },
        { method: "GET", path: "/api/tiles/proxy?url=", description: "CORS-säker tile-proxy med minnescache" },
        { method: "GET", path: "/api/tiles/proxy/stats", description: "Tile-proxy cachestatistik" },
        { method: "GET", path: "/api/search?q=&limit=", description: "Autocomplete-sökning av platser i Sverige" },
        { method: "GET", path: "/api/search/reverse?lon=&lat=", description: "Omvänd geokodning för koordinater i Sverige" },
        { method: "GET", path: "/api/pois?search=&category=&limit=&offset=", description: "Lista POI (sökbar + pagination)" },
        { method: "GET", path: "/api/pois/near?lon=&lat=&radiusKm=5&limit=20", description: "POI nära en punkt" },
        { method: "GET", path: "/api/pois/:poiId", description: "Hämta en POI via id" }
      ]
    });
  });

  router.get("/search", async (request, response) => {
    const query = parseSearchQuery(request);
    const limit = parseSearchLimit(request);

    if (!query) {
      response.status(400).json({
        error: "Ogiltig sökfråga. Ange query-parameter q."
      });
      return;
    }

    try {
      const results = await searchPlaces({ query, limit });
      response.status(200).json(results);
    } catch (error) {
      response.status(502).json({
        error: error instanceof Error ? error.message : "Kunde inte söka platser."
      });
    }
  });

  router.get("/search/reverse", async (request, response) => {
    const { lon, lat } = parseSwedenCoordinates(request);

    if (lon == null || lat == null) {
      response.status(400).json({
        error: "Ogiltiga koordinater. Ange query-parametrar lon och lat inom Sveriges gränser."
      });
      return;
    }

    try {
      const result = await reverseGeocode({ lon, lat });
      response.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kunde inte geokoda koordinaterna.";
      const status = message.includes("Ingen plats hittades") ? 404 : 502;
      response.status(status).json({ error: message });
    }
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

  router.get("/pois", (request, response) => {
    const { limit, offset } = parsePageQuery(request);
    const search = String(request.query.search ?? "").trim();
    const category = String(request.query.category ?? "").trim();

    response.status(200).json(listPois({ search, category, limit, offset }));
  });

  router.get("/pois/near", (request, response) => {
    const lon = parseFloatInRange(request.query.lon, { min: -180, max: 180 });
    const lat = parseFloatInRange(request.query.lat, { min: -90, max: 90 });
    const radiusKm =
      parseFloatInRange(request.query.radiusKm, { min: 0.1, max: MAX_POI_RADIUS_KM }) ??
      DEFAULT_POI_RADIUS_KM;
    const limit =
      parseIntegerInRange(request.query.limit, { min: 1, max: MAX_PAGE_SIZE }) ??
      DEFAULT_NEAR_POI_LIMIT;

    if (lon == null || lat == null) {
      response.status(400).json({
        error: "Ogiltiga koordinater. Ange query-parametrar lon och lat."
      });
      return;
    }

    response.status(200).json(getPoisNearPoint({ lon, lat, radiusKm, limit }));
  });

  router.get("/pois/:poiId", (request, response) => {
    const poi = getPoiById(request.params.poiId);
    if (!poi) {
      response.status(404).json({ error: `Okänd POI: ${request.params.poiId}` });
      return;
    }

    response.status(200).json({ poi: toPoiDto(poi) });
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

  router.get("/tiles/proxy/stats", (_request, response) => {
    response.status(200).json(tileProxy.getCacheStats());
  });

  router.get("/tiles/proxy", async (request, response) => {
    const rawUrl = String(request.query.url ?? "").trim();
    const result = await tileProxy.proxyTile(rawUrl);

    if (!result.ok) {
      response.status(result.status).json(result.body);
      return;
    }

    response.setHeader("Content-Type", result.contentType);
    response.setHeader("Cache-Control", "public, max-age=900");
    response.setHeader("X-Tile-Proxy-Cache", result.cache);
    response.status(result.status).send(result.buffer);
  });

  return router;
};
