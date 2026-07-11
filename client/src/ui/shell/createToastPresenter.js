const DEFAULT_DURATION_MS = 3200;

export const createToastPresenter = () => {
  const stack = document.createElement("div");
  stack.className = "toast-stack";
  stack.setAttribute("aria-live", "polite");
  stack.setAttribute("aria-atomic", "true");
  document.body.appendChild(stack);

  const timers = new Map();

  const dismiss = (toast) => {
    const timer = timers.get(toast);
    if (timer) {
      clearTimeout(timer);
      timers.delete(toast);
    }
    toast.remove();
  };

  const show = (message, { variant = "default", duration = DEFAULT_DURATION_MS } = {}) => {
    const toast = document.createElement("div");
    toast.className = "toast";
    if (variant !== "default") {
      toast.classList.add(`toast--${variant}`);
    }
    toast.textContent = message;
    stack.appendChild(toast);

    if (duration > 0) {
      const timer = setTimeout(() => dismiss(toast), duration);
      timers.set(toast, timer);
    }

    return () => dismiss(toast);
  };

  const destroy = () => {
    timers.forEach((timer) => clearTimeout(timer));
    timers.clear();
    stack.remove();
  };

  return { show, destroy };
};
