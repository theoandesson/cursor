import { createCameraActions } from "./createCameraActions.js";
import { flyToSwedenOverview, resetBearing } from "../../ui/search/flyToCity.js";

const ROOT_CLASS = "map-nav-toolbar maplibregl-ctrl";
const TOOLBAR_CLASS = "map-nav-toolbar__icons";
const EXPANDED_CLASS = "map-nav-toolbar__expanded";
const BUTTON_CLASS = "map-nav-toolbar__button";
const BUTTON_PRIMARY_CLASS = "map-nav-toolbar__button--primary";

const createToolbarButton = ({ label, title, isPrimary = false }) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = BUTTON_CLASS;
  if (isPrimary) {
    button.classList.add(BUTTON_PRIMARY_CLASS);
  }
  button.textContent = label;
  button.title = title;
  button.setAttribute("aria-label", title);
  return button;
};

const bindAction = ({ button, action, listeners }) => {
  const onClick = (event) => {
    event.preventDefault();
    action();
  };
  button.addEventListener("click", onClick);
  listeners.push(() => button.removeEventListener("click", onClick));
};

const releaseListeners = (listeners) => {
  while (listeners.length > 0) {
    const release = listeners.pop();
    release?.();
  }
};

export const createCompactNavControl = ({
  map,
  mapConfig,
  controlConfig,
  onExpandedChange
}) => {
  let container = null;
  let expandedSection = null;
  let expandButton = null;
  const listeners = [];
  let isExpanded = false;
  let isInverted = Boolean(controlConfig.defaultInverted);

  const setExpanded = (nextExpanded) => {
    isExpanded = Boolean(nextExpanded);
    container?.classList.toggle("map-nav-toolbar--expanded", isExpanded);
    if (expandedSection) {
      expandedSection.hidden = !isExpanded;
    }
    if (expandButton) {
      expandButton.setAttribute("aria-expanded", String(isExpanded));
      expandButton.textContent = isExpanded ? "▴" : "▾";
      expandButton.title = isExpanded ? "Dölj utökad navigering" : "Visa utökad navigering";
    }
    onExpandedChange?.(isExpanded);
  };

  return {
    onAdd: () => {
      const actions = createCameraActions({
        map,
        mapConfig,
        controlConfig,
        getIsInverted: () => isInverted
      });

      container = document.createElement("section");
      container.className = ROOT_CLASS;
      container.setAttribute("role", "group");
      container.setAttribute("aria-label", "Kartnavigering");

      const toolbar = document.createElement("div");
      toolbar.className = TOOLBAR_CLASS;

      const zoomIn = createToolbarButton({ label: "+", title: "Zooma in" });
      bindAction({
        button: zoomIn,
        action: () => map.zoomIn({ duration: 200 }),
        listeners
      });

      const zoomOut = createToolbarButton({ label: "−", title: "Zooma ut" });
      bindAction({
        button: zoomOut,
        action: () => map.zoomOut({ duration: 200 }),
        listeners
      });

      const home = createToolbarButton({ label: "⌂", title: "Sverige-översikt" });
      bindAction({
        button: home,
        action: () => flyToSwedenOverview(map),
        listeners
      });

      const compass = createToolbarButton({ label: "◇", title: "Återställ kompass" });
      bindAction({
        button: compass,
        action: () => resetBearing(map),
        listeners
      });

      expandButton = createToolbarButton({
        label: "▾",
        title: "Visa utökad navigering"
      });
      expandButton.setAttribute("aria-expanded", "false");
      bindAction({
        button: expandButton,
        action: () => setExpanded(!isExpanded),
        listeners
      });

      toolbar.append(zoomIn, zoomOut, home, compass, expandButton);

      expandedSection = document.createElement("div");
      expandedSection.className = EXPANDED_CLASS;
      expandedSection.hidden = true;

      const inversionToggle = createToolbarButton({
        label: isInverted ? "Inverterad: På" : "Inverterad: Av",
        title: "Växla inverterad styrning"
      });
      inversionToggle.classList.add("map-nav-toolbar__toggle");
      inversionToggle.setAttribute("aria-pressed", String(isInverted));
      bindAction({
        button: inversionToggle,
        action: () => {
          isInverted = !isInverted;
          inversionToggle.setAttribute("aria-pressed", String(isInverted));
          inversionToggle.textContent = isInverted ? "Inverterad: På" : "Inverterad: Av";
        },
        listeners
      });

      const pad = document.createElement("div");
      pad.className = "map-navigation-panel__pad";

      const north = createToolbarButton({
        label: "↑",
        title: "Flytta norrut",
        isPrimary: true
      });
      bindAction({ button: north, action: actions.panNorth, listeners });

      const west = createToolbarButton({ label: "←", title: "Flytta västerut", isPrimary: true });
      bindAction({ button: west, action: actions.panWest, listeners });

      const reset = createToolbarButton({ label: "◎", title: "Återställ riktning" });
      bindAction({ button: reset, action: actions.resetOrientation, listeners });

      const east = createToolbarButton({ label: "→", title: "Flytta österut", isPrimary: true });
      bindAction({ button: east, action: actions.panEast, listeners });

      const south = createToolbarButton({ label: "↓", title: "Flytta söderut", isPrimary: true });
      bindAction({ button: south, action: actions.panSouth, listeners });

      const spacer = () => {
        const element = document.createElement("span");
        element.className = "map-navigation-panel__spacer";
        element.setAttribute("aria-hidden", "true");
        return element;
      };

      pad.append(spacer(), north, spacer(), west, reset, east, spacer(), south, spacer());

      const rotateRow = document.createElement("div");
      rotateRow.className = "map-navigation-panel__row";
      const rotateLeft = createToolbarButton({ label: "↺", title: "Rotera vänster" });
      const rotateRight = createToolbarButton({ label: "↻", title: "Rotera höger" });
      bindAction({ button: rotateLeft, action: actions.rotateLeft, listeners });
      bindAction({ button: rotateRight, action: actions.rotateRight, listeners });
      rotateRow.append(rotateLeft, rotateRight);

      const tiltRow = document.createElement("div");
      tiltRow.className = "map-navigation-panel__row";
      const tiltDown = createToolbarButton({ label: "Tilt −", title: "Luta ned" });
      const tiltUp = createToolbarButton({ label: "Tilt +", title: "Luta upp" });
      bindAction({ button: tiltDown, action: actions.tiltDown, listeners });
      bindAction({ button: tiltUp, action: actions.tiltUp, listeners });
      tiltRow.append(tiltDown, tiltUp);

      expandedSection.append(inversionToggle, pad, rotateRow, tiltRow);
      container.append(toolbar, expandedSection);

      return container;
    },
    onRemove: () => {
      releaseListeners(listeners);
      container?.remove();
      container = null;
    },
    setExpanded,
    isExpanded: () => isExpanded
  };
};
