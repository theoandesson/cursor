import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..", "..");

const parsePort = (value, fallback) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseBoolean = (value, fallback) => {
  if (value == null) {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (normalized === "true" || normalized === "1") {
    return true;
  }
  if (normalized === "false" || normalized === "0") {
    return false;
  }
  return fallback;
};

export const appConfig = Object.freeze({
  host: process.env.HOST ?? "127.0.0.1",
  port: parsePort(process.env.PORT, 4173),
  staticDirectory: path.join(workspaceRoot, "client"),
  autoOpenBrowser: parseBoolean(process.env.AUTO_OPEN_BROWSER, true)
});
