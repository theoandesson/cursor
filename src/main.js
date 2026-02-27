import './styles/main.css';
import './styles/dashboard.css';

import { initScene, startAnimationLoop } from './globe/scene.js';
import { createEarth } from './globe/earth.js';
import { createAtmosphere } from './globe/atmosphere.js';
import { createMarkers, animateMarkers } from './globe/markers.js';
import { fetchTemperatureData, fetchSeaLevelData, getFallbackData } from './data/smhiApi.js';
import { processStationData } from './data/stations.js';
import { createDashboard, updateDashboard } from './ui/dashboard.js';
import { initTooltip } from './ui/tooltip.js';
import { initGeoEngine } from './utils/geo.js';
import { REFRESH_INTERVAL } from './utils/constants.js';

let scene, camera, renderer, controls;
let markers = [];

async function init() {
  await initGeoEngine();

  let setup;
  try {
    setup = initScene();
  } catch (err) {
    console.error('WebGL initialization failed:', err);
    hideLoadingScreen();
    showFallbackUI();
    return;
  }

  scene = setup.scene;
  camera = setup.camera;
  renderer = setup.renderer;
  controls = setup.controls;

  const earth = createEarth();
  scene.add(earth);

  const atmosphere = createAtmosphere();
  scene.add(atmosphere);

  createDashboard();
  initTooltip(camera, scene, renderer);

  await loadClimateData();
  hideLoadingScreen();

  startAnimationLoop(scene, camera, renderer, controls, earth, (elapsed) => {
    animateMarkers(elapsed);
  });

  setInterval(loadClimateData, REFRESH_INTERVAL);
}

function showFallbackUI() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div style="background:#06080f;color:#e8edf5;min-height:100vh;font-family:Inter,sans-serif;
                display:flex;align-items:center;justify-content:center;flex-direction:column;padding:2rem;text-align:center">
      <h1 style="color:#00bfff;margin-bottom:1rem">Sverige Klimatglob</h1>
      <p style="color:#8a9bbd;max-width:500px;margin-bottom:2rem">
        WebGL stöds inte i denna webbläsare/miljö. Applikationen kräver WebGL för 3D-rendering.
        Testa att öppna sidan i Chrome eller Firefox med GPU-stöd.
      </p>
      <div id="dashboard" style="width:100%;max-width:400px"></div>
    </div>
  `;
  createDashboard();
  loadClimateData();
}

async function loadClimateData() {
  try {
    const [tempResult, seaResult] = await Promise.allSettled([
      fetchTemperatureData(),
      fetchSeaLevelData(),
    ]);

    const tempData = tempResult.status === 'fulfilled' ? tempResult.value : null;
    const seaData = seaResult.status === 'fulfilled' ? seaResult.value : null;

    let stations;
    if (!tempData && !seaData) {
      stations = getFallbackData();
    } else {
      stations = processStationData(tempData, seaData);
    }

    markers = createMarkers(scene, stations, markers);
    updateDashboard(stations);
  } catch (error) {
    console.error('Failed to load climate data:', error);
    const fallback = getFallbackData();
    markers = createMarkers(scene, fallback, markers);
    updateDashboard(fallback);
  }
}

function hideLoadingScreen() {
  const el = document.getElementById('loading-screen');
  if (el) {
    el.classList.add('fade-out');
    setTimeout(() => el.remove(), 800);
  }
}

init().catch(console.error);
