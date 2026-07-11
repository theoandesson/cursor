const API_BASE = "/api";

const fetchJson = async (url, { signal } = {}) => {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = payload.error ?? `API ${response.status}: ${response.statusText}`;
    throw new Error(message);
  }
  return response.json();
};

export const fetchTransitLines = async ({ cityId, type, signal } = {}) => {
  const params = new URLSearchParams();
  if (cityId) params.set("cityId", cityId);
  if (type) params.set("type", type);

  const query = params.toString();
  const payload = await fetchJson(`${API_BASE}/transit/lines${query ? `?${query}` : ""}`, {
    signal
  });
  return payload.lines ?? [];
};

export const fetchTransitStops = async ({ cityId, type, lineId, signal } = {}) => {
  const params = new URLSearchParams();
  if (cityId) params.set("cityId", cityId);
  if (type) params.set("type", type);
  if (lineId) params.set("lineId", lineId);

  const query = params.toString();
  const payload = await fetchJson(`${API_BASE}/transit/stops${query ? `?${query}` : ""}`, {
    signal
  });
  return payload.stops ?? [];
};

export const fetchTransitStopsNear = async (
  lon,
  lat,
  { radiusKm = 2, limit = 10, signal } = {}
) => {
  const params = new URLSearchParams({
    lon: String(lon),
    lat: String(lat),
    radiusKm: String(radiusKm),
    limit: String(limit)
  });

  const payload = await fetchJson(`${API_BASE}/transit/stops/near?${params.toString()}`, {
    signal
  });
  return payload.stops ?? [];
};

const buildLinesGeoJson = (lines) => ({
  type: "FeatureCollection",
  features: lines.map((line) => ({
    type: "Feature",
    geometry: line.geometry,
    properties: {
      lineId: line.lineId,
      name: line.name,
      color: line.color,
      type: line.type,
      cityId: line.cityId
    }
  }))
});

const buildStopsGeoJson = (stops) => ({
  type: "FeatureCollection",
  features: stops.map((stop) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [stop.lon, stop.lat] },
    properties: {
      stopId: stop.stopId,
      name: stop.name,
      type: stop.type,
      cityId: stop.cityId,
      lineIds: stop.lineIds?.join(",") ?? ""
    }
  }))
});

const LINES_SOURCE_ID = "swedish-transit-lines-source";
const STOPS_SOURCE_ID = "swedish-transit-stops-source";
const LINE_CASING_LAYER_ID = "swedish-transit-lines-casing";
const LINE_LAYER_ID = "swedish-transit-lines";
const STOP_HALO_LAYER_ID = "swedish-transit-stops-halo";
const STOP_LAYER_ID = "swedish-transit-stops";
const STOP_LABEL_LAYER_ID = "swedish-transit-stops-labels";
const STOP_MIN_ZOOM = 11;

export const SWEDISH_TRANSIT_LAYER_IDS = Object.freeze([
  LINE_CASING_LAYER_ID,
  LINE_LAYER_ID,
  STOP_HALO_LAYER_ID,
  STOP_LAYER_ID,
  STOP_LABEL_LAYER_ID
]);

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const TYPE_LABELS = {
  tunnelbana: "Tunnelbana",
  pendeltåg: "Pendeltåg",
  spårvagn: "Spårvagn",
  stadstunnel: "Stadstunnel"
};

const buildStopPopupHtml = ({ name, type, lineIds }) => `
  <div class="transit-popup">
    <p class="transit-popup__kicker">${escapeHtml(TYPE_LABELS[type] ?? type ?? "Kollektivtrafik")}</p>
    <h3 class="transit-popup__title">${escapeHtml(name)}</h3>
    ${lineIds ? `<p class="transit-popup__lines">${escapeHtml(lineIds)}</p>` : ""}
  </div>`;

export const createTransitLayer = ({ map, maplibregl, initialVisible = false } = {}) => {
  let isDisposed = false;
  let dataLoaded = false;

  const setVisible = (visible) => {
    if (visible && !dataLoaded) {
      dataLoaded = true;
      loadData();
    }
    const visibility = visible ? "visible" : "none";
    for (const layerId of SWEDISH_TRANSIT_LAYER_IDS) {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", visibility);
      }
    }
  };

  map.addSource(LINES_SOURCE_ID, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] }
  });

  map.addSource(STOPS_SOURCE_ID, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] }
  });

  map.addLayer({
    id: LINE_CASING_LAYER_ID,
    type: "line",
    source: LINES_SOURCE_ID,
    minzoom: 9,
    layout: {
      "line-cap": "round",
      "line-join": "round"
    },
    paint: {
      "line-color": "#1a2a3a",
      "line-width": ["interpolate", ["linear"], ["zoom"], 9, 3, 12, 5, 15, 7],
      "line-opacity": 0.35
    }
  });

  map.addLayer({
    id: LINE_LAYER_ID,
    type: "line",
    source: LINES_SOURCE_ID,
    minzoom: 9,
    layout: {
      "line-cap": "round",
      "line-join": "round"
    },
    paint: {
      "line-color": ["get", "color"],
      "line-width": ["interpolate", ["linear"], ["zoom"], 9, 2, 12, 4, 15, 6],
      "line-opacity": 0.88
    }
  });

  map.addLayer({
    id: STOP_HALO_LAYER_ID,
    type: "circle",
    source: STOPS_SOURCE_ID,
    minzoom: STOP_MIN_ZOOM,
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 7, 14, 10, 16, 12],
      "circle-color": "#ffffff",
      "circle-opacity": 0.55,
      "circle-blur": 0.4
    }
  });

  map.addLayer({
    id: STOP_LAYER_ID,
    type: "circle",
    source: STOPS_SOURCE_ID,
    minzoom: STOP_MIN_ZOOM,
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 4, 14, 6, 16, 7],
      "circle-color": "#ffffff",
      "circle-stroke-color": "#2a3e52",
      "circle-stroke-width": 2,
      "circle-opacity": 0.95
    }
  });

  map.addLayer({
    id: STOP_LABEL_LAYER_ID,
    type: "symbol",
    source: STOPS_SOURCE_ID,
    minzoom: STOP_MIN_ZOOM + 1,
    layout: {
      "text-field": ["get", "name"],
      "text-font": ["Noto Sans Regular"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 12, 10, 15, 12],
      "text-anchor": "top",
      "text-offset": [0, 0.8],
      "text-max-width": 10,
      "text-allow-overlap": false
    },
    paint: {
      "text-color": "#2a3e52",
      "text-halo-color": "#ffffffe6",
      "text-halo-width": 1.4
    }
  });

  const popup = new maplibregl.Popup({
    closeButton: true,
    closeOnClick: true,
    maxWidth: "280px",
    className: "transit-popup-container",
    offset: 14
  });

  const onStopEnter = () => {
    map.getCanvas().style.cursor = "pointer";
  };

  const onStopLeave = () => {
    map.getCanvas().style.cursor = "";
  };

  const onStopClick = (event) => {
    const feature = event.features?.[0];
    if (!feature) {
      return;
    }
    const props = feature.properties ?? {};
    popup
      .setLngLat(event.lngLat)
      .setHTML(
        buildStopPopupHtml({
          name: props.name ?? "Hållplats",
          type: props.type,
          lineIds: props.lineIds
        })
      )
      .addTo(map);
  };

  map.on("mouseenter", STOP_LAYER_ID, onStopEnter);
  map.on("mouseleave", STOP_LAYER_ID, onStopLeave);
  map.on("click", STOP_LAYER_ID, onStopClick);

  const loadData = async () => {
    try {
      const [lines, stops] = await Promise.all([fetchTransitLines(), fetchTransitStops()]);
      if (isDisposed) {
        return;
      }

      const linesSource = map.getSource(LINES_SOURCE_ID);
      const stopsSource = map.getSource(STOPS_SOURCE_ID);
      if (linesSource) {
        linesSource.setData(buildLinesGeoJson(lines));
      }
      if (stopsSource) {
        stopsSource.setData(buildStopsGeoJson(stops));
      }
    } catch {
      /* ignore initial load failures */
    }
  };

  setVisible(initialVisible);

  return {
    destroy: () => {
      isDisposed = true;
      popup.remove();
      map.off("mouseenter", STOP_LAYER_ID, onStopEnter);
      map.off("mouseleave", STOP_LAYER_ID, onStopLeave);
      map.off("click", STOP_LAYER_ID, onStopClick);

      for (const layerId of SWEDISH_TRANSIT_LAYER_IDS) {
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
      }

      for (const sourceId of [STOPS_SOURCE_ID, LINES_SOURCE_ID]) {
        if (map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }
      }
    },
    setVisible,
    layerIds: SWEDISH_TRANSIT_LAYER_IDS
  };
};
