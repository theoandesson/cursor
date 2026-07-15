import { createDebouncedAction } from "./createDebouncedAction.js";
import { createVisualBuildingHeightExpression } from "../style/expressions/buildingExpressions.js";
import { ROAD_NAME_LABEL_LAYER_IDS } from "../../overlays/constants/styleLayerIds.js";

const BUILDING_LAYER_ID = "sweden-buildings";
const WEATHER_LABEL_LAYER_ID = "city-weather-labels";

const PAINT_TRANSITION = { duration: 320, delay: 0 };
const INSTANT_TRANSITION = { duration: 0, delay: 0 };

const setLayerVisibility = ({ map, layerId, visible }) => {
  if (!map.getLayer(layerId)) {
    return;
  }
  map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
};

const resolveZoomTier = (zoom, lodConfig) => {
  if (zoom < lodConfig.mediumZoomThreshold) {
    return "far";
  }
  if (zoom < lodConfig.closeZoomThreshold) {
    return "medium";
  }
  return "close";
};

const resolveZoomTierProfile = ({ tier, lodConfig, isMoving, closeRange }) => {
  const tierProfile = lodConfig.zoomTierProfiles[tier];
  const buildingHeightScale = closeRange
    ? lodConfig.closeRangeBuildingHeightScale
    : tierProfile.buildingHeightScale;
  const buildingOpacity = isMoving
    ? tierProfile.movingBuildingOpacity
    : tierProfile.settledBuildingOpacity;

  return {
    buildingHeightScale,
    buildingOpacity,
    hideRoadLabels: isMoving && tierProfile.hideRoadLabelsWhileMoving,
    hideWeatherLabels: isMoving && closeRange,
    pixelRatio: isMoving && closeRange ? lodConfig.closeRangeMovingPixelRatio : null
  };
};

const lerp = (from, to, amount) => from + (to - from) * amount;

export const createAdaptiveLodController = ({
  map,
  lodConfig,
  onStatusChange,
  isRoadLabelsEnabled = () => true,
  isCityWeatherEnabled = () => true,
  onReady
}) => {
  let currentProfile = null;
  let currentZoomTier = null;
  let currentCloseRange = null;
  let rafId = null;
  let transitionRafId = null;
  let pixelRatio = null;
  let weatherLabelsVisible = true;
  let roadLabelsVisible = true;
  const roadLabelVisibility = new Map(
    ROAD_NAME_LABEL_LAYER_IDS.map((layerId) => [layerId, true])
  );
  let currentBuildingOpacity = null;
  let currentBuildingHeightScale = null;
  let animatedBuildingOpacity = null;

  const defaultPixelRatio = Math.min(
    globalThis.devicePixelRatio ?? 1,
    lodConfig.maxPixelRatio
  );

  const isCloseRange = () => map.getZoom() >= lodConfig.closeZoomThreshold;

  const setMapPixelRatio = (nextPixelRatio) => {
    const resolvedPixelRatio = nextPixelRatio ?? defaultPixelRatio;
    if (pixelRatio === resolvedPixelRatio || typeof map.setPixelRatio !== "function") {
      return;
    }
    pixelRatio = resolvedPixelRatio;
    map.setPixelRatio(resolvedPixelRatio);
  };

  const setPaintTransition = (layerId, property, transition = PAINT_TRANSITION) => {
    if (!map.getLayer(layerId)) {
      return;
    }
    map.setPaintProperty(layerId, `${property}-transition`, transition);
  };

  const applyBuildingOpacity = (opacity, { animated = false } = {}) => {
    if (!map.getLayer(BUILDING_LAYER_ID)) {
      return;
    }
    if (currentBuildingOpacity !== opacity) {
      currentBuildingOpacity = opacity;
      setPaintTransition(
        BUILDING_LAYER_ID,
        "fill-extrusion-opacity",
        animated ? INSTANT_TRANSITION : PAINT_TRANSITION
      );
      map.setPaintProperty(BUILDING_LAYER_ID, "fill-extrusion-opacity", opacity);
    }
  };

  const animateBuildingOpacity = (targetOpacity) => {
    if (transitionRafId != null) {
      cancelAnimationFrame(transitionRafId);
      transitionRafId = null;
    }

    const startOpacity = animatedBuildingOpacity ?? currentBuildingOpacity ?? targetOpacity;
    if (Math.abs(startOpacity - targetOpacity) < 0.01) {
      applyBuildingOpacity(targetOpacity);
      animatedBuildingOpacity = targetOpacity;
      return;
    }

    animatedBuildingOpacity = startOpacity;
    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / PAINT_TRANSITION.duration);
      const eased = 1 - (1 - progress) ** 3;
      const nextOpacity = lerp(startOpacity, targetOpacity, eased);
      animatedBuildingOpacity = nextOpacity;
      applyBuildingOpacity(nextOpacity, { animated: true });

      if (progress < 1) {
        transitionRafId = requestAnimationFrame(step);
        return;
      }

      transitionRafId = null;
      animatedBuildingOpacity = targetOpacity;
      applyBuildingOpacity(targetOpacity);
    };

    transitionRafId = requestAnimationFrame(step);
  };

  const setBuildingStyle = ({ heightScale, opacity, smoothOpacity = true }) => {
    if (!map.getLayer(BUILDING_LAYER_ID)) {
      return;
    }

    if (currentBuildingHeightScale !== heightScale) {
      currentBuildingHeightScale = heightScale;
      setPaintTransition(BUILDING_LAYER_ID, "fill-extrusion-height");
      map.setPaintProperty(
        BUILDING_LAYER_ID,
        "fill-extrusion-height",
        createVisualBuildingHeightExpression(heightScale)
      );
    }

    if (smoothOpacity) {
      animateBuildingOpacity(opacity);
      return;
    }
    applyBuildingOpacity(opacity);
  };

  const setWeatherLabelVisibility = (lodVisible) => {
    const visible = lodVisible && isCityWeatherEnabled();
    if (weatherLabelsVisible === visible) {
      return;
    }
    weatherLabelsVisible = visible;
    setLayerVisibility({ map, layerId: WEATHER_LABEL_LAYER_ID, visible });
  };

  const setRoadLabelVisibility = (lodVisible) => {
    const visible = lodVisible && isRoadLabelsEnabled();
    if (roadLabelsVisible === visible) {
      return;
    }
    roadLabelsVisible = visible;
    for (const layerId of ROAD_NAME_LABEL_LAYER_IDS) {
      roadLabelVisibility.set(layerId, visible);
      setLayerVisibility({ map, layerId, visible });
    }
  };

  const refreshRoadLabels = () => {
    const zoom = map.getZoom();
    const zoomTier = resolveZoomTier(zoom, lodConfig);
    const closeRange = isCloseRange();
    const isMoving = currentProfile === "moving";
    const tierProfile = resolveZoomTierProfile({
      tier: zoomTier,
      lodConfig,
      isMoving,
      closeRange
    });
    setRoadLabelVisibility(!tierProfile.hideRoadLabels);
  };

  const refreshWeatherLabels = () => {
    const zoom = map.getZoom();
    const zoomTier = resolveZoomTier(zoom, lodConfig);
    const closeRange = isCloseRange();
    const isMoving = currentProfile === "moving";
    const tierProfile = resolveZoomTierProfile({
      tier: zoomTier,
      lodConfig,
      isMoving,
      closeRange
    });
    setWeatherLabelVisibility(!tierProfile.hideWeatherLabels);
  };

  const resolveStatusMessage = ({ profileName, zoomTier, closeRange }) => {
    const tierLabel =
      zoomTier === "far" ? "långt" : zoomTier === "medium" ? "mellan" : "nära";

    if (profileName === "moving") {
      return closeRange
        ? `Närzoom i rörelse (${tierLabel}): mjuk rendering utan vägetiketter.`
        : `Rörelse (${tierLabel}): flytande rendering med prioriterad tile-laddning.`;
    }

    return closeRange
      ? `Närzoom (${tierLabel}): hög detalj med färgsatta byggnader.`
      : `Stilla (${tierLabel}): full detalj och färgsatt terräng.`;
  };

  const applyProfile = (profileName) => {
    const zoom = map.getZoom();
    const zoomTier = resolveZoomTier(zoom, lodConfig);
    const closeRange = isCloseRange();
    if (
      currentProfile === profileName &&
      currentZoomTier === zoomTier &&
      currentCloseRange === closeRange
    ) {
      return;
    }

    currentProfile = profileName;
    currentZoomTier = zoomTier;
    currentCloseRange = closeRange;

    const isMoving = profileName === "moving";
    const tierProfile = resolveZoomTierProfile({
      tier: zoomTier,
      lodConfig,
      isMoving,
      closeRange
    });

    setBuildingStyle({
      heightScale: tierProfile.buildingHeightScale,
      opacity: tierProfile.buildingOpacity,
      smoothOpacity: !isMoving
    });
    setWeatherLabelVisibility(!tierProfile.hideWeatherLabels);
    setRoadLabelVisibility(!tierProfile.hideRoadLabels);
    setMapPixelRatio(tierProfile.pixelRatio);

    onStatusChange?.({
      profile: profileName,
      zoomTier,
      message: resolveStatusMessage({ profileName, zoomTier, closeRange })
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
  map.on("zoom", queueProfileRefresh);

  applyProfile("settled");
  onReady?.({ refreshRoadLabels, refreshWeatherLabels });

  return () => {
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (transitionRafId != null) {
      cancelAnimationFrame(transitionRafId);
      transitionRafId = null;
    }
    scheduleSettled.cancel();
    map.off("movestart", enterMovingMode);
    map.off("moveend", queueSettledMode);
    map.off("zoom", queueProfileRefresh);
    setWeatherLabelVisibility(true);
    setRoadLabelVisibility(true);
    for (const layerId of ROAD_NAME_LABEL_LAYER_IDS) {
      roadLabelVisibility.set(layerId, true);
    }
    setMapPixelRatio(defaultPixelRatio);
    if (map.getLayer(BUILDING_LAYER_ID)) {
      setBuildingStyle({
        heightScale: lodConfig.defaultBuildingHeightScale,
        opacity: lodConfig.settledBuildingOpacity,
        smoothOpacity: false
      });
    }
  };
};
