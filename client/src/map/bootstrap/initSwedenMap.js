import {
  LOD_CONFIG,
  NAVIGATION_CONTROL_CONFIG,
  SWEDEN_MAP_CONFIG
} from "../../config/swedenMapConfig.js";
import { createPlaceCard, shouldIgnoreMapPlaceClick } from "../../places/createPlaceCard.js";
import { createSearchControl } from "../../search/createSearchControl.js";
import { createTrafficFlowLayer } from "../../traffic/createTrafficFlowLayer.js";
import { createCityWeatherLayer } from "../../weather/createCityWeatherLayer.js";
import { createWeatherPopup } from "../../weather/createWeatherPopup.js";
import { createDayNightController } from "../lighting/createDayNightController.js";
import { createLandmarkLayer } from "../landmarks/createLandmarkLayer.js";
import { createAdaptiveLodController } from "../lod/createAdaptiveLodController.js";
import { createViewportTileScheduler } from "../lod/createViewportTileScheduler.js";
import { createInitialLoadUxController } from "../loading/createInitialLoadUxController.js";
import { enableDeferredTerrain } from "../loading/enableDeferredTerrain.js";
import { scheduleDeferredWork } from "../loading/scheduleDeferredWork.js";
import { createOrientationControl } from "../navigation/createOrientationControl.js";
import { createMapModeControl } from "../modes/createMapModeControl.js";
import { getMapModeLabel } from "../modes/applyMapMode.js";
import { createViewportPrefetcher } from "../tiles/createViewportPrefetcher.js";
import { createTrafficControl } from "../../traffic/createTrafficControl.js";
import { createTransitLayer } from "../../traffic/createTransitLayer.js";
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
  loadingOverlay,
  perfTracker,
  onTiming,
  fetchFn,
  onBootstrapComplete,
  onCitiesUpdate
}) => {
  perfTracker?.mark("map-construct-start");

  let latestLodStatus = null;
  let latestTileStatus = null;
  let mapIdleRecorded = false;

  const publishStatus = (patch = {}) => {
    mergeStatusUpdate(onStatusChange, {
      ...latestLodStatus,
      ...latestTileStatus,
      ...patch
    });
  };

  const mapContainer = container;
  mapContainer.setAttribute("tabindex", "0");
  mapContainer.setAttribute("role", "application");
  mapContainer.setAttribute(
    "aria-label",
    mapContainer.getAttribute("aria-label") ?? "3D-karta över Sverige"
  );

  const map = new maplibregl.Map({
    container: mapContainer,
    style: createSwedenStyle({ includeTerrain: false }),
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
  let disposeLoadUx = null;
  let disposeLandmarks = null;
  let disposeLod = null;
  let disposeTileScheduler = null;
  let disposePrefetcher = null;
  let disposeMapClick = null;
  let disposeWeatherLayer = null;
  let disposeWeatherPopup = null;
  let disposeTrafficFlow = null;
  let disposeTransitLayer = null;
  let trafficFlowLayer = null;
  let transitLayer = null;
  let trafficControl = null;
  let trafficControlAdded = false;
  let dayNightController = null;
  let disposeDeferredTerrain = null;
  let cancelDeferredMount = null;
  let mapCoreMounted = false;
  let mapFeaturesMounted = false;

  if (loadingOverlay) {
    disposeLoadUx = createInitialLoadUxController({ map, loadingOverlay, perfTracker });
  }

  map.addControl(
    createSearchControl({
      map,
      mapConfig: SWEDEN_MAP_CONFIG,
      onPlaceSelect: (result, { trigger } = {}) => {
        placeCard?.showPlace(result, { trigger });
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

  const ensureTrafficControl = () => {
    if (trafficControl) {
      return trafficControl;
    }

    trafficControl = createTrafficControl({
      map,
      dayNightController,
      onStateChange: (trafficState) => {
        trafficFlowLayer?.setVisible(trafficState.trafficFlow);
        transitLayer?.setVisible(trafficState.transit);
        publishStatus({
          trafficFlow: trafficState.trafficFlow,
          transit: trafficState.transit,
          roadLabels: trafficState.roadLabels,
          trafficLegend: trafficState.legend,
          message: trafficState.trafficFlow
            ? "Trafikflöde visas på kartan."
            : trafficState.transit
              ? "Kollektivtrafik visas på kartan."
              : latestLodStatus?.message ?? "Trafikflöde dolt."
        });
      }
    });

    if (!trafficControlAdded) {
      map.addControl(trafficControl.control, "bottom-left");
      trafficControlAdded = true;
    }

    return trafficControl;
  };

  const teardownMapFeatures = () => {
    cancelDeferredMount?.();
    cancelDeferredMount = null;
    disposeDeferredTerrain?.();
    disposeDeferredTerrain = null;

    if (!mapFeaturesMounted && !mapCoreMounted) {
      return;
    }

    disposeWeatherLayer?.();
    disposeWeatherLayer = null;
    disposeWeatherPopup?.();
    disposeWeatherPopup = null;
    disposeTrafficFlow?.();
    disposeTrafficFlow = null;
    trafficFlowLayer = null;
    disposeTransitLayer?.();
    disposeTransitLayer = null;
    transitLayer = null;
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
    mapCoreMounted = false;
  };

  const mountDeferredMapFeatures = () => {
    if (mapFeaturesMounted) {
      return;
    }

    disposeWeatherLayer = createCityWeatherLayer({
      map,
      maplibregl,
      perfTracker,
      onTiming,
      fetchFn,
      onBootstrapComplete,
      onCitiesUpdate
    });

    disposeLandmarks = createLandmarkLayer({ map, maplibregl });

    const activeTrafficControl = ensureTrafficControl();
    const trafficState = activeTrafficControl.getState();

    trafficFlowLayer = createTrafficFlowLayer({
      map,
      maplibregl,
      initialVisible: trafficState.trafficFlow
    });
    disposeTrafficFlow = trafficFlowLayer.destroy;

    transitLayer = createTransitLayer({
      map,
      maplibregl,
      initialVisible: trafficState.transit
    });
    disposeTransitLayer = transitLayer.destroy;
    trafficControl.setTransitLayer(transitLayer);

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

    disposePrefetcher = createViewportPrefetcher(map, { deferInitialPrefetch: true });
    disposePrefetcher.start();
    mapFeaturesMounted = true;
  };

  const mountCoreMapFeatures = () => {
    if (mapCoreMounted) {
      return;
    }

    perfTracker?.recordMilestone("map-load");
    perfTracker?.measure("map-construct", "map-construct-start", "milestone:map-load");

    if (!placeCard) {
      placeCard = createPlaceCard({ map, mapConfig: SWEDEN_MAP_CONFIG });
    }

    const weatherPopup = createWeatherPopup({
      map,
      maplibregl,
      perfTracker,
      fetchFn,
      onShow: () => placeCard?.close()
    });
    disposeWeatherPopup = weatherPopup.destroy;

    const onMapClick = (event) => {
      if (shouldIgnoreMapPlaceClick(map, event)) {
        return;
      }

      weatherPopup.popup.remove();
      placeCard.openAt(event.lngLat, { trigger: mapContainer });
    };

    map.on("click", onMapClick);
    disposeMapClick = () => map.off("click", onMapClick);

    dayNightController.setMode(dayNightController.getMode());
    ensureTrafficControl().applyState();
    disposeDeferredTerrain = enableDeferredTerrain(map);
    mapCoreMounted = true;
  };

  const mountMapFeatures = () => {
    mountCoreMapFeatures();
    mountDeferredMapFeatures();
  };

  const scheduleDeferredMapFeatures = () => {
    cancelDeferredMount?.();
    cancelDeferredMount = scheduleDeferredWork(() => {
      mountDeferredMapFeatures();
    });
  };

  map.addControl(
    createMapModeControl({
      map,
      onBeforeStyleChange: teardownMapFeatures,
      onStyleLoaded: () => {
        mountMapFeatures();
      },
      onModeChange: (mode) => {
        publishStatus({
          mapMode: mode,
          message: `Kartläge: ${getMapModeLabel(mode)}.`
        });
      }
    }),
    "top-right"
  );

  map.addControl(
    new maplibregl.NavigationControl({ showZoom: true, showCompass: true, visualizePitch: true }),
    "bottom-right"
  );
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 180, unit: "metric" }), "bottom-left");

  map.once("load", () => {
    mountCoreMapFeatures();
    scheduleDeferredMapFeatures();
  });

  map.once("idle", () => {
    if (mapIdleRecorded) {
      return;
    }
    mapIdleRecorded = true;
    perfTracker?.recordMilestone("map-idle");
    perfTracker?.measure("map-load-to-idle", "milestone:map-load", "milestone:map-idle");
  });

  const originalRemove = map.remove.bind(map);
  map.remove = () => {
    teardownMapFeatures();
    trafficControl?.destroy();
    trafficControl = null;
    disposeLoadUx?.();
    disposeLoadUx = null;
    placeCard?.destroy();
    placeCard = null;
    dayNightController?.destroy();
    dayNightController = null;
    return originalRemove();
  };

  return map;
};
