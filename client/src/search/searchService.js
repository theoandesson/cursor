const API_BASE = "/api";

const formatAddressValue = (address) => {
  if (!address) {
    return "";
  }

  if (typeof address === "string") {
    return address;
  }

  const street = [address.road, address.house_number].filter(Boolean).join(" ");
  const locality = address.city ?? address.town ?? address.village ?? address.suburb;
  return [street, [address.postcode, locality].filter(Boolean).join(" "), address.country]
    .filter(Boolean)
    .join(", ");
};

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
    result.subtitle ??
    result.description ??
    (result.displayName && result.displayName !== label ? result.displayName : "") ??
    formatAddressValue(result.address) ??
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

export const reverseGeocode = async (lon, lat, { signal } = {}) => {
  const normalizedLon = Number(lon);
  const normalizedLat = Number(lat);
  if (!Number.isFinite(normalizedLon) || !Number.isFinite(normalizedLat)) {
    throw new Error("Ogiltiga koordinater för omvänd sökning.");
  }

  const params = new URLSearchParams({
    lon: String(normalizedLon),
    lat: String(normalizedLat)
  });

  const payload = await fetchJson(
    `${API_BASE}/search/reverse?${params.toString()}`,
    { signal }
  );

  const rawResult = payload.result ?? payload.place ?? payload;
  const normalized = normalizeSearchResult(rawResult);
  if (!normalized) {
    throw new Error("Kunde inte tolka omvänd sökning.");
  }

  return normalized;
};
