import { TERRAIN_CONFIG } from "../../config/swedenMapConfig.js";
import { GLYPHS_URL } from "../tiles/swedenTileSources.js";
import { createLayers } from "./createLayers.js";
import { SWEDEN_MAP_PALETTE } from "./palette/swedenPalette.js";
import { createSources } from "./createSources.js";

export const createSwedenStyle = ({ mode } = {}) => ({
  version: 8,
  name: "sweden-3d-perf-profile",
  glyphs: GLYPHS_URL,
  sources: createSources({ mode }),
  layers: createLayers({ mode }),
  terrain: {
    source: TERRAIN_CONFIG.source,
    exaggeration: TERRAIN_CONFIG.exaggeration
  },
  sky: {
    "sky-color": SWEDEN_MAP_PALETTE.skyColor,
    "sky-horizon-blend": 0.3,
    "horizon-color": SWEDEN_MAP_PALETTE.skyHorizonColor,
    "horizon-fog-blend": 0.3,
    "fog-color": SWEDEN_MAP_PALETTE.fogColor,
    "fog-ground-blend": 0.3,
    "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 4, 0.08, 9, 0.2]
  }
});
