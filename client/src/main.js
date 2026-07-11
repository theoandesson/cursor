import { bootstrapSwedenMapApp } from "./app/bootstrapSwedenMapApp.js";
import { createPerfTracker } from "./perf/perfTracker.js";
import maplibregl from "./vendor/maplibre-entry.js";
import "maplibre-gl/dist/maplibre-gl.css";

const showMapStatusError = (message) => {
  const statusElement = document.getElementById("map-status");
  if (statusElement) {
    statusElement.textContent = message;
  }
};

const perfTracker = createPerfTracker();
perfTracker.recordMilestone("main-start");

const startApp = async () => {
  bootstrapSwedenMapApp({ maplibregl, perfTracker }).catch((error) => {
    console.error("Kartan kunde inte startas.", error);
    showMapStatusError("Kartan kunde inte startas.");
  });
};

startApp();
