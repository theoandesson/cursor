import { createSwedenStyle } from "../style/createSwedenStyle.js";
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
  const [backgroundLayer, ...remainingLayers] = baseStyle.layers;

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
  [MAP_MODES.STANDARD]: createSwedenStyle,
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

const getStyleForMode = (mode) => {
  const buildStyle = STYLE_BUILDERS[mode] ?? STYLE_BUILDERS[MAP_MODES.STANDARD];
  return buildStyle();
};

let activeStyleSwitchId = 0;

export const applyMapMode = ({ map, mode, onStyleLoaded, onBeforeStyleChange }) => {
  const nextMode = STYLE_BUILDERS[mode] ? mode : MAP_MODES.STANDARD;
  const switchId = ++activeStyleSwitchId;
  const camera = captureCamera(map);
  const nextStyle = getStyleForMode(nextMode);

  onBeforeStyleChange?.();

  const handleStyleLoad = () => {
    if (switchId !== activeStyleSwitchId) {
      return;
    }

    restoreCamera(map, camera);
    onStyleLoaded?.({ mode: nextMode });
  };

  const applyStyle = () => {
    map.once("style.load", handleStyleLoad);
    map.setStyle(nextStyle);
  };

  if (map.isStyleLoaded()) {
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
