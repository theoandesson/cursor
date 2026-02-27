const TRACKED_SOURCE_IDS = ["sweden_vector", "sweden-dem"];

const LOADING_STEPS = Object.freeze([
  { threshold: 0.3, message: "Laddar markresurser…" },
  { threshold: 0.6, message: "Laddar infrastruktur…" },
  { threshold: 0.9, message: "Laddar byggnader…" },
  { threshold: 1, message: "Optimerar visualisering…" }
]);

const getStepMessage = (progress) =>
  LOADING_STEPS.find((step) => progress <= step.threshold)?.message ??
  "Laddar data…";

const calculateSourceProgress = (map) => {
  const available = TRACKED_SOURCE_IDS.filter((id) => Boolean(map.getSource(id)));
  if (!available.length) return 0;
  const loaded = available.reduce(
    (total, id) => total + (map.isSourceLoaded(id) ? 1 : 0),
    0
  );
  return loaded / available.length;
};

export const createInitialLoadUxController = ({ map, loadingOverlay }) => {
  let rafId = null;
  let done = false;
  let progress = 0.06;
  let hideTimeoutId = null;

  const update = () => {
    if (done) return;
    const src = calculateSourceProgress(map);
    const tile = map.areTilesLoaded() ? 1 : 0.4;
    const raw = src * 0.78 + tile * 0.22;
    progress = Math.max(progress, Math.min(raw, 0.97));
    loadingOverlay.setProgress(progress);
    loadingOverlay.setMessage(getStepMessage(src));
  };

  const scheduleUpdate = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      update();
    });
  };

  const finalize = () => {
    if (done) return;
    done = true;
    loadingOverlay.setProgress(1);
    loadingOverlay.setMessage("Klart - kartan är redo.");
    hideTimeoutId = setTimeout(() => loadingOverlay.hide(), 280);
  };

  const events = ["load", "data", "sourcedata"];
  events.forEach((e) => map.on(e, scheduleUpdate));
  map.on("idle", finalize);
  scheduleUpdate();

  return () => {
    if (rafId) cancelAnimationFrame(rafId);
    if (hideTimeoutId) clearTimeout(hideTimeoutId);
    events.forEach((e) => map.off(e, scheduleUpdate));
    map.off("idle", finalize);
  };
};
