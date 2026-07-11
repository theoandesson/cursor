export const createMemoryCache = ({ maxEntries, defaultTtlMs }) => {
  const entries = new Map();
  let hits = 0;
  let misses = 0;

  const isExpired = (entry) => entry.expiresAt <= Date.now();

  const touchEntry = (key, entry) => {
    entries.delete(key);
    entries.set(key, entry);
  };

  const pruneExpired = () => {
    const now = Date.now();
    for (const [key, entry] of entries) {
      if (entry.expiresAt <= now) {
        entries.delete(key);
      }
    }
  };

  const evictIfNeeded = () => {
    while (entries.size > maxEntries) {
      const oldestKey = entries.keys().next().value;
      entries.delete(oldestKey);
    }
  };

  const get = (key) => {
    pruneExpired();
    const entry = entries.get(key);

    if (!entry || isExpired(entry)) {
      if (entry) {
        entries.delete(key);
      }
      misses += 1;
      return undefined;
    }

    touchEntry(key, entry);
    hits += 1;
    return entry.value;
  };

  const set = (key, value, ttlMs = defaultTtlMs) => {
    pruneExpired();

    const entry = {
      value,
      expiresAt: Date.now() + ttlMs
    };

    if (entries.has(key)) {
      entries.delete(key);
    }

    entries.set(key, entry);
    evictIfNeeded();
  };

  const has = (key) => get(key) !== undefined;

  const deleteKey = (key) => entries.delete(key);

  const clear = () => {
    entries.clear();
  };

  const stats = () => {
    pruneExpired();
    const total = hits + misses;
    return {
      hits,
      misses,
      size: entries.size,
      hitRate: total > 0 ? hits / total : 0
    };
  };

  return {
    get,
    set,
    has,
    delete: deleteKey,
    clear,
    stats
  };
};
