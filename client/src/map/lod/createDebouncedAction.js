export const createDebouncedAction = (action, delayMs) => {
  let timeoutId = null;

  const run = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      timeoutId = null;
      try {
        action();
      } catch (error) {
        console.error("[debounced-action] Callback failed:", error);
      }
    }, delayMs);
  };

  run.cancel = () => {
    if (!timeoutId) {
      return;
    }
    clearTimeout(timeoutId);
    timeoutId = null;
  };

  return run;
};
