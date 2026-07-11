export const createPrefetchQueue = ({ maxConcurrent = 3 } = {}) => {
  const pending = new Set();
  const queued = [];
  const inFlight = new Set();
  let activeCount = 0;

  const pump = () => {
    while (activeCount < maxConcurrent && queued.length > 0) {
      const job = queued.shift();
      if (!job) {
        break;
      }

      activeCount += 1;
      inFlight.add(job.url);

      Promise.resolve()
        .then(() => job.fetchFn())
        .catch(() => undefined)
        .finally(() => {
          activeCount -= 1;
          inFlight.delete(job.url);
          pending.delete(job.url);
          pump();
        });
    }
  };

  const enqueue = (url, fetchFn) => {
    if (!url || pending.has(url)) {
      return false;
    }

    pending.add(url);
    queued.push({ url, fetchFn });
    pump();
    return true;
  };

  const flush = () =>
    new Promise((resolve) => {
      const check = () => {
        if (queued.length === 0 && activeCount === 0) {
          resolve();
          return;
        }
        setTimeout(check, 16);
      };
      check();
    });

  return { enqueue, flush, pending };
};
