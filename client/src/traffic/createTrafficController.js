import { TRAFFIC_FLOW_SOURCE } from "./config/trafficLayerConfig.js";
import { TRAFFIC_LAYER_IDS } from "./config/trafficLayerConfig.js";
import { TRAFFIC_PALETTES } from "./trafficPalette.js";
import { createTrafficFlowColorExpression } from "./expressions/roadExpressions.js";
import { fetchTraffic } from "./trafficService.js";

const EMPTY_TRAFFIC_COLLECTION = Object.freeze({
  type: "FeatureCollection",
  features: []
});

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

const normalizeTrafficGeoJson = (payload) => {
  const geojson = payload?.geojson;
  if (!geojson || geojson.type !== "FeatureCollection") {
    return EMPTY_TRAFFIC_COLLECTION;
  }

  return {
    type: "FeatureCollection",
    features: geojson.features.map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        congestion: feature.properties?.congestion ?? feature.properties?.level ?? feature.properties?.trafficLevel ?? "moderate"
      }
    }))
  };
};

/**
 * Runtime controller for the traffic-flow overlay.
 * Mount from initSwedenMap after style load; toggles visibility and loads live data.
 */
export const createTrafficController = ({
  map,
  initialVisible = false,
  onVisibilityChange
} = {}) => {
  let visible = initialVisible;
  let dayNightMode = "day";
  let intervalId = null;
  let isDisposed = false;
  const listeners = [];

  const ensureTrafficSource = () => {
    if (map.getSource(TRAFFIC_FLOW_SOURCE.id)) {
      return;
    }
    map.addSource(TRAFFIC_FLOW_SOURCE.id, {
      type: "geojson",
      data: EMPTY_TRAFFIC_COLLECTION
    });
  };

  const applyTrafficFlowPaint = () => {
    const layerId = TRAFFIC_LAYER_IDS.trafficFlow;
    if (!map.getLayer(layerId)) {
      return;
    }
    const palette = TRAFFIC_PALETTES[dayNightMode === "night" ? "night" : "day"];
    map.setPaintProperty(layerId, "line-color", createTrafficFlowColorExpression(palette));
    map.setPaintProperty(layerId, "line-opacity", palette.trafficFlowOpacity);
  };

  const setVisibility = (nextVisible, { notify = true } = {}) => {
    visible = Boolean(nextVisible);
    const layerId = TRAFFIC_LAYER_IDS.trafficFlow;
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
    }
    if (notify) {
      onVisibilityChange?.(visible);
    }
  };

  const setTrafficData = (geojson) => {
    ensureTrafficSource();
    const source = map.getSource(TRAFFIC_FLOW_SOURCE.id);
    if (source && typeof source.setData === "function") {
      source.setData(geojson ?? EMPTY_TRAFFIC_COLLECTION);
    }
  };

  const loadTraffic = async () => {
    try {
      const payload = await fetchTraffic();
      if (isDisposed) {
        return;
      }
      setTrafficData(normalizeTrafficGeoJson(payload));
    } catch {
      /* ignore refresh failures */
    }
  };

  const setDayNightMode = (mode) => {
    dayNightMode = mode === "night" ? "night" : "day";
    applyTrafficFlowPaint();
  };

  const onStyleLoad = () => {
    ensureTrafficSource();
    setVisibility(visible, { notify: false });
    applyTrafficFlowPaint();
    loadTraffic();
  };

  map.on("style.load", onStyleLoad);
  listeners.push(() => map.off("style.load", onStyleLoad));

  ensureTrafficSource();
  setVisibility(visible, { notify: false });
  loadTraffic();
  intervalId = setInterval(loadTraffic, REFRESH_INTERVAL_MS);

  return {
    isVisible: () => visible,
    show: () => setVisibility(true),
    hide: () => setVisibility(false),
    toggle: () => setVisibility(!visible),
    setTrafficData,
    setVisibility,
    setDayNightMode,
    refresh: loadTraffic,
    destroy: () => {
      isDisposed = true;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      while (listeners.length > 0) {
        listeners.pop()?.();
      }
    }
  };
};

export const createTrafficFlowSource = () => ({
  [TRAFFIC_FLOW_SOURCE.id]: {
    type: "geojson",
    data: EMPTY_TRAFFIC_COLLECTION
  }
});
