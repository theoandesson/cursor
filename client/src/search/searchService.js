import { formatAddress } from "../shared/formatAddress.js";

const API_BASE = "/api";

const fetchJson = async (url, { signal } = {}) => {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`API ${response.status}: ${response.statusText}`);
  }
  return response.json();
};

const normalizeSearchResult = (result) => {
  if (!result || typeof result !== "object") {
    return null;
  }

  const lon = Number(result.lon ?? result.longitude ?? result.center?.[0]);
  const lat = Number(result.lat ?? result.latitude ?? result.center?.[1]);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    return null;
  }

  const label =
    result.label ??
    result.name ??
    result.displayName?.split(",")[0] ??
    result.title ??
    "Okänd plats";

  const subtitle =
    result.subtitle ||
    result.description ||
    (result.displayName && result.displayName !== label ? result.displayName : "") ||
    formatAddress(result.address) ||
    "";

  return {
    id: result.id ?? result.placeId ?? `${lon},${lat}`,
    label: String(label),
    subtitle,
    lon,
    lat,
    zoom: Number.isFinite(Number(result.zoom)) ? Number(result.zoom) : undefined,
    type: result.type ?? result.category ?? "place"
  };
};

export const searchPlaces = async (query, { signal, limit } = {}) => {
  const normalizedQuery = String(query ?? "").trim();
  if (!normalizedQuery) {
    return [];
  }

  const params = new URLSearchParams({ q: normalizedQuery });
  if (limit != null) {
    params.set("limit", String(limit));
  }

  const payload = await fetchJson(`${API_BASE}/search?${params.toString()}`, {
    signal
  });
  const rawResults = payload.results ?? payload.items ?? payload.data ?? [];

  return rawResults
    .map(normalizeSearchResult)
    .filter((result) => result !== null);
};
