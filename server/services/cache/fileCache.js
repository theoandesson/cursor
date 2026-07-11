import fs from "node:fs/promises";
import path from "node:path";

const sanitizeKey = (key) => key.replace(/[^a-zA-Z0-9._-]/g, "_");

export const createFileCache = ({ directory }) => {
  const resolvePath = (key) => path.join(directory, `${sanitizeKey(key)}.json`);

  const ensureDirectory = async () => {
    await fs.mkdir(directory, { recursive: true });
  };

  const deleteKey = async (key) => {
    try {
      await fs.unlink(resolvePath(key));
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        return;
      }
      throw error;
    }
  };

  const readEntry = async (key) => {
    try {
      const raw = await fs.readFile(resolvePath(key), "utf8");
      return JSON.parse(raw);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        return null;
      }
      if (error instanceof SyntaxError) {
        console.warn(`Korrupt cachefil för ${key}, raderar.`);
        await deleteKey(key);
        return null;
      }
      throw error;
    }
  };

  const get = async (key) => {
    const entry = await readEntry(key);
    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt <= Date.now()) {
      await deleteKey(key);
      return undefined;
    }

    return entry.value;
  };

  const set = async (key, value, ttlMs) => {
    await ensureDirectory();
    const payload = {
      value,
      expiresAt: Date.now() + ttlMs
    };
    await fs.writeFile(resolvePath(key), JSON.stringify(payload), "utf8");
  };

  const has = async (key) => (await get(key)) !== undefined;

  const clear = async () => {
    try {
      const files = await fs.readdir(directory);
      await Promise.all(
        files
          .filter((file) => file.endsWith(".json"))
          .map((file) => fs.unlink(path.join(directory, file)))
      );
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        return;
      }
      throw error;
    }
  };

  return {
    get,
    set,
    has,
    delete: deleteKey,
    clear
  };
};
