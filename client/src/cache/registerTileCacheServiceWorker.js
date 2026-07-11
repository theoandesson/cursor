import { getDailyCacheVersion } from "./tileCachePolicy.js";

const buildActiveStatusText = ({ version, entries }) => {
  if (typeof entries === "number") {
    if (entries < 80) {
      return `Tilecache bygger upp resurser (${entries}) - dagversion ${version}.`;
    }

    return `Tilecache varm (${entries} resurser) - dagversion ${version}.`;
  }

  return `Tilecache aktiv (${version}) - ny cacheversion varje dag.`;
};

let workerMessageListener = null;
let workerMessageHandler = null;

const ensureWorkerMessageListener = (handler) => {
  if (!("serviceWorker" in navigator)) {
    return () => undefined;
  }

  if (workerMessageListener && workerMessageHandler === handler) {
    return () => undefined;
  }

  if (workerMessageListener) {
    navigator.serviceWorker.removeEventListener("message", workerMessageListener);
  }

  workerMessageHandler = handler;
  workerMessageListener = handler;
  navigator.serviceWorker.addEventListener("message", workerMessageListener);

  return () => {
    if (workerMessageListener === handler) {
      navigator.serviceWorker.removeEventListener("message", workerMessageListener);
      workerMessageListener = null;
      workerMessageHandler = null;
    }
  };
};

export const registerTileCacheServiceWorker = async ({
  onStatusChange
} = {}) => {
  const setStatus = (message) => onStatusChange?.(message);

  if (!("serviceWorker" in navigator)) {
    setStatus("Tilecache stöds inte i denna webbläsare.");
    return { registration: null, dispose: () => undefined };
  }

  const fallbackVersion = getDailyCacheVersion();

  let refreshHealth = () => undefined;
  let healthInterval = null;
  let visibilityHandler = null;
  let removeWorkerMessageListener = () => undefined;
  let disposed = false;

  const dispose = () => {
    if (disposed) {
      return;
    }
    disposed = true;
    if (healthInterval) {
      clearInterval(healthInterval);
      healthInterval = null;
    }
    if (visibilityHandler) {
      document.removeEventListener("visibilitychange", visibilityHandler);
      visibilityHandler = null;
    }
    removeWorkerMessageListener();
  };

  const handleWorkerMessage = (event) => {
    if (!event.data?.type) {
      return;
    }

    if (event.data.type === "TILE_CACHE_VERSION") {
      setStatus(
        buildActiveStatusText({
          version: event.data.version
        })
      );
      return;
    }

    if (event.data.type === "TILE_CACHE_HEALTH") {
      setStatus(
        buildActiveStatusText({
          version: event.data.version,
          entries: event.data.entries
        })
      );
    }
  };

  removeWorkerMessageListener = ensureWorkerMessageListener(handleWorkerMessage);

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      type: "module"
    });

    setStatus(
      buildActiveStatusText({
        version: fallbackVersion,
        entries: 0
      })
    );

    const worker =
      registration.active ?? registration.waiting ?? registration.installing;
    worker?.postMessage({ type: "REQUEST_TILE_CACHE_VERSION" });
    worker?.postMessage({ type: "REQUEST_TILE_CACHE_HEALTH" });

    refreshHealth = () => {
      const activeWorker =
        registration.active ?? registration.waiting ?? registration.installing;
      activeWorker?.postMessage({ type: "REQUEST_TILE_CACHE_HEALTH" });
    };

    healthInterval = setInterval(refreshHealth, 12000);
    visibilityHandler = () => {
      if (document.visibilityState === "visible") {
        refreshHealth();
      }
    };
    document.addEventListener("visibilitychange", visibilityHandler);

    return { registration, dispose };
  } catch (error) {
    console.warn("Kunde inte registrera tilecache service worker.", error);
    setStatus("Tilecache kunde inte aktiveras.");
    dispose();
    return { registration: null, dispose: () => undefined };
  }
};

/**
 * Registers the tile-cache service worker and waits until it is active so the
 * first tile requests can be intercepted on repeat visits.
 */
export const waitForTileCacheServiceWorker = async (options) => {
  const result = await registerTileCacheServiceWorker(options);
  if (result.registration && "serviceWorker" in navigator) {
    await navigator.serviceWorker.ready;
  }
  return result;
};
