import {
  LOD_CONFIG,
  NAVIGATION_CONTROL_CONFIG,
  SWEDEN_MAP_CONFIG
} from "../../config/swedenMapConfig.js";
import { createCityWeatherLayer } from "../../weather/createCityWeatherLayer.js";
import { createWeatherPopup } from "../../weather/createWeatherPopup.js";
import { createAdaptiveLodController } from "../lod/createAdaptiveLodController.js";
import { createInitialLoadUxController } from "../loading/createInitialLoadUxController.js";
import { createOrientationControl } from "../navigation/createOrientationControl.js";
import { createSwedenStyle } from "../style/createSwedenStyle.js";

const enableInteraction = (handler) => {
  if (handler && typeof handler.enable === "function") {
    handler.enable();
  }
};

const enableExtendedNavigation = (map) => {
  enableInteraction(map.dragPan);
  enableInteraction(map.scrollZoom);
  enableInteraction(map.boxZoom);
  enableInteraction(map.dragRotate);
  enableInteraction(map.keyboard);
  enableInteraction(map.doubleClickZoom);
  enableInteraction(map.touchZoomRotate);
  if (map.touchZoomRotate && typeof map.touchZoomRotate.enableRotation === "function") {
    map.touchZoomRotate.enableRotation();
  }
};

export const initSwedenMap = ({
  maplibregl,
  container,
  onStatusChange,
  loadingOverlay
}) => {
  const map = new maplibregl.Map({
    container,
    style: createSwedenStyle(),
    center: SWEDEN_MAP_CONFIG.center,
    zoom: SWEDEN_MAP_CONFIG.zoom,
    minZoom: SWEDEN_MAP_CONFIG.minZoom,
    maxZoom: SWEDEN_MAP_CONFIG.maxZoom,
    pitch: SWEDEN_MAP_CONFIG.pitch,
    bearing: SWEDEN_MAP_CONFIG.bearing,
    antialias: true,
    renderWorldCopies: false,
    fadeDuration: 220,
    hash: SWEDEN_MAP_CONFIG.hash,
    maxTileCacheSize: 900,
    collectResourceTiming: false,
    crossSourceCollisions: true,
    trackResize: true,
    preserveDrawingBuffer: false,
    refreshExpiredTiles: true,
    pixelRatio: Math.min(devicePixelRatio, 2),
    dragRotate: true,
    touchZoomRotate: true,
    maxPitch: SWEDEN_MAP_CONFIG.maxPitch
  });

  enableExtendedNavigation(map);

  map.addControl(
    createOrientationControl({
      map,
      mapConfig: SWEDEN_MAP_CONFIG,
      controlConfig: NAVIGATION_CONTROL_CONFIG
    }),
    "top-right"
  );
  map.addControl(
    new maplibregl.NavigationControl({ showZoom: true, showCompass: true, visualizePitch: true }),
    "top-left"
  );
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 180, unit: "metric" }));

  if (loadingOverlay) {
    createInitialLoadUxController({ map, loadingOverlay });
  }

  map.on("load", () => {
    createCityWeatherLayer({ map, maplibregl });
    createWeatherPopup({ map, maplibregl });
    createAdaptiveLodController({ map, lodConfig: LOD_CONFIG, onStatusChange });
  });

  return map;
};
