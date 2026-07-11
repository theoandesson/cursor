export const LOADING_STEPS = Object.freeze([
  { threshold: 0.25, message: "Ansluter till kartserver…", milestone: "load-stage-25" },
  { threshold: 0.5, message: "Laddar markresurser…", milestone: "load-stage-50" },
  { threshold: 0.75, message: "Ritar kartan…", milestone: "load-stage-75" },
  { threshold: 1, message: "Snart redo…", milestone: "load-stage-100" }
]);

/**
 * Returns the display message for the given vector progress value.
 * Falls back to "Laddar data…" when progress exceeds all defined thresholds.
 */
export const getStepMessage = (progress) =>
  LOADING_STEPS.find((step) => progress <= step.threshold)?.message ?? "Laddar data…";

/**
 * Maps the current map state to a coarse 0–1 progress value based on
 * source presence, source load state, and tile load state.
 * Returns one of four sentinel values: 0.08, 0.34, 0.72, or 1.
 */
export const calculateVectorProgress = (map, primarySourceId) => {
  if (!map.getSource(primarySourceId)) {
    return 0.08;
  }

  if (!map.isSourceLoaded(primarySourceId)) {
    return 0.34;
  }

  if (!map.areTilesLoaded()) {
    return 0.72;
  }

  return 1;
};

/**
 * Returns true when the map is ready for user interaction.
 * Requires map.loaded(), the primary source to be loaded, and at least one render frame.
 */
export const isInteractiveReady = (map, primarySourceId, hasRendered) =>
  map.loaded() && map.isSourceLoaded(primarySourceId) && hasRendered;
