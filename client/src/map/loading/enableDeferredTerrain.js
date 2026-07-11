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
  let retryHandle = null;
  let sourcedataListener = null;
  let retryCount = 0;
  const MAX_RETRIES = 5;

  const clearRetryTimeout = () => {
    if (retryHandle != null) {
      clearTimeout(retryHandle);
      retryHandle = null;
    }
  };

  const clearSourcedataListener = () => {
    if (sourcedataListener) {
      map.off("sourcedata", sourcedataListener);
      sourcedataListener = null;
    }
  };

  const clearRetry = () => {
    clearRetryTimeout();
    clearSourcedataListener();
  };

  const ensureSourceListener = () => {
    if (sourcedataListener) {
      return;
    }

    sourcedataListener = (event) => {
      if (event.sourceId === TERRAIN_CONFIG.source) {
        clearRetry();
        enable();
      }
    };
    map.on("sourcedata", sourcedataListener);
  };

  const enable = () => {
    if (cancelled || map.getTerrain()) {
      return;
    }

    if (!map.getSource(TERRAIN_CONFIG.source)) {
      ensureSourceListener();

      if (retryCount < MAX_RETRIES) {
        retryCount += 1;
        clearRetryTimeout();
        retryHandle = setTimeout(() => {
          retryHandle = null;
          enable();
        }, 500);
      }
      return;
    }

    clearRetry();
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
    clearRetry();
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
