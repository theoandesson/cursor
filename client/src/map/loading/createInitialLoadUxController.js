import { INITIAL_LOAD_CONFIG } from "./initialLoadConfig.js";
import {
  LOADING_STEPS,
  calculateVectorProgress,
  getStepMessage,
  isInteractiveReady
} from "./vectorLoadProgress.js";

export const createInitialLoadUxController = ({ map, loadingOverlay, perfTracker }) => {
  const { primarySourceId, maxWaitMs, minVisibleMs, hideDelayMs } = INITIAL_LOAD_CONFIG;

  let rafId = null;
  let done = false;
  let errored = false;
  let progress = 0.06;
  let hasRendered = false;
  let hideTimeoutId = null;
  let maxWaitTimeoutId = null;
  let finalizeDelayId = null;
  let maxWaitRemainingMs = maxWaitMs;
  let maxWaitPausedAt = null;
  let maxWaitVisibleStartedAt = performance.now();
  let maxWaitAccumulatedVisibleMs = 0;
  const startedAt = performance.now();
  const recordedStages = new Set();

  const recordStageIfNeeded = (sourceProgress) => {
    LOADING_STEPS.forEach((step) => {
      if (sourceProgress < step.threshold || recordedStages.has(step.milestone)) {
        return;
      }
      recordedStages.add(step.milestone);
      perfTracker?.recordMilestone(step.milestone, {
        sourceProgress,
        progress
      });
    });
  };

  const clearMaxWaitTimeout = () => {
    if (maxWaitTimeoutId) {
      clearTimeout(maxWaitTimeoutId);
      maxWaitTimeoutId = null;
    }
  };

  const scheduleMaxWaitTimeout = (delayMs) => {
    clearMaxWaitTimeout();
    if (done || errored || delayMs <= 0) {
      return;
    }
    maxWaitTimeoutId = setTimeout(() => {
      maxWaitTimeoutId = null;
      finalize("timeout");
    }, delayMs);
  };

  const finalize = (reason = "ready") => {
    if (done) {
      return;
    }

    const elapsed = performance.now() - startedAt;
    if (elapsed < minVisibleMs) {
      finalizeDelayId = setTimeout(() => {
        finalizeDelayId = null;
        finalize(reason);
      }, minVisibleMs - elapsed);
      return;
    }

    done = true;
    clearMaxWaitTimeout();
    loadingOverlay?.setProgress(1);
    loadingOverlay?.setMessage(
      reason === "timeout"
        ? "Kartan är redo — detaljer laddas fortsatt i bakgrunden."
        : "Kartan är redo."
    );

    hideTimeoutId = setTimeout(() => {
      loadingOverlay?.hide();
      perfTracker?.recordMilestone("map-overlay-hidden", {
        progress: 1,
        reason,
        elapsedMs: Math.round(performance.now() - startedAt)
      });
    }, hideDelayMs);
  };

  const maybeFinalize = (reason = "ready") => {
    if (done || errored) {
      return;
    }

    if (!isInteractiveReady(map, primarySourceId, hasRendered)) {
      return;
    }

    finalize(reason);
  };

  const update = () => {
    if (done || errored) {
      return;
    }

    const vectorProgress = calculateVectorProgress(map, primarySourceId);
    const renderBoost = hasRendered ? 0.18 : 0;
    const timeBoost = Math.min((performance.now() - startedAt) / maxWaitMs, 1) * 0.12;
    const raw = vectorProgress * 0.7 + renderBoost + timeBoost;
    progress = Math.max(progress, Math.min(raw, 0.96));

    loadingOverlay?.setProgress(progress);
    loadingOverlay?.setMessage(getStepMessage(vectorProgress));
    recordStageIfNeeded(vectorProgress);
    maybeFinalize("ready");
  };

  const scheduleUpdate = () => {
    if (rafId || done || errored) {
      return;
    }

    rafId = requestAnimationFrame(() => {
      rafId = null;
      update();
    });
  };

  const onRender = () => {
    if (!hasRendered) {
      hasRendered = true;
      scheduleUpdate();
      maybeFinalize("ready");
    }
  };

  const events = ["load", "data", "sourcedata", "render"];
  events.forEach((eventName) => map.on(eventName, scheduleUpdate));
  map.on("render", onRender);

  scheduleMaxWaitTimeout(maxWaitRemainingMs);
  scheduleUpdate();

  const pauseMaxWait = () => {
    if (done || errored || maxWaitPausedAt != null) {
      return;
    }

    clearMaxWaitTimeout();
    maxWaitAccumulatedVisibleMs += performance.now() - maxWaitVisibleStartedAt;
    maxWaitPausedAt = performance.now();
    maxWaitRemainingMs = Math.max(0, maxWaitMs - maxWaitAccumulatedVisibleMs);
  };

  const resumeMaxWait = () => {
    if (done || errored || maxWaitPausedAt == null) {
      return;
    }

    maxWaitPausedAt = null;
    maxWaitVisibleStartedAt = performance.now();
    scheduleMaxWaitTimeout(maxWaitRemainingMs);
  };

  const finalizeWithError = (message) => {
    if (done || errored) {
      return;
    }

    errored = true;
    done = true;

    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (finalizeDelayId) {
      clearTimeout(finalizeDelayId);
      finalizeDelayId = null;
    }
    clearMaxWaitTimeout();

    loadingOverlay?.setProgress(1);
    loadingOverlay?.setMessage(`Fel vid kartladdning: ${message}`);

    hideTimeoutId = setTimeout(() => {
      loadingOverlay?.hide();
      perfTracker?.recordMilestone("map-load-error", {
        message,
        elapsedMs: Math.round(performance.now() - startedAt)
      });
    }, hideDelayMs);
  };

  const dispose = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (hideTimeoutId) {
      clearTimeout(hideTimeoutId);
      hideTimeoutId = null;
    }
    if (finalizeDelayId) {
      clearTimeout(finalizeDelayId);
      finalizeDelayId = null;
    }
    clearMaxWaitTimeout();
    events.forEach((eventName) => map.off(eventName, scheduleUpdate));
    map.off("render", onRender);
  };

  return {
    dispose,
    isDone: () => done,
    finalizeWithError,
    pauseMaxWait,
    resumeMaxWait
  };
};
