import { applyMapMode } from "./applyMapMode.js";
import { DEFAULT_MAP_MODE, MAP_MODE_OPTIONS } from "./mapModes.js";

const ROOT_CLASS = "map-mode-control maplibregl-ctrl";
const HEADER_CLASS = "map-mode-control__header";
const TITLE_CLASS = "map-mode-control__title";
const GRID_CLASS = "map-mode-control__grid";
const BUTTON_CLASS = "map-mode-control__button";

const setActiveButton = ({ buttons, activeMode }) => {
  buttons.forEach(({ button, mode }) => {
    const isActive = mode === activeMode;
    button.dataset.state = isActive ? "active" : "idle";
    button.setAttribute("aria-pressed", String(isActive));
  });
};

const releaseListeners = (listeners) => {
  while (listeners.length > 0) {
    const release = listeners.pop();
    release?.();
  }
};

export const createMapModeControl = ({ map, onModeChange, onStyleLoaded }) => {
  let container = null;
  let currentMode = DEFAULT_MAP_MODE;
  let isSwitching = false;
  const listeners = [];
  const buttons = [];

  const switchMode = (mode) => {
    if (isSwitching || mode === currentMode) {
      return;
    }

    isSwitching = true;
    container?.classList.add("map-mode-control--switching");

    const appliedMode = applyMapMode({
      map,
      mode,
      onStyleLoaded: (payload) => {
        currentMode = payload.mode;
        setActiveButton({ buttons, activeMode: currentMode });
        container?.classList.remove("map-mode-control--switching");
        isSwitching = false;
        onModeChange?.(currentMode);
        onStyleLoaded?.(currentMode);
      }
    });

    currentMode = appliedMode;
    setActiveButton({ buttons, activeMode: currentMode });
  };

  return {
    onAdd: () => {
      container = document.createElement("section");
      container.className = ROOT_CLASS;
      container.setAttribute("role", "group");
      container.setAttribute("aria-label", "Kartlägen");

      const header = document.createElement("header");
      header.className = HEADER_CLASS;

      const title = document.createElement("p");
      title.className = TITLE_CLASS;
      title.textContent = "Kartlägen";

      header.appendChild(title);

      const grid = document.createElement("div");
      grid.className = GRID_CLASS;

      MAP_MODE_OPTIONS.forEach(({ id, label, title: buttonTitle }) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = BUTTON_CLASS;
        button.textContent = label;
        button.title = buttonTitle;
        button.setAttribute("aria-label", buttonTitle);

        const onClick = (event) => {
          event.preventDefault();
          switchMode(id);
        };

        button.addEventListener("click", onClick);
        listeners.push(() => button.removeEventListener("click", onClick));

        buttons.push({ button, mode: id });
        grid.appendChild(button);
      });

      setActiveButton({ buttons, activeMode: currentMode });
      container.append(header, grid);
      return container;
    },
    onRemove: () => {
      releaseListeners(listeners);
      container?.remove();
      container = null;
      buttons.length = 0;
    },
    getMode: () => currentMode
  };
};
