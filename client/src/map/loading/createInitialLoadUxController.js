import { INITIAL_LOAD_CONFIG } from "./initialLoadConfig.js";

const LOADING_STEPS = Object.freeze([
  { threshold: 0.25, message: "Ansluter till kartserver…", milestone: "load-stage-25" },
  { threshold: 0.5, message: "Laddar markresurser…", milestone: "load-stage-50" },
  { threshold: 0.75, message: "Ritar kartan…", milestone: "load-stage-75" },
  { threshold: 1, message: "Snart redo…", milestone: "load-stage-100" }
]);

const getStepMessage = (progress) =>
  LOADING_STEPS.find((step) => progress <= step.threshold)?.message ?? "Laddar data…";

const calculateVectorProgress = (map, primarySourceId) => {
  if (!map.getSource(primarySourceId)) {
    return 0.08;
  }

  if (!map.isSourceLoaded(primarySourceId)) {
    return 0.34;
  }

  if (!map.areTilesLoaded()) {
    return 0.72;
  }

  return 1;
};

const isInteractiveReady = (map, primarySourceId, hasRendered) =>
  map.loaded() && map.isSourceLoaded(primarySourceId) && hasRendered;

export const createInitialLoadUxController = ({ map, loadingOverlay, perfTracker }) => {
  const { primarySourceId, maxWaitMs, minVisibleMs, hideDelayMs } = INITIAL_LOAD_CONFIG;

  let rafId = null;
  let done = false;
  let progress = 0.06;
  let hasRendered = false;
  let hideTimeoutId = null;
  let maxWaitTimeoutId = null;
  let readySince = null;
  const startedAt = performance.now();
  const recordedStages = new Set();

  const recordStageIfNeeded = (sourceProgress) => {
    LOADING_STEPS.forEach((step) => {
      if (sourceProgress > step.threshold || recordedStages.has(step.milestone)) {
        return;
      }
      recordedStages.add(step.milestone);
      perfTracker?.recordMilestone(step.milestone, {
        sourceProgress,
        progress
      });
    });
  };

  const finalize = (reason = "ready") => {
    if (done) {
      return;
    }

    const elapsed = performance.now() - startedAt;
    if (elapsed < minVisibleMs) {
      setTimeout(() => finalize(reason), minVisibleMs - elapsed);
      return;
    }

    done = true;
    loadingOverlay.setProgress(1);
    loadingOverlay.setMessage(
      reason === "timeout"
        ? "Kartan är redo — detaljer laddas fortsatt i bakgrunden."
        : "Kartan är redo."
    );

    hideTimeoutId = setTimeout(() => {
      loadingOverlay.hide();
      perfTracker?.recordMilestone("map-overlay-hidden", {
        progress: 1,
        reason,
        elapsedMs: Math.round(performance.now() - startedAt)
      });
    }, hideDelayMs);
  };

  const maybeFinalize = (reason = "ready") => {
    if (done) {
      return;
    }

    if (!isInteractiveReady(map, primarySourceId, hasRendered)) {
      return;
    }

    if (readySince == null) {
      readySince = performance.now();
    }

    finalize(reason);
  };

  const update = () => {
    if (done) {
      return;
    }

    const vectorProgress = calculateVectorProgress(map, primarySourceId);
    const renderBoost = hasRendered ? 0.18 : 0;
    const timeBoost = Math.min((performance.now() - startedAt) / maxWaitMs, 1) * 0.12;
    const raw = vectorProgress * 0.7 + renderBoost + timeBoost;
    progress = Math.max(progress, Math.min(raw, 0.96));

    loadingOverlay.setProgress(progress);
    loadingOverlay.setMessage(getStepMessage(vectorProgress));
    recordStageIfNeeded(vectorProgress);
    maybeFinalize("ready");
  };

  const scheduleUpdate = () => {
    if (rafId || done) {
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

  maxWaitTimeoutId = setTimeout(() => {
    finalize("timeout");
  }, maxWaitMs);

  scheduleUpdate();

  return () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    if (hideTimeoutId) {
      clearTimeout(hideTimeoutId);
    }
    if (maxWaitTimeoutId) {
      clearTimeout(maxWaitTimeoutId);
    }
    events.forEach((eventName) => map.off(eventName, scheduleUpdate));
    map.off("render", onRender);
  };
};
