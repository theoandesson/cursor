import { createTrafficLegend } from "./createTrafficLegend.js";
import { fetchTrafficSegments } from "./trafficService.js";

const SOURCE_ID = "traffic-flow-segments-source";
const CASING_LAYER_ID = "traffic-flow-segment-casing";
const LINES_LAYER_ID = "traffic-flow-segment-lines";
const ANIMATED_LAYER_ID = "traffic-flow-segment-animated";

const EMPTY_GEOJSON = { type: "FeatureCollection", features: [] };
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const MOVE_DEBOUNCE_MS = 320;

const TRAFFIC_COLORS = Object.freeze({
  free: "#34a853",
  moderate: "#fbbc04",
  heavy: "#fa7b17",
  severe: "#ea4335"
});

const DASH_ANIMATION_SEQUENCE = [
  [0, 4, 3],
  [0.5, 4, 2.5],
  [1, 4, 2],
  [1.5, 4, 1.5],
  [2, 4, 1],
  [2.5, 4, 0.5],
  [3, 4, 0],
  [0, 0.5, 3, 3.5],
  [0, 1, 3, 3],
  [0, 1.5, 3, 2.5],
  [0, 2, 3, 2],
  [0, 2.5, 3, 1.5],
  [0, 3, 3, 1],
  [0, 3.5, 3, 0.5]
];

const createTrafficLevelColorExpression = () => [
  "match",
  ["get", "trafficLevel"],
  "free",
  TRAFFIC_COLORS.free,
  "moderate",
  TRAFFIC_COLORS.moderate,
  "heavy",
  TRAFFIC_COLORS.heavy,
  "severe",
  TRAFFIC_COLORS.severe,
  TRAFFIC_COLORS.moderate
];

const createRoadWidthExpression = (scale = 1) => [
  "interpolate",
  ["linear"],
  ["zoom"],
  6,
  ["*", scale, ["match", ["get", "roadClass"], "motorway", 2.2, "trunk", 1.7, 1.2]],
  10,
  ["*", scale, ["match", ["get", "roadClass"], "motorway", 4.8, "trunk", 3.6, 2.4]],
  14,
  ["*", scale, ["match", ["get", "roadClass"], "motorway", 8.2, "trunk", 6.2, 4.2]]
];

const segmentsToGeoJson = (segments = []) => ({
  type: "FeatureCollection",
  features: segments.map((segment) => ({
    type: "Feature",
    id: segment.id,
    geometry: segment.geometry ?? {
      type: "LineString",
      coordinates: segment.coordinates ?? []
    },
    properties: {
      id: segment.id,
      roadName: segment.roadName,
      roadClass: segment.roadClass,
      trafficLevel: segment.trafficLevel,
      speedKmh: segment.speedKmh
    }
  }))
});

const resolveBeforeLayerId = (map) => {
  const candidates = [
    "road-labels",
    "hybrid-road-labels",
    "sweden-buildings",
    "swedish-landmarks-halo"
  ];

  for (const layerId of candidates) {
    if (map.getLayer(layerId)) {
      return layerId;
    }
  }

  return undefined;
};

const getViewportBbox = (map) => {
  const bounds = map.getBounds();
  return {
    minLon: bounds.getWest(),
    minLat: bounds.getSouth(),
    maxLon: bounds.getEast(),
    maxLat: bounds.getNorth()
  };
};

export const createTrafficFlowLayer = ({ map, maplibregl, initialVisible = true } = {}) => {
  let isDisposed = false;
  let visible = initialVisible;
  let refreshTimerId = null;
  let moveDebounceId = null;
  let animationFrameId = null;
  let dashStep = 0;
  let abortController = null;
  let legend = null;

  const layerIds = [ANIMATED_LAYER_ID, LINES_LAYER_ID, CASING_LAYER_ID];

  const setLayerVisibility = (nextVisible) => {
    visible = Boolean(nextVisible);
    const layoutVisibility = visible ? "visible" : "none";
    for (const layerId of layerIds) {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", layoutVisibility);
      }
    }
    legend?.setVisible(visible);
  };

  const stopAnimation = () => {
    if (animationFrameId != null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  };

  const animateDash = () => {
    if (isDisposed || !visible || !map.getLayer(ANIMATED_LAYER_ID)) {
      stopAnimation();
      return;
    }

    dashStep = (dashStep + 1) % DASH_ANIMATION_SEQUENCE.length;
    map.setPaintProperty(
      ANIMATED_LAYER_ID,
      "line-dasharray",
      DASH_ANIMATION_SEQUENCE[dashStep]
    );
    animationFrameId = requestAnimationFrame(animateDash);
  };

  const startAnimation = () => {
    stopAnimation();
    if (visible) {
      animationFrameId = requestAnimationFrame(animateDash);
    }
  };

  const applyGeoJson = (geojson) => {
    const source = map.getSource(SOURCE_ID);
    if (source && typeof source.setData === "function") {
      source.setData(geojson);
    }
  };

  const loadSegments = async () => {
    abortController?.abort();
    abortController = new AbortController();

    try {
      const segments = await fetchTrafficSegments({
        bbox: getViewportBbox(map),
        limit: 300,
        signal: abortController.signal
      });
      if (isDisposed) {
        return;
      }
      applyGeoJson(segmentsToGeoJson(segments));
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }
    }
  };

  const scheduleLoad = () => {
    if (moveDebounceId) {
      clearTimeout(moveDebounceId);
    }
    moveDebounceId = setTimeout(() => {
      moveDebounceId = null;
      loadSegments();
    }, MOVE_DEBOUNCE_MS);
  };

  const beforeId = resolveBeforeLayerId(map);

  map.addSource(SOURCE_ID, { type: "geojson", data: EMPTY_GEOJSON });

  map.addLayer(
    {
      id: CASING_LAYER_ID,
      type: "line",
      source: SOURCE_ID,
      minzoom: 6,
      layout: {
        "line-cap": "round",
        "line-join": "round",
        visibility: visible ? "visible" : "none"
      },
      paint: {
        "line-color": "#1f2a36",
        "line-width": createRoadWidthExpression(1.45),
        "line-opacity": 0.55
      }
    },
    beforeId
  );

  map.addLayer(
    {
      id: LINES_LAYER_ID,
      type: "line",
      source: SOURCE_ID,
      minzoom: 6,
      layout: {
        "line-cap": "round",
        "line-join": "round",
        visibility: visible ? "visible" : "none"
      },
      paint: {
        "line-color": createTrafficLevelColorExpression(),
        "line-width": createRoadWidthExpression(1),
        "line-opacity": 0.94
      }
    },
    beforeId
  );

  map.addLayer(
    {
      id: ANIMATED_LAYER_ID,
      type: "line",
      source: SOURCE_ID,
      minzoom: 8,
      filter: ["in", ["get", "trafficLevel"], ["literal", ["heavy", "severe"]]],
      layout: {
        "line-cap": "round",
        "line-join": "round",
        visibility: visible ? "visible" : "none"
      },
      paint: {
        "line-color": "#ffffff",
        "line-width": createRoadWidthExpression(0.55),
        "line-opacity": 0.72,
        "line-dasharray": DASH_ANIMATION_SEQUENCE[0]
      }
    },
    beforeId
  );

  legend = createTrafficLegend({ mapContainer: map.getContainer() });
  legend.setVisible(visible);

  const popup = maplibregl
    ? new maplibregl.Popup({
        closeButton: true,
        closeOnClick: true,
        maxWidth: "280px",
        className: "traffic-flow-popup-container",
        offset: 12
      })
    : null;

  const onLineEnter = () => {
    map.getCanvas().style.cursor = "pointer";
  };

  const onLineLeave = () => {
    map.getCanvas().style.cursor = "";
  };

  const onLineClick = (event) => {
    if (!popup) {
      return;
    }

    const feature = event.features?.[0];
    if (!feature) {
      return;
    }

    const props = feature.properties ?? {};
    popup
      .setLngLat(event.lngLat)
      .setHTML(
        `<div class="traffic-flow-popup">
          <p class="traffic-flow-popup__kicker">Trafik</p>
          <h3 class="traffic-flow-popup__title">${props.roadName ?? "Väg"}</h3>
          <p class="traffic-flow-popup__meta">Hastighet: ${props.speedKmh ?? "?"} km/h</p>
        </div>`
      )
      .addTo(map);
  };

  map.on("mouseenter", LINES_LAYER_ID, onLineEnter);
  map.on("mouseleave", LINES_LAYER_ID, onLineLeave);
  map.on("click", LINES_LAYER_ID, onLineClick);
  map.on("moveend", scheduleLoad);

  loadSegments();
  startAnimation();
  refreshTimerId = setInterval(loadSegments, REFRESH_INTERVAL_MS);

  return {
    layerIds,
    legend,
    setVisible: setLayerVisibility,
    isVisible: () => visible,
    refresh: loadSegments,
    destroy: () => {
      isDisposed = true;
      abortController?.abort();
      abortController = null;

      if (refreshTimerId) {
        clearInterval(refreshTimerId);
        refreshTimerId = null;
      }

      if (moveDebounceId) {
        clearTimeout(moveDebounceId);
        moveDebounceId = null;
      }

      stopAnimation();
      popup?.remove();
      map.off("mouseenter", LINES_LAYER_ID, onLineEnter);
      map.off("mouseleave", LINES_LAYER_ID, onLineLeave);
      map.off("click", LINES_LAYER_ID, onLineClick);
      map.off("moveend", scheduleLoad);
      legend?.destroy();
      legend = null;

      for (const layerId of layerIds) {
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
      }

      if (map.getSource(SOURCE_ID)) {
        map.removeSource(SOURCE_ID);
      }
    }
  };
};
