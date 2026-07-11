import { TRAFFIC_CONGESTION_COLORS } from "./trafficPalette.js";

export const TRAFFIC_LEGEND_ITEMS = Object.freeze([
  { color: TRAFFIC_CONGESTION_COLORS.free, label: "Fritt flöde" },
  { color: TRAFFIC_CONGESTION_COLORS.moderate, label: "Lätt trafik" },
  { color: TRAFFIC_CONGESTION_COLORS.heavy, label: "Tät trafik" },
  { color: TRAFFIC_CONGESTION_COLORS.severe, label: "Mycket tät trafik" }
]);

const ROOT_CLASS = "traffic-legend";
const TITLE_CLASS = "traffic-legend__title";
const LIST_CLASS = "traffic-legend__list";
const ITEM_CLASS = "traffic-legend__item";
const SWATCH_CLASS = "traffic-legend__swatch";
const LABEL_CLASS = "traffic-legend__label";

export const createTrafficLegend = ({ mapContainer }) => {
  const root = document.createElement("aside");
  root.className = ROOT_CLASS;
  root.setAttribute("role", "region");
  root.setAttribute("aria-label", "Trafikförhållanden");
  root.hidden = true;

  const title = document.createElement("p");
  title.className = TITLE_CLASS;
  title.textContent = "Trafikförhållanden";

  const list = document.createElement("ul");
  list.className = LIST_CLASS;

  TRAFFIC_LEGEND_ITEMS.forEach(({ color, label }) => {
    const item = document.createElement("li");
    item.className = ITEM_CLASS;

    const swatch = document.createElement("span");
    swatch.className = SWATCH_CLASS;
    swatch.style.backgroundColor = color;
    swatch.setAttribute("aria-hidden", "true");

    const text = document.createElement("span");
    text.className = LABEL_CLASS;
    text.textContent = label;

    item.append(swatch, text);
    list.appendChild(item);
  });

  root.append(title, list);
  mapContainer.appendChild(root);

  const setVisible = (visible) => {
    root.hidden = !visible;
    root.dataset.state = visible ? "visible" : "hidden";
  };

  return {
    element: root,
    setVisible,
    destroy: () => {
      root.remove();
    }
  };
};
