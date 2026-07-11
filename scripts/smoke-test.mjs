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

    const poisResponse = await fetch(`http://${host}:${port}/api/pois?limit=5`);
    if (!poisResponse.ok) {
      throw new Error(`/api/pois svarade ${poisResponse.status}`);
    }
    const poisPayload = await poisResponse.json();
    if (!Array.isArray(poisPayload.pois) || poisPayload.pois.length < 1) {
      throw new Error("/api/pois returnerade inga POI.");
    }

    const searchValidationResponse = await fetch(`http://${host}:${port}/api/search?q=`);
    if (searchValidationResponse.status !== 400) {
      throw new Error("/api/search borde returnera 400 för tom sökfråga.");
    }

    const newClientAssets = [
      "/src/search/createSearchControl.js",
      "/src/places/createPlaceCard.js",
      "/src/map/modes/createMapModeControl.js"
    ];
    for (const assetPath of newClientAssets) {
      const assetResponse = await fetch(`http://${host}:${port}${assetPath}`);
      if (!assetResponse.ok) {
        throw new Error(`${assetPath} svarade ${assetResponse.status}`);
      }
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
