import { SWEDISH_TRAFFIC_SEGMENTS } from "../data/swedishTrafficSegments.js";

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

const isWithinBbox = (coordinates, bbox) => {
  if (!bbox) {
    return true;
  }

  const { minLon, minLat, maxLon, maxLat } = bbox;
  if (minLon == null || minLat == null || maxLon == null || maxLat == null) {
    return true;
  }

  return coordinates.some(
    ([lon, lat]) => lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat
  );
};

const distanceToLineStringKm = (lon, lat, coordinates) => {
  let minDistanceKm = Infinity;

  for (let index = 0; index < coordinates.length; index += 1) {
    const [vertexLon, vertexLat] = coordinates[index];
    minDistanceKm = Math.min(minDistanceKm, haversineKm(lon, lat, vertexLon, vertexLat));

    if (index > 0) {
      const [prevLon, prevLat] = coordinates[index - 1];
      const midLon = (prevLon + vertexLon) / 2;
      const midLat = (prevLat + vertexLat) / 2;
      minDistanceKm = Math.min(minDistanceKm, haversineKm(lon, lat, midLon, midLat));
    }
  }

  return minDistanceKm;
};

export const toTrafficSegmentDto = (segment) => ({
  id: segment.id,
  roadName: segment.roadName,
  roadClass: segment.roadClass,
  trafficLevel: segment.trafficLevel,
  speedKmh: segment.speedKmh,
  geometry: {
    type: "LineString",
    coordinates: segment.coordinates
  }
});

export const toTrafficFeature = (segment) => ({
  type: "Feature",
  id: segment.id,
  geometry: {
    type: "LineString",
    coordinates: segment.coordinates
  },
  properties: {
    id: segment.id,
    roadName: segment.roadName,
    roadClass: segment.roadClass,
    trafficLevel: segment.trafficLevel,
    congestion: segment.trafficLevel,
    level: segment.trafficLevel,
    speedKmh: segment.speedKmh
  }
});

const filterSegments = ({ bbox, level } = {}) => {
  const normalizedLevel = (level ?? "").trim().toLowerCase();

  return SWEDISH_TRAFFIC_SEGMENTS.filter((segment) => {
    if (normalizedLevel && segment.trafficLevel !== normalizedLevel) {
      return false;
    }

    return isWithinBbox(segment.coordinates, bbox);
  });
};

export const listTrafficSegments = ({ bbox, limit, level } = {}) => {
  const filtered = filterSegments({ bbox, level });

  const safeLimit = Math.max(1, limit ?? filtered.length);
  const page = filtered.slice(0, safeLimit).map(toTrafficSegmentDto);

  return {
    total: filtered.length,
    limit: safeLimit,
    segments: page
  };
};

export const listTrafficGeoJson = ({ bbox, level, limit } = {}) => {
  const filtered = filterSegments({ bbox, level });
  const safeLimit = Math.max(1, limit ?? filtered.length);
  const page = filtered.slice(0, safeLimit).map(toTrafficFeature);

  return {
    total: filtered.length,
    limit: safeLimit,
    geojson: {
      type: "FeatureCollection",
      features: page
    }
  };
};

export const getTrafficNearPoint = ({ lon, lat, radiusKm = 10, limit = 20 } = {}) => {
  const safeRadiusKm = Math.max(0.1, radiusKm ?? 10);
  const safeLimit = Math.max(1, limit ?? 20);

  const ranked = SWEDISH_TRAFFIC_SEGMENTS.map((segment) => ({
    segment,
    distanceKm: distanceToLineStringKm(lon, lat, segment.coordinates)
  }))
    .filter(({ distanceKm }) => distanceKm <= safeRadiusKm)
    .sort((left, right) => left.distanceKm - right.distanceKm);

  const segments = ranked.slice(0, safeLimit).map(({ segment, distanceKm }) => ({
    ...toTrafficSegmentDto(segment),
    distanceKm: Number(distanceKm.toFixed(3))
  }));

  return {
    lon,
    lat,
    radiusKm: safeRadiusKm,
    limit: safeLimit,
    total: ranked.length,
    segments
  };
};
