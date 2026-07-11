import { TRAFFIC_LAYER_IDS } from "./config/trafficLayerConfig.js";
import { createTrafficController } from "./createTrafficController.js";
import { createTrafficLegend } from "./createTrafficLegend.js";
import { SWEDISH_TRANSIT_LAYER_IDS } from "./createTransitLayer.js";
import { fetchTraffic } from "./trafficService.js";

export const TRANSIT_LAYER_IDS = SWEDISH_TRANSIT_LAYER_IDS;

export const ROAD_LABEL_LAYER_IDS = Object.freeze(["road-labels", "hybrid-road-labels"]);

const ROOT_CLASS = "traffic-control maplibregl-ctrl";
const HEADER_CLASS = "traffic-control__header";
const TITLE_CLASS = "traffic-control__title";
const LIST_CLASS = "traffic-control__list";
const ROW_CLASS = "traffic-control__row";
const LABEL_CLASS = "traffic-control__label";
const TOGGLE_CLASS = "traffic-control__toggle";

const DEFAULT_STATE = Object.freeze({
  trafficFlow: false,
  transit: false,
  roadLabels: true,
  legend: false
});

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

const setLayersVisibility = (map, layerIds, visible) => {
  const visibility = visible ? "visible" : "none";
  for (const layerId of layerIds) {
    if (!map.getLayer(layerId)) {
      continue;
    }
    map.setLayoutProperty(layerId, "visibility", visibility);
  }
};

const createToggleRow = ({ id, label, checked, onChange, listeners }) => {
  const row = document.createElement("li");
  row.className = ROW_CLASS;

  const labelEl = document.createElement("label");
  labelEl.className = LABEL_CLASS;
  labelEl.htmlFor = id;
  labelEl.textContent = label;

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.id = id;
  toggle.className = TOGGLE_CLASS;
  toggle.setAttribute("role", "switch");
  toggle.setAttribute("aria-checked", String(checked));
  toggle.dataset.state = checked ? "on" : "off";
  toggle.title = `${label}: ${checked ? "På" : "Av"}`;

  const onClick = (event) => {
    event.preventDefault();
    const next = toggle.dataset.state !== "on";
    onChange(next);
  };

  toggle.addEventListener("click", onClick);
  listeners.push(() => toggle.removeEventListener("click", onClick));

  labelEl.appendChild(toggle);
  row.appendChild(labelEl);
  return { row, toggle };
};

const setToggleState = ({ toggle, label, checked }) => {
  toggle.dataset.state = checked ? "on" : "off";
  toggle.setAttribute("aria-checked", String(checked));
  toggle.title = `${label}: ${checked ? "På" : "Av"}`;
};

export const createTrafficControl = ({
  map,
  onStateChange,
  initialState = {},
  dayNightController = null
} = {}) => {
  let container = null;
  let legend = null;
  let intervalId = null;
  let isDisposed = false;
  let transitLayer = null;
  const listeners = [];
  const toggles = new Map();

  const state = {
    ...DEFAULT_STATE,
    ...initialState
  };

  const flowController = createTrafficController({
    map,
    initialVisible: state.trafficFlow,
    onVisibilityChange: (visible) => {
      state.trafficFlow = visible;
      onStateChange?.({ ...state });
    }
  });

  const applyTransitVisibility = () => {
    if (transitLayer?.setVisible) {
      transitLayer.setVisible(state.transit);
      return;
    }
    setLayersVisibility(map, TRANSIT_LAYER_IDS, state.transit);
  };

  const loadTrafficData = async () => {
    try {
      const traffic = await fetchTraffic();
      if (isDisposed) {
        return;
      }
      if (traffic?.geojson) {
        flowController.setTrafficData(traffic.geojson);
      }
    } catch {
      /* ignore refresh failures */
    }
  };

  const applyState = () => {
    if (state.trafficFlow) {
      flowController.show();
      loadTrafficData();
    } else {
      flowController.hide();
    }

    applyTransitVisibility();
    setLayersVisibility(map, ROAD_LABEL_LAYER_IDS, state.roadLabels);
    legend?.setVisible(state.legend);
    onStateChange?.({ ...state });
  };

  const setState = (patch) => {
    Object.assign(state, patch);
    applyState();
    for (const [key, { toggle, label }] of toggles.entries()) {
      if (patch[key] != null) {
        setToggleState({ toggle, label, checked: state[key] });
      }
    }
  };

  const onStyleLoad = () => {
    flowController.setDayNightMode(dayNightController?.getMode?.() ?? "day");
    applyState();
  };

  map.on("style.load", onStyleLoad);
  listeners.push(() => map.off("style.load", onStyleLoad));

  intervalId = setInterval(() => {
    if (state.trafficFlow) {
      loadTrafficData();
    }
  }, REFRESH_INTERVAL_MS);
  listeners.push(() => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  });

  const control = {
    onAdd: () => {
      container = document.createElement("section");
      container.className = ROOT_CLASS;
      container.setAttribute("role", "group");
      container.setAttribute("aria-label", "Trafik och lager");

      const header = document.createElement("header");
      header.className = HEADER_CLASS;

      const title = document.createElement("p");
      title.className = TITLE_CLASS;
      title.id = "traffic-control-title";
      title.textContent = "Trafik";
      container.setAttribute("aria-labelledby", "traffic-control-title");

      header.appendChild(title);

      const list = document.createElement("ul");
      list.className = LIST_CLASS;

      const toggleDefs = [
        {
          key: "trafficFlow",
          id: "traffic-toggle-flow",
          label: "Trafikflöde",
          onChange: (checked) => setState({ trafficFlow: checked })
        },
        {
          key: "transit",
          id: "traffic-toggle-transit",
          label: "Kollektivtrafik",
          onChange: (checked) => setState({ transit: checked })
        },
        {
          key: "roadLabels",
          id: "traffic-toggle-road-labels",
          label: "Vägnamn",
          onChange: (checked) => setState({ roadLabels: checked })
        },
        {
          key: "legend",
          id: "traffic-toggle-legend",
          label: "Trafikförhållanden",
          onChange: (checked) => setState({ legend: checked })
        }
      ];

      toggleDefs.forEach(({ key, id, label, onChange }) => {
        const { row, toggle } = createToggleRow({
          id,
          label,
          checked: state[key],
          onChange,
          listeners
        });
        toggles.set(key, { toggle, label });
        list.appendChild(row);
      });

      container.append(header, list);

      legend = createTrafficLegend({ mapContainer: map.getContainer() });
      applyState();

      return container;
    },
    onRemove: () => {
      isDisposed = true;
      while (listeners.length > 0) {
        listeners.pop()?.();
      }
      legend?.destroy();
      legend = null;
      toggles.clear();
      container?.remove();
      container = null;
    }
  };

  return {
    control,
    getState: () => ({ ...state }),
    setState,
    applyState,
    setTransitLayer: (layer) => {
      transitLayer = layer;
      applyTransitVisibility();
    },
    setDayNightMode: (mode) => flowController.setDayNightMode(mode),
    setTrafficData: (geojson) => flowController.setTrafficData(geojson),
    destroy: () => {
      flowController.destroy();
      control.onRemove();
    }
  };
};
