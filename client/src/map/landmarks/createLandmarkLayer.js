import { buildLandmarksGeoJson, SWEDISH_LANDMARKS } from "./swedishLandmarks.js";

const SOURCE_ID = "swedish-landmarks-source";
const MARKER_LAYER_ID = "swedish-landmarks-markers";
const LABEL_LAYER_ID = "swedish-landmarks-labels";

const buildPopupHtml = ({ name, city, description }) => `
  <div class="landmark-popup">
    <p class="landmark-popup__kicker">Landmärke</p>
    <h3 class="landmark-popup__title">${name}</h3>
    <p class="landmark-popup__city">${city}</p>
    <p class="landmark-popup__description">${description}</p>
  </div>`;

export const createLandmarkLayer = ({ map, maplibregl, landmarks = SWEDISH_LANDMARKS }) => {
  const geojson = buildLandmarksGeoJson(landmarks);

  map.addSource(SOURCE_ID, {
    type: "geojson",
    data: geojson
  });

  map.addLayer({
    id: MARKER_LAYER_ID,
    type: "circle",
    source: SOURCE_ID,
    minzoom: 4,
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 5, 8, 7, 12, 10, 15, 12],
      "circle-color": "#f0c060",
      "circle-stroke-color": "#8a5a18",
      "circle-stroke-width": 2,
      "circle-opacity": 0.92,
      "circle-blur": 0.05
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
      "text-offset": [0, 0.8],
      "text-max-width": 12,
      "text-allow-overlap": false
    },
    paint: {
      "text-color": "#4a3010",
      "text-halo-color": "#fff8e8dd",
      "text-halo-width": 1.4
    }
  });

  const popup = new maplibregl.Popup({
    closeButton: true,
    closeOnClick: true,
    maxWidth: "300px",
    className: "landmark-popup-container",
    offset: 16
  });

  const showPopup = (feature, lngLat) => {
    const props = feature.properties ?? {};
    popup
      .setLngLat(lngLat)
      .setHTML(
        buildPopupHtml({
          name: props.name ?? "Landmärke",
          city: props.city ?? "",
          description: props.description ?? ""
        })
      )
      .addTo(map);
  };

  const onMarkerEnter = (event) => {
    map.getCanvas().style.cursor = "pointer";
    const feature = event.features?.[0];
    if (!feature) {
      return;
    }
    showPopup(feature, event.lngLat);
  };

  const onMarkerLeave = () => {
    map.getCanvas().style.cursor = "";
    popup.remove();
  };

  const onMarkerClick = (event) => {
    const feature = event.features?.[0];
    if (!feature) {
      return;
    }
    showPopup(feature, event.lngLat);
    map.easeTo({
      center: feature.geometry.coordinates,
      zoom: Math.max(map.getZoom(), 12),
      duration: 650
    });
  };

  map.on("mouseenter", MARKER_LAYER_ID, onMarkerEnter);
  map.on("mouseleave", MARKER_LAYER_ID, onMarkerLeave);
  map.on("click", MARKER_LAYER_ID, onMarkerClick);

  return () => {
    popup.remove();
    map.off("mouseenter", MARKER_LAYER_ID, onMarkerEnter);
    map.off("mouseleave", MARKER_LAYER_ID, onMarkerLeave);
    map.off("click", MARKER_LAYER_ID, onMarkerClick);
    if (map.getLayer(LABEL_LAYER_ID)) {
      map.removeLayer(LABEL_LAYER_ID);
    }
    if (map.getLayer(MARKER_LAYER_ID)) {
      map.removeLayer(MARKER_LAYER_ID);
    }
    if (map.getSource(SOURCE_ID)) {
      map.removeSource(SOURCE_ID);
    }
  };
};
