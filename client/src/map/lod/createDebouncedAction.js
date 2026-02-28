export const createDebouncedAction = (action, delayMs) => {
  let timeoutId = null;

  const run = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(action, delayMs);
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
