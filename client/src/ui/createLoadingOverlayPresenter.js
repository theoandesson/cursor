const OVERLAY_ID = "loading-overlay";

const clampProgress = (value) => Math.max(0, Math.min(1, value));

export const createLoadingOverlayPresenter = ({ mapRootElement }) => {
  const overlay = document.createElement("section");
  overlay.id = OVERLAY_ID;
  overlay.setAttribute("role", "status");
  overlay.setAttribute("aria-live", "polite");

  const title = document.createElement("p");
  title.className = "loading-overlay__title";
  title.textContent = "Förbereder kartresurser…";

  const message = document.createElement("p");
  message.className = "loading-overlay__message";
  message.textContent = "Initierar.";

  const progressTrack = document.createElement("div");
  progressTrack.className = "loading-overlay__track";
  const progressFill = document.createElement("div");
  progressFill.className = "loading-overlay__fill";
  progressTrack.appendChild(progressFill);

  overlay.appendChild(title);
  overlay.appendChild(message);
  overlay.appendChild(progressTrack);
  mapRootElement.appendChild(overlay);

  let hideTimeoutId = null;

  const setProgress = (progress) => {
    progressFill.style.transform = `scaleX(${clampProgress(progress)})`;
  };

  const setMessage = (text) => {
    message.textContent = text;
  };

  const hide = () => {
    overlay.dataset.state = "ready";
    hideTimeoutId = setTimeout(() => {
      overlay.style.display = "none";
    }, 260);
  };

  const show = () => {
    if (hideTimeoutId) {
      clearTimeout(hideTimeoutId);
      hideTimeoutId = null;
    }
    overlay.style.display = "grid";
    overlay.dataset.state = "loading";
  };

  show();
  setProgress(0.06);

  return {
    show,
    hide,
    setProgress,
    setMessage
  };
};
