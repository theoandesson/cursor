const API_BASE = "/api";
const SEARCH_LIMIT = 8;
const DEBOUNCE_MS = 200;

let debounceTimer = null;

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API ${response.status}: ${response.statusText}`);
  }
  return response.json();
};

export const searchCities = async (query, { limit = SEARCH_LIMIT } = {}) => {
  const params = new URLSearchParams();
  const trimmed = query.trim();
  if (trimmed) {
    params.set("search", trimmed);
  }
  params.set("limit", String(limit));

  const payload = await fetchJson(`${API_BASE}/cities?${params.toString()}`);
  return payload.cities ?? [];
};

export const createDebouncedSearch = (onSearch) => {
  let requestId = 0;

  const search = (query) => {
    clearTimeout(debounceTimer);
    const currentRequest = ++requestId;

    return new Promise((resolve) => {
      debounceTimer = setTimeout(async () => {
        try {
          const results = await onSearch(query);
          if (currentRequest === requestId) {
            resolve({ results, error: null });
          }
        } catch (error) {
          if (currentRequest === requestId) {
            resolve({
              results: [],
              error: error instanceof Error ? error.message : "Sökningen misslyckades"
            });
          }
        }
      }, DEBOUNCE_MS);
    });
  };

  const cancel = () => {
    clearTimeout(debounceTimer);
    requestId += 1;
  };

  return { search, cancel };
};

const COORDINATE_PATTERN = /^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/;

export const parseCoordinates = (input) => {
  const match = input.trim().match(COORDINATE_PATTERN);
  if (!match) {
    return null;
  }

  const lat = Number.parseFloat(match[1]);
  const lon = Number.parseFloat(match[2]);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return null;
  }

  return { lat, lon, label: `${lat.toFixed(2)}°, ${lon.toFixed(2)}°` };
};

export const highlightMatch = (text, query) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return text;
  }

  const lowerText = text.toLowerCase();
  const index = lowerText.indexOf(normalizedQuery);
  if (index === -1) {
    return text;
  }

  const before = text.slice(0, index);
  const match = text.slice(index, index + normalizedQuery.length);
  const after = text.slice(index + normalizedQuery.length);
  return { before, match, after };
};
