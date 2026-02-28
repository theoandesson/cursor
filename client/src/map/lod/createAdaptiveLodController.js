import { createDebouncedAction } from "./createDebouncedAction.js";
import { createVisualBuildingHeightExpression } from "../style/expressions/buildingExpressions.js";

const BUILDING_LAYER_ID = "sweden-buildings";
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
  let pixelRatio = null;
  let weatherLabelsVisible = true;
  let currentBuildingOpacity = null;
  let currentBuildingHeightScale = null;

  const defaultPixelRatio = Math.min(
    globalThis.devicePixelRatio ?? 1,
    lodConfig.maxPixelRatio
  );

  const isCloseRange = () => map.getZoom() >= lodConfig.closeRangeZoomThreshold;

  const setMapPixelRatio = (nextPixelRatio) => {
    if (pixelRatio === nextPixelRatio || typeof map.setPixelRatio !== "function") {
      return;
    }
    pixelRatio = nextPixelRatio;
    map.setPixelRatio(nextPixelRatio);
  };

  const setBuildingStyle = ({ heightScale, opacity }) => {
    if (!map.getLayer(BUILDING_LAYER_ID)) {
      return;
    }

    if (currentBuildingHeightScale !== heightScale) {
      currentBuildingHeightScale = heightScale;
      map.setPaintProperty(
        BUILDING_LAYER_ID,
        "fill-extrusion-height",
        createVisualBuildingHeightExpression(heightScale)
      );
    }

    if (currentBuildingOpacity !== opacity) {
      currentBuildingOpacity = opacity;
      map.setPaintProperty(BUILDING_LAYER_ID, "fill-extrusion-opacity", opacity);
    }
  };

  const setWeatherLabelVisibility = (visible) => {
    if (weatherLabelsVisible === visible) {
      return;
    }
    weatherLabelsVisible = visible;
    setLayerVisibility({ map, layerId: WEATHER_LABEL_LAYER_ID, visible });
  };

  const resolveStatusMessage = ({ profileName, closeRange }) => {
    if (profileName === "moving") {
      return closeRange
        ? "Närzoom i rörelse: prioriterar stabil, mjuk rendering."
        : "Rörelse: flytande rendering utan blockhopp.";
    }
    return closeRange
      ? "Närzoom: hög detalj med jämn 3D-terräng."
      : "Stilla: full detalj och färgsatt terräng.";
  };

  const applyProfile = (profileName) => {
    const closeRange = isCloseRange();
    if (currentProfile === profileName && currentCloseRange === closeRange) {
      return;
    }
    currentProfile = profileName;
    currentCloseRange = closeRange;

    const isMoving = profileName === "moving";
    const useCloseRangeMotionProfile = isMoving && closeRange;
    const buildingHeightScale = closeRange
      ? lodConfig.closeRangeBuildingHeightScale
      : lodConfig.defaultBuildingHeightScale;
    const buildingOpacity = isMoving
      ? lodConfig.movingBuildingOpacity
      : lodConfig.settledBuildingOpacity;

    setBuildingStyle({ heightScale: buildingHeightScale, opacity: buildingOpacity });
    setWeatherLabelVisibility(!useCloseRangeMotionProfile);
    setMapPixelRatio(
      useCloseRangeMotionProfile ? lodConfig.closeRangeMovingPixelRatio : defaultPixelRatio
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
    setWeatherLabelVisibility(true);
    setMapPixelRatio(defaultPixelRatio);
  };
};
