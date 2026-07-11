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

    const apiHealthResponse = await fetch(`http://${host}:${port}/api/healthz`);
    if (!apiHealthResponse.ok) {
      throw new Error(`/api/healthz svarade ${apiHealthResponse.status}`);
    }

    const endpointResponse = await fetch(`http://${host}:${port}/api/endpoints`);
    if (!endpointResponse.ok) {
      throw new Error(`/api/endpoints svarade ${endpointResponse.status}`);
    }
    const endpointPayload = await endpointResponse.json();
    if (!Array.isArray(endpointPayload.endpoints) || endpointPayload.endpoints.length < 5) {
      throw new Error("/api/endpoints returnerade inte förväntad endpoint-lista.");
    }

    const citiesResponse = await fetch(`http://${host}:${port}/api/cities`);
    if (!citiesResponse.ok) {
      throw new Error(`/api/cities svarade ${citiesResponse.status}`);
    }
    const citiesPayload = await citiesResponse.json();
    if (!Array.isArray(citiesPayload.cities) || citiesPayload.cities.length < 50) {
      throw new Error("/api/cities returnerade för få städer.");
    }

    const radarMetaResponse = await fetch(`http://${host}:${port}/api/radar/metadata`);
    if (!radarMetaResponse.ok) {
      throw new Error(`/api/radar/metadata svarade ${radarMetaResponse.status}`);
    }
    const radarMetaPayload = await radarMetaResponse.json();
    if (!radarMetaPayload?.coordinates || !Array.isArray(radarMetaPayload.coordinates)) {
      throw new Error("/api/radar/metadata saknar koordinater.");
    }

    const radarFramesResponse = await fetch(`http://${host}:${port}/api/radar/frames?hours=1&limit=3`);
    if (!radarFramesResponse.ok) {
      throw new Error(`/api/radar/frames svarade ${radarFramesResponse.status}`);
    }
    const radarFramesPayload = await radarFramesResponse.json();
    if (!Array.isArray(radarFramesPayload.frames) || radarFramesPayload.frames.length < 1) {
      throw new Error("/api/radar/frames returnerade inga bilder.");
    }

    const radarImageResponse = await fetch(
      `http://${host}:${port}${radarFramesPayload.frames.at(-1).imageUrl}`
    );
    if (!radarImageResponse.ok) {
      throw new Error(`Radar PNG svarade ${radarImageResponse.status}`);
    }
    const radarContentType = radarImageResponse.headers.get("content-type") ?? "";
    if (!radarContentType.includes("image/png")) {
      throw new Error("Radar PNG returnerade felaktigt content-type.");
    }

    const mainScriptResponse = await fetch(`http://${host}:${port}/src/main.js`);
    if (!mainScriptResponse.ok) {
      throw new Error(`/src/main.js svarade ${mainScriptResponse.status}`);
    }

    const serviceWorkerResponse = await fetch(`http://${host}:${port}/sw.js`);
    if (!serviceWorkerResponse.ok) {
      throw new Error(`/sw.js svarade ${serviceWorkerResponse.status}`);
    }

    console.log("Smoke-test klar: server, API och klientfiler fungerar.");
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
