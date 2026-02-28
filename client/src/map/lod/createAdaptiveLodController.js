import { createDebouncedAction } from "./createDebouncedAction.js";
import { TERRAIN_CONFIG } from "../../config/swedenMapConfig.js";
import { createVisualBuildingHeightExpression } from "../style/expressions/buildingExpressions.js";

const BUILDING_LAYER_ID = "sweden-buildings";
const ROAD_LABEL_LAYER_ID = "road-labels";
const WEATHER_LABEL_LAYER_ID = "city-weather-labels";

const setLayerVisibility = ({ map, layerId, visible }) => {
  if (!map.getLayer(layerId)) {
    return;
  }
  map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
};

export const createAdaptiveLodController = ({ map, lodConfig, onStatusChange }) => {
  let currentProfile = null;
  let currentCloseRange = null;
  let rafId = null;
  let terrainEnabled = true;
  let pixelRatio = null;

  const defaultPixelRatio = Math.min(
    globalThis.devicePixelRatio ?? 1,
    lodConfig.maxPixelRatio
  );

  const isCloseRange = () => map.getZoom() >= lodConfig.closeRangeZoomThreshold;

  const setMapTerrain = (enabled) => {
    if (terrainEnabled === enabled || typeof map.setTerrain !== "function") {
      return;
    }
    terrainEnabled = enabled;
    map.setTerrain(
      enabled
        ? {
            source: TERRAIN_CONFIG.source,
            exaggeration: TERRAIN_CONFIG.exaggeration
          }
        : null
    );
  };

  const setMapPixelRatio = (nextPixelRatio) => {
    if (pixelRatio === nextPixelRatio || typeof map.setPixelRatio !== "function") {
      return;
    }
    pixelRatio = nextPixelRatio;
    map.setPixelRatio(nextPixelRatio);
  };

  const resolveStatusMessage = ({ profileName, closeRange }) => {
    if (profileName === "moving") {
      return closeRange
        ? "Närzoom i rörelse: turbo-läge för mjukare respons."
        : "Rörelse: snabb rendering.";
    }
    return closeRange
      ? "Närzoom: hög detalj med optimerad 3D."
      : "Stilla: full detalj med terräng.";
  };

  const applyProfile = (profileName) => {
    const closeRange = isCloseRange();
    if (currentProfile === profileName && currentCloseRange === closeRange) {
      return;
    }
    currentProfile = profileName;
    currentCloseRange = closeRange;

    const isMoving = profileName === "moving";
    const useCloseRangeFastMode = isMoving && closeRange;

    setLayerVisibility({ map, layerId: BUILDING_LAYER_ID, visible: !isMoving });
    setLayerVisibility({ map, layerId: ROAD_LABEL_LAYER_ID, visible: !isMoving });
    setLayerVisibility({
      map,
      layerId: WEATHER_LABEL_LAYER_ID,
      visible: !(isMoving && closeRange)
    });

    if (map.getLayer(BUILDING_LAYER_ID)) {
      const buildingHeightScale = closeRange
        ? lodConfig.closeRangeBuildingHeightScale
        : lodConfig.defaultBuildingHeightScale;
      map.setPaintProperty(
        BUILDING_LAYER_ID,
        "fill-extrusion-height",
        createVisualBuildingHeightExpression(buildingHeightScale)
      );
    }

    setMapTerrain(!useCloseRangeFastMode);
    setMapPixelRatio(
      useCloseRangeFastMode
        ? lodConfig.closeRangeMovingPixelRatio
        : defaultPixelRatio
    );

    onStatusChange?.({
      profile: profileName,
      message: resolveStatusMessage({ profileName, closeRange })
    });
  };

  const scheduleSettled = createDebouncedAction(
    () => applyProfile("settled"),
    lodConfig.idleDelayMs
  );

  const enterMovingMode = () => {
    scheduleSettled.cancel();
    applyProfile("moving");
  };

  const queueSettledMode = () => {
    scheduleSettled();
  };

  const queueProfileRefresh = () => {
    if (rafId != null) {
      return;
    }
    rafId = requestAnimationFrame(() => {
      rafId = null;
      applyProfile(currentProfile ?? "settled");
    });
  };

  map.on("movestart", enterMovingMode);
  map.on("moveend", queueSettledMode);
  map.on("idle", queueSettledMode);
  map.on("zoom", queueProfileRefresh);

  applyProfile("settled");

  return () => {
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    scheduleSettled.cancel();
    map.off("movestart", enterMovingMode);
    map.off("moveend", queueSettledMode);
    map.off("idle", queueSettledMode);
    map.off("zoom", queueProfileRefresh);
    setMapTerrain(true);
    setMapPixelRatio(defaultPixelRatio);
  };
};
