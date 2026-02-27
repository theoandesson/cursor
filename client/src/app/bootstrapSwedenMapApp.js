import { initSwedenMap } from "../map/bootstrap/initSwedenMap.js";
import { createMapStatusPresenter } from "../ui/createMapStatusPresenter.js";

const MAP_ROOT_ID = "map-root";

export const bootstrapSwedenMapApp = ({ maplibregl }) => {
  const mapRootElement = document.getElementById(MAP_ROOT_ID);
  if (!mapRootElement) {
    throw new Error("Kartan kunde inte startas: saknar #map-root.");
  }

  const setStatus = createMapStatusPresenter({ mapRootElement });
  setStatus({
    profile: "settled",
    message: "Laddar terräng- och byggnadsdata för Sverige…"
  });

  initSwedenMap({
    maplibregl,
    container: mapRootElement,
    onStatusChange: setStatus
  });
};
