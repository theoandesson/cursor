import { TERRAIN_CONFIG } from "../../config/swedenMapConfig.js";
import { INITIAL_LOAD_CONFIG } from "./initialLoadConfig.js";

const scheduleIdleWork = (callback, timeoutMs) => {
  if (typeof requestIdleCallback === "function") {
    return requestIdleCallback(callback, { timeout: timeoutMs });
  }

  return setTimeout(callback, Math.min(timeoutMs, 120));
};

export const enableDeferredTerrain = (map, {
  exaggeration = TERRAIN_CONFIG.exaggeration,
  delayMs = INITIAL_LOAD_CONFIG.terrainEnableDelayMs
} = {}) => {
  if (map.getTerrain()) {
    return () => {};
  }

  let cancelled = false;
  let idleHandle = null;
  let delayHandle = null;

  const enable = () => {
    if (cancelled || map.getTerrain() || !map.getSource(TERRAIN_CONFIG.source)) {
      return;
    }

    map.setTerrain({
      source: TERRAIN_CONFIG.source,
      exaggeration
    });
  };

  const run = () => {
    if (cancelled) {
      return;
    }

    idleHandle = scheduleIdleWork(enable, INITIAL_LOAD_CONFIG.deferredWorkTimeoutMs);
  };

  delayHandle = setTimeout(run, delayMs);

  return () => {
    cancelled = true;
    if (delayHandle) {
      clearTimeout(delayHandle);
      delayHandle = null;
    }
    if (idleHandle != null) {
      if (typeof cancelIdleCallback === "function") {
        cancelIdleCallback(idleHandle);
      } else {
        clearTimeout(idleHandle);
      }
      idleHandle = null;
    }
  };
};
