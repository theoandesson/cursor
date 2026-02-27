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

  const setup = initScene();
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
