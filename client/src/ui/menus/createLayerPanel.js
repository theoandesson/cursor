import { createIconButton } from "../primitives/createButton.js";
import { createFocusTrap } from "../primitives/focusTrap.js";

const LAYER_IDS = [
  { id: "weather", label: "Väder (städer)", layerIds: ["city-weather-circles", "city-weather-labels"] },
  { id: "buildings", label: "Byggnader 3D", layerIds: ["sweden-buildings"] },
  { id: "roads", label: "Vägar", layerIds: ["roads-casing", "roads", "road-labels"] }
];

const getExistingLayers = (map, layerIds) =>
  layerIds.filter((layerId) => Boolean(map.getLayer(layerId)));

export const createLayerPanel = ({ map, onToast }) => {
  const panel = document.createElement("aside");
  panel.className = "layer-panel";
  panel.setAttribute("aria-label", "Kartlager");
  panel.hidden = true;

  const header = document.createElement("header");
  header.className = "layer-panel__header";

  const title = document.createElement("h2");
  title.className = "layer-panel__title";
  title.textContent = "Lager";

  const closeButton = createIconButton({
    label: "✕",
    title: "Stäng",
    ariaLabel: "Stäng lagerpanel",
    onClick: () => hide()
  });

  header.append(title, closeButton);

  const list = document.createElement("ul");
  list.className = "layer-panel__list";

  const layerState = new Map(
    LAYER_IDS.map((layer) => [layer.id, { ...layer, visible: true }])
  );

  const applyVisibility = (entry, visible) => {
    const existing = getExistingLayers(map, entry.layerIds);
    existing.forEach((layerId) => {
      map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
    });
    entry.visible = visible;
  };

  LAYER_IDS.forEach((layer) => {
    const item = document.createElement("li");
    item.className = "layer-panel__item";

    const label = document.createElement("span");
    label.textContent = layer.label;

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "layer-panel__toggle";
    toggle.setAttribute("role", "switch");
    toggle.setAttribute("aria-checked", "true");
    toggle.setAttribute("aria-label", `Växla ${layer.label}`);

    toggle.addEventListener("click", () => {
      const entry = layerState.get(layer.id);
      const nextVisible = !entry.visible;
      applyVisibility(entry, nextVisible);
      toggle.setAttribute("aria-checked", String(nextVisible));
      onToast?.(`${layer.label}: ${nextVisible ? "på" : "av"}`, { duration: 1800 });
    });

    item.append(label, toggle);
    list.appendChild(item);
  });

  panel.append(header, list);
  document.body.appendChild(panel);

  const trap = createFocusTrap({
    container: panel,
    onEscape: () => hide()
  });

  const show = () => {
    panel.hidden = false;
    trap.activate();
  };

  const hide = () => {
    panel.hidden = true;
    trap.deactivate();
  };

  const isOpen = () => !panel.hidden;
  const toggle = () => (isOpen() ? hide() : show());

  const destroy = () => {
    trap.deactivate();
    panel.remove();
  };

  return { element: panel, show, hide, toggle, isOpen, destroy };
};
