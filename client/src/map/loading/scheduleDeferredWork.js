import { INITIAL_LOAD_CONFIG } from "./initialLoadConfig.js";

export const scheduleDeferredWork = (callback, {
  timeoutMs = INITIAL_LOAD_CONFIG.deferredWorkTimeoutMs,
  delayMs = 0
} = {}) => {
  let cancelled = false;
  let delayHandle = null;
  let idleHandle = null;

  const run = () => {
    if (cancelled) {
      return;
    }

    if (typeof requestIdleCallback === "function") {
      idleHandle = requestIdleCallback(() => {
        if (!cancelled) {
          callback();
        }
      }, { timeout: timeoutMs });
      return;
    }

    idleHandle = setTimeout(() => {
      if (!cancelled) {
        callback();
      }
    }, Math.min(timeoutMs, 80));
  };

  if (delayMs > 0) {
    delayHandle = setTimeout(run, delayMs);
  } else {
    run();
  }

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
