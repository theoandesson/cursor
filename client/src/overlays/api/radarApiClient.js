const API_BASE = "/api/radar";

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Radar API ${response.status}: ${response.statusText}`);
  }
  return response.json();
};

export const fetchRadarMetadata = async () => fetchJson(`${API_BASE}/metadata`);

export const fetchRadarFrames = async ({ hours = 1, limit, refresh = false } = {}) => {
  const params = new URLSearchParams({ hours: String(hours) });
  if (limit != null) {
    params.set("limit", String(limit));
  }
  if (refresh) {
    params.set("refresh", "true");
  }

  return fetchJson(`${API_BASE}/frames?${params.toString()}`);
};

export const buildRadarImageUrl = (frameKey) => `${API_BASE}/frames/${frameKey}.png`;

export const preloadRadarImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(url);
    image.onerror = () => reject(new Error(`Kunde inte förladda radarbild: ${url}`));
    image.src = url;
  });
