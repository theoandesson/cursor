import path from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "../server/startServer.js";
import { warmWeatherCache } from "../server/services/weatherWarmer.js";

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

    if (!html.includes('id="app-nav"')) {
      throw new Error("index.html saknar navigationspanelen.");
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
    if (!Array.isArray(endpointPayload.endpoints) || endpointPayload.endpoints.length < 8) {
      throw new Error("/api/endpoints returnerade inte förväntad endpoint-lista.");
    }

    const perfSummaryResponse = await fetch(`http://${host}:${port}/api/perf/summary`);
    if (!perfSummaryResponse.ok) {
      throw new Error(`/api/perf/summary svarade ${perfSummaryResponse.status}`);
    }
    const perfSummary = await perfSummaryResponse.json();
    if (typeof perfSummary.totalRequests !== "number") {
      throw new Error("/api/perf/summary returnerade inte förväntad struktur.");
    }

    const citiesResponse = await fetch(`http://${host}:${port}/api/cities`);
    if (!citiesResponse.ok) {
      throw new Error(`/api/cities svarade ${citiesResponse.status}`);
    }
    const citiesPayload = await citiesResponse.json();
    if (!Array.isArray(citiesPayload.cities) || citiesPayload.cities.length < 50) {
      throw new Error("/api/cities returnerade för få städer.");
    }

    await warmWeatherCache({ forecastHours: 24 });

    const bootstrapResponse = await fetch(`http://${host}:${port}/api/bootstrap`);
    if (!bootstrapResponse.ok) {
      throw new Error(`/api/bootstrap svarade ${bootstrapResponse.status}`);
    }
    const bootstrapPayload = await bootstrapResponse.json();
    if (!bootstrapPayload.cities || !bootstrapPayload.weather || bootstrapPayload.version !== "1") {
      throw new Error("/api/bootstrap returnerade inte förväntad struktur.");
    }

    const responseTime = bootstrapResponse.headers.get("x-response-time");
    if (!responseTime) {
      throw new Error("/api/bootstrap saknar X-Response-Time header.");
    }

    const mainScriptResponse = await fetch(`http://${host}:${port}/src/main.js`);
    if (!mainScriptResponse.ok) {
      throw new Error(`/src/main.js svarade ${mainScriptResponse.status}`);
    }

    const perfTrackerResponse = await fetch(`http://${host}:${port}/src/perf/perfTracker.js`);
    if (!perfTrackerResponse.ok) {
      throw new Error(`/src/perf/perfTracker.js svarade ${perfTrackerResponse.status}`);
    }

    const serviceWorkerResponse = await fetch(`http://${host}:${port}/sw.js`);
    if (!serviceWorkerResponse.ok) {
      throw new Error(`/sw.js svarade ${serviceWorkerResponse.status}`);
    }

    console.log("Smoke-test klar: server, API, bootstrap, prestanda och klientfiler fungerar.");
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
