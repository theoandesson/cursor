import { createCameraActions } from "./createCameraActions.js";

const ROOT_CLASS = "map-navigation-aid maplibregl-ctrl";
const PAD_CLASS = "map-navigation-aid__pad";
const ROW_CLASS = "map-navigation-aid__row";
const BUTTON_CLASS = "map-navigation-aid__button";
const SPACER_CLASS = "map-navigation-aid__spacer";

const createButton = ({ label, title }) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = BUTTON_CLASS;
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

  const northButton = createButton({ label: "N", title: "Flytta norrut" });
  bindAction({ button: northButton, action: actions.panNorth, listeners });

  const westButton = createButton({ label: "V", title: "Flytta vasterut" });
  bindAction({ button: westButton, action: actions.panWest, listeners });

  const eastButton = createButton({ label: "O", title: "Flytta osterut" });
  bindAction({ button: eastButton, action: actions.panEast, listeners });

  const southButton = createButton({ label: "S", title: "Flytta soderut" });
  bindAction({ button: southButton, action: actions.panSouth, listeners });

  const resetButton = createButton({
    label: "Hem",
    title: "Aterstall riktning"
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

  return {
    onAdd: () => {
      const actions = createCameraActions({
        map,
        mapConfig,
        controlConfig
      });

      container = document.createElement("section");
      container.className = ROOT_CLASS;
      container.setAttribute("role", "group");
      container.setAttribute("aria-label", "Orientering och forflyttning");

      const movementPad = buildMovementPad({ actions, listeners });
      const rotateRow = buildActionRow({
        leftLabel: "R-",
        leftTitle: "Rotera vanster",
        leftAction: actions.rotateLeft,
        rightLabel: "R+",
        rightTitle: "Rotera hoger",
        rightAction: actions.rotateRight,
        listeners
      });
      const tiltRow = buildActionRow({
        leftLabel: "L-",
        leftTitle: "Luta ned",
        leftAction: actions.tiltDown,
        rightLabel: "L+",
        rightTitle: "Luta upp",
        rightAction: actions.tiltUp,
        listeners
      });

      container.append(movementPad, rotateRow, tiltRow);
      return container;
    },
    onRemove: () => {
      releaseListeners(listeners);
      container?.remove();
      container = null;
    }
  };
};
