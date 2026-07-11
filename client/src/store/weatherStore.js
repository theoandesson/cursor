import { isValidBootstrapData } from "../api/bootstrapSchema.js";
import { openDatabase, withStore } from "./idb.js";

const DB_NAME = "sweden-map";
const DB_VERSION = 1;
const STORE_NAME = "weather";
const BOOTSTRAP_KEY = "bootstrap-latest";

const isValidCachedRecord = (record) => {
  if (!record || typeof record !== "object") {
    return false;
  }

  if (typeof record.savedAt !== "number" || record.savedAt <= 0) {
    return false;
  }

  return isValidBootstrapData(record.data);
};

const ensureDatabase = () =>
  openDatabase(DB_NAME, DB_VERSION, (db) => {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME);
    }
  });

export const saveBootstrapSnapshot = async (data) => {
  if (!isValidBootstrapData(data)) {
    console.warn("Refusing to save invalid bootstrap snapshot to IndexedDB");
    return null;
  }

  try {
    await ensureDatabase();
    const savedAt = Date.now();
    await withStore(DB_NAME, STORE_NAME, "readwrite", (store) => {
      store.put({ data, savedAt }, BOOTSTRAP_KEY);
    });
    return savedAt;
  } catch (error) {
    console.warn("Could not save bootstrap snapshot to IndexedDB", error);
    return null;
  }
};

export const getLatestBootstrapSnapshot = async () => {
  try {
    await ensureDatabase();
    const record = await withStore(DB_NAME, STORE_NAME, "readonly", (store) =>
      new Promise((resolve, reject) => {
        const request = store.get(BOOTSTRAP_KEY);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result ?? null);
      })
    );

    if (!isValidCachedRecord(record)) {
      return null;
    }

    const savedAt = record.savedAt;
    return {
      data: record.data,
      savedAt,
      ageMs: Math.max(0, Date.now() - savedAt)
    };
  } catch (error) {
    console.warn("Could not read bootstrap snapshot from IndexedDB", error);
    return null;
  }
};

export const clearWeatherStore = async () => {
  try {
    await ensureDatabase();
    await withStore(DB_NAME, STORE_NAME, "readwrite", (store) => {
      store.delete(BOOTSTRAP_KEY);
    });
  } catch (error) {
    console.warn("Could not clear weather store in IndexedDB", error);
  }
};
