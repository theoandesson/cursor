import { getDailyCacheVersion } from "./tileCachePolicy.js";

const activeStatusText = (version) =>
  `Tilecache aktiv (${version}) - ny cacheversion varje dag.`;

export const registerTileCacheServiceWorker = async ({
  onStatusChange
} = {}) => {
  const setStatus = (message) => onStatusChange?.(message);

  if (!("serviceWorker" in navigator)) {
    setStatus("Tilecache stöds inte i denna webbläsare.");
    return null;
  }

  const fallbackVersion = getDailyCacheVersion();

  const handleWorkerMessage = (event) => {
    if (event.data?.type !== "TILE_CACHE_VERSION") {
      return;
    }
    setStatus(activeStatusText(event.data.version));
  };

  navigator.serviceWorker.addEventListener("message", handleWorkerMessage);

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      type: "module"
    });

    setStatus(activeStatusText(fallbackVersion));

    const worker =
      registration.active ?? registration.waiting ?? registration.installing;
    worker?.postMessage({ type: "REQUEST_TILE_CACHE_VERSION" });

    return registration;
  } catch (error) {
    console.warn("Kunde inte registrera tilecache service worker.", error);
    setStatus("Tilecache kunde inte aktiveras.");
    return null;
  }
};
