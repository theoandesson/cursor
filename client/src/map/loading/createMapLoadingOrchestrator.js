import { createInitialLoadUxController } from "./createInitialLoadUxController.js";

/**
 * Combines all loading UX concerns into a single factory:
 * - Delegates progress tracking and overlay management to createInitialLoadUxController.
 * - Subscribes to map 'error' events and reflects errors in the loading overlay.
 * - Pauses the UX controller maxWait countdown when the document becomes hidden and
 *   resumes it once the document is visible again.
 *
 * @param {object} options
 * @param {object} options.map        - MapLibre map instance.
 * @param {object} options.loadingOverlay - Loading overlay presenter.
 * @param {object} [options.perfTracker]  - Optional perf tracker.
 * @returns {Function} Cleanup / dispose function.
 */
export const createMapLoadingOrchestrator = ({ map, loadingOverlay, perfTracker }) => {
  let disposed = false;

  const loadUx = createInitialLoadUxController({ map, loadingOverlay, perfTracker });

  const onMapError = (event) => {
    if (disposed) {
      return;
    }
    const message = event?.error?.message ?? "Ett fel uppstod vid kartladdning.";
    loadUx.finalizeWithError(message);
  };

  map.on("error", onMapError);

  const onVisibilityChange = () => {
    if (disposed) {
      return;
    }

    if (document.hidden) {
      loadUx.pauseMaxWait();
    } else {
      loadUx.resumeMaxWait();
    }
  };

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibilityChange);
  }

  return () => {
    disposed = true;
    loadUx.dispose();
    map.off("error", onMapError);
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    }
  };
};
