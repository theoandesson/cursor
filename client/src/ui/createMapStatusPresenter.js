const STATUS_ELEMENT_ID = "map-status";
const LOD_BADGE_ID = "lod-badge";

const resolveBadgeText = ({ profile, message }) => {
  if (profile === "moving" && message.includes("turbo")) {
    return "LOD: Turbo";
  }
  return profile === "moving" ? "LOD: Rörelse" : "LOD: Stilla";
};

const createBadge = (rootElement) => {
  const badge = document.createElement("output");
  badge.id = LOD_BADGE_ID;
  badge.setAttribute("aria-live", "polite");
  rootElement.appendChild(badge);
  return badge;
};

export const createMapStatusPresenter = ({ mapRootElement }) => {
  const statusLine = document.getElementById(STATUS_ELEMENT_ID);
  const lodBadge = createBadge(mapRootElement);

  return ({ profile, message }) => {
    if (statusLine) {
      statusLine.textContent = message;
    }
    lodBadge.value = message;
    lodBadge.textContent = resolveBadgeText({ profile, message });
    lodBadge.dataset.profile = profile;
  };
};
