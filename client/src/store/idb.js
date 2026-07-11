const openDatabaseEntries = new Map();

export const openDatabase = (name, version, upgradeFn) => {
  const existing = openDatabaseEntries.get(name);
  if (existing && existing.version >= version) {
    return existing.promise;
  }

  const promise = new Promise((resolve, reject) => {
    if (!("indexedDB" in globalThis)) {
      reject(new Error("IndexedDB is not available"));
      return;
    }

    let request;
    try {
      request = indexedDB.open(name, version);
    } catch (error) {
      reject(error);
      return;
    }

    request.onerror = () => {
      reject(request.error ?? new Error(`Failed to open IndexedDB database "${name}"`));
    };

    request.onblocked = () => {
      console.warn(`IndexedDB open blocked for "${name}"`);
    };

    request.onupgradeneeded = (event) => {
      try {
        upgradeFn(event.target.result, event);
      } catch (error) {
        reject(error);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });

  openDatabaseEntries.set(name, { version, promise });
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
