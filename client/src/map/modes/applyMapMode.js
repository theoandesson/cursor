import { createSwedenStyle } from "../style/createSwedenStyle.js";
import {
  getActiveVectorTileTemplate,
  isSelfHostedTileMode
} from "../tiles/swedenTileSources.js";
import {
  createHybridStyle,
  createSatelliteStyle
} from "./createSatelliteStyle.js";
import { MAP_MODES, TERRAIN_MODE_CONFIG } from "./mapModes.js";

const createHillshadeLayer = () => ({
  id: "terrain-hillshade",
  type: "hillshade",
  source: "sweden-dem",
  paint: {
    "hillshade-exaggeration": TERRAIN_MODE_CONFIG.hillshade.exaggeration,
    "hillshade-shadow-color": TERRAIN_MODE_CONFIG.hillshade.shadowColor,
    "hillshade-highlight-color": TERRAIN_MODE_CONFIG.hillshade.highlightColor,
    "hillshade-accent-color": TERRAIN_MODE_CONFIG.hillshade.accentColor,
    "hillshade-illumination-direction":
      TERRAIN_MODE_CONFIG.hillshade.illuminationDirection
  }
});

const createTerrainStyle = () => {
  const baseStyle = createSwedenStyle();
  const layers = Array.isArray(baseStyle.layers) ? baseStyle.layers : [];

  if (layers.length === 0) {
    return {
      ...baseStyle,
      name: "sweden-terrain",
      layers: [createHillshadeLayer()],
      terrain: {
        ...baseStyle.terrain,
        exaggeration: TERRAIN_MODE_CONFIG.exaggeration
      }
    };
  }

  const [backgroundLayer, ...remainingLayers] = layers;

  return {
    ...baseStyle,
    name: "sweden-terrain",
    layers: [backgroundLayer, createHillshadeLayer(), ...remainingLayers],
    terrain: {
      ...baseStyle.terrain,
      exaggeration: TERRAIN_MODE_CONFIG.exaggeration
    }
  };
};

const STYLE_BUILDERS = Object.freeze({
  [MAP_MODES.STANDARD]: () => createSwedenStyle({ includeTerrain: false }),
  [MAP_MODES.SATELLITE]: createSatelliteStyle,
  [MAP_MODES.TERRAIN]: createTerrainStyle,
  [MAP_MODES.HYBRID]: createHybridStyle
});

const captureCamera = (map) => ({
  center: map.getCenter(),
  zoom: map.getZoom(),
  pitch: map.getPitch(),
  bearing: map.getBearing()
});

const restoreCamera = (map, camera) => {
  map.jumpTo({
    center: camera.center,
    zoom: camera.zoom,
    pitch: camera.pitch,
    bearing: camera.bearing
  });
};

const applyActiveVectorTemplate = (style, { useSelfHostedVector } = {}) => {
  const vectorSource = style?.sources?.sweden_vector;
  if (!vectorSource) {
    return style;
  }

  return {
    ...style,
    sources: {
      ...style.sources,
      sweden_vector: {
        ...vectorSource,
        tiles: [getActiveVectorTileTemplate({ useSelfHostedVector })]
      }
    }
  };
};

const getStyleForMode = (mode, { useSelfHostedVector } = {}) => {
  const buildStyle = STYLE_BUILDERS[mode] ?? STYLE_BUILDERS[MAP_MODES.STANDARD];
  return applyActiveVectorTemplate(buildStyle(), { useSelfHostedVector });
};

let activeStyleSwitchId = 0;

export const applyMapMode = ({
  map,
  mode,
  onStyleLoaded,
  onStyleError,
  onBeforeStyleChange
}) => {
  const nextMode = STYLE_BUILDERS[mode] ? mode : MAP_MODES.STANDARD;
  const switchId = ++activeStyleSwitchId;
  const useSelfHostedVector = isSelfHostedTileMode();
  const camera = captureCamera(map);
  const nextStyle = getStyleForMode(nextMode, { useSelfHostedVector });

  onBeforeStyleChange?.();

  let cleanedUp = false;

  const cleanupListeners = () => {
    if (cleanedUp) {
      return;
    }
    cleanedUp = true;
    map.off("style.load", handleStyleLoad);
    map.off("error", handleStyleError);
  };

  const handleStyleLoad = () => {
    if (switchId !== activeStyleSwitchId) {
      cleanupListeners();
      return;
    }

    cleanupListeners();
    restoreCamera(map, camera);
    onStyleLoaded?.({ mode: nextMode });
  };

  const handleStyleError = (event) => {
    if (switchId !== activeStyleSwitchId) {
      return;
    }

    cleanupListeners();
    onStyleError?.(event);
  };

  const applyStyle = () => {
    map.once("style.load", handleStyleLoad);
    map.once("error", handleStyleError);
    map.setStyle(nextStyle);
  };

  if (map.loaded()) {
    applyStyle();
  } else {
    map.once("load", applyStyle);
  }

  return nextMode;
};

export const getMapModeLabel = (mode) => {
  switch (mode) {
    case MAP_MODES.SATELLITE:
      return "Satellit";
    case MAP_MODES.TERRAIN:
      return "Terräng";
    case MAP_MODES.HYBRID:
      return "Hybrid";
    default:
      return "Karta";
  }
};
