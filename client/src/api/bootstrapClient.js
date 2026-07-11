import {
  getLatestBootstrapSnapshot,
  saveBootstrapSnapshot
} from "../store/weatherStore.js";

const BOOTSTRAP_URL = "/api/bootstrap";

const emitTiming = (onTiming, phase, startedAt, cacheStatus = null) => {
  if (!onTiming) {
    return;
  }

  onTiming({
    phase,
    durationMs: Math.max(0, performance.now() - startedAt),
    cacheStatus
  });
};

export const fetchBootstrap = async ({ signal, onTiming } = {}) => {
  const startedAt = performance.now();

  try {
    const response = await fetch(BOOTSTRAP_URL, { signal });
    emitTiming(onTiming, "network", startedAt, response.headers.get("x-cache-status"));

    if (!response.ok) {
      throw new Error(`API ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    emitTiming(onTiming, "parse", startedAt);
    return data;
  } catch (error) {
    emitTiming(onTiming, "network-error", startedAt);
    throw error;
  }
};

export const fetchBootstrapWithSwr = async ({
  onCached,
  onFresh,
  onTiming,
  signal
} = {}) => {
  let fromCache = false;
  let fromNetwork = false;

  const cacheReadStartedAt = performance.now();
  const snapshot = await getLatestBootstrapSnapshot();
  emitTiming(onTiming, "idb-read", cacheReadStartedAt, snapshot ? "hit" : "miss");

  if (snapshot?.data) {
    fromCache = true;
    onCached?.(snapshot.data, snapshot);
  }

  try {
    const networkStartedAt = performance.now();
    const freshData = await fetchBootstrap({ signal, onTiming });
    fromNetwork = true;
    emitTiming(onTiming, "apply-fresh", networkStartedAt);

    onFresh?.(freshData);

    const saveStartedAt = performance.now();
    await saveBootstrapSnapshot(freshData);
    emitTiming(onTiming, "idb-write", saveStartedAt);

    return { fromCache, fromNetwork, data: freshData };
  } catch (error) {
    if (fromCache) {
      return { fromCache, fromNetwork: false, data: snapshot.data, error };
    }
    throw error;
  }
};
