import { createDebouncedAction } from "./createDebouncedAction.js";

const BUILDING_LAYER_ID = "sweden-buildings";

export const createAdaptiveLodController = ({ map, lodConfig, onStatusChange }) => {
  let currentProfile = "settled";
  let interactionCount = 0;

  const applyProfile = (profileName) => {
    if (currentProfile === profileName) return;
    currentProfile = profileName;

    if (profileName === "moving") {
      map.setTerrain(null);

      if (map.getLayer(BUILDING_LAYER_ID)) {
        map.setLayoutProperty(BUILDING_LAYER_ID, "visibility", "none");
      }
    } else {
      map.setTerrain({
        source: lodConfig.settledTerrainSource,
        exaggeration: lodConfig.settledTerrainExaggeration
      });

      if (map.getLayer(BUILDING_LAYER_ID)) {
        map.setLayoutProperty(BUILDING_LAYER_ID, "visibility", "visible");
      }
    }

    onStatusChange?.({
      profile: profileName,
      message:
        profileName === "moving"
          ? "Rörelse: snabb rendering."
          : "Stilla: full detalj med terräng."
    });
  };

  const scheduleSettled = createDebouncedAction(
    () => applyProfile("settled"),
    lodConfig.idleDelayMs
  );

  const enterMovingMode = () => {
    interactionCount++;
    scheduleSettled.cancel();
    applyProfile("moving");
  };

  const queueSettledMode = () => {
    interactionCount--;
    if (interactionCount <= 0) {
      interactionCount = 0;
      scheduleSettled();
    }
  };

  map.on("movestart", enterMovingMode);
  map.on("moveend", queueSettledMode);

  onStatusChange?.({
    profile: "settled",
    message: "Stilla: full detalj med terräng."
  });

  return () => {
    scheduleSettled.cancel();
    map.off("movestart", enterMovingMode);
    map.off("moveend", queueSettledMode);
  };
};
