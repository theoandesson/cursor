import { ROUTES } from "../navigation/routes.js";

export const createPanelHost = ({ mapRootElement }) => {
  if (!mapRootElement) {
    throw new Error("createPanelHost kräver mapRootElement.");
  }

  const panels = new Map();
  let activePanel = ROUTES.MAP;

  mapRootElement.classList.add("panel-host");

  const overlayRoot = document.createElement("div");
  overlayRoot.className = "panel-host__overlay";
  overlayRoot.setAttribute("aria-live", "polite");
  mapRootElement.appendChild(overlayRoot);

  const setMapAccessible = (accessible) => {
    mapRootElement
      .querySelectorAll(".maplibregl-map, .maplibregl-control-container, .map-loading-overlay")
      .forEach((element) => {
        element.setAttribute("aria-hidden", accessible ? "false" : "true");
        element.inert = !accessible;
      });
  };

  const setMapVisible = (visible) => {
    mapRootElement.classList.toggle("panel-host--map-hidden", !visible);
    setMapAccessible(visible);
  };

  const hideAllPanels = () => {
    panels.forEach((element) => {
      element.hidden = true;
      element.setAttribute("aria-hidden", "true");
    });
  };

  const showPanel = (panelId) => {
    if (panelId === ROUTES.MAP) {
      hideAllPanels();
      setMapVisible(true);
      activePanel = ROUTES.MAP;
      return;
    }

    setMapVisible(false);
    panels.forEach((element, id) => {
      const isActive = id === panelId;
      element.hidden = !isActive;
      element.setAttribute("aria-hidden", isActive ? "false" : "true");
    });
    activePanel = panelId;
  };

  return {
    showPanel,
    hideAllPanels,
    getActivePanel: () => activePanel,
    mountPanel: (panelId, element) => {
      element.classList.add("app-panel");
      if (!element.id) {
        element.id = `${panelId}-panel`;
      }
      element.setAttribute("role", "tabpanel");
      element.setAttribute("aria-labelledby", `app-tab-${panelId}`);
      element.hidden = true;
      element.setAttribute("aria-hidden", "true");
      panels.set(panelId, element);
      overlayRoot.appendChild(element);
    }
  };
};
