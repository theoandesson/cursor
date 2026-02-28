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

export const registerTileCacheServiceWorker = async ({
  onStatusChange
} = {}) => {
  const setStatus = (message) => onStatusChange?.(message);

  if (!("serviceWorker" in navigator)) {
    setStatus("Tilecache stöds inte i denna webbläsare.");
    return null;
  }

  const fallbackVersion = getDailyCacheVersion();

  let refreshHealth = () => undefined;

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

  navigator.serviceWorker.addEventListener("message", handleWorkerMessage);

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

    const healthInterval = setInterval(refreshHealth, 12000);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        refreshHealth();
      }
    });

    window.addEventListener(
      "beforeunload",
      () => {
        clearInterval(healthInterval);
      },
      { once: true }
    );

    return registration;
  } catch (error) {
    console.warn("Kunde inte registrera tilecache service worker.", error);
    setStatus("Tilecache kunde inte aktiveras.");
    return null;
  }
};
