import { STYLE_LAYER_IDS } from "../constants/styleLayerIds.js";

const DEFAULT_CANDIDATES = Object.freeze([
  STYLE_LAYER_IDS.ROAD_LABELS,
  STYLE_LAYER_IDS.HYBRID_ROAD_LABELS,
  STYLE_LAYER_IDS.BUILDINGS,
  "swedish-landmarks-halo"
]);

/**
 * Resolves a safe beforeLayerId for overlay insertion across map modes.
 * Returns undefined when no candidate exists so MapLibre appends on top.
 */
export const resolveBeforeLayerId = (map, candidates = DEFAULT_CANDIDATES) => {
  if (!map || typeof map.getLayer !== "function") {
    return undefined;
  }

  for (const layerId of candidates) {
    if (layerId && map.getLayer(layerId)) {
      return layerId;
    }
  }

  return undefined;
};
