import { LOD_CONFIG, SWEDEN_MAP_CONFIG } from "../../config/swedenMapConfig.js";
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
    maxBounds: SWEDEN_MAP_CONFIG.maxBounds,
    pitch: SWEDEN_MAP_CONFIG.pitch,
    bearing: SWEDEN_MAP_CONFIG.bearing,
    antialias: SWEDEN_MAP_CONFIG.antialias,
    renderWorldCopies: false,
    fadeDuration: 200,
    hash: SWEDEN_MAP_CONFIG.hash
  });

  map.addControl(new maplibregl.NavigationControl({ showZoom: true }), "top-right");
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 180, unit: "metric" }));
  map.addControl(new maplibregl.TerrainControl({ source: "sweden-dem-high" }));

  if (loadingOverlay) {
    createInitialLoadUxController({
      map,
      loadingOverlay
    });
  }

  map.on("load", () => {
    createAdaptiveLodController({
      map,
      lodConfig: LOD_CONFIG,
      onStatusChange
    });
  });

  return map;
};
