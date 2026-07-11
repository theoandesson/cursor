import { ROUTES } from "./routes.js";

const ROUTE_LABELS = Object.freeze({
  [ROUTES.MAP]: "Karta",
  [ROUTES.CITIES]: "Städer",
  [ROUTES.PERF]: "Prestanda"
});

const NAV_STATES = Object.freeze({
  COLLAPSED: "collapsed",
  EXPANDED: "expanded",
  PINNED: "pinned"
});

const DEFAULT_OPTIONS = Object.freeze({
  hoverZoneHeight: 52,
  collapseDelayMs: 2200,
  panelRoutes: new Set([ROUTES.CITIES, ROUTES.PERF])
});

const createTriggerIcon = () => {
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("class", "nav-reveal-trigger__icon");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML =
    '<path fill="currentColor" d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5 1.5 1.5 0 0 1 18.5 9h-13A1.5 1.5 0 0 1 4 7.5Zm0 5A1.5 1.5 0 0 1 5.5 11h13a1.5 1.5 0 0 1 0 3h-13A1.5 1.5 0 0 1 4 12.5Zm0 5A1.5 1.5 0 0 1 5.5 16h13a1.5 1.5 0 0 1 0 3h-13A1.5 1.5 0 0 1 4 17.5Z"/>';
  return icon;
};

export const createNavRevealController = ({
  shellElement,
  topBarElement,
  getRoute,
  options = {}
}) => {
  if (!shellElement || !topBarElement) {
    throw new Error("createNavRevealController kräver shellElement och topBarElement.");
  }

  const config = {
    ...DEFAULT_OPTIONS,
    ...options,
    panelRoutes: options.panelRoutes
      ? new Set(options.panelRoutes)
      : new Set(DEFAULT_OPTIONS.panelRoutes)
  };
  const listeners = [];
  let collapseTimer = null;
  let currentRoute = ROUTES.MAP;
  let navState = NAV_STATES.COLLAPSED;
  let isPointerInHoverZone = false;
  let isPointerInTopBar = false;

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.id = "nav-reveal-trigger";
  trigger.className = "nav-reveal-trigger";
  trigger.setAttribute("aria-label", "Visa navigering");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", "top-bar-surface");

  const routeLabel = document.createElement("span");
  routeLabel.className = "nav-reveal-trigger__route";
  routeLabel.textContent = ROUTE_LABELS[ROUTES.MAP];

  trigger.append(createTriggerIcon(), routeLabel);

  const hoverZone = document.createElement("div");
  hoverZone.className = "nav-reveal-hover-zone";
  hoverZone.setAttribute("aria-hidden", "true");

  let surface = topBarElement.querySelector("#top-bar-surface");
  if (!surface) {
    surface = document.createElement("div");
    surface.id = "top-bar-surface";
    surface.className = "top-bar__surface";

    while (topBarElement.firstChild) {
      surface.appendChild(topBarElement.firstChild);
    }

    topBarElement.append(surface);
  }

  topBarElement.prepend(trigger);
  shellElement.appendChild(hoverZone);

  const clearCollapseTimer = () => {
    if (collapseTimer) {
      window.clearTimeout(collapseTimer);
      collapseTimer = null;
    }
  };

  const shouldStayExpanded = () =>
    config.panelRoutes.has(currentRoute) || navState === NAV_STATES.PINNED;

  const applyState = () => {
    const isExpanded =
      navState === NAV_STATES.EXPANDED || navState === NAV_STATES.PINNED;

    shellElement.dataset.navState = navState;
    topBarElement.dataset.navState = navState;
    trigger.setAttribute("aria-expanded", isExpanded ? "true" : "false");
    trigger.setAttribute(
      "aria-label",
      isExpanded ? "Dölj navigering" : "Visa navigering"
    );
    hoverZone.hidden = shouldStayExpanded() || isExpanded;
  };

  const setNavState = (nextState) => {
    if (navState === nextState) {
      applyState();
      return;
    }

    navState = nextState;
    applyState();
  };

  const scheduleCollapse = () => {
    clearCollapseTimer();

    if (shouldStayExpanded() || isPointerInTopBar || isPointerInHoverZone) {
      return;
    }

    collapseTimer = window.setTimeout(() => {
      if (!shouldStayExpanded() && !isPointerInTopBar && !isPointerInHoverZone) {
        setNavState(NAV_STATES.COLLAPSED);
      }
    }, config.collapseDelayMs);
  };

  const reveal = () => {
    if (shouldStayExpanded()) {
      return;
    }

    clearCollapseTimer();
    setNavState(NAV_STATES.EXPANDED);
  };

  const collapse = () => {
    if (shouldStayExpanded()) {
      return;
    }

    setNavState(NAV_STATES.COLLAPSED);
  };

  const togglePinned = () => {
    if (navState === NAV_STATES.PINNED) {
      clearCollapseTimer();
      setNavState(NAV_STATES.COLLAPSED);
      return;
    }

    if (config.panelRoutes.has(currentRoute)) {
      return;
    }

    clearCollapseTimer();
    setNavState(NAV_STATES.PINNED);
  };

  const syncWithRoute = (route) => {
    currentRoute = route;
    routeLabel.textContent = ROUTE_LABELS[route] ?? route;

    if (config.panelRoutes.has(route)) {
      clearCollapseTimer();
      setNavState(NAV_STATES.PINNED);
      return;
    }

    if (navState === NAV_STATES.PINNED) {
      setNavState(NAV_STATES.COLLAPSED);
      return;
    }

    applyState();
  };

  const addListener = (target, type, handler, listenerOptions) => {
    target.addEventListener(type, handler, listenerOptions);
    listeners.push(() => target.removeEventListener(type, handler, listenerOptions));
  };

  addListener(trigger, "click", (event) => {
    event.stopPropagation();
    togglePinned();
  });

  addListener(hoverZone, "mouseenter", () => {
    isPointerInHoverZone = true;
    reveal();
  });

  addListener(hoverZone, "mouseleave", () => {
    isPointerInHoverZone = false;
    scheduleCollapse();
  });

  addListener(topBarElement, "mouseenter", () => {
    isPointerInTopBar = true;
    reveal();
  });

  addListener(topBarElement, "mouseleave", () => {
    isPointerInTopBar = false;
    scheduleCollapse();
  });

  addListener(topBarElement, "focusin", () => {
    reveal();
  });

  addListener(topBarElement, "focusout", (event) => {
    if (topBarElement.contains(event.relatedTarget)) {
      return;
    }
    scheduleCollapse();
  });

  addListener(document, "keydown", (event) => {
    if (event.key === "Escape" && navState !== NAV_STATES.COLLAPSED) {
      if (navState === NAV_STATES.PINNED) {
        setNavState(NAV_STATES.COLLAPSED);
      } else {
        collapse();
      }
    }
  });

  syncWithRoute(getRoute?.() ?? ROUTES.MAP);

  return {
    syncWithRoute,
    reveal,
    collapse,
    destroy: () => {
      clearCollapseTimer();
      releaseListeners(listeners);
      trigger.remove();
      hoverZone.remove();
      delete shellElement.dataset.navState;
      delete topBarElement.dataset.navState;
    }
  };
};

const releaseListeners = (listeners) => {
  while (listeners.length > 0) {
    const release = listeners.pop();
    release?.();
  }
};
