import {
  LOD_CONFIG,
  NAVIGATION_CONTROL_CONFIG,
  SWEDEN_MAP_CONFIG
} from "../../config/swedenMapConfig.js";
import { createPlaceCard, shouldIgnoreMapPlaceClick } from "../../places/createPlaceCard.js";
import { createSearchControl } from "../../search/createSearchControl.js";
import { createCityWeatherLayer } from "../../weather/createCityWeatherLayer.js";
import { createWeatherPopup } from "../../weather/createWeatherPopup.js";
import { createDayNightController } from "../lighting/createDayNightController.js";
import { createLandmarkLayer } from "../landmarks/createLandmarkLayer.js";
import { createAdaptiveLodController } from "../lod/createAdaptiveLodController.js";
import { createViewportTileScheduler } from "../lod/createViewportTileScheduler.js";
import { createInitialLoadUxController } from "../loading/createInitialLoadUxController.js";
import { createOrientationControl } from "../navigation/createOrientationControl.js";
import { createMapModeControl } from "../modes/createMapModeControl.js";
import { createViewportPrefetcher } from "../tiles/createViewportPrefetcher.js";
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

const mergeStatusUpdate = (onStatusChange, patch) => {
  onStatusChange?.(patch);
};

export const initSwedenMap = ({
  maplibregl,
  container,
  onStatusChange,
  loadingOverlay
}) => {
  let latestLodStatus = null;
  let latestTileStatus = null;

  const publishStatus = (patch = {}) => {
    mergeStatusUpdate(onStatusChange, {
      ...latestLodStatus,
      ...latestTileStatus,
      ...patch
    });
  };

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
    fadeDuration: 280,
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

  let placeCard = null;

  map.addControl(
    createSearchControl({
      map,
      mapConfig: SWEDEN_MAP_CONFIG,
      onPlaceSelect: (result) => {
        placeCard?.showPlace(result);
      }
    }),
    "top-left"
  );

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

  let disposeLandmarks = null;
  let disposeLod = null;
  let disposeTileScheduler = null;
  let disposePrefetcher = null;
  let disposeMapClick = null;
  let dayNightController = null;
  let mapFeaturesMounted = false;

  const teardownMapFeatures = () => {
    disposePrefetcher?.destroy();
    disposePrefetcher = null;
    disposeTileScheduler?.();
    disposeTileScheduler = null;
    disposeLod?.();
    disposeLod = null;
    disposeLandmarks?.();
    disposeLandmarks = null;
    disposeMapClick?.();
    disposeMapClick = null;
    mapFeaturesMounted = false;
  };

  const mountMapFeatures = () => {
    if (mapFeaturesMounted) {
      teardownMapFeatures();
    }

    createCityWeatherLayer({ map, maplibregl });
    createWeatherPopup({ map, maplibregl });

    if (!placeCard) {
      placeCard = createPlaceCard({ map, mapConfig: SWEDEN_MAP_CONFIG });
    }

    const onMapClick = (event) => {
      if (shouldIgnoreMapPlaceClick(map, event)) {
        return;
      }

      placeCard.openAt(event.lngLat);
    };

    map.on("click", onMapClick);
    disposeMapClick = () => map.off("click", onMapClick);

    if (!dayNightController) {
      dayNightController = createDayNightController({
        map,
        initialMode: "day",
        onModeChange: (mode) => {
          publishStatus({
            dayNightMode: mode,
            message:
              mode === "night"
                ? "Nattläge: dämpad palett och mörkare himmel."
                : latestLodStatus?.message ?? "Dagläge: full färgskala aktiverad."
          });
        }
      });
      map.addControl(dayNightController.control, "top-right");
    } else {
      dayNightController.setMode(dayNightController.getMode());
    }

    disposeLandmarks = createLandmarkLayer({ map, maplibregl });

    disposeLod = createAdaptiveLodController({
      map,
      lodConfig: LOD_CONFIG,
      onStatusChange: (status) => {
        latestLodStatus = status;
        publishStatus(status);
      }
    });

    disposeTileScheduler = createViewportTileScheduler({
      map,
      onStatusChange: (status) => {
        latestTileStatus = status;
        publishStatus(status);
      }
    });

    disposePrefetcher = createViewportPrefetcher(map);
    mapFeaturesMounted = true;
  };

  map.addControl(
    createMapModeControl({
      map,
      onStyleLoaded: () => {
        mountMapFeatures();
      },
      onModeChange: (mode) => {
        publishStatus({
          mapMode: mode,
          message: `Kartläge: ${mode}.`
        });
      }
    }),
    "top-right"
  );

  map.on("load", mountMapFeatures);

  const originalRemove = map.remove.bind(map);
  map.remove = () => {
    teardownMapFeatures();
    dayNightController?.destroy();
    dayNightController = null;
    placeCard = null;
    return originalRemove();
  };

  return map;
};
