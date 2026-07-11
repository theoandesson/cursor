import { scheduleDeferredWork } from "./scheduleDeferredWork.js";

/**
 * Orchestrates multi-stage deferred feature mounting using scheduleDeferredWork.
 * Stages are sorted by priority (ascending) and run sequentially — each stage is
 * scheduled in its own requestIdleCallback slot so that any stage with heavy work
 * does not block subsequent stages from being queued.
 *
 * @param {object} options
 * @param {Array<{name: string, mount: Function, priority?: number}>} options.stages
 * @param {Function} [options.onStageComplete] - Called after each stage with (name, index).
 * @returns {Function} Cancel function — stops any pending stages.
 */
export const createStagedFeatureMount = ({ stages = [], onStageComplete } = {}) => {
  const sorted = [...stages].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

  let currentIndex = 0;
  let cancelled = false;
  let currentCancel = null;

  const scheduleNext = () => {
    if (cancelled || currentIndex >= sorted.length) {
      return;
    }

    const stage = sorted[currentIndex];

    currentCancel = scheduleDeferredWork(() => {
      if (cancelled) {
        return;
      }

      try {
        stage.mount();
      } catch (error) {
        console.warn(`[StagedMount] Stage "${stage.name}" failed to mount`, error);
      }

      const completedIndex = currentIndex;
      currentIndex += 1;
      onStageComplete?.(stage.name, completedIndex);

      scheduleNext();
    });
  };

  scheduleNext();

  return () => {
    cancelled = true;
    currentCancel?.();
    currentCancel = null;
  };
};
