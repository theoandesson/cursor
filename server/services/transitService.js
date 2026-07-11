import { SWEDISH_TRANSIT_LINES } from "../data/swedishTransitLines.js";
import { SWEDISH_TRANSIT_STOPS } from "../data/swedishTransitStops.js";

const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const haversineKm = (lon1, lat1, lon2, lat2) => {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const toLineDto = (line) => ({
  lineId: line.lineId,
  name: line.name,
  color: line.color,
  type: line.type,
  cityId: line.cityId,
  geometry: {
    type: "LineString",
    coordinates: line.coordinates
  }
});

export const toStopDto = (stop) => ({
  stopId: stop.stopId,
  name: stop.name,
  lon: stop.lon,
  lat: stop.lat,
  cityId: stop.cityId,
  type: stop.type,
  lineIds: stop.lineIds
});

export const listLines = ({ cityId, type, limit, offset } = {}) => {
  const normalizedCity = (cityId ?? "").trim().toLowerCase();
  const normalizedType = (type ?? "").trim().toLowerCase();

  const filtered = SWEDISH_TRANSIT_LINES.filter((line) => {
    if (normalizedCity && line.cityId !== normalizedCity) {
      return false;
    }
    if (normalizedType && line.type !== normalizedType) {
      return false;
    }
    return true;
  });

  const safeOffset = Math.max(0, offset ?? 0);
  const safeLimit = Math.max(1, limit ?? filtered.length);
  const page = filtered.slice(safeOffset, safeOffset + safeLimit).map(toLineDto);

  return {
    total: filtered.length,
    limit: safeLimit,
    offset: safeOffset,
    lines: page
  };
};

export const listStops = ({ cityId, type, lineId, search, limit, offset } = {}) => {
  const normalizedCity = (cityId ?? "").trim().toLowerCase();
  const normalizedType = (type ?? "").trim().toLowerCase();
  const normalizedLineId = (lineId ?? "").trim().toLowerCase();
  const normalizedSearch = (search ?? "").trim().toLowerCase();

  const filtered = SWEDISH_TRANSIT_STOPS.filter((stop) => {
    if (normalizedCity && stop.cityId !== normalizedCity) {
      return false;
    }
    if (normalizedType && stop.type !== normalizedType) {
      return false;
    }
    if (normalizedLineId && !stop.lineIds.some((id) => id === normalizedLineId)) {
      return false;
    }
    if (!normalizedSearch) {
      return true;
    }
    return (
      stop.name.toLowerCase().includes(normalizedSearch) ||
      stop.stopId.toLowerCase().includes(normalizedSearch)
    );
  });

  const safeOffset = Math.max(0, offset ?? 0);
  const safeLimit = Math.max(1, limit ?? filtered.length);
  const page = filtered.slice(safeOffset, safeOffset + safeLimit).map(toStopDto);

  return {
    total: filtered.length,
    limit: safeLimit,
    offset: safeOffset,
    stops: page
  };
};

export const getStopsNearPoint = ({ lon, lat, radiusKm = 2, limit = 20 } = {}) => {
  const safeRadiusKm = Math.max(0.1, radiusKm ?? 2);
  const safeLimit = Math.max(1, limit ?? 20);

  const ranked = SWEDISH_TRANSIT_STOPS.map((stop) => ({
    stop,
    distanceKm: haversineKm(lon, lat, stop.lon, stop.lat)
  }))
    .filter(({ distanceKm }) => distanceKm <= safeRadiusKm)
    .sort((left, right) => left.distanceKm - right.distanceKm);

  const stops = ranked.slice(0, safeLimit).map(({ stop, distanceKm }) => ({
    ...toStopDto(stop),
    distanceKm: Number(distanceKm.toFixed(3))
  }));

  return {
    lon,
    lat,
    radiusKm: safeRadiusKm,
    limit: safeLimit,
    total: ranked.length,
    stops
  };
};

const TYPE_TO_MODE = {
  tunnelbana: "metro",
  spårvagn: "tram",
  pendeltåg: "rail",
  stadstunnel: "rail"
};

const isWithinBbox = (lon, lat, bbox) => {
  if (!bbox) {
    return true;
  }

  const { minLon, minLat, maxLon, maxLat } = bbox;
  return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;
};

const lineIntersectsBbox = (coordinates, bbox) => {
  if (!bbox) {
    return true;
  }

  return coordinates.some(([lon, lat]) => isWithinBbox(lon, lat, bbox));
};

/** Legacy GeoJSON bundle for GET /api/transit. */
export const listTransit = ({ bbox, mode } = {}) => {
  const normalizedMode = (mode ?? "").trim().toLowerCase();

  const lines = SWEDISH_TRANSIT_LINES.filter((line) => {
    const lineMode = TYPE_TO_MODE[line.type] ?? line.type;
    if (normalizedMode && lineMode !== normalizedMode) {
      return false;
    }
    return lineIntersectsBbox(line.coordinates, bbox);
  });

  const stops = SWEDISH_TRANSIT_STOPS.filter((stop) => {
    const stopMode = TYPE_TO_MODE[stop.type] ?? stop.type;
    if (normalizedMode && stopMode !== normalizedMode) {
      return false;
    }
    return isWithinBbox(stop.lon, stop.lat, bbox);
  });

  const features = [
    ...lines.map((line) => ({
      type: "Feature",
      geometry: { type: "LineString", coordinates: line.coordinates },
      properties: {
        id: line.lineId,
        name: line.name,
        mode: TYPE_TO_MODE[line.type] ?? line.type,
        color: line.color,
        class: TYPE_TO_MODE[line.type] ?? line.type
      }
    })),
    ...stops.map((stop) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [stop.lon, stop.lat] },
      properties: {
        id: stop.stopId,
        name: stop.name,
        mode: TYPE_TO_MODE[stop.type] ?? stop.type,
        class: "station"
      }
    }))
  ];

  return {
    type: "FeatureCollection",
    features,
    meta: {
      lineCount: lines.length,
      stopCount: stops.length
    }
  };
};
