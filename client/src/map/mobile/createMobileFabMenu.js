import { MAP_MODE_OPTIONS } from "../modes/mapModes.js";

const ROOT_CLASS = "mobile-fab maplibregl-ctrl";
const BUTTON_CLASS = "mobile-fab__button";
const SHEET_CLASS = "mobile-sheet";
const BACKDROP_CLASS = "mobile-sheet__backdrop";
const PANEL_CLASS = "mobile-sheet__panel";
const HANDLE_CLASS = "mobile-sheet__handle";
const SECTION_CLASS = "mobile-sheet__section";
const SECTION_TITLE_CLASS = "mobile-sheet__section-title";
const GRID_CLASS = "mobile-sheet__grid";
const PILL_CLASS = "mobile-sheet__pill";
const TOGGLE_CLASS = "mobile-sheet__toggle";
const CLOSE_CLASS = "mobile-sheet__close";

const MOBILE_MEDIA = "(max-width: 720px)";

const releaseListeners = (listeners) => {
  while (listeners.length > 0) {
    listeners.pop()?.();
  }
};

const createSection = (title) => {
  const section = document.createElement("section");
  section.className = SECTION_CLASS;

  const heading = document.createElement("h3");
  heading.className = SECTION_TITLE_CLASS;
  heading.textContent = title;
  section.appendChild(heading);

  return { section, heading };
};

export const createMobileFabMenu = ({
  getDayNight,
  getMapMode,
  getOverlayManager
}) => {
  let root = null;
  let fabButton = null;
  let sheet = null;
  let backdrop = null;
  let panel = null;
  let isOpen = false;
  let layerButtons = new Map();
  let modeButtons = new Map();
  let dayNightButton = null;
  const listeners = [];
  let mediaQuery = null;

  const syncDayNight = () => {
    const controller = getDayNight?.();
    if (!dayNightButton || !controller) {
      return;
    }

    const isNight = controller.getMode() === "night";
    dayNightButton.dataset.state = isNight ? "active" : "idle";
    dayNightButton.textContent = isNight ? "Nattläge" : "Dagläge";
    dayNightButton.setAttribute("aria-pressed", String(isNight));
  };

  const syncMapModes = () => {
    const control = getMapMode?.();
    if (!control) {
      return;
    }

    const activeMode = control.getMode?.();
    modeButtons.forEach((button, mode) => {
      const isActive = mode === activeMode;
      button.dataset.state = isActive ? "active" : "idle";
      button.setAttribute("aria-checked", String(isActive));
    });
  };

  const syncLayers = () => {
    const manager = getOverlayManager?.();
    if (!manager) {
      return;
    }

    const overlays = manager.getState?.().overlays ?? [];
    overlays.forEach((overlay) => {
      const button = layerButtons.get(overlay.id);
      if (!button) {
        return;
      }

      button.dataset.state = overlay.visible ? "active" : "idle";
      button.setAttribute("aria-pressed", String(overlay.visible));
      button.disabled = overlay.status === "loading";
    });
  };

  const syncSheet = () => {
    syncDayNight();
    syncMapModes();
    syncLayers();
  };

  const setOpen = (nextOpen) => {
    isOpen = nextOpen;
    root?.classList.toggle("mobile-fab--sheet-open", nextOpen);
    sheet?.classList.toggle("mobile-sheet--open", nextOpen);
    fabButton?.setAttribute("aria-expanded", String(nextOpen));
    document.body.classList.toggle("mobile-sheet-active", nextOpen);

    if (nextOpen) {
      syncSheet();
      panel?.focus();
    }
  };

  const close = () => setOpen(false);
  const toggle = () => setOpen(!isOpen);

  const buildLayerSection = () => {
    const { section } = createSection("Lager");
    const list = document.createElement("div");
    list.className = "mobile-sheet__toggles";
    list.setAttribute("role", "group");
    list.setAttribute("aria-label", "Kartlager");

    const manager = getOverlayManager?.();
    const overlays = manager?.getState?.().overlays ?? [];

    overlays.forEach((overlay) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = TOGGLE_CLASS;
      button.textContent = overlay.label;
      button.setAttribute("aria-label", `Växla ${overlay.label}`);

      const onClick = async () => {
        await manager.toggleVisible(overlay.id);
        syncLayers();
      };

      button.addEventListener("click", onClick);
      listeners.push(() => button.removeEventListener("click", onClick));
      layerButtons.set(overlay.id, button);
      list.appendChild(button);
    });

    if (!overlays.length) {
      const empty = document.createElement("p");
      empty.className = "mobile-sheet__empty";
      empty.textContent = "Lager laddas…";
      list.appendChild(empty);
    }

    section.appendChild(list);
    return section;
  };

  const buildModeSection = () => {
    const { section } = createSection("Kartläge");
    const grid = document.createElement("div");
    grid.className = GRID_CLASS;
    grid.setAttribute("role", "radiogroup");
    grid.setAttribute("aria-label", "Kartlägen");

    MAP_MODE_OPTIONS.forEach(({ id, label, title }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = PILL_CLASS;
      button.textContent = label;
      button.title = title;
      button.setAttribute("role", "radio");
      button.setAttribute("aria-label", title);

      const onClick = () => {
        getMapMode?.()?.switchMode?.(id);
        syncMapModes();
      };

      button.addEventListener("click", onClick);
      listeners.push(() => button.removeEventListener("click", onClick));
      modeButtons.set(id, button);
      grid.appendChild(button);
    });

    section.appendChild(grid);
    return section;
  };

  const buildDayNightSection = () => {
    const { section } = createSection("Ljus");
    dayNightButton = document.createElement("button");
    dayNightButton.type = "button";
    dayNightButton.className = TOGGLE_CLASS;
    dayNightButton.setAttribute("aria-label", "Växla dag- och nattläge");

    const onClick = () => {
      getDayNight?.()?.toggleMode?.();
      syncDayNight();
    };

    dayNightButton.addEventListener("click", onClick);
    listeners.push(() => dayNightButton.removeEventListener("click", onClick));
    section.appendChild(dayNightButton);
    return section;
  };

  const onKeyDown = (event) => {
    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      close();
    }
  };

  const onMediaChange = () => {
    if (!mediaQuery?.matches) {
      close();
    }
  };

  return {
    onAdd: () => {
      root = document.createElement("div");
      root.className = ROOT_CLASS;

      fabButton = document.createElement("button");
      fabButton.type = "button";
      fabButton.className = BUTTON_CLASS;
      fabButton.setAttribute("aria-label", "Kartinställningar");
      fabButton.setAttribute("aria-expanded", "false");
      fabButton.setAttribute("aria-haspopup", "dialog");
      fabButton.innerHTML =
        '<span class="mobile-fab__icon" aria-hidden="true">☰</span>';

      const onFabClick = () => toggle();
      fabButton.addEventListener("click", onFabClick);
      listeners.push(() => fabButton.removeEventListener("click", onFabClick));

      sheet = document.createElement("div");
      sheet.className = SHEET_CLASS;
      sheet.setAttribute("role", "presentation");

      backdrop = document.createElement("button");
      backdrop.type = "button";
      backdrop.className = BACKDROP_CLASS;
      backdrop.setAttribute("aria-label", "Stäng kartinställningar");

      const onBackdropClick = () => close();
      backdrop.addEventListener("click", onBackdropClick);
      listeners.push(() => backdrop.removeEventListener("click", onBackdropClick));

      panel = document.createElement("div");
      panel.className = PANEL_CLASS;
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-modal", "true");
      panel.setAttribute("aria-label", "Kartinställningar");
      panel.tabIndex = -1;

      const handle = document.createElement("div");
      handle.className = HANDLE_CLASS;
      handle.setAttribute("aria-hidden", "true");

      const closeButton = document.createElement("button");
      closeButton.type = "button";
      closeButton.className = CLOSE_CLASS;
      closeButton.setAttribute("aria-label", "Stäng");
      closeButton.textContent = "×";

      const onCloseClick = () => close();
      closeButton.addEventListener("click", onCloseClick);
      listeners.push(() => closeButton.removeEventListener("click", onCloseClick));

      const header = document.createElement("header");
      header.className = "mobile-sheet__header";
      header.append(handle, closeButton);

      const body = document.createElement("div");
      body.className = "mobile-sheet__body";
      body.append(
        buildModeSection(),
        buildDayNightSection(),
        buildLayerSection()
      );

      panel.append(header, body);
      sheet.append(backdrop, panel);
      root.append(fabButton, sheet);

      document.addEventListener("keydown", onKeyDown);
      listeners.push(() => document.removeEventListener("keydown", onKeyDown));

      mediaQuery = window.matchMedia(MOBILE_MEDIA);
      mediaQuery.addEventListener("change", onMediaChange);
      listeners.push(() => mediaQuery.removeEventListener("change", onMediaChange));

      syncSheet();
      return root;
    },
    onRemove: () => {
      close();
      releaseListeners(listeners);
      document.body.classList.remove("mobile-sheet-active");
      root?.remove();
      root = null;
      fabButton = null;
      sheet = null;
      backdrop = null;
      panel = null;
      dayNightButton = null;
      layerButtons = new Map();
      modeButtons = new Map();
      mediaQuery = null;
    },
    refresh: syncSheet,
    close
  };
};
