import { registerTileCacheServiceWorker } from "../cache/registerTileCacheServiceWorker.js";
import { initSwedenMap } from "../map/bootstrap/initSwedenMap.js";
import { createPerfPanel } from "../panels/createPerfPanel.js";
import { createFetchWithTiming } from "../perf/fetchWithTiming.js";
import { createCacheStatusPresenter } from "../ui/createCacheStatusPresenter.js";
import { createLoadingOverlayPresenter } from "../ui/createLoadingOverlayPresenter.js";
import { createMapStatusPresenter } from "../ui/createMapStatusPresenter.js";

const MAP_ROOT_ID = "map-root";

const createBootstrapOnTiming = (perfTracker) => {
  if (!perfTracker) {
    return undefined;
  }

  return ({ phase, durationMs, cacheStatus }) => {
    perfTracker.recordApiCall({
      url: `/api/bootstrap#${phase}`,
      durationMs,
      status: 200,
      cacheStatus: cacheStatus ?? "NETWORK"
    });
  };
};

export const bootstrapSwedenMapApp = ({ maplibregl, perfTracker }) => {
  perfTracker?.recordMilestone("bootstrap-start");

  const mapRootElement = document.getElementById(MAP_ROOT_ID);
  if (!mapRootElement) {
    throw new Error("Kartan kunde inte startas: saknar #map-root.");
  }

  const fetchWithTiming = perfTracker ? createFetchWithTiming(perfTracker) : fetch;
  const endBootstrapApi = perfTracker?.startSpan("api-bootstrap");
  const onTiming = createBootstrapOnTiming(perfTracker);

  const setStatus = createMapStatusPresenter({ mapRootElement });
  const setCacheStatus = createCacheStatusPresenter();
  const loadingOverlay = createLoadingOverlayPresenter({ mapRootElement });

  perfTracker?.recordMilestone("app-shell-ready");

  setStatus({
    profile: "settled",
    message: "Laddar terräng- och byggnadsdata för Sverige…"
  });
  setCacheStatus("Tilecache initieras…");

  perfTracker?.recordMilestone("sw-register-start");

  const endSwRegister = perfTracker?.startSpan("sw-register");
  registerTileCacheServiceWorker({
    onStatusChange: setCacheStatus
  }).finally(() => {
    endSwRegister?.();
    perfTracker?.recordMilestone("sw-register-done");
  });

  perfTracker?.recordMilestone("map-init-start");

  initSwedenMap({
    maplibregl,
    container: mapRootElement,
    onStatusChange: setStatus,
    loadingOverlay,
    perfTracker,
    onTiming,
    fetchFn: fetchWithTiming
  });

  endBootstrapApi?.();
  perfTracker?.recordMilestone("shell-ready");

  createPerfPanel({
    perfTracker,
    container: mapRootElement
  });
};
