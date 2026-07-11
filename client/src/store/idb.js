const openDatabaseEntries = new Map();
const BLOCKED_TIMEOUT_MS = 10000;

export const openDatabase = (name, version, upgradeFn) => {
  const existing = openDatabaseEntries.get(name);
  if (existing?.promise && existing.version >= version) {
    return existing.promise;
  }

  let resolveOpen;
  let rejectOpen;
  const promise = new Promise((resolve, reject) => {
    resolveOpen = resolve;
    rejectOpen = reject;
  });

  openDatabaseEntries.set(name, { version, promise, pending: true });

  if (!("indexedDB" in globalThis)) {
    openDatabaseEntries.delete(name);
    rejectOpen(new Error("IndexedDB is not available"));
    return promise;
  }

  let request;
  try {
    request = indexedDB.open(name, version);
  } catch (error) {
    openDatabaseEntries.delete(name);
    rejectOpen(error);
    return promise;
  }

  let blockedTimer = null;

  const clearBlockedTimer = () => {
    if (blockedTimer) {
      clearTimeout(blockedTimer);
      blockedTimer = null;
    }
  };

  request.onerror = () => {
    clearBlockedTimer();
    openDatabaseEntries.delete(name);
    rejectOpen(request.error ?? new Error(`Failed to open IndexedDB database "${name}"`));
  };

  request.onblocked = () => {
    console.warn(`IndexedDB open blocked for "${name}"`);
    clearBlockedTimer();
    blockedTimer = setTimeout(() => {
      openDatabaseEntries.delete(name);
      rejectOpen(new Error(`IndexedDB open blocked for "${name}"`));
    }, BLOCKED_TIMEOUT_MS);
  };

  request.onupgradeneeded = (event) => {
    try {
      upgradeFn(event.target.result, event);
    } catch (error) {
      clearBlockedTimer();
      openDatabaseEntries.delete(name);
      rejectOpen(error);
    }
  };

  request.onsuccess = () => {
    clearBlockedTimer();
    const db = request.result;

    db.onversionchange = () => {
      db.close();
      openDatabaseEntries.delete(name);
    };

    const entry = openDatabaseEntries.get(name);
    if (entry) {
      entry.pending = false;
    }

    resolveOpen(db);
  };

  return promise;
};

export const withStore = async (dbName, storeName, mode, callback) => {
  const entry = openDatabaseEntries.get(dbName);
  if (!entry) {
    throw new Error(`Database "${dbName}" has not been opened via openDatabase()`);
  }

  let db;
  try {
    db = await entry.promise;
  } catch (error) {
    console.warn(`IndexedDB read failed for "${dbName}"`, error);
    throw error;
  }

  return new Promise((resolve, reject) => {
    let transaction;
    try {
      transaction = db.transaction(storeName, mode);
    } catch (error) {
      console.warn(`IndexedDB transaction failed for "${dbName}/${storeName}"`, error);
      reject(error);
      return;
    }

    const store = transaction.objectStore(storeName);

    let callbackResult;
    try {
      callbackResult = callback(store);
    } catch (error) {
      reject(error);
      return;
    }

    transaction.onerror = () => {
      reject(transaction.error ?? new Error(`IndexedDB transaction failed for "${storeName}"`));
    };

    transaction.onabort = () => {
      reject(transaction.error ?? new Error(`IndexedDB transaction aborted for "${storeName}"`));
    };

    transaction.oncomplete = () => {
      resolve(callbackResult);
    };
  });
};
