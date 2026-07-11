import {
  LOD_CONFIG,
  NAVIGATION_CONTROL_CONFIG,
  SWEDEN_MAP_CONFIG
} from "../../config/swedenMapConfig.js";
import { createOverlaySystem } from "../../overlays/bootstrap/createOverlaySystem.js";
import { createPlaceCard, shouldIgnoreMapPlaceClick } from "../../places/createPlaceCard.js";
import { createSearchControl } from "../../search/createSearchControl.js";
import { createCityWeatherLayer } from "../../weather/createCityWeatherLayer.js";
import { createWeatherPopup } from "../../weather/createWeatherPopup.js";
import { createDayNightController } from "../lighting/createDayNightController.js";
import { createLandmarkLayer } from "../landmarks/createLandmarkLayer.js";
import { createAdaptiveLodController } from "../lod/createAdaptiveLodController.js";
import { createViewportTileScheduler } from "../lod/createViewportTileScheduler.js";
import { createMapLoadingOrchestrator } from "../loading/createMapLoadingOrchestrator.js";
import { enableDeferredTerrain } from "../loading/enableDeferredTerrain.js";
import { createStagedFeatureMount } from "../loading/createStagedFeatureMount.js";
import { createOrientationControl } from "../navigation/createOrientationControl.js";
import { createMapModeControl } from "../modes/createMapModeControl.js";
import { getMapModeLabel } from "../modes/applyMapMode.js";
import { createMobileFabMenu } from "../mobile/createMobileFabMenu.js";
import { DEFAULT_MAP_MODE } from "../modes/mapModes.js";
import { createViewportPrefetcher } from "../tiles/createViewportPrefetcher.js";
import {
  getActiveVectorTileTemplate,
  getPrefetchableTileTemplatesForMode,
  isSelfHostedTileMode
} from "../tiles/swedenTileSources.js";
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
  onCitiesUpdate,
  bootstrapPrefetch
}) => {
  perfTracker?.mark("map-construct-start");

  let latestLodStatus = null;
  let latestTileStatus = null;
  let mapIdleRecorded = false;
  let currentMapMode = DEFAULT_MAP_MODE;

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

  const useSelfHostedVector = isSelfHostedTileMode();
  const activeVectorTileTemplate = getActiveVectorTileTemplate({
    useSelfHostedVector
  });
  const resolvePrefetchTileTemplates = (mode = currentMapMode) =>
    getPrefetchableTileTemplatesForMode(mode, {
      useSelfHostedVector
    });

  if (perfTracker) {
    console.debug("[initSwedenMap] Tile mode", {
      mode: useSelfHostedVector ? "self-hosted" : "external",
      vectorTemplate: activeVectorTileTemplate
    });
  }

  const initialStyle = createSwedenStyle({ includeTerrain: false });
  if (initialStyle?.sources?.sweden_vector) {
    initialStyle.sources.sweden_vector = {
      ...initialStyle.sources.sweden_vector,
      tiles: [activeVectorTileTemplate]
    };
  }

  const map = new maplibregl.Map({
    container: mapContainer,
    style: initialStyle,
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
  let dayNightController = null;
  let mapModeControl = null;
  let mobileFabMenu = null;
  let disposeOverlaySystem = null;
  let overlayManager = null;
  let unsubscribeOverlayStatus = null;
  let refreshRoadLabels = null;
  let disposeDeferredTerrain = null;
  let cancelDeferredMount = null;
  let mapCoreMounted = false;
  let mapFeaturesMounted = false;

  if (loadingOverlay) {
    disposeLoadUx = createMapLoadingOrchestrator({ map, loadingOverlay, perfTracker });
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
    unsubscribeOverlayStatus?.();
    unsubscribeOverlayStatus = null;
    refreshRoadLabels = null;
    overlayManager = null;
    disposePrefetcher?.destroy();
    disposePrefetcher = null;
    disposeTileScheduler?.();
    disposeTileScheduler = null;
    disposeLod?.();
    disposeLod = null;
    disposeLandmarks?.();
    disposeLandmarks = null;
    disposeOverlaySystem?.();
    disposeOverlaySystem = null;
    disposeMapClick?.();
    disposeMapClick = null;
    mapFeaturesMounted = false;
    mapCoreMounted = false;
  };

  const resolveOverlayMessage = (overlays) => {
    const trafficFlow = overlays.find((overlay) => overlay.id === "traffic-flow");
    const transit = overlays.find((overlay) => overlay.id === "transit");

    if (trafficFlow?.visible) {
      return "Trafikflöde visas på kartan.";
    }
    if (transit?.visible) {
      return "Kollektivtrafik visas på kartan.";
    }
    return latestLodStatus?.message ?? "Kartlager uppdaterade.";
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
    disposeDeferredTerrain = enableDeferredTerrain(map);
    mapCoreMounted = true;
  };

  const scheduleDeferredMapFeatures = () => {
    cancelDeferredMount?.();

    cancelDeferredMount = createStagedFeatureMount({
      stages: [
        {
          name: "weather",
          priority: 1,
          mount: () => {
            disposeWeatherLayer = createCityWeatherLayer({
              map,
              maplibregl,
              perfTracker,
              onTiming,
              fetchFn,
              onBootstrapComplete,
              onCitiesUpdate,
              bootstrapPrefetch
            });
          }
        },
        {
          name: "overlays",
          priority: 2,
          mount: () => {
            const overlaySystem = createOverlaySystem({ map, maplibregl });
            overlayManager = overlaySystem.overlayManager;
            void overlaySystem.mount();
            disposeOverlaySystem = () => {
              void overlaySystem.dispose();
            };
            unsubscribeOverlayStatus = overlaySystem.onStatusChange(({ overlays }) => {
              refreshRoadLabels?.();
              mobileFabMenu?.refresh?.();
              publishStatus({
                trafficFlow: overlays.find((overlay) => overlay.id === "traffic-flow")?.visible ?? false,
                transit: overlays.find((overlay) => overlay.id === "transit")?.visible ?? false,
                roadLabels: overlays.find((overlay) => overlay.id === "road-labels")?.visible ?? true,
                message: resolveOverlayMessage(overlays)
              });
            });
          }
        },
        {
          name: "lod-and-scheduler",
          priority: 3,
          mount: () => {
            if (!disposePrefetcher) {
              disposePrefetcher = createViewportPrefetcher(map, {
                deferInitialPrefetch: true,
                tileTemplates: resolvePrefetchTileTemplates()
              });
              disposePrefetcher.start();
            }

            disposeLod = createAdaptiveLodController({
              map,
              lodConfig: LOD_CONFIG,
              isRoadLabelsEnabled: () =>
                overlayManager?.getState().overlays.find((overlay) => overlay.id === "road-labels")
                  ?.visible ?? true,
              onStatusChange: (status) => {
                latestLodStatus = status;
                publishStatus(status);
              },
              onReady: ({ refreshRoadLabels: refreshLabels }) => {
                refreshRoadLabels = refreshLabels;
                refreshRoadLabels?.();
              }
            });

            disposeTileScheduler = createViewportTileScheduler({
              map,
              onStatusChange: (status) => {
                latestTileStatus = status;
                publishStatus(status);
              },
              onSchedule: (prioritizedTiles) => {
                disposePrefetcher?.applyPrioritizedTileKeys(prioritizedTiles);
              }
            });
          }
        },
        {
          name: "landmarks",
          priority: 4,
          mount: () => {
            disposeLandmarks = createLandmarkLayer({ map, maplibregl });
          }
        },
        {
          name: "prefetcher",
          priority: 5,
          mount: () => {
            if (!disposePrefetcher) {
              disposePrefetcher = createViewportPrefetcher(map, {
                deferInitialPrefetch: true,
                tileTemplates: resolvePrefetchTileTemplates()
              });
            }
            disposePrefetcher.setTileTemplates(resolvePrefetchTileTemplates());
            disposePrefetcher.start();
          }
        }
      ]
    });

    mapFeaturesMounted = true;
  };

  map.addControl(
    (mapModeControl = createMapModeControl({
      map,
      onBeforeStyleChange: () => {
        if (loadingOverlay) {
          loadingOverlay.show();
          loadingOverlay.setMessage("Byter kartläge…");
        }
        teardownMapFeatures();
      },
      onStyleLoaded: (mode) => {
        currentMapMode = mode;
        disposePrefetcher?.setTileTemplates(resolvePrefetchTileTemplates(mode));
        mountCoreMapFeatures();
        scheduleDeferredMapFeatures();
        if (loadingOverlay) {
          map.once("idle", () => {
            loadingOverlay.hide();
          });
        }
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

  mobileFabMenu = createMobileFabMenu({
    getDayNight: () => dayNightController,
    getMapMode: () => mapModeControl,
    getOverlayManager: () => overlayManager
  });
  map.addControl(mobileFabMenu, "bottom-right");

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
    disposeLoadUx?.();
    disposeLoadUx = null;
    placeCard?.destroy();
    placeCard = null;
    disposeOverlaySystem?.();
    disposeOverlaySystem = null;
    dayNightController?.destroy();
    dayNightController = null;
    mapModeControl = null;
    mobileFabMenu = null;
    return originalRemove();
  };

  return map;
};
