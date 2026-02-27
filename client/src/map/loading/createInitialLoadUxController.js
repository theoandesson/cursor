const TRACKED_SOURCE_IDS = ["sweden_vector", "sweden-dem-low", "sweden-dem-high"];

const LOADING_STEPS = Object.freeze([
  { threshold: 0.25, message: "Laddar markresurser…" },
  { threshold: 0.55, message: "Laddar infrastruktur…" },
  { threshold: 0.85, message: "Laddar byggnader…" },
  { threshold: 1, message: "Optimerar visualisering…" }
]);

const getStepMessage = (sourceProgress) =>
  LOADING_STEPS.find((step) => sourceProgress <= step.threshold)?.message ??
  "Laddar data…";

const calculateSourceProgress = (map) => {
  const available = TRACKED_SOURCE_IDS.filter((sourceId) => Boolean(map.getSource(sourceId)));
  if (!available.length) {
    return 0;
  }

  const loadedCount = available.reduce(
    (total, sourceId) => total + (map.isSourceLoaded(sourceId) ? 1 : 0),
    0
  );
  return loadedCount / available.length;
};

export const createInitialLoadUxController = ({ map, loadingOverlay }) => {
  let rafId = null;
  let firstLoadDone = false;
  let progress = 0.06;
  let readyHideTimeoutId = null;

  const updateOverlay = () => {
    if (firstLoadDone) {
      return;
    }

    const sourceProgress = calculateSourceProgress(map);
    const tileProgress = map.areTilesLoaded() ? 1 : 0.4;
    const rawProgress = sourceProgress * 0.78 + tileProgress * 0.22;
    progress = Math.max(progress, Math.min(rawProgress, 0.97));

    loadingOverlay.setProgress(progress);
    loadingOverlay.setMessage(getStepMessage(sourceProgress));
  };

  const scheduleUpdate = () => {
    if (rafId) {
      return;
    }
    rafId = requestAnimationFrame(() => {
      rafId = null;
      updateOverlay();
    });
  };

  const finalizeFirstLoad = () => {
    if (firstLoadDone) {
      return;
    }
    firstLoadDone = true;
    loadingOverlay.setProgress(1);
    loadingOverlay.setMessage("Klart - kartan är redo.");
    readyHideTimeoutId = setTimeout(() => {
      loadingOverlay.hide();
    }, 280);
  };

  const updateEvents = ["load", "dataloading", "data", "sourcedataloading", "sourcedata"];
  updateEvents.forEach((eventName) => map.on(eventName, scheduleUpdate));
  map.on("idle", finalizeFirstLoad);

  scheduleUpdate();

  return () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    if (readyHideTimeoutId) {
      clearTimeout(readyHideTimeoutId);
    }
    updateEvents.forEach((eventName) => map.off(eventName, scheduleUpdate));
    map.off("idle", finalizeFirstLoad);
  };
};
