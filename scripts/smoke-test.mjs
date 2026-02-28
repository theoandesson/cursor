import path from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "../server/startServer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const staticDirectory = path.join(workspaceRoot, "client");

const run = async () => {
  const host = "127.0.0.1";
  const port = 4199;

  const { server } = await startServer({
    host,
    port,
    staticDirectory
  });

  try {
    const indexResponse = await fetch(`http://${host}:${port}/`);
    if (!indexResponse.ok) {
      throw new Error(`index.html svarade ${indexResponse.status}`);
    }

    const html = await indexResponse.text();
    if (!html.includes("Sverige 3D-karta")) {
      throw new Error("index.html verkar inte vara korrekt serverad.");
    }

    const healthResponse = await fetch(`http://${host}:${port}/healthz`);
    if (!healthResponse.ok) {
      throw new Error(`/healthz svarade ${healthResponse.status}`);
    }

    const mainScriptResponse = await fetch(`http://${host}:${port}/src/main.js`);
    if (!mainScriptResponse.ok) {
      throw new Error(`/src/main.js svarade ${mainScriptResponse.status}`);
    }

    const serviceWorkerResponse = await fetch(`http://${host}:${port}/sw.js`);
    if (!serviceWorkerResponse.ok) {
      throw new Error(`/sw.js svarade ${serviceWorkerResponse.status}`);
    }

    console.log("Smoke-test klar: server + klientfiler fungerar.");
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
