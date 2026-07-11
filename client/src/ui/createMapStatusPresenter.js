const STATUS_ELEMENT_ID = "map-status";
const LOD_BADGE_ID = "lod-badge";
const TILE_BADGE_ID = "tile-badge";

const ZOOM_TIER_LABELS = Object.freeze({
  far: "långt",
  medium: "mellan",
  close: "nära"
});

const resolveBadgeText = ({ profile, zoomTier }) => {
  const tierLabel = zoomTier ? ZOOM_TIER_LABELS[zoomTier] : null;
  const profileLabel = profile === "moving" ? "Rörelse" : "Stilla";
  return tierLabel ? `LOD: ${profileLabel} (${tierLabel})` : `LOD: ${profileLabel}`;
};

const createBadge = (rootElement, id) => {
  const existing = document.getElementById(id);
  if (existing) {
    return existing;
  }

  const badge = document.createElement("output");
  badge.id = id;
  badge.setAttribute("aria-live", "polite");
  rootElement.appendChild(badge);
  return badge;
};

export const createMapStatusPresenter = ({ mapRootElement }) => {
  const statusLine = document.getElementById(STATUS_ELEMENT_ID);
  if (statusLine) {
    statusLine.setAttribute("aria-live", "polite");
    statusLine.setAttribute("aria-atomic", "true");
  }
  const lodBadge = createBadge(mapRootElement, LOD_BADGE_ID);
  const tileBadge = createBadge(mapRootElement, TILE_BADGE_ID);

  return ({ profile, message, visibleTileCount, zoomTier }) => {
    if (statusLine && message) {
      statusLine.textContent = message;
    }
    if (profile) {
      lodBadge.textContent = resolveBadgeText({ profile, zoomTier });
      lodBadge.dataset.profile = profile;
      if (zoomTier) {
        lodBadge.dataset.zoomTier = zoomTier;
      }
    }
    if (visibleTileCount != null) {
      tileBadge.textContent = `Tiles i vy: ${visibleTileCount}`;
      tileBadge.dataset.visibleTileCount = String(visibleTileCount);
    }
  };
};
