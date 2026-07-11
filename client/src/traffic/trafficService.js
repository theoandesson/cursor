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
