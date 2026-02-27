import { LOD_CONFIG, SWEDEN_DATA_SOURCES } from "../../config/swedenMapConfig.js";
import { createLayers } from "./createLayers.js";
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
    "sky-color": "#02122a",
    "sky-horizon-blend": 0.45,
    "horizon-color": "#123f7a",
    "horizon-fog-blend": 0.2,
    "fog-color": "#0f192e",
    "fog-ground-blend": 0.2,
    "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 4, 0.06, 9, 0.2]
  }
});
