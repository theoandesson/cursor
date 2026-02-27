import { registerTileCacheServiceWorker } from "../cache/registerTileCacheServiceWorker.js";
import { initSwedenMap } from "../map/bootstrap/initSwedenMap.js";
import { createCacheStatusPresenter } from "../ui/createCacheStatusPresenter.js";
import { createMapStatusPresenter } from "../ui/createMapStatusPresenter.js";

const MAP_ROOT_ID = "map-root";

export const bootstrapSwedenMapApp = ({ maplibregl }) => {
  const mapRootElement = document.getElementById(MAP_ROOT_ID);
  if (!mapRootElement) {
    throw new Error("Kartan kunde inte startas: saknar #map-root.");
  }

  const setStatus = createMapStatusPresenter({ mapRootElement });
  const setCacheStatus = createCacheStatusPresenter();

  setStatus({
    profile: "settled",
    message: "Laddar terräng- och byggnadsdata för Sverige…"
  });
  setCacheStatus("Tilecache initieras…");

  registerTileCacheServiceWorker({
    onStatusChange: setCacheStatus
  });

  initSwedenMap({
    maplibregl,
    container: mapRootElement,
    onStatusChange: setStatus
  });
};
