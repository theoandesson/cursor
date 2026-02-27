import { LOD_CONFIG, SWEDEN_DATA_SOURCES } from "../../config/swedenMapConfig.js";
import { createLayers } from "./createLayers.js";
import { SWEDEN_MAP_PALETTE } from "./palette/swedenPalette.js";
import { createSources } from "./createSources.js";

export const createSwedenStyle = () => ({
  version: 8,
  name: "sweden-3d-government-accuracy-profile",
  glyphs: SWEDEN_DATA_SOURCES.glyphs,
  sources: createSources(),
  layers: createLayers(),
  terrain: {
    source: LOD_CONFIG.settledTerrainSource,
    exaggeration: LOD_CONFIG.settledTerrainExaggeration
  },
  sky: {
    "sky-color": SWEDEN_MAP_PALETTE.skyColor,
    "sky-horizon-blend": 0.32,
    "horizon-color": SWEDEN_MAP_PALETTE.skyHorizonColor,
    "horizon-fog-blend": 0.35,
    "fog-color": SWEDEN_MAP_PALETTE.fogColor,
    "fog-ground-blend": 0.33,
    "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 4, 0.1, 9, 0.26]
  }
});
