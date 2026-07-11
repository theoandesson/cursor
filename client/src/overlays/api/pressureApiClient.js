const API_BASE = "/api/pressure";
const DEFAULT_TIMEOUT_MS = 15_000;

const fetchJson = async (url, { signal, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const onExternalAbort = () => controller.abort();
  signal?.addEventListener("abort", onExternalAbort, { once: true });

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Tryck API ${response.status}: ${response.statusText}`);
    }
    return response.json();
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Tryck API timeout: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", onExternalAbort);
  }
};

export const fetchPressureMetadata = async ({ signal, timeoutMs } = {}) =>
  fetchJson(`${API_BASE}/metadata`, { signal, timeoutMs });

export const fetchPressureFrames = async ({
  hours = 24,
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

export const buildPressureFrameUrl = (frameKey) => `${API_BASE}/frames/${frameKey}.geojson`;

export const fetchPressureFrame = async ({ frameKey, signal, timeoutMs } = {}) =>
  fetchJson(buildPressureFrameUrl(frameKey), { signal, timeoutMs });

export const preloadPressureFrame = async (frameKey) => {
  await fetchPressureFrame({ frameKey });
  return frameKey;
};
