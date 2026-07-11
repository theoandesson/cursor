import { bootstrapSwedenMapApp } from "./app/bootstrapSwedenMapApp.js";
import { createPerfTracker } from "./perf/perfTracker.js";

const MAPLIBRE_MODULE_URL = "https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/+esm";

const showMapStatusError = (message) => {
  const statusElement = document.getElementById("map-status");
  if (statusElement) {
    statusElement.textContent = message;
  }
};

const perfTracker = createPerfTracker();
perfTracker.recordMilestone("main-start");

const startApp = async () => {
  let maplibregl;

  try {
    ({ default: maplibregl } = await import(MAPLIBRE_MODULE_URL));
  } catch (error) {
    console.error("Kartan kunde inte startas: kunde inte ladda kartbiblioteket.", error);
    showMapStatusError("Kartan kunde inte startas: kunde inte ladda kartbiblioteket.");
    return;
  }

  bootstrapSwedenMapApp({ maplibregl, perfTracker }).catch((error) => {
    console.error("Kartan kunde inte startas.", error);
    showMapStatusError("Kartan kunde inte startas.");
  });
};

startApp();
