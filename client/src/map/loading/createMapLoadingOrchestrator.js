import { INITIAL_LOAD_CONFIG } from "./initialLoadConfig.js";
import { createInitialLoadUxController } from "./createInitialLoadUxController.js";

/**
 * Combines all loading UX concerns into a single factory:
 * - Delegates progress tracking and overlay management to createInitialLoadUxController.
 * - Subscribes to map 'error' events and reflects errors in the loading overlay.
 * - Pauses the effective maxWait countdown when the document becomes hidden and
 *   resumes it (with remaining time) once the document is visible again. This
 *   prevents the timeout from firing while the user is on a different tab.
 *
 * @param {object} options
 * @param {object} options.map        - MapLibre map instance.
 * @param {object} options.loadingOverlay - Loading overlay presenter.
 * @param {object} [options.perfTracker]  - Optional perf tracker.
 * @returns {Function} Cleanup / dispose function.
 */
export const createMapLoadingOrchestrator = ({ map, loadingOverlay, perfTracker }) => {
  const { maxWaitMs, hideDelayMs } = INITIAL_LOAD_CONFIG;

  let disposed = false;
  let hiddenAt = null;
  let elapsedAtHide = 0;
  let resumeHandle = null;
  const startedAt = performance.now();

  const disposeController = createInitialLoadUxController({ map, loadingOverlay, perfTracker });

  // -- Map error handling --------------------------------------------------

  const onMapError = (event) => {
    if (disposed) {
      return;
    }
    const message = event?.error?.message ?? "Ett fel uppstod vid kartladdning.";
    loadingOverlay?.setMessage(`Fel vid kartladdning: ${message}`);
    perfTracker?.recordMilestone("map-load-error", { message });
  };

  map.on("error", onMapError);

  // -- Visibility-aware maxWait timeout ------------------------------------
  //
  // The underlying controller has its own maxWaitMs timer. In addition, this
  // orchestrator manages a secondary "resume" timer so that time spent with
  // the tab hidden does not count toward the user-perceived loading budget.
  //
  // When the tab goes hidden:
  //   • Record elapsed visible time and cancel any pending resume timer.
  // When the tab becomes visible:
  //   • Compute remaining visible budget and schedule a fallback hide if the
  //     controller has not already finished by then.

  const scheduleResumeTimeout = (remainingMs) => {
    if (resumeHandle) {
      clearTimeout(resumeHandle);
    }
    resumeHandle = setTimeout(() => {
      resumeHandle = null;
      if (disposed) {
        return;
      }
      loadingOverlay?.setMessage("Kartan är redo — detaljer laddas fortsatt i bakgrunden.");
      setTimeout(() => {
        if (!disposed) {
          loadingOverlay?.hide();
        }
      }, hideDelayMs);
      perfTracker?.recordMilestone("orchestrator-timeout");
    }, remainingMs);
  };

  const onVisibilityChange = () => {
    if (disposed) {
      return;
    }

    if (document.hidden) {
      if (hiddenAt == null) {
        hiddenAt = performance.now();
        elapsedAtHide = hiddenAt - startedAt;
        if (resumeHandle) {
          clearTimeout(resumeHandle);
          resumeHandle = null;
        }
      }
    } else if (hiddenAt != null) {
      hiddenAt = null;
      const remaining = Math.max(0, maxWaitMs - elapsedAtHide);
      if (remaining > 0) {
        scheduleResumeTimeout(remaining);
      }
    }
  };

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibilityChange);
  }

  return () => {
    disposed = true;
    if (resumeHandle) {
      clearTimeout(resumeHandle);
      resumeHandle = null;
    }
    disposeController?.();
    map.off("error", onMapError);
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    }
  };
};
