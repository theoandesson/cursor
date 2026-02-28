import { LOD_CONFIG, SWEDEN_MAP_CONFIG } from "../../config/swedenMapConfig.js";
import { createCityWeatherLayer } from "../../weather/createCityWeatherLayer.js";
import { createWeatherPopup } from "../../weather/createWeatherPopup.js";
import { createAdaptiveLodController } from "../lod/createAdaptiveLodController.js";
import { createInitialLoadUxController } from "../loading/createInitialLoadUxController.js";
import { createSwedenStyle } from "../style/createSwedenStyle.js";

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
    antialias: false,
    renderWorldCopies: false,
    fadeDuration: 0,
    hash: SWEDEN_MAP_CONFIG.hash,
    maxTileCacheSize: 200,
    collectResourceTiming: false,
    crossSourceCollisions: false,
    trackResize: true,
    preserveDrawingBuffer: false,
    refreshExpiredTiles: false,
    pixelRatio: Math.min(devicePixelRatio, 2),
    dragRotate: true,
    touchZoomRotate: true,
    maxPitch: 85
  });

  map.addControl(
    new maplibregl.NavigationControl({ showZoom: true, showCompass: true, visualizePitch: true }),
    "top-right"
  );
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 180, unit: "metric" }));

  if (loadingOverlay) {
    createInitialLoadUxController({ map, loadingOverlay });
  }

  map.on("load", () => {
    createAdaptiveLodController({ map, lodConfig: LOD_CONFIG, onStatusChange });
    createCityWeatherLayer({ map, maplibregl });
    createWeatherPopup({ map, maplibregl });
  });

  return map;
};
