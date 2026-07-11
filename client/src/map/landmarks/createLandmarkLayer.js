import { escapeHtml } from "../../shared/escapeHtml.js";
import { buildLandmarksGeoJson, SWEDISH_LANDMARKS } from "./swedishLandmarks.js";

const SOURCE_ID = "swedish-landmarks-source";
const HALO_LAYER_ID = "swedish-landmarks-halo";
const MARKER_LAYER_ID = "swedish-landmarks-markers";
const LABEL_LAYER_ID = "swedish-landmarks-labels";

const buildPopupHtml = ({ name, city, description, icon }) => `
  <div class="landmark-popup">
    <div class="landmark-popup__header">
      <span class="landmark-popup__icon" aria-hidden="true">${escapeHtml(icon)}</span>
      <div class="landmark-popup__heading">
        <p class="landmark-popup__kicker">Landmärke</p>
        <h3 class="landmark-popup__title">${escapeHtml(name)}</h3>
      </div>
    </div>
    <p class="landmark-popup__city">${escapeHtml(city)}</p>
    <p class="landmark-popup__description">${escapeHtml(description)}</p>
  </div>`;

export const createLandmarkLayer = ({ map, maplibregl, landmarks = SWEDISH_LANDMARKS }) => {
  if (map.getSource(SOURCE_ID)) {
    return () => {};
  }

  const geojson = buildLandmarksGeoJson(landmarks);

  map.addSource(SOURCE_ID, {
    type: "geojson",
    data: geojson
  });

  map.addLayer({
    id: HALO_LAYER_ID,
    type: "circle",
    source: SOURCE_ID,
    minzoom: 4,
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 10, 8, 14, 12, 18, 15, 22],
      "circle-color": "#f0c060",
      "circle-opacity": ["interpolate", ["linear"], ["zoom"], 4, 0.14, 10, 0.2, 15, 0.24],
      "circle-blur": 0.85
    }
  });

  map.addLayer({
    id: MARKER_LAYER_ID,
    type: "circle",
    source: SOURCE_ID,
    minzoom: 4,
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 5.5, 8, 7.5, 12, 9.5, 15, 11],
      "circle-color": "#f4c86a",
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 2.5,
      "circle-opacity": 0.96,
      "circle-stroke-opacity": 0.92,
      "circle-blur": 0.02
    }
  });

  map.addLayer({
    id: LABEL_LAYER_ID,
    type: "symbol",
    source: SOURCE_ID,
    minzoom: 7,
    layout: {
      "text-field": ["get", "name"],
      "text-font": ["Noto Sans Regular"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 7, 10, 12, 12, 15, 14],
      "text-anchor": "top",
      "text-offset": [0, 1.1],
      "text-max-width": 11,
      "text-allow-overlap": false,
      "text-letter-spacing": 0.01
    },
    paint: {
      "text-color": "#2a3e52",
      "text-halo-color": "#ffffffe6",
      "text-halo-width": 1.6,
      "text-halo-blur": 0.25
    }
  });

  const popup = new maplibregl.Popup({
    closeButton: true,
    closeOnClick: true,
    maxWidth: "320px",
    className: "landmark-popup-container",
    offset: 18
  });

  const showPopup = (feature, lngLat) => {
    const props = feature.properties ?? {};
    popup
      .setLngLat(lngLat)
      .setHTML(
        buildPopupHtml({
          name: props.name ?? "Landmärke",
          city: props.city ?? "",
          description: props.description ?? "",
          icon: props.icon ?? "📍"
        })
      )
      .addTo(map);
  };

  const onLandmarkEnter = () => {
    map.getCanvas().style.cursor = "pointer";
  };

  const onLandmarkLeave = () => {
    map.getCanvas().style.cursor = "";
  };

  const onLandmarkClick = (event) => {
    event.preventDefault();
    const feature = event.features?.[0];
    if (!feature) {
      return;
    }
    showPopup(feature, event.lngLat);
    map.easeTo({
      center: feature.geometry.coordinates,
      zoom: Math.max(map.getZoom(), 13.5),
      pitch: Math.max(map.getPitch(), 48),
      duration: 750
    });
  };

  const interactiveLayerIds = [HALO_LAYER_ID, MARKER_LAYER_ID, LABEL_LAYER_ID];

  interactiveLayerIds.forEach((layerId) => {
    map.on("mouseenter", layerId, onLandmarkEnter);
    map.on("mouseleave", layerId, onLandmarkLeave);
    map.on("click", layerId, onLandmarkClick);
  });

  return () => {
    popup.remove();
    interactiveLayerIds.forEach((layerId) => {
      map.off("mouseenter", layerId, onLandmarkEnter);
      map.off("mouseleave", layerId, onLandmarkLeave);
      map.off("click", layerId, onLandmarkClick);
    });
    if (map.getLayer(LABEL_LAYER_ID)) {
      map.removeLayer(LABEL_LAYER_ID);
    }
    if (map.getLayer(MARKER_LAYER_ID)) {
      map.removeLayer(MARKER_LAYER_ID);
    }
    if (map.getLayer(HALO_LAYER_ID)) {
      map.removeLayer(HALO_LAYER_ID);
    }
    if (map.getSource(SOURCE_ID)) {
      map.removeSource(SOURCE_ID);
    }
  };
};
