import { TERRAIN_CONFIG } from "../../config/swedenMapConfig.js";
import { getActiveGlyphsUrl } from "../tiles/swedenTileSources.js";
import { createLayers } from "./createLayers.js";
import { SWEDEN_MAP_PALETTE } from "./palette/swedenPalette.js";
import { createSources } from "./createSources.js";

export const createSwedenStyle = ({ mode, includeTerrain = true } = {}) => {
  const style = {
    version: 8,
    name: "sweden-3d-perf-profile",
    glyphs: getActiveGlyphsUrl(),
    sources: createSources({ mode }),
    layers: createLayers({ mode }),
    light: {
      anchor: "viewport",
      color: "#ffffff",
      intensity: 0.42,
      position: [1.12, 205, 32]
    },
    sky: {
      "sky-color": SWEDEN_MAP_PALETTE.skyColor,
      "sky-horizon-blend": 0.42,
      "horizon-color": SWEDEN_MAP_PALETTE.skyHorizonColor,
      "horizon-fog-blend": 0.42,
      "fog-color": SWEDEN_MAP_PALETTE.fogColor,
      "fog-ground-blend": 0.48,
      "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 4, 0.1, 9, 0.28, 14, 0.36]
    }
  };

  if (includeTerrain) {
    style.terrain = {
      source: TERRAIN_CONFIG.source,
      exaggeration: TERRAIN_CONFIG.exaggeration
    };
  }

  return style;
};
