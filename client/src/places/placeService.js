import { formatAddress } from "../shared/formatAddress.js";

const API_BASE = "/api";

const fetchJson = async (url, { signal } = {}) => {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = payload.error ?? `API ${response.status}: ${response.statusText}`;
    throw new Error(message);
  }
  return response.json();
};

export const normalizePlace = (raw = {}, fallbackLon, fallbackLat) => {
  const lon = Number(raw.lon ?? raw.longitude ?? fallbackLon);
  const lat = Number(raw.lat ?? raw.latitude ?? fallbackLat);

  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    throw new Error("Ogiltiga koordinater.");
  }

  return {
    id: raw.id ?? raw.placeId ?? `${lon},${lat}`,
    name: raw.name ?? raw.label ?? "Okänd plats",
    displayName: raw.displayName ?? raw.subtitle ?? "",
    address: formatAddress(raw.address) || raw.subtitle || raw.displayName || "",
    lon,
    lat,
    category: raw.category ?? raw.type ?? "place",
    type: raw.type ?? null,
    categoryName: raw.categoryName ?? null,
    zoom: Number.isFinite(Number(raw.zoom)) ? Number(raw.zoom) : undefined
  };
};

export const fetchPois = async ({
  search,
  category,
  limit,
  offset,
  signal
} = {}) => {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (category) params.set("category", category);
  if (limit != null) params.set("limit", String(limit));
  if (offset != null) params.set("offset", String(offset));

  const query = params.toString();
  const payload = await fetchJson(`${API_BASE}/pois${query ? `?${query}` : ""}`, {
    signal
  });
  return payload.pois ?? [];
};

export const fetchPoisNear = async (
  lon,
  lat,
  { radiusKm = 5, limit = 8, signal } = {}
) => {
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    throw new Error("Ogiltiga koordinater.");
  }

  const params = new URLSearchParams({
    lon: String(lon),
    lat: String(lat),
    radiusKm: String(radiusKm),
    limit: String(limit)
  });

  const payload = await fetchJson(`${API_BASE}/pois/near?${params.toString()}`, {
    signal
  });
  return payload.pois ?? [];
};

export const fetchReverseGeocode = async (lon, lat, { signal } = {}) => {
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    throw new Error("Ogiltiga koordinater.");
  }

  const params = new URLSearchParams({
    lon: String(lon),
    lat: String(lat)
  });

  const payload = await fetchJson(
    `${API_BASE}/search/reverse?${params.toString()}`,
    { signal }
  );

  return normalizePlace(payload.place ?? payload, lon, lat);
};

export const fetchPoiById = async (poiId, { signal } = {}) => {
  const payload = await fetchJson(`${API_BASE}/pois/${encodeURIComponent(poiId)}`, {
    signal
  });
  return normalizePlace(payload.poi ?? payload);
};
