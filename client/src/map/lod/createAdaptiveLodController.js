import { createDebouncedAction } from "./createDebouncedAction.js";

const LOD_PROFILES = Object.freeze({
  moving: {
    terrainVisibility: "low",
    label: "Rör sig: låg polygonupplösning för bättre flyt."
  },
  settled: {
    terrainVisibility: "high",
    label: "Stilla: hög polygonupplösning för maximal detalj."
  }
});

const safelySetLayerVisibility = (map, layerId, visibility) => {
  if (!map.getLayer(layerId)) {
    return;
  }
  map.setLayoutProperty(layerId, "visibility", visibility);
};

const safelySetTerrain = (map, source, exaggeration) => {
  map.setTerrain({
    source,
    exaggeration
  });
};

export const createAdaptiveLodController = ({ map, lodConfig, onStatusChange }) => {
  let currentProfile = "settled";

  const applyProfile = (profileName) => {
    if (currentProfile === profileName) {
      return;
    }

    currentProfile = profileName;
    if (profileName === "moving") {
      safelySetTerrain(
        map,
        lodConfig.movingTerrainSource,
        lodConfig.movingTerrainExaggeration
      );
      safelySetLayerVisibility(map, "sweden-buildings-low", "visible");
      safelySetLayerVisibility(map, "sweden-buildings-high", "none");
    } else {
      safelySetTerrain(
        map,
        lodConfig.settledTerrainSource,
        lodConfig.settledTerrainExaggeration
      );
      safelySetLayerVisibility(map, "sweden-buildings-low", "none");
      safelySetLayerVisibility(map, "sweden-buildings-high", "visible");
    }

    onStatusChange?.({
      profile: profileName,
      message: LOD_PROFILES[profileName].label
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

  const movingEvents = [
    "movestart",
    "zoomstart",
    "pitchstart",
    "rotatestart",
    "dragstart"
  ];
  const settledEvents = ["moveend", "zoomend", "pitchend", "rotateend", "dragend"];

  movingEvents.forEach((eventName) => map.on(eventName, enterMovingMode));
  settledEvents.forEach((eventName) => map.on(eventName, queueSettledMode));
  map.on("idle", queueSettledMode);

  onStatusChange?.({
    profile: "settled",
    message: LOD_PROFILES.settled.label
  });

  return () => {
    scheduleSettled.cancel();
    movingEvents.forEach((eventName) => map.off(eventName, enterMovingMode));
    settledEvents.forEach((eventName) => map.off(eventName, queueSettledMode));
    map.off("idle", queueSettledMode);
  };
};
