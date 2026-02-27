import { LOD_CONFIG, SWEDEN_MAP_CONFIG } from "../../config/swedenMapConfig.js";
import { createAdaptiveLodController } from "../lod/createAdaptiveLodController.js";
import { createSwedenStyle } from "../style/createSwedenStyle.js";

export const initSwedenMap = ({ maplibregl, container, onStatusChange }) => {
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
    hash: SWEDEN_MAP_CONFIG.hash
  });

  map.addControl(new maplibregl.NavigationControl({ showZoom: true }), "top-right");
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 180, unit: "metric" }));
  map.addControl(new maplibregl.TerrainControl({ source: "sweden-dem-high" }));

  map.on("load", () => {
    createAdaptiveLodController({
      map,
      lodConfig: LOD_CONFIG,
      onStatusChange
    });
  });

  return map;
};
