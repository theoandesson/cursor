export const ROUTES = Object.freeze({
  MAP: "map",
  CITIES: "cities",
  PERF: "perf"
});

const VALID_ROUTES = new Set(Object.values(ROUTES));

export const parseHash = (hash = window.location.hash) => {
  const normalized = String(hash).replace(/^#\/?/, "").split(/[?/]/)[0].toLowerCase();
  return VALID_ROUTES.has(normalized) ? normalized : ROUTES.MAP;
};

export const buildHash = (route) => {
  const resolved = VALID_ROUTES.has(route) ? route : ROUTES.MAP;
  return `#/${resolved}`;
};
