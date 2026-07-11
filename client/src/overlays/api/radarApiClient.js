const API_BASE = "/api/radar";
const DEFAULT_TIMEOUT_MS = 12_000;

const fetchJson = async (url, { signal, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const onExternalAbort = () => controller.abort();
  signal?.addEventListener("abort", onExternalAbort, { once: true });

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Radar API ${response.status}: ${response.statusText}`);
    }
    return response.json();
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Radar API timeout: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", onExternalAbort);
  }
};

export const fetchRadarMetadata = async ({ signal, timeoutMs } = {}) =>
  fetchJson(`${API_BASE}/metadata`, { signal, timeoutMs });

export const fetchRadarFrames = async ({
  hours = 1,
  limit,
  refresh = false,
  signal,
  timeoutMs
} = {}) => {
  const params = new URLSearchParams({ hours: String(hours) });
  if (limit != null) {
    params.set("limit", String(limit));
  }
  if (refresh) {
    params.set("refresh", "true");
  }

  return fetchJson(`${API_BASE}/frames?${params.toString()}`, { signal, timeoutMs });
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
