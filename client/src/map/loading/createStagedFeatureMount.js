import { scheduleDeferredWork } from "./scheduleDeferredWork.js";

/**
 * Orchestrates multi-stage deferred feature mounting using scheduleDeferredWork.
 * Stages are sorted by priority (ascending) and run sequentially — each stage is
 * scheduled in its own requestIdleCallback slot so that any stage with heavy work
 * does not block subsequent stages from being queued.
 *
 * Async stage.mount() functions are awaited before the next stage is scheduled.
 *
 * @param {object} options
 * @param {Array<{name: string, mount: Function, priority?: number}>} options.stages
 * @param {Function} [options.onStageComplete] - Called after each stage with (name, index).
 * @param {Function} [options.onComplete] - Called when all stages have finished.
 * @returns {Function} Cancel function — stops any pending stages.
 */
export const createStagedFeatureMount = ({ stages = [], onStageComplete, onComplete } = {}) => {
  const sorted = [...stages].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

  let currentIndex = 0;
  let cancelled = false;
  let currentCancel = null;
  let stageChain = Promise.resolve();

  const scheduleNext = () => {
    if (cancelled || currentIndex >= sorted.length) {
      if (!cancelled && currentIndex >= sorted.length) {
        onComplete?.();
      }
      return;
    }

    const stage = sorted[currentIndex];

    currentCancel = scheduleDeferredWork(() => {
      if (cancelled) {
        return;
      }

      stageChain = stageChain
        .catch(() => {})
        .then(async () => {
          if (cancelled) {
            return;
          }

          try {
            await stage.mount();
          } catch (error) {
            console.warn(`[StagedMount] Stage "${stage.name}" failed to mount`, error);
          }

          if (cancelled) {
            return;
          }

          const completedIndex = currentIndex;
          currentIndex += 1;
          onStageComplete?.(stage.name, completedIndex);
          scheduleNext();
        });
    });
  };

  scheduleNext();

  return () => {
    cancelled = true;
    currentCancel?.();
    currentCancel = null;
  };
};
