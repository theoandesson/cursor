const STATUS_ELEMENT_ID = "map-status";
const LOD_BADGE_ID = "lod-badge";
const TILE_BADGE_ID = "tile-badge";

const resolveBadgeText = ({ profile, message }) => {
  if (profile === "moving" && message.includes("turbo")) {
    return "LOD: Turbo";
  }
  return profile === "moving" ? "LOD: Rörelse" : "LOD: Stilla";
};

const createBadge = (rootElement, id) => {
  const badge = document.createElement("output");
  badge.id = id;
  badge.setAttribute("aria-live", "polite");
  rootElement.appendChild(badge);
  return badge;
};

export const createMapStatusPresenter = ({ mapRootElement }) => {
  const statusLine = document.getElementById(STATUS_ELEMENT_ID);
  const lodBadge = createBadge(mapRootElement, LOD_BADGE_ID);
  const tileBadge = createBadge(mapRootElement, TILE_BADGE_ID);

  return ({ profile, message, visibleTileCount, zoomTier }) => {
    if (statusLine && message) {
      statusLine.textContent = message;
    }
    if (profile) {
      lodBadge.value = message ?? "";
      lodBadge.textContent = resolveBadgeText({ profile, message: message ?? "" });
      lodBadge.dataset.profile = profile;
      if (zoomTier) {
        lodBadge.dataset.zoomTier = zoomTier;
      }
    }
    if (visibleTileCount != null) {
      tileBadge.textContent = `Tiles: ${visibleTileCount}`;
      tileBadge.dataset.visibleTileCount = String(visibleTileCount);
    }
  };
};
