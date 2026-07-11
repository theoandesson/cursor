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

export const fetchTrafficSegments = async ({ bbox, limit, signal } = {}) => {
  const params = new URLSearchParams();
  if (bbox) {
    params.set("minLon", String(bbox.minLon));
    params.set("minLat", String(bbox.minLat));
    params.set("maxLon", String(bbox.maxLon));
    params.set("maxLat", String(bbox.maxLat));
  }
  if (limit != null) {
    params.set("limit", String(limit));
  }

  const query = params.toString();
  const payload = await fetchJson(
    `${API_BASE}/traffic/segments${query ? `?${query}` : ""}`,
    { signal }
  );
  return payload.segments ?? [];
};

export const fetchTrafficNear = async (
  lon,
  lat,
  { radiusKm = 10, limit = 20, signal } = {}
) => {
  const params = new URLSearchParams({
    lon: String(lon),
    lat: String(lat),
    radiusKm: String(radiusKm),
    limit: String(limit)
  });

  const payload = await fetchJson(`${API_BASE}/traffic/near?${params.toString()}`, {
    signal
  });
  return payload.segments ?? [];
};

export const fetchTraffic = async ({ bbox, level, signal } = {}) => {
  const params = new URLSearchParams();
  if (bbox) {
    params.set("minLon", String(bbox.minLon));
    params.set("minLat", String(bbox.minLat));
    params.set("maxLon", String(bbox.maxLon));
    params.set("maxLat", String(bbox.maxLat));
  }
  if (level) {
    params.set("level", level);
  }

  const query = params.toString();
  return fetchJson(`${API_BASE}/traffic${query ? `?${query}` : ""}`, { signal });
};

export const fetchTransit = async ({ bbox, mode, signal } = {}) => {
  const params = new URLSearchParams();
  if (bbox) {
    params.set("minLon", String(bbox.minLon));
    params.set("minLat", String(bbox.minLat));
    params.set("maxLon", String(bbox.maxLon));
    params.set("maxLat", String(bbox.maxLat));
  }
  if (mode) {
    params.set("mode", mode);
  }

  const query = params.toString();
  return fetchJson(`${API_BASE}/transit${query ? `?${query}` : ""}`, { signal });
};
