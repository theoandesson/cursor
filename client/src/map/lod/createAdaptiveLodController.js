import { createDebouncedAction } from "./createDebouncedAction.js";

const BUILDING_LAYER_ID = "sweden-buildings";

export const createAdaptiveLodController = ({ map, lodConfig, onStatusChange }) => {
  let currentProfile = "settled";

  const applyProfile = (profileName) => {
    if (currentProfile === profileName) return;
    currentProfile = profileName;

    if (map.getLayer(BUILDING_LAYER_ID)) {
      map.setLayoutProperty(
        BUILDING_LAYER_ID,
        "visibility",
        profileName === "moving" ? "none" : "visible"
      );
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
    scheduleSettled.cancel();
    applyProfile("moving");
  };

  const queueSettledMode = () => {
    scheduleSettled();
  };

  map.on("movestart", enterMovingMode);
  map.on("moveend", queueSettledMode);
  map.on("idle", queueSettledMode);

  onStatusChange?.({
    profile: "settled",
    message: "Stilla: full detalj med terräng."
  });

  return () => {
    scheduleSettled.cancel();
    map.off("movestart", enterMovingMode);
    map.off("moveend", queueSettledMode);
    map.off("idle", queueSettledMode);
  };
};
