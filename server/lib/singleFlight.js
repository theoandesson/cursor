/**
 * Coalesce concurrent identical async work into one in-flight promise.
 */
export const createSingleFlight = () => {
  const inFlight = new Map();

  const doOnce = (key, factory) => {
    const existing = inFlight.get(key);
    if (existing) {
      return existing;
    }

    const promise = Promise.resolve()
      .then(factory)
      .finally(() => {
        inFlight.delete(key);
      });

    inFlight.set(key, promise);
    return promise;
  };

  return {
    doOnce,
    has: (key) => inFlight.has(key),
    clear: () => {
      inFlight.clear();
    }
  };
};
