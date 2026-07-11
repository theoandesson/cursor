import { POI_CATEGORY_BY_ID } from "../data/poiCategories.js";
import { SWEDISH_POIS } from "../data/swedishPois.js";

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

const isWithinBbox = (poi, bbox) => {
  if (!bbox) {
    return true;
  }

  const { minLon, minLat, maxLon, maxLat } = bbox;
  if (minLon == null || minLat == null || maxLon == null || maxLat == null) {
    return true;
  }

  return poi.lon >= minLon && poi.lon <= maxLon && poi.lat >= minLat && poi.lat <= maxLat;
};

export const toPoiDto = (poi) => {
  const category = POI_CATEGORY_BY_ID[poi.category];

  return {
    id: poi.id,
    name: poi.name,
    category: poi.category,
    categoryName: category?.name ?? poi.category,
    lon: poi.lon,
    lat: poi.lat,
    address: poi.address,
    ...(poi.openingHours ? { openingHours: poi.openingHours } : {}),
    ...(poi.cityId ? { cityId: poi.cityId } : {})
  };
};

export const listPois = ({ search, category, bbox, limit, offset } = {}) => {
  const normalizedSearch = (search ?? "").trim().toLowerCase();
  const normalizedCategory = (category ?? "").trim().toLowerCase();

  const filtered = SWEDISH_POIS.filter((poi) => {
    if (normalizedCategory && poi.category !== normalizedCategory) {
      return false;
    }

    if (!isWithinBbox(poi, bbox)) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return (
      poi.name.toLowerCase().includes(normalizedSearch) ||
      poi.id.toLowerCase().includes(normalizedSearch) ||
      poi.address.toLowerCase().includes(normalizedSearch) ||
      (poi.cityId?.toLowerCase().includes(normalizedSearch) ?? false)
    );
  });

  const safeOffset = Math.max(0, offset ?? 0);
  const safeLimit = Math.max(1, limit ?? filtered.length);
  const page = filtered.slice(safeOffset, safeOffset + safeLimit).map(toPoiDto);

  return {
    total: filtered.length,
    limit: safeLimit,
    offset: safeOffset,
    pois: page
  };
};

export const getPoiById = (id) => SWEDISH_POIS.find((poi) => poi.id === id) ?? null;

export const getPoisNearPoint = ({ lon, lat, radiusKm = 5, limit = 20 } = {}) => {
  const safeRadiusKm = Math.max(0.1, radiusKm ?? 5);
  const safeLimit = Math.max(1, limit ?? 20);

  const ranked = SWEDISH_POIS.map((poi) => ({
    poi,
    distanceKm: haversineKm(lon, lat, poi.lon, poi.lat)
  }))
    .filter(({ distanceKm }) => distanceKm <= safeRadiusKm)
    .sort((left, right) => left.distanceKm - right.distanceKm);

  const pois = ranked.slice(0, safeLimit).map(({ poi, distanceKm }) => ({
    ...toPoiDto(poi),
    distanceKm: Number(distanceKm.toFixed(3))
  }));

  return {
    lon,
    lat,
    radiusKm: safeRadiusKm,
    limit: safeLimit,
    total: ranked.length,
    pois
  };
};
