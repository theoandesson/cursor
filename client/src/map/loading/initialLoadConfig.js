export const INITIAL_LOAD_CONFIG = Object.freeze({
  /** Primary vector source that gates interactive readiness. */
  primarySourceId: "sweden_vector",
  /** Hard cap so the overlay never blocks interaction indefinitely. */
  maxWaitMs: 6500,
  /** Minimum time the overlay stays visible for perceived continuity. */
  minVisibleMs: 420,
  /** Delay before hiding overlay after readiness is reached. */
  hideDelayMs: 140,
  /** Idle timeout for scheduling deferred work (terrain, prefetch, features). */
  deferredWorkTimeoutMs: 1400,
  /** Delay before enabling 3D terrain after the map is interactive. */
  terrainEnableDelayMs: 320
});
