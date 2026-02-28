import { createCameraActions } from "./createCameraActions.js";

const ROOT_CLASS = "map-navigation-panel maplibregl-ctrl";
const HEADER_CLASS = "map-navigation-panel__header";
const TITLE_CLASS = "map-navigation-panel__title";
const COLLAPSE_CLASS = "map-navigation-panel__collapse";
const BODY_CLASS = "map-navigation-panel__body";
const TOGGLE_CLASS = "map-navigation-panel__toggle";
const HINT_CLASS = "map-navigation-panel__hint";
const SECTION_CLASS = "map-navigation-panel__section";
const SECTION_LABEL_CLASS = "map-navigation-panel__section-label";
const PAD_CLASS = "map-navigation-panel__pad";
const ROW_CLASS = "map-navigation-panel__row";
const BUTTON_CLASS = "map-navigation-panel__button";
const BUTTON_PRIMARY_CLASS = "map-navigation-panel__button--primary";
const SPACER_CLASS = "map-navigation-panel__spacer";

const createButton = ({ label, title, isPrimary = false }) => {
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

const createSpacer = () => {
  const spacer = document.createElement("span");
  spacer.className = SPACER_CLASS;
  spacer.setAttribute("aria-hidden", "true");
  return spacer;
};

const setInversionToggleState = ({ button, isInverted }) => {
  button.dataset.state = isInverted ? "active" : "idle";
  button.setAttribute("aria-pressed", String(isInverted));
  button.textContent = isInverted ? "Inverterad: På" : "Inverterad: Av";
};

const createSection = (labelText, emoji) => {
  const section = document.createElement("div");
  section.className = SECTION_CLASS;

  const label = document.createElement("p");
  label.className = SECTION_LABEL_CLASS;
  label.textContent = `${emoji} ${labelText}`;
  section.appendChild(label);

  return section;
};

const bindAction = ({ button, action, listeners }) => {
  const onClick = (event) => {
    event.preventDefault();
    action();
  };
  button.addEventListener("click", onClick);
  listeners.push(() => button.removeEventListener("click", onClick));
};

const buildMovementPad = ({ actions, listeners }) => {
  const pad = document.createElement("div");
  pad.className = PAD_CLASS;

  const northButton = createButton({
    label: "↑",
    title: "Flytta uppåt enligt vald styrning",
    isPrimary: true
  });
  bindAction({ button: northButton, action: actions.panNorth, listeners });

  const westButton = createButton({
    label: "←",
    title: "Flytta vänster enligt vald styrning",
    isPrimary: true
  });
  bindAction({ button: westButton, action: actions.panWest, listeners });

  const eastButton = createButton({
    label: "→",
    title: "Flytta höger enligt vald styrning",
    isPrimary: true
  });
  bindAction({ button: eastButton, action: actions.panEast, listeners });

  const southButton = createButton({
    label: "↓",
    title: "Flytta nedåt enligt vald styrning",
    isPrimary: true
  });
  bindAction({ button: southButton, action: actions.panSouth, listeners });

  const resetButton = createButton({
    label: "⌂",
    title: "Återställ riktning"
  });
  bindAction({
    button: resetButton,
    action: actions.resetOrientation,
    listeners
  });

  pad.append(
    createSpacer(),
    northButton,
    createSpacer(),
    westButton,
    resetButton,
    eastButton,
    createSpacer(),
    southButton,
    createSpacer()
  );

  return pad;
};

const buildActionRow = ({
  leftLabel,
  leftTitle,
  leftAction,
  rightLabel,
  rightTitle,
  rightAction,
  listeners
}) => {
  const row = document.createElement("div");
  row.className = ROW_CLASS;

  const leftButton = createButton({ label: leftLabel, title: leftTitle });
  bindAction({ button: leftButton, action: leftAction, listeners });

  const rightButton = createButton({ label: rightLabel, title: rightTitle });
  bindAction({ button: rightButton, action: rightAction, listeners });

  row.append(leftButton, rightButton);
  return row;
};

const releaseListeners = (listeners) => {
  while (listeners.length > 0) {
    const release = listeners.pop();
    release?.();
  }
};

export const createOrientationControl = ({
  map,
  mapConfig,
  controlConfig
}) => {
  let container = null;
  const listeners = [];
  let isInverted = Boolean(controlConfig.defaultInverted);
  let isCollapsed = false;

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
      container.setAttribute("aria-label", "Navigering och förflyttning");

      const header = document.createElement("header");
      header.className = HEADER_CLASS;

      const title = document.createElement("p");
      title.className = TITLE_CLASS;
      title.textContent = "🧭 Navigering";

      const collapseButton = document.createElement("button");
      collapseButton.type = "button";
      collapseButton.className = COLLAPSE_CLASS;
      collapseButton.title = "Minimera/expandera panel";
      collapseButton.setAttribute("aria-label", "Minimera/expandera panel");
      collapseButton.textContent = "▾";

      header.append(title, collapseButton);

      const body = document.createElement("div");
      body.className = BODY_CLASS;

      const inversionToggle = document.createElement("button");
      inversionToggle.type = "button";
      inversionToggle.className = TOGGLE_CLASS;
      inversionToggle.title = "Växla inverterad styrning";
      inversionToggle.setAttribute("aria-label", "Växla inverterad styrning");
      setInversionToggleState({ button: inversionToggle, isInverted });

      const onToggleClick = (event) => {
        event.preventDefault();
        isInverted = !isInverted;
        setInversionToggleState({ button: inversionToggle, isInverted });
      };
      inversionToggle.addEventListener("click", onToggleClick);
      listeners.push(() =>
        inversionToggle.removeEventListener("click", onToggleClick)
      );

      const hint = document.createElement("p");
      hint.className = HINT_CLASS;
      hint.textContent =
        "Styr med pilarna. Invertering är aktiverad som standard.";

      const movementSection = createSection("Rörelse", "🕹️");
      const movementPad = buildMovementPad({ actions, listeners });
      movementSection.appendChild(movementPad);

      const orientationSection = createSection("Orientering", "🔄");
      const rotateRow = buildActionRow({
        leftLabel: "↺",
        leftTitle: "Rotera vänster",
        leftAction: actions.rotateLeft,
        rightLabel: "↻",
        rightTitle: "Rotera höger",
        rightAction: actions.rotateRight,
        listeners
      });
      const tiltRow = buildActionRow({
        leftLabel: "Tilt −",
        leftTitle: "Luta ned",
        leftAction: actions.tiltDown,
        rightLabel: "Tilt +",
        rightTitle: "Luta upp",
        rightAction: actions.tiltUp,
        listeners
      });
      orientationSection.append(rotateRow, tiltRow);

      body.append(inversionToggle, hint, movementSection, orientationSection);

      const onCollapseClick = (event) => {
        event.preventDefault();
        isCollapsed = !isCollapsed;
        body.style.display = isCollapsed ? "none" : "";
        collapseButton.textContent = isCollapsed ? "▸" : "▾";
        container.dataset.collapsed = String(isCollapsed);
      };
      collapseButton.addEventListener("click", onCollapseClick);
      listeners.push(() =>
        collapseButton.removeEventListener("click", onCollapseClick)
      );

      container.append(header, body);
      return container;
    },
    onRemove: () => {
      releaseListeners(listeners);
      container?.remove();
      container = null;
    }
  };
};
