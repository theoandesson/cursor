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
    button.setAttribute("aria-checked", String(isActive));
    button.tabIndex = isActive ? 0 : -1;
  });
};

const releaseListeners = (listeners) => {
  while (listeners.length > 0) {
    const release = listeners.pop();
    release?.();
  }
};

export const createMapModeControl = ({ map, onModeChange, onStyleLoaded, onBeforeStyleChange }) => {
  let container = null;
  let grid = null;
  let currentMode = DEFAULT_MAP_MODE;
  let isSwitching = false;
  const listeners = [];
  const buttons = [];

  const resetSwitching = () => {
    container?.classList.remove("map-mode-control--switching");
    isSwitching = false;
  };

  const switchMode = (mode) => {
    if (isSwitching || mode === currentMode) {
      return false;
    }

    isSwitching = true;
    container?.classList.add("map-mode-control--switching");

    applyMapMode({
      map,
      mode,
      onBeforeStyleChange,
      onStyleLoaded: (payload) => {
        currentMode = payload.mode;
        setActiveButton({ buttons, activeMode: currentMode });
        resetSwitching();
        onModeChange?.(currentMode);
        onStyleLoaded?.(currentMode);
      },
      onStyleError: () => {
        resetSwitching();
      }
    });

    return true;
  };

  const focusMode = (mode) => {
    const entry = buttons.find(({ mode: buttonMode }) => buttonMode === mode);
    entry?.button.focus();
  };

  const moveSelection = (delta) => {
    const currentIndex = buttons.findIndex(({ mode }) => mode === currentMode);
    if (currentIndex < 0) {
      return;
    }

    const nextIndex =
      (currentIndex + delta + buttons.length) % buttons.length;
    const nextMode = buttons[nextIndex].mode;
    switchMode(nextMode);
    focusMode(nextMode);
  };

  const onGridKeyDown = (event) => {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        moveSelection(1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        moveSelection(-1);
        break;
      case "Home":
        event.preventDefault();
        switchMode(buttons[0].mode);
        focusMode(buttons[0].mode);
        break;
      case "End":
        event.preventDefault();
        switchMode(buttons[buttons.length - 1].mode);
        focusMode(buttons[buttons.length - 1].mode);
        break;
      default:
        break;
    }
  };

  const control = {
    onAdd: () => {
      container = document.createElement("section");
      container.className = ROOT_CLASS;
      container.setAttribute("role", "radiogroup");
      container.setAttribute("aria-label", "Kartlägen");

      const header = document.createElement("header");
      header.className = HEADER_CLASS;

      const title = document.createElement("p");
      title.className = TITLE_CLASS;
      title.id = "map-mode-control-title";
      title.textContent = "Kartlägen";
      container.setAttribute("aria-labelledby", "map-mode-control-title");

      header.appendChild(title);

      grid = document.createElement("div");
      grid.className = GRID_CLASS;
      grid.addEventListener("keydown", onGridKeyDown);
      listeners.push(() => grid.removeEventListener("keydown", onGridKeyDown));

      MAP_MODE_OPTIONS.forEach(({ id, label, title: buttonTitle }) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = BUTTON_CLASS;
        button.textContent = label;
        button.title = buttonTitle;
        button.setAttribute("role", "radio");
        button.setAttribute("aria-label", buttonTitle);

        const onClick = (event) => {
          event.preventDefault();
          switchMode(id);
          button.focus();
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
      grid = null;
      buttons.length = 0;
    },
    getMode: () => currentMode,
    switchMode
  };

  return control;
};
