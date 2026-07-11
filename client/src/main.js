import maplibregl from "https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/+esm";
import { bootstrapSwedenMapApp } from "./app/bootstrapSwedenMapApp.js";
import { createPerfTracker } from "./perf/perfTracker.js";

const perfTracker = createPerfTracker();
perfTracker.recordMilestone("main-start");

bootstrapSwedenMapApp({ maplibregl, perfTracker });
